import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import { listarMallas } from "./utils/mallasLoader";
import MallaViewer from "./components/MallaViewer";

export default function App() {
  const [theme, setTheme] = useState(
    localStorage.getItem("malla-theme") || "aurora"
  );
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("malla-darkmode");
    if (saved !== null) return saved === "true";
    return true; // 👈 oscuro por defecto si no hay valor guardado
  });

  const [modoExcepcional, setModoExcepcional] = useState(false);
  const [mallasDisponibles, setMallasDisponibles] = useState([]);
  const [mallaSeleccionada, setMallaSeleccionada] = useState(
    JSON.parse(localStorage.getItem("malla-seleccionada")) || null
  );
  const [excepcionesActivas, setExcepcionesActivas] = useState(0);

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

  function seleccionarMalla(malla) {
    setMallaSeleccionada(malla);
    localStorage.setItem("malla-seleccionada", JSON.stringify(malla));
  }

  return (
    <div className="min-h-screen transition-all duration-500 bg-bgPrimary text-textPrimary">
      <Navbar
        theme={theme}
        setTheme={setTheme}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        modoExcepcional={modoExcepcional}
        setModoExcepcional={setModoExcepcional}
        excepcionesActivas={excepcionesActivas}
        mallaSeleccionada={mallaSeleccionada}
        onAprobarHastaSemestre={(num) =>
          window.dispatchEvent(
            new CustomEvent("aprobarHastaSemestre", { detail: num })
          )
        }
      />

      {!mallaSeleccionada ? (
        <div className="flex items-center justify-center h-[80vh]">
          <div className="bg-bgSecondary p-8 rounded-xl shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4 text-center">
              🎓 Selecciona una malla para comenzar
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uni.mallas.map((m) => (
                      <button
                        key={m.nombre}
                        onClick={() => seleccionarMalla(m)}
                        className="p-3 rounded-lg border border-borderColor bg-bgPrimary hover:bg-primary hover:text-white transition-all"
                      >
                        {m.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-6 py-10">
          <MallaViewer
            mallaSeleccionada={mallaSeleccionada}
            modoExcepcional={modoExcepcional}
            setExcepcionesActivas={setExcepcionesActivas}
          />
        </main>
      )}
    </div>
  );
}
