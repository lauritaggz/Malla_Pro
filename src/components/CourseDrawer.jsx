import React from "react";
import { CheckCircle2, Circle, Clock, HelpCircle, Lock, BookOpen, ChevronRight, NotebookPen, AlertTriangle } from "lucide-react";
import DrawerPanel from "./DrawerPanel";

export default function CourseDrawer({
  isOpen,
  onClose,
  curso,
  aprobado,
  excepcional,
  disponible,
  modoExcepcional,
  enCurso,
  aprobar,
  marcarExcepcional,
  toggleCursando,
  onAbrirNotas,
  getCursoById,
  aprobados = [],
  excepciones = [],
  allCursos = [],
}) {
  if (!curso) return null;

  // Determine current option value
  const currentStatus = aprobado
    ? "aprobado"
    : enCurso
    ? "cursando"
    : "pendiente";

  const handleStatusChange = (newStatus) => {
    if (newStatus === currentStatus) return;

    if (newStatus === "aprobado") {
      if (currentStatus === "cursando") {
        toggleCursando();
      }
      aprobar();
    } else if (newStatus === "cursando") {
      if (currentStatus === "aprobado") {
        aprobar();
      }
      toggleCursando();
    } else if (newStatus === "pendiente") {
      if (currentStatus === "aprobado") {
        aprobar();
      } else if (currentStatus === "cursando") {
        toggleCursando();
      }
    }
  };

  // Find prerequisite courses details
  const prereqCursos = (curso.prerrequisitos || []).map((preId) => {
    const preCurso = getCursoById?.(preId);
    return {
      id: preId,
      nombre: preCurso?.nombre || preId,
      codigo: preCurso?.codigo || preId,
      cumplido: aprobados.includes(preId) || excepciones.includes(preId),
    };
  });

  // Find immediate unlocks
  const desbloqueaCursos = allCursos
    .filter((c) => c.prerrequisitos?.includes(curso.id))
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      codigo: c.codigo,
    }));

  return (
    <DrawerPanel
      isOpen={isOpen}
      onClose={onClose}
      title={curso.nombre}
      subtitle={`${curso.codigo} · ${curso.sct || 0} SCT · Semestre ${curso.semestre || "S/N"}`}
      width="max-w-md"
    >
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6 text-sm">
        <p className="text-[11px] text-textSecondary leading-relaxed -mt-2 sm:hidden">
          En móvil, el botón <span className="font-bold text-textPrimary">PR</span> abre este panel
          con prerrequisitos y ramos que desbloquea. Toca la tarjeta para marcar aprobado;
          mantén pulsado para cursando.
        </p>
        
        {/* State selection */}
        <div className="flex flex-col gap-2">
          <label htmlFor="course-status-select" className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">
            Estado de la asignatura
          </label>
          <div className="relative">
            <select
              id="course-status-select"
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-borderColor bg-bgPrimary text-textPrimary text-xs font-semibold outline-none cursor-pointer appearance-none hover:border-primary/45 transition-colors focus:ring-2 focus:ring-primary/25"
            >
              <option value="pendiente">Pendiente</option>
              <option value="cursando">Cursando actualmente</option>
              {(!disponible && !modoExcepcional && !aprobado) ? (
                <option value="aprobado" disabled>
                  Aprobada (Bloqueado por prerrequisitos)
                </option>
              ) : (
                <option value="aprobado">Aprobada</option>
              )}
            </select>
            <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-textSecondary">
              <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
          </div>

          {/* Locked Warnings & Exceptional mode option */}
          {!disponible && currentStatus === "pendiente" && (
            <div className="mt-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1.5 leading-snug">
                <span>Esta asignatura está bloqueada por prerrequisitos.</span>
                {modoExcepcional && (
                  <button
                    onClick={marcarExcepcional}
                    className={`text-[10.5px] font-bold px-2 py-1 rounded bg-amber-500 text-white hover:brightness-110 active:scale-95 transition-all self-start ${excepcional ? "bg-amber-600 shadow-sm" : ""}`}
                  >
                    {excepcional ? "Desmarcar Aprobación Excepcional" : "Forzar Aprobación Excepcional"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action: Open notes/grades */}
        {(enCurso || aprobado || excepcional) && (
          <button
            onClick={() => onAbrirNotas?.(curso)}
            className="w-full py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 transition-all font-semibold flex items-center justify-center gap-2"
          >
            <NotebookPen className="w-4 h-4" />
            <span>Gestionar notas y calificaciones</span>
          </button>
        )}

        {/* Prerequisites Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">
              Prerrequisitos
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Requeridos
            </span>
          </div>
          {prereqCursos.length === 0 ? (
            <p className="text-xs text-textSecondary italic py-1 px-0.5">Esta asignatura no tiene prerrequisitos.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {prereqCursos.map((pre) => (
                <div
                  key={pre.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors
                    ${pre.cumplido
                      ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "bg-amber-500/5 border-amber-500/20 text-amber-800 dark:text-amber-200"}`}
                >
                  <span className="truncate pr-4">{pre.nombre} ({pre.codigo})</span>
                  {pre.cumplido ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unlocks Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">
              Asignaturas que desbloquea
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Desbloquea
            </span>
          </div>
          {desbloqueaCursos.length === 0 ? (
            <p className="text-xs text-textSecondary italic py-1 px-0.5">No desbloquea asignaturas posteriores.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {desbloqueaCursos.map((des) => (
                <div
                  key={des.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-textPrimary"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="truncate">{des.nombre} ({des.codigo})</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DrawerPanel>
  );
}
