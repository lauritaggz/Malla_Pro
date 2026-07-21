import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap, Moon, Sun, FileText, HelpCircle,
  CalendarDays, ChevronDown, BookMarked, Heart, MessageCircle, CalendarRange,
  ChevronUp, Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GooeyNav from "./GooeyNav";

const THEMES = [
  { id: "aurora",   name: "Aurora",   color: "#2563EB" },
  { id: "sunset",   name: "Sunset",   color: "#DB2777" },
  { id: "emerald",  name: "Emerald",  color: "#059669" },
  { id: "midnight", name: "Midnight", color: "#7C3AED" },
  { id: "golden",   name: "Golden",   color: "#D97706" },
];

function NavBtn({ onClick, label, active, children, amber }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`
        w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 border border-transparent
        ${active
          ? amber
            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
            : "bg-primary/10 text-primary border-primary/20"
          : "text-textSecondary hover:text-textPrimary hover:bg-borderColor/40"}
      `}
    >
      {children}
    </button>
  );
}

export default function Navbar({
  theme,
  setTheme,
  darkMode,
  setDarkMode,
  modoExcepcional,
  setModoExcepcional,
  excepcionesActivas = 0,
  mallaSeleccionada,
  cantidadSemestres,
  onShowTour,
  onShowHorario,
  onShowContacto,
  mostrarResumen,
  onVerProgreso,
  onChangeMalla,
  vistaPrincipal = "malla",
  setVistaPrincipal,
}) {
  const navRef = useRef(null);
  const settingsRef = useRef(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navigate = useNavigate();

  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem("navbar-minimized") === "true";
  });

  const handleToggleMinimize = () => {
    const next = !isMinimized;
    setIsMinimized(next);
    localStorage.setItem("navbar-minimized", String(next));
  };

  const navItems = [
    {
      label: "Mi malla",
      href: "/app",
      icon: <BookMarked className="w-3.5 h-3.5" />,
      onClick: (e) => {
        e.preventDefault();
        setVistaPrincipal("malla");
        navigate("/app");
      }
    },
    {
      label: "Periodo actual",
      href: "/app",
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      onClick: (e) => {
        e.preventDefault();
        setVistaPrincipal("periodo-actual");
        navigate("/app");
      }
    },
    {
      label: "Toma de Ramos",
      href: "/programacion-academica",
      icon: <CalendarRange className="w-3.5 h-3.5" />,
      onClick: (e) => {
        e.preventDefault();
        setVistaPrincipal("toma-de-ramos");
        navigate("/programacion-academica");
      }
    },
    {
      label: "Tutorías",
      href: "/app",
      icon: <MessageCircle className="w-3.5 h-3.5" />,
      onClick: (e) => {
        e.preventDefault();
        setVistaPrincipal("tutorias");
        navigate("/app");
      }
    }
  ];

  const activeIndex = 
    vistaPrincipal === "malla" ? 0 : 
    vistaPrincipal === "periodo-actual" ? 1 : 
    vistaPrincipal === "toma-de-ramos" ? 2 : 3;

  /* Scroll shadow */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Navbar height reporting */
  useEffect(() => {
    const report = () => {
      const h = isMinimized ? 0 : (navRef.current?.offsetHeight || 0);
      window.dispatchEvent(new CustomEvent("navbarHeightChange", { detail: h }));
    };
    report();
    const obs = new ResizeObserver(report);
    if (navRef.current) obs.observe(navRef.current);
    return () => obs.disconnect();
  }, [isMinimized]);

  /* Close user menu on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
  const uni = mallaSeleccionada?.url?.includes("uch") ? "U. de Chile" : "UNAB";

  return (
    <>
      <nav
        ref={navRef}
        id="app-navbar"
        className={`
          fixed top-0 left-0 right-0 z-[80]
          pt-[env(safe-area-inset-top,0px)]
          bg-bgSecondary/90 backdrop-blur-xl
          border-b border-borderColor/60
          transition-[box-shadow,opacity,transform] duration-300 ease-out
          ${isScrolled ? "shadow-sm" : ""}
          ${mostrarResumen || isMinimized ? "opacity-0 pointer-events-none -translate-y-full" : "opacity-100 translate-y-0"}
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-4">

          {/* ── Left: Brand ── */}
          <div className="flex items-center gap-2.5 min-w-0 md:flex-1 md:max-w-[45%]">
            <div
              className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white"
              style={{ background: "var(--primary)" }}
            >
              <BookMarked className="w-3.5 h-3.5" />
            </div>

            <div className="flex flex-col min-w-0 leading-tight">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="font-bold text-xs sm:text-sm text-textPrimary truncate flex-shrink-0">
                  Malla Pro
                </span>
                {mallaSeleccionada && (
                  <span className="hidden md:inline text-[11px] sm:text-xs font-semibold text-textSecondary/80 truncate">
                    / {mallaSeleccionada.nombre} ({uni})
                  </span>
                )}
              </div>
              {mallaSeleccionada && (
                <span className="text-[9px] font-bold text-textSecondary/80 uppercase tracking-wider md:hidden">
                  {uni}
                </span>
              )}
            </div>
          </div>

          {/* ── Center: Gooey Nav Switcher (Desktop/Tablet) ── */}
          <div className="hidden sm:flex flex-1 justify-center min-w-0">
            <GooeyNav items={navItems} activeIndex={activeIndex} />
          </div>

          {/* ── Right: User Controls & Menu ── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            
            {/* Excepcional indicator */}
            {modoExcepcional && excepcionesActivas > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold tracking-wide select-none">
                <FileText className="w-3 h-3" />
                <span>{excepcionesActivas} Excep.</span>
              </div>
            )}

            {/* Configuration Dropdown */}
            <div ref={settingsRef} className="relative">
              <button
                onClick={() => setSettingsOpen((prev) => !prev)}
                className={`w-8.5 h-8.5 rounded-full border flex items-center justify-center text-textSecondary hover:text-textPrimary transition-all duration-200
                  ${settingsOpen ? "bg-primary/10 border-primary/45 text-primary" : "border-borderColor hover:border-borderColor/80 hover:bg-borderColor/20"}`}
                aria-label="Configuración y apariencia"
              >
                <Settings className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-2 w-72 bg-bgSecondary border border-borderColor rounded-2xl shadow-xl z-50 p-4"
                  >
                    <div className="flex flex-col gap-3.5">
                      {/* Sub-Header */}
                      <div className="pb-2.5 border-b border-borderColor/60 select-none">
                        <p className="text-xs font-bold text-textPrimary leading-snug truncate">
                          {mallaSeleccionada?.nombre || "Malla Pro"}
                        </p>
                        <p className="text-[9px] font-bold text-textSecondary/80 mt-0.5 uppercase tracking-wider leading-none">
                          {uni}
                        </p>
                      </div>

                      {/* Main Actions */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => { onVerProgreso?.(); setSettingsOpen(false); }}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-textSecondary" />
                          <span>Resumen de progreso</span>
                        </button>

                        {mallaSeleccionada && (
                          <button
                            onClick={() => { onShowHorario?.(); setSettingsOpen(false); }}
                            className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center gap-2"
                          >
                            <CalendarDays className="w-3.5 h-3.5 text-textSecondary" />
                            <span>Ver mi horario</span>
                          </button>
                        )}
                      </div>

                      {/* Appearance settings */}
                      <div className="pt-2.5 border-t border-borderColor/60">
                        <p className="text-[9.5px] font-bold text-textSecondary/90 uppercase tracking-widest px-2 mb-2 select-none">Apariencia</p>
                        
                        {/* Swatches list */}
                        <div className="flex gap-2 justify-between px-2 mb-3">
                          {THEMES.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setTheme(t.id)}
                              aria-label={`Tema ${t.name}`}
                              className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0
                                ${theme === t.id ? "border-primary scale-110 shadow-sm" : "border-transparent hover:scale-105"}`}
                              style={{ background: t.color }}
                            />
                          ))}
                        </div>

                        {/* DarkMode Toggle Switch */}
                        <button
                          onClick={() => setDarkMode(!darkMode)}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            {darkMode ? <Moon className="w-3.5 h-3.5 text-textSecondary" /> : <Sun className="w-3.5 h-3.5 text-textSecondary" />}
                            <span>Modo oscuro</span>
                          </span>
                          <div className={`w-7.5 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${darkMode ? "bg-primary" : "bg-borderColor"}`}>
                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${darkMode ? "translate-x-3.5" : "translate-x-0"}`} />
                          </div>
                        </button>
                      </div>

                      {/* Configurations */}
                      <div className="pt-2.5 border-t border-borderColor/60 flex flex-col gap-1">
                        <p className="text-[9.5px] font-bold text-textSecondary/90 uppercase tracking-widest px-2 mb-2 select-none">Configuración</p>

                        {/* Exceptional switch */}
                        <button
                          onClick={() => setModoExcepcional(!modoExcepcional)}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <GraduationCap className="w-3.5 h-3.5 text-textSecondary" />
                            <span>Modo excepcional</span>
                          </span>
                          <div className={`w-7.5 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${modoExcepcional ? "bg-amber-500" : "bg-borderColor"}`}>
                            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${modoExcepcional ? "translate-x-3.5" : "translate-x-0"}`} />
                          </div>
                        </button>

                        <button
                          onClick={() => { onShowTour?.(); setSettingsOpen(false); }}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center gap-2"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-textSecondary" />
                          <span>Ver guía interactiva</span>
                        </button>

                        <button
                          onClick={() => { onShowContacto?.(); setSettingsOpen(false); }}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center gap-2"
                        >
                          <Heart className="w-3.5 h-3.5 text-textSecondary" />
                          <span>Sugerir carrera</span>
                        </button>

                        {onChangeMalla && (
                          <button
                            onClick={() => { onChangeMalla(); setSettingsOpen(false); }}
                            className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-2 mt-1.5 border border-red-500/10"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Cambiar de malla</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Collapse navbar trigger */}
            <button
              onClick={handleToggleMinimize}
              aria-label="Minimizar barra"
              className="w-8.5 h-8.5 rounded-full border border-borderColor hover:border-borderColor/80 hover:bg-borderColor/20 flex items-center justify-center text-textSecondary hover:text-textPrimary transition-all duration-200"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Floating expand handle when minimized */}
      {isMinimized && !mostrarResumen && (
        <button
          type="button"
          onClick={handleToggleMinimize}
          className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[85] bg-primary text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-[0_4px_16px_rgba(0,0,0,0.18)] flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all animate-bounce"
          style={{ animationDuration: '2.5s' }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>Expandir Menú</span>
        </button>
      )}
    </>
  );
}

// Simple placeholder icon refresh
function RefreshCw({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M16 3h5v5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 21H3v-5"/></svg>
  );
}
