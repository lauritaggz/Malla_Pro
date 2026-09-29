/**
 * Configuración compartida de pdf.js.
 * El worker se empaqueta con Vite y se sirve desde el mismo origen.
 */
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/** Opciones de apertura: PDFs de usuario, sin ejecutar JavaScript embebido. */
export const PDFJS_DOCUMENT_OPTIONS = Object.freeze({
  useSystemFonts: true,
  password: "",
  enableScripting: false,
});

/**
 * @param {{ workerSrc?: string }} GlobalWorkerOptions
 */
export function configurePdfJsWorker(GlobalWorkerOptions) {
  if (!GlobalWorkerOptions) return;
  GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
}
