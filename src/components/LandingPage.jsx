import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookMarked,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Filter,
  GraduationCap,
  LayoutGrid,
  Menu,
  Network,
  NotebookPen,
  Shield,
  X,
  AlertTriangle,
  Download,
  Clock,
} from "lucide-react";

const NAV_LINKS = [
  { href: "#funciones", label: "Funciones" },
  { href: "#toma-de-ramos", label: "Toma de ramos" },
  { href: "#notas", label: "Notas" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#preguntas", label: "Preguntas" },
];

const HERO_TABS = [
  { id: "toma", label: "Toma de ramos" },
  { id: "malla", label: "Mi malla" },
  { id: "notas", label: "Notas" },
];

const FAQ_ITEMS = [
  {
    q: "¿Malla Pro es oficial de la UNAB?",
    a: "No. Malla Pro es una herramienta independiente creada para ayudar a estudiantes a organizar su semestre.",
  },
  {
    q: "¿Qué pasa con el PDF que cargo?",
    a: "La programación se procesa directamente en tu dispositivo y el archivo no se envía a un servidor.",
  },
  {
    q: "¿Los cupos están actualizados en tiempo real?",
    a: "No. Se muestran los cupos informados en la programación académica que cargaste. Estos pueden cambiar durante la toma de ramos.",
  },
  {
    q: "¿Malla Pro inscribe mis ramos?",
    a: "No. Malla Pro te ayuda a preparar tu propuesta. La inscripción se realiza en las plataformas oficiales de la universidad.",
  },
  {
    q: "¿Puedo cambiar una sección?",
    a: "Sí. Puedes probar distintas secciones y ver cómo cambia tu horario.",
  },
  {
    q: "¿Qué pasa si tengo un tope?",
    a: "Malla Pro marca el conflicto para que puedas cambiar una de las secciones.",
  },
  {
    q: "¿Puedo usar Malla Pro desde el teléfono?",
    a: "Sí. La malla, las notas y la toma de ramos están adaptadas a pantallas pequeñas, con navegación pensada para móvil.",
  },
];

function hasSelectedMalla() {
  try {
    const raw = localStorage.getItem("malla-seleccionada");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed && (parsed.url || parsed.nombre));
  } catch {
    return false;
  }
}

