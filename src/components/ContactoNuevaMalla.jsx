import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, Send, Mail, Users, CheckCircle2, ArrowRight,
  LogIn, FileDown, MousePointerClick, Paperclip, PartyPopper,
} from "lucide-react";

const MAIL = "contacto@mallapro.cl";

const STEPS = [
  {
    num: 1,
    icon: <LogIn className="w-5 h-5" />,
    title: "Ingresa a Toma de Ramos UNAB",
    desc: "Inicia sesión con tus credenciales institucionales.",
  },
  {
    num: 2,
    icon: <MousePointerClick className="w-5 h-5" />,
    title: "Abre tu malla curricular",
    desc: 'Haz clic en "Ver Malla Curricular" dentro del portal.',
  },
  {
    num: 3,
    icon: <FileDown className="w-5 h-5" />,
    title: "Guarda como PDF",
    desc: 'Con tu malla visible, haz clic derecho y selecciona "Guardar como PDF" o "Descargar como PDF". Guarda el archivo con el nombre de tu carrera.',
  },
  {
    num: 4,
    icon: <Paperclip className="w-5 h-5" />,
    title: "Envíanos el PDF",
    desc: "Manda ese archivo al correo contacto@mallapro.cl. El botón de abajo te abre el correo con el asunto prellenado, solo adjunta el PDF y envía.",
  },
  {
    num: 5,
    icon: <PartyPopper className="w-5 h-5" />,
    title: "¡Listo!",
    desc: "Una vez recibido, en algunos días tu malla estará disponible en Malla Pro para que todos la puedan usar.",
  },
];

export default function ContactoNuevaMalla({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  const copyMail = () => {
    navigator.clipboard.writeText(MAIL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const mailtoHref = `mailto:${MAIL}?subject=Nueva%20malla%3A%20%5BCarrera%5D%20%E2%80%94%20UNAB&body=Hola%20Malla%20Pro%2C%0A%0AQuiero%20enviar%20la%20malla%20de%20mi%20carrera.%0A%0ACarrera%3A%20%0A%0AAdjunto%20el%20PDF%20de%20mi%20malla%20curricular.%0A%0A%C2%A1Gracias!`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 95,
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
            }}
          />

          {/* Contenedor centrador (no animado) */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 96,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              pointerEvents: "none",
            }}
          >
          {/* Panel animado — dentro del flex-center para que transform no rompa el centrado */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(94vw, 600px)",
              maxHeight: "92dvh",
              borderRadius: 20,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 28px 72px rgba(0,0,0,0.30)",
              pointerEvents: "auto",
            }}
            className="border border-primary/20 bg-bgSecondary"
          >
            {/* ── Fondo estilo landing ── */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 0 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-purple-500/5" />
              <div className="absolute -top-14 -right-14 w-52 h-52 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-14 -left-14 w-52 h-52 bg-purple-500/12 rounded-full blur-3xl" />
            </div>

            {/* ── Header ── */}
            <div
              className="flex-shrink-0 px-6 pt-6 pb-5 border-b border-borderColor/60 relative"
              style={{ zIndex: 1 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Heart className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
                    </div>
                    <h2 className="text-lg font-bold text-textPrimary">Envía tu malla</h2>
                  </div>
                  <p className="text-sm text-textSecondary leading-snug max-w-sm">
                    Ayuda a más estudiantes de tu carrera. Entre todos construimos la base de mallas.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-borderColor/40 transition-colors flex-shrink-0 mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Contenido scrollable ── */}
            <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px 28px", position: "relative", zIndex: 1 }}>

              {/* Banner colaborativo */}
              <div className="rounded-2xl p-4 mb-6 border border-primary/25 bg-primary/8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-textPrimary">¿Tu carrera aún no está en Malla Pro?</p>
                  <p className="text-xs text-textSecondary mt-0.5">
                    Solo toma 5 minutos y beneficia a todos tus compañeros.
                  </p>
                </div>
              </div>

              {/* Pasos */}
              <p className="text-[11px] font-bold text-textSecondary uppercase tracking-widest mb-3">Paso a paso</p>
              <div className="space-y-2.5 mb-6">
                {STEPS.map((step) => (
                  <div
                    key={step.num}
                    className="flex items-start gap-3.5 rounded-xl border border-borderColor/60 bg-bgSurface/70 px-4 py-3.5"
                    style={{ backdropFilter: "blur(4px)" }}
                  >
                    {/* Número + icono */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
                      <div className="w-8 h-8 rounded-xl bg-primaryMuted flex items-center justify-center text-primary">
                        {step.icon}
                      </div>
                    </div>

                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-textSecondary/45 uppercase tracking-wider">
                          Paso {step.num}
                        </span>
                        {step.num === 5 && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-textPrimary leading-snug">{step.title}</p>
                      <p className="text-xs text-textSecondary mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sección de contacto */}
              <div
                className="rounded-2xl border border-borderColor/60 bg-bgSurface/70 p-4"
                style={{ backdropFilter: "blur(4px)" }}
              >
                <p className="text-[11px] font-bold text-textSecondary uppercase tracking-widest mb-3">Correo de contacto</p>

                {/* Mail row */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-primaryMuted flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-textSecondary">Escríbenos a</p>
                    <p className="text-sm font-bold text-textPrimary font-mono tracking-tight">{MAIL}</p>
                  </div>
                  <button
                    onClick={copyMail}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      copied
                        ? "bg-emerald-500/12 border-emerald-500/35 text-emerald-500"
                        : "border-borderColor bg-bgPrimary text-textSecondary hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {copied ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>

                {/* CTA principal */}
                <a
                  href={mailtoHref}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "var(--primary)", boxShadow: "0 4px 20px var(--shadowPrimary, rgba(0,0,0,0.2))" }}
                >
                  <Send className="w-4 h-4" />
                  Abrir correo y adjuntar PDF
                  <ArrowRight className="w-4 h-4" />
                </a>

                <p className="text-[11px] text-textSecondary/55 text-center mt-2.5 leading-relaxed">
                  Se abre tu aplicación de correo con el asunto prellenado.
                  Solo adjunta el PDF de tu malla y envía.
                </p>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
