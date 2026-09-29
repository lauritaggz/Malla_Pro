import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookMarked, Eye, EyeOff, ArrowUpRight } from "lucide-react";
import Curso from "../../components/Curso";
import MallaProgressStats from "../../components/MallaProgressStats";
import { mapMallaData } from "../../utils/mallasLoader";
import { meetsPrerequisites } from "../../utils/curriculumProgress";
import { DEMO_MALLA_JSON, DEMO_PROGRESS } from "./demoMalla";

const MOBILE_QUERY = "(max-width: 640px)";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

/** Tema y metadatos solo en memoria: no lee ni escribe las preferencias guardadas. */
function useDemoDocument() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const prevClassName = root.className;
    const prevTitle = document.title;
    const robots = document.querySelector('meta[name="robots"]');
    const prevRobots = robots?.getAttribute("content");

    root.className = "aurora dark";
    document.title = "Malla Pro · Vista demo";
    robots?.setAttribute("content", "noindex, nofollow");

    return () => {
      root.className = prevClassName;
      document.title = prevTitle;
      if (robots && prevRobots != null) robots.setAttribute("content", prevRobots);
    };
  }, []);
}

function getHighlightStatus(cursoId, selected, cursosById) {
  if (!selected) return "normal";
  const targetId = Number(cursoId);
  if (Number(selected.id) === targetId) return "selected";
  if ((selected.prerrequisitos || []).some((pre) => Number(pre) === targetId)) return "prereq";
  const target = cursosById.get(targetId);
  if ((target?.prerrequisitos || []).some((pre) => Number(pre) === Number(selected.id))) {
    return "unlock";
  }
  return "fade";
}

