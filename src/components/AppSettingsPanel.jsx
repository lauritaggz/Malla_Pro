import { Link } from "react-router-dom";
import {
  Moon, Sun, FileText, HelpCircle, Heart, Shield, Scale, Instagram, RefreshCw, MessageCircle,
} from "lucide-react";

/* Contenido del menú de ajustes; lo comparten la barra móvil y el riel de escritorio. */
export default function AppSettingsPanel({
  mallaSeleccionada,
  uni,
  darkMode,
  setDarkMode,
  onGuardLeave,
  onVerProgreso,
  onShowTour,
  onShowContacto,
  onChangeMalla,
  onOpenTutorias,
  onClose,
}) {
  return (
      <div className="flex flex-col gap-3.5">
        {/* Sub-Header */}
        <div className="pb-2.5 border-b border-borderColor/60 select-none">
          <p className="text-xs font-bold text-textPrimary leading-snug truncate">
            {mallaSeleccionada?.nombre || "Malla Pro"}
          </p>
          <p className="text-[12px] font-bold text-textSecondary/80 mt-0.5 leading-none">
            {uni}
          </p>
        </div>

        {/* Main Actions */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => {
              if (onGuardLeave && !onGuardLeave()) return;
              onVerProgreso?.();
              onClose();
            }}
            className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 text-textSecondary" />
            <span>Resumen de progreso</span>
          </button>
        </div>

        {onOpenTutorias && (
          <button
            onClick={() => { onOpenTutorias(); onClose(); }}
            className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center gap-2"
          >
            <MessageCircle className="w-3.5 h-3.5 text-textSecondary" />
            <span>Tutorías</span>
            <span className="ml-auto text-[12px] font-medium text-textSecondary">Pronto</span>
          </button>
        )}

        {/* Appearance settings */}
        <div className="pt-2.5 border-t border-borderColor/60">
          <p className="text-[12px] font-bold text-textSecondary/90 px-2 mb-2 select-none">Apariencia</p>
          
          {/* DarkMode Toggle Switch */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {darkMode ? <Moon className="w-3.5 h-3.5 text-textSecondary" /> : <Sun className="w-3.5 h-3.5 text-textSecondary" />}
              <span>Modo oscuro</span>
            </span>
            <div className={`w-7.5 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${darkMode ? "bg-primary" : "bg-borderColor"}`}>
              <div className={`w-3 h-3 rounded-full shadow-sm transition-transform duration-200 ${darkMode ? "bg-bgPrimary translate-x-3.5" : "bg-bgSecondary translate-x-0"}`} />
            </div>
          </button>
        </div>

        {/* Configurations */}
        <div className="pt-2.5 border-t border-borderColor/60 flex flex-col gap-1">
          <p className="text-[12px] font-bold text-textSecondary/90 px-2 mb-2 select-none">Configuración</p>

          <button
            onClick={() => { onShowTour?.(); onClose(); }}
            className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center gap-2"
          >
            <HelpCircle className="w-3.5 h-3.5 text-textSecondary" />
            <span>Ver guía interactiva</span>
          </button>

          <button
            onClick={() => { onShowContacto?.(); onClose(); }}
            className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center gap-2"
          >
            <Heart className="w-3.5 h-3.5 text-textSecondary" />
            <span>Sugerir carrera</span>
          </button>

          {onChangeMalla && (
            <button
              onClick={() => { onChangeMalla(); onClose(); }}
              className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-danger hover:bg-danger/10 rounded-xl transition-colors flex items-center gap-2 mt-1.5 border border-danger/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cambiar de malla</span>
            </button>
          )}
        </div>

        {/* Información legal / institucional */}
        <div className="pt-2.5 border-t border-borderColor/60 flex flex-col gap-0.5">
          <p className="text-[12px] font-bold text-textSecondary/90 px-2 mb-1.5 select-none">
            Información
          </p>
          <Link
            to="/privacidad"
            onClick={() => onClose()}
            className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-textSecondary hover:text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Shield className="w-3.5 h-3.5 opacity-70" aria-hidden />
            <span>Privacidad</span>
          </Link>
          <Link
            to="/terminos"
            onClick={() => onClose()}
            className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-textSecondary hover:text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Scale className="w-3.5 h-3.5 opacity-70" aria-hidden />
            <span>Términos de uso</span>
          </Link>
          <a
            href="https://www.instagram.com/mallapro.cl_/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onClose()}
            className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-textSecondary hover:text-textPrimary hover:bg-bgPrimary/60 rounded-xl transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Instagram className="w-3.5 h-3.5 opacity-70" aria-hidden />
            <span>@mallapro.cl_</span>
          </a>
        </div>
      </div>

  );
}
