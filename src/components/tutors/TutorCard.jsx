import { motion } from "framer-motion";
import { MessageCircle, Star } from "lucide-react";
import { averageRating, waLink } from "../../data/tutorsStorage";

function formatAvg(value) {
  return value > 0 ? value.toFixed(1).replace(".", ",") : "—";
}

/**
 * Fila de tutor. En la demo el contacto queda desactivado: los teléfonos son de ejemplo.
 */
export default function TutorCard({ tutor, filterSubject, onSimulateComplete, demo = true }) {
  const avg = averageRating(tutor.ratings || []);
  const ratingCount = (tutor.ratings || []).length;
  const subjects = tutor.asignaturas || [];
  const primarySubject =
    subjects.find((a) => a.toLowerCase().includes((filterSubject || "").toLowerCase())) ||
    subjects[0] ||
    "Asignatura";
  const shown = subjects.slice(0, 2);
  const extra = subjects.length - shown.length;

  const wa = !demo && tutor.disponible ? waLink(tutor.telefono, primarySubject) : null;
  const price =
    tutor.precioPorSesion != null && tutor.precioPorSesion > 0
      ? `$${Number(tutor.precioPorSesion).toLocaleString("es-CL")} por sesión`
      : "Precio a convenir";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-[15px] font-semibold leading-snug text-textPrimary">{tutor.nombre}</h3>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-textSecondary">
            <span
              className={`h-2 w-2 rounded-full ${tutor.disponible ? "bg-approved" : "bg-textSecondary/40"}`}
              aria-hidden
            />
            {tutor.disponible ? "Disponible" : "Pausado"}
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-textSecondary">
          {shown.join(", ")}
          {extra > 0 && <span className="num"> +{extra}</span>}
        </p>
        <p className="mt-1.5 text-[13px] text-textSecondary">
          <span className="num text-textPrimary">{formatAvg(avg)}</span>
          {ratingCount > 0 && <span className="num"> ({ratingCount})</span>}
          <span className="mx-1.5 text-borderColor">·</span>
          {price}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-[color:var(--on-ink)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            Solicitar tutoría
          </a>
        ) : (
          <button
            type="button"
            disabled
            title={demo ? "En la demo no se abre WhatsApp" : "Este tutor no está disponible"}
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-dashed border-borderColor px-3 py-2 text-[13px] font-medium text-textSecondary"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            {demo ? "Contactar (demo)" : "No disponible"}
          </button>
        )}
        <button
          type="button"
          onClick={() => onSimulateComplete(tutor)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-textSecondary transition-colors hover:bg-borderColor/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Star className="h-3.5 w-3.5" aria-hidden />
          Evaluar
        </button>
      </div>
    </motion.article>
  );
}
