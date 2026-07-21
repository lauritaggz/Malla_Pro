import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import {
  mapPdfTextItems,
  groupElementsIntoRows,
  findHeaderRowCluster,
  rowItemsToColumnFragments,
  COLUMN_KEYS,
  normalizeHeaderText,
} from "./pdfLayoutUtils";
import {
  emptyFragments,
  appendFragments,
  isNewSectionRow,
  finalizeDraftSection,
  parsePeriodFromLabel,
  parseCurriculumLine,
} from "./sectionDraftUtils";
import { groupSectionsByCourse } from "../services/groupSectionsByCourse";
import { sortAcademicProgramming } from "../utils/sortAcademicProgramming";
import { normalizeCellText } from "../utils/normalizeCellText";

GlobalWorkerOptions.workerSrc = pdfWorker;

const PARSER_ID = "UNAB_ACADEMIC_PROGRAMMING";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export {
  isNewSectionRow,
  finalizeDraftSection,
  parsePeriodFromLabel,
  parseCurriculumLine,
};

/**
 * @param {string} message
 * @param {string} code
 */
function createParseError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.technicalMessage = message;
  return error;
}

function assertNotAborted(signal) {
  if (signal?.aborted) {
    throw createParseError("Processing aborted", "CANCELLED");
  }
}

/**
 * @param {Array<{ text: string, x: number, y: number, width?: number }>} elements
 */
function extractMetadataFromElements(elements) {
  const lines = [];
  const rows = groupElementsIntoRows(elements, 4);
  for (const row of rows) {
    const text = row.items.map((i) => i.text).join(" ").replace(/\s+/g, " ").trim();
    if (text) lines.push(text);
  }

  let academicPeriod = { label: "", year: null, semester: null };
  let curriculum = { code: null, careerName: null, campus: null };

  for (const line of lines) {
    const upper = normalizeHeaderText(line);
    if (upper.includes("PROGRAMACION ACADEMICA")) {
      academicPeriod = parsePeriodFromLabel(line);
    }

    const curr = parseCurriculumLine(line);
    if (curr) {
      curriculum.code = curr.code;
      curriculum.careerName = curr.careerName;
    }

    if (
      !curriculum.campus &&
      /VINA DEL MAR|VIÑA DEL MAR|SANTIAGO|REPECA|CONCEPCION|CONCEPCIÓN|TEMUCO/i.test(line) &&
      !upper.includes("PROGRAMACION") &&
      !parseCurriculumLine(line)
    ) {
      curriculum.campus = normalizeCellText(line);
    }
  }

  return { academicPeriod, curriculum, lines };
}

export class UnabAcademicProgrammingParser {
  /**
   * @param {{ fullText?: string, numPages?: number }} documentData
   */
  canParse(documentData) {
    const text = normalizeHeaderText(documentData?.fullText || "");
    return (
      text.includes("PROGRAMACION ACADEMICA") &&
      (text.includes("NRC") || text.includes("CODIGO ASIGNATURA") || text.includes("HORARIO"))
    );
  }

