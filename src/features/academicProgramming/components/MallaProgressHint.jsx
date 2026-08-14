import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { safeStorage } from "../../../utils/safeStorage";

const DISMISS_KEY = "mallaPro:v1:tomaRamos:progressHintDismissed";

/**
 * Aviso compacto: el avance de la malla alimenta recomendaciones, no bloquea el horario.
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
      className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-[11px] sm:text-xs text-amber-900 dark:text-amber-100"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="flex-1 min-w-0 leading-snug">
          <p className="font-bold text-amber-800 dark:text-amber-200">
            Para recomendarte ramos, completa tu avance en Mi malla.
          </p>
          <p className="mt-0.5 text-amber-900/80 dark:text-amber-100/75">
            Tu horario actual sí se puede usar normalmente.{" "}
            <Link
              to="/app"
              className="font-bold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-50"
            >
              Ir a Mi malla
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-amber-700/70 hover:text-amber-900 dark:text-amber-200/70 dark:hover:text-amber-50 hover:bg-amber-500/10 transition-colors"
          aria-label="Cerrar aviso"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
