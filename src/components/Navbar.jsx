import { useState, useEffect, useRef } from "react";
import {
  GraduationCap,
  BarChart2,
  ChevronDown,
  Moon,
  Sun,
  FileText,
} from "lucide-react";

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
  onVerProgreso,
}) {
  const [mostrarControles, setMostrarControles] = useState(true);

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
      className="fixed top-0 left-0 right-0 z-[80]
                 backdrop-blur-2xl bg-bgSecondary/70 border-b border-borderColor/40
                 shadow-[0_8px_30px_rgba(0,0,0,0.25)]
                 transition-all duration-500"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 relative select-none">
        {/* ---------------- HEADER SUPERIOR ---------------- */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            {mallaSeleccionada && (
              <>
                <h1 className="font-bold text-2xl md:text-3xl text-primary transition-transform duration-300 hover:scale-[1.03]">
                  {mallaSeleccionada.nombre}
                </h1>

                <div className="flex items-center gap-2">
                  <span
                    className="text-xs md:text-sm font-medium text-textSecondary 
                                  px-3 py-1 rounded-full bg-bgTertiary/60 border border-borderColor"
                  >
                    <GraduationCap className="w-4 h-4 text-primary" />
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
            className="relative flex items-center justify-center w-8 h-8 rounded-full border border-borderColor 
                       bg-bgPrimary hover:bg-bgTertiary transition-all duration-300 hover:scale-110"
          >
            <ChevronDown
              className={`w-5 h-5 text-primary transition-transform duration-500 ${
                mostrarControles ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        <div className="w-full border-t border-borderColor mt-3 mb-4 opacity-60" />

        {/* ---------------- CONTROLES ---------------- */}
        <div
          className={`overflow-visible transition-all duration-500 ${
            mostrarControles
              ? "max-h-[600px] opacity-100 mt-2"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
            {/* BOTÓN VER PROGRESO */}
            {mallaSeleccionada && onVerProgreso && (
              <button
                onClick={onVerProgreso}
                className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white 
                           font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 
                           flex items-center gap-2"
              >
                <BarChart2 className="w-5 h-5" /> Ver Progreso
              </button>
            )}

            {/* SELECT MARCAR HASTA */}
            <div className="relative group w-full sm:w-auto">
              <select
                className="rounded-md px-3 py-2 border border-borderColor bg-bgPrimary text-textPrimary 
                           hover:shadow focus:ring-2 focus:ring-primary transition-all w-full cursor-pointer"
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
                <option value="">📘 Marcar hasta</option>
                {Array.from({ length: cantidadSemestres }).map((_, i) => (
                  <option key={i} value={i + 1}>
                    Semestre {i + 1}
                  </option>
                ))}
              </select>

              {/* TOOLTIP */}
              <div
                className="absolute left-0 top-[110%] w-60 bg-bgSecondary/90 border border-borderColor
                           shadow-lg rounded-lg p-3 text-sm text-textSecondary
                           opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              >
                Marca todos los ramos hasta ese semestre como aprobados ✔
              </div>
            </div>

            {/* SELECT TEMA */}
            <div className="relative group w-full sm:w-auto">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="rounded-md px-3 py-2 border border-borderColor bg-bgPrimary text-textPrimary 
                           hover:shadow focus:ring-2 focus:ring-primary transition-all w-full"
              >
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <div
                className="absolute left-0 top-[110%] w-60 bg-bgSecondary/90 border border-borderColor
                           shadow-lg rounded-lg p-3 text-sm text-textSecondary
                           opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              >
                Cambia el estilo visual de la plataforma 🎨
              </div>
            </div>

            {/* MODO OSCURO */}
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 rounded-full bg-bgPrimary border border-borderColor 
                         flex items-center justify-center transition-all duration-300 
                         hover:scale-110 hover:shadow-md text-primary"
            >
              {darkMode ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>

            {/* EXCEPCIONAL */}
            <div className="relative group w-full sm:w-auto">
              <button
                onClick={() => setModoExcepcional(!modoExcepcional)}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-300 
                            flex items-center gap-2
                            ${
                              modoExcepcional
                                ? "bg-yellow-400 text-yellow-900 shadow-lg"
                                : "bg-primary text-white hover:scale-105 hover:shadow-lg"
                            }`}
              >
                <FileText className="w-4 h-4" /> Excepcional
                {excepcionesActivas > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-[1px]">
                    {excepcionesActivas}
                  </span>
                )}
              </button>

              <div
                className="absolute right-0 top-[110%] w-72 bg-bgSecondary/90 border border-borderColor
                           shadow-lg rounded-lg p-3 text-sm text-textSecondary
                           opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              >
                Permite aprobar un ramo SIN prerrequisitos temporalmente ⚠️
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
