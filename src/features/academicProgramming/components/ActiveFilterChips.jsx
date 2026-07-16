import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * @param {{
 *   chips: Array<{ id: string, group: string, value: string, label: string }>,
 *   onRemove: (chip: { id: string, group: string, value: string }) => void,
 *   onClearAll: () => void
 * }} props
 */
export default function ActiveFilterChips({ chips, onRemove, onClearAll }) {
  if (!chips?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Filtros activos">
      <span className="text-xs font-medium text-textSecondary">Filtros:</span>
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.button
            key={chip.id}
            role="listitem"
            type="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={() => onRemove(chip)}
            className="
              inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-lg
              border border-primary/25 bg-primary/10 text-primary
              text-xs font-semibold
              hover:bg-primary/15
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            "
            aria-label={`Quitar filtro ${chip.label}`}
          >
            {chip.label}
            <X className="h-3 w-3" aria-hidden />
          </motion.button>
        ))}
      </AnimatePresence>
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-textSecondary hover:text-primary underline-offset-2 hover:underline"
      >
        Limpiar todos
      </button>
    </div>
  );
}
