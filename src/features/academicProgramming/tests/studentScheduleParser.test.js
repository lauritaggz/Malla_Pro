import { describe, expect, it } from "vitest";
import {
  extractStudentScheduleCourses,
  flattenStudentScheduleClasses,
  normalizeNrc,
  normalizeCodigo,
  normalizarSala,
  parseStudentScheduleText,
} from "../parsers/UnabStudentScheduleParser";

describe("normalize helpers", () => {
  it("normaliza código y NRC", () => {
    expect(normalizeCodigo(" cind113 ")).toBe("CIND113");
    expect(normalizeNrc(" 12345 ")).toBe("12345");
    expect(normalizeNrc("NRC-12345")).toBe("12345");
  });

  it("normaliza sala vacía a null", () => {
    expect(normalizarSala("-")).toBeNull();
    expect(normalizarSala("—")).toBeNull();
    expect(normalizarSala("")).toBeNull();
    expect(normalizarSala("R5-301")).toBe("R5-301");
  });
});

describe("parseStudentScheduleText", () => {
  it("parsea una asignatura con una franja", () => {
    const texto = `
      Asignatura CIND113 Gestión de la Cadena de Suministro - NRC 12345
      Horario: MA 10:20 A 11:50 R5-301
    `;
    const { ramos, clases } = parseStudentScheduleText(texto);
    expect(ramos).toHaveLength(1);
    expect(ramos[0]).toMatchObject({
      codigo: "CIND113",
      nrc: "12345",
      nombre: "Gestión de la Cadena de Suministro",
    });
    expect(ramos[0].meetings).toHaveLength(1);
    expect(ramos[0].meetings[0]).toMatchObject({
      dayCode: "MA",
      startTime: "10:20",
      endTime: "11:50",
      location: "R5-301",
    });
    expect(clases).toHaveLength(1);
  });

  it("parsea varias franjas separadas por ;", () => {
    const texto = `
      Asignatura CIND113 Gestión de la Cadena de Suministro - NRC 12345
      Horario: MA 10:20 A 11:50 R5-301; JU 10:20 A 11:50 R5-301
    `;
    const { ramos } = parseStudentScheduleText(texto);
    expect(ramos[0].meetings).toHaveLength(2);
    expect(ramos[0].meetings.map((m) => m.dayCode)).toEqual(["MA", "JU"]);
  });

  it("tolera sala vacía / guion", () => {
    const texto = `
      Asignatura CIND113 Algo - NRC 99999
      Horario: LU 08:30 A 09:50 -
    `;
    const { ramos } = parseStudentScheduleText(texto);
    expect(ramos).toHaveLength(1);
    expect(ramos[0].meetings[0].location).toBeNull();
  });

  it("normaliza espacios y saltos de línea raros", () => {
    const texto =
      "Asignatura   CIND113   Introducción   a   la   Bioquímica  -  NRC  55555\nHorario:  MA   8:30  A  09:50   R1-101";
    const { ramos } = parseStudentScheduleText(texto);
    expect(ramos[0].codigo).toBe("CIND113");
    expect(ramos[0].nrc).toBe("55555");
    expect(ramos[0].meetings[0].startTime).toBe("08:30");
  });

  it("separa múltiples asignaturas", () => {
    const texto = `
      Asignatura CIND113 Curso A - NRC 11111
      Horario: MA 10:20 A 11:50 R5-301
      Asignatura MAT101 Cálculo - NRC 22222
      Horario: LU 08:30 A 09:50 A1-201; MI 08:30 A 09:50 A1-201
    `;
    const { ramos, clases } = parseStudentScheduleText(texto);
    expect(ramos).toHaveLength(2);
    expect(ramos.map((r) => r.nrc).sort()).toEqual(["11111", "22222"]);
    expect(clases.length).toBe(3);
  });

  it("PDF sin formato compatible → vacío sin crash", () => {
    const { ramos, clases } = parseStudentScheduleText(
      "Este es un PDF cualquiera sin estructura de horario UNAB"
    );
    expect(ramos).toEqual([]);
    expect(clases).toEqual([]);
  });

  it("conserva unicode en nombres", () => {
    const texto = `
      Asignatura PSI101 Introducción a la Bioquímica - NRC 33333
      Horario: VI 14:00 A 15:30 -
    `;
    const { ramos } = extractStudentScheduleCourses(texto);
    expect(ramos[0].nombre).toContain("Bioquímica");
  });

  it("aplanar clases ordena por día y hora", () => {
    const { ramos } = parseStudentScheduleText(`
      Asignatura CIND113 Curso A - NRC 10001
      Horario: JU 12:00 A 13:00 S1; MA 09:00 A 10:00 S2
    `);
    expect(ramos).toHaveLength(1);
    const clases = flattenStudentScheduleClasses(ramos);
    expect(clases).toHaveLength(2);
    expect(clases[0].dia).toBe("MA");
    expect(clases[1].dia).toBe("JU");
  });

  it("fixture real UNAB: 4 ramos, corte entre páginas y Profesores/as", () => {
    // Texto típico del Horario Alumno (layout pdf.js), anonimizado
    const texto = `
Toma de Ramos
HORARIO ALUMNO
Asignatura INSW420 PRÁCTICA II - NRC 8553
Jornada: DIURNO   Tipo de asignatura: TEO - TEORIA   Créditos: 26
Modalidad: VIRTUAL   Fecha Inicio: 03/08/2026   Fecha Término: 28/11/2026
Horario: VI 15:50 A 17:30 -
Profesores/as: PROFESOR A
Asignatura INSW421 SEM DE LICEN EN INGENIERÍA - NRC 8555
Jornada: DIURNO   Tipo de asignatura: TAL - TALLER   Créditos: 14
Modalidad: VIRTUAL   Fecha Inicio: 03/08/2026   Fecha Término: 28/11/2026
Horario: LU 18:35 A 19:45 -
Profesores/as: PROFESOR B
Asignatura INSW422 PROYECTO DE TÍTULO - NRC 8563
Jornada: DIURNO   Tipo de asignatura: TAL - TALLER   Créditos: 14
Modalidad: VIRTUAL   Fecha Inicio: 03/08/2026   Fecha Término: 28/11/2026
Horario: VI 17:40 A 19:20 -
Profesores/as: PROFESOR C
Asignatura PTEC107 CIBERSEGURIDAD - NRC 8575
Jornada: DIURNO   Tipo de asignatura: TEO - TEORIA   Créditos: 14
Modalidad: PRESENCIAL   Fecha Inicio: 03/08/2026   Fecha Término: 28/11/2026
Horario: MA 18:35 A 19:45 VM-INF414 ; MI 17:40 A 19:20 VM-SAL615
Profesores/as: PROFESOR D / PROFESOR D
    `;
    const { ramos } = parseStudentScheduleText(texto);
    expect(ramos).toHaveLength(4);
    expect(ramos.map((r) => r.nrc).sort()).toEqual([
      "8553",
      "8555",
      "8563",
      "8575",
    ]);
    expect(ramos.find((r) => r.nrc === "8575")?.meetings).toHaveLength(2);
    expect(ramos.find((r) => r.nrc === "8553")?.meetings[0]).toMatchObject({
      dayCode: "VI",
      startTime: "15:50",
      endTime: "17:30",
      location: null,
    });
    expect(ramos.find((r) => r.nrc === "8575")?.meetings[0].location).toBe(
      "VM-INF414"
    );
    expect(ramos.find((r) => r.nrc === "8555")?.modality).toBe("VIRTUAL");
    expect(ramos.find((r) => r.nrc === "8575")?.modality).toBe("PRESENCIAL");
    expect(ramos.find((r) => r.nrc === "8555")?.meetings[0].isOnline).toBe(true);
  });

  it("no pierde ramos cuando todo viene en una sola línea (PDF flat)", () => {
    const texto =
      "Asignatura INSW420 PRÁCTICA II - NRC 8553 Jornada: DIURNO Horario: VI 15:50 A 17:30 - Profesores/as: A " +
      "Asignatura INSW421 SEM DE LICEN EN INGENIERÍA - NRC 8555 Horario: LU 18:35 A 19:45 - Profesores/as: B " +
      "Asignatura PTEC107 CIBERSEGURIDAD - NRC 8575 Horario: MA 18:35 A 19:45 VM-INF414 ; MI 17:40 A 19:20 VM-SAL615 Profesores/as: C";
    const { ramos } = parseStudentScheduleText(texto);
    expect(ramos).toHaveLength(3);
  });
});