  /**
   * @param {File} file
   * @param {{ onProgress?: (p: object) => void, signal?: AbortSignal }} [options]
   */
  async parse(file, options = {}) {
    const signal = options.signal || null;
    assertNotAborted(signal);

    if (!file) {
      throw createParseError("No file provided", "INVALID_FILE");
    }

    if (file.size === 0) {
      throw createParseError("Empty file", "FILE_EMPTY");
    }

    if (file.type !== "application/pdf") {
      if (!file?.name?.toLowerCase().endsWith(".pdf")) {
        throw createParseError(
          "El archivo seleccionado no es un PDF válido.",
          "INVALID_FILE"
        );
      }
    }

    if (file.size > MAX_FILE_BYTES) {
      throw createParseError(
        "El PDF supera el tamaño máximo permitido de 10 MB.",
        "FILE_TOO_LARGE"
      );
    }

    const onProgress = options.onProgress || (() => {});
    assertNotAborted(signal);
    const data = new Uint8Array(await file.arrayBuffer());
    assertNotAborted(signal);

    let pdf;
    try {
      pdf = await getDocument({ data, useSystemFonts: true, password: "" }).promise;
    } catch (err) {
      const msg = String(err?.message || err?.name || "").toLowerCase();
      if (msg.includes("password") || msg.includes("encrypted")) {
        throw createParseError("PDF password protected", "PDF_PROTECTED");
      }
      throw createParseError(
        "El archivo seleccionado no es un PDF válido.",
        "INVALID_FILE"
      );
    }

    try {
      assertNotAborted(signal);
      const numPages = pdf.numPages;
      let fullTextSample = "";
      let totalTextChars = 0;

      /** @type {import('../types/academicProgramming').ParserWarning[]} */
      const warnings = [];

      let academicPeriod = { label: "", year: null, semester: null };
      let curriculum = { code: null, careerName: null, campus: null };

      /** @type {Record<string, { start: number, end: number, center: number }> | null} */
      let columnBounds = null;

      /** @type {Array<ReturnType<typeof finalizeDraftSection>>} */
      const draftSections = [];

      /** @type {Record<string, string[]> | null} */
      let pendingFragments = null;
      let pendingContinuedAcrossPages = false;
      let pendingPage = 1;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        assertNotAborted(signal);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        const elements = mapPdfTextItems(textContent.items, viewport.height);

        const pageText = elements.map((e) => e.text).join(" ");
        totalTextChars += pageText.replace(/\s+/g, "").length;
        if (pageNum <= 2) fullTextSample += `${pageText}\n`;

        if (pageNum === 1 || !academicPeriod.label) {
          const meta = extractMetadataFromElements(elements);
          if (meta.academicPeriod.label) academicPeriod = meta.academicPeriod;
          if (meta.curriculum.code) curriculum.code = meta.curriculum.code;
          if (meta.curriculum.careerName) {
            curriculum.careerName = meta.curriculum.careerName;
          }
          if (meta.curriculum.campus) curriculum.campus = meta.curriculum.campus;
        }

        const rows = groupElementsIntoRows(elements, 3.8);

        if (!columnBounds) {
          const header = findHeaderRowCluster(rows);
          if (header) columnBounds = header.bounds;
        }

        const headerAgain = findHeaderRowCluster(rows);
        let dataStartIndex = 0;
        if (headerAgain) {
          if (!columnBounds) columnBounds = headerAgain.bounds;
          dataStartIndex = headerAgain.endIndex + 1;
        }

        if (!columnBounds) {
          onProgress({
            page: pageNum,
            totalPages: numPages,
            percent: Math.round((pageNum / numPages) * 100),
            sectionsDetected: draftSections.length,
          });
          await yieldToMain();
          continue;
        }

        for (let r = dataStartIndex; r < rows.length; r++) {
          const row = rows[r];
          const rowText = normalizeHeaderText(row.items.map((i) => i.text).join(" "));

          if (
            rowText.includes("PROGRAMACION ACADEMICA") ||
            (rowText.includes("NRC") && rowText.includes("HORARIO")) ||
            /^PAGINA\b/.test(rowText) ||
            /^\d+\s*\/\s*\d+$/.test(rowText)
          ) {
            continue;
          }

          const { cells, unassigned } = rowItemsToColumnFragments(row.items, columnBounds);

          if (unassigned.length > 0) {
            const joined = unassigned.join(" ").trim();
            if (joined && pendingFragments) {
              if (
                /\b(LU|MA|MI|JU|VI|SA|DO)\b/i.test(joined) ||
                /\d{1,2}:\d{2}/.test(joined)
              ) {
                pendingFragments.schedule.push(...unassigned);
              } else if (/VM-|SALA|ONLINE|COM\d|INF\d|SAL\d/i.test(joined)) {
                pendingFragments.schedule.push(...unassigned);
              } else {
                warnings.push({
                  page: pageNum,
                  type: "UNASSIGNED_TEXT",
                  message: `Texto sin columna clara: "${joined.slice(0, 80)}"`,
                });
              }
            } else if (joined) {
              warnings.push({
                page: pageNum,
                type: "UNASSIGNED_TEXT",
                message: `Texto sin columna clara: "${joined.slice(0, 80)}"`,
              });
            }
          }

          const hasAnyCell = COLUMN_KEYS.some((k) => (cells[k] || []).length > 0);
          if (!hasAnyCell) continue;

          if (isNewSectionRow(cells)) {
            if (pendingFragments) {
              draftSections.push(
                finalizeDraftSection(pendingFragments, {
                  period: buildPeriodKey(academicPeriod),
                  curriculumCode: curriculum.code,
                  page: pendingPage,
                  continuedAcrossPages: pendingContinuedAcrossPages,
                })
              );
            }

            pendingFragments = emptyFragments();
            appendFragments(pendingFragments, cells);
            pendingContinuedAcrossPages = false;
            pendingPage = pageNum;
          } else if (pendingFragments) {
            if (pageNum !== pendingPage) {
              pendingContinuedAcrossPages = true;
            }
            appendFragments(pendingFragments, cells);
          } else if (draftSections.length > 0) {
            // Solo advertir si ya hubo secciones: filas previas a la primera
            // (metadatos / basura de cabecera) no deben generar ruido.
            warnings.push({
              page: pageNum,
              type: "ORPHAN_CONTINUATION",
              message: "Se encontraron datos de continuación sin una sección abierta.",
            });
          }
        }

        onProgress({
          page: pageNum,
          totalPages: numPages,
          percent: Math.round((pageNum / numPages) * 100),
          sectionsDetected: draftSections.length + (pendingFragments ? 1 : 0),
        });

        await yieldToMain();
      }

      if (pendingFragments) {
        draftSections.push(
          finalizeDraftSection(pendingFragments, {
            period: buildPeriodKey(academicPeriod),
            curriculumCode: curriculum.code,
            page: pendingPage,
            continuedAcrossPages: pendingContinuedAcrossPages,
          })
        );
      }

      if (totalTextChars < 40) {
        throw createParseError(
          "No pudimos leer el contenido de este PDF. Descárgalo nuevamente desde el portal de tu universidad e intenta otra vez.",
          "NO_EXTRACTABLE_TEXT"
        );
      }

      if (!this.canParse({ fullText: fullTextSample, numPages })) {
        throw createParseError(
          "El documento no tiene el formato de programación académica compatible con esta versión.",
          "UNRECOGNIZED_FORMAT"
        );
      }

      if (!columnBounds) {
        throw createParseError(
          "El documento no tiene el formato de programación académica compatible con esta versión.",
          "UNRECOGNIZED_FORMAT"
        );
      }

      const periodKey = buildPeriodKey(academicPeriod);
      const seen = new Map();
      /** @type {import('../types/academicProgramming').AcademicSection[]} */
      const uniqueDrafts = [];

      for (const draft of draftSections) {
        if (draft._incomplete) {
          warnings.push({
            page: draft._page,
            sectionNrc: draft.nrc || undefined,
            type: "INCOMPLETE_SECTION",
            message: draft.warnings[0] || "Sección incompleta.",
          });
          if (!draft.nrc && !draft.courseCode) continue;
        }

        const dupKey = `${periodKey}|${draft.courseCode}|${draft.sectionNumber}|${draft.nrc}`;
        if (draft.nrc && draft.courseCode && draft.sectionNumber && seen.has(dupKey)) {
          warnings.push({
            page: draft._page,
            sectionNrc: draft.nrc,
            type: "DUPLICATE_SECTION",
            message: `Posible sección duplicada (NRC ${draft.nrc}, sección ${draft.sectionNumber}).`,
          });
          continue;
        }
        if (draft.nrc && draft.courseCode && draft.sectionNumber) {
          seen.set(dupKey, true);
        }

        for (const w of draft.warnings) {
          if (w.includes("entre páginas")) {
            warnings.push({
              page: draft._page,
              sectionNrc: draft.nrc || undefined,
              type: "PAGE_CONTINUATION",
              message: w,
            });
          } else if (w.includes("Modalidad desconocida")) {
            warnings.push({
              page: draft._page,
              sectionNrc: draft.nrc || undefined,
              type: "UNKNOWN_MODALITY",
              message: w,
            });
          } else if (w.includes("horario")) {
            warnings.push({
              page: draft._page,
              sectionNrc: draft.nrc || undefined,
              type: "SCHEDULE_PARSE",
              message: w,
            });
          } else if (w.includes("Falta")) {
            warnings.push({
              page: draft._page,
              sectionNrc: draft.nrc || undefined,
              type: "MISSING_FIELD",
              message: w,
            });
          }
        }

        const { _incomplete, _page, ...section } = draft;
        void _incomplete;
        void _page;
        uniqueDrafts.push(section);
      }

      if (uniqueDrafts.length === 0) {
        throw createParseError(
          "No se encontraron secciones académicas en el documento.",
          "NO_SECTIONS"
        );
      }

      const courses = groupSectionsByCourse(uniqueDrafts);
      const dedupedWarnings = dedupeWarnings(warnings);

      return sortAcademicProgramming({
        schemaVersion: "1.0",
        source: {
          originalFileName: file.name,
          parser: PARSER_ID,
          importedAt: new Date().toISOString(),
        },
        academicPeriod: {
          label: academicPeriod.label || "Periodo no identificado",
          year: academicPeriod.year,
          semester: academicPeriod.semester,
        },
        curriculum: {
          code: curriculum.code,
          careerName: curriculum.careerName,
          campus: curriculum.campus,
        },
        courses,
        warnings: dedupedWarnings,
      });
    } finally {
      try {
        await pdf.destroy();
      } catch {
        // ignore
      }
    }
  }
}

/**
 * @param {{ year: number | null, semester: 1|2|null }} period
 */
function buildPeriodKey(period) {
  if (period?.year && period?.semester) return `${period.year}-${period.semester}`;
  if (period?.year) return String(period.year);
  return "unknown-period";
}

/**
 * @param {import('../types/academicProgramming').ParserWarning[]} list
 */
function dedupeWarnings(list) {
  const seen = new Set();
  const out = [];
  for (const w of list || []) {
    const key = `${w.page ?? ""}|${w.type}|${w.sectionNrc ?? ""}|${w.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

function yieldToMain() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export const unabAcademicProgrammingParser = new UnabAcademicProgrammingParser();
