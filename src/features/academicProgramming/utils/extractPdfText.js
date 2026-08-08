import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { configurePdfJsWorker } from "./pdfjsWorker";
import { textItemsToLinedText } from "./pdfTextLayout";

export { textItemsToLinedText } from "./pdfTextLayout";

configurePdfJsWorker(GlobalWorkerOptions);

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Extrae texto de un PDF (todas las páginas, en orden).
 * Conserva saltos de línea aproximados por layout.
 *
 * @param {File | ArrayBuffer | Uint8Array} input
 * @param {{
 *   signal?: AbortSignal,
 *   onProgress?: (p: { page: number, totalPages: number, percent: number }) => void,
 * }} [options]
 * @returns {Promise<{ text: string, totalPages: number }>}
 */
export async function extractPdfText(input, options = {}) {
  const { signal, onProgress } = options;

  if (signal?.aborted) {
    throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
  }

  let data;
  if (input instanceof File) {
    if (input.size === 0) {
      throw Object.assign(new Error("Empty file"), { code: "FILE_EMPTY" });
    }
    if (input.size > MAX_BYTES) {
      throw Object.assign(new Error("File too large"), { code: "FILE_TOO_LARGE" });
    }
    const isPdf =
      input.type === "application/pdf" ||
      input.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      throw Object.assign(new Error("Not a PDF"), { code: "INVALID_FILE" });
    }
    data = new Uint8Array(await input.arrayBuffer());
  } else if (input instanceof ArrayBuffer) {
    data = new Uint8Array(input);
  } else if (input instanceof Uint8Array) {
    data = input;
  } else {
    throw Object.assign(new Error("Invalid input"), { code: "INVALID_FILE" });
  }

  if (signal?.aborted) {
    throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
  }

  const pdf = await getDocument({
    data,
    useSystemFonts: true,
    password: "",
  }).promise;

  const totalPages = pdf.numPages || 0;
  const pageTexts = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (signal?.aborted) {
      throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
    }

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    pageTexts.push(textItemsToLinedText(textContent.items || []));

    onProgress?.({
      page: pageNum,
      totalPages,
      percent: totalPages ? Math.round((pageNum / totalPages) * 100) : 100,
    });
  }

  return {
    // Espacio entre páginas: un ramo puede partir a mitad (p. ej. cabecera p1, Horario p2)
    text: pageTexts.join("\n"),
    totalPages,
  };
}
