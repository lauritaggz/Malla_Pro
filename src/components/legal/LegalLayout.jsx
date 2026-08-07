import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import LegalDocument from "./LegalDocument";
import { extractDocumentMeta, extractToc } from "../../utils/legalMarkdown";

const HEADER_OFFSET = 88;

/**
 * Layout compartido para páginas legales.
 */
export default function LegalLayout({
  title,
  version,
  updatedAt,
  markdown,
  status,
  relatedLink,
  relatedLabel,
}) {
  const [tocOpen, setTocOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const contentRef = useRef(null);

  const toc = useMemo(() => extractToc(markdown || ""), [markdown]);
  const meta = useMemo(() => extractDocumentMeta(markdown || ""), [markdown]);
  const displayTitle = title || meta.title || "Documento legal";
  const displayVersion = version || meta.version || "1.0";
  const displayUpdated = updatedAt || meta.updatedAt || "";

  const scrollToId = useCallback((id) => {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    setActiveId(id);
    setTocOpen(false);
  }, []);

  useEffect(() => {
    if (status !== "success" || !toc.length) return;

    const headings = toc
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: `-${HEADER_OFFSET}px 0px -55% 0px`,
        threshold: [0, 0.25, 1],
      }
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [status, toc, markdown]);

  // Honor deep links after markdown loads
  useEffect(() => {
    if (status !== "success") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const t = window.setTimeout(() => {
      scrollToId(hash);
    }, 60);
    return () => window.clearTimeout(t);
  }, [status, markdown, scrollToId]);

  return (
    <div className="legal-page min-h-screen bg-bgPrimary text-textPrimary">
      <header className="legal-topbar sticky top-0 z-40 border-b border-borderColor bg-bgSecondary/90 backdrop-blur-md">
        <div className="legal-shell flex items-center justify-between gap-3 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <img src="/favicon.png" alt="" width={28} height={28} className="w-7 h-7 rounded-md shrink-0" />
            <span className="font-bold text-sm sm:text-base truncate">Malla Pro</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-textSecondary hover:text-primary transition-colors rounded-lg px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
            <span className="hidden xs:inline sm:inline">Volver a Malla Pro</span>
            <span className="sm:hidden">Inicio</span>
          </Link>
        </div>
      </header>

      <main className="legal-shell py-8 sm:py-10 pb-16">
        <header className="mb-6 sm:mb-8 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-textPrimary leading-tight">
            {displayTitle}
          </h1>
          <p className="mt-2 text-sm text-textSecondary">
            Versión {displayVersion}
            {displayUpdated ? ` · Última actualización: ${displayUpdated}` : ""}
          </p>
          {relatedLink && relatedLabel ? (
            <p className="mt-3 text-sm">
              <Link
                to={relatedLink}
                className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
              >
                {relatedLabel}
              </Link>
            </p>
          ) : null}
        </header>

        {status === "loading" && (
          <div className="rounded-2xl border border-borderColor bg-bgSecondary px-5 py-10 text-sm text-textSecondary">
            Cargando documento…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-borderColor bg-bgSecondary px-5 py-10 max-w-lg">
            <p className="text-base font-semibold text-textPrimary">
              No pudimos cargar este documento.
            </p>
            <p className="mt-2 text-sm text-textSecondary">
              Intenta recargar la página o vuelve más tarde.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:brightness-110 transition"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Volver a Malla Pro
            </Link>
          </div>
        )}

        {status === "success" && (
          <div className="legal-grid">
            <nav className="legal-toc" aria-label="Índice del documento">
              <div className="lg:hidden mb-4">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 rounded-xl border border-borderColor bg-bgSecondary px-4 py-3 text-sm font-semibold text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-expanded={tocOpen}
                  aria-controls="legal-toc-panel"
                  onClick={() => setTocOpen((v) => !v)}
                >
                  <span>Contenido</span>
                  <span className="inline-flex items-center gap-1 text-textSecondary font-medium">
                    Ver secciones
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${tocOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </span>
                </button>
                {tocOpen && (
                  <div
                    id="legal-toc-panel"
                    className="mt-2 rounded-xl border border-borderColor bg-bgSecondary p-3 max-h-[50vh] overflow-y-auto"
                  >
                    <TocList toc={toc} activeId={activeId} onSelect={scrollToId} />
                  </div>
                )}
              </div>

              <div className="hidden lg:block legal-toc-sticky">
                <p className="text-[11px] font-bold uppercase tracking-wider text-textSecondary mb-3">
                  Índice
                </p>
                <TocList toc={toc} activeId={activeId} onSelect={scrollToId} />
              </div>
            </nav>

            <article ref={contentRef} className="legal-article min-w-0">
              <LegalDocument markdown={markdown} />
            </article>
          </div>
        )}
      </main>
    </div>
  );
}

function TocList({ toc, activeId, onSelect }) {
  if (!toc?.length) {
    return <p className="text-sm text-textSecondary">Sin secciones</p>;
  }

  return (
    <ul className="space-y-0.5">
      {toc.map((item) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={`w-full text-left rounded-lg px-2.5 py-2 text-[13px] leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                active
                  ? "bg-primaryMuted text-primary font-semibold"
                  : "text-textSecondary hover:text-textPrimary hover:bg-bgPrimary/80"
              }`}
            >
              {item.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
