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
  const themes = [
    { id: "aurora", name: "Aurora Blue" },
    { id: "sunset", name: "Sunset Pink" },
    { id: "emerald", name: "Emerald Mist" },
    { id: "midnight", name: "Midnight Purple" },
    { id: "golden", name: "Golden Carbon" },
  ];

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleAprobar = (num) => {
    onAprobarHastaSemestre(num);
  };

  return (
    <nav className="w-full border-b border-borderColor sticky top-0 z-50 glass-effect-strong">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-2 md:gap-0">
        {/* Título de carrera */}
        <div className="flex flex-col leading-tight text-center md:text-left w-full md:w-auto">
          {mallaSeleccionada && (
            <>
              <h1 className="font-bold text-lg">{mallaSeleccionada.nombre}</h1>
              <span className="text-sm text-textSecondary">
                {mallaSeleccionada.url.includes("uch")
                  ? "Universidad de Chile"
                  : "UNAB"}
              </span>
            </>
          )}
        </div>
        <div className="hidden md:block">
          <span className="text-sm text-textSecondary">
            {" "}
            CTRL + CLIC para marcar asignaturas cursadas actualmente
          </span>
        </div>
        {/* Controles */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 w-full md:w-auto">
          {/* 📘 Marcar hasta semestre */}
          <div className="relative group">
            <select
              onChange={(e) => handleAprobar(Number(e.target.value))}
              defaultValue=""
              className="appearance-none bg-primary text-white px-3 sm:px-4 py-2 pr-8 sm:pr-10 rounded-md cursor-pointer 
                         text-sm sm:text-base shadow hover:shadow-lg hover:scale-105 transition-all outline-none border-none"
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
            <span className="absolute right-2 sm:right-3 top-2.5 text-white text-sm pointer-events-none">
              ▼
            </span>

            {/* Tooltip - Solo visible en desktop */}
            <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-[110%] w-56 bg-bgSecondary text-textPrimary border border-borderColor text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none shadow-md transition-all duration-300">
              Marca todos los ramos desde el primer semestre hasta el
              seleccionado como aprobados.
            </div>
          </div>

          {/* Selector de tema */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="rounded-md px-2 sm:px-3 py-2 border border-borderColor bg-bgPrimary text-textPrimary text-sm sm:text-base hover:shadow focus:ring-2 focus:ring-primary transition-all"
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

          {/* Botón de modo excepcional */}
          <div className="relative group">
            <button
              onClick={() => setModoExcepcional(!modoExcepcional)}
              className={`px-3 sm:px-4 py-2 rounded-md font-medium text-sm sm:text-base transition-all relative ${
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

            {/* Tooltip - Solo visible en desktop */}
            <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-[110%] w-64 bg-bgSecondary text-textPrimary border border-borderColor text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none shadow-md transition-all duration-300">
              <p className="font-semibold mb-1">Modo Excepcional</p>
              <p className="text-textSecondary text-xs leading-tight">
                Permite marcar un ramo como <b>aprobado extraordinariamente</b>,
                incluso si no cumple los prerrequisitos. Haz clic nuevamente
                para desmarcarlo.
              </p>
            </div>
          </div>

          {/* Instrucción para móvil */}
          <div className="w-full text-center md:hidden">
            <span className="text-xs text-textSecondary">
              Mantén presionado para marcar asignaturas cursadas
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
