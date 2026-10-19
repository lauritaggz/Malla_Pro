import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, CheckCircle2, Circle, Lock, MousePointer2 } from "lucide-react";

/* ------------------------------------------------------------------
   Mockups animados de la landing. No se pueden usar: son decorativos y
   se mueven solos, con un cursor que pulsa. Solo corren mientras están
   a la vista y se quedan quietos con "reducir movimiento".
------------------------------------------------------------------- */

function useSim() {
  const reduce = useReducedMotion();
  const rootRef = useRef(null);
  const inView = useInView(rootRef, { amount: 0.35 });
  const [cursor, setCursor] = useState({ x: 0, y: 0, show: false, fast: false, down: false });

  const pointAt = useCallback((el, fx = 0.6, fy = 0.55, fast = false) => {
    const root = rootRef.current;
    if (!root || !el) return;
    const r = root.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    setCursor((c) => ({ ...c, x: b.left - r.left + b.width * fx, y: b.top - r.top + b.height * fy, show: true, fast }));
  }, []);
  const down = useCallback((d) => setCursor((c) => ({ ...c, down: d })), []);
  const hide = useCallback(() => setCursor((c) => ({ ...c, show: false, down: false })), []);

  const cursorNode = reduce ? null : (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-20 text-ink"
      initial={false}
      animate={{ x: cursor.x, y: cursor.y, opacity: cursor.show ? 1 : 0, scale: cursor.down ? 0.82 : 1 }}
      transition={
        cursor.fast
          ? { x: { duration: 0.08, ease: "linear" }, y: { duration: 0.08, ease: "linear" }, opacity: { duration: 0.2 } }
          : { type: "spring", stiffness: 150, damping: 20, opacity: { duration: 0.2 } }
      }
    >
      <MousePointer2 className="w-6 h-6 fill-ink stroke-paper drop-shadow-md" strokeWidth={1.5} />
    </motion.div>
  );

  return { reduce, rootRef, active: inView && !reduce, pointAt, down, hide, cursorNode };
}

function useSimLoop(active, script) {
  const ref = useRef(script);
  ref.current = script;
  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const timers = [];
    const sleep = (ms) =>
      new Promise((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });
    const stop = () => cancelled;
    (async () => {
      while (!cancelled) {
        await ref.current({ sleep, stop });
      }
    })();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [active]);
}

const nextStatus = (s) => (s === "pend" ? "cur" : s === "cur" ? "ok" : "pend");

/* ---------------------------- Tu malla ---------------------------- */
const MALLA = [
  { id: "c1", sem: 1, name: "Cálculo I", code: "MAT110", pre: null },
  { id: "al", sem: 1, name: "Álgebra", code: "MAT120", pre: null },
  { id: "c2", sem: 2, name: "Cálculo II", code: "MAT210", pre: "c1" },
  { id: "fi", sem: 2, name: "Física", code: "FIS110", pre: "al" },
  { id: "ed", sem: 3, name: "Ecuaciones Dif.", code: "MAT310", pre: "c2" },
  { id: "me", sem: 3, name: "Mecánica", code: "FIS210", pre: "fi" },
];
const MALLA_START = { c1: "ok", al: "ok", c2: "cur", fi: "pend", ed: "pend", me: "pend" };

