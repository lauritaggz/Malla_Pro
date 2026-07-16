/**
 * Encabezado numerado de bloque principal.
 * @param {{ number: number | string, title: string, description?: string, id?: string }} props
 */
export default function SectionBlockHeading({ number, title, description, id }) {
  return (
    <div id={id} className="space-y-1.5 mb-4">
      <h2 className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-textPrimary tracking-tight">
        <span
          className="
            inline-flex h-6 w-6 shrink-0 items-center justify-center
            rounded-full bg-primary/12 text-primary
            text-xs font-bold
          "
          aria-hidden
        >
          {number}
        </span>
        {title}
      </h2>
      {description ? (
        <p className="text-sm text-textSecondary leading-relaxed pl-[2.125rem]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
