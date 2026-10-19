function plural(n, singular, pluralForm) {
  return Number(n) === 1 ? singular : pluralForm;
}

export default function MallaProgressStats({
  aprobados,
  cursando,
  pendientes,
  pct,
  className = "",
  separatorClassName = "",
}) {
  const separator = (
    <span className={`opacity-45 ${separatorClassName}`} aria-hidden>•</span>
  );

  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-1.5 min-w-0 ${className}`}>
      <div className="flex items-baseline gap-2 whitespace-nowrap">
        <span className="t-figure text-textPrimary">{pct}%</span>
        <span className="text-[12px] leading-tight font-medium text-textSecondary">de avance</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-medium">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[color:var(--status-approved-text)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-approved-text)]" />
          {aprobados} {plural(aprobados, "aprobado", "aprobados")}
        </span>
        {separator}
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[color:var(--status-current-text)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-current-text)]" />
          {cursando} cursando
        </span>
        {separator}
        <span className="flex items-center gap-1.5 whitespace-nowrap text-textSecondary">
          <span className="w-1.5 h-1.5 rounded-full bg-textSecondary opacity-60" />
          {pendientes} {plural(pendientes, "pendiente", "pendientes")}
        </span>
      </div>
    </div>
  );
}
