import { UnabAcademicProgrammingParser } from "./UnabAcademicProgrammingParser";
import {
  UnabStudentScheduleParser,
  parseStudentScheduleFile,
  parseStudentScheduleText,
  STUDENT_SCHEDULE_PARSER,
} from "./UnabStudentScheduleParser";

const parsers = [new UnabAcademicProgrammingParser()];

/**
 * @param {File} file
 * @param {{ onProgress?: (p: object) => void, signal?: AbortSignal }} [options]
 */
export async function parseAcademicProgrammingFile(file, options = {}) {
  const parser = parsers[0];
  return parser.parse(file, options);
}

export {
  UnabAcademicProgrammingParser,
  UnabStudentScheduleParser,
  parseStudentScheduleFile,
  parseStudentScheduleText,
  STUDENT_SCHEDULE_PARSER,
};
