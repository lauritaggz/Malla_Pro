import { useState, useRef, useEffect } from "react";
import { NotebookPen, Clock3 } from "lucide-react";

export default function Curso({
  curso,
  aprobado,
  excepcional,
  disponible,
  modoExcepcional,
  aprobar,
  marcarExcepcional,
  enCurso,
  toggleCursando,
  onAbrirNotas,
}) {
  const [shake, setShake] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      toggleCursando();
    }, 500); // 500ms para considerar long press
  };

  const handleTouchMove = (e) => {
    if (!longPressTimer.current) return;

    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPos.current.x);
    const diffY = Math.abs(touch.clientY - touchStartPos.current.y);

    // Si el usuario mueve más de 10px, cancelamos el long press
    if (diffX > 10 || diffY > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  const handleClick = (e) => {
    // Si estamos en mobile y fue un long press, no hacemos nada más
    if (isLongPressing) {
      setIsLongPressing(false);
      return;
    }

    if (e.ctrlKey) {
      toggleCursando();
      return;
    }

    if (!disponible && !modoExcepcional) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    if (modoExcepcional) marcarExcepcional();
    else aprobar();
  };

  const handleNotasClick = (e) => {
    e.stopPropagation();
    if (onAbrirNotas) {
      onAbrirNotas(curso);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        title="Mantén presionado para marcar como en curso"
        className={`cursor-pointer select-none p-3 text-[13px] rounded-lg transition-all duration-300
        shadow-sm text-left relative group ring-1 ring-inset ring-borderColor/50 hover:ring-primary/40 
        hover:shadow-theme-lg ${shake ? "shake" : ""} ${
          isLongPressing ? "scale-95" : ""
        }
        ${
          aprobado
            ? "bg-emerald-600/90 text-white border border-emerald-400/30 backdrop-blur-sm shadow-emerald-500/10"
            : excepcional
            ? "bg-purple-600/90 text-white border border-purple-400/30 backdrop-blur-sm shadow-purple-500/10"
            : enCurso
            ? "bg-blue-500/90 text-white border border-blue-400/30 backdrop-blur-sm shadow-blue-500/10"
            : !disponible
            ? "bg-gray-800/40 text-gray-500 border border-gray-600/20 backdrop-blur-sm"
            : "glass-card hover:bg-primary/10 active:bg-primary/20"
        }
        touch-action-manipulation`}
      >
        {/* Header con título y botón de notas */}
        <div className="flex justify-between items-start gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">
              {curso.nombre}
            </h3>
            <span className="text-[10px] opacity-80">{curso.codigo}</span>
          </div>

          {/* Botón de Notas */}
          <button
            onClick={handleNotasClick}
            className="flex-shrink-0 w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 
                       border border-white/20 backdrop-blur-sm transition-all duration-200
                       flex items-center justify-center text-xs opacity-70 hover:opacity-100
                       group/btn z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            title="Ver notas"
          >
            <NotebookPen className="w-3.5 h-3.5" />
            <span
              className="absolute -top-8 right-0 opacity-0 group-hover/btn:opacity-100 
                             transition-opacity duration-200 pointer-events-none
                             px-2 py-1 rounded-md text-xs bg-bgSecondary text-textPrimary 
                             border border-borderColor shadow-theme whitespace-nowrap"
            >
              Ver notas
            </span>
          </button>
        </div>

        {/* SCT en la esquina inferior */}
        <div
          className="absolute bottom-1 right-2 text-[10px] px-2 py-0.5 rounded-full 
                        bg-black/20 text-white/90 border border-white/10 backdrop-blur-sm"
        >
          {curso.sct} SCT
        </div>

        {/* Badge y tooltip de estado "En curso" (solo desktop) */}
        {enCurso && (
          <>
            {/* Badge */}
            <span
              className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium 
                           bg-white/10 border border-white/20 backdrop-blur-sm shadow-theme 
                           text-white absolute -top-2 -left-2"
            >
              <Clock3 className="w-3 h-3" /> En curso
            </span>

            {/* Tooltip en hover */}
            <div
              className="hidden md:block absolute -top-10 right-0 opacity-0 translate-y-1 
                                group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 
                                pointer-events-none z-20"
            >
              <div
                className="px-2 py-1 rounded-md text-xs bg-bgSecondary text-textPrimary 
                              border border-borderColor shadow-theme whitespace-nowrap"
              >
                ⏳ En curso — Ctrl + clic para quitar
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
