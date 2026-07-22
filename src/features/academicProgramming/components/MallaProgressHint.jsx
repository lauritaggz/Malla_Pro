import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { safeStorage } from "../../../utils/safeStorage";

const DISMISS_KEY = "mallaPro:v1:tomaRamos:progressHintDismissed";

/**
 * Advertencia al entrar a Toma de Ramos: el avance de la malla alimenta las recomendaciones.
 */
export default function MallaProgressHint({ forceShow = false }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }
    const dismissed = safeStorage.getRaw(DISMISS_KEY) === "true";
    setVisible(!dismissed);
  }, [forceShow]);

  if (!visible) return null;

  const dismiss = () => {
    safeStorage.setRaw(DISMISS_KEY, "true");
    setVisible(false);
  };

  return (
    <div
      role="status"
      className="mb-3 md:mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-amber-900 dark:text-amber-100"
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
          <p className="font-bold text-amber-800 dark:text-amber-200 text-[12px] sm:text-[13px] leading-snug">
            Marca tus ramos en la malla antes de continuar
          </p>
          <p className="text-[11px] sm:text-[13px] leading-snug sm:leading-relaxed text-amber-900/90 dark:text-amber-100/85">
            <span className="sm:hidden">
              En{" "}
              <Link
                to="/app"
                className="font-bold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-50"
              >
                Mi malla
              </Link>{" "}
              marca aprobados y cursando para mejores recomendaciones.
            </span>
            <span className="hidden sm:inline">
              Para sugerirte las asignaturas que puedes tomar este periodo, necesitamos
              que en{" "}
              <Link
                to="/app"
                className="font-bold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-50"
              >
                Mi malla
              </Link>{" "}
              tengas marcados los ramos ya aprobados (y los que estás cursando, si aplica).
              Sin ese avance, la lista recomendada puede quedar incompleta o incorrecta.
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-amber-700/70 hover:text-amber-900 dark:text-amber-200/70 dark:hover:text-amber-50 hover:bg-amber-500/10 transition-colors"
          aria-label="Cerrar advertencia"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
