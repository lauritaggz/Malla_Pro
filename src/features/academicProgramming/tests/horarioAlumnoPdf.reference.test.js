import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { textItemsToLinedText } from "../utils/pdfTextLayout";
import { parseStudentScheduleText } from "../parsers/UnabStudentScheduleParser";

if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init) {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
      if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      }
    }
  };
}

GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
).href;

const PDF_PATH = "public/Horario Alumno-1.pdf";

describe.skipIf(!existsSync(PDF_PATH))("PDF referencia Horario Alumno", () => {
  it("detecta los 4 ramos del PDF real (incl. corte entre páginas)", async () => {
    const data = new Uint8Array(readFileSync(PDF_PATH));
    const pdf = await getDocument({ data, useSystemFonts: true }).promise;
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      pages.push(textItemsToLinedText(tc.items || []));
    }
    const { ramos } = parseStudentScheduleText(pages.join("\n"));
    expect(ramos.map((r) => r.nrc).sort()).toEqual([
      "8553",
      "8555",
      "8563",
      "8575",
    ]);
    expect(ramos.find((r) => r.nrc === "8575")?.meetings).toHaveLength(2);
    expect(ramos.find((r) => r.nrc === "8553")?.codigo).toBe("INSW420");
    expect(ramos.find((r) => r.nrc === "8575")?.codigo).toBe("PTEC107");
  });
});
