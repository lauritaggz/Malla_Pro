import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, animate } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  Map,
  Calculator,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import NodeNetwork from "./NodeNetwork.jsx";

export default function LandingPage() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const parallaxY1 = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const parallaxY2 = useTransform(scrollYProgress, [0, 1], [0, -120]);

  // Dark/Light + Theme sync (mirrors App.jsx behavior)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("malla-darkmode");
    if (saved !== null) return saved === "true";
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });
  const [theme, setTheme] = useState(
    () => localStorage.getItem("malla-theme") || "aurora"
  );

  useEffect(() => {
    document.documentElement.className = `${theme} ${
      darkMode ? "dark" : "light"
    }`;
    localStorage.setItem("malla-darkmode", darkMode);
    localStorage.setItem("malla-theme", theme);
  }, [darkMode, theme]);

  const features = [
    {
      icon: "📊",
      title: "Visualización Intuitiva",
      description:
        "Explora tu malla curricular de forma clara y organizada por semestres.",
    },
    {
      icon: "✅",
      title: "Seguimiento de Progreso",
      description:
        "Marca cursos aprobados y visualiza tu avance en tiempo real.",
    },
    {
      icon: "📓",
      title: "Gestión de Notas",
      description:
        "Registra evaluaciones, calcula promedios y simula resultados.",
    },
    {
      icon: "📈",
      title: "Dashboard Completo",
      description:
        "Analiza créditos, promedios y estadísticas con gráficos interactivos.",
    },
    {
      icon: "🎨",
      title: "Temas Personalizables",
      description: "Elige entre 5 temas de color y modo claro/oscuro.",
    },
    {
      icon: "📱",
      title: "Diseño Responsivo",
      description: "Experiencia optimizada para desktop, tablet y móvil.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-bgPrimary via-bgSecondary to-bgPrimary overflow-x-hidden">
      {/* Header with brand + dark toggle */}
      <header className="absolute top-0 inset-x-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary"
            aria-label="Ir a inicio"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Malla Pro
          </button>
          <div className="flex items-center gap-2">
            <button
              aria-label="Cambiar modo de color"
              onClick={() => setDarkMode((d) => !d)}
              className="w-10 h-10 rounded-full glass-card border border-borderColor flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-blue-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[100svh] flex items-center justify-center px-4 py-24">
        {/* Dynamic aurora background with parallax */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            style={{ y: parallaxY1 }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.12, 0.2, 0.12],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -left-20 w-[28rem] h-[28rem] rounded-full bg-primary blur-[100px]"
          />
          <motion.div
            style={{ y: parallaxY2 }}
            animate={{
              scale: [1.1, 0.95, 1.1],
              opacity: [0.1, 0.18, 0.1],
            }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-24 -right-24 w-[34rem] h-[34rem] rounded-full bg-secondary blur-[120px]"
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="[font-size:clamp(2.5rem,5vw,5rem)] font-black mb-4 leading-tight">
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                Tu carrera, visualizada.
              </span>
            </h1>
            <p className="[font-size:clamp(1.05rem,2.3vw,1.6rem)] text-textSecondary mb-8 font-light">
              Planifica, mide y alcanza tus metas con Malla Pro.
            </p>
          </motion.div>

          {/* 3D Interactive Node Network */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mb-10 sm:mb-14 max-w-5xl"
          >
            <div className="relative rounded-2xl border border-borderColor glass-card overflow-hidden shadow-theme-xl">
              <NodeNetwork height={500} />
            </div>
            <p className="text-center text-textSecondary text-sm mt-3 opacity-75">
              Mueve el cursor sobre los nodos para ver las conexiones
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={() => navigate("/app")}
              className="group relative px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-full text-base sm:text-lg shadow-theme-xl hover:shadow-theme-2xl transition-all duration-300 hover:scale-105 overflow-hidden"
              aria-label="Empezar ahora"
            >
              <span className="relative z-10">Empezar ahora</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("why")
                  .scrollIntoView({ behavior: "smooth" })
              }
              className="px-8 py-4 glass-card border border-borderColor text-textPrimary font-semibold rounded-full text-base sm:text-lg hover:bg-primary/10 transition-all duration-300 hover:scale-105"
              aria-label="Ver más"
            >
              Ver más
            </button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-textSecondary"
            aria-hidden="true"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <svg
                className="w-6 h-6 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Why Malla Pro? */}
      <section id="why" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center text-3xl md:text-4xl font-bold text-textPrimary mb-10"
          >
            ¿Por qué Malla Pro?
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                Icon: Map,
                title: "Planifica tu avance académico.",
                desc: "Organiza ramos por semestre y visualiza prerrequisitos al instante.",
              },
              {
                Icon: Calculator,
                title: "Registra tus notas y simula tu promedio final.",
                desc: "Gestiona evaluaciones, pesos y promedios ponderados.",
              },
              {
                Icon: ShieldCheck,
                title: "Evita sorpresas y controla tu progreso.",
                desc: "Monitorea tu avance durante todo el año con claridad.",
              },
            ].map(({ Icon, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative p-6 rounded-2xl border border-borderColor glass-card hover:shadow-theme-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-textPrimary mb-2">
                  {title}
                </h3>
                <p className="text-textSecondary">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulated Dashboard Showcase */}
      <section className="py-20 px-4 bg-bgSecondary/40">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-textPrimary">
              Visualiza tu progreso real
            </h2>
            <p className="text-textSecondary mt-3">
              Sigue tu avance académico como nunca antes.
            </p>
          </motion.div>

          <DashboardShowcase />
        </div>
      </section>

      {/* Features Overview */}
      <section id="features" className="py-20 px-4 bg-bgSecondary/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-textPrimary mb-4">
              Características
            </h2>
            <p className="text-lg text-textSecondary max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tu carrera universitaria de
              forma efectiva
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Mock malla */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-borderColor glass-card overflow-hidden"
            >
              <div className="p-4 border-b border-borderColor flex items-center justify-between">
                <h3 className="font-semibold text-textPrimary">
                  Malla interactiva
                </h3>
                <span className="text-textSecondary text-sm">
                  Vista por semestres
                </span>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 rounded-md border border-borderColor bg-bgPrimary/70"
                  />
                ))}
              </div>
            </motion.div>

            {/* Notas modal */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-borderColor glass-card overflow-hidden"
            >
              <div className="p-4 border-b border-borderColor flex items-center justify-between">
                <h3 className="font-semibold text-textPrimary">
                  Gestión de notas
                </h3>
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-md border border-borderColor bg-bgPrimary/70"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-textPrimary">
                        Evaluación {i + 1}
                      </p>
                      <p className="text-xs text-textSecondary">25%</p>
                    </div>
                    <div className="w-16 h-8 rounded bg-bgSecondary border border-borderColor" />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Dashboard */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl border border-borderColor glass-card overflow-hidden"
            >
              <div className="p-4 border-b border-borderColor flex items-center justify-between">
                <h3 className="font-semibold text-textPrimary">Dashboard</h3>
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                <div className="col-span-3 h-24 rounded-md bg-gradient-to-r from-green-500/30 to-blue-500/30 border border-borderColor" />
                <div className="col-span-1 h-24 rounded-md border border-borderColor bg-bgPrimary/70" />
                <div className="col-span-2 h-24 rounded-md border border-borderColor bg-bgPrimary/70" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quote / Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="italic text-textSecondary text-lg md:text-xl"
          >
            “Hecha por estudiantes, para estudiantes.”
          </motion.blockquote>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center glass-card p-12 rounded-3xl border border-borderColor"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-textPrimary mb-6">
            Empieza a planificar tu futuro académico hoy.
          </h2>
          <p className="text-lg text-textSecondary mb-8 max-w-2xl mx-auto">
            Únete a estudiantes que ya están usando Malla Pro para planificar su
            carrera universitaria de forma inteligente.
          </p>
          <button
            onClick={() => navigate("/app")}
            className="group relative px-10 py-5 bg-gradient-to-r from-primary to-secondary 
                     text-white font-bold rounded-full text-xl shadow-theme-xl
                     hover:shadow-theme-2xl transition-all duration-300 hover:scale-105
                     overflow-hidden"
            aria-label="Explorar mallas"
          >
            <span className="relative z-10">Explorar mallas →</span>
            <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-borderColor">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-textSecondary">
          <p className="text-sm">
            Malla Pro © 2025 — Todos los derechos reservados.
          </p>
          <nav className="flex items-center gap-4 text-sm">
            <a
              href="#privacy"
              className="hover:text-textPrimary transition-colors"
            >
              Política de privacidad
            </a>
            <a
              href="#contact"
              className="hover:text-textPrimary transition-colors"
            >
              Contacto
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// --- Helpers & components: Dashboard Showcase ---
function DashboardShowcase() {
  const stats = {
    progreso: 68,
    promedio: 5.4,
    creditos: 280,
    totalCreditos: 400,
  };
  const [counterProm, setCounterProm] = useState(0);
  const [counterProg, setCounterProg] = useState(0);

  // animate numbers when in view using IntersectionObserver pattern
  const [inView, setInView] = useState(false);
  const onRef = (node) => {
    if (!node) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(node);
  };

  useEffect(() => {
    if (!inView) return;
    const controls1 = animate(0, stats.promedio, {
      duration: 1.2,
      onUpdate: (v) => setCounterProm(Number(v.toFixed(2))),
      ease: "easeOut",
    });
    const controls2 = animate(0, stats.progreso, {
      duration: 1.2,
      onUpdate: (v) => setCounterProg(Math.round(v)),
      ease: "easeOut",
      delay: 0.15,
    });
    return () => {
      controls1.stop();
      controls2.stop();
    };
  }, [inView]);

  const porcentajeCred = Math.round(
    (stats.creditos / stats.totalCreditos) * 100
  );

  return (
    <div ref={onRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Progreso de carrera (circular) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="p-6 rounded-2xl border border-borderColor glass-card flex flex-col items-center justify-center"
      >
        <div className="relative w-36 h-36">
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <defs>
              <linearGradient id="gradCircle" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--secondary)" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--borderColor)"
              strokeWidth="10"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="url(#gradCircle)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - counterProg / 100)}
              initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 52 * (1 - counterProg / 100),
              }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-textPrimary">
              {counterProg}%
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm text-textSecondary">Progreso de carrera</p>
      </motion.div>

      {/* Promedio general */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, delay: 0.05 }}
        className="p-6 rounded-2xl border border-borderColor glass-card flex flex-col items-center justify-center"
      >
        <div className="text-5xl font-bold text-primary">
          {counterProm.toFixed(2)}
        </div>
        <p className="mt-2 text-sm text-textSecondary">Promedio acumulado</p>
      </motion.div>

      {/* Créditos aprobados */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="p-6 rounded-2xl border border-borderColor glass-card"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-textPrimary font-medium">
            Créditos aprobados
          </span>
          <span className="text-textSecondary text-sm">
            {stats.creditos}/{stats.totalCreditos}
          </span>
        </div>
        <div className="relative w-full h-4 rounded-full bg-bgSecondary overflow-hidden border border-borderColor">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${porcentajeCred}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-green-500 to-blue-500"
          />
        </div>
        <div className="mt-2 text-right text-sm text-textSecondary">
          {porcentajeCred}%
        </div>
      </motion.div>
    </div>
  );
}
