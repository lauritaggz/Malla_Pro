import { MODALITY_LABELS } from "../services/filterCourses";

// La modalidad no es un estado: se muestra neutra y el texto la distingue.
const NEUTRAL = "bg-bgPrimary text-textPrimary border-borderColor";
const STYLES = {
  PRESENCIAL: NEUTRAL,
  VIRTUAL: NEUTRAL,
  E_LEARNING: NEUTRAL,
  BLENDED: NEUTRAL,
  UNKNOWN: "bg-bgPrimary text-textSecondary border-borderColor",
};

/**
 * @param {{ modality: string, className?: string }} props
 */
export default function ModalityBadge({ modality, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[12px] font-medium ${STYLES[modality] || STYLES.UNKNOWN} ${className}`}
    >
      {MODALITY_LABELS[modality] || modality || "Desconocida"}
    </span>
  );
}