function scrollToId(id) {
  const el = document.getElementById(id.replace(/^#/, ""));
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── Product mockups (UI estática fiel al producto) ───────────── */

function MockBrowser({ activeTab, onTabChange, children }) {
  return (
    <div className="lp-browser lp-glass-strong w-full rounded-2xl overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 border-b border-white/10 bg-black/25">
        <span className="hidden sm:flex gap-1.5 shrink-0" aria-hidden>
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
        </span>
        <div className="flex-1 flex justify-center gap-1 min-w-0">
          {HERO_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`flex-1 sm:flex-none px-1.5 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-colors text-center leading-tight ${
                activeTab === t.id
                  ? "bg-sky-400/20 text-sky-300"
                  : "text-white/55 hover:text-white/90"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative aspect-[10/11] sm:aspect-[16/9] bg-[#0D1117]/80 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function MockTomaDeRamos() {
  const courses = [
    { name: "Práctica II", sec: 300, sel: true },
    { name: "Proyecto de Título", sec: 301, sel: false },
    { name: "Ciberseguridad", sec: 302, sel: false },
    { name: "Sem. Licenciatura", sec: 303, sel: false },
  ];
  const days = [
    { d: "LU", label: "Sec. 300", time: "8:30", tone: "blue", h: "38%" },
    { d: "MA", label: "Sec. 301", time: "10:00", tone: "green", h: "38%", top: "22%" },
    { d: "MI", label: "Sec. 302", time: "8:30", tone: "blue", h: "38%" },
    { d: "JU", label: "Sec. 303", time: "10:00", tone: "green", h: "38%", top: "22%" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col sm:flex-row select-none min-h-0">
      {/* Lista de ramos: chips en móvil, panel en desktop */}
      <div className="sm:w-[40%] border-b sm:border-b-0 sm:border-r border-[var(--borderColor)] p-2.5 sm:p-4 flex flex-col gap-2 bg-[var(--bgSecondary)] min-w-0 shrink-0 sm:shrink sm:min-h-0 sm:h-full">
        <div className="flex items-center justify-between gap-2 shrink-0">
          <span className="font-bold text-[var(--textPrimary)] uppercase tracking-wide text-[10px] sm:text-xs">
            Tus asignaturas
          </span>
          <span className="text-[var(--primary)] font-extrabold text-[10px] sm:text-xs shrink-0">
            4 de 4
          </span>
        </div>
        <div className="flex sm:flex-col gap-1.5 sm:gap-2 overflow-x-auto sm:overflow-hidden sm:flex-1 sm:min-h-0 pb-0.5 sm:pb-0">
          {courses.map((c) => (
            <div
              key={c.name}
              className={`rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2.5 min-w-[9.5rem] sm:min-w-0 shrink-0 sm:shrink ${
                c.sel
                  ? "border-[var(--primary)] bg-[var(--primaryMuted)]"
                  : "border-[var(--borderColor)] bg-[var(--bgPrimary)]"
              }`}
            >
              <p className="font-bold text-[11px] sm:text-[13px] text-[var(--textPrimary)] truncate leading-tight">
                {c.name}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[var(--textSecondary)] flex items-center gap-1 mt-0.5 sm:mt-1">
                {c.sel && <CheckCircle2 className="w-3 h-3 text-[var(--primary)] shrink-0" />}
                <span className="truncate">Sec. {c.sec}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 p-2.5 sm:p-4 flex flex-col gap-2 sm:gap-2.5 min-w-0 min-h-0">
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <p className="font-black text-[var(--textPrimary)] uppercase tracking-wider text-[10px] sm:text-xs">
              Tu horario
            </p>
            <p className="text-[10px] sm:text-xs text-[var(--textSecondary)] mt-0.5">
              4 ramos · Sin topes
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--borderColor)] text-[var(--textSecondary)] font-bold text-[10px] sm:text-[11px] shrink-0">
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </span>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-4 gap-1 sm:gap-2">
          {days.map((day) => (
            <div
              key={day.d}
              className="relative rounded-lg border border-[var(--borderColor)] bg-[var(--bgSecondary)] p-1 sm:p-1.5 flex flex-col min-h-0 min-w-0"
            >
              <span className="text-center font-extrabold text-[var(--textSecondary)] text-[9px] sm:text-[11px] mb-1 shrink-0">
                {day.d}
              </span>
              <div className="relative flex-1 min-h-0">
                <div
                  className={`absolute left-0 right-0 rounded-md px-0.5 sm:px-1 py-1 sm:py-1.5 overflow-hidden ${
                    day.tone === "blue"
                      ? "bg-[var(--primaryMuted)] border border-[var(--primary)]/40"
                      : "bg-emerald-500/10 border border-emerald-500/35"
                  }`}
                  style={{ top: day.top || "8%", height: day.h }}
                >
                  <p
                    className={`font-bold text-[9px] sm:text-[11px] leading-tight truncate ${
                      day.tone === "blue" ? "text-[var(--primary)]" : "text-emerald-400"
                    }`}
                  >
                    {day.label}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-[var(--textSecondary)] mt-0.5 truncate">
                    {day.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockMalla() {
  const cls = {
    ok: "border-emerald-500/45 bg-emerald-500/10",
    sel: "border-sky-400/80 bg-sky-400/10 ring-1 ring-sky-400/40",
    pre: "border-amber-500/55 bg-amber-500/10",
    un: "border-emerald-500/40 bg-emerald-500/5",
  };
  const labelCls = {
    ok: "text-emerald-400",
    sel: "text-sky-300",
    pre: "text-amber-400",
    un: "text-emerald-400/90",
  };
  const label = { ok: "Aprobada", sel: "Seleccionada", pre: "Prerrequisito", un: "Desbloquea" };

  const Card = ({ name, st }) => (
    <div className={`relative h-full rounded-xl border px-2 py-2 sm:px-3 sm:py-3 min-w-0 ${cls[st]}`}>
      <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 text-[8px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-md border border-white/10 bg-black/30 text-white/60 inline-flex items-center gap-0.5">
        <Network className="w-2.5 h-2.5 hidden sm:block" />
        PR
      </span>
      <p className="text-[11px] sm:text-[13px] font-bold text-white pr-7 sm:pr-10 leading-snug break-words">
        {name}
      </p>
      <p className={`text-[10px] sm:text-[11px] mt-1 sm:mt-1.5 font-semibold ${labelCls[st]}`}>
        {label[st]}
      </p>
    </div>
  );

  const Conn = ({ from }) => (
    <div className="hidden sm:flex items-center self-center w-5 sm:w-7 shrink-0" aria-hidden>
      <div
        className={`h-[2px] flex-1 rounded-full ${
          from === "sel"
            ? "bg-gradient-to-r from-sky-400 to-emerald-400"
            : "bg-gradient-to-r from-amber-400 to-emerald-400"
        }`}
      />
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 -ml-0.5 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
    </div>
  );

  return (
    <div className="absolute inset-0 p-2.5 sm:p-5 select-none overflow-hidden">
      <div className="grid grid-cols-3 sm:grid-cols-[1fr_1fr_auto_1fr] gap-x-1.5 sm:gap-x-2 gap-y-2 h-full content-start">
        <p className="text-[10px] sm:text-xs font-bold text-white/50 uppercase tracking-wider">Sem. 1</p>
        <p className="text-[10px] sm:text-xs font-bold text-white/50 uppercase tracking-wider">Sem. 2</p>
        <span className="hidden sm:block" aria-hidden />
        <p className="text-[10px] sm:text-xs font-bold text-white/50 uppercase tracking-wider">Sem. 3</p>

        <Card name="Cálculo I" st="ok" />
        <Card name="Intro Prog." st="sel" />
        <Conn from="sel" />
        <Card name="Estructura" st="un" />

        <Card name="Álgebra" st="ok" />
        <Card name="Física" st="pre" />
        <Conn from="pre" />
        <Card name="Base Datos" st="un" />
      </div>
    </div>
  );
}

function MockNotas() {
  return (
    <div className="absolute inset-0 p-2.5 sm:p-5 flex items-center justify-center select-none overflow-hidden">
      <div className="w-full max-w-md h-full max-h-full rounded-xl border border-[var(--borderColor)] bg-[var(--bgSecondary)] p-2.5 sm:p-5 flex flex-col min-h-0 gap-1.5 sm:gap-3">
        <div className="shrink-0">
          <p className="text-[13px] sm:text-sm font-black text-[var(--textPrimary)] leading-tight">
            Cálculo II
          </p>
          <p className="text-[10px] sm:text-xs text-[var(--textSecondary)] mt-0.5">
            MAT210 · Evaluaciones
          </p>
        </div>

        <div className="flex-1 min-h-0 flex flex-col justify-evenly gap-0.5">
          {[
            ["Solemne 1", "30%", "5.4"],
            ["Solemne 2", "30%", "—"],
            ["Controles", "20%", "5.8"],
            ["Examen", "20%", "—"],
          ].map(([n, p, v]) => (
            <div
              key={n}
              className="flex items-center justify-between gap-2 text-[11px] sm:text-[13px] border-b border-[var(--borderColor)] py-1 sm:py-1.5 last:border-0"
            >
              <span className="text-[var(--textPrimary)] font-semibold truncate min-w-0">{n}</span>
              <span className="text-[var(--textSecondary)] shrink-0">{p}</span>
              <span className="font-bold text-[var(--textPrimary)] w-7 sm:w-8 text-right shrink-0">
                {v}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1 sm:gap-2 shrink-0">
          {[
            ["Promedio", "5.6"],
            ["Próxima nota", "4.8"],
            ["Eximición", "Cerca"],
          ].map(([l, v]) => (
            <div
              key={l}
              className="rounded-lg bg-[var(--bgPrimary)] border border-[var(--borderColor)] px-1.5 py-1.5 sm:p-2.5 text-center min-w-0"
            >
              <p className="text-[8px] sm:text-[11px] text-[var(--textSecondary)] font-semibold leading-tight">
                {l}
              </p>
              <p className="mt-0.5 sm:mt-1 text-[13px] sm:text-lg font-black text-[var(--primary)] leading-none">
                {v}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturePoint({ children }) {
  return (
    <li className="flex items-start gap-2 text-sm text-[var(--textSecondary)]">
      <Check className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" strokeWidth={2.5} />
      <span className="leading-snug text-[var(--textPrimary)]/90">{children}</span>
    </li>
  );
}

function FaqItem({ item, open, onToggle }) {
  const panelId = useId();
  const btnId = useId();
  return (
    <div className="rounded-xl lp-glass overflow-hidden">
      <h3 className="m-0">
        <button
          type="button"
          id={btnId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-3 text-left px-4 py-3.5 min-h-[44px] text-sm font-semibold text-[var(--textPrimary)] hover:bg-white/[0.02] transition-colors"
        >
          {item.q}
          <ChevronDown
            className={`w-4 h-4 shrink-0 text-[var(--textSecondary)] transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-sm text-[var(--textSecondary)] leading-relaxed">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Landing ─────────────────────────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef(null);
  const [hasMalla, setHasMalla] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroTab, setHeroTab] = useState("toma");
  const [heroPaused, setHeroPaused] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);
  const menuBtnRef = useRef(null);
  const menuPanelRef = useRef(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    setHasMalla(hasSelectedMalla());
  }, []);

  // Fondo animado de nodos (plexus) — se pausa con reduced motion
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let rafId = 0;
    let running = true;

    const nodes = [];
    const nodeCount = reduceMotion ? 28 : 56;
    const maxDistance = 130;

    class Node {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = reduceMotion ? 0 : (Math.random() - 0.5) * 0.45;
        this.vy = reduceMotion ? 0 : (Math.random() - 0.5) * 0.45;
        this.radius = Math.random() * 1.8 + 0.8;
      }
      update() {
        if (reduceMotion) return;
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(147, 197, 253, 0.75)";
        ctx.fill();
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (nodes.length === 0) {
        for (let i = 0; i < nodeCount; i++) nodes.push(new Node());
      } else {
        nodes.forEach((n) => {
          n.x = Math.min(Math.max(n.x, 0), width);
          n.y = Math.min(Math.max(n.y, 0), height);
        });
      }
    };

    const paint = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#050b2b");
      gradient.addColorStop(0.45, "#0c1238");
      gradient.addColorStop(0.7, "#150b45");
      gradient.addColorStop(1, "#050b2b");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      nodes.forEach((node) => {
        node.update();
        node.draw();
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.32;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(96, 165, 250, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      if (!reduceMotion) {
        rafId = requestAnimationFrame(paint);
      }
    };

    resize();
    paint();

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        if (reduceMotion) paint();
      }, 120);
    };
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (heroPaused || reduceMotion) return;
    const id = window.setInterval(() => {
      setHeroTab((prev) => {
        const idx = HERO_TABS.findIndex((t) => t.id === prev);
        return HERO_TABS[(idx + 1) % HERO_TABS.length].id;
      });
    }, 6500);
    return () => window.clearInterval(id);
  }, [heroPaused, reduceMotion]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const first = menuPanelRef.current?.querySelector("a, button");
    first?.focus?.();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      menuBtnRef.current?.focus?.();
    };
  }, [menuOpen]);

  const openApp = useCallback(() => {
    navigate("/app");
  }, [navigate]);

  const primaryLabel = hasMalla ? "Continuar en mi malla" : "Abrir Malla Pro";

  const onHeroTabChange = (id) => {
    setHeroPaused(true);
    setHeroTab(id);
  };

  const onNavClick = (e, href) => {
    e.preventDefault();
    setMenuOpen(false);
    scrollToId(href);
  };

  return (
    <div className="aurora dark lp-root">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 min-h-screen text-white overflow-x-hidden">
        {/* 1. Navbar */}
        <header className="sticky top-0 z-50 lp-glass-nav">
          <div className="lp-container h-16 sm:h-[68px] flex items-center justify-between gap-3">
            <a href="#inicio" className="flex items-center gap-2.5 min-w-0 shrink-0" onClick={(e) => onNavClick(e, "#inicio")}>
              <img src="/favicon.png" alt="" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-[15px] tracking-tight text-white">Malla Pro</span>
            </a>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Secciones">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => onNavClick(e, l.href)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white/65 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-2">
              {!hasMalla && (
                <button
                  type="button"
                  onClick={openApp}
                  className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white/80 border border-white/15 hover:text-white hover:bg-white/[0.06] transition-colors min-h-[44px] lp-glass-chip"
                >
                  Ver mi malla
                </button>
              )}
              <button
                type="button"
                onClick={openApp}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-sky-500 hover:bg-sky-400 transition min-h-[44px] shadow-[0_0_24px_rgba(56,189,248,0.28)] max-w-[220px] truncate"
              >
                {primaryLabel}
              </button>
            </div>

            <button
              ref={menuBtnRef}
              type="button"
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-white/15 text-white lp-glass-chip"
              aria-expanded={menuOpen}
              aria-controls="lp-mobile-menu"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                id="lp-mobile-menu"
                ref={menuPanelRef}
                initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden border-t border-white/10 lp-glass-strong overflow-hidden"
              >
                <div className="lp-container py-3 flex flex-col gap-1">
                  {NAV_LINKS.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={(e) => onNavClick(e, l.href)}
                      className="px-3 py-3 rounded-lg text-sm font-semibold text-white min-h-[44px] flex items-center"
                    >
                      {l.label}
                    </a>
                  ))}
                  <div className="flex flex-col gap-2 pt-2 pb-1">
                    {!hasMalla && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          openApp();
                        }}
                        className="w-full min-h-[44px] rounded-lg border border-white/15 text-sm font-semibold text-white"
                      >
                        Ver mi malla
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        openApp();
                      }}
                      className="w-full min-h-[44px] rounded-lg bg-sky-500 text-white text-sm font-bold"
                    >
                      {primaryLabel}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* 2. Hero */}
        <section id="inicio" className="lp-container pt-10 sm:pt-14 pb-12 sm:pb-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/55 mb-4">
                <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                Hecho para estudiantes UNAB
              </p>
              <h1 className="text-[1.65rem] sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.15] text-white">
                <span className="block">Malla Pro</span>
                <span className="block mt-2 font-semibold text-white/95 text-[1.15rem] sm:text-[inherit] leading-snug">
                  Tu malla, tus notas y tu toma de ramos.{" "}
                  <span className="text-sky-400">Todo en un solo lugar.</span>
                </span>
              </h1>
              <p className="mt-5 text-[15px] sm:text-base text-indigo-100/75 leading-relaxed max-w-md">
                Revisa tu avance, entiende tus prerrequisitos, carga la programación académica y arma
                tu horario sin tener que buscar ramo por ramo en el PDF.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={openApp}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-sky-500 text-white font-bold text-sm hover:bg-sky-400 transition shadow-[0_8px_28px_rgba(56,189,248,0.3)] text-center"
                >
                  <span className="truncate">{primaryLabel}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <a
                  href="#como-funciona"
                  onClick={(e) => onNavClick(e, "#como-funciona")}
                  className="inline-flex items-center justify-center min-h-[48px] px-5 rounded-xl text-sm font-semibold text-white lp-glass-chip hover:bg-white/[0.08] transition text-center"
                >
                  Ver cómo funciona
                </a>
              </div>
              <p className="mt-4 text-xs font-medium text-white/50">
                De estudiantes para estudiantes.
              </p>
              <ul className="mt-6 flex flex-col gap-2 text-[13px] text-white/65">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Pensado para carreras UNAB.
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Tu avance queda guardado localmente.
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  La programación se procesa en tu dispositivo.
                </li>
              </ul>
            </div>

            <div
              className="min-w-0"
              onPointerDown={() => setHeroPaused(true)}
              onFocusCapture={() => setHeroPaused(true)}
            >
              <MockBrowser activeTab={heroTab} onTabChange={onHeroTabChange}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={heroTab}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0"
                  >
                    {heroTab === "toma" && <MockTomaDeRamos />}
                    {heroTab === "malla" && <MockMalla />}
                    {heroTab === "notas" && <MockNotas />}
                  </motion.div>
                </AnimatePresence>
              </MockBrowser>
            </div>
          </div>
        </section>

        {/* 3. Benefits bar */}
        <section className="lp-container py-2 sm:py-3">
          <div className="lp-glass rounded-2xl px-4 py-6 sm:px-8 sm:py-7">
            <p className="text-center text-sm sm:text-[15px] font-medium text-white/90 max-w-2xl mx-auto leading-snug">
              Menos tiempo buscando entre PDFs y más claridad para organizar tu semestre.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[12px] font-semibold text-white/60">
              {[
                [LayoutGrid, "Tu avance"],
                [NotebookPen, "Tus notas"],
                [Filter, "Tus secciones"],
                [CalendarRange, "Tu horario"],
              ].map(([Icon, label]) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-sky-400" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Demo principal */}
        <section id="funciones" className="lp-container py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Tu avance y tu horario, conectados
            </h2>
            <p className="mt-3 text-[var(--textSecondary)] leading-relaxed">
              Malla Pro revisa lo que tienes registrado en tu malla, ordena primero los ramos que te
              corresponden y te deja comparar sus secciones antes de armar tu horario.
            </p>
          </div>
          <div className="mt-8 relative rounded-2xl lp-glass-strong overflow-hidden">
            <div className="aspect-[5/4] sm:aspect-[16/9] relative max-h-[480px] mx-auto">
              <MockTomaDeRamos />
            </div>
            <div className="flex flex-wrap gap-2 p-3 sm:p-4 border-t border-[var(--borderColor)] bg-[var(--bgPrimary)]/50">
              {["Tus ramos", "Secciones", "Horario", "Topes", "Exportación"].map((c) => (
                <span
                  key={c}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-[var(--borderColor)] text-[var(--textSecondary)]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <ol className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-[12px] sm:text-[11px] font-semibold text-[var(--textSecondary)]">
            {[
              "Avance registrado",
              "Programación cargada",
              "Ramos recomendados",
              "Secciones disponibles",
              "Horario construido",
            ].map((s, i) => (
              <li key={s} className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-[var(--primaryMuted)] text-[var(--primary)] flex items-center justify-center text-[10px] font-black shrink-0">
                  {i + 1}
                </span>
                <span className="leading-snug">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* 5. Malla */}
        <section id="malla" className="lp-container py-14 sm:py-16 border-t border-[var(--borderColor)]">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Entiende tu malla sin enredarte
              </h2>
              <p className="mt-3 text-[var(--textSecondary)] leading-relaxed">
                Marca los ramos que aprobaste o estás cursando y revisa cómo va tu avance por semestre.
              </p>
              <p className="mt-3 text-[var(--textSecondary)] leading-relaxed">
                Selecciona un ramo para ver qué prerrequisitos necesita y cuáles desbloquea.
              </p>
              <ul className="mt-6 space-y-2.5">
                <FeaturePoint>Pendiente, cursando y aprobado</FeaturePoint>
                <FeaturePoint>Progreso por semestre</FeaturePoint>
                <FeaturePoint>Inspector PR con conexiones</FeaturePoint>
                <FeaturePoint>Modo excepcional y ocultar completados</FeaturePoint>
              </ul>
            </div>
            <div className="rounded-2xl lp-glass-strong overflow-hidden aspect-[5/4] sm:aspect-[5/4] relative max-h-[380px]">
              <MockMalla />
            </div>
          </div>
        </section>

        {/* 6. Toma de ramos */}
        <section
          id="toma-de-ramos"
          className="lp-container py-14 sm:py-16 border-t border-[var(--borderColor)]"
        >
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1 rounded-2xl lp-glass-strong overflow-hidden relative min-h-0">
              <div className="p-4 sm:p-5 select-none">
                <p className="font-black text-[var(--textPrimary)] text-sm mb-3">Ciberseguridad</p>
                {[
                  { sec: "300", sel: true, h: "LU 8:30 · VI 10:00", p: "Prof. Rivas · Presencial" },
                  { sec: "301", sel: false, h: "MA 14:00 · JU 14:00", p: "Prof. Soto · Online" },
                  { sec: "302", sel: false, h: "MI 8:30 · VI 8:30", p: "Prof. Núñez · Presencial" },
                ].map((s) => (
                  <div
                    key={s.sec}
                    className={`mb-2.5 last:mb-0 rounded-xl border p-3 ${
                      s.sel
                        ? "border-[var(--primary)] bg-[var(--primaryMuted)]"
                        : "border-[var(--borderColor)] bg-[var(--bgPrimary)]"
                    }`}
                  >
                    <div className="flex justify-between gap-2 font-bold text-[13px] text-[var(--textPrimary)]">
                      <span className="min-w-0 truncate">Sección {s.sec}</span>
                      <span className="text-[var(--textSecondary)] font-semibold shrink-0">NRC 12{s.sec}</span>
                    </div>
                    <p className="text-xs text-[var(--textSecondary)] mt-1.5">{s.h}</p>
                    <p className="text-xs text-[var(--textSecondary)] mt-0.5 leading-snug">
                      {s.p} · Cupos 28
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--primary)] mb-2">
                Toma de ramos
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Encuentra las secciones que realmente te sirven
              </h2>
              <p className="mt-3 text-[var(--textSecondary)] leading-relaxed">
                Carga la programación académica y Malla Pro te muestra primero los ramos que
                corresponden a tu avance, junto con tus pendientes de semestres anteriores.
              </p>
              <p className="mt-3 text-[var(--textSecondary)] leading-relaxed">
                Revisa horarios, profesor, modalidad, NRC y cupos informados sin recorrer todo el PDF.
              </p>
              <ul className="mt-6 space-y-2.5">
                <FeaturePoint>Carga de PDF y procesamiento local</FeaturePoint>
                <FeaturePoint>Semestre principal y pendientes anteriores</FeaturePoint>
                <FeaturePoint>Secciones agrupadas con NRC y modalidad</FeaturePoint>
                <FeaturePoint>Búsqueda y filtros</FeaturePoint>
              </ul>
            </div>
          </div>
        </section>

        {/* 7. Horario */}
        <section id="horario" className="lp-container py-14 sm:py-16 border-t border-[var(--borderColor)]">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Arma tu horario antes de la toma
              </h2>
              <p className="mt-3 text-[var(--textSecondary)] leading-relaxed">
                Elige una sección por ramo y mira al instante cómo queda tu semana de lunes a sábado.
              </p>
              <p className="mt-3 text-[var(--textSecondary)] leading-relaxed">
                Si dos clases se cruzan, Malla Pro te marca el tope para que puedas probar otra sección.
              </p>
              <ul className="mt-6 space-y-2.5">
                <FeaturePoint>Módulos UNAB y clases de varios bloques</FeaturePoint>
                <FeaturePoint>Detección de topes</FeaturePoint>
                <FeaturePoint>Guardar propuesta y exportar PDF</FeaturePoint>
                <FeaturePoint>Resumen de NRC y créditos</FeaturePoint>
              </ul>
            </div>
            <div className="rounded-2xl lp-glass-strong p-3 sm:p-4 select-none min-w-0">
              <div className="flex items-center justify-between mb-3 gap-2">
                <span className="text-xs font-black uppercase tracking-wider">Semana</span>
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sin topes
                </span>
              </div>
              <div className="overflow-x-auto -mx-0.5 px-0.5">
                <div className="grid grid-cols-6 gap-1.5 text-[11px] min-w-[22rem] sm:min-w-0">
                  {[
                    { d: "LU", block: { t: "Ramo 1", h: "8:30", c: "blue" } },
                    { d: "MA", block: { t: "Ramo 2", h: "10:00", c: "green" } },
                    { d: "MI", block: { t: "Tope", h: "8:30", c: "amber" } },
                    { d: "JU", block: { t: "Ramo 3", h: "10:00", c: "blue" } },
                    { d: "VI", block: null },
                    { d: "SA", block: null },
                  ].map(({ d, block }) => (
                    <div
                      key={d}
                      className="rounded-lg border border-[var(--borderColor)] bg-[var(--bgPrimary)] min-h-[100px] p-1.5 flex flex-col min-w-0"
                    >
                      <p className="text-center font-extrabold text-[var(--textSecondary)] text-[10px] mb-1.5">
                        {d}
                      </p>
                      {block && (
                        <div
                          className={`rounded-md p-1.5 mt-1 overflow-hidden ${
                            block.c === "amber"
                              ? "bg-amber-500/15 border border-amber-500/40"
                              : block.c === "green"
                                ? "bg-emerald-500/10 border border-emerald-500/35"
                                : "bg-[var(--primaryMuted)] border border-[var(--primary)]/35"
                          }`}
                        >
                          <p className="font-bold text-[var(--textPrimary)] text-[10px] leading-tight truncate">
                            {block.t}
                          </p>
                          <p className="text-[var(--textSecondary)] text-[10px] mt-0.5">{block.h}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--textSecondary)] font-semibold">
                <span>4 ramos · 16 créditos</span>
                <span className="inline-flex items-center gap-1 text-[var(--textPrimary)]">
                  <Download className="w-3.5 h-3.5" /> Exportar PDF
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Notas */}
        <section id="notas" className="lp-container py-14 sm:py-16 border-t border-[var(--borderColor)]">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Calcula la nota que necesitas
              </h2>
              <p className="mt-3 text-[var(--textSecondary)] leading-relaxed max-w-lg">
                Agrega tus evaluaciones, revisa tu promedio y prueba distintos resultados antes de la
                próxima prueba.
              </p>
              <button
                type="button"
                onClick={openApp}
                className="mt-6 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-[var(--borderColor)] text-sm font-bold hover:bg-white/[0.03] transition"
              >
                Calcular mis notas
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {[
                ["Promedio actual", "5.6"],
                ["Próxima nota necesaria", "4.8"],
                ["Eximición", "Cerca"],
              ].map(([l, v]) => (
                <div
                  key={l}
                  className="rounded-xl lp-glass p-3 sm:p-4 text-center"
                >
                  <p className="text-[11px] sm:text-xs font-semibold text-[var(--textSecondary)] leading-snug">
                    {l}
                  </p>
                  <p className="mt-1.5 text-xl sm:text-2xl font-black text-[var(--primary)]">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. Cómo funciona */}
        <section id="como-funciona" className="lp-container py-14 sm:py-20 border-t border-[var(--borderColor)]">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">Así de simple</h2>
          <div className="mt-10 relative max-w-3xl mx-auto">
            <div
              className="hidden sm:block absolute top-5 left-[16%] right-[16%] h-px bg-[var(--borderColor)]"
              aria-hidden
            />
            <div
              className="sm:hidden absolute left-5 top-6 bottom-6 w-px bg-[var(--borderColor)]"
              aria-hidden
            />
            <ol className="grid sm:grid-cols-3 gap-8 sm:gap-6">
              {[
                {
                  n: "1",
                  t: "Marca tu avance",
                  d: "Registra los ramos que aprobaste y los que estás cursando.",
                },
                {
                  n: "2",
                  t: "Carga la programación",
                  d: "Malla Pro organiza las secciones según los ramos que te corresponden.",
                },
                {
                  n: "3",
                  t: "Arma tu horario",
                  d: "Compara alternativas, revisa topes y guarda tu propuesta.",
                },
              ].map((s) => (
                <li key={s.n} className="relative flex sm:flex-col gap-4 sm:gap-3 sm:items-center sm:text-center pl-12 sm:pl-0">
                  <span className="absolute left-0 sm:static w-10 h-10 rounded-full bg-[var(--bgSecondary)] border border-[var(--borderColor)] flex items-center justify-center text-sm font-black text-[var(--primary)] z-[1]">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-bold text-[var(--textPrimary)]">{s.t}</h3>
                    <p className="mt-1 text-sm text-[var(--textSecondary)] leading-snug">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 10. Mosaico */}
        <section className="lp-container py-14 sm:py-16 border-t border-[var(--borderColor)]">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-xl">
            Todo lo que necesitas para organizar el semestre
          </h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-fr">
            {[
              {
                icon: Network,
                t: "Inspector de relaciones",
                d: "Selecciona un ramo y revisa sus prerrequisitos y lo que desbloquea.",
                span: "lg:col-span-2 lg:row-span-2",
              },
              {
                icon: BookMarked,
                t: "Estados académicos",
                d: "Marca tus ramos como pendientes, cursando o aprobados.",
                span: "",
              },
              {
                icon: LayoutGrid,
                t: "Ramos recomendados",
                d: "La programación se ordena según el avance que tienes registrado.",
                span: "",
              },
              {
                icon: AlertTriangle,
                t: "Pendientes anteriores",
                d: "Tus arrastres quedan separados para que no los pierdas de vista.",
                span: "",
              },
              {
                icon: Filter,
                t: "Comparación de secciones",
                d: "Revisa horarios, profesor, modalidad, NRC y cupos informados.",
                span: "lg:col-span-2",
              },
              {
                icon: Clock,
                t: "Detección de topes",
                d: "Encuentra cruces antes de guardar tu propuesta.",
                span: "",
              },
              {
                icon: FileText,
                t: "Exportación PDF",
                d: "Lleva tu horario junto con los NRC y créditos que necesitas.",
                span: "",
              },
              {
                icon: NotebookPen,
                t: "Calculadora de notas",
                d: "Revisa tu promedio y calcula la nota que te falta.",
                span: "sm:col-span-2 lg:col-span-2",
              },
            ].map((card) => (
              <article
                key={card.t}
                className={`rounded-2xl lp-glass p-4 sm:p-5 ${card.span}`}
              >
                <card.icon className="w-5 h-5 text-[var(--primary)] mb-3" />
                <h3 className="font-bold text-[var(--textPrimary)] text-[15px] leading-snug">
                  {card.t}
                </h3>
                <p className="mt-1.5 text-sm text-[var(--textSecondary)] leading-snug line-clamp-3">
                  {card.d}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 11. Privacidad */}
        <section id="privacidad" className="lp-container py-14 sm:py-16 border-t border-[var(--borderColor)]">
          <div className="rounded-2xl lp-glass-strong p-6 sm:p-10">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-[var(--primary)] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h2 className="text-2xl font-bold tracking-tight">Tu información queda contigo</h2>
                <p className="mt-2 text-[var(--textSecondary)] leading-relaxed max-w-2xl">
                  El PDF se procesa directamente en tu dispositivo y tu avance se guarda localmente
                  para que puedas continuar después.
                </p>
              </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-sm font-semibold">
              {["PDF", "Tu navegador", "Malla Pro"].map((step, i) => (
                <div key={step} className="contents">
                  <div className="flex-1 rounded-xl border border-[var(--borderColor)] bg-[var(--bgPrimary)] px-4 py-3 text-center text-[var(--textPrimary)]">
                    {step}
                  </div>
                  {i < 2 && (
                    <>
                      <span className="hidden sm:flex items-center justify-center text-[var(--textSecondary)] px-1" aria-hidden>
                        →
                      </span>
                      <span className="sm:hidden flex items-center justify-center text-[var(--textSecondary)] text-xs py-0.5" aria-hidden>
                        ↓
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <ul className="mt-6 grid sm:grid-cols-2 gap-2 text-sm text-[var(--textSecondary)]">
              <FeaturePoint>La programación no se envía a un servidor</FeaturePoint>
              <FeaturePoint>Tu avance queda en tu navegador</FeaturePoint>
              <FeaturePoint>No se comparte información académica con terceros</FeaturePoint>
              <FeaturePoint>Puedes borrar tus datos locales desde el navegador</FeaturePoint>
            </ul>
          </div>
        </section>

        {/* 12. FAQ */}
        <section id="preguntas" className="lp-container py-14 sm:py-16 border-t border-[var(--borderColor)]">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Preguntas frecuentes</h2>
          <div className="max-w-2xl space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem
                key={item.q}
                item={item}
                open={faqOpen === i}
                onToggle={() => setFaqOpen((prev) => (prev === i ? -1 : i))}
              />
            ))}
          </div>
        </section>

        {/* 13. CTA final */}
        <section className="lp-container py-16 sm:py-24 border-t border-[var(--borderColor)]">
          <div className="rounded-3xl lp-glass-strong lp-glass-glow px-6 py-12 sm:px-12 sm:py-16 text-center relative overflow-hidden">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight max-w-xl mx-auto leading-tight">
              Organiza tu próximo semestre con menos vueltas.
            </h2>
            <p className="mt-3 text-[var(--textSecondary)] max-w-md mx-auto">
              Revisa tus ramos, compara secciones y arma tu horario desde un solo lugar.
            </p>
            <button
              type="button"
              onClick={openApp}
              className="mt-8 inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl bg-[var(--primary)] text-white font-bold text-sm hover:brightness-110 transition"
            >
              {primaryLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="mt-4 text-xs font-medium text-[var(--textSecondary)]">
              De estudiantes para estudiantes.
            </p>
          </div>
        </section>

        {/* 14. Footer */}
        <footer className="border-t border-white/10 lp-glass-nav mt-4">
          <div className="lp-container py-10 sm:py-12">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2">
                  <img src="/favicon.png" alt="" width={28} height={28} className="w-7 h-7 rounded-md" />
                  <span className="font-bold">Malla Pro</span>
                </div>
                <p className="mt-3 text-sm text-[var(--textSecondary)] leading-relaxed max-w-xs">
                  Malla Pro te ayuda a organizar tu avance, tus notas y tu toma de ramos.
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--textSecondary)] mb-3">
                  Producto
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#malla" onClick={(e) => onNavClick(e, "#malla")} className="text-[var(--textPrimary)] hover:text-[var(--primary)]">
                      Malla
                    </a>
                  </li>
                  <li>
                    <a href="#notas" onClick={(e) => onNavClick(e, "#notas")} className="text-[var(--textPrimary)] hover:text-[var(--primary)]">
                      Notas
                    </a>
                  </li>
                  <li>
                    <a href="#toma-de-ramos" onClick={(e) => onNavClick(e, "#toma-de-ramos")} className="text-[var(--textPrimary)] hover:text-[var(--primary)]">
                      Toma de ramos
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--textSecondary)] mb-3">
                  Info
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#privacidad" onClick={(e) => onNavClick(e, "#privacidad")} className="text-[var(--textPrimary)] hover:text-[var(--primary)]">
                      Privacidad
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:contacto@mallapro.cl"
                      className="text-[var(--textPrimary)] hover:text-[var(--primary)]"
                    >
                      Contacto
                    </a>
                  </li>
                  <li>
                    <Link to="/app" className="text-[var(--textPrimary)] hover:text-[var(--primary)]">
                      Abrir app
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-10 pt-6 border-t border-[var(--borderColor)] space-y-2">
              <p className="text-[12px] text-[var(--textSecondary)] leading-relaxed max-w-2xl">
                Herramienta independiente. No corresponde a una plataforma oficial de la Universidad
                Andrés Bello.
              </p>
              <p className="text-[12px] text-[var(--textSecondary)]">
                © {year} Malla Pro · De estudiantes para estudiantes.
              </p>
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        .lp-root {
          font-family: Inter, system-ui, sans-serif;
          color: #E8EEF7;
          --textPrimary: #F1F5F9;
          --textSecondary: rgba(226, 232, 240, 0.7);
          --primary: #38bdf8;
          --primaryMuted: rgba(56, 189, 248, 0.14);
          --borderColor: rgba(255, 255, 255, 0.12);
          --bgPrimary: rgba(8, 12, 28, 0.72);
          --bgSecondary: rgba(16, 22, 44, 0.55);
        }
        .lp-root h1,
        .lp-root h2,
        .lp-root h3 {
          color: #fff;
        }
        .lp-container {
          max-width: 1280px;
          margin-inline: auto;
          padding-inline: 24px;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 640px) {
          .lp-container { padding-inline: 16px; }
        }

        /* Evita desbordes de mockups en pantallas muy angostas */
        .lp-root img,
        .lp-root svg {
          max-width: 100%;
        }
        .lp-browser,
        .lp-glass,
        .lp-glass-strong {
          max-width: 100%;
        }

        .lp-glass-nav {
          background: rgba(8, 12, 32, 0.55);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset;
        }
        .lp-glass {
          background: linear-gradient(
            155deg,
            rgba(255, 255, 255, 0.09) 0%,
            rgba(255, 255, 255, 0.04) 42%,
            rgba(14, 22, 48, 0.45) 100%
          );
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.08) inset,
            0 12px 40px rgba(0, 0, 0, 0.22);
        }
        .lp-glass-strong {
          background: linear-gradient(
            160deg,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(255, 255, 255, 0.05) 38%,
            rgba(10, 16, 36, 0.62) 100%
          );
          backdrop-filter: blur(22px) saturate(160%);
          -webkit-backdrop-filter: blur(22px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.1) inset,
            0 18px 50px rgba(0, 0, 0, 0.28);
        }
        .lp-glass-chip {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }
        .lp-glass-glow {
          position: relative;
        }
        .lp-glass-glow::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          pointer-events: none;
          background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(56, 189, 248, 0.18), transparent 60%);
        }
        .lp-browser {
          box-shadow:
            0 1px 0 rgba(255,255,255,0.12) inset,
            0 24px 64px rgba(0, 0, 0, 0.4);
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-root * { scroll-behavior: auto !important; }
          .lp-glass,
          .lp-glass-strong,
          .lp-glass-nav {
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
        }
      `}</style>
    </div>
  );
}
