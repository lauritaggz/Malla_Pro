import { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import { listarMallas } from "./utils/mallasLoader";
import MallaViewer from "./components/MallaViewer";
import ProgressBar from "./components/ProgressBar";
import StatsDisplay from "./components/StatsDisplay";
import ResumenProgreso from "./components/ResumenProgreso";
import NotasModal from "./components/NotasModal";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap } from "lucide-react";

export default function App() {
  const [theme, setTheme] = useState(
    localStorage.getItem("malla-theme") || "aurora"
  );
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("malla-darkmode");
    if (saved !== null) return saved === "true";
    return true;
  });

  const [progreso, setProgreso] = useState({ total: 0, aprobados: 0 });
  const [cursosCursando, setCursosCursando] = useState(0);
  const [modoExcepcional, setModoExcepcional] = useState(false);
  const [mallasDisponibles, setMallasDisponibles] = useState([]);
  const [mallaSeleccionada, setMallaSeleccionada] = useState(
    JSON.parse(localStorage.getItem("malla-seleccionada")) || null
  );
  const [excepcionesActivas, setExcepcionesActivas] = useState(0);
  const [cantidadSemestres, setCantidadSemestres] = useState(0);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [mallaData, setMallaData] = useState(null);
  const [aprobados, setAprobados] = useState([]);
  const [excepciones, setExcepciones] = useState([]);
  const [cursando, setCursando] = useState([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
  const [mostrarNotas, setMostrarNotas] = useState(false);

  const handleSemestresLoaded = useCallback((total) => {
    setCantidadSemestres(total);
  }, []);

  const handleAbrirNotas = useCallback((curso) => {
    setCursoSeleccionado(curso);
    setMostrarNotas(true);
  }, []);

  useEffect(() => {
    document.documentElement.className = `${theme} ${
      darkMode ? "dark" : "light"
    }`;
    localStorage.setItem("malla-theme", theme);
    localStorage.setItem("malla-darkmode", darkMode);
  }, [theme, darkMode]);

  useEffect(() => {
    listarMallas().then(setMallasDisponibles);
  }, []);

  function seleccionarMalla(malla) {
    setMallaSeleccionada(malla);
    localStorage.setItem("malla-seleccionada", JSON.stringify(malla));
  }

  // Debugging logs
  useEffect(() => {
    console.log("mallaData:", mallaData);
    console.log("mostrarResumen:", mostrarResumen);
  }, [mallaData, mostrarResumen]);

  return (
    <div className="min-h-screen transition-all duration-500 bg-bgPrimary text-textPrimary overflow-x-hidden relative">
      {/* 🔹 NAVBAR — siempre arriba */}
      <Navbar
        theme={theme}
        setTheme={setTheme}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        modoExcepcional={modoExcepcional}
        setModoExcepcional={setModoExcepcional}
        excepcionesActivas={excepcionesActivas}
        mallaSeleccionada={mallaSeleccionada}
        cantidadSemestres={cantidadSemestres}
        onVerProgreso={() => setMostrarResumen(true)}
      />

      {/* 🔹 Fade visual entre navbar y contenido */}
      <div className="absolute top-[100px] left-0 right-0 h-[80px] bg-gradient-to-b from-bgSecondary/40 via-bgPrimary/10 to-transparent z-[20] pointer-events-none" />

      {/* 🔹 Contenedor principal (debajo del navbar) */}
      <div className="relative z-[10] pt-[180px] sm:pt-[190px] md:pt-[200px] transition-all duration-500">
        {mallaSeleccionada && (
          <>
            <ProgressBar
              totalCursos={progreso.total}
              cursosAprobados={progreso.aprobados}
            />
            <StatsDisplay
              totalCursos={progreso.total}
              cursosAprobados={progreso.aprobados}
              cursosCursando={cursosCursando}
            />
          </>
        )}

        {/* 🔹 Selección de malla */}
        {!mallaSeleccionada ? (
          <div className="flex items-center justify-center h-[80vh]">
            <div className="bg-bgSecondary p-8 rounded-xl shadow-lg max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4 text-center">
                <GraduationCap className="inline-block w-6 h-6 mr-2" />{" "}
                Selecciona una malla para comenzar
              </h2>

              {mallasDisponibles.length === 0 ? (
                <p className="text-textSecondary text-center">
                  Cargando mallas...
                </p>
              ) : (
                mallasDisponibles.map((uni) => (
                  <div key={uni.universidad} className="mb-6">
                    <h3 className="font-semibold text-primary mb-2">
                      {uni.universidad}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {uni.mallas.map((m) => (
                        <button
                          key={m.nombre}
                          onClick={() => seleccionarMalla(m)}
                          className="p-3 rounded-lg border border-borderColor bg-bgPrimary hover:bg-primary hover:text-white transition-all"
                        >
                          {m.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <main>
            <MallaViewer
              mallaSeleccionada={mallaSeleccionada}
              modoExcepcional={modoExcepcional}
              setExcepcionesActivas={setExcepcionesActivas}
              onTotalCursosChange={setProgreso}
              onSemestresLoaded={handleSemestresLoaded}
              onCursandoChange={setCursosCursando}
              onMallaDataLoaded={setMallaData}
              onAprobadosChange={setAprobados}
              onExcepcionesChange={setExcepciones}
              onCursandoArrayChange={setCursando}
              onAbrirNotas={handleAbrirNotas}
            />
          </main>
        )}
      </div>

      {/* 🔹 Modal de resumen */}
      <AnimatePresence>
        {mostrarResumen && mallaData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] overflow-y-auto"
            onClick={() => setMostrarResumen(false)}
          >
            <div
              className="min-h-screen py-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMostrarResumen(false)}
                className="fixed top-4 right-4 z-[70] w-10 h-10 rounded-full bg-bgSecondary 
                           hover:bg-bgTertiary border border-borderColor shadow-theme
                           flex items-center justify-center text-textPrimary transition-all"
              >
                ✕
              </button>
              <ResumenProgreso
                mallaData={mallaData}
                aprobados={aprobados}
                excepciones={excepciones}
                cursando={cursando}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔹 Modal de notas */}
      {mostrarNotas && cursoSeleccionado && (
        <NotasModal
          curso={cursoSeleccionado}
          isOpen={mostrarNotas}
          onClose={() => {
            setMostrarNotas(false);
            setCursoSeleccionado(null);
          }}
        />
      )}
    </div>
  );
}
