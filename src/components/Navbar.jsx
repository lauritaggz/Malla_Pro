import { useState, useEffect } from "react";

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
  const [colapsado, setColapsado] = useState(true);

  const themes = [
    { id: "aurora", name: "Aurora Blue" },
    { id: "sunset", name: "Sunset Pink" },
    { id: "emerald", name: "Emerald Mist" },
    { id: "midnight", name: "Midnight Purple" },
    { id: "golden", name: "Golden Carbon" },
  ];

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const handleAprobar = (num) => onAprobarHastaSemestre(num);

  useEffect(() => {
    document.body.style.overflowX = "hidden";
    document.body.style.overscrollBehaviorY = "contain";
  }, []);

  return (
    <nav className="w-full border-b border-borderColor bg-bgSecondary/70 backdrop-blur-md sticky top-0 z-50 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col items-center gap-3">
        {/* Encabezado principal */}
        <div className="text-center">
          {mallaSeleccionada && (
            <>
              <h1 className="font-bold text-lg text-textPrimary tracking-tight">
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

        {/* Línea divisoria con flecha */}
        <div className="relative w-full border-t border-borderColor mt-2 mb-1 flex justify-center">
          <button
            onClick={() => setColapsado(!colapsado)}
            className="absolute -top-3 bg-bgSecondary px-2 rounded-full border border-borderColor shadow-sm 
                       transition-all duration-300 hover:scale-110 focus:outline-none"
            title={colapsado ? "Mostrar controles" : "Ocultar controles"}
          >
            <span
              className={`block text-xl transition-transform duration-300 ${
                colapsado
                  ? "rotate-0 text-primary"
                  : "rotate-180 text-yellow-400"
              }`}
            >
              ▼
            </span>
          </button>
        </div>

        {/* Controles colapsables */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out w-full ${
            colapsado ? "max-h-0 opacity-0" : "max-h-[600px] opacity-100"
          }`}
        >
          <div className="flex flex-col lg:flex-row flex-wrap items-center justify-between gap-4 pt-4">
            {/* 📘 Marcar hasta semestre */}
            <select
              onChange={(e) => handleAprobar(Number(e.target.value))}
              defaultValue=""
              className="appearance-none bg-primary text-white px-4 py-2 pr-10 rounded-md cursor-pointer 
                         shadow hover:shadow-lg hover:scale-105 transition-all outline-none border-none"
              title="Marcar todos los ramos hasta un semestre como aprobados"
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

            {/* Selector de tema */}
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="rounded-md px-3 py-2 border border-borderColor bg-bgPrimary text-textPrimary hover:shadow focus:ring-2 focus:ring-primary transition-all"
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Modo oscuro */}
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 rounded-full bg-bgPrimary border border-borderColor flex items-center justify-center text-xl transition-all hover:scale-110"
              title="Cambiar modo"
            >
              {darkMode ? "🌙" : "🌞"}
            </button>

            {/* Botón modo excepcional */}
            <button
              onClick={() => setModoExcepcional(!modoExcepcional)}
              className={`px-4 py-2 rounded-md font-medium transition-all relative ${
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

            {/* Texto de ayuda */}
            <div className="text-center w-full pt-2">
              <span className="hidden sm:inline text-sm text-textSecondary">
                CTRL + CLIC para marcar asignaturas cursadas actualmente
              </span>
              <span className="inline sm:hidden text-sm text-textSecondary">
                Mantén presionado para marcar asignaturas cursadas
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
