import { useEffect, useState } from "react";

export default function StatsDisplay({
  totalCursos,
  cursosAprobados,
  cursosCursando,
  cursosEnCursoData = [],
}) {
  const [promedioEnCurso, setPromedioEnCurso] = useState(null);

  const porcentajeAprobados =
    totalCursos > 0 ? Math.round((cursosAprobados / totalCursos) * 100) : 0;
  
  // Calcular SCT total de ramos en curso
  const totalSctEnCurso = cursosEnCursoData.reduce((total, curso) => total + (curso.sct || 0), 0);

  // ==========================
  // 🔥 Calcular Promedio En Curso (Ponderado por SCT)
  // ==========================
  useEffect(() => {
    if (!cursosEnCursoData || cursosEnCursoData.length === 0) {
      setPromedioEnCurso(null);
      return;
    }

    const notasGuardadas = JSON.parse(
      localStorage.getItem("malla-notas") || "{}"
    );

    let sumaPonderada = 0;
    let totalSct = 0;

    cursosEnCursoData.forEach((curso) => {
      const evaluaciones = notasGuardadas[curso.id] || [];

      const evaluacionesConNota = evaluaciones.filter(
        (e) => e.nota !== null && e.nota !== undefined
      );

      if (evaluacionesConNota.length === 0) return;

      const pesoConNota = evaluacionesConNota.reduce(
        (sum, e) => sum + (e.peso || 0),
        0
      );

      if (pesoConNota <= 0) return;

      // Promedio actual del ramo
      const promedioCurso =
        evaluacionesConNota.reduce(
          (sum, e) => sum + (e.nota || 0) * (e.peso || 0),
          0
        ) / pesoConNota;

      const sct = curso.sct || 1;

      sumaPonderada += promedioCurso * sct;
      totalSct += sct;
    });

    setPromedioEnCurso(totalSct > 0 ? sumaPonderada / totalSct : null);
  }, [cursosEnCursoData]);

  // ==========================
  // UI ORIGINAL (sin cambios)
  // ==========================
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-3">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
        {/* 🟢 Ramos Aprobados (Verde iOS) */}
        <div
          className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-emerald-500/95 backdrop-blur-md 
                        border border-emerald-400/20 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
        >
          <div className="w-3 h-3 rounded-full bg-white/90 shadow-sm"></div>
          <div className="flex flex-col">
            <span className="text-white/90 text-xs font-semibold uppercase tracking-wider">
              Aprobados
            </span>
            <span className="text-white text-xl font-bold leading-tight flex items-baseline gap-1">
              {cursosAprobados}
              <span className="text-sm font-medium opacity-80">
                ramos ({porcentajeAprobados}%)
              </span>
            </span>
          </div>
        </div>

        {/* 🔵 Ramos Cursando (Destacado con Tema Primario) */}
        <div
          className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-primary backdrop-blur-md 
                        border border-primary/20 shadow-lg shadow-primary/25 transition-all hover:scale-105"
        >
          <div className="w-3 h-3 rounded-full bg-white/90 shadow-sm"></div>
          <div className="flex flex-col">
            <span className="text-white/90 text-xs font-semibold uppercase tracking-wider">
              En Curso
            </span>
            <span className="text-white text-xl font-bold leading-tight flex items-baseline gap-1">
              {cursosCursando}
              <span className="text-sm font-medium opacity-80">ramos</span>
              {totalSctEnCurso > 0 && (
                <>
                  <span className="text-sm font-medium opacity-60 mx-1">•</span>
                  <span className="text-sm font-medium opacity-90">{totalSctEnCurso} SCT</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* ⚪ Total Ramos (Base) */}
        <div
          className="flex items-center gap-3 px-5 py-2.5 rounded-2xl glass-card 
                        border border-borderColor/60 shadow-md transition-all hover:scale-105"
        >
          <div className="w-3 h-3 rounded-full bg-primary shadow-sm"></div>
          <div className="flex flex-col">
            <span className="text-textSecondary text-xs font-semibold uppercase tracking-wider">
              Total Cursos
            </span>
            <span className="text-textPrimary text-xl font-bold leading-tight">
              {totalCursos}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
export const MemoizedStatsDisplay = React.memo(StatsDisplay);
