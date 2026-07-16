/**
 * Identificador estable de sección.
 * @param {{ period?: string, curriculumCode?: string | null, courseCode?: string, sectionNumber?: string, nrc?: string }} params
 * @returns {string}
 */
export function createSectionId({
  period = "",
  curriculumCode = "",
  courseCode = "",
  sectionNumber = "",
  nrc = "",
}) {
  return [period, curriculumCode, courseCode, sectionNumber, nrc]
    .map((p) => String(p ?? "").trim())
    .join("|");
}
