import { useState, useEffect, useRef } from "react";
import { GraduationCap, ChevronDown, Moon, Sun, FileText, HelpCircle, CalendarDays } from "lucide-react";

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
  const [mostrarControles, setMostrarControles] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // === MEDIR ALTURA REAL DEL NAVBAR ===
  const navRef = useRef(null);

  useEffect(() => {
    const updateHeight = () => {
      const height = navRef.current?.offsetHeight || 0;
      window.dispatchEvent(
        new CustomEvent("navbarHeightChange", { detail: height })
      );
    };

    updateHeight();
    const obs = new ResizeObserver(updateHeight);
    if (navRef.current) obs.observe(navRef.current);

    return () => obs.disconnect();
  }, []);

  const themes = [
    { id: "aurora", name: "Aurora Blue" },
    { id: "sunset", name: "Sunset Pink" },
    { id: "emerald", name: "Emerald Mist" },
    { id: "midnight", name: "Midnight Purple" },
    { id: "golden", name: "Golden Carbon" },
  ];

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <nav
      ref={navRef}
      id="app-navbar"
      className={`fixed top-0 left-0 right-0 z-[80]
                 backdrop-blur-xl bg-bgSecondary/70 border-b border-borderColor/20 dark:border-white/5
                 shadow-[0_4px_30px_rgba(0,0,0,0.1)]
                 transition-[opacity,transform] duration-300
                 ${mostrarResumen ? "opacity-0 pointer-events-none translate-y-[-100%]" : "opacity-100 translate-y-0"}`}
    >
      <div className={`max-w-7xl mx-auto px-6 relative select-none transition-all duration-300 ${isScrolled ? "py-2" : "py-4"}`}>
        {/* ---------------- HEADER SUPERIOR ---------------- */}
        <div className="flex items-center justify-between">
           <div className="flex flex-col">
            {mallaSeleccionada && (
              <>
                <h1 className={`font-bold text-primary tracking-tight transition-all duration-300 drop-shadow-sm ${isScrolled ? "text-lg md:text-xl" : "text-2xl md:text-3xl hover:scale-[1.02]"}`}>
                  {mallaSeleccionada.nombre}
                </h1>

                <div className={`flex items-center gap-2 transition-all duration-300 overflow-hidden ${isScrolled ? "max-h-0 opacity-0 mt-0" : "max-h-10 opacity-100 mt-1"}`}>
                  <span
                    className="text-xs md:text-sm font-medium text-primary/80 
                                  px-3 py-1 rounded-full bg-primary/10 border border-primary/20 shadow-inner"
                  >
                    <GraduationCap className="inline-block w-4 h-4 mr-1 text-primary" />
                    {mallaSeleccionada.url.includes("uch")
                      ? "Universidad de Chile"
                      : "UNAB"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* BOTÓN COLAPSAR */}
          <button
            onClick={() => setMostrarControles(!mostrarControles)}
            className="hidden sm:flex relative items-center justify-center w-10 h-10 rounded-full border border-borderColor/50 
                       bg-bgPrimary/50 backdrop-blur-md hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-300 hover:scale-110 shadow-sm"
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-500 ${
                mostrarControles ? "rotate-180 text-primary" : "text-textSecondary"
              }`}
            />
          </button>
        </div>

        <div className="w-full mt-4 mb-4" />

        {/* ---------------- CONTROLES (Optimizado) ---------------- */}
        <div
          className={`hidden sm:grid transition-[grid-template-rows,opacity,transform] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[grid-template-rows,opacity,transform] ${
            mostrarControles
              ? "grid-rows-[1fr] opacity-100 translate-y-0"
              : "grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative pt-3 border-t border-borderColor/20 dark:border-white/5">
            {/* SELECT MARCAR HASTA */}
            <div className="relative group w-full sm:w-auto">
              <select
                className="appearance-none rounded-xl px-4 py-2.5 border border-borderColor/50 bg-black/5 dark:bg-white/10 backdrop-blur-sm text-textPrimary text-sm font-medium
                           hover:shadow-md hover:border-primary/40 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all w-full cursor-pointer pr-10"
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value) {
                    window.dispatchEvent(
                      new CustomEvent("aprobarHastaSemestre", { detail: value })
                    );
                    e.target.value = "";
                  }
                }}
              >
                <option value="" className="text-textSecondary bg-bgPrimary">📘 Marcar hasta</option>
                {Array.from({ length: cantidadSemestres }).map((_, i) => (
                  <option key={i} value={i + 1} className="text-textPrimary bg-bgPrimary">
                    Semestre {i + 1}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary pointer-events-none" />

              {/* TOOLTIP */}
              <div
                className="absolute left-0 top-full mt-3 w-64 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 border border-white/10 dark:border-black/10
                           shadow-xl rounded-xl p-3 text-sm text-zinc-100 font-medium z-50
                           opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none"
              >
                <div className="absolute -top-1 left-4 w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45 border-t border-l border-white/10 dark:border-black/10"></div>
                Marca todos los ramos hasta ese semestre como aprobados ✔
              </div>
            </div>

            {/* SELECT TEMA */}
            <div className="relative group w-full sm:w-auto">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="appearance-none rounded-xl px-4 py-2.5 border border-borderColor/50 bg-black/5 dark:bg-white/10 backdrop-blur-sm text-textPrimary text-sm font-medium
                           hover:shadow-md hover:border-primary/40 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all w-full cursor-pointer pr-10"
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id} className="text-textPrimary bg-bgPrimary">
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary pointer-events-none" />

              <div
                className="absolute left-0 top-full mt-3 w-64 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 border border-white/10 dark:border-black/10
                           shadow-xl rounded-xl p-3 text-sm text-zinc-100 font-medium z-50
                           opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none"
              >
                 <div className="absolute -top-1 left-4 w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45 border-t border-l border-white/10 dark:border-black/10"></div>
                Cambia el estilo visual de la plataforma 🎨
              </div>
            </div>

            {/* CONTROLES DERECHOS */}
            <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
               {/* MODO OSCURO */}
              <button
                onClick={toggleDarkMode}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-bgPrimary/50 backdrop-blur-sm border border-borderColor/50 
                           flex items-center justify-center transition-all duration-300 
                           hover:scale-105 hover:bg-primary/10 hover:border-primary/40 hover:shadow-md text-primary"
                aria-label="Alternar modo oscuro"
              >
                {darkMode ? (
                  <Moon className="w-5 h-5 transition-transform duration-500 rotate-0 hover:rotate-12" />
                ) : (
                  <Sun className="w-5 h-5 transition-transform duration-500 rotate-0 hover:rotate-90" />
                )}
              </button>

              {/* HORARIO */}
              <button
                onClick={onShowHorario}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-bgPrimary/50 backdrop-blur-sm border border-borderColor/50 
                           flex items-center justify-center transition-all duration-300 
                           hover:scale-105 hover:bg-primary/10 hover:border-primary/40 hover:shadow-md text-primary"
                aria-label="Abrir Horario"
              >
                <CalendarDays className="w-5 h-5" />
              </button>

              {/* AYUDA / TOUR */}
              <button
                onClick={onShowTour}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-bgPrimary/50 backdrop-blur-sm border border-borderColor/50 
                           flex items-center justify-center transition-all duration-300 
                           hover:scale-105 hover:bg-primary/10 hover:border-primary/40 hover:shadow-md text-primary"
                aria-label="Ver Ayuda"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              {/* EXCEPCIONAL */}
              <div className="relative group flex-1 sm:flex-none">
                <button
                  onClick={() => setModoExcepcional(!modoExcepcional)}
                  className={`w-full px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 
                              flex items-center justify-center gap-2 border
                              ${
                                modoExcepcional
                                  ? "bg-amber-400 text-amber-950 border-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                                  : "bg-primary text-white border-primary/80 hover:bg-primary/90 hover:scale-[1.02] hover:shadow-lg shadow-primary/20"
                              }`}
                >
                  <FileText className="w-4 h-4" /> 
                  Excepcional
                  {excepcionesActivas > 0 && (
                    <span className="flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full min-w[20px] h-5 px-1.5 shadow-sm border border-red-600/50">
                      {excepcionesActivas}
                    </span>
                  )}
                </button>

                <div
                  className="absolute right-0 top-full mt-3 w-72 bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 border border-white/10 dark:border-black/10
                             shadow-xl rounded-xl p-3 text-sm text-zinc-100 font-medium z-50
                             opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none"
                >
                  <div className="absolute -top-1 right-6 w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45 border-t border-l border-white/10 dark:border-black/10"></div>
                  Permite aprobar un ramo SIN prerrequisitos temporalmente ⚠️
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
