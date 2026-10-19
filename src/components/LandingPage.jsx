import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, animate, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookMarked,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronDown,
  Filter,
  GraduationCap,
  LayoutGrid,
  Menu,
  MousePointer2,
  Moon,
  Sun,
  Network,
  NotebookPen,
  Shield,
  X,
  AlertTriangle,
  Download,
  Clock,
  Lock,
  Circle,
} from "lucide-react";
import { SimMalla, SimNotas, SimToma, SimHorario } from "./FeatureSims";

const NAV_LINKS = [
  { href: "#funciones", label: "Funciones" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#privacidad", label: "Privacidad" },
  { href: "#preguntas", label: "Preguntas" },
];

const FAQ_ITEMS = [
  {
    q: "¿Malla Pro es oficial de la UNAB?",
    a: "No. Malla Pro es una herramienta independiente creada para ayudar a estudiantes a organizar su semestre.",
  },
  {
    q: "¿Sirve para cualquier modalidad?",
    a: "Por ahora, Malla Pro está enfocado exclusivamente en mallas de Pregrado Diurno. Vespertino, online, Advance, postgrado u otras modalidades no están cubiertas salvo que se indique.",
  },
  {
    q: "¿Qué pasa con el PDF que cargo?",
    a: "Se procesa directamente en tu dispositivo. El archivo no se envía a un servidor.",
  },
  {
    q: "¿Los cupos están actualizados en tiempo real?",
    a: "No. Se muestran los cupos informados en la programación que cargaste. Pueden cambiar durante la toma de ramos.",
  },
  {
    q: "¿Malla Pro inscribe mis ramos?",
    a: "No. Te ayuda a preparar tu propuesta. La inscripción se hace en las plataformas oficiales de la universidad.",
  },
  {
    q: "¿Puedo usar Malla Pro desde el teléfono?",
    a: "Sí. La malla, las notas y la toma de ramos están adaptadas a pantallas pequeñas.",
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

function CountUpStat({ to = 100 }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const [value, setValue] = useState(reduceMotion ? to : 0);

  useEffect(() => {
    if (!isInView) return;
    if (reduceMotion) {
      setValue(to);
      return undefined;
    }
    const controls = animate(0, to, {
      duration: 1.35,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [isInView, to, reduceMotion]);

  return (
    <motion.span
      ref={ref}
      className="inline-block tabular-nums"
      animate={isInView && !reduceMotion ? { scale: [1, 1.12, 1] } : undefined}
      transition={{ duration: 1.35, times: [0, 0.55, 1], ease: "easeOut" }}
    >
      {value}
    </motion.span>
  );
}

/* ── Product mockups (UI estática fiel al producto) ───────────── */

const KICKER_BAND = {
  "Tu malla": "lp-band-green",
  "Toma de ramos": "lp-band-amber",
  Notas: "lp-band-pink",
};

function FeaturePoint({ children }) {
  return (
    <li className="flex items-start gap-2 text-sm text-[var(--textSecondary)]">
      <Check className="w-4 h-4 lp-check shrink-0 mt-0.5" strokeWidth={2.5} />
      <span className="leading-snug text-[var(--textPrimary)]/90">{children}</span>
    </li>
  );
}

const FEATURES = [
  {
    id: "malla",
    band: "lp-band-green",
    title: "Tu avance, a la vista",
    desc: "Marca tus ramos como pendientes, cursando o aprobados y mira qué desbloquea cada uno.",
    points: ["Prerrequisitos con conexiones", "Progreso por semestre", "Modo excepcional y ocultar completados"],
  },
  {
    id: "notas",
    band: "lp-band-pink",
    title: "Calcula la nota que necesitas",
    desc: "Agrega tus evaluaciones y revisa qué promedio te falta para eximirte.",
    points: ["Nota necesaria para eximirte", "Modo examen si no alcanzas", "Sub-notas y configuración compartible"],
  },
  {
    id: "toma-de-ramos",
    band: "lp-band-amber",
    title: "Encuentra las secciones que te sirven",
    desc: "Carga la programación y verás primero los ramos que te corresponden, junto con tus pendientes anteriores.",
    points: ["PDF procesado en tu dispositivo", "Secciones con NRC y modalidad", "Búsqueda y filtros"],
  },
  {
    id: "horario",
    band: "lp-band-blue",
    title: "Arma tu horario antes de la toma",
    desc: "Elige una sección por ramo y mira cómo queda tu semana. Si dos clases se cruzan, Malla Pro marca el tope.",
    points: ["Detección de topes", "Guardar propuesta y exportar PDF", "Resumen de NRC y créditos"],
  },
];

const STEPS = [
  { n: "1", band: "lp-band-green", t: "Marca tu avance", d: "Registra los ramos que aprobaste y los que estás cursando." },
  { n: "2", band: "lp-band-amber", t: "Carga la programación", d: "Malla Pro organiza las secciones según los ramos que te corresponden." },
  { n: "3", band: "lp-band-blue", t: "Arma tu horario", d: "Compara alternativas, revisa topes y guarda tu propuesta." },
];

function FeatureTile({ f, span = "", children }) {
  return (
    <article
      id={f.id}
      className={`lp-tint ${f.band} ${span} scroll-mt-24 rounded-3xl p-6 sm:p-8 flex flex-col gap-7 min-w-0`}
    >
      <div>
        <h3 className="text-2xl sm:text-[1.75rem] font-semibold leading-tight">{f.title}</h3>
        <p className="mt-3 text-[var(--textSecondary)] leading-relaxed max-w-[46ch]">{f.desc}</p>
        <ul className="mt-5 space-y-2.5">
          {f.points.map((pt) => (
            <FeaturePoint key={pt}>{pt}</FeaturePoint>
          ))}
        </ul>
      </div>
      <div className="min-w-0 mt-auto">{children}</div>
    </article>
  );
}

/* ── Landing ─────────────────────────────────────────────────── */

/* ---------- Hero interactivo: la herramienta funcionando ---------- */
const PLAY_COURSES = [
  { id: "prog", name: "Programación I", code: "TDFI102", pre: null },
  { id: "bd", name: "Base de Datos", code: "TDFI103", pre: "prog" },
  { id: "alg", name: "Algoritmos y Estructuras", code: "INF210", pre: "bd" },
  { id: "calc1", name: "Cálculo I", code: "MAT110", pre: null },
  { id: "calc2", name: "Cálculo II", code: "MAT210", pre: "calc1" },
  { id: "fis", name: "Física General", code: "FIS110", pre: "calc2" },
];

const PLAY_START = { prog: "ok", bd: "pend", alg: "pend", calc1: "cur", calc2: "pend", fis: "pend" };

function AnimatedPct({ value }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const controls = animate(fromRef.current, value, {
      duration: 0.55,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value]);
  return <span className="tabular-nums">{shown}%</span>;
}

function PlayCourse({ course, status, locked, shaking, pressed, onToggle, reduceMotion, setRef }) {
  const kind = locked ? "lock" : status;
  const look = {
    ok: {
      box: "bg-approved border-transparent",
      name: "text-paper",
      code: "text-paper/75",
      badge: "text-paper",
      ring: "text-approved",
      label: "Aprobada",
      Icon: CheckCircle2,
    },
    cur: {
      box: "bg-cursando border-transparent",
      name: "text-paper",
      code: "text-paper/75",
      badge: "text-paper",
      ring: "text-cursando",
      label: "Cursando",
      Icon: Circle,
    },
    pend: {
      box: "bg-[var(--bgSecondary)] border-ink/25",
      name: "text-ink",
      code: "text-[var(--textSecondary)]",
      badge: "text-ink",
      ring: "text-ink",
      label: "Disponible",
      Icon: null,
    },
    lock: {
      box: "border-dashed border-ink/25 bg-transparent",
      name: "text-[var(--textSecondary)]",
      code: "text-[var(--textSecondary)]/70",
      badge: "text-[var(--textSecondary)]",
      ring: "text-ink",
      label: "Bloqueada",
      Icon: Lock,
    },
  }[kind];

  let anim = { scale: 1, x: 0 };
  if (!reduceMotion && pressed) anim = { scale: 0.92, x: 0 };
  else if (!reduceMotion && shaking) anim = { scale: 1, x: [0, -6, 6, -4, 4, 0] };

  return (
    <motion.button
      ref={setRef}
      type="button"
      onClick={onToggle}
      aria-label={`${course.name}, ${look.label}. Toca para cambiar el estado`}
      whileTap={reduceMotion ? undefined : { scale: 0.92 }}
      animate={anim}
      transition={
        shaking && !pressed
          ? { duration: 0.36, ease: "easeOut" }
          : { type: "spring", stiffness: 520, damping: 26 }
      }
      className={`relative text-left rounded-xl border p-3 sm:p-3.5 min-h-[92px] flex flex-col justify-between gap-3 min-w-0 transition-colors duration-200 ${look.box} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]`}
    >
      {!reduceMotion && (
        <motion.span
          key={kind}
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-xl ring-2 ring-current ${look.ring}`}
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 1.09 }}
          transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        />
      )}
      <span className={`font-semibold text-[14px] leading-tight line-clamp-2 ${look.name}`}>{course.name}</span>
      <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[12px]">
        <span className={`font-mono ${look.code}`}>{course.code}</span>
        <span className={`inline-flex items-center gap-1 font-semibold shrink-0 ${look.badge}`}>
          {look.Icon && <look.Icon className="w-3.5 h-3.5" aria-hidden />}
          {look.label}
        </span>
      </span>
    </motion.button>
  );
}

// Guion de la demo automática: clics en ramos, arrastre de la nota y cambio de sección
const PLAY_STEPS = [
  { type: "card", id: "bd" },
  { type: "card", id: "calc1" },
  { type: "slider", to: 3.6 },
  { type: "card", id: "calc2" },
  { type: "card", id: "bd" },
  { type: "sec", id: "300" },
  { type: "card", id: "alg" },
  { type: "card", id: "calc2" },
  { type: "slider", to: 6.1 },
  { type: "card", id: "fis" },
  { type: "sec", id: "302" },
];
const nextStatus = (s) => (s === "pend" ? "cur" : s === "cur" ? "ok" : "pend");
const SLIDER_MIN = 3;
const SLIDER_MAX = 7;

function HeroPlayground() {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState(PLAY_START);
  const [auto, setAuto] = useState(true);
  const [pressed, setPressed] = useState(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0, show: false, fast: false });
  const [expected, setExpected] = useState(4.8);
  const [sec, setSec] = useState("302");
  const [shake, setShake] = useState(null);
  const rootRef = useRef(null);
  const cardRefs = useRef({});
  const secRefs = useRef({});
  const sliderRef = useRef(null);

  // El usuario toma el control: la demo se detiene y vuelve sola tras 9 s sin actividad
  const takeControl = useCallback(() => {
    setAuto(false);
    setCursor((c) => ({ ...c, show: false }));
  }, []);

  useEffect(() => {
    if (auto || reduceMotion) return undefined;
    const t = window.setTimeout(() => {
      setStatus(PLAY_START);
      setExpected(4.8);
      setSec("302");
      setAuto(true);
    }, 9000);
    return () => window.clearTimeout(t);
  }, [auto, status, expected, sec, reduceMotion]);

  // Demo automática: mueve un cursor, pulsa, arrastra y cambia valores
  useEffect(() => {
    if (!auto || reduceMotion) return undefined;
    let cancelled = false;
    const timers = [];
    const sleep = (ms) =>
      new Promise((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });

    const pointAt = (el, fx, fy, fast = false) => {
      const root = rootRef.current;
      if (!root || !el) return;
      const r = root.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      setCursor({ x: b.left - r.left + b.width * fx, y: b.top - r.top + b.height * fy, show: true, fast });
    };

    const thumbX = (v) => {
      const el = sliderRef.current;
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return b.left + 8 + (b.width - 16) * ((v - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN));
    };

    const perform = async (step) => {
      if (step.type === "card") {
        pointAt(cardRefs.current[step.id], 0.62, 0.55);
        await sleep(700);
        if (cancelled) return;
        setPressed(step.id);
        await sleep(200);
        if (cancelled) return;
        setStatus((s) => ({ ...s, [step.id]: nextStatus(s[step.id]) }));
        setPressed(null);
      } else if (step.type === "sec") {
        pointAt(secRefs.current[step.id], 0.6, 0.55);
        await sleep(700);
        if (cancelled) return;
        setPressed(`sec${step.id}`);
        await sleep(200);
        if (cancelled) return;
        setSec(step.id);
        setPressed(null);
      } else {
        const el = sliderRef.current;
        if (!el) return;
        const root = rootRef.current.getBoundingClientRect();
        const b = el.getBoundingClientRect();
        const from = Number(el.value);
        const place = (v, fast) => {
          const x = thumbX(v);
          setCursor({ x: x - root.left, y: b.top - root.top + b.height * 0.5, show: true, fast });
        };
        place(from, false);
        await sleep(750);
        if (cancelled) return;
        setPressed("slider");
        const steps = 18;
        for (let k = 1; k <= steps; k += 1) {
          if (cancelled) return;
          const t = k / steps;
          const eased = 1 - (1 - t) * (1 - t);
          const v = Math.round((from + (step.to - from) * eased) * 10) / 10;
          setExpected(v);
          place(v, true);
          await sleep(45);
        }
        setPressed(null);
      }
    };

    (async () => {
      await sleep(700);
      while (!cancelled) {
        for (const step of PLAY_STEPS) {
          if (cancelled) return;
          await perform(step);
          await sleep(1000);
        }
        if (cancelled) return;
        setCursor((c) => ({ ...c, show: false }));
        await sleep(1100);
        setStatus(PLAY_START);
        setExpected(4.8);
        setSec("302");
        await sleep(900);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      setPressed(null);
    };
  }, [auto, reduceMotion]);

  const isLocked = (c) => !!c.pre && status[c.pre] !== "ok" && status[c.id] === "pend";
  const okCount = PLAY_COURSES.filter((c) => status[c.id] === "ok").length;
  const pct = Math.round((okCount / PLAY_COURSES.length) * 100);

  const toggle = (c) => {
    takeControl();
    if (isLocked(c)) {
      setShake(c.id);
      window.setTimeout(() => setShake(null), 380);
      return;
    }
    setStatus((s) => ({ ...s, [c.id]: nextStatus(s[c.id]) }));
  };

  // Notas: 50% ya evaluado con promedio 5.56; el resto lo mueve el usuario.
  const presented = 5.56;
  const final = presented * 0.5 + expected * 0.5;
  const exempt = final >= 5.0;
  const needed = Math.max(0, (5.0 - presented * 0.5) / 0.5);

  // Horario: Cálculo II fija en MI 8:30; Física 302 también cae el MI.
  const clash = sec === "302";

  return (
    <div ref={rootRef} className="relative grid lg:grid-cols-12 gap-4 lg:gap-5" onPointerDown={takeControl}>
      <div className="lp-tint lp-band-green rounded-3xl p-5 sm:p-7 lg:col-span-7 min-w-0 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-3">
          <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">Tu malla</h2>
          <p className="text-[13px] font-medium lp-eyebrow">Toca un ramo para cambiar su estado</p>
        </div>
        <div className="relative mt-5 flex-1 grid grid-cols-2 min-[560px]:grid-cols-3 auto-rows-fr gap-2.5 sm:gap-3">
          {PLAY_COURSES.map((c) => (
            <PlayCourse
              key={c.id}
              course={c}
              status={status[c.id]}
              locked={isLocked(c)}
              shaking={shake === c.id}
              pressed={pressed === c.id}
              onToggle={() => toggle(c)}
              reduceMotion={reduceMotion}
              setRef={(el) => {
                cardRefs.current[c.id] = el;
              }}
            />
          ))}
        </div>
        <p className="mt-4 text-[13px] text-[var(--textSecondary)] leading-snug">
          Al aprobar un ramo se desbloquean los que dependen de él.
        </p>
      </div>

      <div className="lg:col-span-5 grid sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-5 min-w-0">
        <div className="lp-tint lp-tint-yellow rounded-3xl p-5 sm:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium lp-eyebrow">Avance de tu carrera</p>
              <p className="font-display text-5xl sm:text-6xl font-semibold tracking-tight mt-1 leading-none text-ink">
                <AnimatedPct value={pct} />
              </p>
            </div>
            <p className="text-[13px] text-[var(--textSecondary)] text-right leading-snug">
              {okCount} de {PLAY_COURSES.length} ramos
              <br />
              aprobados
            </p>
          </div>
          <div
            className="mt-5 h-2.5 rounded-full bg-ink/10 overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Avance de tu carrera"
          >
            <motion.div
              className="h-full rounded-full bg-approved origin-left"
              animate={{ width: `${pct}%` }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
            />
          </div>
        </div>

        <div className="lp-tint lp-band-pink rounded-3xl p-5 sm:p-6 min-w-0">
          <p className="text-[13px] font-medium lp-eyebrow">Cálculo II · nota para eximirte</p>
          <label htmlFor="lp-nota" className="mt-3 flex items-baseline justify-between gap-3 text-[14px] text-[var(--textSecondary)]">
            <span>Promedio en el 50% que falta</span>
            <span className="font-mono text-[15px] font-medium text-ink tabular-nums">{expected.toFixed(1)}</span>
          </label>
          <input
            ref={sliderRef}
            id="lp-nota"
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step="0.1"
            value={expected}
            onChange={(e) => {
              takeControl();
              setExpected(Number(e.target.value));
            }}
            className="mt-2 w-full accent-[var(--primary)]"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[13px] text-[var(--textSecondary)]">
              Nota final <span className="font-mono font-medium text-ink tabular-nums">{final.toFixed(2)}</span>
            </p>
            <motion.span
              key={exempt ? "ok" : "falta"}
              initial={reduceMotion ? false : { scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors duration-200 ${
                exempt ? "bg-approved text-paper" : "bg-exception text-paper"
              }`}
            >
              {exempt ? "Eximido" : `Necesitas ${needed.toFixed(1)}`}
            </motion.span>
          </div>
        </div>

        <div className="lp-tint lp-band-blue rounded-3xl p-5 sm:p-6 min-w-0">
          <p className="text-[13px] font-medium lp-eyebrow">Horario · Física General</p>
          <div className="mt-3 inline-flex flex-wrap rounded-xl bg-paper/60 p-1 gap-1" role="group" aria-label="Sección de Física General">
            {[
              ["300", "Sec. 300 · JU 10:00"],
              ["302", "Sec. 302 · MI 8:30"],
            ].map(([id, label]) => (
              <motion.button
                key={id}
                ref={(el) => {
                  secRefs.current[id] = el;
                }}
                type="button"
                aria-pressed={sec === id}
                onClick={() => {
                  takeControl();
                  setSec(id);
                }}
                animate={{ scale: pressed === `sec${id}` ? 0.9 : 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 26 }}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors duration-150 ${
                  sec === id ? "bg-primary" : "text-[var(--textSecondary)] hover:text-ink"
                }`}
              >
                {label}
              </motion.button>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-[var(--textSecondary)]">Cálculo II ya ocupa MI 8:30</p>
          <div className="mt-2 min-h-[36px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={clash ? "tope" : "libre"}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="m-0"
                role={clash ? "alert" : undefined}
              >
                {clash ? (
                  <motion.span
                    className="inline-flex items-center gap-1.5 rounded-lg bg-danger/15 px-2.5 py-1 text-[14px] font-semibold text-danger"
                    animate={reduceMotion ? undefined : { x: [0, -7, 7, -5, 5, -3, 3, 0] }}
                    transition={{ duration: 0.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.8 }}
                  >
                    <motion.span
                      className="inline-flex"
                      animate={reduceMotion ? undefined : { scale: [1, 1.25, 1], rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.8 }}
                    >
                      <AlertTriangle className="w-4 h-4" aria-hidden />
                    </motion.span>
                    Tope el miércoles a las 8:30
                  </motion.span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[14px] font-semibold text-approved">
                    <Check className="w-4 h-4" strokeWidth={2.5} aria-hidden />
                    Sin topes
                  </span>
                )}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-20 text-ink"
          initial={false}
          animate={{ x: cursor.x, y: cursor.y, opacity: cursor.show ? 1 : 0, scale: pressed ? 0.82 : 1 }}
          transition={
            cursor.fast
              ? { x: { duration: 0.06, ease: "linear" }, y: { duration: 0.06, ease: "linear" }, opacity: { duration: 0.2 } }
              : { type: "spring", stiffness: 150, damping: 20, opacity: { duration: 0.2 } }
          }
        >
          <MousePointer2 className="w-6 h-6 fill-ink stroke-paper drop-shadow-md" strokeWidth={1.5} />
        </motion.div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [hasMalla, setHasMalla] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("malla-darkmode");
      return saved === null ? false : saved === "true";
    } catch {
      return false;
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const menuPanelRef = useRef(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    setHasMalla(hasSelectedMalla());
  }, []);

  // Modo claro u oscuro compartido con la app (misma clave de almacenamiento)
  useEffect(() => {
    document.documentElement.className = dark ? "dark" : "light";
    try {
      localStorage.setItem("malla-darkmode", String(dark));
    } catch {
      /* sin almacenamiento: el modo vale solo para esta visita */
    }
  }, [dark]);

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

  const primaryLabel = hasMalla ? "Continuar en mi malla" : "Organizar mi semestre";

  const onNavClick = (e, href) => {
    e.preventDefault();
    setMenuOpen(false);
    scrollToId(href);
  };

  return (
    <div className={`${dark ? "dark" : "light"} lp-root`}>
      <div className="relative z-10 min-h-screen text-ink overflow-x-hidden">
        {/* 1. Navbar */}
        <header className="sticky top-0 z-50 lp-glass-nav">
          <div className="lp-container h-16 sm:h-[68px] flex items-center justify-between gap-3">
            <a href="#inicio" className="flex items-center gap-2.5 min-w-0 shrink-0" onClick={(e) => onNavClick(e, "#inicio")}>
              <img src="/favicon.png" alt="" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-[15px] tracking-tight text-ink">Malla Pro</span>
            </a>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Secciones">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => onNavClick(e, l.href)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-ink/65 hover:text-ink hover:bg-ink/[0.06] transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDark((v) => !v)}
                aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                className="inline-flex items-center justify-center w-11 h-11 rounded-lg lp-glass-chip text-ink hover:bg-ink/[0.06] transition-colors"
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {!hasMalla && (
                <button
                  type="button"
                  onClick={openApp}
                  className="px-3.5 py-2 rounded-lg text-sm font-semibold text-ink/80 border border-ink/15 hover:text-ink hover:bg-ink/[0.06] transition-colors min-h-[44px] lp-glass-chip"
                >
                  Ver mi malla
                </button>
              )}
              <button
                type="button"
                onClick={openApp}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary hover:opacity-90 transition min-h-[44px] max-w-[220px] truncate"
              >
                {primaryLabel}
              </button>
            </div>

            <div className="lg:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDark((v) => !v)}
                aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                className="inline-flex items-center justify-center w-11 h-11 rounded-lg lp-glass-chip text-ink"
              >
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            <button
              ref={menuBtnRef}
              type="button"
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-ink/15 text-ink lp-glass-chip"
              aria-expanded={menuOpen}
              aria-controls="lp-mobile-menu"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            </div>
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
                className="lg:hidden border-t border-ink/10 lp-glass-strong overflow-hidden"
              >
                <div className="lp-container py-3 flex flex-col gap-1">
                  {NAV_LINKS.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={(e) => onNavClick(e, l.href)}
                      className="px-3 py-3 rounded-lg text-sm font-semibold text-ink min-h-[44px] flex items-center"
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
                        className="w-full min-h-[44px] rounded-lg border border-ink/15 text-sm font-semibold text-ink"
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
                      className="w-full min-h-[44px] rounded-lg bg-primary text-sm font-semibold"
                    >
                      {primaryLabel}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* 2. Hero centrado */}
        <section id="inicio" className="lp-container scroll-mt-20 pt-12 sm:pt-16 pb-10 sm:pb-14">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            <p className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--textSecondary)]">
              <GraduationCap className="w-4 h-4" aria-hidden />
              Hecho para estudiantes UNAB
            </p>
            <h1 className="lp-h1 mt-5">
              Organiza tu semestre en minutos, <span className="lp-mark">no en pestañas.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[var(--textSecondary)] leading-relaxed max-w-xl">
              Revisa tu avance, calcula tus notas y arma tu horario sin perderte entre PDFs y planillas sueltas.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={openApp}
                className="inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-xl bg-primary font-semibold text-[15px] hover:opacity-90 active:scale-[0.98] transition"
              >
                <span className="truncate">{primaryLabel}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
              <a
                href="#como-funciona"
                onClick={(e) => onNavClick(e, "#como-funciona")}
                className="inline-flex items-center justify-center min-h-[52px] px-5 rounded-xl text-[15px] font-semibold text-ink hover:bg-ink/[0.06] transition-colors"
              >
                Ver cómo funciona
              </a>
            </div>
          </div>

          <div className="mt-12 sm:mt-14 max-w-6xl mx-auto">
            <HeroPlayground />
          </div>
        </section>

        {/* 3. Confianza */}
        <section className="lp-container pb-6 sm:pb-10">
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-5 text-center">
            <p className="text-[15px] sm:text-base font-medium text-ink/90 leading-snug">
              Ya lo usan{" "}
              <span className="font-semibold">
                +<CountUpStat to={100} /> estudiantes
              </span>{" "}
              este mes, de Santiago a Viña del Mar.
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-2.5">
              {["Gratis", "Sin registro", "Tus datos se quedan en tu dispositivo", "Pregrado Diurno"].map((chip) => (
                <li
                  key={chip}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink/85 px-3.5 py-1.5 rounded-full lp-glass-chip"
                >
                  <Check className="w-3.5 h-3.5 text-approved shrink-0" strokeWidth={2.5} aria-hidden />
                  {chip}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4. Funciones: bento por herramienta */}
        <section id="funciones" className="lp-container scroll-mt-20 py-16 sm:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="lp-h2">Todo tu semestre en un solo lugar</h2>
            <p className="mt-4 text-[var(--textSecondary)] leading-relaxed text-base sm:text-lg">
              Malla, notas, toma de ramos y horario conectados: lo que registras en una parte se usa en las demás.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-5">
            <FeatureTile f={FEATURES[0]} span="lg:col-span-7">
              <SimMalla />
            </FeatureTile>
            <FeatureTile f={FEATURES[1]} span="lg:col-span-5">
              <SimNotas />
            </FeatureTile>
            <FeatureTile f={FEATURES[2]} span="lg:col-span-6">
              <SimToma />
            </FeatureTile>
            <FeatureTile f={FEATURES[3]} span="lg:col-span-6">
              <SimHorario />
            </FeatureTile>
          </div>
        </section>

        {/* 5. Cómo funciona */}
        <section id="como-funciona" className="lp-container scroll-mt-20 pb-16 sm:pb-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="lp-h2">Así de simple</h2>
            <p className="mt-4 text-[var(--textSecondary)] leading-relaxed text-base sm:text-lg">
              Tres pasos y tu semestre queda ordenado.
            </p>
          </div>
          <ol className="mt-12 grid md:grid-cols-3 gap-4 lg:gap-5 max-w-5xl mx-auto">
            {STEPS.map((s) => (
              <li key={s.n} className={`lp-tint ${s.band} rounded-3xl p-6 sm:p-7 flex flex-col gap-4 min-w-0`}>
                <span className="w-11 h-11 rounded-full bg-paper/70 flex items-center justify-center font-display text-lg font-semibold lp-check">
                  {s.n}
                </span>
                <div>
                  <h3 className="text-xl font-semibold leading-snug">{s.t}</h3>
                  <p className="mt-2 text-[var(--textSecondary)] leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 6. Privacidad (banda invertida) */}
        <section id="privacidad" className="lp-container lp-band lp-band-flip scroll-mt-20 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="min-w-0 text-center lg:text-left">
              <Shield className="w-8 h-8 mx-auto lg:mx-0 text-[var(--primary)]" aria-hidden />
              <h2 className="lp-h2 mt-5">Tus datos académicos se quedan contigo</h2>
              <p className="mt-4 text-[var(--textSecondary)] leading-relaxed text-base sm:text-lg max-w-xl mx-auto lg:mx-0">
                Tus notas, tu progreso, tus horarios y el PDF que importas se procesan y almacenan localmente en tu dispositivo. Usamos analítica de uso general para entender cómo se usa la plataforma y seguir mejorándola.
              </p>
            </div>
            <div className="min-w-0">
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch xl:items-center gap-2 text-sm font-semibold">
                {["PDF", "Tu navegador", "Malla Pro"].map((step, i) => (
                  <div key={step} className="contents">
                    <div className="flex-1 rounded-xl border border-[var(--borderColor)] bg-[var(--bgSecondary)] px-4 py-3.5 text-center text-[var(--textPrimary)]">
                      {step}
                    </div>
                    {i < 2 && (
                      <span className="flex items-center justify-center text-[var(--textSecondary)] px-1 text-xs sm:text-sm" aria-hidden>
                        <span className="sm:hidden lg:inline xl:hidden">↓</span>
                        <span className="hidden sm:inline lg:hidden xl:inline">→</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <ul className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <FeaturePoint>La programación no se envía a un servidor</FeaturePoint>
                <FeaturePoint>Tu avance queda en tu navegador</FeaturePoint>
                <FeaturePoint>Puedes borrar tus datos locales cuando quieras</FeaturePoint>
                <FeaturePoint>Gratis y sin registro, hoy</FeaturePoint>
              </ul>
            </div>
          </div>
          <p className="mt-10 pt-6 border-t border-[var(--borderColor)] text-[13px] text-[var(--textSecondary)] leading-relaxed max-w-3xl">
            Malla Pro es una herramienta independiente y no oficial, sin relación con la Universidad Andrés Bello. Actualmente cubre solo mallas de Pregrado Diurno; los cupos mostrados corresponden a la programación que cargaste y pueden cambiar durante la toma real.
          </p>
        </section>

        {/* 7. Preguntas frecuentes */}
        <section id="preguntas" className="lp-container scroll-mt-20 py-16 sm:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="lp-h2">Preguntas frecuentes</h2>
          </div>
          <dl className="mt-12 grid md:grid-cols-2 gap-x-10 lg:gap-x-16 gap-y-8 max-w-5xl mx-auto">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q} className="border-t border-[var(--borderColor)] pt-5 min-w-0">
                <dt className="font-display text-lg font-semibold leading-snug">{item.q}</dt>
                <dd className="mt-2 text-[var(--textSecondary)] leading-relaxed">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 8. Cierre */}
        <section className="lp-container lp-band lp-band-yellow py-16 sm:py-24">
          <div className="max-w-2xl mx-auto text-center flex flex-col items-center">
            <h2 className="lp-h2">Arranca tu semestre organizado.</h2>
            <p className="mt-4 text-base sm:text-lg text-[var(--textSecondary)] max-w-md">
              Revisa tus ramos, calcula tus notas y arma tu horario desde un solo lugar.
            </p>
            <button
              type="button"
              onClick={openApp}
              className="mt-8 inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-xl bg-primary font-semibold text-[15px] hover:opacity-90 active:scale-[0.98] transition"
            >
              {primaryLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="mt-4 text-[13px] font-medium text-[var(--textSecondary)]">
              Gratis. Sin registro. De estudiantes para estudiantes.
            </p>
          </div>
        </section>

        {/* 14. Footer */}
        <footer className="border-t border-ink/10 lp-glass-nav mt-4">
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
                <p className="text-[12px] font-bold text-[var(--textSecondary)] mb-3">
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
                <p className="text-[12px] font-bold text-[var(--textSecondary)] mb-3">
                  Info
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/privacidad" className="text-[var(--textPrimary)] hover:text-[var(--primary)]">
                      Privacidad
                    </Link>
                  </li>
                  <li>
                    <Link to="/terminos" className="text-[var(--textPrimary)] hover:text-[var(--primary)]">
                      Términos de uso
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://www.instagram.com/mallapro.cl_/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--textPrimary)] hover:text-[var(--primary)]"
                    >
                      Instagram
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
            <div className="mt-10 pt-6 border-t border-[var(--borderColor)] space-y-3">
              <p className="text-[12px] text-[var(--textSecondary)] leading-relaxed">
                <Link to="/privacidad" className="hover:text-[var(--primary)]">Privacidad</Link>
                <span className="mx-1.5 opacity-50">·</span>
                <Link to="/terminos" className="hover:text-[var(--primary)]">Términos de uso</Link>
                <span className="mx-1.5 opacity-50">·</span>
                <a
                  href="https://www.instagram.com/mallapro.cl_/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--primary)]"
                >
                  Instagram
                </a>
              </p>
              <p className="text-[12px] text-[var(--textSecondary)] leading-relaxed max-w-2xl">
                Malla Pro es una herramienta independiente y no oficial. No corresponde a una
                plataforma oficial de la Universidad Andrés Bello ni de otras instituciones.
              </p>
              <p className="text-[12px] text-[var(--textSecondary)]">
                © {year} Malla Pro · De estudiantes para estudiantes.
              </p>
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        /* Landing en modo oscuro con los mismos tokens que la app (clase .dark). */
        .lp-root {
          font-family: var(--font-ui);
          background: var(--bgPrimary);
          color: var(--textPrimary);
        }
        .lp-root h1,
        .lp-root h2,
        .lp-root h3 {
          font-family: var(--font-display);
          font-weight: 600;
          letter-spacing: -0.025em;
          color: var(--textPrimary);
        }
        .lp-h1 {
          font-size: clamp(2.25rem, 6.4vw, 4.25rem);
          line-height: 1.04;
          letter-spacing: -0.035em;
          text-wrap: balance;
        }
        .lp-h2 {
          font-size: clamp(1.75rem, 3.8vw, 2.75rem);
          line-height: 1.1;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }
        .lp-root .font-display { font-family: var(--font-display); }
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

        /* Superficies sólidas: un plano, un borde. Sin degradados ni desenfoque decorativo. */
        .lp-glass-nav {
          background: color-mix(in srgb, var(--bgPrimary) 92%, transparent);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--borderColor);
        }
        .lp-glass {
          background: var(--bgSecondary);
          border: 1px solid var(--borderColor);
        }
        .lp-glass-strong {
          background: var(--bgSecondary);
          border: 1px solid var(--borderColor);
        }
        .lp-glass-chip {
          background: transparent;
          border: 1px solid var(--borderColor);
        }
        .lp-browser {
          box-shadow: 0 18px 48px rgba(20, 22, 27, 0.16);
        }

        /* Bandas de color: cada función tiene su tono (los mismos de los estados de la app).
           El fondo se extiende a todo el ancho sin salirse del contenedor. */
        .lp-band {
          background: var(--band-bg);
          box-shadow: 0 0 0 100vmax var(--band-bg);
          clip-path: inset(0 -100vmax);
        }
        .lp-tint {
          background: var(--band-bg);
        }
        .lp-eyebrow {
          font-size: 12px;
          font-weight: 700;
          color: var(--band-ink, var(--textSecondary));
        }
        .lp-check {
          color: var(--band-ink, rgb(var(--approved-rgb)));
        }
        .light .lp-tint-yellow { --band-bg: #F7E28F; --band-ink: #6B5300; }
        .dark .lp-tint-yellow  { --band-bg: #3A3214; --band-ink: #F2D14B; }
        .light .lp-band-green  { --band-bg: #DCEFE3; --band-ink: #1B6E4A; }
        .light .lp-band-blue   { --band-bg: #DCE7F8; --band-ink: #2A5FBF; }
        .light .lp-band-amber  { --band-bg: #F7E6C3; --band-ink: #8A5008; }
        .light .lp-band-pink   { --band-bg: #F8DCE6; --band-ink: #B0305A; }
        .dark .lp-band-green   { --band-bg: #15241D; --band-ink: #5CCB93; }
        .dark .lp-band-blue    { --band-bg: #172033; --band-ink: #7BA6F3; }
        .dark .lp-band-amber   { --band-bg: #2A2315; --band-ink: #E8AE45; }
        .dark .lp-band-pink    { --band-bg: #2C1A23; --band-ink: #F27AA6; }

        /* Banda amarilla: siempre texto oscuro sobre amarillo */
        .lp-band-yellow {
          --band-bg: #F2D14B;
          --band-ink: #14161B;
          --textPrimary: #14161B;
          --textSecondary: #4A4632;
          --borderColor: rgba(20, 22, 27, 0.2);
          --ink-rgb: 20 22 27;
          --paper-rgb: 245 244 240;
          --primary: #14161B;
          --on-ink: #F5F4F0;
          color: #14161B;
        }

        /* Banda invertida: oscura en modo claro, clara en modo oscuro */
        .light .lp-band-flip {
          --band-bg: #17191D;
          --band-ink: #5CCB93;
          --bgPrimary: #121316;
          --bgSecondary: #1A1C20;
          --textPrimary: #ECEBE8;
          --textSecondary: #A3A6AE;
          --borderColor: #2E3036;
          --ink-rgb: 236 235 232;
          --paper-rgb: 18 19 22;
          --primary: #ECEBE8;
          --on-ink: #121316;
          color: #ECEBE8;
        }
        .dark .lp-band-flip {
          --band-bg: #EFEDE6;
          --band-ink: #1B6E4A;
          --bgPrimary: #F5F4F0;
          --bgSecondary: #FFFFFF;
          --textPrimary: #14161B;
          --textSecondary: #5E6470;
          --borderColor: #D4D2CB;
          --ink-rgb: 20 22 27;
          --paper-rgb: 245 244 240;
          --primary: #14161B;
          --on-ink: #F5F4F0;
          color: #14161B;
        }
        .lp-root .lp-band-flip h1,
        .lp-root .lp-band-flip h2,
        .lp-root .lp-band-flip h3,
        .lp-root .lp-band-yellow h2 {
          color: var(--textPrimary);
        }

        /* Escenario del hero: el mockup sobre un bloque de color */
        .lp-stage {
          background: var(--stage-bg);
          border-radius: 24px;
          padding: clamp(14px, 2.4vw, 28px);
        }
        .light .lp-stage { --stage-bg: #F7E28F; }
        .dark .lp-stage  { --stage-bg: #3A3214; }
        .dark .lp-browser {
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
        }

        /* Resaltador: subrayado en claro, bloque con texto oscuro en oscuro */
        .lp-mark {
          background-image: linear-gradient(#F2D14B, #F2D14B);
          background-repeat: no-repeat;
          background-size: 100% 42%;
          background-position: 0 88%;
          padding: 0 2px;
          margin: 0 -2px;
          -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
        }
        .dark .lp-mark {
          background: #F2D14B;
          color: #17150F;
          padding: 0 8px 2px;
          border-radius: 6px;
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-root * { scroll-behavior: auto !important; }
        }
      `}</style>
    </div>
  );
}
