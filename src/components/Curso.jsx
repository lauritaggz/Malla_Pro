import React, { useState, useEffect, useRef } from "react";
import { Lock, CheckCircle2, Circle, Network } from "lucide-react";
import { safeStorage } from "../utils/safeStorage";
import { LEGACY_KEYS } from "../utils/storageKeys";

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
  const timerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);
  const touchMovedRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const actualizarPromedio = () => {
      try {
        const notasGuardadas = safeStorage.get(LEGACY_KEYS.notas, {});
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
    // En móvil dejamos interacción (solo atenuamos visualmente)
    highlightStyles = "opacity-35 scale-[0.98] saturate-50";
  } else if (highlightStatus === "selected") {
    highlightStyles =
      "ring-2 ring-primary ring-offset-2 ring-offset-bgPrimary scale-[1.02] shadow-md z-30";
  } else if (highlightStatus === "prereq") {
    highlightStyles =
      "ring-2 ring-amber-500/60 ring-offset-1 ring-offset-bgPrimary scale-[1.01] z-20";
  } else if (highlightStatus === "unlock") {
    highlightStyles =
      "ring-2 ring-emerald-500/60 ring-offset-1 ring-offset-bgPrimary scale-[1.01] z-20";
  }

  const clearPressTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startPress = (e, isTouch) => {
    if (!isTouch && e.button !== 0) return;
    longPressTriggeredRef.current = false;
    touchMovedRef.current = false;
    clearPressTimer();

    timerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onLongPress?.(curso);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 480);
  };

  const endPress = (e) => {
    clearPressTimer();
    if (longPressTriggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressTriggeredRef.current = false;
      return true;
    }
    return false;
  };

  const cancelPress = () => {
    clearPressTimer();
    longPressTriggeredRef.current = false;
  };

  return (
    <button
      type="button"
      id={`curso-card-${curso.id}`}
      onMouseDown={(e) => startPress(e, false)}
      onMouseUp={(e) => {
        const handled = endPress(e);
        if (!handled && e.button === 0) {
          onLeftClick?.(curso);
        }
      }}
      onMouseLeave={cancelPress}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY };
        startPress(e, true);
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (!t) return;
        const dx = Math.abs(t.clientX - touchStartRef.current.x);
        const dy = Math.abs(t.clientY - touchStartRef.current.y);
        if (dx > 10 || dy > 10) {
          touchMovedRef.current = true;
          cancelPress();
        }
      }}
      onTouchEnd={(e) => {
        const handled = endPress(e);
        if (handled || touchMovedRef.current) {
          touchMovedRef.current = false;
          return;
        }
        onLeftClick?.(curso);
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
        contain: "layout",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      {promedio !== null && (
        <div className="absolute top-1.5 right-[52px] px-1 py-0.5 text-[9px] font-bold rounded-md border flex items-center justify-center min-w-[24px] bg-white/10 dark:bg-white/5 border-borderColor/40 text-textPrimary shadow-sm">
          {promedio.toFixed(1)}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onSelect?.(curso);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e, curso);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          longPressTriggeredRef.current = false;
          touchMovedRef.current = false;
          const t = e.touches[0];
          touchStartRef.current = { x: t.clientX, y: t.clientY };
          clearPressTimer();
          timerRef.current = setTimeout(() => {
            longPressTriggeredRef.current = true;
            onContextMenu?.(
              {
                preventDefault: () => {},
                clientX: touchStartRef.current.x,
                clientY: touchStartRef.current.y,
              },
              curso
            );
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(40);
            }
          }, 480);
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
          const t = e.touches[0];
          if (!t) return;
          const dx = Math.abs(t.clientX - touchStartRef.current.x);
          const dy = Math.abs(t.clientY - touchStartRef.current.y);
          if (dx > 10 || dy > 10) {
            touchMovedRef.current = true;
            cancelPress();
          }
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          e.preventDefault();
          clearPressTimer();
          if (longPressTriggeredRef.current || touchMovedRef.current) {
            longPressTriggeredRef.current = false;
            touchMovedRef.current = false;
            return;
          }
          onSelect?.(curso);
        }}
        onTouchCancel={(e) => {
          e.stopPropagation();
          cancelPress();
        }}
        className={`absolute top-1 right-1 z-20 px-2 py-1 rounded-md border flex items-center gap-1 select-none transition-all duration-200 cursor-pointer
          ${
            highlightStatus === "selected"
              ? "bg-primary/20 border-primary text-primary font-extrabold shadow-sm"
              : "bg-bgSecondary/90 border-borderColor/40 text-textSecondary hover:text-textPrimary hover:bg-borderColor/30 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
          }
        `}
        title="Ver prerrequisitos / Opciones"
      >
        <Network className="w-3 h-3" />
        <span className="text-[9px] tracking-tight font-sans font-bold">PR</span>
      </div>

      <div className="font-semibold text-textPrimary text-xs sm:text-[12px] leading-tight line-clamp-2 pr-[80px] mb-1">
        {curso.nombre}
      </div>

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
