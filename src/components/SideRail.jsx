import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookMarked, CalendarDays, CalendarRange, GraduationCap, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppSettingsPanel from "./AppSettingsPanel";

function RailButton({ label, active, onClick, children, badge, tone = "ink" }) {
  const activeCls =
    tone === "exception"
      ? "bg-exception/15 text-exception"
      : "bg-primary text-[color:var(--on-ink)]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative w-[60px] flex flex-col items-center gap-1 rounded-xl py-2 text-[12px] font-semibold leading-none transition-[background-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        ${active ? activeCls : "text-textSecondary hover:text-textPrimary hover:bg-borderColor/40"}`}
    >
      {children}
      <span>{label}</span>
      {badge > 0 && (
        <span className="absolute top-1 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-exception text-bgPrimary text-[12px] font-semibold leading-none flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function SideRail({
  darkMode,
  setDarkMode,
  modoExcepcional,
  setModoExcepcional,
  excepcionesActivas = 0,
  mallaSeleccionada,
  onVerProgreso,
  onShowTour,
  onShowContacto,
  onChangeMalla,
  vistaPrincipal = "malla",
  setVistaPrincipal,
  onGuardLeave,
}) {
  const navigate = useNavigate();
  const settingsRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const uni = mallaSeleccionada?.url?.includes("uch") ? "U. de Chile" : "UNAB";

  const go = (view, path, guard = true) => {
    if (guard && onGuardLeave && !onGuardLeave()) return;
    setVistaPrincipal(view);
    navigate(path);
  };

  return (
    <aside
      id="app-rail"
      aria-label="Navegación principal"
      className="hidden sm:flex fixed left-0 top-0 bottom-0 z-[80] w-[76px] flex-col items-center gap-1 border-r border-borderColor/60 bg-bgSecondary py-3"
    >
      <Link
        to="/"
        aria-label="Volver al inicio"
        title="Volver al inicio"
        onClick={(e) => {
          if (onGuardLeave && !onGuardLeave()) e.preventDefault();
        }}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-borderColor/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
      </Link>

      <div
        className="mt-1 mb-3 w-9 h-9 rounded-xl flex items-center justify-center bg-primary text-[color:var(--on-ink)]"
        title="Malla Pro"
      >
        <BookMarked className="w-[18px] h-[18px]" aria-hidden />
      </div>

      <nav aria-label="Secciones" className="flex flex-col items-center gap-1">
        <RailButton label="Malla" active={vistaPrincipal === "malla"} onClick={() => go("malla", "/app", false)}>
          <BookMarked className="w-5 h-5" aria-hidden />
        </RailButton>
        <RailButton label="Periodo" active={vistaPrincipal === "periodo-actual"} onClick={() => go("periodo-actual", "/app")}>
          <CalendarDays className="w-5 h-5" aria-hidden />
        </RailButton>
        <RailButton label="Horario" active={vistaPrincipal === "toma-de-ramos"} onClick={() => go("toma-de-ramos", "/programacion-academica")}>
          <CalendarRange className="w-5 h-5" aria-hidden />
        </RailButton>
      </nav>

      <div className="mt-auto flex flex-col items-center gap-1">
        <RailButton
          label="Excepción"
          tone="exception"
          active={modoExcepcional}
          badge={excepcionesActivas}
          onClick={() => {
            setSettingsOpen(false);
            if (modoExcepcional) {
              onGuardLeave?.();
              return;
            }
            setVistaPrincipal("malla");
            navigate("/app");
            setModoExcepcional(true);
          }}
        >
          <GraduationCap className="w-5 h-5" aria-hidden />
        </RailButton>

        <div ref={settingsRef} className="relative">
          <RailButton label="Ajustes" active={settingsOpen} onClick={() => setSettingsOpen((v) => !v)}>
            <Settings className="w-5 h-5" aria-hidden />
          </RailButton>

          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                initial={{ opacity: 0, x: -6, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                style={{ transformOrigin: "bottom left" }}
                className="absolute left-full bottom-0 ml-3 w-72 bg-bgSecondary border border-borderColor rounded-2xl shadow-xl z-50 p-4"
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
                  onOpenTutorias={() => go("tutorias", "/app")}
                  onClose={() => setSettingsOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
