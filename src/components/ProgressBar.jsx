// src/components/ProgressBar.jsx
export default function ProgressBar({ totalCursos, cursosAprobados }) {
  const progreso = totalCursos > 0 ? (cursosAprobados / totalCursos) * 100 : 0;

  return (
    <div className="w-full px-6 mt-4">
      <div className="bg-borderColor h-4 rounded-full overflow-hidden shadow-inner">
        <div
          className="bg-primary h-4 rounded-full transition-all duration-700"
          style={{ width: `${progreso}%` }}
        ></div>
      </div>
      <p className="text-center text-sm mt-2 text-textSecondary">
        {Math.round(progreso)}% completado ({cursosAprobados}/{totalCursos}{" "}
        cursos)
      </p>
    </div>
  );
}
