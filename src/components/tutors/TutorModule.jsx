import { useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { Search, UserPlus, Star } from "lucide-react";
import TutorCard from "./TutorCard";
import TutorForm from "./TutorForm";
import DrawerPanel from "../DrawerPanel";
import { loadTutors, addRatingToTutor, averageRating } from "../../data/tutorsStorage";

export default function TutorModule() {
  const [tutors, setTutors] = useState(() => loadTutors());
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [evaluateTutor, setEvaluateTutor] = useState(null);
  const [pickedStars, setPickedStars] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tutors;
    return tutors.filter((t) =>
      (t.asignaturas || []).some((a) => a.toLowerCase().includes(q))
    );
  }, [tutors, query]);

  const handleSaved = useCallback((list) => {
    setTutors(list);
  }, []);

  const openEvaluate = useCallback((tutor) => {
    setEvaluateTutor(tutor);
    setPickedStars(0);
  }, []);

  const submitEvaluation = useCallback(() => {
    if (!evaluateTutor || pickedStars < 1 || pickedStars > 5) return;
    const list = addRatingToTutor(evaluateTutor.id, pickedStars);
    setTutors(list);
    setEvaluateTutor(null);
    setPickedStars(0);
  }, [evaluateTutor, pickedStars]);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-28 sm:pb-10 pt-2 sm:pt-4">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <h1 className="text-lg sm:text-xl font-bold text-textPrimary tracking-tight">
          Tutorías Connect
        </h1>
        <p className="text-xs sm:text-sm text-textSecondary mt-1 leading-relaxed">
          Busca tutores por asignatura, contacta por WhatsApp o regístrate para ayudar a otros.
        </p>
      </motion.header>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por asignatura..."
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-borderColor bg-bgSecondary text-sm text-textPrimary placeholder:text-textSecondary/70 outline-none focus:ring-2 focus:ring-primary/35"
            aria-label="Filtrar por nombre de asignatura"
          />
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm hover:brightness-110 transition-all whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          Soy tutor
        </motion.button>
      </div>

      <p className="text-[11px] text-textSecondary mb-3">
        {filtered.length === 0
          ? "No hay coincidencias con ese filtro."
          : `${filtered.length} tutor${filtered.length === 1 ? "" : "es"}`}
      </p>

      <LayoutGroup>
        <motion.ul layout className="flex flex-col gap-3 list-none p-0 m-0">
          <AnimatePresence mode="popLayout">
            {filtered.map((t) => (
              <li key={t.id} className="m-0">
                <TutorCard
                  tutor={t}
                  filterSubject={query}
                  onSimulateComplete={openEvaluate}
                />
              </li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </LayoutGroup>

      <TutorForm isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaved} />

      <DrawerPanel
        isOpen={!!evaluateTutor}
        onClose={() => {
          setEvaluateTutor(null);
          setPickedStars(0);
        }}
        title="Evaluar tutoría"
        subtitle={
          evaluateTutor
            ? `Simulación con ${evaluateTutor.nombre} · ${
                (evaluateTutor.ratings || []).length
                  ? `promedio ${averageRating(evaluateTutor.ratings).toFixed(1)}`
                  : "sin evaluaciones aún"
              }`
            : ""
        }
        width="max-w-md"
      >
        <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 py-5">
          <p className="text-sm text-textPrimary mb-4">
            ¿Cuántas estrellas merece esta tutoría? (1–5). Cada valoración actualiza el promedio del tutor.
          </p>
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.button
                key={n}
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setPickedStars(n)}
                aria-label={`${n} estrellas`}
                className={`p-2 rounded-xl border transition-colors ${
                  pickedStars >= n
                    ? "border-amber-400 bg-amber-400/15 text-amber-500"
                    : "border-borderColor text-textSecondary hover:bg-bgPrimary"
                }`}
              >
                <Star
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${
                    pickedStars >= n ? "fill-amber-400 text-amber-400" : ""
                  }`}
                />
              </motion.button>
            ))}
          </div>
          <div className="mt-auto flex gap-2 pt-2 border-t border-borderColor">
            <button
              type="button"
              onClick={() => {
                setEvaluateTutor(null);
                setPickedStars(0);
              }}
              className="flex-1 py-2.5 rounded-xl border border-borderColor text-sm font-medium text-textSecondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pickedStars < 1}
              onClick={submitEvaluation}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
            >
              Enviar evaluación
            </button>
          </div>
        </div>
      </DrawerPanel>
    </div>
  );
}
