import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
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
}) {
  const [creditosData, setCreditosData] = useState({
    aprobados: 0,
    cursando: 0,
    totales: 0,
  });
  const [promedioGlobal, setPromedioGlobal] = useState(null);
  const [estadisticasPorSemestre, setEstadisticasPorSemestre] = useState([]);

  useEffect(() => {
    calcularEstadisticas();
  }, [mallaData, aprobados, excepciones, cursando]);

  const calcularEstadisticas = () => {
    if (!mallaData || !mallaData.semestres) return;

    let creditosTotales = 0;
    let creditosAprobados = 0;
    let creditosCursando = 0;
    let sumaNotasPonderadas = 0;
    let creditosConNota = 0;
    const notasGuardadas = JSON.parse(
      localStorage.getItem("malla-notas") || "{}"
    );

    const statsPorSemestre = mallaData.semestres.map((semestre, idx) => {
      let creditosAprobadosSemestre = 0;
      let creditosCursandoSemestre = 0;
      let creditosTotalesSemestre = 0;

      semestre.cursos.forEach((curso) => {
        const sct = curso.sct || 0;
        creditosTotales += sct;
        creditosTotalesSemestre += sct;

        if (aprobados.includes(curso.id) || excepciones.includes(curso.id)) {
          creditosAprobados += sct;
          creditosAprobadosSemestre += sct;

          // Obtener promedio del curso si tiene notas
          if (notasGuardadas[curso.id]) {
            const evaluaciones = notasGuardadas[curso.id];
            const pesoTotal = evaluaciones.reduce((sum, e) => sum + e.peso, 0);

            if (pesoTotal === 100) {
              const promedioCurso =
                evaluaciones.reduce(
                  (sum, e) => sum + (e.nota || 0) * e.peso,
                  0
                ) / 100;

              sumaNotasPonderadas += promedioCurso * sct;
              creditosConNota += sct;
            }
          }
        } else if (cursando.includes(curso.id)) {
          creditosCursando += sct;
          creditosCursandoSemestre += sct;
        }
      });

      return {
        semestre: `S${idx + 1}`,
        aprobados: creditosAprobadosSemestre,
        cursando: creditosCursandoSemestre,
        pendientes:
          creditosTotalesSemestre -
          creditosAprobadosSemestre -
          creditosCursandoSemestre,
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
    setEstadisticasPorSemestre(statsPorSemestre);
  };

  const porcentajeAprobado =
    creditosData.totales > 0
      ? (creditosData.aprobados / creditosData.totales) * 100
      : 0;
  const porcentajeCursando =
    creditosData.totales > 0
      ? (creditosData.cursando / creditosData.totales) * 100
      : 0;
  const porcentajePendiente = 100 - porcentajeAprobado - porcentajeCursando;

  const pieData = [
    { name: "Aprobados", value: creditosData.aprobados, color: "#10b981" },
    { name: "En Curso", value: creditosData.cursando, color: "#3b82f6" },
    {
      name: "Pendientes",
      value:
        creditosData.totales - creditosData.aprobados - creditosData.cursando,
      color: "#6b7280",
    },
  ];

  const COLORS = pieData.map((d) => d.color);

  return (
    <div className="min-h-screen bg-bgPrimary p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-textPrimary mb-2">
            <BarChart2 className="inline-block w-6 h-6 mr-2" /> Resumen de
            Progreso
          </h1>
          <p className="text-textSecondary">
            Visualiza tu avance académico y rendimiento general
          </p>
        </div>

        {/* Cards de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 rounded-xl border border-borderColor"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-textSecondary">Créditos Aprobados</p>
              <span className="text-2xl">
                <CheckCircle2 className="inline-block w-6 h-6" />
              </span>
            </div>
            <p className="text-3xl font-bold text-green-500">
              {creditosData.aprobados}
            </p>
            <p className="text-xs text-textSecondary mt-1">
              {porcentajeAprobado.toFixed(1)}% del total
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 rounded-xl border border-borderColor"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-textSecondary">En Curso</p>
              <span className="text-2xl">
                <Hourglass className="inline-block w-6 h-6" />
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-500">
              {creditosData.cursando}
            </p>
            <p className="text-xs text-textSecondary mt-1">
              {porcentajeCursando.toFixed(1)}% del total
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 rounded-xl border border-borderColor"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-textSecondary">Total Créditos</p>
              <span className="text-2xl">
                <GraduationCap className="inline-block w-6 h-6" />
              </span>
            </div>
            <p className="text-3xl font-bold text-primary">
              {creditosData.totales}
            </p>
            <p className="text-xs text-textSecondary mt-1">
              {creditosData.totales -
                creditosData.aprobados -
                creditosData.cursando}{" "}
              pendientes
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 rounded-xl border border-borderColor"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-textSecondary">Promedio Global</p>
              <span className="text-2xl">
                <TrendingUp className="inline-block w-6 h-6" />
              </span>
            </div>
            <p className="text-3xl font-bold text-primary">
              {promedioGlobal !== null ? promedioGlobal.toFixed(2) : "--"}
            </p>
            <p className="text-xs text-textSecondary mt-1">Ponderado por SCT</p>
          </motion.div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de pastel - Distribución de créditos */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6 rounded-xl border border-borderColor"
          >
            <h3 className="text-xl font-bold text-textPrimary mb-4">
              Distribución de Créditos
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-textSecondary">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Gráfico de barras - Progreso por semestre */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-6 rounded-xl border border-borderColor"
          >
            <h3 className="text-xl font-bold text-textPrimary mb-4">
              Progreso por Semestre
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={estadisticasPorSemestre}>
                <XAxis dataKey="semestre" stroke="var(--textSecondary)" />
                <YAxis stroke="var(--textSecondary)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bgSecondary)",
                    borderColor: "var(--borderColor)",
                    borderRadius: "8px",
                    color: "var(--textPrimary)",
                  }}
                />
                <Legend />
                <Bar dataKey="aprobados" fill="#10b981" name="Aprobados" />
                <Bar dataKey="cursando" fill="#3b82f6" name="En Curso" />
                <Bar dataKey="pendientes" fill="#6b7280" name="Pendientes" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Barra de progreso general */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 glass-card p-6 rounded-xl border border-borderColor"
        >
          <h3 className="text-xl font-bold text-textPrimary mb-4">
            Progreso General
          </h3>
          <div className="relative w-full h-8 bg-bgSecondary rounded-full overflow-hidden border border-borderColor">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${porcentajeAprobado}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-400"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${porcentajeCursando}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              className="absolute top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400"
              style={{ left: `${porcentajeAprobado}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-white drop-shadow-lg">
                {(porcentajeAprobado + porcentajeCursando).toFixed(1)}%
                completado
              </span>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-textSecondary">
            <span>0 SCT</span>
            <span>{creditosData.totales} SCT</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
