import { useState, useRef, useEffect } from "react";

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

  return (
    <div
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      title="Mantén presionado para marcar como en curso"
      className={`cursor-pointer select-none p-3 text-[13px] rounded-md transition-all duration-300
      shadow-sm text-left relative group ${shake ? "shake" : ""} ${
        isLongPressing ? "scale-95" : ""
      }
      ${
        aprobado
          ? "bg-emerald-600/90 text-white border border-emerald-400/30 backdrop-blur-sm"
          : excepcional
          ? "bg-purple-600/90 text-white border border-purple-400/30 backdrop-blur-sm"
          : enCurso
          ? "bg-blue-500/90 text-white border border-blue-400/30 backdrop-blur-sm"
          : !disponible
          ? "bg-gray-800/40 text-gray-500 border border-gray-600/20 backdrop-blur-sm"
          : "glass-card hover:bg-primary/10 active:bg-primary/20"
      }
      touch-action-manipulation`}
    >
      <div className="font-semibold leading-tight truncate">{curso.nombre}</div>
      <div className="text-[10px] opacity-80">{curso.codigo}</div>
      <div className="absolute bottom-1 right-2 text-[9px] opacity-70">
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
            ⏳ En curso
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
  );
}
