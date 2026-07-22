import { Check } from "lucide-react";

const STEPS = [
  { num: 1, label: "Cargar PDF" },
  { num: 2, label: "Elegir Ramos" },
  { num: 3, label: "Armar Horario" },
  { num: 4, label: "Confirmar" },
];

/**
 * Barra de progreso de 4 pasos de Toma de Ramos.
 * La línea de progreso se alinea con el centro de los círculos, no con las etiquetas.
 *
 * @param {{ currentStep?: number }} props
 */
export default function TomaDeRamosStepper({ currentStep = 1 }) {
  const step = Math.min(4, Math.max(1, Number(currentStep) || 1));

  return (
    <nav aria-label="Progreso de toma de ramos" className="w-full max-w-xl mx-auto px-1 sm:px-4 select-none mb-4 md:mb-8">
      <ol className="grid grid-cols-4 gap-0">
        {STEPS.map((s, index) => {
          const isCompleted = step > s.num;
          const isActive = step === s.num;
          const isReached = step >= s.num;
          const segmentFilled = step > s.num;

          return (
            <li key={s.num} className="relative flex flex-col items-center min-w-0">
              {/* Segmento hacia el siguiente paso (alineado al centro del círculo) */}
              {index < STEPS.length - 1 && (
                <div
                  className="absolute top-3 left-[calc(50%+12px)] right-[calc(-50%+12px)] sm:top-3.5 sm:left-[calc(50%+14px)] sm:right-[calc(-50%+14px)] h-0.5 z-0"
                  aria-hidden
                >
                  <div className="h-full w-full bg-borderColor/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: segmentFilled ? "100%" : "0%" }}
                    />
                  </div>
                </div>
              )}

              <div
                className={`relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold border transition-all duration-300
                  ${
                    isCompleted
                      ? "bg-primary border-primary text-white"
                      : isActive
                        ? "bg-bgSecondary border-primary text-primary ring-2 sm:ring-4 ring-primary/15"
                        : "bg-bgSecondary border-borderColor text-textSecondary"
                  }`}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} aria-hidden />
                ) : (
                  s.num
                )}
              </div>

              <span
                className={`mt-1.5 sm:mt-2 text-[9px] sm:text-[11px] text-center leading-tight px-0.5 max-w-full
                  ${
                    isActive
                      ? "text-primary font-extrabold"
                      : isReached
                        ? "text-textSecondary font-bold"
                        : "text-textSecondary/70 font-semibold"
                  }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
