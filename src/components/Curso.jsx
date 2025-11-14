import { useState } from "react";
import { NotebookPen, Check, AlertTriangle } from "lucide-react";

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

  const handleClick = (e) => {
    // CTRL → marcar en curso
    if (e.ctrlKey) {
      toggleCursando();
      return;
    }

    // No disponible → vibración
    if (!disponible && !modoExcepcional) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    // Excepcional
    if (modoExcepcional) {
      marcarExcepcional();
      return;
    }

    // Aprobar normal
    aprobar();
  };

  return (
    <div
      onClick={handleClick}
      className={`relative cursor-pointer select-none p-3 text-[13px] rounded-md transition-all duration-300 border shadow-sm text-left 
        ${shake ? "shake" : ""}
        ${
          aprobado
            ? "bg-emerald-600 text-white border-emerald-500"
            : excepcional
            ? "bg-purple-600 text-white border-purple-500"
            : enCurso
            ? "bg-blue-500 text-white border-blue-400"
            : !disponible
            ? "bg-gray-700/40 text-gray-500 border-gray-600"
            : "bg-bgSecondary hover:bg-primary/10 border-borderColor/40"
        }
      `}
    >
      {/* Nombre */}
      <div className="font-semibold leading-tight truncate">{curso.nombre}</div>

      {/* Código */}
      <div className="text-[10px] opacity-80">{curso.codigo}</div>

      {/* SCT */}
      <div className="absolute bottom-1 right-2 text-[9px] opacity-70">
        {curso.sct} SCT
      </div>

      {/* BOTÓN DE NOTAS */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Evita activar aprobar()
          onAbrirNotas(curso);
        }}
        className="mt-2 w-full bg-black/20 hover:bg-black/30 
                   text-white text-[11px] py-1 rounded flex items-center 
                   justify-center gap-1 transition-all border border-white/20"
      >
        <NotebookPen className="w-3 h-3" /> Notas
      </button>
    </div>
  );
}
