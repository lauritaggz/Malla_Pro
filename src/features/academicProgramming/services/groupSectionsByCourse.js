import { normalizeCourseCode } from "../utils/normalizeCourseCode";
import { sortCourses } from "../utils/sortAcademicProgramming";

/**
 * Agrupa secciones planas por código de asignatura normalizado.
 * @param {import('../types/academicProgramming').AcademicSection[]} sections
 * @returns {import('../types/academicProgramming').AcademicCourse[]}
 */
export function groupSectionsByCourse(sections) {
  /** @type {Map<string, import('../types/academicProgramming').AcademicCourse>} */
  const map = new Map();

  for (const section of sections || []) {
    const code = normalizeCourseCode(section.courseCode);
    if (!code) continue;

    let course = map.get(code);
    if (!course) {
      course = {
        courseCode: code,
        courseTitle: section.courseTitle || "",
        sections: [],
      };
      map.set(code, course);
    } else if (
      (!course.courseTitle || course.courseTitle.length < (section.courseTitle || "").length) &&
      section.courseTitle
    ) {
      // Preferir el título más completo si hay diferencias de truncado
      course.courseTitle = section.courseTitle;
    }

    course.sections.push(section);
  }

  return sortCourses([...map.values()]);
}
