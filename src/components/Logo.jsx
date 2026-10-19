/* Marca de Malla Pro: una M hecha de nodos conectados, en tinta, con dos nodos
   amarillos (los ramos que ya están al día). Sigue el modo claro u oscuro. */
export default function Logo({ className = "", title }) {
  const ink = "rgb(var(--ink-rgb))";
  const paper = "rgb(var(--paper-rgb))";
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="100" height="100" rx="24" fill={ink} />
      <g stroke={paper} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M31 31V69" />
        <path d="M69 31V69" />
        <path d="M31 31L50 50L69 31" />
      </g>
      <circle cx="31" cy="31" r="6.4" fill={paper} />
      <circle cx="69" cy="31" r="6.4" fill={paper} />
      <circle cx="50" cy="50" r="5.4" fill={paper} />
      <circle cx="31" cy="69" r="6.4" fill="#F2D14B" />
      <circle cx="69" cy="69" r="6.4" fill="#F2D14B" />
    </svg>
  );
}
