import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import TutorModuleDemo from "./TutorModuleDemo";

const IDEAS = [
  "Busca tutores por asignatura.",
  "Contáctalos directo por WhatsApp.",
  "Evalúa la tutoría y ayuda a que otros elijan mejor.",
];

export default function TutorModule({ onVolver }) {
  const reduceMotion = useReducedMotion();
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return <TutorModuleDemo onVolver={onVolver} onSalirDemo={() => setShowDemo(false)} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-8 sm:px-8 sm:pb-12 sm:pt-14">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        <p className="m-0 text-[13px] font-semibold text-textSecondary">Próximamente</p>
        <h1 className="t-page m-0 mt-1 text-textPrimary">Tutorías</h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-textSecondary">
          Estamos armando un lugar para encontrar tutores por asignatura. Todavía no está disponible.
        </p>

        <ul className="m-0 mt-6 list-none divide-y divide-borderColor/60 overflow-hidden rounded-xl border border-borderColor bg-bgSecondary p-0">
          {IDEAS.map((idea) => (
            <li key={idea} className="px-4 py-3 text-[14px] text-textPrimary">
              {idea}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setShowDemo(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-semibold text-[color:var(--on-ink)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bgPrimary"
        >
          Ver la demo con datos de ejemplo
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </motion.div>
    </div>
  );
}
