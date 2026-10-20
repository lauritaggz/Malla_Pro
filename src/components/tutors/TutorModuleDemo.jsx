import { useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, UserPlus, Star, ArrowLeft } from "lucide-react";
import TutorCard from "./TutorCard";
import TutorForm from "./TutorForm";
import DrawerPanel from "../DrawerPanel";
import { loadTutors, addRatingToTutor, averageRating } from "../../data/tutorsStorage";

export default function TutorModuleDemo({ onSalirDemo }) {
  const [tutors, setTutors] = useState(() => loadTutors());
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [evaluateTutor, setEvaluateTutor] = useState(null);
  const [pickedStars, setPickedStars] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tutors;
    return tutors.filter((t) => (t.asignaturas || []).some((a) => a.toLowerCase().includes(q)));
  }, [tutors, query]);

  const handleSaved = useCallback((list) => {
    setTutors(list);
  }, []);

  const openEvaluate = useCallback((tutor) => {
    setEvaluateTutor(tutor);
    setPickedStars(0);
  }, []);

  const closeEvaluate = useCallback(() => {
    setEvaluateTutor(null);
    setPickedStars(0);
  }, []);

  const submitEvaluation = useCallback(() => {
    if (!evaluateTutor || pickedStars < 1 || pickedStars > 5) return;
    setTutors(addRatingToTutor(evaluateTutor.id, pickedStars));
    closeEvaluate();
  }, [evaluateTutor, pickedStars, closeEvaluate]);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6 sm:px-8 sm:pb-12 sm:pt-10">
      <div
        role="status"
        className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-borderColor bg-bgSecondary px-4 py-3"
      >
        <p className="m-0 text-[13px] leading-snug text-textSecondary">
          <span className="font-semibold text-textPrimary">Demo.</span> Los tutores son de ejemplo y el contacto está
          desactivado. Lo que registres se guarda solo en este dispositivo.
        </p>
        <button
          type="button"
          onClick={onSalirDemo}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-textSecondary underline-offset-2 transition-colors hover:text-textPrimary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Salir de la demo
        </button>
      </div>

      <header className="mb-5">
        <h1 className="t-page m-0 text-textPrimary">Tutorías</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-textSecondary">
          Busca tutores por asignatura, o regístrate para ayudar a otros.
        </p>
      </header>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por asignatura"
            aria-label="Filtrar por nombre de asignatura"
            className="w-full rounded-xl border border-borderColor bg-bgSecondary py-2.5 pl-10 pr-3 text-[14px] text-textPrimary outline-none transition-colors placeholder:text-textSecondary focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-[14px] font-semibold text-[color:var(--on-ink)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bgPrimary"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Soy tutor
        </button>
      </div>

      <p className="num mb-2 text-[12px] text-textSecondary" aria-live="polite">
        {filtered.length === 0
          ? "Sin coincidencias."
          : `${filtered.length} ${filtered.length === 1 ? "tutor" : "tutores"}`}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-borderColor px-5 py-8 text-center">
          <p className="m-0 text-[14px] font-medium text-textPrimary">Ningún tutor enseña eso todavía.</p>
          <p className="mt-1 text-[13px] text-textSecondary">Prueba con otra asignatura o borra el filtro.</p>
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-borderColor/60 overflow-hidden rounded-xl border border-borderColor bg-bgSecondary p-0">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((t) => (
              <li key={t.id} className="m-0">
                <TutorCard tutor={t} filterSubject={query} onSimulateComplete={openEvaluate} />
              </li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <TutorForm isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaved} />

      <DrawerPanel
        isOpen={!!evaluateTutor}
        onClose={closeEvaluate}
        title="Evaluar tutoría"
        subtitle={
          evaluateTutor
            ? `${evaluateTutor.nombre} · ${
                (evaluateTutor.ratings || []).length
                  ? `promedio ${averageRating(evaluateTutor.ratings).toFixed(1).replace(".", ",")}`
                  : "sin evaluaciones aún"
              }`
            : ""
        }
        width="max-w-md"
      >
        <div className="flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-6">
          <p className="mb-4 text-[14px] text-textPrimary">
            ¿Cuántas estrellas merece esta tutoría? Cada valoración actualiza el promedio del tutor. En la demo se guarda solo
            en este dispositivo.
          </p>
          <div className="mb-6 flex justify-center gap-2" role="radiogroup" aria-label="Estrellas">
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.button
                key={n}
                type="button"
                role="radio"
                aria-checked={pickedStars === n}
                whileTap={{ scale: 0.92 }}
                onClick={() => setPickedStars(n)}
                aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
                className={`rounded-xl border p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  pickedStars >= n
                    ? "border-textPrimary bg-borderColor/40 text-textPrimary"
                    : "border-borderColor text-textSecondary hover:bg-borderColor/30"
                }`}
              >
                <Star className={`h-7 w-7 sm:h-8 sm:w-8 ${pickedStars >= n ? "fill-current" : ""}`} aria-hidden />
              </motion.button>
            ))}
          </div>
          <div className="mt-auto flex gap-2 border-t border-borderColor pt-3">
            <button
              type="button"
              onClick={closeEvaluate}
              className="flex-1 rounded-xl border border-borderColor py-2.5 text-[14px] font-medium text-textSecondary transition-colors hover:bg-borderColor/30"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pickedStars < 1}
              onClick={submitEvaluation}
              className="flex-1 rounded-xl bg-primary py-2.5 text-[14px] font-semibold text-[color:var(--on-ink)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enviar evaluación
            </button>
          </div>
        </div>
      </DrawerPanel>
    </div>
  );
}
