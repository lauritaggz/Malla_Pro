// src/components/ProgressBar.jsx
export default function ProgressBar({ totalCursos, cursosAprobados }) {
  const progreso = totalCursos > 0 ? (cursosAprobados / totalCursos) * 100 : 0;

  return (
    <div className="w-full px-6 mt-4 max-sm:px-3 max-sm:mt-1">
      <div className="bg-borderColor/30 h-4 max-sm:h-2 rounded-full overflow-hidden shadow-inner backdrop-blur-md border border-borderColor/20">
        <div
          className="bg-primary h-4 max-sm:h-2 rounded-full transition-all duration-700 shadow-[0_0_12px_var(--primary)] opacity-90"
          style={{ width: `${progreso}%` }}
        ></div>
      </div>
      <p className="text-center text-sm max-sm:text-[10px] max-sm:mt-1 mt-2 text-textSecondary">
        {Math.round(progreso)}% completado ({cursosAprobados}/{totalCursos}{" "}
        cursos)
      </p>
    </div>
  );
}
