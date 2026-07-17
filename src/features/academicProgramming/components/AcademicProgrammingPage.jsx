import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import ProgrammingPdfDropzone from "./ProgrammingPdfDropzone";
import ParsingProgress from "./ParsingProgress";
import ScheduleBuilder from "./ScheduleBuilder";

import { parseAcademicProgrammingFile } from "../parsers";
import {
  DEFAULT_FILTERS,
  collectFilterOptions,
  collectModalityCount,
} from "../services/filterCourses";
import {
  integrateProgrammingWithProgress,
} from "../services/academicProgressIntegration";
import {
  readProgressStateFromStorage,
  readActiveMentionCode,
  MALLA_PROGRESS_EVENT,
} from "../../../utils/curriculumProgress";
import { safeJsonParse } from "../../../utils/safeJsonParse";

const ERROR_MESSAGES = {
  INVALID_FILE: "El archivo seleccionado no es un PDF válido.",
  FILE_TOO_LARGE: "El PDF supera el tamaño máximo permitido de 10 MB.",
  NO_EXTRACTABLE_TEXT:
    "No pudimos leer el contenido de este PDF. Descárgalo nuevamente desde el portal de tu universidad e intenta otra vez.",
  UNRECOGNIZED_FORMAT:
    "El documento no tiene el formato de programación académica compatible con esta versión.",
  NO_SECTIONS: "No se encontraron secciones académicas en el documento.",
};


export default function AcademicProgrammingPage({ isEmbedded = false }) {
  const [status, setStatus] = useState("idle");
  const [programming, setProgramming] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [progress, setProgress] = useState({
    page: 0,
    totalPages: 0,
    percent: 0,
    sectionsDetected: 0,
  });
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [warningsOpen, setWarningsOpen] = useState(false);

  const [mallaData, setMallaData] = useState(null);
  const [progressState, setProgressState] = useState(() => readProgressStateFromStorage());
  const [mentionCode, setMentionCode] = useState(null);

  useEffect(() => {
    const theme = localStorage.getItem("malla-theme") || "aurora";
    const savedDark = localStorage.getItem("malla-darkmode");
    const darkMode = savedDark ? savedDark === "true" : true;
    document.documentElement.className = `${theme} ${darkMode ? "dark" : "light"}`;
  }, []);

  // Cargar malla al montar o al cambiar la selección en storage
  useEffect(() => {
    const savedMalla = safeJsonParse(localStorage.getItem("malla-seleccionada"), null);
    if (savedMalla?.url) {
      fetch(savedMalla.url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
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
        .catch((err) => console.error("Error loading curriculum details", err));
    }
  }, []);

  // Escuchar cambios de avance reactivos
  useEffect(() => {
    const handleProgressChange = () => {
      setProgressState(readProgressStateFromStorage());
      const savedMalla = safeJsonParse(localStorage.getItem("malla-seleccionada"), null);
      if (savedMalla) {
        const careerName = savedMalla.nombre || "Carrera";
        setMentionCode(readActiveMentionCode(careerName));
      }
    };
    window.addEventListener(MALLA_PROGRESS_EVENT, handleProgressChange);
    return () => {
      window.removeEventListener(MALLA_PROGRESS_EVENT, handleProgressChange);
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

  const reset = useCallback(() => {
    setStatus("idle");
    setProgramming(null);
    setErrorMessage(null);
    setProgress({ page: 0, totalPages: 0, percent: 0, sectionsDetected: 0 });
    setFilters({ ...DEFAULT_FILTERS });
    setWarningsOpen(false);
  }, []);

  const handleFileSelected = useCallback(async (file) => {
    setStatus("parsing");
    setErrorMessage(null);
    setProgramming(null);
    setProgress({ page: 0, totalPages: 0, percent: 0, sectionsDetected: 0 });
    setFilters({ ...DEFAULT_FILTERS });

    try {
      const result = await parseAcademicProgrammingFile(file, {
        onProgress: (p) => setProgress(p),
      });
      setProgramming(result);
      setStatus("ready");
    } catch (err) {
      const code = err?.code;
      setErrorMessage(
        (code && ERROR_MESSAGES[code]) ||
          err?.message ||
          "Ocurrió un error inesperado al procesar el PDF. Intenta con otro archivo."
      );
      setStatus("error");
    }
  }, []);

  return (
    <div className="min-h-screen bg-bgPrimary text-textPrimary">
      {!isEmbedded && status !== "ready" && (
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

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20">
        {(status === "idle" || status === "error") && (
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
                , entrar al botón <span className="font-extrabold text-textPrimary">"Ver programación académica"</span> y descargar el archivo como PDF. Luego, cárgalo aquí:
              </p>
            </div>
            <div className="w-full text-left">
              <ProgrammingPdfDropzone
                onFileSelected={handleFileSelected}
                error={status === "error" ? errorMessage : null}
              />
            </div>
            {status === "error" && (
              <div
                role="alert"
                className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400 text-center"
              >
                {errorMessage}{" "}
                <button type="button" onClick={reset} className="underline font-medium hover:text-red-800 transition-colors">
                  Reintentar
                </button>
              </div>
            )}
          </div>
        )}

        {status === "parsing" && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] fade-in">
            <ParsingProgress
              page={progress.page}
              totalPages={progress.totalPages}
              percent={progress.percent}
              sectionsDetected={progress.sectionsDetected}
            />
          </div>
        )}

        {status === "ready" && programming && (
          <div className="fade-in">
            <ScheduleBuilder
              integration={integration}
              programming={programming}
              allCourses={allCourses}
              filters={filters}
              setFilters={setFilters}
              filterOptions={filterOptions}
              onChangePdf={reset}
              mallaName={mallaData?.nombre}
              warningsOpen={warningsOpen}
              setWarningsOpen={setWarningsOpen}
              totalCourseCount={totalCourseCount}
              totalSectionCount={totalSectionCount}
              modalityCount={modalityCount}
              warningCount={warningCount}
            />
          </div>
        )}
      </main>
    </div>
  );
}
