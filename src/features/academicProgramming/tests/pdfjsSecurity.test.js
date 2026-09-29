import { describe, expect, it } from "vitest";
import { configurePdfJsWorker, PDFJS_DOCUMENT_OPTIONS } from "../utils/pdfjsWorker";

describe("pdf.js security defaults", () => {
  it("deshabilita scripting embebido en PDFs", () => {
    expect(PDFJS_DOCUMENT_OPTIONS.enableScripting).toBe(false);
  });

  it("apunta el worker a un recurso local, no a un CDN público", () => {
    const options = {};
    configurePdfJsWorker(options);
    expect(options.workerSrc).toBeTruthy();
    expect(String(options.workerSrc)).not.toMatch(/jsdelivr|unpkg|cdnjs/i);
  });
});
