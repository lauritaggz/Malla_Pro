import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * @param {{
 *   warnings: import('../types/academicProgramming').ParserWarning[],
 *   open?: boolean,
 *   onOpenChange?: (open: boolean) => void
 * }} props
 */
export default function ParserWarningsPanel({
  warnings,
  open: controlledOpen,
  onOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const count = warnings?.length || 0;
  if (!count) return null;

  const open = controlledOpen ?? internalOpen;
  const setOpen = (next) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };

  return (
    <div
      id="parser-warnings-panel"
      className="rounded-xl border border-amber-500/25 bg-amber-500/5 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500/40"
      >
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
        <span className="flex-1 text-sm text-textPrimary">
          <span className="font-semibold">{count}</span>
          {count === 1
            ? " dato requiere revisión"
            : " datos requieren revisión"}
        </span>
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 mr-1">
          {open ? "Ocultar" : "Ver detalles"}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-textSecondary transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <ul className="px-4 pb-3 space-y-2 border-t border-amber-500/20 pt-3">
              {warnings.map((w, idx) => (
                <li key={`${w.type}-${idx}`} className="text-xs sm:text-sm text-textSecondary leading-relaxed">
                  {w.sectionNrc ? (
                    <span className="font-medium text-textPrimary">NRC {w.sectionNrc}: </span>
                  ) : w.page ? (
                    <span className="font-medium text-textPrimary">Pág. {w.page}: </span>
                  ) : null}
                  {w.message}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
