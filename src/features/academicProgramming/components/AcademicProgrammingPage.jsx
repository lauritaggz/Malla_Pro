import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DocumentSourcesPanel from "./DocumentSourcesPanel";
import ParsingProgress from "./ParsingProgress";
import ScheduleBuilder from "./ScheduleBuilder";
import TomaDeRamosStepper from "./TomaDeRamosStepper";
import MallaProgressHint from "./MallaProgressHint";
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
import { fetchMallaJson, mapMallaData } from "../../../utils/mallasLoader";
import { safeStorage } from "../../../utils/safeStorage";
import { LEGACY_KEYS, getCareerId, getPeriodId } from "../../../utils/storageKeys";
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
      setInfoMessage("Recuperamos tu planificación guardada en este navegador.");
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

        setInfoMessage(
          `Detectamos ${result.ramos.length} ramo${result.ramos.length === 1 ? "" : "s"} inscrito${result.ramos.length === 1 ? "" : "s"} en tu horario.`
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
    [abortCurrentParse, applyMerge, programming]
  );

  const isBusy =
    status === "validating" || status === "reading" || status === "processing";
  const hasAnySource = Boolean(
    programming || programmingRawRef.current || studentScheduleRawRef.current
  );
  const showUpload =
    status === "idle" ||
    status === "fatal-error" ||
    status === "recoverable-error" ||
    (!programming && !isBusy);
  const showBuilder =
    (status === "success" ||
      status === "partial-success" ||
      status === "recoverable-error") &&
    programming;

  const progressLabel = FLOW_PROGRESS_LABELS[status] || "Procesando…";
  const programmingLoaded = hasProgrammingSource;
  const studentScheduleLoaded = hasStudentScheduleSource;

  return (
    <ErrorBoundary
      context="toma-de-ramos"
      onBack={() => navigate("/app")}
      onClearModule={clearPlanningOnly}
    >
      <div className="min-h-screen bg-bgPrimary text-textPrimary">
        {!isEmbedded && !showBuilder && (
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

        <main className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-[calc(var(--mobile-bottom-nav-h,4rem)+1rem)] sm:pb-20">
          {!showBuilder && (
            <>
              <TomaDeRamosStepper currentStep={1} />
              <MallaProgressHint />
            </>
          )}

          {infoMessage && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-textPrimary"
            >
              {infoMessage}
            </div>
          )}

          {showUpload && !isBusy && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-3xl mx-auto space-y-6 fade-in">
              <div className="space-y-2 max-w-lg text-center">
                <h1 className="text-[1.75rem] sm:text-[2rem] font-black tracking-tight text-textPrimary">
                  Toma de Ramos
                </h1>
                <p className="text-xs sm:text-sm text-textSecondary leading-relaxed">
                  Sube la Programación Académica y/o tu horario inscrito desde UNAB.
                  Con ambos, Malla Pro marca automáticamente lo que ya tienes y te
                  ayuda a armar el resto.
                </p>
              </div>

              <div className="w-full">
                <DocumentSourcesPanel
                  programmingLoaded={programmingLoaded}
                  programmingDetail={
                    programmingLoaded
                      ? `${totalSectionCount || "—"} secciones encontradas`
                      : null
                  }
                  studentScheduleLoaded={studentScheduleLoaded}
                  studentScheduleDetail={
                    studentScheduleLoaded
                      ? `${enrolledNrcs.length || studentScheduleMeta?.enrolledCount || 0} ramos inscritos detectados`
                      : null
                  }
                  mergeSummary={mergeSummary}
                  onProgrammingFile={handleProgrammingFile}
                  onStudentScheduleFile={handleStudentScheduleFile}
                  disabled={isBusy}
                  programmingError={
                    status === "fatal-error" || status === "recoverable-error"
                      ? programmingError
                      : null
                  }
                  studentScheduleError={
                    status === "fatal-error" || status === "recoverable-error"
                      ? studentScheduleError
                      : null
                  }
                />
              </div>

              {(status === "fatal-error" || status === "recoverable-error") &&
                errorMessage &&
                !programmingError &&
                !studentScheduleError && (
                  <div
                    role="alert"
                    className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400 text-center"
                  >
                    {errorMessage}{" "}
                    <button
                      type="button"
                      onClick={reset}
                      className="underline font-medium"
                    >
                      Reintentar
                    </button>
                  </div>
                )}

              {hasAnySource && status === "idle" && (
                <button
                  type="button"
                  onClick={() => {
                    applyMerge({ keepSelection: true });
                  }}
                  className="text-sm text-primary font-semibold underline"
                >
                  Continuar con la planificación guardada
                </button>
              )}
            </div>
          )}

          {isBusy && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] fade-in gap-3">
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
          )}

          {showBuilder && programming && (
            <div className="fade-in space-y-4">
              <DocumentSourcesPanel
                compact
                programmingLoaded={programmingLoaded}
                programmingDetail={
                  programmingLoaded
                    ? `${totalSectionCount} secciones`
                    : "Opcional · completa oferta y profesores"
                }
                studentScheduleLoaded={studentScheduleLoaded}
                studentScheduleDetail={
                  studentScheduleLoaded
                    ? `${enrolledNrcs.length} inscritos`
                    : "Opcional · marca lo que ya tienes"
                }
                mergeSummary={mergeSummary}
                onProgrammingFile={handleProgrammingFile}
                onStudentScheduleFile={handleStudentScheduleFile}
                disabled={isBusy}
              />

              <ScheduleBuilder
                key={`builder-${selectionEpoch}`}
                integration={integration}
                programming={programming}
                allCourses={allCourses}
                filters={filters}
                setFilters={setFilters}
                filterOptions={filterOptions}
                onChangePdf={() => {
                  abortCurrentParse();
                  setStatus("idle");
                  setErrorMessage(null);
                  setProgrammingError(null);
                  setStudentScheduleError(null);
                }}
                onClearSavedPlanning={clearPlanningOnly}
                mallaName={mallaData?.nombre}
                mallaSeleccionada={mallaSeleccionada}
                fileMetadata={fileMetadata}
                studentScheduleMeta={studentScheduleMeta}
                enrolledNrcs={enrolledNrcs}
                studentScheduleRamos={studentScheduleRamos}
                careerId={getCareerId(mallaSeleccionada)}
                warningsOpen={warningsOpen}
                setWarningsOpen={setWarningsOpen}
                totalCourseCount={totalCourseCount}
                totalSectionCount={totalSectionCount}
                modalityCount={modalityCount}
                warningCount={warningCount}
                initialSelectedMap={restoredSelectedMap}
                onSelectedMapChange={(map) => {
                  selectedMapRef.current = map;
                }}
              />
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
