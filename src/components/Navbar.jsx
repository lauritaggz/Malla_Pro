import { useState } from "react";
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
      id="app-navbar"
      className="fixed top-0 left-0 right-0 z-[50] overflow-visible 
                 backdrop-blur-2xl bg-bgSecondary/70 border-b border-borderColor/40 
                 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-500"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 relative select-none">
        {/* 🔹 Encabezado */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            {mallaSeleccionada && (
              <>
                <h1 className="font-bold text-2xl md:text-3xl text-primary transition-all duration-300 hover:scale-[1.03] drop-shadow-sm">
                  {mallaSeleccionada.nombre}
                </h1>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs md:text-sm font-medium text-textSecondary 
                               px-3 py-1 rounded-full bg-bgTertiary/60 border border-borderColor 
                               shadow-sm flex items-center gap-1"
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

          {/* 🔹 Flecha de colapsar */}
          <button
            onClick={() => setMostrarControles(!mostrarControles)}
            className="relative flex items-center justify-center w-8 h-8 rounded-full border border-borderColor 
                       bg-bgPrimary hover:bg-bgTertiary transition-all duration-300 shadow-theme hover:scale-110"
            aria-label="Mostrar u ocultar controles"
          >
            <ChevronDown
              className={`w-5 h-5 text-primary transition-transform duration-500 ease-in-out ${
                mostrarControles ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>
        </div>

        {/* Línea divisoria */}
        <div className="w-full border-t border-borderColor mt-3 mb-4 opacity-60" />

        {/* 🔹 Controles (transición) */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${
            mostrarControles
              ? "max-h-[500px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-2"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-[60]">
            {/* 📊 Ver progreso */}
            {mallaSeleccionada && onVerProgreso && (
              <button
                onClick={onVerProgreso}
                className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white 
                           font-semibold rounded-lg hover:shadow-lg hover:scale-105 
                           transition-all duration-300 flex items-center justify-center gap-2"
              >
                <BarChart2 className="w-5 h-5" /> Ver Progreso
              </button>
            )}

            {/* 📘 Marcar hasta semestre */}
            <div className="relative group w-full sm:w-auto">
              <select
                className="rounded-md px-3 py-2 border border-borderColor bg-bgPrimary text-textPrimary 
                           hover:shadow focus:ring-2 focus:ring-primary transition-all duration-300 
                           w-full sm:w-auto cursor-pointer"
                value=""
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

              {/* 💬 Tooltip PC */}
              <div
                className="hidden sm:block absolute left-0 top-[110%] w-64 z-[80]
                           bg-bgSecondary/90 text-textPrimary border border-borderColor 
                           text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 
                           pointer-events-none shadow-lg transition-all duration-300 backdrop-blur-xl"
              >
                Marca todos los ramos hasta ese semestre como aprobados.
              </div>

              {/* Texto móvil */}
              <p className="sm:hidden mt-1 text-xs text-textSecondary text-center">
                Mantén presionado para marcar como cursando
              </p>
            </div>

            {/* 🎨 Selector de tema */}
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="rounded-md px-3 py-2 border border-borderColor bg-bgPrimary text-textPrimary 
                         hover:shadow focus:ring-2 focus:ring-primary transition-all duration-300 w-full sm:w-auto"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* 🌙 Modo oscuro */}
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 rounded-full bg-bgPrimary border border-borderColor 
                         flex items-center justify-center transition-all duration-300 
                         hover:scale-110 hover:shadow-md text-primary"
              title="Cambiar modo"
            >
              {darkMode ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>

            {/* 🧾 Excepcional */}
            <div className="relative group w-full sm:w-auto">
              <button
                onClick={() => setModoExcepcional(!modoExcepcional)}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-300 
                            flex items-center justify-center gap-2 w-full sm:w-auto
                            ${
                              modoExcepcional
                                ? "bg-yellow-400 text-yellow-900 shadow-lg scale-105"
                                : "bg-primary text-white hover:shadow-lg hover:scale-105"
                            }`}
              >
                <FileText className="w-4 h-4" /> Excepcional
                {excepcionesActivas > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-[1px]">
                    {excepcionesActivas}
                  </span>
                )}
              </button>

              {/* 💬 Tooltip PC */}
              <div
                className="hidden sm:block absolute right-0 top-[110%] w-72 z-[80]
                           bg-bgSecondary/90 text-textPrimary border border-borderColor 
                           text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 
                           pointer-events-none shadow-lg transition-all duration-300 backdrop-blur-xl"
              >
                Permite aprobar un ramo <b>sin prerrequisitos</b> de forma
                temporal.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔹 Línea inferior de acento */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none" />
    </nav>
  );
}
