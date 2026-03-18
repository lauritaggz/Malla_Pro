import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  CheckCircle2,
  Hourglass,
  GraduationCap,
  TrendingUp,
  BarChart2,
} from "lucide-react";

export default function ResumenProgreso({
  mallaData,
  aprobados,
  excepciones,
  cursando,
  onClose,
  isOpen,
}) {
  const [creditosData, setCreditosData] = useState({
    aprobados: 0,
    cursando: 0,
    totales: 0,
  });

  const [promedioGlobal, setPromedioGlobal] = useState(null);

  // =============================
  // CALCULOS
  // =============================
  useEffect(() => {
    if (!isOpen) return; // evita cálculos innecesarios
    calcularEstadisticas();
  }, [isOpen, mallaData, aprobados, excepciones, cursando]);

  const calcularEstadisticas = () => {
    if (!mallaData) return;

    // Mallas con menciones usan semestresComunes + menciones en lugar de semestres
    let semestresEfectivos = [];
    if (mallaData.isMencion) {
      semestresEfectivos = [
        ...(mallaData.semestresComunes || []),
        ...Object.values(mallaData.menciones || {}).flatMap((m) => m.semestres || []),
      ];
    } else {
      semestresEfectivos = mallaData.semestres || [];
    }

    if (semestresEfectivos.length === 0) return;

    let creditosTotales = 0;
    let creditosAprobados = 0;
    let creditosCursando = 0;
    let sumaNotasPonderadas = 0;
    let creditosConNota = 0;

    const notasGuardadas = JSON.parse(
      localStorage.getItem("malla-notas") || "{}"
    );

    const stats = semestresEfectivos.map((semestre, idx) => {
      let aprobS = 0;
      let cursandoS = 0;
      let totalS = 0;

      semestre.cursos.forEach((c) => {
        const sct = c.sct || 0;
        totalS += sct;
        creditosTotales += sct;

        if (aprobados.includes(c.id) || excepciones.includes(c.id)) {
          creditosAprobados += sct;
          aprobS += sct;

          // notas
          if (notasGuardadas[c.id]) {
            const evals = notasGuardadas[c.id];
            const pesoTotal = evals.reduce((a, b) => a + b.peso, 0);

            if (pesoTotal === 100) {
              const prom =
                evals.reduce((sum, e) => sum + (e.nota || 0) * e.peso, 0) / 100;

              sumaNotasPonderadas += prom * sct;
              creditosConNota += sct;
            }
          }
        } else if (cursando.includes(c.id)) {
          creditosCursando += sct;
          cursandoS += sct;
        }
      });

      return {
        semestre: `S${idx + 1}`,
        aprobados: aprobS,
        cursando: cursandoS,
        pendientes: totalS - aprobS - cursandoS,
      };
    });

    setCreditosData({
      aprobados: creditosAprobados,
      cursando: creditosCursando,
      totales: creditosTotales,
    });

    setPromedioGlobal(
      creditosConNota > 0 ? sumaNotasPonderadas / creditosConNota : null
    );
  };

  if (!isOpen) return null;

  // =============================
  // PORCENTAJES Y GRAFICOS
  // =============================

  const porcentajeAprobado =
    creditosData.totales > 0
      ? (creditosData.aprobados / creditosData.totales) * 100
      : 0;

  const porcentajeCursando =
    creditosData.totales > 0
      ? (creditosData.cursando / creditosData.totales) * 100
      : 0;

  // =============================
  // RENDER
  // =============================

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] flex items-center justify-center p-4 pb-[5rem] sm:pb-4"
          onClick={onClose}
        >
        {/* MODAL CONTENT */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-bgPrimary max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-borderColor p-6"
        >
          {/* BOTÓN CERRAR */}
          <button
            onClick={onClose}
            aria-label="Cerrar resumen de progreso"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-bgSecondary/60 hover:bg-bgSecondary transition flex items-center justify-center text-xl font-bold border border-borderColor"
          >
            ✕
          </button>

          {/* TITULO */}
          <h1 className="text-3xl font-bold text-textPrimary mb-1">
            <BarChart2 className="inline-block w-6 h-6 mr-2" />
            Resumen de Progreso
          </h1>
          <p className="text-textSecondary mb-8">
            Vista general de tu rendimiento y avance académico.
          </p>

          {/* CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* APROBADOS */}
            <div className="glass-card p-5 rounded-xl border border-borderColor">
              <p className="text-sm text-textSecondary mb-1">
                Créditos Aprobados
              </p>
              <p className="text-3xl font-bold text-emerald-500">
                {creditosData.aprobados}
              </p>
            </div>

            {/* CURSANDO */}
            <div className="glass-card p-5 rounded-xl border border-borderColor">
              <p className="text-sm text-textSecondary mb-1">En Curso</p>
              <p className="text-3xl font-bold text-primary">
                {creditosData.cursando}
              </p>
            </div>

            {/* TOTALES */}
            <div className="glass-card p-5 rounded-xl border border-borderColor">
              <p className="text-sm text-textSecondary mb-1">Total Créditos</p>
              <p className="text-3xl font-bold text-primary">
                {creditosData.totales}
              </p>
            </div>
          </div>



          {/* PROGRESO GENERAL */}
          <div className="mt-10 glass-card p-6 rounded-xl border border-borderColor">
            <h3 className="text-xl font-bold text-textPrimary mb-4">
              Progreso General
            </h3>

            <div className="relative w-full h-8 bg-bgSecondary rounded-full overflow-hidden">
              <div
                className="absolute top-0 h-full bg-emerald-500/80"
                style={{ width: `${porcentajeAprobado}%` }}
              />
              <div
                className="absolute top-0 h-full bg-primary/80"
                style={{
                  left: `${porcentajeAprobado}%`,
                  width: `${porcentajeCursando}%`,
                }}
              />
            </div>

            <p className="text-center text-textSecondary mt-2">
              {(porcentajeAprobado + porcentajeCursando).toFixed(1)}% completado
            </p>
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
