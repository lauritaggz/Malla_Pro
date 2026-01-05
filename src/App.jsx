import { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import { listarMallas } from "./utils/mallasLoader";
import MallaViewer from "./components/MallaViewer";
import StatsDisplay from "./components/StatsDisplay";
import ResumenProgreso from "./components/ResumenProgreso";
import NotasModal from "./components/NotasModal";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap } from "lucide-react";

export default function App() {
  const [navbarHeight, setNavbarHeight] = useState(180);

  const [theme, setTheme] = useState(
    localStorage.getItem("malla-theme") || "aurora"
  );
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("malla-darkmode");
    return saved ? saved === "true" : true;
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

  // ---------------- NAVBAR HEIGHT LISTENER ----------------
  useEffect(() => {
    const handler = (e) => setNavbarHeight(e.detail);
    window.addEventListener("navbarHeightChange", handler);
    return () => window.removeEventListener("navbarHeightChange", handler);
  }, []);

  // ---------------- THEME & DARKMODE ----------------
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

  const seleccionarMalla = (malla) => {
    setMallaSeleccionada(malla);
    localStorage.setItem("malla-seleccionada", JSON.stringify(malla));
  };

  const handleSemestresLoaded = useCallback(
    (total) => setCantidadSemestres(total),
    []
  );

  const handleAbrirNotas = useCallback((curso) => {
    setCursoSeleccionado(curso);
    setMostrarNotas(true);
  }, []);

  return (
    <div className="min-h-screen bg-bgPrimary text-textPrimary overflow-x-hidden relative">
      {/* NAVBAR */}
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

      {/* CONTENIDO PRINCIPAL CON PADDING DINÁMICO */}
      <div
        className="relative z-[10] transition-all duration-300"
        style={{ paddingTop: navbarHeight + 20 }}
      >
        {mallaSeleccionada && (
          <StatsDisplay
            totalCursos={progreso.total}
            cursosAprobados={progreso.aprobados}
            cursosCursando={cursosCursando}
            cursosEnCursoData={
              mallaData?.semestres?.flatMap((s) =>
                s.cursos.filter((c) => cursando.includes(c.id))
              ) || []
            }
          />
        )}

        {!mallaSeleccionada ? (
          <div className="flex items-center justify-center h-[80vh]">
            <div className="bg-bgSecondary p-8 rounded-xl shadow-lg max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4 text-center">
                <GraduationCap className="inline-block w-6 h-6 mr-2" />
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
              onCursandoChange={setCursosCursando} // ← guarda el número
              onCursandoArrayChange={setCursando} // ← guarda el array real
              onMallaDataLoaded={setMallaData}
              onAprobadosChange={setAprobados}
              onExcepcionesChange={setExcepciones}
              onAbrirNotas={handleAbrirNotas}
            />
          </main>
        )}
      </div>

      {/* MODAL RESUMEN */}
      <AnimatePresence>
        {mostrarResumen && mallaData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={() => setMostrarResumen(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <ResumenProgreso
                isOpen={mostrarResumen}
                onClose={() => setMostrarResumen(false)}
                mallaData={mallaData}
                aprobados={aprobados}
                excepciones={excepciones}
                cursando={cursando}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL NOTAS */}
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