function SimCourse({ course, status, locked, mark, pressed, setRef }) {
  const kind = locked ? "lock" : status;
  const look = {
    ok: { box: "bg-approved border-transparent", name: "text-paper", sub: "text-paper/80", label: "Aprobada", Icon: CheckCircle2 },
    cur: { box: "bg-cursando border-transparent", name: "text-paper", sub: "text-paper/80", label: "Cursando", Icon: Circle },
    pend: { box: "bg-[var(--bgSecondary)] border-ink/25", name: "text-ink", sub: "text-[var(--textSecondary)]", label: "Disponible", Icon: null },
    lock: { box: "border-dashed border-ink/25 bg-transparent", name: "text-[var(--textSecondary)]", sub: "text-[var(--textSecondary)]", label: "Bloqueada", Icon: Lock },
  }[kind];
  const outline =
    mark === "sel"
      ? "outline outline-2 outline-offset-2 outline-ink"
      : mark === "pre"
        ? "outline outline-2 outline-offset-2 outline-exception"
        : mark === "open"
          ? "outline outline-2 outline-offset-2 outline-dashed outline-approved"
          : "";
  return (
    <motion.div
      ref={setRef}
      animate={{ scale: pressed ? 0.93 : 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
      className={`relative rounded-xl border p-2.5 sm:p-3 min-h-[76px] flex flex-col justify-between gap-2 transition-colors duration-200 ${look.box} ${outline}`}
    >
      <motion.span
        key={kind}
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-ink"
        initial={{ opacity: 0.35, scale: 1 }}
        animate={{ opacity: 0, scale: 1.08 }}
        transition={{ duration: 0.5 }}
      />
      <span className={`font-semibold text-[13px] leading-tight ${look.name}`}>{course.name}</span>
      <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[12px]">
        <span className={`font-mono ${look.sub}`}>{course.code}</span>
        <span className={`inline-flex items-center gap-1 font-semibold ${look.name}`}>
          {look.Icon && <look.Icon className="w-3.5 h-3.5" aria-hidden />}
          {look.label}
        </span>
      </span>
    </motion.div>
  );
}

export function SimMalla() {
  const { reduce, rootRef, active, pointAt, down, hide, cursorNode } = useSim();
  const [st, setSt] = useState(MALLA_START);
  const [sel, setSel] = useState(null);
  const [pressed, setPressed] = useState(null);
  const refs = useRef({});

  useSimLoop(active, async ({ sleep, stop }) => {
    const click = async (id, fx = 0.6, fy = 0.55) => {
      pointAt(refs.current[id], fx, fy);
      await sleep(700);
      if (stop()) return;
      down(true);
      setPressed(id);
      await sleep(180);
      setSt((s) => ({ ...s, [id]: nextStatus(s[id]) }));
      setPressed(null);
      down(false);
      await sleep(650);
    };
    const inspect = async (id) => {
      pointAt(refs.current[id], 0.5, 0.3);
      await sleep(700);
      if (stop()) return;
      down(true);
      setPressed(id);
      await sleep(180);
      setSel(id);
      setPressed(null);
      down(false);
      await sleep(1900);
      setSel(null);
    };
    await sleep(900);
    await click("c2");
    await click("ed");
    await inspect("me");
    await click("fi");
    await click("fi");
    await click("me");
    await sleep(1400);
    hide();
    await sleep(900);
    setSt(MALLA_START);
  });

  const okCount = MALLA.filter((c) => st[c.id] === "ok").length;
  const pct = Math.round((okCount / MALLA.length) * 100);
  const locked = (c) => !!c.pre && st[c.pre] !== "ok" && st[c.id] === "pend";
  const selCourse = MALLA.find((c) => c.id === sel);
  const markOf = (c) => {
    if (!selCourse) return "";
    if (c.id === selCourse.id) return "sel";
    if (c.id === selCourse.pre) return "pre";
    if (c.pre === selCourse.id) return "open";
    return "";
  };

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="relative rounded-2xl lp-glass-strong p-4 sm:p-5 pointer-events-none select-none overflow-hidden"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-lg font-semibold leading-none text-ink">Mi malla curricular</p>
          <p className="mt-1 text-[12px] text-[var(--textSecondary)]">Ing. Informática</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold leading-none tabular-nums text-ink">{pct}%</p>
          <p className="text-[12px] text-[var(--textSecondary)]">de avance</p>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-ink/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-approved"
          animate={{ width: `${pct}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map((sem) => (
          <div key={sem} className="flex flex-col gap-2.5 min-w-0">
            <p className="text-[12px] font-semibold text-[var(--textSecondary)]">Semestre {sem}</p>
            {MALLA.filter((c) => c.sem === sem).map((c) => (
              <SimCourse
                key={c.id}
                course={c}
                status={st[c.id]}
                locked={locked(c)}
                mark={markOf(c)}
                pressed={pressed === c.id}
                setRef={(el) => {
                  refs.current[c.id] = el;
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-3 min-h-[18px] text-[12px] text-[var(--textSecondary)]">
        {selCourse ? `${selCourse.name}: prerrequisito en ámbar, lo que desbloquea punteado` : "Pendiente, cursando o aprobado"}
      </p>
      {cursorNode}
    </div>
  );
}

/* ------------------------------ Notas ------------------------------ */
const EVALS = [
  { key: "s1", n: "Solemne 1", w: 0.3 },
  { key: "s2", n: "Solemne 2", w: 0.3 },
  { key: "ct", n: "Controles", w: 0.2 },
  { key: "ex", n: "Examen", w: 0.2 },
];
const NOTAS_START = { s1: "5.4", s2: "", ct: "5.8", ex: "" };

export function SimNotas() {
  const { rootRef, active, pointAt, down, hide, cursorNode } = useSim();
  const [vals, setVals] = useState(NOTAS_START);
  const [editing, setEditing] = useState(null);
  const refs = useRef({});

  useSimLoop(active, async ({ sleep, stop }) => {
    const write = async (key, text) => {
      pointAt(refs.current[key], 0.5, 0.5);
      await sleep(700);
      if (stop()) return;
      down(true);
      await sleep(160);
      down(false);
      setEditing(key);
      setVals((v) => ({ ...v, [key]: "" }));
      for (let i = 1; i <= text.length; i += 1) {
        await sleep(260);
        if (stop()) return;
        setVals((v) => ({ ...v, [key]: text.slice(0, i) }));
      }
      await sleep(350);
      setEditing(null);
      await sleep(1200);
    };
    await sleep(900);
    await write("s2", "3.8");
    await write("s2", "5.9");
    await write("ex", "6.2");
    await sleep(1300);
    hide();
    await sleep(700);
    setVals(NOTAS_START);
  });

  const filled = EVALS.filter((e) => vals[e.key] !== "" && !Number.isNaN(Number(vals[e.key])));
  const wEval = filled.reduce((a, e) => a + e.w, 0);
  const sum = filled.reduce((a, e) => a + e.w * Number(vals[e.key]), 0);
  const present = wEval > 0 ? sum / wEval : null;
  const remaining = 1 - wEval;
  const needed = remaining > 0.001 ? (5.0 - sum) / remaining : null;
  let estado = "Cerca";
  if (remaining <= 0.001) estado = present >= 5 ? "Eximido" : "Examen";
  else if (needed !== null && needed <= 4.0) estado = "Eximido";
  const good = estado === "Eximido";
  const tip =
    remaining <= 0.001
      ? `Evaluaciones completas. Promedio ${present.toFixed(2)}.`
      : good
        ? "Ya cumples la nota para eximirte."
        : `Para eximirte (5.0), necesitas ${Math.max(needed, 0).toFixed(2)} en el ${Math.round(remaining * 100)}% restante.`;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="relative rounded-2xl lp-glass-strong p-4 sm:p-5 pointer-events-none select-none overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold leading-none text-ink">Cálculo II</p>
          <p className="mt-1 text-[12px] text-[var(--textSecondary)]">
            <span className="font-mono">MAT210</span> · {Math.round(wEval * 100)}% evaluado
          </p>
        </div>
        <span className="rounded-lg border border-ink/20 px-2 py-1 text-[12px] font-semibold text-ink">Eximición 5.0</span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          ["Estado", estado, true],
          ["% Eval.", `${Math.round(wEval * 100)}%`],
          ["Present.", present === null ? "—" : present.toFixed(2), false, true],
          ["Final", remaining <= 0.001 ? present.toFixed(2) : "—", false, true],
        ].map(([label, value, isState, mono]) => (
          <div key={label} className="rounded-xl border border-ink/15 px-1.5 py-2 min-w-0">
            <p className="text-[12px] text-[var(--textSecondary)]">{label}</p>
            <motion.p
              key={String(value)}
              initial={{ opacity: 0.4, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`mt-0.5 text-[13px] font-semibold ${mono ? "font-mono tabular-nums" : ""} ${
                isState ? (good ? "text-approved" : "text-exception") : "text-ink"
              }`}
            >
              {value}
            </motion.p>
          </div>
        ))}
      </div>

      <p className="mt-3 rounded-lg bg-ink/5 px-3 py-2 text-[12px] text-[var(--textSecondary)] leading-snug min-h-[36px]">{tip}</p>

      <div className="mt-3 rounded-xl border border-ink/15 divide-y divide-ink/10">
        {EVALS.map((e) => (
          <div key={e.key} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-[13px] font-semibold text-ink">{e.n}</span>
            <span className="flex items-center gap-3">
              <span className="font-mono text-[12px] text-[var(--textSecondary)] tabular-nums">{Math.round(e.w * 100)}%</span>
              <span
                ref={(el) => {
                  refs.current[e.key] = el;
                }}
                className={`inline-flex w-14 items-center justify-center rounded-lg border px-1 py-1 font-mono text-[13px] font-medium tabular-nums text-ink ${
                  editing === e.key ? "border-ink bg-[var(--bgSecondary)]" : "border-ink/15 bg-ink/5"
                }`}
              >
                {vals[e.key] === "" ? (editing === e.key ? "" : "—") : vals[e.key]}
                {editing === e.key && (
                  <motion.span
                    className="ml-0.5 inline-block h-3.5 w-px bg-ink"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                )}
              </span>
            </span>
          </div>
        ))}
      </div>
      {cursorNode}
    </div>
  );
}

/* --------------------------- Toma de ramos --------------------------- */
const TOMA = [
  {
    id: "pr",
    name: "Práctica II",
    secs: [
      { n: "300", h: "LU 8:30 · VI 10:00", p: "Prof. Rivas · Presencial" },
      { n: "301", h: "MA 14:00 · JU 14:00", p: "Prof. Soto · Online" },
      { n: "302", h: "MI 8:30 · VI 8:30", p: "Prof. Núñez · Presencial" },
    ],
  },
  {
    id: "pt",
    name: "Proyecto de Título",
    secs: [
      { n: "310", h: "MA 10:00 · JU 10:00", p: "Prof. Araya · Presencial" },
      { n: "311", h: "LU 14:40 · MI 14:40", p: "Prof. Vidal · Presencial" },
      { n: "312", h: "VI 8:30 · VI 10:00", p: "Prof. Campos · Online" },
    ],
  },
  {
    id: "ci",
    name: "Ciberseguridad",
    secs: [
      { n: "320", h: "LU 11:30 · MI 11:30", p: "Prof. Lagos · Presencial" },
      { n: "321", h: "MA 8:30 · JU 8:30", p: "Prof. Mena · Presencial" },
      { n: "322", h: "JU 14:40 · VI 14:40", p: "Prof. Ortiz · Online" },
    ],
  },
  { id: "sl", name: "Sem. Licenciatura", secs: [{ n: "330", h: "MI 10:00 · VI 11:30", p: "Prof. Peña · Presencial" }] },
];

export function SimToma() {
  const { rootRef, active, pointAt, down, hide, cursorNode } = useSim();
  const [current, setCurrent] = useState(null);
  const [chosen, setChosen] = useState({});
  const [pressed, setPressed] = useState(null);
  const courseRefs = useRef({});
  const secRefs = useRef({});

  useSimLoop(active, async ({ sleep, stop }) => {
    const tap = async (el, key, apply) => {
      pointAt(el, 0.6, 0.55);
      await sleep(700);
      if (stop()) return;
      down(true);
      setPressed(key);
      await sleep(180);
      apply();
      setPressed(null);
      down(false);
    };
    await sleep(900);
    const plan = [
      ["pr", 2],
      ["pt", 0],
      ["ci", 1],
    ];
    for (const [cid, idx] of plan) {
      await tap(courseRefs.current[cid], `c-${cid}`, () => setCurrent(cid));
      await sleep(1000);
      if (stop()) return;
      const sec = TOMA.find((c) => c.id === cid).secs[idx];
      await tap(secRefs.current[`${cid}-${idx}`], `s-${cid}-${idx}`, () => setChosen((m) => ({ ...m, [cid]: sec.n })));
      await sleep(1100);
    }
    await sleep(900);
    hide();
    await sleep(700);
    setChosen({});
    setCurrent(null);
  });

  const cur = TOMA.find((c) => c.id === current);
  const count = Object.keys(chosen).length;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="relative rounded-2xl lp-glass-strong p-4 sm:p-5 pointer-events-none select-none overflow-hidden"
    >
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div className="sm:col-span-2 min-w-0">
          <p className="text-[12px] font-semibold text-[var(--textSecondary)]">Tus asignaturas</p>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-1 gap-2">
          {TOMA.map((c) => (
            <motion.div
              key={c.id}
              ref={(el) => {
                courseRefs.current[c.id] = el;
              }}
              animate={{ scale: pressed === `c-${c.id}` ? 0.94 : 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 26 }}
              className={`rounded-xl border px-2.5 py-2 min-w-0 transition-colors duration-200 ${
                current === c.id ? "border-ink bg-[var(--bgSecondary)]" : "border-ink/15 bg-transparent"
              }`}
            >
              <p className="text-[13px] font-semibold leading-tight text-ink">{c.name}</p>
              <p className="mt-1 flex items-center gap-1 text-[12px] text-[var(--textSecondary)]">
                {chosen[c.id] ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-approved" strokeWidth={2.5} aria-hidden />
                    <span className="font-mono">Sec. {chosen[c.id]}</span>
                  </>
                ) : (
                  "Sin sección"
                )}
              </p>
            </motion.div>
          ))}
          </div>
        </div>

        <div className="sm:col-span-3 min-w-0">
          <p className="text-[12px] font-semibold text-[var(--textSecondary)]">{cur ? `Secciones de ${cur.name}` : "Secciones"}</p>
          <div className="mt-2 sm:min-h-[210px]">
            <AnimatePresence mode="wait" initial={false}>
              {cur ? (
                <motion.div
                  key={cur.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-2"
                >
                  {cur.secs.map((s, i) => {
                    const picked = chosen[cur.id] === s.n;
                    return (
                      <motion.div
                        key={s.n}
                        ref={(el) => {
                          secRefs.current[`${cur.id}-${i}`] = el;
                        }}
                        animate={{ scale: pressed === `s-${cur.id}-${i}` ? 0.95 : 1 }}
                        transition={{ type: "spring", stiffness: 520, damping: 26 }}
                        className={`rounded-xl border px-3 py-2 transition-colors duration-200 ${
                          picked ? "border-transparent bg-approved text-paper" : "border-ink/15 bg-[var(--bgSecondary)] text-ink"
                        }`}
                      >
                        <p className="flex flex-wrap justify-between gap-x-2 text-[13px] font-semibold">
                          <span>Sección {s.n}</span>
                          <span className="font-mono text-[12px] font-medium">NRC 12{s.n}</span>
                        </p>
                        <p className={`mt-0.5 text-[12px] ${picked ? "text-paper/85" : "text-[var(--textSecondary)]"}`}>
                          {s.h} · {s.p}
                        </p>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.p
                  key="vacio"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-dashed border-ink/25 px-3 py-6 text-center text-[13px] text-[var(--textSecondary)]"
                >
                  Elige un ramo para ver sus secciones
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink/10 pt-3 text-[12px] text-[var(--textSecondary)]">
        <span>
          <span className="font-mono font-medium text-ink tabular-nums">{count}</span> de {TOMA.length} ramos con sección
        </span>
        <span className="inline-flex gap-1">
          {TOMA.map((c) => (
            <span key={c.id} className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${chosen[c.id] ? "bg-approved" : "bg-ink/15"}`} />
          ))}
        </span>
      </div>
      {cursorNode}
    </div>
  );
}

