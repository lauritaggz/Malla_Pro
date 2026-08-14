import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import ParsingProgress from "./ParsingProgress";
import ScheduleBuilder from "./ScheduleBuilder";
import MallaProgressHint from "./MallaProgressHint";
import SourcesBar from "./SourcesBar";
import SourcesManager from "./SourcesManager";
import ErrorBoundary from "../../../components/ErrorBoundary";

import {
  parseAcademicProgrammingFile,
  parseStudentScheduleFile,
} from "../parsers";
import {
  mergeProgrammingWithStudentSchedule,
  mergeSelectedMaps,
} from "../services/mergeProgrammingWithStudentSchedule";
import {
  DEFAULT_FILTERS,
  collectFilterOptions,
  collectModalityCount,
} from "../services/filterCourses";
import { integrateProgrammingWithProgress } from "../services/academicProgressIntegration";
import {
  buildFileFingerprint,
  buildRegistrationState,
  clearCourseRegistration,
  loadCourseRegistration,
  saveCourseRegistration,
} from "../services/persistence";
import {
  MALLA_PROGRESS_EVENT,
  readActiveMentionCode,
  readProgressStateFromStorage,
} from "../../../utils/curriculumProgress";
import { syncStudentScheduleToMallaProgress } from "../services/syncStudentScheduleToMallaProgress";
import { fetchMallaJson, mapMallaData } from "../../../utils/mallasLoader";
import { safeStorage } from "../../../utils/safeStorage";
import { LEGACY_KEYS, getPeriodId } from "../../../utils/storageKeys";
import { normalizeAppError } from "../../../utils/appErrors";

/** @typedef {"idle"|"validating"|"reading"|"processing"|"success"|"partial-success"|"recoverable-error"|"fatal-error"} FlowStatus */

const FLOW_PROGRESS_LABELS = {
  validating: "Validando archivo…",
  reading: "Leyendo el PDF…",
  processing: "Reconociendo secciones…",
};

function buildMergeSummary(summary) {
  if (!summary || !summary.enrolledCount) return null;
  const parts = [`${summary.enrolledCount} ramo${summary.enrolledCount === 1 ? "" : "s"} inscrito${summary.enrolledCount === 1 ? "" : "s"}`];
  if (summary.matchedInProgramming > 0) {
    parts.push(
      `${summary.matchedInProgramming} encontrado${summary.matchedInProgramming === 1 ? "" : "s"} en la programación`
    );
  }
  if (summary.studentOnly > 0) {
    parts.push(
      `${summary.studentOnly} importado${summary.studentOnly === 1 ? "" : "s"} solo desde tu horario`
    );
  }
  return parts.join(" · ");
}

