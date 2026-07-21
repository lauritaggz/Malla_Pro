import React, { useState, useEffect, useRef } from "react";
import { Lock, CheckCircle2, Circle, Network } from "lucide-react";

const Curso = ({
  curso,
  aprobado,
  excepcional,
  disponible,
  enCurso,
  onSelect,
  onLeftClick,
  onLongPress,
  onContextMenu,
  highlightStatus = "normal",
}) => {
  const [promedio, setPromedio] = useState(null);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const actualizarPromedio = () => {
      try {
        const notasGuardadas = JSON.parse(localStorage.getItem("malla-notas") || "{}");
        const evals = notasGuardadas[curso.id] || [];
        const conNota = evals.filter((e) => e.nota != null && !isNaN(e.nota));
        const pesoTotal = conNota.reduce((sum, e) => sum + (e.peso || 0), 0);
        if (pesoTotal > 0) {
          const sumPonderada = conNota.reduce((sum, e) => sum + e.nota * e.peso, 0);
          setPromedio(sumPonderada / pesoTotal);
        } else {
          setPromedio(null);
        }
      } catch {
        setPromedio(null);
      }
    };

    actualizarPromedio();
    window.addEventListener("notasModificadas", actualizarPromedio);
    return () => window.removeEventListener("notasModificadas", actualizarPromedio);
  }, [curso.id]);

  let cardStatusClass = "curso-card-disponible";
  let statusBadge = null;

  if (aprobado) {
    cardStatusClass = "curso-card-aprobado";
    statusBadge = (
      <div className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
        <span>Aprobada</span>
      </div>
    );
  } else if (excepcional) {
    cardStatusClass = "curso-card-excepcional";
    statusBadge = (
      <div className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-500">
        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
        <span>Forzada</span>
      </div>
    );
  } else if (enCurso) {
    cardStatusClass = "curso-card-encurso";
    statusBadge = (
      <div className="flex items-center gap-0.5 text-[9px] font-bold text-primary">
        <Circle className="w-2 h-2 fill-primary/30 flex-shrink-0" />
        <span>Cursando</span>
      </div>
    );
  } else if (!disponible) {
    cardStatusClass = "curso-card-bloqueado";
    statusBadge = (
      <div className="flex items-center gap-0.5 text-[9px] font-semibold text-textSecondary/70">
        <Lock className="w-2.5 h-2.5 flex-shrink-0" />
        <span>Bloqueada</span>
      </div>
    );
  } else {
    cardStatusClass = "curso-card-disponible border-dashed border-borderColor/80";
    statusBadge = (
      <div className="text-[9px] font-semibold text-textSecondary">
        <span>Disponible</span>
      </div>
    );
  }

  let highlightStyles = "";
  if (highlightStatus === "fade") {
    highlightStyles = "opacity-30 pointer-events-none scale-[0.98] blur-[0.2px] saturate-50";
  } else if (highlightStatus === "selected") {
    highlightStyles = "ring-2 ring-primary ring-offset-2 ring-offset-bgPrimary scale-[1.02] shadow-md z-30";
  } else if (highlightStatus === "prereq") {
    highlightStyles = "ring-2 ring-amber-500/60 ring-offset-1 ring-offset-bgPrimary scale-[1.01] z-20";
  } else if (highlightStatus === "unlock") {
    highlightStyles = "ring-2 ring-emerald-500/60 ring-offset-1 ring-offset-bgPrimary scale-[1.01] z-20";
  }

  const startPress = (e, isTouch) => {
    if (!isTouch && e.button !== 0) return;
    setLongPressTriggered(false);
    
    timerRef.current = setTimeout(() => {
      onLongPress?.(curso);
      setLongPressTriggered(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 450); // 450ms hold threshold
  };

  const endPress = (e) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (longPressTriggered) {
      e.preventDefault();
      e.stopPropagation();
      setLongPressTriggered(false);
      return true;
    }
    return false;
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <button
      id={`curso-card-${curso.id}`}
      onMouseDown={(e) => startPress(e, false)}
      onMouseUp={(e) => {
        const handled = endPress(e, false);
        if (!handled && e.button === 0) {
          onLeftClick?.(curso);
        }
      }}
      onMouseLeave={cancelPress}
      onTouchStart={(e) => startPress(e, true)}
      onTouchEnd={(e) => {
        const handled = endPress(e, true);
        if (!handled) {
          onLeftClick?.(curso);
        }
      }}
      onTouchCancel={cancelPress}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, curso);
      }}
      className={`curso-card-base w-full text-left focus:outline-none focus:ring-2 focus:ring-primary/45 group select-none
        ${cardStatusClass} ${highlightStyles}
      `}
      style={{
        backfaceVisibility: "hidden",
        transform: "translateZ(0)",
        contain: "layout"
      }}
    >
      {/* Average score badge */}
      {promedio !== null && (
        <div 
          className="absolute top-1.5 right-[52px] px-1 py-0.5 text-[9px] font-bold rounded-md border flex items-center justify-center min-w-[24px] bg-white/10 dark:bg-white/5 border-borderColor/40 text-textPrimary shadow-sm"
        >
          {promedio.toFixed(1)}
        </div>
      )}

      {/* Pill button for academic relations (Network PR) */}
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          if (e.button === 0) {
            onSelect(curso);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e, curso);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          setLongPressTriggered(false);
          timerRef.current = setTimeout(() => {
            onContextMenu?.({
              preventDefault: () => {},
              clientX: e.touches[0].clientX,
              clientY: e.touches[0].clientY,
            }, curso);
            setLongPressTriggered(true);
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(50);
            }
          }, 450);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          if (longPressTriggered) {
            e.preventDefault();
            setLongPressTriggered(false);
          } else {
            onSelect(curso);
          }
        }}
        onTouchCancel={(e) => {
          e.stopPropagation();
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }}
        className={`absolute top-1 right-1 px-2 py-1 rounded-md border flex items-center gap-1 select-none transition-all duration-200 cursor-pointer
          ${highlightStatus === "selected"
            ? "bg-primary/20 border-primary text-primary font-extrabold shadow-sm"
            : "bg-bgSecondary/90 border-borderColor/40 text-textSecondary hover:text-textPrimary hover:bg-borderColor/30 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          }
        `}
        title="Ver prerrequisitos / Opciones"
      >
        <Network className="w-3 h-3" />
        <span className="text-[9px] tracking-tight font-sans font-bold">PR</span>
      </div>

      {/* Course Name */}
      <div className="font-semibold text-textPrimary text-xs sm:text-[12px] leading-tight line-clamp-2 pr-[80px] mb-1">
        {curso.nombre}
      </div>

      {/* Meta details & status */}
      <div className="flex items-center justify-between gap-1.5 mt-auto w-full select-none">
        <div className="text-[9px] font-medium text-textSecondary leading-none">
          {curso.codigo} · {curso.sct || 0} SCT
        </div>
        {statusBadge}
      </div>
    </button>
  );
};

export default React.memo(Curso, (prevProps, nextProps) => {
  return (
    prevProps.curso.id === nextProps.curso.id &&
    prevProps.aprobado === nextProps.aprobado &&
    prevProps.excepcional === nextProps.excepcional &&
    prevProps.disponible === nextProps.disponible &&
    prevProps.enCurso === nextProps.enCurso &&
    prevProps.highlightStatus === nextProps.highlightStatus
  );
});
