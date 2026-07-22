/**
 * @typedef {"1.0"} SchemaVersion
 *
 * @typedef {"PRESENCIAL" | "VIRTUAL" | "E_LEARNING" | "BLENDED" | "UNKNOWN"} Modality
 *
 * @typedef {"LU" | "MA" | "MI" | "JU" | "VI" | "SA" | "DO"} DayCode
 *
 * @typedef {1 | 2 | 3 | 4 | 5 | 6 | 7} DayOfWeek
 *
 * @typedef {Object} AcademicMeeting
 * @property {DayCode} dayCode
 * @property {DayOfWeek} dayOfWeek
 * @property {string} startTime
 * @property {string} endTime
 * @property {string | null} location
 * @property {boolean} isOnline
 *
 * @typedef {Object} SectionRawFields
 * @property {string} nrc
 * @property {string} linkedNrcs
 * @property {string} activityType
 * @property {string} courseCode
 * @property {string} sectionNumber
 * @property {string} courseTitle
 * @property {string} capacity
 * @property {string} professors
 * @property {string} schedule
 * @property {string} modality
 *
 * @typedef {Object} AcademicSection
 * @property {string} id
 * @property {string} nrc
 * @property {string[]} linkedNrcs
 * @property {string} courseCode
 * @property {string} courseTitle
 * @property {string} sectionNumber
 * @property {string} activityType
 * @property {number | null} capacity
 * @property {string[]} professors
 * @property {Modality} modality
 * @property {AcademicMeeting[]} meetings
 * @property {SectionRawFields} raw
 * @property {string[]} warnings
 *
 * @typedef {Object} AcademicCourse
 * @property {string} courseCode
 * @property {string} courseTitle
 * @property {AcademicSection[]} sections
 *
 * @typedef {Object} ParserWarning
 * @property {number} [page]
 * @property {string} [sectionNrc]
 * @property {string} type
 * @property {string} message
 *
 * @typedef {Object} AcademicProgramming
 * @property {SchemaVersion} schemaVersion
 * @property {{ originalFileName: string, parser: string, importedAt: string }} source
 * @property {{ label: string, year: number | null, semester: 1 | 2 | null }} academicPeriod
 * @property {{ code: string | null, careerName: string | null, campus: string | null }} curriculum
 * @property {AcademicCourse[]} courses
 * @property {ParserWarning[]} warnings
 */

export {};
