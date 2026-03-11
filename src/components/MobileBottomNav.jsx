import React, { useState } from "react";
import { Sun, Moon, FileText, CheckCircle, Menu, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileBottomNav({
  theme,
  setTheme,
  darkMode,
  setDarkMode,
  modoExcepcional,
  setModoExcepcional,
  excepcionesActivas,
  cantidadSemestres,
  onVerProgreso,
  mostrarResumen,
  ocultarCompletados,
  setOcultarCompletados,
  onShowTour,
  onChangeMalla
}) {
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* Bottom padding for content */}
      <div className="h-16 sm:hidden w-full" />
      
      {showMore && (
        <div 
          className="fixed inset-0 bg-black/50 z-[80] sm:hidden" 
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Menú expandido (Más opciones) */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-[4.5rem] left-2 right-2 p-4 bg-bgSecondary border border-borderColor/50 rounded-2xl shadow-xl z-[90] sm:hidden flex flex-col gap-4 backdrop-blur-md"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider">Más Opciones</h3>
              <button
                onClick={() => {
                  onShowTour();
                  setShowMore(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-bold border border-primary/20"
              >
                <HelpCircle className="w-4 h-4" />
                Ayuda / Tour
              </button>
            </div>
            
            {/* Tema y Modo Oscuro */}
            <div className="flex flex-col gap-3 bg-bgPrimary p-3 rounded-xl border border-borderColor/30">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Modo Oscuro</span>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-10 h-10 rounded-full bg-bgSecondary flex items-center justify-center border border-borderColor/50 text-primary transition-colors"
                >
                  {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
              </div>
              <div className="border-t border-borderColor/30 pt-3">
                 <label className="text-sm font-medium mb-2 block">Tema de color:</label>
                 <select
                    value={theme}
                    onChange={(e) => {
                       setTheme(e.target.value);
                       setShowMore(false);
                    }}
                    className="w-full appearance-none rounded-lg px-3 py-2 border border-borderColor bg-bgSecondary text-textPrimary text-sm font-medium outline-none"
                 >
                    <option value="aurora">Aurora Blue</option>
                    <option value="sunset">Sunset Pink</option>
                    <option value="emerald">Emerald Mist</option>
                    <option value="midnight">Midnight Purple</option>
                    <option value="golden">Golden Carbon</option>
                 </select>
              </div>
            </div>

            {/* Ocultar semestres completados */}
            <div className="bg-bgPrimary p-3 rounded-xl border border-borderColor/30">
              <button 
                onClick={() => {
                  setOcultarCompletados(!ocultarCompletados);
                  setShowMore(false);
                }}
                className={`w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center transition-colors shadow-sm ${
                  ocultarCompletados 
                    ? "bg-primary text-white border border-primary/50" 
                    : "bg-bgSecondary text-textSecondary border border-borderColor/50"
                }`}
              >
                {ocultarCompletados ? "👁️ Mostrar semestres listos" : "🫣 Ocultar semestres listos"}
              </button>
            </div>

            {/* Aprobar hasta semestre */}
            <div className="bg-bgPrimary p-3 rounded-xl border border-borderColor/30">
              <label className="text-sm font-medium mb-2 block">Marcar aprobados hasta:</label>
              <select
                className="w-full appearance-none rounded-lg px-3 py-2 border border-borderColor bg-bgSecondary text-textPrimary text-sm font-medium outline-none"
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value) {
                    window.dispatchEvent(new CustomEvent("aprobarHastaSemestre", { detail: value }));
                    e.target.value = "";
                    setShowMore(false);
                  }
                }}
              >
                <option value="">Seleccionar Semestre</option>
                {Array.from({ length: cantidadSemestres }).map((_, i) => (
                  <option key={i} value={i + 1}>
                    Semestre {i + 1}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Cambiar Malla */}
            <button
              onClick={() => {
                setShowMore(false);
                onChangeMalla();
              }}
              className="w-full py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm font-bold transition-colors mt-2"
            >
              🔄 Cambiar Malla
            </button>

            <button  
              onClick={() => setShowMore(false)}
              className="w-full py-2 bg-textSecondary/10 rounded-lg text-sm font-medium mt-2"
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[4.5rem] bg-bgSecondary/90 backdrop-blur-xl border-t border-borderColor/30 z-[90] sm:hidden flex justify-around items-center px-2 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
        
        {/* Progreso */}
        <button 
          onClick={() => {
            onVerProgreso();
            setShowMore(false);
          }}
          className={`flex flex-col items-center justify-center p-2 transition-colors ${mostrarResumen ? "text-primary scale-110" : "text-textSecondary hover:text-primary"}`}
        >
          <CheckCircle className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Resumen</span>
        </button>

        {/* Excepcional */}
        <button 
          onClick={() => setModoExcepcional(!modoExcepcional)}
          className={`flex flex-col items-center justify-center p-2 relative transition-all duration-300 ${
             modoExcepcional 
               ? "text-amber-500 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
               : "text-textSecondary hover:text-primary"
          }`}
        >
          <FileText className={`w-6 h-6 mb-1 ${modoExcepcional ? "animate-pulse" : ""}`} />
          <span className="text-[10px] font-medium">{modoExcepcional ? "Excepcional" : "Excepcional"}</span>
          {excepcionesActivas > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
              {excepcionesActivas}
            </span>
          )}
        </button>

        {/* Más Opciones */}
        <button 
          onClick={() => setShowMore(!showMore)}
          className={`flex flex-col items-center justify-center p-2 transition-colors ${showMore ? "text-primary" : "text-textSecondary hover:text-primary"}`}
        >
          <Menu className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Opciones</span>
        </button>
      </div>
    </>
  );
}
