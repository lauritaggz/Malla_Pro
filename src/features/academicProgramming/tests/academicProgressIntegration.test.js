import { describe, expect, it } from "vitest";
import {
  integrateProgrammingWithProgress,
  groupPreviousPendingBySemester,
} from "../services/academicProgressIntegration";

// Mock de Malla (Curriculum)
const mockCurriculum = {
  carrera: "Ingeniería de Prueba",
  totalSemestres: 6,
  semestres: [
    {
      numero: 1,
      cursos: [
        { id: 1, codigo: "PROG-1", nombre: "Programación I", prerrequisitos: [] },
        { id: 2, codigo: "MAT1", nombre: "Matemática I", prerrequisitos: [] }
      ]
    },
    {
      numero: 2,
      cursos: [
        { id: 3, codigo: "PROG2", nombre: "Programación II", prerrequisitos: [1] },
        { id: 4, codigo: "MAT2", nombre: "Matemática II", prerrequisitos: [2] }
      ]
    },
    {
      numero: 3,
      cursos: [
        { id: 5, codigo: "EDD", nombre: "Estructuras de Datos", prerrequisitos: [3] }
      ]
    },
    {
      numero: 4,
      cursos: [
        { id: 6, codigo: "BD", nombre: "Bases de Datos", prerrequisitos: [5] }
      ]
    },
    {
      numero: 5,
      cursos: [
        { id: 7, codigo: "ARQ", nombre: "Arquitectura", prerrequisitos: [6] }
      ]
    },
    {
      numero: 6,
      cursos: [
        { id: 8, codigo: "PROY", nombre: "Proyecto Final", prerrequisitos: [7] }
      ]
    }
  ]
};

// Mock de Malla con Menciones
const mockCurriculumWithMentions = {
  carrera: "Ingeniería con Mención",
  totalSemestres: 4,
  semestresComunes: [
    {
      numero: 1,
      cursos: [
        { id: 1, codigo: "COM1", nombre: "Común 1", prerrequisitos: [] }
      ]
    },
    {
      numero: 2,
      cursos: [
        { id: 2, codigo: "COM2", nombre: "Común 2", prerrequisitos: [] }
      ]
    }
  ],
  menciones: {
    INFO: {
      nombre: "Informática",
      semestres: [
        {
          numero: 3,
          cursos: [
            { id: 3, codigo: "INF3", nombre: "Informática 3", prerrequisitos: [2] }
          ]
        }
      ]
    },
    TELECO: {
      nombre: "Telecomunicaciones",
      semestres: [
        {
          numero: 3,
          cursos: [
            { id: 4, codigo: "TEL3", nombre: "Telecomunicaciones 3", prerrequisitos: [2] }
          ]
        }
      ]
    }
  }
};

