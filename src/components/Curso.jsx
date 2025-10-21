import { useState } from "react";

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

  const handleClick = (e) => {
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
      title="Ctrl + clic para marcar como en curso"
      className={`cursor-pointer select-none p-3 text-[13px] rounded-md transition-all duration-300 border 
      shadow-sm text-left relative ${shake ? "shake" : ""}
      ${
        aprobado
          ? "bg-emerald-600 text-white border-emerald-500"
          : excepcional
          ? "bg-purple-600 text-white border-purple-500"
          : enCurso
          ? "bg-blue-500 text-white border-blue-400"
          : !disponible
          ? "bg-gray-800/40 text-gray-500 border-gray-700"
          : "bg-bgSecondary hover:bg-primary/10 border-borderColor/40"
      }`}
    >
      <div className="font-semibold leading-tight truncate">{curso.nombre}</div>
      <div className="text-[10px] opacity-80">{curso.codigo}</div>
      <div className="absolute bottom-1 right-2 text-[9px] opacity-70">
        {curso.sct} SCT
      </div>
    </div>
  );
}
