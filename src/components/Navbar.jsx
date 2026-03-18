import { useState, useEffect, useRef } from "react";
import {
  GraduationCap, Moon, Sun, FileText, HelpCircle,
  CalendarDays, ChevronDown, BookMarked,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const THEMES = [
  { id: "aurora",   name: "Aurora",   color: "#2563EB" },
  { id: "sunset",   name: "Sunset",   color: "#DB2777" },
  { id: "emerald",  name: "Emerald",  color: "#059669" },
  { id: "midnight", name: "Midnight", color: "#7C3AED" },
  { id: "golden",   name: "Golden",   color: "#D97706" },
];

/* Small icon button used in the right control strip */
function NavBtn({ onClick, label, active, children, amber }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`
        w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150
        ${active
          ? amber
            ? "bg-amber-400/20 text-amber-500"
            : "bg-primary/10 text-primary"
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
  mostrarResumen,
}) {
  const navRef      = useRef(null);
  const [isScrolled, setIsScrolled]         = useState(false);
  const [themeOpen,  setThemeOpen]          = useState(false);
  const [semestreOpen, setSemestreOpen]     = useState(false);
  const themeRef    = useRef(null);
  const semestreRef = useRef(null);

  /* Scroll shadow */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Navbar height reporting */
  useEffect(() => {
    const report = () => {
      const h = navRef.current?.offsetHeight || 0;
      window.dispatchEvent(new CustomEvent("navbarHeightChange", { detail: h }));
    };
    report();
    const obs = new ResizeObserver(report);
    if (navRef.current) obs.observe(navRef.current);
    return () => obs.disconnect();
  }, []);

  /* Close popovers on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) setThemeOpen(false);
      if (semestreRef.current && !semestreRef.current.contains(e.target)) setSemestreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
  const uni = mallaSeleccionada?.url?.includes("uch") ? "U. de Chile" : "UNAB";

  return (
    <nav
      ref={navRef}
      id="app-navbar"
      className={`
        fixed top-0 left-0 right-0 z-[80]
        bg-bgSecondary/90 backdrop-blur-xl
        border-b border-borderColor
        transition-[box-shadow,opacity,transform] duration-200
        ${isScrolled ? "shadow-sm" : ""}
        ${mostrarResumen ? "opacity-0 pointer-events-none -translate-y-full" : "opacity-100 translate-y-0"}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">

        {/* ── Left: Brand ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* App icon */}
          <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: "var(--primary)" }}>
            <BookMarked className="w-3.5 h-3.5 text-white" />
          </div>

          {mallaSeleccionada ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-semibold text-sm text-textPrimary truncate leading-tight">
                {mallaSeleccionada.nombre}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-primaryMuted text-primary border border-primary/20 flex-shrink-0">
                <GraduationCap className="w-3 h-3" />
                {uni}
              </span>
            </div>
          ) : (
            <span className="font-semibold text-sm text-textPrimary">Malla Pro</span>
          )}
        </div>

        {/* ── Right: Controls ─────────────────────────────────── */}
        <div className="flex items-center gap-1">

          {/* Marcar hasta semestre */}
          {mallaSeleccionada && cantidadSemestres > 0 && (
            <div ref={semestreRef} className="relative hidden sm:block">
              <button
                onClick={() => setSemestreOpen((v) => !v)}
                aria-label="Marcar hasta semestre"
                className={`
                  h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all duration-150
                  ${semestreOpen
                    ? "bg-primary/10 text-primary"
                    : "text-textSecondary hover:text-textPrimary hover:bg-borderColor/40"}
                `}
              >
                <span>Marcar hasta</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${semestreOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {semestreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1.5 bg-bgSecondary border border-borderColor rounded-xl shadow-lg z-50 py-1 min-w-[160px]"
                  >
                    {Array.from({ length: cantidadSemestres }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent("aprobarHastaSemestre", { detail: i + 1 }));
                          setSemestreOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-textSecondary hover:text-textPrimary hover:bg-borderColor/30 transition-colors"
                      >
                        Semestre {i + 1}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Divider */}
          {mallaSeleccionada && (
            <div className="hidden sm:block w-px h-4 bg-borderColor mx-1" />
          )}

          {/* Theme swatches popover */}
          <div ref={themeRef} className="relative">
            <button
              onClick={() => setThemeOpen((v) => !v)}
              aria-label="Cambiar tema"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:bg-borderColor/40"
            >
              <span
                className="w-4 h-4 rounded-full border-2 border-white/30 shadow-sm flex-shrink-0"
                style={{ background: currentTheme.color }}
              />
            </button>
            <AnimatePresence>
              {themeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 bg-bgSecondary border border-borderColor rounded-xl shadow-lg z-50 p-2.5"
                >
                  <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider px-1.5 mb-2">Tema</p>
                  <div className="flex flex-col gap-1">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                          theme === t.id ? "bg-borderColor/50 text-textPrimary font-medium" : "text-textSecondary hover:text-textPrimary hover:bg-borderColor/30"
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-1 ring-black/10"
                          style={{ background: t.color }} />
                        {t.name}
                        {theme === t.id && (
                          <span className="ml-auto text-primary text-xs">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dark mode */}
          <NavBtn onClick={() => setDarkMode(!darkMode)} label="Alternar modo oscuro">
            {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </NavBtn>

          {/* Horario */}
          {mallaSeleccionada && (
            <NavBtn onClick={onShowHorario} label="Abrir horario">
              <CalendarDays className="w-4 h-4" />
            </NavBtn>
          )}

          {/* Ayuda */}
          {mallaSeleccionada && (
            <NavBtn onClick={onShowTour} label="Ver ayuda">
              <HelpCircle className="w-4 h-4" />
            </NavBtn>
          )}

          {/* Divider */}
          {mallaSeleccionada && (
            <div className="hidden sm:block w-px h-4 bg-borderColor mx-1" />
          )}

          {/* Excepcional */}
          {mallaSeleccionada && (
            <button
              onClick={() => setModoExcepcional(!modoExcepcional)}
              aria-label={modoExcepcional ? "Desactivar modo excepcional" : "Activar modo excepcional"}
              className={`
                hidden sm:flex relative h-8 px-3 rounded-lg items-center gap-1.5 text-xs font-semibold transition-all duration-200 border
                ${modoExcepcional
                  ? "bg-amber-400/15 text-amber-600 border-amber-400/40 dark:text-amber-400"
                  : "bg-primary/8 text-primary border-primary/20 hover:bg-primary/12"}
              `}
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Excepcional</span>
              {excepcionesActivas > 0 && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {excepcionesActivas}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
