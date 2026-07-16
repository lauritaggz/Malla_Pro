/**
 * Interfaz conceptual de parsers de programación académica.
 * @typedef {Object} PdfDocumentData
 * @property {string} [fullText]
 * @property {number} [numPages]
 *
 * @typedef {Object} AcademicProgrammingParser
 * @property {(documentData: PdfDocumentData) => boolean} canParse
 * @property {(file: File, options?: object) => Promise<import('../types/academicProgramming').AcademicProgramming>} parse
 */

export {};
