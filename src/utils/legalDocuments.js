/**
 * Fuentes Markdown legales (archivos en /public).
 */

export const LEGAL_DOCUMENTS = {
  privacy: {
    id: "privacy",
    path: "/Política de Privacidad de Malla Pro.md",
    route: "/privacidad",
    fallbackTitle: "Política de Privacidad",
    pageTitle: "Política de Privacidad | Malla Pro",
    description:
      "Conoce cómo Malla Pro procesa y protege la información utilizada en la plataforma.",
  },
  terms: {
    id: "terms",
    path: "/Términos de Uso de Malla Pro.md",
    route: "/terminos",
    fallbackTitle: "Términos de Uso",
    pageTitle: "Términos de Uso | Malla Pro",
    description:
      "Consulta los términos y condiciones que regulan el uso de Malla Pro.",
  },
};

/**
 * @param {keyof typeof LEGAL_DOCUMENTS} docKey
 * @returns {Promise<string>}
 */
export async function fetchLegalMarkdown(docKey) {
  const doc = LEGAL_DOCUMENTS[docKey];
  if (!doc) throw new Error(`Unknown legal document: ${docKey}`);

  const url = encodeURI(doc.path);
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "text/markdown, text/plain, */*" },
  });

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} loading ${doc.path}`);
    err.code = "LEGAL_LOAD_FAILED";
    throw err;
  }

  const text = await res.text();
  if (!text || !String(text).trim()) {
    const err = new Error(`Empty legal document: ${doc.path}`);
    err.code = "LEGAL_LOAD_FAILED";
    throw err;
  }

  return text;
}
