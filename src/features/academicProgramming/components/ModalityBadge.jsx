import { MODALITY_LABELS } from "../services/filterCourses";

const STYLES = {
  PRESENCIAL:
    "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20",
  VIRTUAL: "bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/20",
  E_LEARNING:
    "bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border-indigo-500/20",
  BLENDED: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
  UNKNOWN: "bg-borderColor/40 text-textSecondary border-borderColor",
};

/**
 * @param {{ modality: string, className?: string }} props
 */
export default function ModalityBadge({ modality, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${STYLES[modality] || STYLES.UNKNOWN} ${className}`}
    >
      {MODALITY_LABELS[modality] || modality || "Desconocida"}
    </span>
  );
}