/* ------------------------------ Horario ------------------------------ */
const DAYS = ["LU", "MA", "MI", "JU", "VI"];
const SLOTS = ["8:30", "10:00", "11:30", "14:40"];
const CLASES = [
  { id: "calc", short: "Cálculo II", sec: "Sec. 300", day: 2, slot: 0 },
  { id: "fis", short: "Física I", sec: "Sec. 110", day: 2, slot: 0 },
  { id: "prog", short: "Prog. Avanz.", sec: "Sec. 201", day: 1, slot: 1 },
  { id: "cib", short: "Ciberseg.", sec: "Sec. 302", day: 4, slot: 3 },
  { id: "fis2", short: "Física I", sec: "Sec. 111", day: 3, slot: 2 },
];
const HORARIO_START = ["prog", "cib"];

export function SimHorario() {
  const { reduce, rootRef, active, pointAt, down, hide, cursorNode } = useSim();
  const [on, setOn] = useState(HORARIO_START);
  const [pressed, setPressed] = useState(null);
  const chipRefs = useRef({});

  useSimLoop(active, async ({ sleep, stop }) => {
    const toggle = async (id) => {
      pointAt(chipRefs.current[id], 0.5, 0.55);
      await sleep(700);
      if (stop()) return;
      down(true);
      setPressed(id);
      await sleep(180);
      setOn((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
      setPressed(null);
      down(false);
    };
    await sleep(900);
    await toggle("calc");
    await sleep(1100);
    await toggle("fis");
    await sleep(2400);
    await toggle("fis");
    await sleep(1000);
    await toggle("fis2");
    await sleep(1600);
    hide();
    await sleep(800);
    setOn(HORARIO_START);
  });

  const placed = CLASES.filter((c) => on.includes(c.id));
  const cellKey = (c) => `${c.day}-${c.slot}`;
  const counts = placed.reduce((m, c) => ({ ...m, [cellKey(c)]: (m[cellKey(c)] || 0) + 1 }), {});
  const clashes = Object.entries(counts).filter(([, n]) => n > 1);
  const clash = clashes.length > 0;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="relative rounded-2xl lp-glass-strong p-4 sm:p-5 pointer-events-none select-none overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold leading-none text-ink">Tu horario</p>
          <p className="mt-1 text-[12px] text-[var(--textSecondary)]">{placed.length} ramos</p>
        </div>
        <div className="min-h-[30px]">
          <AnimatePresence mode="wait" initial={false}>
            {clash ? (
              <motion.span
                key="tope"
                initial={{ opacity: 0, y: 6 }}
                animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-danger/15 px-2.5 py-1 text-[13px] font-semibold text-danger"
              >
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden />1 tope en MI
              </motion.span>
            ) : (
              <motion.span
                key="libre"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] font-semibold text-approved"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
                Sin topes
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[2.4rem_repeat(5,minmax(0,1fr))] gap-px rounded-xl bg-ink/10 overflow-hidden border border-ink/10">
        <div className="bg-[var(--bgSecondary)]" />
        {DAYS.map((d) => (
          <div key={d} className="bg-[var(--bgSecondary)] py-1.5 text-center text-[12px] font-semibold text-ink">
            {d}
          </div>
        ))}
        {SLOTS.map((slot, s) => (
          <div key={slot} className="contents">
            <div className="bg-[var(--bgSecondary)] px-1 py-2 text-right font-mono text-[11px] leading-none text-[var(--textSecondary)]">
              {slot}
            </div>
            {DAYS.map((d, di) => {
              const here = placed.filter((c) => c.day === di && c.slot === s);
              const bad = here.length > 1;
              return (
                <div key={d + slot} className="relative bg-[var(--bgSecondary)] min-h-[46px] p-0.5 flex gap-0.5">
                  <AnimatePresence initial={false}>
                    {here.map((c) => (
                      <motion.div
                        key={c.id}
                        initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ type: "spring", stiffness: 420, damping: 24 }}
                        className={`flex-1 min-w-0 rounded-md px-1 py-1 transition-colors duration-200 ${
                          bad ? "bg-danger text-paper" : "bg-cursando text-paper"
                        }`}
                      >
                        <p className="truncate text-[11px] font-semibold leading-tight">{c.short}</p>
                        <p className="truncate font-mono text-[10px] leading-tight opacity-85">{c.sec}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CLASES.map((c) => {
          const isOn = on.includes(c.id);
          return (
            <motion.span
              key={c.id}
              ref={(el) => {
                chipRefs.current[c.id] = el;
              }}
              animate={{ scale: pressed === c.id ? 0.92 : 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 26 }}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors duration-200 ${
                isOn ? "border-transparent bg-ink text-paper" : "border-ink/25 text-[var(--textSecondary)]"
              }`}
            >
              {c.short} · {c.sec.replace("Sec. ", "")}
            </motion.span>
          );
        })}
      </div>
      {cursorNode}
    </div>
  );
}
