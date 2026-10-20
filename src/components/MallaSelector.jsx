import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BookMarked, ChevronRight, Moon, Search, Sun } from "lucide-react";

const AREA_ORDER = ["Ingeniería", "Salud", "Ciencias sociales"];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Pantalla de selección de malla: promesa a la izquierda, buscador y lista a la derecha.
 */
export default function MallaSelector({
  universidades,
  onSelect,
  onContacto,
  darkMode,
  setDarkMode,
}) {
  const reduceMotion = useReducedMotion();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const items = useMemo(
    () =>
      universidades.flatMap((uni) =>
        uni.mallas.map((m) => ({ ...m, universidad: uni.universidad, uni }))
      ),
    [universidades]
  );
  const multiUni = universidades.length > 1;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return items;
    return items.filter((m) => normalize(`${m.nombre} ${m.universidad} ${m.area}`).includes(q));
  }, [items, query]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const m of filtered) {
      const key = m.area || "Otras";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return [...map.entries()].sort(([a], [b]) => {
      const ia = AREA_ORDER.indexOf(a);
      const ib = AREA_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [filtered]);

  // Orden plano = orden visual, para navegar con flechas
  const flat = useMemo(() => groups.flatMap(([, list]) => list), [groups]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Atajo "/" para ir al buscador
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (m) => onSelect({ nombre: m.nombre, url: m.url }, m.universidad);

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      pick(flat[active]);
    } else if (e.key === "Escape" && query) {
      setQuery("");
    }
  };

  useEffect(() => {
    document
      .querySelector(`[data-malla-row="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let rowIndex = -1;

  return (
    <div className="fixed inset-0 grid overflow-y-auto bg-bgPrimary lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
      {/* Izquierda: la promesa */}
      <section className="flex flex-col gap-6 sm:gap-8 px-5 sm:px-10 py-5 sm:py-10 lg:py-12 lg:border-r lg:border-borderColor/60 bg-bgSecondary">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-[13px] font-semibold text-textSecondary transition-colors hover:text-textPrimary hover:bg-borderColor/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al inicio
          </Link>
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-textSecondary transition-colors hover:text-textPrimary hover:bg-borderColor/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {darkMode ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
          </button>
        </div>

        <div className="my-auto max-w-md">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-[color:var(--on-ink)]">
              <BookMarked className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-textPrimary">Malla Pro</span>
          </div>
          <h1 className="t-page text-textPrimary m-0 text-balance">Elige tu carrera</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-textSecondary">
            Tu avance se guarda solo en este dispositivo. No necesitas crear una cuenta.
          </p>
          <p className="mt-5 hidden border-t border-borderColor/60 pt-4 text-[13px] leading-relaxed text-textSecondary sm:block">
            Si más adelante cambias de malla, conservamos tus ramos aprobados que tengan el mismo nombre.
          </p>
        </div>

        <p className="hidden lg:block text-[12px] text-textSecondary">
          Disponible para pregrado diurno.
        </p>
      </section>

      {/* Derecha: buscador y lista */}
      <section className="min-w-0 px-5 sm:px-10 py-6 sm:py-10 lg:py-12 lg:h-full lg:overflow-y-auto">
        <div className="mx-auto w-full max-w-xl">
          <div className="sticky top-0 z-10 -mx-1 bg-bgPrimary px-1 pb-3 pt-1">
            <label htmlFor="malla-search" className="sr-only">
              Buscar carrera
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
                aria-hidden
              />
              <input
                id="malla-search"
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Buscar carrera"
                autoComplete="off"
                role="combobox"
                aria-expanded="true"
                aria-controls="malla-list"
                className="w-full rounded-xl border border-borderColor bg-bgSecondary py-3 pl-10 pr-10 text-[15px] text-textPrimary placeholder:text-textSecondary outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-borderColor px-1.5 py-0.5 font-mono text-[12px] text-textSecondary sm:block">
                /
              </kbd>
            </div>
          </div>

          <div id="malla-list" role="listbox" aria-label="Carreras disponibles" className="mt-2 space-y-6">
            {groups.map(([area, list]) => (
              <div key={area}>
                <h2 className="mb-1.5 px-1 text-[13px] font-semibold text-textSecondary">{area}</h2>
                <ul className="m-0 list-none divide-y divide-borderColor/60 overflow-hidden rounded-xl border border-borderColor bg-bgSecondary p-0">
                  {list.map((m) => {
                    rowIndex += 1;
                    const idx = rowIndex;
                    const isActive = idx === active;
                    return (
                      <motion.li
                        key={m.url}
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1], delay: reduceMotion ? 0 : Math.min(idx * 0.03, 0.3) }}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          data-malla-row={idx}
                          onClick={() => pick(m)}
                          onMouseEnter={() => setActive(idx)}
                          className={`group flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-[background-color,transform] duration-150 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 ${
                            isActive ? "bg-borderColor/40" : ""
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block text-[15px] font-medium leading-snug text-textPrimary">
                              {m.nombre}
                            </span>
                            {multiUni && (
                              <span className="mt-0.5 block text-[12px] text-textSecondary">{m.universidad}</span>
                            )}
                          </span>
                          <span className="flex shrink-0 items-center gap-2 text-textSecondary">
                            {m.semestres && <span className="num text-[12px]">{m.semestres} sem.</span>}
                            <ChevronRight
                              className={`h-4 w-4 transition-transform duration-150 ${isActive ? "translate-x-0.5 text-textPrimary" : ""}`}
                              aria-hidden
                            />
                          </span>
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {flat.length === 0 && (
              <div className="rounded-xl border border-dashed border-borderColor px-5 py-8 text-center">
                <p className="m-0 text-[15px] font-medium text-textPrimary">
                  No encontramos &ldquo;{query.trim()}&rdquo;
                </p>
                <p className="mt-1 text-[13px] text-textSecondary">
                  Pásanos tu malla y la agregamos para que puedas usarla.
                </p>
                <button
                  type="button"
                  onClick={onContacto}
                  className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-[color:var(--on-ink)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
                >
                  Pedir mi malla
                </button>
              </div>
            )}
          </div>

          {flat.length > 0 && (
            <button
              type="button"
              onClick={onContacto}
              className="mt-6 flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-borderColor px-4 py-3.5 text-left text-[14px] text-textSecondary transition-colors hover:border-textSecondary/60 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span>¿No está tu carrera? Pídela y la agregamos.</span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
