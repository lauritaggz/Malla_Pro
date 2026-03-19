/**
 * LoginSuggestion — login opcional, sugerido tras seleccionar una malla.
 * No bloquea el acceso. Solo mejora sincronización entre dispositivos.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookMarked, Smartphone, ArrowRight, X, Check } from "lucide-react";

const STORAGE_KEY_USER   = "malla-user";
const STORAGE_KEY_SKIP   = "malla-login-skipped";

export function shouldShowLogin() {
  return !localStorage.getItem(STORAGE_KEY_USER) && !localStorage.getItem(STORAGE_KEY_SKIP);
}
export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_USER) || "null"); }
  catch { return null; }
}
export function logoutUser() {
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_SKIP);
}

/* ── Beneficio pill ── */
function Benefit({ icon, text }) {
  return (
    <div className="flex items-center gap-2 text-xs text-textSecondary">
      <span className="w-5 h-5 rounded-md bg-primaryMuted flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </span>
      {text}
    </div>
  );
}

/* ── Formulario email ── */
function EmailForm({ onSuccess, onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.includes("@")) { setError("Ingresa un correo válido."); return; }
    const user = { email, name: email.split("@")[0], provider: "email" };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    onSuccess(user);
  };

  return (
    <motion.div
      key="email-form"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.18 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-textSecondary hover:text-textPrimary mb-4 transition"
      >
        ← Volver
      </button>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="tu@email.com"
            autoFocus
            className="w-full rounded-lg px-3 py-2.5 border border-borderColor bg-bgPrimary text-textPrimary text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition"
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition"
        >
          Continuar <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </motion.div>
  );
}

export default function LoginSuggestion({ isOpen, onClose }) {
  const [view, setView] = useState("main");

  const handleGoogle = () => {
    const user = { name: "Usuario Google", email: "google@user", provider: "google" };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    onClose(user);
  };

  const handleEmailSuccess = (user) => { onClose(user); };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY_SKIP, "true");
    onClose(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="login-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90]"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            onClick={handleSkip}
          />

          {/* Panel */}
          <motion.div
            key="login-panel"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed z-[91] inset-0 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-bgSecondary border border-borderColor rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

              {/* Skip button */}
              <div className="flex justify-end px-4 pt-4">
                <button
                  onClick={handleSkip}
                  aria-label="Omitir inicio de sesión"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-borderColor/40 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-7 pb-7">
                {/* Logo + title */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--primary)" }}>
                    <BookMarked className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-textPrimary leading-tight">Malla Pro</div>
                    <div className="text-xs text-textSecondary">Tu malla académica interactiva</div>
                  </div>
                </div>

                {/* Heading */}
                <h2 className="text-lg font-bold text-textPrimary mb-1 leading-snug">
                  Sincroniza entre dispositivos
                </h2>
                <p className="text-sm text-textSecondary mb-5 leading-relaxed">
                  Inicia sesión para mantener tu avance sincronizado entre el celular y el computador.
                  Es opcional — puedes seguir sin cuenta.
                </p>

                {/* Beneficios */}
                <div className="space-y-2 mb-6">
                  <Benefit icon={<Smartphone className="w-3 h-3" />} text="Accede desde cualquier dispositivo" />
                  <Benefit icon={<Check className="w-3 h-3" />} text="Tu avance siempre actualizado" />
                  <Benefit icon={<BookMarked className="w-3 h-3" />} text="Sin perder datos al cambiar de navegador" />
                </div>

                {/* Botones / formulario */}
                <AnimatePresence mode="wait">
                  {view === "main" ? (
                    <motion.div
                      key="main-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-2.5"
                    >
                      {/* Google */}
                      <button
                        onClick={handleGoogle}
                        className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-borderColor bg-bgPrimary hover:bg-borderColor/30 text-textPrimary text-sm font-medium transition"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continuar con Google
                      </button>

                      {/* Email */}
                      <button
                        onClick={() => setView("email")}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition"
                      >
                        Continuar con correo <ArrowRight className="w-4 h-4" />
                      </button>

                      {/* Skip */}
                      <button
                        onClick={handleSkip}
                        className="w-full py-2 text-xs text-textSecondary hover:text-textPrimary transition text-center"
                      >
                        Continuar sin cuenta →
                      </button>
                    </motion.div>
                  ) : (
                    <EmailForm onSuccess={handleEmailSuccess} onBack={() => setView("main")} />
                  )}
                </AnimatePresence>

                {/* Legal */}
                <p className="text-[10px] text-textSecondary/50 text-center mt-4 leading-relaxed">
                  Datos almacenados localmente. Sin spam ni terceros.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
