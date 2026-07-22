import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import ProgrammingPdfDropzone from "./ProgrammingPdfDropzone";
import ParsingProgress from "./ParsingProgress";
import ScheduleBuilder from "./ScheduleBuilder";
import TomaDeRamosStepper from "./TomaDeRamosStepper";
import MallaProgressHint from "./MallaProgressHint";
import ErrorBoundary from "../../../components/ErrorBoundary";

import { parseAcademicProgrammingFile } from "../parsers";
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
import { safeStorage } from "../../../utils/safeStorage";
import { LEGACY_KEYS, getCareerId, getPeriodId } from "../../../utils/storageKeys";
import { normalizeAppError } from "../../../utils/appErrors";

/** @typedef {"idle"|"validating"|"reading"|"processing"|"success"|"partial-success"|"recoverable-error"|"fatal-error"} FlowStatus */

const FLOW_PROGRESS_LABELS = {
  validating: "Validando archivo…",
  reading: "Leyendo el PDF…",
  processing: "Reconociendo secciones…",
};

export default function AcademicProgrammingPage({ isEmbedded = false }) {
  /** @type {[FlowStatus, Function]} */
  const [status, setStatus] = useState("idle");
  const [programming, setProgramming] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
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
  const lastValidProgrammingRef = useRef(null);
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
    fetch(savedMalla.url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const isMencion = !!data.menciones;
        const mencionesDisponibles = data.menciones_disponibles || [];
        const totalSemestres = data.totalSemestres || data.semestres?.length || 0;
        const mapped = {
          nombre: data.carrera || "Malla sin nombre",
          semestres: data.semestres || [],
          semestresComunes: data.semestres_comunes || [],
          menciones: data.menciones || {},
          courseCodeAliases: data.courseCodeAliases || data.course_code_aliases || {},
          isMencion,
          mencionesDisponibles,
          totalSemestres,
        };
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

  const [restoredSelectedMap, setRestoredSelectedMap] = useState(null);

  // Restaurar planificación guardada
  useEffect(() => {
    if (!mallaSeleccionada) return;
    const saved = loadCourseRegistration(mallaSeleccionada);
    if (!saved) return;

    if (saved.programming) {
      lastValidProgrammingRef.current = saved.programming;
      setProgramming(saved.programming);
      setFilters(
        saved.activeFilters && Object.keys(saved.activeFilters).length
          ? { ...DEFAULT_FILTERS, ...saved.activeFilters }
          : { ...DEFAULT_FILTERS }
      );
      setFileMetadata(saved.fileMetadata || null);
      setRestoredSelectedMap(saved.selectedSectionsMap || {});
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

  // Cancelar parse al desmontar
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

  const reset = useCallback(() => {
    abortCurrentParse();
    setStatus("idle");
    setErrorMessage(null);
    setInfoMessage(null);
    setProgress({ page: 0, totalPages: 0, percent: 0, sectionsDetected: 0 });
    setFilters({ ...DEFAULT_FILTERS });
    setWarningsOpen(false);
    // Conservar último resultado válido en memoria hasta nuevo éxito
    if (lastValidProgrammingRef.current) {
      setProgramming(lastValidProgrammingRef.current);
    } else {
      setProgramming(null);
    }
  }, [abortCurrentParse]);

  const clearPlanningOnly = useCallback(() => {
    const periodId = programming ? getPeriodId(programming) : "unknown";
    clearCourseRegistration(mallaSeleccionada, periodId);
    lastValidProgrammingRef.current = null;
    setProgramming(null);
    setFileMetadata(null);
    setRestoredSelectedMap(null);
    setFilters({ ...DEFAULT_FILTERS });
    setStatus("idle");
    setErrorMessage(null);
    setInfoMessage(null);
  }, [mallaSeleccionada, programming]);

  const handleFileSelected = useCallback(
    async (file) => {
      abortCurrentParse();
      const controller = new AbortController();
      abortRef.current = controller;
      const parseId = ++parseIdRef.current;

      setStatus("validating");
      setErrorMessage(null);
      setInfoMessage(null);
      // No borrar programming válido hasta éxito
      setProgress({ page: 0, totalPages: 0, percent: 0, sectionsDetected: 0 });
      setFilters({ ...DEFAULT_FILTERS });

      try {
        if (!file) {
          throw Object.assign(new Error("No file"), { code: "INVALID_FILE" });
        }
        if (file.size === 0) {
          throw Object.assign(new Error("Empty"), { code: "FILE_EMPTY" });
        }

        setStatus("reading");
        const fingerprint = await buildFileFingerprint(file);
        if (parseId !== parseIdRef.current) return;

        const meta = {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified || 0,
          fingerprint,
        };
        setFileMetadata(meta);

        setStatus("processing");
        const result = await parseAcademicProgrammingFile(file, {
          signal: controller.signal,
          onProgress: (p) => {
            if (parseId !== parseIdRef.current) return;
            setProgress(p);
          },
        });

        if (parseId !== parseIdRef.current) return;

        const hasWarnings = Array.isArray(result.warnings) && result.warnings.length > 0;
        lastValidProgrammingRef.current = result;
        setProgramming(result);
        setStatus(hasWarnings ? "partial-success" : "success");

        const draft = buildRegistrationState({
          malla: mallaSeleccionada,
          programming: result,
          selectedSectionsMap: {},
          activeFilters: { ...DEFAULT_FILTERS },
          fileMetadata: meta,
        });
        if (draft) {
          const saveResult = saveCourseRegistration(
            mallaSeleccionada,
            getPeriodId(result),
            draft
          );
          if (!saveResult.ok) {
            setInfoMessage(saveResult.userMessage);
          }
        }

        if (hasWarnings) {
          setInfoMessage(
            "Procesamos el archivo, pero algunas secciones no pudieron reconocerse. Revisa la información antes de crear tu horario."
          );
        }
      } catch (err) {
        if (parseId !== parseIdRef.current) return;
        if (err?.code === "CANCELLED" || controller.signal.aborted) {
          setStatus(
            lastValidProgrammingRef.current
              ? lastValidProgrammingRef.current.warnings?.length
                ? "partial-success"
                : "success"
              : "idle"
          );
          if (lastValidProgrammingRef.current) {
            setProgramming(lastValidProgrammingRef.current);
          }
          return;
        }

        const normalized = normalizeAppError(err, {
          context: "AcademicProgrammingPage.parse",
          fallbackCode: "UNEXPECTED",
        });
        setErrorMessage(normalized.userMessage);
        setStatus(
          lastValidProgrammingRef.current ? "recoverable-error" : "fatal-error"
        );
        if (lastValidProgrammingRef.current) {
          setProgramming(lastValidProgrammingRef.current);
        }
      } finally {
        if (parseId === parseIdRef.current) {
          // Evitar quedar en validating/reading/processing
          setStatus((current) => {
            if (
              current === "validating" ||
              current === "reading" ||
              current === "processing"
            ) {
              return lastValidProgrammingRef.current
                ? "recoverable-error"
                : "fatal-error";
            }
            return current;
          });
        }
      }
    },
    [abortCurrentParse, mallaSeleccionada]
  );

  const isBusy =
    status === "validating" || status === "reading" || status === "processing";
  const showDropzone =
    status === "idle" ||
    status === "fatal-error" ||
    status === "recoverable-error";
  const showBuilder =
    (status === "success" ||
      status === "partial-success" ||
      status === "recoverable-error") &&
    programming;

  const progressLabel = FLOW_PROGRESS_LABELS[status] || "Procesando…";

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

          {showDropzone && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-2xl mx-auto text-center space-y-6 fade-in">
              <div className="space-y-2 max-w-lg">
                <h1 className="text-[1.75rem] sm:text-[2rem] font-black tracking-tight text-textPrimary">
                  Toma de Ramos
                </h1>
                <p className="text-xs sm:text-sm text-textSecondary leading-relaxed">
                  Para comenzar, debes ir a la página de{" "}
                  <a
                    href="https://tomaderamos.unab.cl/inicio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-bold"
                  >
                    tomaderamos.unab.cl/inicio
                  </a>
                  , entrar al botón{" "}
                  <span className="font-extrabold text-textPrimary">
                    &quot;Ver programación académica&quot;
                  </span>{" "}
                  y descargar el archivo como PDF. Luego, cárgalo aquí:
                </p>
              </div>
              <div className="w-full text-left">
                <ProgrammingPdfDropzone
                  onFileSelected={handleFileSelected}
                  disabled={isBusy}
                  error={
                    status === "fatal-error" || status === "recoverable-error"
                      ? errorMessage
                      : null
                  }
                />
              </div>
              {(status === "fatal-error" || status === "recoverable-error") && (
                <div
                  role="alert"
                  className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400 text-center"
                >
                  {errorMessage}{" "}
                  <button
                    type="button"
                    onClick={reset}
                    className="underline font-medium hover:text-red-800 transition-colors"
                  >
                    Reintentar
                  </button>
                  {status === "recoverable-error" && programming && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={() =>
                          setStatus(
                            programming.warnings?.length
                              ? "partial-success"
                              : "success"
                          )
                        }
                        className="underline font-medium"
                      >
                        Seguir con la planificación anterior
                      </button>
                    </>
                  )}
                </div>
              )}
              {lastValidProgrammingRef.current && status === "idle" && (
                <button
                  type="button"
                  onClick={() => {
                    setProgramming(lastValidProgrammingRef.current);
                    setStatus(
                      lastValidProgrammingRef.current.warnings?.length
                        ? "partial-success"
                        : "success"
                    );
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
                  setStatus(
                    lastValidProgrammingRef.current ? "recoverable-error" : "idle"
                  );
                  setErrorMessage(null);
                  if (lastValidProgrammingRef.current) {
                    setProgramming(lastValidProgrammingRef.current);
                    setErrorMessage(null);
                    setStatus(
                      lastValidProgrammingRef.current.warnings?.length
                        ? "partial-success"
                        : "success"
                    );
                  }
                }}
                className="mt-4 text-sm text-textSecondary underline hover:text-textPrimary"
              >
                Cancelar
              </button>
            </div>
          )}

          {showBuilder && programming && (
            <div className="fade-in">
              <ScheduleBuilder
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
                  // Conservar programming en ref; no lo borramos hasta nuevo parse
                }}
                onClearSavedPlanning={clearPlanningOnly}
                mallaName={mallaData?.nombre}
                mallaSeleccionada={mallaSeleccionada}
                fileMetadata={fileMetadata}
                careerId={getCareerId(mallaSeleccionada)}
                warningsOpen={warningsOpen}
                setWarningsOpen={setWarningsOpen}
                totalCourseCount={totalCourseCount}
                totalSectionCount={totalSectionCount}
                modalityCount={modalityCount}
                warningCount={warningCount}
                initialSelectedMap={restoredSelectedMap}
              />
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
