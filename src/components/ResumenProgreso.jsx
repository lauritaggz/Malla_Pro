import { useState, useEffect } from "react";
import { CheckCircle2, Hourglass, GraduationCap, BookOpen, BarChart3 } from "lucide-react";
import DrawerPanel from "./DrawerPanel";

export default function ResumenProgreso({
  mallaData,
  aprobados,
  excepciones,
  cursando,
  onClose,
  isOpen,
}) {
  const [datos, setDatos] = useState({
    asignaturasAprobadas: 0,
    asignaturasCursando: 0,
    asignaturasTotales: 0,
    creditosAprobados: 0,
    creditosCursando: 0,
    creditosTotales: 0,
  });
  const [promedioGlobal, setPromedioGlobal] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    calcularEstadisticas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mallaData, aprobados, excepciones, cursando]);

  const calcularEstadisticas = () => {
    if (!mallaData) return;

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

    let asignaturasTotales = 0;
    let asignaturasAprobadas = 0;
    let asignaturasCursando = 0;
    let creditosTotales = 0;
    let creditosAprobados = 0;
    let creditosCursando = 0;
    let sumaNotasPonderadas = 0;
    let creditosConNota = 0;

    const notasGuardadas = JSON.parse(localStorage.getItem("malla-notas") || "{}");

    semestresEfectivos.forEach((semestre) => {
      semestre.cursos.forEach((c) => {
        const sct = c.sct || 0;
        asignaturasTotales += 1;
        creditosTotales += sct;

        if (aprobados.includes(c.id) || excepciones.includes(c.id)) {
          asignaturasAprobadas += 1;
          creditosAprobados += sct;
          if (notasGuardadas[c.id]) {
            const evals = notasGuardadas[c.id];
            const pesoTotal = evals.reduce((a, b) => a + b.peso, 0);
            if (pesoTotal === 100) {
              const prom = evals.reduce((sum, e) => sum + (e.nota || 0) * e.peso, 0) / 100;
              sumaNotasPonderadas += prom * sct;
              creditosConNota += sct;
            }
          }
        } else if (cursando.includes(c.id)) {
          asignaturasCursando += 1;
          creditosCursando += sct;
        }
      });
    });

    setDatos({
      asignaturasAprobadas,
      asignaturasCursando,
      asignaturasTotales,
      creditosAprobados,
      creditosCursando,
      creditosTotales,
    });
    setPromedioGlobal(creditosConNota > 0 ? sumaNotasPonderadas / creditosConNota : null);
  };

  const pctAprobado  = datos.asignaturasTotales > 0 ? (datos.asignaturasAprobadas / datos.asignaturasTotales) * 100 : 0;
  const pctCursando  = datos.asignaturasTotales > 0 ? (datos.asignaturasCursando  / datos.asignaturasTotales) * 100 : 0;
  const asigPendientes = datos.asignaturasTotales - datos.asignaturasAprobadas - datos.asignaturasCursando;

  return (
    <DrawerPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Resumen de progreso"
      subtitle="Vista general de tu avance académico"
      width="max-w-lg"
    >
      <div className="px-6 py-6 space-y-6 pb-8" style={{ overflowY: "auto", flex: 1 }}>

        {/* ── Tarjetas de asignaturas ── */}
        <div>
          <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-3">Asignaturas</p>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Aprobadas"
              value={datos.asignaturasAprobadas}
              color="text-emerald-500"
              bg="bg-emerald-500/8 border-emerald-500/20"
            />
            <StatCard
              icon={<Hourglass className="w-4 h-4" />}
              label="En curso"
              value={datos.asignaturasCursando}
              color="text-primary"
              bg="bg-primaryMuted border-primary/20"
            />
            <StatCard
              icon={<GraduationCap className="w-4 h-4" />}
              label="Total"
              value={datos.asignaturasTotales}
              color="text-textPrimary"
              bg="bg-bgSurface border-borderColor"
            />
          </div>
        </div>

        {/* ── Barra de progreso ── */}
        <div className="rounded-xl border border-borderColor bg-bgSurface p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wide">Progreso general</span>
            <span className="text-sm font-bold text-textPrimary">
              {(pctAprobado + pctCursando).toFixed(1)}%
            </span>
          </div>

          <div className="relative w-full h-3 bg-borderColor/40 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${pctAprobado}%` }}
            />
            <div
              className="absolute inset-y-0 rounded-full transition-all duration-700"
              style={{ left: `${pctAprobado}%`, width: `${pctCursando}%`, background: "var(--primary)", opacity: 0.6 }}
            />
          </div>

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <LegendDot color="bg-emerald-500" label={`Aprobadas (${pctAprobado.toFixed(1)}%)`} />
            <LegendDot color="bg-primary" label={`En curso (${pctCursando.toFixed(1)}%)`} opacity="opacity-60" />
          </div>
        </div>

        {/* ── Detalle asignaturas ── */}
        <div className="rounded-xl border border-borderColor bg-bgSurface p-5">
          <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-3">
            <BookOpen className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />
            Detalle de asignaturas
          </p>
          <div className="space-y-2">
            <ProgressRow label="Aprobadas"  value={datos.asignaturasAprobadas} total={datos.asignaturasTotales} color="text-emerald-500" unit="ramos" />
            <ProgressRow label="En curso"   value={datos.asignaturasCursando}  total={datos.asignaturasTotales} color="text-primary"     unit="ramos" />
            <ProgressRow label="Pendientes" value={asigPendientes}             total={datos.asignaturasTotales} color="text-textSecondary" unit="ramos" />
          </div>
        </div>

        {/* ── Créditos SCT (detalle secundario) ── */}
        <div className="rounded-xl border border-borderColor bg-bgSurface p-5">
          <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-3">
            <BarChart3 className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />
            Créditos SCT
          </p>
          <div className="space-y-2">
            <ProgressRow label="Aprobados"  value={datos.creditosAprobados} total={datos.creditosTotales} color="text-emerald-500" unit="SCT" />
            <ProgressRow label="En curso"   value={datos.creditosCursando}  total={datos.creditosTotales} color="text-primary"     unit="SCT" />
            <ProgressRow
              label="Pendientes"
              value={datos.creditosTotales - datos.creditosAprobados - datos.creditosCursando}
              total={datos.creditosTotales}
              color="text-textSecondary"
              unit="SCT"
            />
          </div>
        </div>

        {/* ── Promedio ponderado ── */}
        {promedioGlobal !== null && (
          <div className="rounded-xl border border-borderColor bg-bgSurface p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-wide">Promedio ponderado</p>
              <p className="text-xs text-textSecondary/60 mt-0.5">Solo cursos con notas completas (100% peso)</p>
            </div>
            <span className={`text-3xl font-bold tabular-nums ${promedioGlobal >= 4 ? "text-emerald-500" : "text-red-500"}`}>
              {promedioGlobal.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </DrawerPanel>
  );
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${bg}`}>
      <div className={`${color} opacity-80`}>{icon}</div>
      <div>
        <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
        <div className="text-[11px] text-textSecondary mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function LegendDot({ color, label, opacity = "" }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color} ${opacity}`} />
      <span className="text-xs text-textSecondary">{label}</span>
    </div>
  );
}

function ProgressRow({ label, value, total, color, unit }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-textSecondary w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-borderColor/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${color} w-16 text-right`}>{value} {unit}</span>
    </div>
  );
}
