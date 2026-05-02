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
          className={`w-3.5 h-3.5 ${i < full ? "text-amber-400 fill-amber-400" : "text-textSecondary/40"}`}
        />
      ))}
      <span className="text-[11px] text-textSecondary ml-1 font-medium">
        {value > 0 ? value.toFixed(1) : "Sin evaluar"}
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
      className="rounded-2xl border border-borderColor/80 bg-bgSecondary/90 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-textPrimary text-sm leading-tight">{tutor.nombre}</h3>
          <p className="text-[10px] text-textSecondary mt-0.5">
            {tutor.disponible ? "Disponible" : "No disponible ahora"}
          </p>
        </div>
        {!tutor.disponible && (
          <span className="text-[9px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-textSecondary/15 text-textSecondary">
            Pausado
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {(tutor.asignaturas || []).map((a) => (
          <span
            key={a}
            className="text-[10px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20"
          >
            {a}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <StarsRow value={avg} />
        {tutor.precioPorSesion != null && tutor.precioPorSesion > 0 ? (
          <span className="text-[11px] font-semibold text-textPrimary">
            ${Number(tutor.precioPorSesion).toLocaleString("es-CL")} / sesión
          </span>
        ) : (
          <span className="text-[10px] text-textSecondary">Precio a convenir</span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Solicitar tutoría
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-textSecondary/20 text-textSecondary text-xs font-semibold cursor-not-allowed"
          >
            <MessageCircle className="w-4 h-4" />
            No disponible para contacto
          </button>
        )}
        <button
          type="button"
          onClick={() => onSimulateComplete(tutor)}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-borderColor bg-bgPrimary/60 hover:bg-primary/10 text-textSecondary hover:text-primary text-xs font-medium transition-colors"
        >
          <Star className="w-4 h-4" />
          Simular tutoría realizada (evaluar)
        </button>
      </div>
    </motion.article>
  );
}
