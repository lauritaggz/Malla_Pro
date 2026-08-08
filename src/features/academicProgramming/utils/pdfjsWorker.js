/**
 * Configuración compartida de pdf.js.
 * El worker NO se empaqueta en dist/ (evita falso positivo ClamAV
 * Html.Phishing.SVGDecryption en cPanel al subir el zip).
 *
 * Mantener la versión alineada con package.json → pdfjs-dist.
 */
export const PDFJS_VERSION = "6.1.200";

const DEFAULT_WORKER_CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

/**
 * @param {{ workerSrc?: string }} GlobalWorkerOptions
 */
export function configurePdfJsWorker(GlobalWorkerOptions) {
  if (!GlobalWorkerOptions) return;
  const fromEnv =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_PDFJS_WORKER_URL
      ? String(import.meta.env.VITE_PDFJS_WORKER_URL).trim()
      : "";
  GlobalWorkerOptions.workerSrc = fromEnv || DEFAULT_WORKER_CDN;
}
