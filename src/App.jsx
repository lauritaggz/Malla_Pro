import { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import { listarMallas } from "./utils/mallasLoader";
import MallaViewer from "./components/MallaViewer";
import { MemoizedStatsDisplay as StatsDisplay } from "./components/StatsDisplay";
import ResumenProgreso from "./components/ResumenProgreso";
import NotasModal from "./components/NotasModal";
import OnboardingTour from "./components/OnboardingTour";
import MobileBottomNav from "./components/MobileBottomNav";
import HorarioModal from "./components/HorarioModal";
import LoginSuggestion, { shouldShowLogin, getStoredUser } from "./components/LoginSuggestion";
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
  const [cursoEsEnCurso, setCursoEsEnCurso] = useState(false);
  const [cursoEsAprobado, setCursoEsAprobado] = useState(false);
  const [mostrarNotas, setMostrarNotas] = useState(false);
  const [mostrarTour, setMostrarTour] = useState(false);
  const [ocultarCompletados, setOcultarCompletados] = useState(false);
  const [mostrarHorario, setMostrarHorario] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  // Detectar si es dispositivo touch
  const isMobile = typeof window !== 'undefined' && 
    (('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 1024);

  // ---------------- LÓGICA CAMBIAR MALLA ----------------
  const handleCambiarMalla = () => {
    if (confirm("¿Deseas cambiar de malla? Tus ramos aprobados con el mismo nombre se mantendrán automáticamente.")) {
      // Analizar aprobados y guardar los nombres exactos antes de resetear
      if (mallaData && aprobados.length > 0) {
        const nombresAprobados = mallaData.semestres
          .flatMap((s) => s.cursos)
          .filter((c) => aprobados.includes(c.id))
          .map((c) => c.nombre.trim().toLowerCase());
          
        localStorage.setItem("malla-nombres-conservados", JSON.stringify(nombresAprobados));
      }

      setMallaSeleccionada(null);
      localStorage.removeItem("malla-seleccionada");
      localStorage.removeItem("malla-aprobados");
      localStorage.removeItem("malla-excepciones");
      localStorage.removeItem("malla-cursando");
      
      // Resetear estado general para que quede en 0
      setProgreso({ total: 0, aprobados: 0 });
      setCursosCursando(0);
      setCursando([]);
      setAprobados([]);
      setExcepciones([]);
    }
  };

  // Mostrar login sugerido una vez al seleccionar una malla
  useEffect(() => {
    if (mallaSeleccionada && shouldShowLogin()) {
      setMostrarLogin(true);
    }
  }, [mallaSeleccionada]);

  // Mostrar Tour la primera vez (solo después de que el login fue manejado)
  useEffect(() => {
    if (!mostrarLogin) {
      const hasSeenTour = localStorage.getItem("malla-has-seen-tour");
      if (!hasSeenTour && mallaSeleccionada) {
        setMostrarTour(true);
        localStorage.setItem("malla-has-seen-tour", "true");
      }
    }
  }, [mallaSeleccionada, mostrarLogin]);

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

  const seleccionarMalla = useCallback((malla) => {
    setMallaSeleccionada(malla);
    localStorage.setItem("malla-seleccionada", JSON.stringify(malla));
  }, []);

  const handleSemestresLoaded = useCallback(
    (total) => setCantidadSemestres(total),
    []
  );

  const handleAbrirNotas = useCallback((curso, esEnCurso, esAprobado) => {
    setCursoSeleccionado(curso);
    setCursoEsEnCurso(esEnCurso);
    setCursoEsAprobado(esAprobado);
    setMostrarNotas(true);
  }, []);

  const handleSetProgreso = useCallback((val) => setProgreso(val), []);
  const handleSetCursosCursando = useCallback((val) => setCursosCursando(val), []);
  const handleSetCursando = useCallback((val) => setCursando(val), []);
  const handleSetMallaData = useCallback((val) => setMallaData(val), []);
  const handleSetAprobados = useCallback((val) => setAprobados(val), []);
  const handleSetExcepciones = useCallback((val) => setExcepciones(val), []);

  return (
    <div className="min-h-screen bg-bgPrimary text-textPrimary overflow-x-hidden relative">
      {/* NAVBAR */}
      {mallaSeleccionada && (
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
          onShowTour={() => setMostrarTour(true)}
          onShowHorario={() => setMostrarHorario(true)}
          mostrarResumen={mostrarResumen}
        />
      )}

      {mallaSeleccionada && (
        <MobileBottomNav
          theme={theme}
          setTheme={setTheme}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          modoExcepcional={modoExcepcional}
          setModoExcepcional={setModoExcepcional}
          excepcionesActivas={excepcionesActivas}
          cantidadSemestres={cantidadSemestres}
          onVerProgreso={() => setMostrarResumen(prev => !prev)}
          mostrarResumen={mostrarResumen}
          ocultarCompletados={ocultarCompletados}
          setOcultarCompletados={setOcultarCompletados}
          onShowTour={() => setMostrarTour(true)}
          onShowHorario={() => setMostrarHorario(true)}
          onChangeMalla={handleCambiarMalla}
        />
      )}

      {/* CONTENIDO PRINCIPAL CON PADDING DINÁMICO SOLO SI HAY NAVBAR */}
      <div
        className="relative z-[10] transition-all duration-300"
        style={{ paddingTop: mallaSeleccionada ? navbarHeight + 20 : 0 }}
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
          <div className="flex items-center justify-center min-h-[80vh] py-10">
            <div className="bg-bgSecondary p-6 sm:p-10 rounded-2xl shadow-xl max-w-2xl w-full mx-4 border border-borderColor/50">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {uni.mallas.map((m) => (
                        <button
                          key={m.nombre}
                          onClick={() => seleccionarMalla(m)}
                          className="p-4 rounded-xl border border-borderColor bg-bgPrimary hover:bg-primary hover:text-white transition-all text-sm font-medium shadow-sm hover:shadow-md active:scale-[0.98] text-left sm:text-center leading-snug"
                        >
                          {m.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
              
              {/* Enlace de contacto Destacado */}
              <div className="mt-10 overflow-hidden relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 text-center shadow-lg transition-all duration-300 hover:shadow-primary/10 hover:-translate-y-1">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <h3 className="font-semibold text-textPrimary text-lg mb-2 flex items-center justify-center gap-2 relative z-10">
                  <span className="text-xl">🤔</span> ¿No encuentras tu malla?
                </h3>
                <p className="text-sm text-textSecondary mb-5 relative z-10">
                  ¡Escríbenos y la agregamos rápidamente para que puedas usar la app!
                </p>
                <a
                  href="mailto:lauragv910@gmail.com?subject=Solicitud%20Nueva%20Malla%20-%20Malla%20Pro&body=Hola!%20Me%20gustar%C3%ADa%20que%20agreguen%20una%20nueva%20malla.%20%C2%BFCu%C3%A1les%20son%20los%20pasos%20para%20poder%20agregarla%3F"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white bg-primary hover:brightness-110 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all transform hover:scale-105 relative z-10 w-full sm:w-auto"
                >
                  ¡Contáctanos aquí!
                </a>
              </div>
            </div>
          </div>
        ) : (
          <main>
            <MallaViewer
              mallaSeleccionada={mallaSeleccionada}
              modoExcepcional={modoExcepcional}
              setExcepcionesActivas={setExcepcionesActivas}
              onTotalCursosChange={handleSetProgreso}
              onSemestresLoaded={handleSemestresLoaded}
              onCursandoChange={handleSetCursosCursando}
              onCursandoArrayChange={handleSetCursando}
              onMallaDataLoaded={handleSetMallaData}
              onAprobadosChange={handleSetAprobados}
              onExcepcionesChange={handleSetExcepciones}
              onAbrirNotas={handleAbrirNotas}
              ocultarCompletados={ocultarCompletados}
              setOcultarCompletados={setOcultarCompletados}
            />
            
            {/* BOTÓN CAMBIAR MALLA */}
            <div className="flex justify-center pb-8 mt-2">
              <button
                onClick={handleCambiarMalla}
                className="text-xs text-textSecondary/60 hover:text-primary transition-colors px-4 py-2 rounded-full hover:bg-primary/10"
              >
                ¿Esta no es tu carrera? Cambiar malla
              </button>
            </div>
          </main>
        )}
      </div>

      {/* MODAL RESUMEN */}
      {/* MODAL RESUMEN */}
      {mallaData && (
        <ResumenProgreso
          isOpen={mostrarResumen}
          onClose={() => setMostrarResumen(false)}
          mallaData={mallaData}
          aprobados={aprobados}
          excepciones={excepciones}
          cursando={cursando}
        />
      )}

      {/* MODAL NOTAS */}
      {mostrarNotas && cursoSeleccionado && (
        <NotasModal
          curso={cursoSeleccionado}
          enCurso={cursoEsEnCurso}
          aprobado={cursoEsAprobado}
          isOpen={mostrarNotas}
          onClose={() => {
            setMostrarNotas(false);
            setCursoSeleccionado(null);
            setCursoEsEnCurso(false);
            setCursoEsAprobado(false);
          }}
        />
      )}

      {/* LOGIN SUGERIDO */}
      <LoginSuggestion
        isOpen={mostrarLogin}
        onClose={(user) => {
          setMostrarLogin(false);
          if (user) setCurrentUser(user);
        }}
      />

      {/* ONBOARDING TOUR */}
      <OnboardingTour 
        isVisible={mostrarTour} 
        onClose={() => setMostrarTour(false)} 
        isMobile={isMobile}
      />

      {/* MODAL HORARIO */}
      {mallaSeleccionada && mallaData && (
        <HorarioModal
          isOpen={mostrarHorario}
          onClose={() => setMostrarHorario(false)}
          cursosCursandoData={
            mallaData?.semestres?.flatMap((s) =>
              s.cursos.filter((c) => cursando.includes(c.id))
            ) || []
          }
        />
      )}
    </div>
  );
}
