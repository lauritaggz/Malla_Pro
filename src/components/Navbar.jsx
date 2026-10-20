import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap, CalendarDays, ChevronDown, BookMarked, MessageCircle, CalendarRange,
  ChevronUp, Settings, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GooeyNav from "./GooeyNav";
import AppSettingsPanel from "./AppSettingsPanel";

function NavBtn({ onClick, label, active, children, amber }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`
        w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 border border-transparent
        ${active
          ? amber
            ? "bg-exception/10 text-exception border-exception/20"
            : "bg-primary/10 text-primary border-primary/20"
          : "text-textSecondary hover:text-textPrimary hover:bg-borderColor/40"}
      `}
    >
      {children}
    </button>
  );
}

export default function Navbar({
  darkMode,
  setDarkMode,
  modoExcepcional,
  setModoExcepcional,
  excepcionesActivas = 0,
  mallaSeleccionada,
  cantidadSemestres,
  onShowTour,
  onShowContacto,
  mostrarResumen,
  onVerProgreso,
  onChangeMalla,
  vistaPrincipal = "malla",
  setVistaPrincipal,
  onGuardLeave,
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
        if (onGuardLeave && !onGuardLeave()) return;
        setVistaPrincipal("periodo-actual");
        navigate("/app");
      }
    },
    {
      label: "Horario",
      href: "/programacion-academica",
      icon: <CalendarRange className="w-3.5 h-3.5" />,
      onClick: (e) => {
        e.preventDefault();
        if (onGuardLeave && !onGuardLeave()) return;
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
        if (onGuardLeave && !onGuardLeave()) return;
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

  const uni = mallaSeleccionada?.url?.includes("uch") ? "U. de Chile" : "UNAB";

  return (
    <>
      <nav
        ref={navRef}
        id="app-navbar"
        className={`
          navbar-shell sm:hidden
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

          {/* ── Left: Back + Brand ── */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 md:flex-1 md:max-w-[45%]">
            <Link
              to="/"
              aria-label="Volver al inicio"
              title="Volver al inicio"
              onClick={(e) => {
                if (onGuardLeave && !onGuardLeave()) e.preventDefault();
              }}
              className="w-9 h-9 sm:w-8 sm:h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-borderColor/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
            </Link>

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
                  <span className="hidden md:inline text-[12px] sm:text-xs font-semibold text-textSecondary/80 truncate">
                    / {mallaSeleccionada.nombre} ({uni})
                  </span>
                )}
              </div>
              {mallaSeleccionada && (
                <span className="text-[12px] font-bold text-textSecondary/80 md:hidden">
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
            
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(false);
                setVistaPrincipal("malla");
                navigate("/app");
                if (!modoExcepcional) setModoExcepcional(true);
              }}
              className={`relative w-8.5 h-8.5 rounded-full border flex items-center justify-center transition-all duration-200
                ${modoExcepcional
                  ? "bg-exception/15 border-exception/45 text-exception"
                  : "border-borderColor text-textSecondary hover:text-exception hover:border-exception/40 hover:bg-exception/10"}`}
              aria-label="Modo excepcional: aprobar ramos sin cumplir prerrequisitos"
              title="Modo excepcional"
            >
              <GraduationCap className="w-4 h-4" />
              {excepcionesActivas > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-exception text-bgPrimary text-[12px] font-semibold leading-none flex items-center justify-center">
                  {excepcionesActivas}
                </span>
              )}
            </button>

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
                    <AppSettingsPanel
                      mallaSeleccionada={mallaSeleccionada}
                      uni={uni}
                      darkMode={darkMode}
                      setDarkMode={setDarkMode}
                      onGuardLeave={onGuardLeave}
                      onVerProgreso={onVerProgreso}
                      onShowTour={onShowTour}
                      onShowContacto={onShowContacto}
                      onChangeMalla={onChangeMalla}
                      onClose={() => setSettingsOpen(false)}
                    />
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
          className="sm:hidden fixed top-2.5 left-1/2 -translate-x-1/2 z-[85] bg-primary text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-[0_4px_16px_rgba(0,0,0,0.18)] flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-[transform,filter]"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>Expandir Menú</span>
        </button>
      )}
    </>
  );
}
