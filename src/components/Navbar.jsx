import { useState } from "react";

export default function Navbar({
  theme,
  setTheme,
  darkMode,
  setDarkMode,
  modoExcepcional,
  setModoExcepcional,
  excepcionesActivas = 0,
  mallaSeleccionada,
  onAprobarHastaSemestre,
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
  const handleAprobar = (num) => onAprobarHastaSemestre(num);

  return (
    <nav className="w-full border-b border-borderColor bg-bgSecondary/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-500">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col leading-tight">
            {mallaSeleccionada && (
              <>
                <h1 className="font-bold text-lg">
                  {mallaSeleccionada.nombre}
                </h1>
                <span className="text-sm text-textSecondary">
                  {mallaSeleccionada.url.includes("uch")
                    ? "Universidad de Chile"
                    : "UNAB"}
                </span>
              </>
            )}
          </div>

          {/* Flecha de colapsar */}
          <button
            onClick={() => setMostrarControles(!mostrarControles)}
            className="relative flex items-center justify-center w-8 h-8 rounded-full border border-borderColor 
                       bg-bgPrimary hover:bg-bgTertiary transition-all duration-300 shadow-theme"
            aria-label="Mostrar u ocultar controles"
          >
            <span
              className={`transition-transform duration-500 ease-in-out text-primary ${
                mostrarControles ? "rotate-180" : "rotate-0"
              }`}
            >
              ▼
            </span>
          </button>
        </div>

        {/* Línea divisoria */}
        <div className="w-full border-t border-borderColor mt-3 mb-4 relative" />

        {/* Controles con animación */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            mostrarControles
              ? "max-h-[500px] opacity-100 translate-y-0 overflow-visible"
              : "max-h-0 opacity-0 -translate-y-2 overflow-hidden"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
            {/* 📘 Marcar hasta semestre */}
            <div className="relative group w-full sm:w-auto">
              <select
                onChange={(e) => handleAprobar(Number(e.target.value))}
                defaultValue=""
                className="appearance-none bg-primary text-white px-4 py-2 pr-10 rounded-md cursor-pointer 
                           shadow hover:shadow-lg hover:scale-105 transition-transform duration-300 
                           outline-none border-none w-full sm:w-auto"
              >
                <option value="">📘 Marcar hasta</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option
                    key={n}
                    value={n}
                    className="text-textPrimary bg-bgSecondary"
                  >
                    Semestre {n}
                  </option>
                ))}
              </select>

              {/* Tooltip PC */}
              <div
                className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-[110%] w-56 z-50
                              bg-bgSecondary text-textPrimary border border-borderColor 
                              text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 
                              pointer-events-none shadow-md transition-all duration-300"
              >
                Marca todos los ramos desde el primer semestre hasta el
                seleccionado como aprobados.
              </div>

              {/* Texto móvil */}
              <p className="sm:hidden mt-1 text-xs text-textSecondary text-center">
                Manten presionado para marcar asignaturas cursadas
              </p>
            </div>

            {/* Selector de tema */}
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

            {/* 🌙 Botón modo oscuro */}
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 rounded-full bg-bgPrimary border border-borderColor 
                         flex items-center justify-center text-xl transition-all duration-300 hover:scale-110"
              title="Cambiar modo"
            >
              {darkMode ? "🌙" : "🌞"}
            </button>

            {/* 🧾 Excepcional */}
            <div className="relative group w-full sm:w-auto">
              <button
                onClick={() => setModoExcepcional(!modoExcepcional)}
                className={`px-4 py-2 rounded-md font-medium transition-transform duration-300 
                            relative w-full sm:w-auto ${
                              modoExcepcional
                                ? "bg-yellow-400 text-yellow-900 shadow-lg scale-105"
                                : "bg-primary text-white hover:shadow-lg hover:scale-105"
                            }`}
              >
                🧾 Excepcional
                {excepcionesActivas > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-[1px]">
                    {excepcionesActivas}
                  </span>
                )}
              </button>

              {/* Tooltip PC */}
              <div
                className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-[110%] w-64 z-50
                              bg-bgSecondary text-textPrimary border border-borderColor 
                              text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 
                              pointer-events-none shadow-md transition-all duration-300"
              >
                <p className="font-semibold mb-1">Modo Excepcional</p>
                <p className="text-textSecondary text-xs leading-tight">
                  Permite marcar un ramo como{" "}
                  <b>aprobado extraordinariamente</b>, incluso si no cumple los
                  prerrequisitos. Haz clic nuevamente para desmarcarlo.
                </p>
              </div>

              {/* Texto móvil */}
              <p className="sm:hidden mt-1 text-xs text-textSecondary text-center">
                Permite aprobar sin prerrequisitos
              </p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
