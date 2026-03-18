import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Mail, Monitor, Smartphone, X } from "lucide-react";

const USER_KEY   = "malla-user";
const SKIP_KEY   = "malla-login-skipped";

/* ── Google SVG icon ──────────────────────────────────────────── */
function GoogleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/* ── Email form ───────────────────────────────────────────────── */
function EmailForm({ onSuccess, onBack }) {
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) { setError("Ingresa tu nombre."); return; }
    if (!email.includes("@") || !email.includes(".")) { setError("Correo inválido."); return; }
    onSuccess({ name: name.trim(), email: email.trim(), provider: "email" });
  };

  return (
    <motion.form
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 w-full"
    >
      <input
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); setError(""); }}
        placeholder="Tu nombre"
        autoComplete="name"
        className="w-full rounded-2xl px-4 py-3 bg-bgPrimary border border-borderColor text-textPrimary placeholder:text-textSecondary/60 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/40 transition"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(""); }}
        placeholder="tu@correo.com"
        autoComplete="email"
        className="w-full rounded-2xl px-4 py-3 bg-bgPrimary border border-borderColor text-textPrimary placeholder:text-textSecondary/60 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/40 transition"
      />
      {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
      <button type="submit"
        className="w-full py-3 rounded-2xl bg-primary text-white font-semibold text-sm hover:brightness-110 transition shadow-md flex items-center justify-center gap-2">
        Continuar <ArrowRight className="w-4 h-4" />
      </button>
      <button type="button" onClick={onBack}
        className="text-xs text-textSecondary hover:text-textPrimary transition text-center py-1">
        ← Volver
      </button>
    </motion.form>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function LoginSuggestion({ isOpen, onClose }) {
  const [view, setView] = useState("main"); // "main" | "email"

  const handleGoogle = () => {
    /* En producción: flujo real de OAuth con Google.
       Por ahora se guarda un perfil local de demostración. */
    const user = {
      name: "Usuario de Google",
      email: "google@demo.com",
      provider: "google",
      avatar: null,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    onClose(user);
  };

  const handleEmailSuccess = (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    onClose(user);
  };

  const handleSkip = () => {
    localStorage.setItem(SKIP_KEY, "true");
    onClose(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="login-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(14px)" }}
        >
          <motion.div
            key="login-card"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md"
          >
            {/* Glow accent */}
            <div
              className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl pointer-events-none opacity-30"
              style={{ background: "var(--primary)" }}
            />

            <div className="relative rounded-3xl border border-borderColor overflow-hidden"
              style={{
                background: "var(--bgSurface, var(--bgSecondary))",
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                boxShadow: "0 24px 64px -8px rgba(0,0,0,0.35), 0 1px 0 inset rgba(255,255,255,0.12)"
              }}
            >
              {/* Skip button */}
              <button
                onClick={handleSkip}
                aria-label="Omitir login"
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-borderColor/30 transition z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="px-8 pt-10 pb-8">
                {/* Logo / Brand */}
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                    style={{ background: "var(--primary)", boxShadow: "0 8px 24px var(--shadowPrimary)" }}>
                    <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white">
                      <rect x="4" y="4" width="10" height="10" rx="2"/>
                      <rect x="18" y="4" width="10" height="10" rx="2" opacity=".7"/>
                      <rect x="4" y="18" width="10" height="10" rx="2" opacity=".7"/>
                      <rect x="18" y="18" width="10" height="10" rx="2" opacity=".5"/>
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-textPrimary tracking-tight">Malla Pro</h1>
                  <p className="text-sm text-textSecondary mt-1.5 leading-relaxed max-w-xs">
                    Inicia sesión para sincronizar tu malla entre todos tus dispositivos
                  </p>
                </div>

                {/* Sync benefit pills */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  {[
                    { icon: <Smartphone className="w-3.5 h-3.5" />, label: "Celular" },
                    { icon: <span className="text-[10px]">↔</span>, label: null },
                    { icon: <Monitor className="w-3.5 h-3.5" />, label: "Computador" },
                  ].map((item, i) =>
                    item.label === null ? (
                      <span key={i} className="text-textSecondary/50 text-xs">↔</span>
                    ) : (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: "var(--primaryMuted)", color: "var(--primary)" }}>
                        {item.icon}
                        {item.label}
                      </div>
                    )
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {view === "main" ? (
                    <motion.div
                      key="main-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col gap-3"
                    >
                      {/* Google */}
                      <button
                        onClick={handleGoogle}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border font-semibold text-sm transition hover:brightness-95 active:scale-[0.98]"
                        style={{
                          background: "var(--bgSecondary)",
                          borderColor: "var(--borderColor)",
                          color: "var(--textPrimary)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                        }}
                      >
                        <GoogleIcon size={18} />
                        Continuar con Google
                      </button>

                      {/* Email */}
                      <button
                        onClick={() => setView("email")}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border font-semibold text-sm transition hover:brightness-95 active:scale-[0.98]"
                        style={{
                          background: "var(--bgSecondary)",
                          borderColor: "var(--borderColor)",
                          color: "var(--textPrimary)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                        }}
                      >
                        <Mail className="w-4.5 h-4.5" style={{ color: "var(--primary)" }} />
                        Continuar con correo
                      </button>

                      {/* Divider */}
                      <div className="flex items-center gap-3 my-1">
                        <div className="flex-1 h-px" style={{ background: "var(--borderColor)" }} />
                        <span className="text-xs text-textSecondary">o</span>
                        <div className="flex-1 h-px" style={{ background: "var(--borderColor)" }} />
                      </div>

                      {/* Skip */}
                      <button
                        onClick={handleSkip}
                        className="w-full py-3 rounded-2xl text-sm font-medium transition hover:brightness-95 active:scale-[0.98]"
                        style={{
                          background: "var(--primaryMuted)",
                          color: "var(--textSecondary)"
                        }}
                      >
                        Continuar sin cuenta →
                      </button>
                    </motion.div>
                  ) : (
                    <EmailForm
                      onSuccess={handleEmailSuccess}
                      onBack={() => setView("main")}
                    />
                  )}
                </AnimatePresence>

                {/* Legal note */}
                <p className="text-center text-[11px] mt-5 leading-relaxed"
                  style={{ color: "var(--textSecondary)", opacity: 0.7 }}>
                  Iniciar sesión es{" "}
                  <strong style={{ color: "var(--textSecondary)" }}>completamente opcional</strong>.
                  <br />
                  Puedes usar Malla Pro sin cuenta en cualquier momento.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Helpers para App.jsx ─────────────────────────────────────── */
export function shouldShowLogin() {
  return !localStorage.getItem(USER_KEY) && !localStorage.getItem(SKIP_KEY);
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
}

export function logoutUser() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SKIP_KEY);
}