export default function AcademicProgrammingPage({ isEmbedded = false }) {
  /** @type {[FlowStatus, Function]} */
  const [status, setStatus] = useState("idle");
  const [programming, setProgramming] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [programmingError, setProgrammingError] = useState(null);
  const [studentScheduleError, setStudentScheduleError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);
  const [progress, setProgress] = useState({
    page: 0,
    totalPages: 0,
    percent: 0,
    sectionsDetected: 0,
  });
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [studentScheduleMeta, setStudentScheduleMeta] = useState(null);
  const [enrolledNrcs, setEnrolledNrcs] = useState([]);
  const [mergeSummary, setMergeSummary] = useState(null);
  const [hasProgrammingSource, setHasProgrammingSource] = useState(false);
  const [hasStudentScheduleSource, setHasStudentScheduleSource] = useState(false);
  const [studentScheduleRamos, setStudentScheduleRamos] = useState([]);
  const [restoredSelectedMap, setRestoredSelectedMap] = useState(null);
  const [selectionEpoch, setSelectionEpoch] = useState(0);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const [mallaSeleccionada, setMallaSeleccionada] = useState(() =>
    safeStorage.get(LEGACY_KEYS.seleccionada, null)
  );
  const [mallaData, setMallaData] = useState(null);
  const [progressState, setProgressState] = useState(() =>
    readProgressStateFromStorage(mallaSeleccionada)
  );
  const [mentionCode, setMentionCode] = useState(null);

  const abortRef = useRef(null);
  const parseIdRef = useRef(0);
  const programmingRawRef = useRef(null);
  const studentScheduleRawRef = useRef(null);
  const selectedMapRef = useRef({});
  const pendingCursandoSyncRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const theme = safeStorage.getRaw(LEGACY_KEYS.theme) || "aurora";
    const savedDark = safeStorage.getRaw(LEGACY_KEYS.darkmode);
    const darkMode = savedDark ? savedDark === "true" : true;
    document.documentElement.className = `${theme} ${darkMode ? "dark" : "light"}`;
  }, []);

  useEffect(() => {
    const savedMalla = safeStorage.get(LEGACY_KEYS.seleccionada, null);
    setMallaSeleccionada(savedMalla);
    if (!savedMalla?.url) return;

    let cancelled = false;
    fetchMallaJson(savedMalla.url)
      .then((data) => {
        if (cancelled) return;
        const mapped = mapMallaData(data);
        setMallaData(mapped);
        setMentionCode(readActiveMentionCode(mapped.nombre));
      })
      .catch((err) => {
        normalizeAppError(err, { context: "AcademicProgrammingPage.loadMalla" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mallaSeleccionada) return;
    const saved = loadCourseRegistration(mallaSeleccionada);
    if (!saved) return;

    if (saved.programming) {
      const ramos = Array.isArray(saved.studentScheduleRamos)
        ? saved.studentScheduleRamos
        : [];
      if (ramos.length) {
        studentScheduleRawRef.current = { ramos, warnings: [] };
        setStudentScheduleRamos(ramos);
        setHasStudentScheduleSource(true);
      }

      // Separar base de programación (sin secciones solo-horario) para re-merge
      const baseCourses = (saved.programming.courses || [])
        .map((course) => ({
          ...course,
          sections: (course.sections || [])
            .filter(
              (s) =>
                !s.sources ||
                s.sources.programacionAcademica === true
            )
            .map((s) => ({
              ...s,
              enrolled: false,
              sources: {
                programacionAcademica: true,
                horarioAlumno: false,
              },
            })),
        }))
        .filter((c) => c.sections.length);

      if (baseCourses.length) {
        programmingRawRef.current = {
          ...saved.programming,
          courses: baseCourses,
          source: {
            ...saved.programming.source,
            parser: "UNAB_ACADEMIC_PROGRAMMING",
            sources: {
              programacionAcademica: true,
              horarioAlumno: false,
            },
          },
        };
        setHasProgrammingSource(true);
      } else {
        programmingRawRef.current = null;
        setHasProgrammingSource(false);
      }

      setProgramming(saved.programming);
      setEnrolledNrcs(Array.isArray(saved.enrolledNrcs) ? saved.enrolledNrcs : []);
      setStudentScheduleMeta(saved.studentScheduleMeta || null);
      setFilters(
        saved.activeFilters && Object.keys(saved.activeFilters).length
          ? { ...DEFAULT_FILTERS, ...saved.activeFilters }
          : { ...DEFAULT_FILTERS }
      );
      setFileMetadata(
        baseCourses.length ? saved.fileMetadata || null : null
      );
      setRestoredSelectedMap(saved.selectedSectionsMap || {});
      selectedMapRef.current = saved.selectedSectionsMap || {};
      if (ramos.length) {
        setMergeSummary(
          buildMergeSummary({
            enrolledCount: saved.enrolledNrcs?.length || ramos.length,
            matchedInProgramming: (saved.enrolledNrcs || []).filter((nrc) =>
              baseCourses.some((c) =>
                c.sections.some((s) => String(s.nrc) === String(nrc))
              )
            ).length,
            studentOnly: Math.max(
              0,
              (saved.enrolledNrcs?.length || ramos.length) -
                (saved.enrolledNrcs || []).filter((nrc) =>
                  baseCourses.some((c) =>
                    c.sections.some((s) => String(s.nrc) === String(nrc))
                  )
                ).length
            ),
          })
        );
      }
      setStatus(
        Array.isArray(saved.warnings) && saved.warnings.length > 0
          ? "partial-success"
          : "success"
      );
      setInfoMessage("Recuperamos tu planificación anterior");
      const t = setTimeout(() => setInfoMessage(null), 5000);
      return () => clearTimeout(t);
    }

    if (saved.selectedSectionsMap) {
      setRestoredSelectedMap(saved.selectedSectionsMap);
      selectedMapRef.current = saved.selectedSectionsMap;
    }
  }, [mallaSeleccionada]);

  useEffect(() => {
    const handleProgressChange = () => {
      const savedMalla = safeStorage.get(LEGACY_KEYS.seleccionada, null);
      setProgressState(readProgressStateFromStorage(savedMalla));
      if (savedMalla) {
        setMentionCode(readActiveMentionCode(savedMalla.nombre || "Carrera"));
      }
    };
    window.addEventListener(MALLA_PROGRESS_EVENT, handleProgressChange);
    return () => {
      window.removeEventListener(MALLA_PROGRESS_EVENT, handleProgressChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const allCourses = useMemo(() => programming?.courses || [], [programming]);

  const integration = useMemo(() => {
    if (!mallaData || !programming) return null;
    return integrateProgrammingWithProgress({
      curriculum: mallaData,
      progressState,
      academicProgramming: programming,
      mentionCode,
      courseCodeAliases: mallaData.courseCodeAliases || {},
    });
  }, [mallaData, progressState, programming, mentionCode]);

  const filterOptions = useMemo(
    () => collectFilterOptions(allCourses),
    [allCourses]
  );

  const totalCourseCount = allCourses.length;
  const totalSectionCount = useMemo(
    () => allCourses.reduce((acc, c) => acc + (c.sections?.length || 0), 0),
    [allCourses]
  );
  const modalityCount = useMemo(
    () => collectModalityCount(allCourses),
    [allCourses]
  );
  const warningCount = programming?.warnings?.length || 0;

  const abortCurrentParse = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    parseIdRef.current += 1;
  }, []);

  const persistMerged = useCallback(
    (mergedProgramming, selectedMap, enrolled, progMeta, schedMeta, ramos) => {
      const draft = buildRegistrationState({
        malla: mallaSeleccionada,
        programming: mergedProgramming,
        selectedSectionsMap: selectedMap,
        activeFilters: { ...DEFAULT_FILTERS },
        fileMetadata: progMeta,
        enrolledNrcs: enrolled,
        studentScheduleMeta: schedMeta,
        studentScheduleRamos: ramos || [],
      });
      if (!draft) return;
      const saveResult = saveCourseRegistration(
        mallaSeleccionada,
        getPeriodId(mergedProgramming),
        draft
      );
      if (!saveResult.ok) {
        setInfoMessage(saveResult.userMessage);
      }
    },
    [mallaSeleccionada]
  );

  const syncEnrolledToMalla = useCallback(
    (ramos) => {
      if (!mallaSeleccionada || !mallaData || !ramos?.length) return 0;
      const result = syncStudentScheduleToMallaProgress(
        mallaSeleccionada,
        mallaData,
        ramos,
        {
          mentionCode,
          courseCodeAliases: mallaData.courseCodeAliases || {},
        }
      );
      if (result.ok && result.progress) {
        setProgressState(result.progress);
      }
      return result.added || 0;
    },
    [mallaSeleccionada, mallaData, mentionCode]
  );

  useEffect(() => {
    if (!pendingCursandoSyncRef.current || !mallaData) return;
    const ramos = studentScheduleRawRef.current?.ramos || studentScheduleRamos;
    if (!ramos?.length) return;
    pendingCursandoSyncRef.current = false;
    const added = syncEnrolledToMalla(ramos);
    if (added > 0) {
      setInfoMessage(
        `Marcamos ${added} ramo${added === 1 ? "" : "s"} como cursando en Mi malla.`
      );
      const t = setTimeout(() => setInfoMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [mallaData, studentScheduleRamos, syncEnrolledToMalla]);

  const applyMerge = useCallback(
    ({ progMeta, schedMeta, keepSelection = true }) => {
      const merged = mergeProgrammingWithStudentSchedule(
        programmingRawRef.current,
        studentScheduleRawRef.current
      );

      if (!merged.programming) {
        setProgramming(null);
        setEnrolledNrcs([]);
        setMergeSummary(null);
        setStatus("idle");
        return null;
      }

      const nextSelected = mergeSelectedMaps(
        keepSelection ? selectedMapRef.current : {},
        merged.selectedSectionsMapFromEnrolled
      );
      selectedMapRef.current = nextSelected;
      setRestoredSelectedMap({ ...nextSelected });
      setSelectionEpoch((n) => n + 1);
      setProgramming(merged.programming);
      setEnrolledNrcs(merged.enrolledNrcs);
      setMergeSummary(buildMergeSummary(merged.summary));

      const hasWarnings =
        Array.isArray(merged.programming.warnings) &&
        merged.programming.warnings.length > 0;
      setStatus(hasWarnings ? "partial-success" : "success");

      persistMerged(
        merged.programming,
        nextSelected,
        merged.enrolledNrcs,
        progMeta ?? fileMetadata,
        schedMeta ?? studentScheduleMeta,
        studentScheduleRawRef.current?.ramos || []
      );

      return merged;
    },
    [fileMetadata, persistMerged, studentScheduleMeta]
  );

  const clearPlanningOnly = useCallback(() => {
    const periodId = programming ? getPeriodId(programming) : "unknown";
    clearCourseRegistration(mallaSeleccionada, periodId);
    if (periodId !== "student-schedule") {
      clearCourseRegistration(mallaSeleccionada, "student-schedule");
    }
    programmingRawRef.current = null;
    studentScheduleRawRef.current = null;
    selectedMapRef.current = {};
    setProgramming(null);
    setFileMetadata(null);
    setStudentScheduleMeta(null);
    setHasProgrammingSource(false);
    setHasStudentScheduleSource(false);
    setStudentScheduleRamos([]);
    setEnrolledNrcs([]);
    setMergeSummary(null);
    setRestoredSelectedMap(null);
    setFilters({ ...DEFAULT_FILTERS });
    setStatus("idle");
    setErrorMessage(null);
    setProgrammingError(null);
    setStudentScheduleError(null);
    setInfoMessage(null);
  }, [mallaSeleccionada, programming]);

  const reset = useCallback(() => {
    abortCurrentParse();
    setStatus(
      programmingRawRef.current || studentScheduleRawRef.current
        ? "success"
        : "idle"
    );
    setErrorMessage(null);
    setProgrammingError(null);
    setStudentScheduleError(null);
    setInfoMessage(null);
    setProgress({ page: 0, totalPages: 0, percent: 0, sectionsDetected: 0 });
  }, [abortCurrentParse]);

  const handleProgrammingFile = useCallback(
    async (file) => {
      abortCurrentParse();
      const controller = new AbortController();
      abortRef.current = controller;
      const parseId = ++parseIdRef.current;

      setStatus("validating");
      setProgrammingError(null);
      setErrorMessage(null);
      setInfoMessage(null);
      setProgress({ page: 0, totalPages: 0, percent: 0, sectionsDetected: 0 });

      try {
        setStatus("reading");
        const fingerprint = await buildFileFingerprint(file);
        if (parseId !== parseIdRef.current) return;

        const meta = {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified || 0,
          fingerprint,
        };

        setStatus("processing");
        const result = await parseAcademicProgrammingFile(file, {
          signal: controller.signal,
          onProgress: (p) => {
            if (parseId !== parseIdRef.current) return;
            setProgress(p);
          },
        });
        if (parseId !== parseIdRef.current) return;

        programmingRawRef.current = result;
        setFileMetadata(meta);
        setHasProgrammingSource(true);
        setFilters({ ...DEFAULT_FILTERS });

        const merged = applyMerge({ progMeta: meta, keepSelection: true });
        if (merged?.programming?.warnings?.length) {
          setInfoMessage(
            "Procesamos la programación, pero algunas secciones no pudieron reconocerse por completo."
          );
        }
      } catch (err) {
        if (parseId !== parseIdRef.current) return;
        if (err?.code === "CANCELLED" || controller.signal.aborted) {
          setStatus(programming ? "success" : "idle");
          return;
        }
        const normalized = normalizeAppError(err, {
          context: "AcademicProgrammingPage.parseProgramming",
          fallbackCode: "UNEXPECTED",
        });
        setProgrammingError(normalized.userMessage);
        setErrorMessage(normalized.userMessage);
        setStatus(programming ? "recoverable-error" : "fatal-error");
      } finally {
        if (parseId === parseIdRef.current) {
          setStatus((current) => {
            if (
              current === "validating" ||
              current === "reading" ||
              current === "processing"
            ) {
              return programming || programmingRawRef.current
                ? "recoverable-error"
                : "fatal-error";
            }
            return current;
          });
        }
      }
    },
    [abortCurrentParse, applyMerge, programming]
  );

  const handleStudentScheduleFile = useCallback(
    async (file) => {
      abortCurrentParse();
      const controller = new AbortController();
      abortRef.current = controller;
      const parseId = ++parseIdRef.current;

      setStatus("validating");
      setStudentScheduleError(null);
      setErrorMessage(null);
      setInfoMessage(null);
      setProgress({ page: 0, totalPages: 0, percent: 0, sectionsDetected: 0 });

      try {
        setStatus("reading");
        const fingerprint = await buildFileFingerprint(file);
        if (parseId !== parseIdRef.current) return;

        const meta = {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified || 0,
          fingerprint,
          enrolledCount: 0,
        };

        setStatus("processing");
        const result = await parseStudentScheduleFile(file, {
          signal: controller.signal,
          onProgress: (p) => {
            if (parseId !== parseIdRef.current) return;
            setProgress({
              ...p,
              sectionsDetected: p.sectionsDetected || 0,
            });
          },
        });
        if (parseId !== parseIdRef.current) return;

        studentScheduleRawRef.current = {
          ramos: result.ramos,
          warnings: result.warnings || [],
        };
        setStudentScheduleRamos(result.ramos);
        meta.enrolledCount = result.ramos.length;
        setStudentScheduleMeta(meta);
        setHasStudentScheduleSource(true);

        // Si no hay programación previa, usar el programming mínimo del horario como base
        if (!programmingRawRef.current) {
          programmingRawRef.current = null;
        }

        const merged = applyMerge({ schedMeta: meta, keepSelection: true });
        if (!merged) return;

        pendingCursandoSyncRef.current = true;
        const addedToMalla = syncEnrolledToMalla(result.ramos);
        if (addedToMalla > 0 || mallaData) {
          pendingCursandoSyncRef.current = false;
        }

        const detected = `Detectamos ${result.ramos.length} ramo${result.ramos.length === 1 ? "" : "s"} inscrito${result.ramos.length === 1 ? "" : "s"} en tu horario.`;
        setInfoMessage(
          addedToMalla > 0
            ? `${detected} Marcamos ${addedToMalla} como cursando en Mi malla.`
            : detected
        );
        setTimeout(() => setInfoMessage(null), 5000);
      } catch (err) {
        if (parseId !== parseIdRef.current) return;
        if (err?.code === "CANCELLED" || controller.signal.aborted) {
          setStatus(programming ? "success" : "idle");
          return;
        }
        const userMessage =
          err?.userMessage ||
          normalizeAppError(err, {
            context: "AcademicProgrammingPage.parseStudentSchedule",
            fallbackCode: "UNEXPECTED",
          }).userMessage;
        setStudentScheduleError(userMessage);
        setErrorMessage(userMessage);
        setStatus(programming ? "recoverable-error" : "fatal-error");
      } finally {
        if (parseId === parseIdRef.current) {
          setStatus((current) => {
            if (
              current === "validating" ||
              current === "reading" ||
              current === "processing"
            ) {
              return programming || studentScheduleRawRef.current
                ? "recoverable-error"
                : "fatal-error";
            }
            return current;
          });
        }
      }
    },
    [abortCurrentParse, applyMerge, programming, syncEnrolledToMalla, mallaData]
  );

  const isBusy =
    status === "validating" || status === "reading" || status === "processing";
  const hasAnySource = Boolean(
    programming || programmingRawRef.current || studentScheduleRawRef.current
  );
  const showBuilder =
    (status === "success" ||
      status === "partial-success" ||
      status === "recoverable-error") &&
    programming;

  const progressLabel = FLOW_PROGRESS_LABELS[status] || "Procesando…";
  const programmingLoaded = hasProgrammingSource;
  const studentScheduleLoaded = hasStudentScheduleSource;

  const programmingDetail = programmingLoaded
    ? `${totalSectionCount || 0} secciones`
    : null;
  const studentScheduleDetail = studentScheduleLoaded
    ? `${enrolledNrcs.length || studentScheduleMeta?.enrolledCount || 0} ramos`
    : null;
  const sourceErrors = status === "fatal-error" || status === "recoverable-error";
  const hasMallaProgress =
    (progressState?.aprobados?.length || 0) +
      (progressState?.excepciones?.length || 0) +
      (progressState?.cursando?.length || 0) >
    0;

  return (
    <ErrorBoundary
      context="toma-de-ramos"
      onBack={() => navigate("/app")}
      onClearModule={clearPlanningOnly}
    >
      <div className="min-h-screen bg-bgPrimary text-textPrimary">
        {!isEmbedded && (
          <div className="sticky top-0 z-40 border-b border-borderColor bg-bgSecondary/90 backdrop-blur-xl">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-3">
              <Link
                to="/app"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-borderColor text-textSecondary hover:text-textPrimary"
                aria-label="Volver a la malla"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <span className="text-sm font-semibold">Toma de Ramos</span>
            </div>
          </div>
        )}

        <main className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-[calc(var(--mobile-bottom-nav-h,4rem)+1rem)] sm:pb-16 overflow-x-hidden">
          {infoMessage && (
            <div
              role="status"
              className="fixed bottom-[calc(var(--mobile-bottom-nav-h,4rem)+0.75rem)] sm:bottom-6 left-1/2 -translate-x-1/2 z-[70] max-w-[min(92vw,28rem)] rounded-xl border border-emerald-500/30 bg-bgSecondary px-3.5 py-2.5 text-[12px] sm:text-sm font-semibold text-textPrimary shadow-lg"
            >
              <span className="text-emerald-500 mr-1.5">✓</span>
              {infoMessage}
              <button
                type="button"
                className="ml-3 text-[11px] text-textSecondary underline"
                onClick={() => setInfoMessage(null)}
              >
                Cerrar
              </button>
            </div>
          )}

          {isBusy ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] fade-in gap-3">
              <p className="text-sm text-textSecondary font-medium">{progressLabel}</p>
              <ParsingProgress
                page={progress.page}
                totalPages={progress.totalPages}
                percent={progress.percent}
                sectionsDetected={progress.sectionsDetected}
              />
              <button
                type="button"
                onClick={() => {
                  abortCurrentParse();
                  setStatus(programming ? "success" : "idle");
                  setErrorMessage(null);
                }}
                className="mt-4 text-sm text-textSecondary underline hover:text-textPrimary"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="fade-in space-y-3 sm:space-y-3.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 space-y-0.5">
                  <h1 className="text-xl sm:text-2xl font-black text-textPrimary tracking-tight">
                    Arma tu horario
                  </h1>
                  <p className="text-[11px] sm:text-sm text-textSecondary leading-snug max-w-xl">
                    Parte desde tu horario actual y prueba cambios sin perder lo que ya tienes inscrito.
                  </p>
                </div>
              </div>

              <SourcesBar
                programmingLoaded={programmingLoaded}
                programmingDetail={programmingDetail}
                programmingError={sourceErrors ? programmingError : null}
                studentScheduleLoaded={studentScheduleLoaded}
                studentScheduleDetail={studentScheduleDetail}
                studentScheduleError={sourceErrors ? studentScheduleError : null}
                onManage={() => setSourcesOpen(true)}
              />

              {!hasMallaProgress && <MallaProgressHint />}

              {sourceErrors &&
                errorMessage &&
                !programmingError &&
                !studentScheduleError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400"
                  >
                    {errorMessage}{" "}
                    <button type="button" onClick={reset} className="underline font-medium">
                      Reintentar
                    </button>
                  </div>
                )}

              {showBuilder && programming ? (
                <ScheduleBuilder
                  key={`builder-${selectionEpoch}`}
                  integration={integration}
                  programming={programming}
                  allCourses={allCourses}
                  filters={filters}
                  setFilters={setFilters}
                  filterOptions={filterOptions}
                  onOpenSources={() => setSourcesOpen(true)}
                  onClearSavedPlanning={clearPlanningOnly}
                  mallaName={mallaData?.nombre}
                  mallaSeleccionada={mallaSeleccionada}
                  fileMetadata={fileMetadata}
                  studentScheduleMeta={studentScheduleMeta}
                  enrolledNrcs={enrolledNrcs}
                  studentScheduleRamos={studentScheduleRamos}
                  hasProgrammingSource={programmingLoaded}
                  warningsOpen={warningsOpen}
                  setWarningsOpen={setWarningsOpen}
                  totalCourseCount={totalCourseCount}
                  totalSectionCount={totalSectionCount}
                  modalityCount={modalityCount}
                  warningCount={warningCount}
                  initialSelectedMap={restoredSelectedMap}
                  suppressRestoreToast
                  onSelectedMapChange={(map) => {
                    selectedMapRef.current = map;
                  }}
                />
              ) : (
                <div className="rounded-2xl border border-borderColor bg-bgSecondary px-4 py-8 sm:py-12 text-center space-y-3">
                  <p className="text-sm font-bold text-textPrimary">
                    Empieza cargando tu horario o la Programación Académica.
                  </p>
                  <p className="text-xs text-textSecondary max-w-md mx-auto">
                    Puedes usar cualquiera de los dos. Con tu horario vemos lo inscrito; con la programación puedes probar otras secciones.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSourcesOpen(true)}
                    className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:brightness-110 btn-interactive"
                  >
                    Cargar archivos
                  </button>
                  {hasAnySource && status === "idle" && (
                    <button
                      type="button"
                      onClick={() => applyMerge({ keepSelection: true })}
                      className="block mx-auto text-xs text-primary font-semibold underline"
                    >
                      Continuar con la planificación guardada
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        <SourcesManager
          open={sourcesOpen}
          onClose={() => setSourcesOpen(false)}
          programmingLoaded={programmingLoaded}
          programmingDetail={programmingDetail}
          studentScheduleLoaded={studentScheduleLoaded}
          studentScheduleDetail={studentScheduleDetail}
          mergeSummary={mergeSummary}
          onProgrammingFile={handleProgrammingFile}
          onStudentScheduleFile={handleStudentScheduleFile}
          disabled={isBusy}
          programmingError={sourceErrors ? programmingError : null}
          studentScheduleError={sourceErrors ? studentScheduleError : null}
        />
      </div>
    </ErrorBoundary>
  );
}
