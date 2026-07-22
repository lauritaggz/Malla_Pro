import { DAY_ORDER } from "./parseMeetings";
import { normalizeCourseCode } from "./normalizeCourseCode";

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareSectionNumbers(a, b) {
  const na = Number.parseInt(String(a).replace(/\D/g, ""), 10);
  const nb = Number.parseInt(String(b).replace(/\D/g, ""), 10);

  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) {
    return na - nb;
  }

  return String(a).localeCompare(String(b), "es", { numeric: true });
}

/**
 * @param {import('../types/academicProgramming').AcademicMeeting} a
 * @param {import('../types/academicProgramming').AcademicMeeting} b
 * @returns {number}
 */
export function compareMeetings(a, b) {
  const dayA = DAY_ORDER.indexOf(a.dayCode);
  const dayB = DAY_ORDER.indexOf(b.dayCode);
  if (dayA !== dayB) return dayA - dayB;
  return String(a.startTime).localeCompare(String(b.startTime));
}

/**
 * @param {import('../types/academicProgramming').AcademicMeeting[]} meetings
 * @returns {import('../types/academicProgramming').AcademicMeeting[]}
 */
export function sortMeetings(meetings) {
  return [...(meetings || [])].sort(compareMeetings);
}

/**
 * @param {import('../types/academicProgramming').AcademicSection[]} sections
 * @returns {import('../types/academicProgramming').AcademicSection[]}
 */
export function sortSections(sections) {
  return [...(sections || [])]
    .map((section) => ({
      ...section,
      meetings: sortMeetings(section.meetings),
    }))
    .sort((a, b) => compareSectionNumbers(a.sectionNumber, b.sectionNumber));
}

/**
 * @param {import('../types/academicProgramming').AcademicCourse[]} courses
 * @returns {import('../types/academicProgramming').AcademicCourse[]}
 */
export function sortCourses(courses) {
  return [...(courses || [])]
    .map((course) => ({
      ...course,
      sections: sortSections(course.sections),
    }))
    .sort((a, b) =>
      normalizeCourseCode(a.courseCode).localeCompare(
        normalizeCourseCode(b.courseCode),
        "es",
        { numeric: true }
      )
    );
}

/**
 * @param {import('../types/academicProgramming').AcademicProgramming} programming
 * @returns {import('../types/academicProgramming').AcademicProgramming}
 */
export function sortAcademicProgramming(programming) {
  return {
    ...programming,
    courses: sortCourses(programming.courses || []),
  };
}
