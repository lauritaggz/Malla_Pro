import { CheckCircle2, Hourglass, Target } from "lucide-react";

export default function StatsDisplay({
  totalCursos,
  cursosAprobados,
  cursosCursando,
}) {
  const porcentajeAprobados =
    totalCursos > 0 ? Math.round((cursosAprobados / totalCursos) * 100) : 0;
  const porcentajeCursando =
    totalCursos > 0 ? Math.round((cursosCursando / totalCursos) * 100) : 0;
  const porcentajeAvance = Math.min(
    100,
    Math.max(0, porcentajeAprobados + porcentajeCursando)
  );

  const stats = [
    {
      key: "aprobados",
      label: "Cursos aprobados",
      value: cursosAprobados,
      info: `${porcentajeAprobados}% del plan`,
      percent: porcentajeAprobados,
      percentHint: "Aprobado",
      icon: CheckCircle2,
      accentGradient:
        "linear-gradient(135deg, rgba(34,197,94,0.22) 0%, rgba(16,185,129,0.05) 70%)",
      glowColor: "rgba(34,197,94,0.45)",
      iconColor: "rgba(16,185,129,1)",
      progressColor:
        "linear-gradient(90deg, rgba(34,197,94,0.9) 0%, rgba(16,185,129,0.35) 100%)",
    },
    {
      key: "cursando",
      label: "Cursos en curso",
      value: cursosCursando,
      info: `${porcentajeCursando}% del plan`,
      percent: porcentajeCursando,
      percentHint: "En curso",
      icon: Hourglass,
      accentGradient:
        "linear-gradient(135deg, rgba(59,130,246,0.22) 0%, rgba(37,99,235,0.05) 70%)",
      glowColor: "rgba(59,130,246,0.4)",
      iconColor: "rgba(59,130,246,1)",
      progressColor:
        "linear-gradient(90deg, rgba(59,130,246,0.9) 0%, rgba(59,130,246,0.25) 100%)",
    },
    {
      key: "totales",
      label: "Total de cursos",
      value: totalCursos,
      info: `${Math.max(
        0,
        totalCursos - cursosAprobados - cursosCursando
      )} pendientes`,
      percent: porcentajeAvance,
      percentHint: "Avance global",
      icon: Target,
      accentGradient:
        "linear-gradient(135deg, var(--primary) 0%, rgba(255,255,255,0) 75%)",
      glowColor: "rgba(59,130,246,0.35)",
      iconColor: "var(--primary)",
      progressColor:
        "linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const progressWidth = `${Math.min(100, Math.max(0, stat.percent))}%`;

          return (
            <div
              key={stat.key}
              className="group relative overflow-hidden rounded-2xl border border-borderColor glass-card shadow-theme transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-lg"
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: stat.accentGradient }}
              />

              <div className="relative flex h-full flex-col gap-5 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                      {stat.label}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-textPrimary">
                        {stat.value}
                      </span>
                      <span className="text-sm text-textSecondary">
                        {stat.info}
                      </span>
                    </div>
                  </div>

                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-inset ring-white/20">
                    <span
                      className="absolute inset-0 rounded-xl blur-xl"
                      style={{ background: stat.glowColor }}
                    />
                    <Icon
                      className="relative h-6 w-6"
                      style={{ color: stat.iconColor }}
                    />
                  </div>
                </div>

                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-textSecondary">
                    <span>{stat.percentHint}</span>
                    <span>{progressWidth}</span>
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: progressWidth,
                        background: stat.progressColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
