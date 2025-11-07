export default function StatsDisplay({
  totalCursos,
  cursosAprobados,
  cursosCursando,
}) {
  const porcentajeAprobados =
    totalCursos > 0 ? Math.round((cursosAprobados / totalCursos) * 100) : 0;
  const porcentajeCursando =
    totalCursos > 0 ? Math.round((cursosCursando / totalCursos) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-3">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
        {/* Ramos Aprobados */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/90 backdrop-blur-sm 
                        border border-emerald-400/30 shadow-theme transition-all hover:scale-105"
        >
          <div className="w-3 h-3 rounded-full bg-white/90"></div>
          <div className="flex flex-col">
            <span className="text-white text-xs font-medium opacity-90">
              Aprobados
            </span>
            <span className="text-white text-lg font-bold">
              {cursosAprobados}{" "}
              <span className="text-sm font-normal">
                ({porcentajeAprobados}%)
              </span>
            </span>
          </div>
        </div>

        {/* Ramos Cursando */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/90 backdrop-blur-sm 
                        border border-blue-400/30 shadow-theme transition-all hover:scale-105"
        >
          <div className="w-3 h-3 rounded-full bg-white/90"></div>
          <div className="flex flex-col">
            <span className="text-white text-xs font-medium opacity-90">
              En Curso
            </span>
            <span className="text-white text-lg font-bold">
              {cursosCursando}{" "}
              <span className="text-sm font-normal">
                ({porcentajeCursando}%)
              </span>
            </span>
          </div>
        </div>

        {/* Total Ramos */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card 
                        border border-borderColor shadow-theme transition-all hover:scale-105"
        >
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <div className="flex flex-col">
            <span className="text-textSecondary text-xs font-medium">
              Total
            </span>
            <span className="text-textPrimary text-lg font-bold">
              {totalCursos}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
