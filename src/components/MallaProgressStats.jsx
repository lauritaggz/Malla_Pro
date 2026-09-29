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
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 ${className}`}>
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {aprobados} aprobados
      </span>
      {separator}
      <span className="flex items-center gap-1 text-primary whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        {cursando} cursando
      </span>
      {separator}
      <span className="flex items-center gap-1 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-borderColor" />
        {pendientes} pendientes
      </span>
      {separator}
      <span className="text-textPrimary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md whitespace-nowrap">
        {pct}% de avance
      </span>
    </div>
  );
}
