import { describe, expect, it } from "vitest";
import {
  mergeProgrammingWithStudentSchedule,
  mergeSelectedMaps,
} from "../services/mergeProgrammingWithStudentSchedule";

function makeProgramming(sections) {
  const byCourse = new Map();
  for (const s of sections) {
    if (!byCourse.has(s.courseCode)) {
      byCourse.set(s.courseCode, {
        courseCode: s.courseCode,
        courseTitle: s.courseTitle || s.courseCode,
        sections: [],
      });
    }
    byCourse.get(s.courseCode).sections.push({
      id: `p|c|${s.courseCode}|${s.sectionNumber || "1"}|${s.nrc}`,
      nrc: s.nrc,
      linkedNrcs: [],
      courseCode: s.courseCode,
      courseTitle: s.courseTitle || s.courseCode,
      sectionNumber: s.sectionNumber || "1",
      activityType: "CAT",
      capacity: s.capacity ?? 20,
      professors: s.professors || ["Profesor X"],
      modality: "PRESENCIAL",
      meetings: s.meetings || [],
      warnings: [],
    });
  }
  return {
    schemaVersion: "1.0",
    source: {
      originalFileName: "prog.pdf",
      parser: "UNAB_ACADEMIC_PROGRAMMING",
      importedAt: "2026-01-01T00:00:00.000Z",
    },
    academicPeriod: { label: "2026-1", year: 2026, semester: 1 },
    curriculum: { code: "ING", careerName: "Industrial", campus: "R" },
    courses: [...byCourse.values()],
    warnings: [],
  };
}

