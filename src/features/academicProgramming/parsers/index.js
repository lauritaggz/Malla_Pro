import { UnabAcademicProgrammingParser } from "./UnabAcademicProgrammingParser";

const parsers = [new UnabAcademicProgrammingParser()];

/**
 * @param {File} file
 * @param {{ onProgress?: (p: object) => void }} [options]
 */
export async function parseAcademicProgrammingFile(file, options = {}) {
  // En esta versión solo UNAB; se prueba con canParse tras lectura interna.
  // Si en el futuro hay varios parsers, se puede pre-escanear la 1ª página.
  const parser = parsers[0];
  return parser.parse(file, options);
}

export { UnabAcademicProgrammingParser };
