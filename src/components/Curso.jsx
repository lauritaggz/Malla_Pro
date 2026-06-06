import React, { useState, useRef, useEffect } from "react";
import { NotebookPen } from "lucide-react";

const Curso = ({
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
}) => {
  const [shake, setShake] = useState(false);
  const [promedio, setPromedio] = useState(null);
  
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
  
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);

  const startPressTimer = () => {
    isLongPressRef.current = false;
    if (!disponible && !modoExcepcional && !enCurso) return;
    
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(50);
      }
      toggleCursando();
    }, 500);
  };

  const clearPressTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e) => {
    if (isLongPressRef.current) return;
    if (!disponible && !modoExcepcional) {
      if (e.ctrlKey && enCurso) {
        toggleCursando();
        return;
      }
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    if (e.ctrlKey) {
      toggleCursando();
      return;
    }

    if (modoExcepcional) {
      marcarExcepcional();
      return;
    }

    aprobar();
  };

  const hasTopRightBadge = promedio !== null;

  return (
    <div
      onClick={handleClick}
      onPointerDown={startPressTimer}
      onPointerUp={clearPressTimer}
      onPointerLeave={clearPressTimer}
      onPointerCancel={clearPressTimer}
      className={`mobile-course-card relative cursor-pointer select-none p-3 text-[13px] rounded-2xl border shadow-sm text-left group
        transition-[background-color,border-color,opacity,transform] duration-200 ease-out
        max-sm:pb-9
        ${shake ? "shake" : ""}
        ${
          aprobado
            ? "curso-aprobado text-white border-emerald-400/50 shadow-md"
            : excepcional
            ? "curso-excepcional text-white border-amber-400/50 shadow-md"
            : enCurso
            ? "curso-encurso text-white border-primary shadow-md encurso-glow"
            : !disponible
            ? "bg-bgSecondary/50 text-textSecondary opacity-70 border-dashed border-borderColor/80"
            : "curso-disponible text-textPrimary border-borderColor hover:border-primary/40"
        }
      `}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "translateZ(0)",
        contain: "layout"
      }}
    >
      {promedio !== null && (
        <div 
          className={`absolute top-2 right-2 max-sm:top-1.5 max-sm:right-8 px-1.5 py-0.5 text-[10px] max-sm:text-[9px] font-bold rounded-md border flex items-center justify-center min-w-[30px] max-sm:min-w-[26px] shadow-sm transition-all
            ${
              aprobado || excepcional || enCurso
                ? "bg-white/20 border-white/30 text-white"
                : "bg-primary/15 border-primary/30 text-primary"
            }`}
        >
          {promedio.toFixed(1)}
        </div>
      )}

      <div className={`mobile-course-name font-semibold leading-tight mb-1.5 line-clamp-2 ${hasTopRightBadge ? "max-sm:pr-14 sm:pr-8" : "max-sm:pr-9"}`}>
        {curso.nombre}
      </div>

      <div className="mobile-course-meta text-[10.5px] font-medium opacity-75">
        <span>{curso.codigo}</span>
        <span className="opacity-50 mx-1">·</span>
        <span>{curso.sct} SCT</span>
      </div>

      {/* Desktop: botón Notas completo */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAbrirNotas(curso);
        }}
        aria-label="Notas"
        className={`hidden sm:flex mt-2 w-full py-1.5 rounded-lg items-center justify-center gap-1.5 transition-all text-[11px] font-medium border
          ${
            enCurso || aprobado || excepcional
              ? "bg-black/15 hover:bg-black/25 text-white border-white/20"
              : "bg-bgPrimary/50 hover:bg-primary/10 text-textSecondary hover:text-primary border-borderColor/30 hover:border-primary/30"
          }
        `}
      >
        <NotebookPen className="w-3.5 h-3.5" /> Notas
      </button>

      {/* Mobile: ícono compacto */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAbrirNotas(curso);
        }}
        aria-label="Notas"
        className={`mobile-notes-button sm:hidden
          ${
            enCurso || aprobado || excepcional
              ? "!bg-black/15 !border-white/20 !text-white"
              : ""
          }`}
      >
        <NotebookPen />
      </button>
    </div>
  );
};

export default React.memo(Curso, (prevProps, nextProps) => {
  return (
    prevProps.curso.id === nextProps.curso.id &&
    prevProps.aprobado === nextProps.aprobado &&
    prevProps.excepcional === nextProps.excepcional &&
    prevProps.disponible === nextProps.disponible &&
    prevProps.modoExcepcional === nextProps.modoExcepcional &&
    prevProps.enCurso === nextProps.enCurso
  );
});