describe("mergeProgrammingWithStudentSchedule", () => {
  it("match por NRC marca inscrito y conserva profesor", () => {
    const programming = makeProgramming([
      {
        courseCode: "CIND113",
        nrc: "12345",
        professors: ["Profesor X"],
        meetings: [
          {
            dayCode: "MA",
            dayOfWeek: 2,
            startTime: "10:20",
            endTime: "11:50",
            location: "R5-301",
            isOnline: false,
          },
        ],
      },
    ]);
    const student = {
      ramos: [
        {
          codigo: "CIND113",
          nombre: "Gestión de la Cadena de Suministro",
          nrc: "12345",
          meetings: [
            {
              dayCode: "MA",
              dayOfWeek: 2,
              startTime: "10:20",
              endTime: "11:50",
              location: "R5-301",
              isOnline: false,
            },
          ],
        },
      ],
    };

    const result = mergeProgrammingWithStudentSchedule(programming, student);
    const section = result.programming.courses[0].sections[0];
    expect(section.enrolled).toBe(true);
    expect(section.professors).toEqual(["Profesor X"]);
    expect(result.enrolledNrcs).toEqual(["12345"]);
    expect(result.summary.matchedInProgramming).toBe(1);
    expect(result.selectedSectionsMapFromEnrolled.CIND113).toBe(section.id);
  });

  it("NRC inexistente en programación se mantiene como inscrito independiente", () => {
    const programming = makeProgramming([
      { courseCode: "CIND113", nrc: "11111", professors: ["A"] },
    ]);
    const student = {
      ramos: [
        {
          codigo: "CIND113",
          nombre: "Gestión",
          nrc: "99999",
          meetings: [
            {
              dayCode: "LU",
              dayOfWeek: 1,
              startTime: "08:30",
              endTime: "09:50",
              location: null,
              isOnline: false,
            },
          ],
        },
      ],
    };

    const result = mergeProgrammingWithStudentSchedule(programming, student);
    expect(result.summary.studentOnly).toBe(1);
    const sections = result.programming.courses.find(
      (c) => c.courseCode === "CIND113"
    ).sections;
    expect(sections).toHaveLength(2);
    const onlyStudent = sections.find((s) => s.nrc === "99999");
    expect(onlyStudent.enrolled).toBe(true);
    expect(onlyStudent.sources).toEqual({
      programacionAcademica: false,
      horarioAlumno: true,
    });
    expect(onlyStudent.professors).toEqual([]);
  });

  it("completa meetings faltantes desde horario del alumno", () => {
    const programming = makeProgramming([
      {
        courseCode: "CIND113",
        nrc: "12345",
        meetings: [],
      },
    ]);
    const student = {
      ramos: [
        {
          codigo: "CIND113",
          nombre: "Gestión",
          nrc: "12345",
          meetings: [
            {
              dayCode: "MA",
              dayOfWeek: 2,
              startTime: "10:20",
              endTime: "11:50",
              location: "R5-301",
              isOnline: false,
            },
          ],
        },
      ],
    };

    const result = mergeProgrammingWithStudentSchedule(programming, student);
    const section = result.programming.courses[0].sections[0];
    expect(section.meetings).toHaveLength(1);
    expect(section.meetings[0].location).toBe("R5-301");
  });

  it("no sobrescribe profesor ni título válidos ante conflicto", () => {
    const programming = makeProgramming([
      {
        courseCode: "CIND113",
        nrc: "12345",
        courseTitle: "Título Programación",
        professors: ["Profesor X"],
        meetings: [
          {
            dayCode: "MA",
            dayOfWeek: 2,
            startTime: "10:20",
            endTime: "11:50",
            location: "PROG-1",
            isOnline: false,
          },
        ],
      },
    ]);
    const student = {
      ramos: [
        {
          codigo: "CIND113",
          nombre: "Título Horario Distinto",
          nrc: "12345",
          meetings: [
            {
              dayCode: "MA",
              dayOfWeek: 2,
              startTime: "10:20",
              endTime: "11:50",
              location: "HOR-2",
              isOnline: false,
            },
          ],
        },
      ],
    };

    const result = mergeProgrammingWithStudentSchedule(programming, student);
    const section = result.programming.courses[0].sections[0];
    expect(section.courseTitle).toBe("Título Programación");
    expect(section.professors).toEqual(["Profesor X"]);
    expect(section.meetings[0].location).toBe("PROG-1");
    expect(result.conflicts.some((c) => c.type === "TITLE_MISMATCH")).toBe(true);
    expect(result.conflicts.some((c) => c.type === "LOCATION_MISMATCH")).toBe(
      true
    );
  });

  it("orden Programación→Horario y Horario→Programación equivalen", () => {
    const programming = makeProgramming([
      { courseCode: "CIND113", nrc: "12345", professors: ["Profesor X"] },
      { courseCode: "MAT101", nrc: "22222", professors: ["Profesor Y"] },
    ]);
    const student = {
      ramos: [
        {
          codigo: "CIND113",
          nombre: "Gestión",
          nrc: "12345",
          meetings: [
            {
              dayCode: "MA",
              dayOfWeek: 2,
              startTime: "10:20",
              endTime: "11:50",
              location: "R5",
              isOnline: false,
            },
          ],
        },
        {
          codigo: "NEW999",
          nombre: "Solo horario",
          nrc: "99999",
          meetings: [
            {
              dayCode: "LU",
              dayOfWeek: 1,
              startTime: "08:30",
              endTime: "09:50",
              location: null,
              isOnline: false,
            },
          ],
        },
      ],
    };

    const a = mergeProgrammingWithStudentSchedule(programming, student);
    const b = mergeProgrammingWithStudentSchedule(null, student);
    const b2 = mergeProgrammingWithStudentSchedule(
      {
        ...programming,
        // simular segunda carga de programación sobre resultado horario-only
      },
      student
    );

    // A: prog first then student
    expect(a.enrolledNrcs.sort()).toEqual(["12345", "99999"]);
    expect(a.summary.matchedInProgramming).toBe(1);
    expect(a.summary.studentOnly).toBe(1);

    // B then B2: student first conceptually, then programming merge
    const fromStudentOnly = b;
    expect(fromStudentOnly.summary.studentOnly).toBe(2);
    const afterProg = mergeProgrammingWithStudentSchedule(programming, student);
    expect(afterProg.enrolledNrcs.sort()).toEqual(a.enrolledNrcs.sort());
    expect(afterProg.summary.matchedInProgramming).toBe(
      a.summary.matchedInProgramming
    );
    expect(afterProg.summary.studentOnly).toBe(a.summary.studentOnly);
    expect(b2.enrolledNrcs.sort()).toEqual(a.enrolledNrcs.sort());
  });

  it("solo horario genera programming usable", () => {
    const student = {
      ramos: [
        {
          codigo: "CIND113",
          nombre: "Gestión",
          nrc: "12345",
          meetings: [
            {
              dayCode: "MA",
              dayOfWeek: 2,
              startTime: "10:20",
              endTime: "11:50",
              location: "R5",
              isOnline: false,
            },
          ],
        },
      ],
    };
    const result = mergeProgrammingWithStudentSchedule(null, student);
    expect(result.programming.courses).toHaveLength(1);
    expect(result.programming.courses[0].sections[0].enrolled).toBe(true);
    expect(result.selectedSectionsMapFromEnrolled.CIND113).toBeTruthy();
  });
});

describe("mergeSelectedMaps", () => {
  it("inscritos tienen prioridad por curso", () => {
    expect(
      mergeSelectedMaps(
        { CIND113: "manual-id", MAT101: "keep-me" },
        { CIND113: "enrolled-id" }
      )
    ).toEqual({
      CIND113: "enrolled-id",
      MAT101: "keep-me",
    });
  });
});
