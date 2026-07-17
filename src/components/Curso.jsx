import React, { useState, useEffect } from "react";
import { Lock, CheckCircle2, Circle } from "lucide-react";

const Curso = ({
  curso,
  aprobado,
  excepcional,
  disponible,
  enCurso,
  onSelect,
  highlightStatus = "normal",
}) => {
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

  let cardStatusClass = "curso-card-disponible";
  let statusBadge = null;

  if (aprobado) {
    cardStatusClass = "curso-card-aprobado";
    statusBadge = (
      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Aprobada</span>
      </div>
    );
  } else if (excepcional) {
    cardStatusClass = "curso-card-excepcional";
    statusBadge = (
      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Forzada</span>
      </div>
    );
  } else if (enCurso) {
    cardStatusClass = "curso-card-encurso";
    statusBadge = (
      <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
        <Circle className="w-2.5 h-2.5 fill-primary/30 flex-shrink-0" />
        <span>Cursando</span>
      </div>
    );
  } else if (!disponible) {
    cardStatusClass = "curso-card-bloqueado";
    statusBadge = (
      <div className="flex items-center gap-1 text-[10px] font-semibold text-textSecondary/70">
        <Lock className="w-3 h-3 flex-shrink-0" />
        <span>Bloqueada</span>
      </div>
    );
  } else {
    cardStatusClass = "curso-card-disponible border-dashed border-borderColor/80";
    statusBadge = (
      <div className="text-[10px] font-semibold text-textSecondary">
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

  return (
    <button
      onClick={() => onSelect(curso)}
      className={`curso-card-base w-full text-left focus:outline-none focus:ring-2 focus:ring-primary/45
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
          className="absolute top-2.5 right-2.5 px-1.5 py-0.5 text-[9px] font-bold rounded-md border flex items-center justify-center min-w-[26px] bg-white/10 dark:bg-white/5 border-borderColor/40 text-textPrimary shadow-sm"
        >
          {promedio.toFixed(1)}
        </div>
      )}

      {/* Course Name */}
      <div className="font-semibold text-textPrimary text-xs sm:text-[13px] leading-tight line-clamp-2 pr-8 mb-1.5">
        {curso.nombre}
      </div>

      {/* Meta details & status */}
      <div className="flex items-center justify-between gap-2 mt-auto w-full select-none">
        <div className="text-[10px] font-medium text-textSecondary leading-none">
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
