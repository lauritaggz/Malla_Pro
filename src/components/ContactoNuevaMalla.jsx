import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Mail, Check, Copy } from "lucide-react";

const MAIL = "mallaprocl@gmail.com";

const STEPS = [
  {
    title: "Ingresa a Toma de Ramos UNAB",
    desc: "Inicia sesión con tus credenciales institucionales.",
  },
  {
    title: "Abre tu malla curricular",
    desc: 'Haz clic en "Ver Malla Curricular" dentro del portal.',
  },
  {
    title: "Guarda tu malla como PDF",
    desc: 'Con la malla visible, haz clic derecho y elige "Guardar como PDF" o "Descargar como PDF". Nombra el archivo con tu carrera.',
  },
  {
    title: "Envíanos el PDF",
    desc: "El botón de abajo abre tu correo con el asunto listo. Adjunta el archivo y envía.",
  },
];

const MAILTO_HREF = `mailto:${MAIL}?subject=${encodeURIComponent("Nueva malla: [Carrera] — UNAB")}&body=${encodeURIComponent(
  "Hola Malla Pro,\n\nQuiero enviar la malla de mi carrera.\n\nCarrera: \n\nAdjunto el PDF de mi malla curricular.\n\nGracias."
)}`;

export default function ContactoNuevaMalla({ isOpen, onClose }) {
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const copyMail = async () => {
    try {
      await navigator.clipboard.writeText(MAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el correo queda visible para copiarlo a mano
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[96] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contacto-malla-title"
        >
          <motion.button
            type="button"
            key="backdrop"
            aria-label="Cerrar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55 cursor-default"
          />

          <motion.div
            key="panel"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-borderColor bg-bgSecondary shadow-xl sm:max-w-[520px] sm:rounded-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-borderColor/60 px-5 pb-4 pt-5 sm:px-6">
              <div className="min-w-0">
                <h2 id="contacto-malla-title" className="t-section m-0 text-textPrimary">
                  Envía tu malla
                </h2>
                <p className="mt-1.5 max-w-sm text-[14px] leading-snug text-textSecondary">
                  Si tu carrera no está, mándanos el PDF de tu malla y la agregamos para todos tus compañeros.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-textSecondary transition-colors hover:bg-borderColor/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <ol className="m-0 list-none divide-y divide-borderColor/60 overflow-hidden rounded-xl border border-borderColor p-0">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex items-start gap-3.5 px-4 py-3.5">
                    <span className="num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-borderColor text-[12px] text-textSecondary">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 text-[14px] font-semibold leading-snug text-textPrimary">{step.title}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-textSecondary">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-textSecondary">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-approved" aria-hidden />
                Cuando la recibamos, en algunos días tu malla estará disponible en Malla Pro para todos.
              </p>
            </div>

            <footer className="border-t border-borderColor/60 bg-bgPrimary/40 px-5 py-4 sm:px-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-textSecondary" aria-hidden />
                  <span className="num select-all truncate text-[13px] text-textPrimary">{MAIL}</span>
                </div>
                <button
                  type="button"
                  onClick={copyMail}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    copied ? "text-approved" : "text-textSecondary hover:bg-borderColor/40 hover:text-textPrimary"
                  }`}
                >
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <a
                href={MAILTO_HREF}
                className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-[14px] font-semibold text-[color:var(--on-ink)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bgSecondary"
              >
                Abrir correo con el asunto listo
              </a>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
