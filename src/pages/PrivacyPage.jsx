import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import LegalLayout from "../components/legal/LegalLayout";
import { LEGAL_DOCUMENTS, fetchLegalMarkdown } from "../utils/legalDocuments";
import { extractDocumentMeta } from "../utils/legalMarkdown";
import { createAppError, logInternalError } from "../utils/appErrors";

function usePageMeta({ title, description, path }) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    const prevDescription = meta.getAttribute("content");
    meta.setAttribute("content", description);

    let canonical = document.querySelector('link[rel="canonical"]');
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const prevCanonical = canonical.getAttribute("href");
    const origin = window.location.origin;
    canonical.setAttribute("href", `${origin}${path}`);

    return () => {
      document.title = prevTitle;
      if (prevDescription != null) meta.setAttribute("content", prevDescription);
      if (created) meta.remove();
      if (prevCanonical != null) canonical.setAttribute("href", prevCanonical);
      if (createdCanonical) canonical.remove();
    };
  }, [title, description, path]);
}

function useThemeFromStorage() {
  useEffect(() => {
    try {
      const theme = localStorage.getItem("malla-theme") || "aurora";
      const saved = localStorage.getItem("malla-darkmode");
      const darkMode = saved === null ? true : saved === "true";
      document.documentElement.className = `${theme} ${darkMode ? "dark" : "light"}`;
    } catch {
      document.documentElement.className = "aurora dark";
    }
  }, []);
}

function useLegalDocument(docKey) {
  const [status, setStatus] = useState("loading");
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setMarkdown("");

    fetchLegalMarkdown(docKey)
      .then((text) => {
        if (cancelled) return;
        setMarkdown(text);
        setStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        logInternalError(
          createAppError("UNEXPECTED", err?.message || "legal load failed", err),
          { context: `legal:${docKey}` }
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [docKey]);

  return { status, markdown };
}

function LegalPageShell({ docKey, relatedLink, relatedLabel }) {
  const location = useLocation();
  const config = LEGAL_DOCUMENTS[docKey];
  const { status, markdown } = useLegalDocument(docKey);
  const meta = extractDocumentMeta(markdown);

  useThemeFromStorage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  usePageMeta({
    title: config.pageTitle,
    description: config.description,
    path: config.route,
  });

  return (
    <LegalLayout
      title={meta.title || config.fallbackTitle}
      version={meta.version}
      updatedAt={meta.updatedAt}
      markdown={markdown}
      status={status}
      relatedLink={relatedLink}
      relatedLabel={relatedLabel}
    />
  );
}

export function PrivacyPage() {
  return (
    <LegalPageShell
      docKey="privacy"
      relatedLink="/terminos"
      relatedLabel="Ver Términos de Uso →"
    />
  );
}

export function TermsPage() {
  return (
    <LegalPageShell
      docKey="terms"
      relatedLink="/privacidad"
      relatedLabel="Ver Política de Privacidad →"
    />
  );
}

export default PrivacyPage;