describe("Integración Prog. Académica y Avance Curricular", () => {

  // 1. Usuario sin avance
  it("1. Usuario sin avance", () => {
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming: { courses: [] }
    });
    expect(result.curricularFrontier).toBe(1);
    expect(result.primarySemester).toBe(1);
  });

  // 2. Usuario con avance hasta 5.º semestre
  it("2. Usuario con avance hasta 5.º semestre", () => {
    // Aprobó curso id: 7 (semestre 5)
    const progressState = { aprobados: [7], excepciones: [], cursando: [] };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming: { courses: [] }
    });
    expect(result.curricularFrontier).toBe(6);
  });

  // 3. Frontera curricular igual al siguiente semestre
  it("3. Frontera curricular igual al siguiente semestre", () => {
    // Si aprueba el semestre 2 (id: 3 y 4), frontera debe ser 3
    const progressState = { aprobados: [1, 2, 3, 4], excepciones: [], cursando: [] };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming: { courses: [] }
    });
    expect(result.curricularFrontier).toBe(3);
  });

  // 4. Frontera limitada al último semestre
  it("4. Frontera limitada al último semestre", () => {
    // Aprobó semestre 6 (id: 8), frontera no debe pasar de 6
    const progressState = { aprobados: [1, 2, 3, 4, 5, 6, 7, 8], excepciones: [], cursando: [] };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming: { courses: [] }
    });
    expect(result.curricularFrontier).toBe(6);
  });

  // 5. Semestre principal con más pendientes
  it("5. Semestre principal con más pendientes", () => {
    // Semestre 1: 1 pendiente, Semestre 2: 2 pendientes. Frontera: 3
    const progressState = { aprobados: [1], excepciones: [], cursando: [] };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming: { courses: [] }
    });
    // Frontera: 2 (ya que max aprobado es sem 1, +1 = 2)
    // Resumen:
    // Semestre 1: total 2, aprobados 1, pendientes 1 (id 2)
    // Semestre 2: total 2, aprobados 0, pendientes 2 (id 3, 4)
    // Semestre con más pendientes en rango [1, 2]: Semestre 2.
    expect(result.primarySemester).toBe(2);
  });

  // 6. Empate resuelto a favor del semestre superior
  it("6. Empate resuelto a favor del semestre superior", () => {
    // Semestre 1: id 1 (aprobado), id 2 (pendiente) -> 1 pendiente
    // Semestre 2: id 3 (aprobado), id 4 (pendiente) -> 1 pendiente
    // Frontera: 3 (max aprobado es sem 2, +1 = 3)
    // En rango [1, 3], semestre 1 tiene 1 pendiente, semestre 2 tiene 1 pendiente, semestre 3 tiene 1 pendiente (id 5)
    // Empate de 1 pendiente en 1, 2, 3. Debe elegir 3.
    const progressState = { aprobados: [1, 3], excepciones: [], cursando: [] };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming: { courses: [] }
    });
    expect(result.primarySemester).toBe(3);
  });

  // 7. Semestres futuros fuera de la frontera
  it("7. Semestres futuros fuera de la frontera", () => {
    // Aprobados: ninguno. Frontera: 1.
    // Semestre 1: 2 pendientes
    // Semestre 2: 2 pendientes
    // Semestre 3: 1 pendiente
    // Aunque Semestre 2 tiene 2 pendientes (mismo que Semestre 1), el semestre principal no puede ser > frontera (1).
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming: { courses: [] }
    });
    expect(result.primarySemester).toBe(1);
  });

  // 8. Curso aprobado excluido de recomendaciones
  it("8. Curso aprobado excluido de recomendaciones", () => {
    const progressState = { aprobados: [1], excepciones: [], cursando: [] };
    const academicProgramming = {
      courses: [
        { courseCode: "PROG1", courseTitle: "Programación I", sections: [{ nrc: "100" }] }
      ]
    };
    // NOTA: PROG-1 normaliza a PROG1, que coincide
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.primarySemesterCourses).toHaveLength(0);
    expect(result.completedCourses).toHaveLength(1);
    expect(result.completedCourses[0].curriculumCourse.id).toBe(1);
  });

  // 9. Curso cursando excluido de recomendaciones
  it("9. Curso cursando excluido de recomendaciones", () => {
    const progressState = { aprobados: [], excepciones: [], cursando: [1] };
    const academicProgramming = {
      courses: [
        { courseCode: "PROG1", courseTitle: "Programación I", sections: [{ nrc: "100" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.primarySemesterCourses).toHaveLength(0);
    expect(result.inProgressCourses).toHaveLength(1);
    expect(result.inProgressCourses[0].curriculumCourse.id).toBe(1);
  });

  // 10. Curso convalidado tratado como completado
  it("10. Curso convalidado tratado como completado", () => {
    const progressState = { aprobados: [], excepciones: [1], cursando: [] };
    const academicProgramming = {
      courses: [
        { courseCode: "PROG1", courseTitle: "Programación I", sections: [{ nrc: "100" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.primarySemesterCourses).toHaveLength(0);
    expect(result.completedCourses).toHaveLength(1);
  });

  // 11. Curso del semestre principal habilitado
  it("11. Curso del semestre principal habilitado", () => {
    // Semestre principal: 2. Curso 3 (PROG2) tiene prereq [1]. Si 1 está aprobado, está habilitado.
    const progressState = { aprobados: [1], excepciones: [], cursando: [] };
    const academicProgramming = {
      courses: [
        { courseCode: "PROG2", courseTitle: "Programación II", sections: [{ nrc: "200" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.primarySemester).toBe(2);
    expect(result.primarySemesterCourses).toHaveLength(1);
    expect(result.primarySemesterCourses[0].category).toBe("PRIMARY_SEMESTER");
    expect(result.primarySemesterCourses[0].isEligible).toBe(true);
  });

  // 12. Curso del semestre principal bloqueado
  it("12. Curso del semestre principal bloqueado", () => {
    // Semestre principal: 2. Curso 3 (PROG2) tiene prereq [1]. Si 1 no está aprobado, está bloqueado.
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const academicProgramming = {
      courses: [
        { courseCode: "PROG2", courseTitle: "Programación II", sections: [{ nrc: "200" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.primarySemester).toBe(1); // sin avance -> semestre principal es 1
    // Forzamos que el semestre principal sea 2 simulando que el progreso nos lleva a 2
    // Pero si el semestre principal es 2 y PROG2 está bloqueado, se clasifica en PRIMARY_BLOCKED.
    // Para probar PRIMARY_BLOCKED, hacemos que el semestre principal sea 2 aprobando MAT1 (id: 2).
    // Así, el progreso en semestre 1 (MAT1 aprobado) pone la frontera en 2. Semestre 1 tiene 1 pendiente (PROG1), semestre 2 tiene 2 pendientes (PROG2, MAT2).
    // Con esto, el semestre principal con más pendientes es 2.
    // Y PROG2 (id: 3) tiene prerrequisito PROG1 (id: 1) que no está aprobado. Por ende, está bloqueado.
    const progressState2 = { aprobados: [2], excepciones: [], cursando: [] };
    const result2 = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState: progressState2,
      academicProgramming
    });
    expect(result2.primarySemester).toBe(2);
    expect(result2.primaryBlockedCourses).toHaveLength(1);
    expect(result2.primaryBlockedCourses[0].category).toBe("PRIMARY_BLOCKED");
    expect(result2.primaryBlockedCourses[0].isEligible).toBe(false);
  });

  // 13. Curso pendiente de semestre anterior
  it("13. Curso pendiente de semestre anterior", () => {
    // Semestre principal: 2. Curso 1 (PROG1) del semestre 1 está pendiente.
    const progressState = { aprobados: [2], excepciones: [], cursando: [] }; // Aprobó MAT1, frontera 2, semestre principal 2
    const academicProgramming = {
      courses: [
        { courseCode: "PROG1", courseTitle: "Programación I", sections: [{ nrc: "100" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.primarySemester).toBe(2);
    expect(result.previousPendingCourses).toHaveLength(1);
    expect(result.previousPendingCourses[0].category).toBe("PREVIOUS_PENDING");
  });

  // 14. Curso futuro habilitado
  it("14. Curso futuro habilitado", () => {
    const adHocCurriculum = {
      totalSemestres: 3,
      semestres: [
        {
          numero: 1,
          cursos: [{ id: 1, codigo: "C1", nombre: "C1", prerrequisitos: [] }]
        },
        {
          numero: 2,
          cursos: [
            { id: 2, codigo: "C2", nombre: "C2", prerrequisitos: [] }, // Futuro sin prereqs!
            { id: 3, codigo: "C3", nombre: "C3", prerrequisitos: [1] }
          ]
        }
      ]
    };
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const academicProgramming = {
      courses: [
        { courseCode: "C2", courseTitle: "C2", sections: [{ nrc: "200" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: adHocCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.primarySemester).toBe(1);
    expect(result.futureEligibleCourses).toHaveLength(1);
    expect(result.futureEligibleCourses[0].category).toBe("FUTURE_ELIGIBLE");
  });

  // 15. Curso futuro bloqueado
  it("15. Curso futuro bloqueado", () => {
    // Semestre principal: 1. Curso de semestre 2 que requiere un curso de semestre 1 no aprobado.
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const academicProgramming = {
      courses: [
        { courseCode: "PROG2", courseTitle: "Programación II", sections: [{ nrc: "200" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.primarySemester).toBe(1);
    expect(result.futureBlockedCourses).toHaveLength(1);
    expect(result.futureBlockedCourses[0].category).toBe("FUTURE_BLOCKED");
  });

  // 16. Curso sin coincidencia
  it("16. Curso sin coincidencia", () => {
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const academicProgramming = {
      courses: [
        { courseCode: "XYZ999", courseTitle: "Desconocido", sections: [{ nrc: "999" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.unmatchedCourses).toHaveLength(1);
    expect(result.unmatchedCourses[0].courseCode).toBe("XYZ999");
  });

  // 17. Coincidencia exacta por código
  it("17. Coincidencia exacta por código", () => {
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const academicProgramming = {
      courses: [
        { courseCode: "MAT1", courseTitle: "Matemática I", sections: [{ nrc: "101" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.primarySemesterCourses).toHaveLength(1);
    expect(result.primarySemesterCourses[0].curriculumCourse.codigo).toBe("MAT1");
  });

  // 18. Coincidencia mediante alias
  it("18. Coincidencia mediante alias", () => {
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const academicProgramming = {
      courses: [
        { courseCode: "MATE1", courseTitle: "Matemática Especial", sections: [{ nrc: "102" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming,
      courseCodeAliases: {
        "MAT1": ["MATE1"]
      }
    });
    expect(result.primarySemesterCourses).toHaveLength(1);
    expect(result.primarySemesterCourses[0].curriculumCourse.codigo).toBe("MAT1");
    expect(result.primarySemesterCourses[0].programmingCourse.courseCode).toBe("MATE1");
  });

  // 19. Código normalizado con espacios y guiones
  it("19. Código normalizado con espacios y guiones", () => {
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    // Malla tiene "PROG-1" -> normaliza a "PROG1"
    // PDF tiene "prog 1" o "PROG 1" -> normaliza a "PROG1"
    const academicProgramming = {
      courses: [
        { courseCode: "prog 1", courseTitle: "Programación I", sections: [{ nrc: "103" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.primarySemesterCourses).toHaveLength(1);
    expect(result.primarySemesterCourses[0].curriculumCourse.codigo).toBe("PROG-1");
  });

  // 20. Varias secciones conservadas después del matching
  it("20. Varias secciones conservadas después del matching", () => {
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const academicProgramming = {
      courses: [
        {
          courseCode: "MAT1",
          courseTitle: "Matemática I",
          sections: [
            { nrc: "101", sectionNumber: "1" },
            { nrc: "102", sectionNumber: "2" }
          ]
        }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming
    });
    expect(result.primarySemesterCourses).toHaveLength(1);
    expect(result.primarySemesterCourses[0].programmingCourse.sections).toHaveLength(2);
  });

  // 21. Asignatura pendiente no encontrada en el PDF
  it("21. Asignatura pendiente no encontrada en el PDF", () => {
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState,
      academicProgramming: { courses: [] }
    });
    expect(result.missingFromProgramming).toHaveLength(2);
    expect(result.missingFromProgramming[0].scope).toBe("PRIMARY");
  });

  // 22. Cambio de avance sin volver a parsear el documento
  it("22. Cambio de avance sin volver a parsear el documento", () => {
    const academicProgramming = {
      courses: [
        { courseCode: "PROG1", courseTitle: "Programación I", sections: [{ nrc: "100" }] }
      ]
    };
    const progress1 = { aprobados: [], excepciones: [], cursando: [] };
    const r1 = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState: progress1,
      academicProgramming
    });
    expect(r1.primarySemesterCourses).toHaveLength(1);

    const progress2 = { aprobados: [1], excepciones: [], cursando: [] };
    const r2 = integrateProgrammingWithProgress({
      curriculum: mockCurriculum,
      progressState: progress2,
      academicProgramming
    });
    expect(r2.primarySemesterCourses).toHaveLength(0);
    expect(r2.completedCourses).toHaveLength(1);
  });

  // 23. Malla con mención activa
  it("23. Malla con mención activa", () => {
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const academicProgramming = {
      courses: [
        { courseCode: "INF3", courseTitle: "Informática 3", sections: [{ nrc: "301" }] },
        { courseCode: "TEL3", courseTitle: "Telecomunicaciones 3", sections: [{ nrc: "302" }] }
      ]
    };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculumWithMentions,
      progressState,
      academicProgramming,
      mentionCode: "INFO"
    });
    expect(result.futureBlockedCourses.some(c => c.curriculumCourse.codigo === "INF3")).toBe(true);
    expect(result.futureBlockedCourses.some(c => c.curriculumCourse.codigo === "TEL3")).toBe(false);
  });

  // 24. Exclusión de una mención no seleccionada
  it("24. Exclusión de una mención no seleccionada", () => {
    const progressState = { aprobados: [], excepciones: [], cursando: [] };
    const result = integrateProgrammingWithProgress({
      curriculum: mockCurriculumWithMentions,
      progressState,
      academicProgramming: { courses: [] },
      mentionCode: "INFO"
    });
    const tel3InMissing = result.missingFromProgramming.some(m => m.curriculumCourse.codigo === "TEL3");
    expect(tel3InMissing).toBe(false);
  });

  // 25. Orden de semestres anteriores descendente
  it("25. Orden de semestres anteriores descendente", () => {
    const courses = [
      {
        semester: 1,
        curriculumCourse: { orderIndex: 1, codigo: "C1" },
        programmingCourse: {},
        category: "PREVIOUS_PENDING"
      },
      {
        semester: 2,
        curriculumCourse: { orderIndex: 2, codigo: "C2" },
        programmingCourse: {},
        category: "PREVIOUS_PENDING"
      }
    ];
    const grouped = groupPreviousPendingBySemester(courses);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].semester).toBe(2);
    expect(grouped[1].semester).toBe(1);
  });

});