function SemestreColumn({ semestre, className = "", renderCurso, compactRows = 0 }) {
  const titleId = `demo-sem-${semestre.numero}`;

  if (compactRows > 0) {
    return (
      <section aria-labelledby={titleId} className={`flex flex-col min-h-0 gap-1.5 ${className}`}>
        <div className="flex items-baseline justify-between border-b border-borderColor/60 pb-1.5 select-none shrink-0">
          <h3 id={titleId} className="text-[13px] font-bold text-textPrimary leading-none">
            Semestre {semestre.numero}
          </h3>
          <span className="text-[11px] text-textSecondary font-semibold leading-none">
            Año {Math.ceil(semestre.numero / 2)} · {semestre.cursos.length} ramos
          </span>
        </div>
        <ul
          className="grid gap-1.5 flex-1 min-h-0"
          style={{ gridTemplateRows: `repeat(${compactRows}, minmax(52px, 1fr))` }}
        >
          {semestre.cursos.map((c) => (
            <li key={c.id} className="min-h-0">{renderCurso(c)}</li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-labelledby={titleId} className={`flex flex-col gap-2.5 py-1 px-0.5 ${className}`}>
      <div className="flex items-baseline justify-between border-b border-borderColor/60 pb-2 mb-0.5 select-none">
        <h3 id={titleId} className="text-xs font-bold text-textPrimary leading-none">
          Semestre {semestre.numero}
        </h3>
        <span className="text-[10px] text-textSecondary font-semibold leading-none">
          {semestre.cursos.length} ramos
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {semestre.cursos.map((c) => (
          <li key={c.id}>{renderCurso(c)}</li>
        ))}
      </ul>
    </section>
  );
}

/** Semestres curados para embed: mezclan aprobado, cursando, disponible y bloqueado. */
const EMBED_SEMESTRES = [5, 6, 7];

function BrandMark({ size = "w-7 h-7", icon = "w-3.5 h-3.5" }) {
  return (
    <div
      className={`${size} rounded-lg flex-shrink-0 flex items-center justify-center text-white`}
      style={{ background: "var(--primary)" }}
      aria-hidden
    >
      <BookMarked className={icon} />
    </div>
  );
}

const demoBadge = (
  <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary select-none">
    Vista demo
  </span>
);

export default function PortfolioPreviewPage() {
  const location = useLocation();
  const isEmbed = new URLSearchParams(location.search).get("embed") === "1";
  const isMobile = useIsMobile();
  useDemoDocument();

  const malla = useMemo(() => mapMallaData(DEMO_MALLA_JSON), []);
  const { aprobados, cursando } = DEMO_PROGRESS;

  const [ocultarCompletados, setOcultarCompletados] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const cursosById = useMemo(
    () => new Map(malla.semestres.flatMap((s) => s.cursos).map((c) => [Number(c.id), c])),
    [malla]
  );

  const stats = useMemo(() => {
    const total = cursosById.size;
    const aprobadosCount = aprobados.filter((id) => cursosById.has(id)).length;
    const cursandoCount = cursando.filter((id) => cursosById.has(id)).length;
    return {
      aprobados: aprobadosCount,
      cursando: cursandoCount,
      pendientes: total - aprobadosCount - cursandoCount,
      pct: total > 0 ? Math.round((aprobadosCount / total) * 100) : 0,
    };
  }, [cursosById, aprobados, cursando]);

  const visibleSemestres = useMemo(
    () =>
      malla.semestres.filter(
        (s) => !ocultarCompletados || !s.cursos.every((c) => aprobados.includes(c.id))
      ),
    [malla, ocultarCompletados, aprobados]
  );

  const years = useMemo(() => {
    const byYear = new Map();
    visibleSemestres.forEach((s) => {
      const year = Math.ceil(s.numero / 2);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push(s);
    });
    return [...byYear.entries()].map(([year, semestres]) => ({ year, semestres }));
  }, [visibleSemestres]);

  const selected = !isMobile && selectedId != null ? cursosById.get(selectedId) : null;

  const handleSelect = useCallback((curso) => {
    setSelectedId((prev) => (prev === curso.id ? null : curso.id));
  }, []);

  useEffect(() => {
    if (selectedId == null) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  useEffect(() => {
    if (selectedId != null && !visibleSemestres.some((s) => s.cursos.some((c) => c.id === selectedId))) {
      setSelectedId(null);
    }
  }, [selectedId, visibleSemestres]);

  const renderCurso = (c) => (
    <Curso
      curso={c}
      readOnly
      aprobado={aprobados.includes(c.id)}
      excepcional={false}
      enCurso={cursando.includes(c.id)}
      disponible={meetsPrerequisites(c, DEMO_PROGRESS)}
      highlightStatus={getHighlightStatus(c.id, selected, cursosById)}
      onSelect={isMobile ? undefined : handleSelect}
    />
  );

  const toggleCompletados = (
    <button
      type="button"
      onClick={() => setOcultarCompletados((v) => !v)}
      aria-pressed={ocultarCompletados}
      className={`btn-interactive flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all duration-200 cursor-pointer shrink-0
        ${ocultarCompletados
          ? "bg-primary text-white border-primary"
          : "bg-bgPrimary/60 text-textSecondary border-borderColor hover:text-primary hover:border-primary/40"}
      `}
      title={ocultarCompletados ? "Mostrar todos los semestres" : "Ocultar semestres completados"}
    >
      {ocultarCompletados ? <Eye className="w-3.5 h-3.5" aria-hidden /> : <EyeOff className="w-3.5 h-3.5" aria-hidden />}
      <span className="max-md:sr-only">{ocultarCompletados ? "Mostrar todo" : "Ocultar completados"}</span>
    </button>
  );

  if (isEmbed) {
    const total = cursosById.size || 1;
    const embedSemestres = malla.semestres.filter((s) => EMBED_SEMESTRES.includes(s.numero));
    const rows = Math.max(...embedSemestres.map((s) => s.cursos.length));

    return (
      <div className="portfolio-embed bg-bgPrimary text-textPrimary h-[100dvh] flex flex-col overflow-hidden">
        <header className="shrink-0 h-10 flex items-center gap-2 px-3 bg-bgSecondary/90 border-b border-borderColor/60">
          <BrandMark size="w-6 h-6" icon="w-3 h-3" />
          <div className="flex items-baseline gap-1.5 min-w-0 leading-none">
            <span className="font-bold text-sm text-textPrimary shrink-0">Malla Pro</span>
            <span className="max-sm:hidden text-xs font-semibold text-textSecondary/80 truncate">
              / {malla.nombre}
            </span>
          </div>
          <span className="ml-auto">{demoBadge}</span>
        </header>

        <main className="flex flex-col flex-1 min-h-0 gap-2 p-2 sm:gap-2.5 sm:p-3 overflow-y-auto">
          <section
            aria-label="Resumen de progreso"
            className="malla-toolbar shrink-0 rounded-xl border border-borderColor/60 bg-bgSecondary/30 px-3 py-2 select-none"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
              <h1 className="text-sm font-bold text-textPrimary leading-none">Mi malla curricular</h1>
              <MallaProgressStats
                {...stats}
                className="text-[13px] font-semibold text-textSecondary gap-x-2.5"
                separatorClassName="max-sm:hidden"
              />
            </div>
            <div
              role="progressbar"
              aria-label="Avance de la carrera"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stats.pct}
              className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-borderColor/30"
            >
              <div className="h-full bg-emerald-500" style={{ width: `${(stats.aprobados / total) * 100}%` }} />
              <div className="h-full bg-primary opacity-70" style={{ width: `${(stats.cursando / total) * 100}%` }} />
            </div>
          </section>

          {isMobile ? (
            <div
              className="mobile-semester-scroll scroll-container overscroll-x-contain"
              role="region"
              aria-label="Semestres de la malla"
            >
              <div className="mobile-semester-carousel">
                {embedSemestres.map((s) => (
                  <SemestreColumn
                    key={s.numero}
                    semestre={s}
                    className="w-[80vw] shrink-0 snap-center"
                    renderCurso={renderCurso}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              className="grid grid-cols-3 gap-3 flex-1 min-h-0 fade-in"
              onClick={(e) => {
                if (!e.target.closest(".curso-card-base")) setSelectedId(null);
              }}
            >
              {embedSemestres.map((s) => (
                <SemestreColumn key={s.numero} semestre={s} renderCurso={renderCurso} compactRows={rows} />
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="bg-bgPrimary text-textPrimary min-h-[100dvh] flex flex-col overflow-x-hidden">
      <header className="navbar-shell sticky top-0 z-40 bg-bgSecondary/90 backdrop-blur-xl border-b border-borderColor/60 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BrandMark />
            <div className="flex flex-col min-w-0 leading-tight">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="font-bold text-xs sm:text-sm text-textPrimary flex-shrink-0">Malla Pro</span>
                <span className="hidden md:inline text-[11px] sm:text-xs font-semibold text-textSecondary/80 truncate">
                  / {malla.nombre}
                </span>
              </div>
              <span className="text-[9px] font-bold text-textSecondary/80 uppercase tracking-wider md:hidden">
                UNAB
              </span>
            </div>
            <span className="ml-1">{demoBadge}</span>
          </div>

          <Link
            to="/"
            className="flex items-center gap-1 shrink-0 rounded-lg border border-borderColor px-2.5 py-1.5 text-[11px] font-semibold text-textSecondary hover:text-primary hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="max-sm:hidden">Abrir Malla Pro</span>
            <span className="sm:hidden">Abrir</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <main className="main-content-zoom flex flex-col flex-1 min-h-0 w-full max-w-7xl mx-auto px-2 pt-3 pb-3 sm:px-6 sm:pt-5 sm:pb-8">
        <div className="malla-toolbar flex flex-col gap-2 py-2 px-3 mb-3 border border-borderColor/60 bg-bgSecondary/30 rounded-2xl select-none shrink-0 lg:flex-row lg:items-center lg:justify-between lg:gap-3 sm:px-3.5">
          <div className="flex flex-col min-w-0 lg:max-w-[42%]">
            <h1 className="text-sm sm:text-base font-bold text-textPrimary leading-none">Mi malla curricular</h1>
            <p className="text-[10px] text-textSecondary/80 font-bold mt-0.5 uppercase tracking-wide truncate">
              {malla.nombre}
            </p>
          </div>
          <div className="flex items-center justify-between gap-x-2 gap-y-1.5 text-xs text-textSecondary font-semibold lg:justify-end min-w-0">
            <MallaProgressStats {...stats} className="max-sm:gap-x-3" separatorClassName="max-sm:hidden" />
            <div className="flex items-center lg:ml-1 lg:pl-2.5 lg:border-l border-borderColor/60 shrink-0">
              {toggleCompletados}
            </div>
          </div>
        </div>

        {isMobile ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div
              className="mobile-semester-scroll scroll-container overscroll-x-contain"
              role="region"
              aria-label="Semestres de la malla"
            >
              <div className="mobile-semester-carousel">
                {visibleSemestres.map((s) => (
                  <SemestreColumn
                    key={s.numero}
                    semestre={s}
                    className="w-[80vw] shrink-0 snap-center"
                    renderCurso={renderCurso}
                  />
                ))}
              </div>
            </div>
            <p className="mobile-scroll-hint select-none">
              ← Desliza horizontalmente para ver los semestres →
            </p>
          </div>
        ) : (
          <div
            className="flex flex-col flex-1 min-h-0 rounded-3xl border border-borderColor/40 bg-bgPrimary/45 pt-5 pb-6 px-6 sm:px-10"
            onClick={(e) => {
              if (!e.target.closest(".curso-card-base")) setSelectedId(null);
            }}
          >
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-8">
              {years.map(({ year, semestres }) => (
                <div key={year} role="group" aria-label={`Año ${year}`} className="fade-in">
                  <div className="text-center mb-4 select-none" aria-hidden>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-textSecondary/80">Año</span>
                    <div className="text-lg sm:text-xl font-extrabold text-primary">{year}</div>
                  </div>
                  <div className="flex gap-4 sm:gap-5 md:gap-6">
                    {semestres.map((s) => (
                      <SemestreColumn
                        key={s.numero}
                        semestre={s}
                        className="w-[210px] md:w-[220px] shrink-0"
                        renderCurso={renderCurso}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
