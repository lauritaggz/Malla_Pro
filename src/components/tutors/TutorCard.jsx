import { motion } from "framer-motion";
import { MessageCircle, Star } from "lucide-react";
import { averageRating, waLink } from "../../data/tutorsStorage";

function StarsRow({ value, max = 5 }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} de 5 estrellas`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < full ? "text-amber-500 fill-amber-500" : "text-textSecondary/40"}`}
        />
      ))}
      <span className="text-[11px] text-textSecondary ml-1.5 font-bold">
        {value > 0 ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}

export default function TutorCard({ tutor, filterSubject, onSimulateComplete }) {
  const avg = averageRating(tutor.ratings || []);
  const primarySubject =
    tutor.asignaturas?.find((a) =>
      a.toLowerCase().includes((filterSubject || "").toLowerCase())
    ) || tutor.asignaturas?.[0] || "Asignatura";

  const wa = tutor.disponible
    ? waLink(tutor.telefono, primarySubject)
    : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-borderColor bg-bgSecondary p-5 flex flex-col gap-4 text-left hover:border-primary/35 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="font-bold text-textPrimary text-sm leading-snug">{tutor.nombre}</h3>
          <span className="text-[10px] text-textSecondary mt-1 uppercase font-semibold">
            {tutor.disponible ? "Disponible" : "No disponible"}
          </span>
        </div>
        {!tutor.disponible && (
          <span className="text-[9px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-md bg-textSecondary/15 text-textSecondary select-none">
            Pausado
          </span>
        )}
      </div>

      {/* Asignaturas */}
      <div className="flex flex-wrap gap-1.5 py-1">
        {(tutor.asignaturas || []).map((a) => (
          <span
            key={a}
            className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
          >
            {a}
          </span>
        ))}
      </div>

      {/* Ratings & Price */}
      <div className="flex items-center justify-between gap-2 select-none border-t border-borderColor/40 pt-3">
        <StarsRow value={avg} />
        {tutor.precioPorSesion != null && tutor.precioPorSesion > 0 ? (
          <span className="text-xs font-bold text-textPrimary">
            ${Number(tutor.precioPorSesion).toLocaleString("es-CL")} / sesión
          </span>
        ) : (
          <span className="text-xs text-textSecondary italic">Precio a convenir</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 mt-2 w-full">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Solicitar tutoría</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-textSecondary/20 text-textSecondary text-xs font-semibold cursor-not-allowed"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>No disponible</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onSimulateComplete(tutor)}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-borderColor bg-bgPrimary/30 hover:bg-primary/10 text-textSecondary hover:text-primary text-xs font-bold transition-all"
        >
          <Star className="w-3.5 h-3.5" />
          <span>Evaluar tutor</span>
        </button>
      </div>
    </motion.article>
  );
}
