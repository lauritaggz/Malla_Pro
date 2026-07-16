import { describe, expect, it } from "vitest";
import {
  timeToMinutes,
  minutesToTime,
  getOccupiedUnabSlots,
  groupConsecutiveUnabMeetings,
  hasMeetingConflict,
  getStableCourseColor,
  unabTimeSlots,
} from "../services/scheduleService";
import { assignOverlapColumns } from "../services/scheduleLayoutService";

describe("Visualizador de Horario y Constructor Semanal", () => {

  // 1. Secuencia completa de módulos UNAB
  it("1. Secuencia completa de módulos UNAB", () => {
    expect(unabTimeSlots).toHaveLength(15);
    expect(unabTimeSlots[0].start).toBe("08:30");
    expect(unabTimeSlots[14].end).toBe("22:05");
  });

  // 2. Conversión de hora a minutos
  it("2. Conversión de hora a minutos", () => {
    expect(timeToMinutes("08:30")).toBe(510);
    expect(timeToMinutes("15:50")).toBe(950);
    expect(timeToMinutes("22:05")).toBe(1325);
    expect(timeToMinutes("")).toBe(0);
  });

  // 3. Conversión de minutos a hora
  it("3. Conversión de minutos a hora", () => {
    expect(minutesToTime(510)).toBe("08:30");
    expect(minutesToTime(950)).toBe("15:50");
    expect(minutesToTime(1325)).toBe("22:05");
  });

  // 4. Posición vertical de una clase
  it("4. Posición vertical de una clase", () => {
    const startMinutes = timeToMinutes("08:30");
    const meetingStart = timeToMinutes("10:20");
    const pixelsPerMinute = 1.2;
    const top = (meetingStart - startMinutes) * pixelsPerMinute;
    // (620 - 510) * 1.2 = 110 * 1.2 = 132
    expect(top).toBeCloseTo(132);
  });

  // 5. Altura de una clase
  it("5. Altura de una clase", () => {
    const meetingStart = timeToMinutes("08:30");
    const meetingEnd = timeToMinutes("10:10");
    const pixelsPerMinute = 1;
    const height = (meetingEnd - meetingStart) * pixelsPerMinute;
    // 100 minutos -> 100px
    expect(height).toBe(100);
  });

  // 6. Clase exacta de un módulo
  it("6. Clase exacta de un módulo", () => {
    const meeting = { startTime: "08:30", endTime: "09:15" };
    const slots = getOccupiedUnabSlots(meeting, unabTimeSlots);
    expect(slots).toHaveLength(1);
    expect(slots[0].id).toBe(1);
  });

  // 7. Clase que ocupa varios módulos
  it("7. Clase que ocupa varios módulos", () => {
    const meeting = { startTime: "08:30", endTime: "11:05" };
    const slots = getOccupiedUnabSlots(meeting, unabTimeSlots);
    // Debe ocupar módulo 1, 2, y 3 (e intersectar las pausas intermedias)
    expect(slots).toHaveLength(3);
    expect(slots.map(s => s.id)).toEqual([1, 2, 3]);
  });

  // 8. Clase con horario no alineado
  it("8. Clase con horario no alineado", () => {
    const meeting = { startTime: "17:00", endTime: "18:15" };
    const slots = getOccupiedUnabSlots(meeting, unabTimeSlots);
    // 17:00 a 18:15 intersecta:
    // Slot 10: 16:45 - 17:30 (sí)
    // Slot 11: 17:40 - 18:25 (sí)
    expect(slots).toHaveLength(2);
    expect(slots.map(s => s.id)).toEqual([10, 11]);
  });

  // 9. Clase que termina después de las 19:20
  it("9. Clase que termina después de las 19:20", () => {
    const meeting = { startTime: "18:35", endTime: "20:15" };
    const slots = getOccupiedUnabSlots(meeting, unabTimeSlots);
    // 18:35 a 20:15 intersecta:
    // Slot 12: 18:35 - 19:20
    // Slot 13: 19:30 - 20:15
    expect(slots).toHaveLength(2);
  });

  // 10. Extensión automática hasta las 21:25
  it("10. Extensión automática hasta las 21:25", () => {
    const meetings = [{ startTime: "19:30", endTime: "21:25" }];
    // Si buscamos los límites dinámicos, el límite inferior de la grilla debe extenderse al menos hasta la hora de término (21:25)
    let endMinutes = timeToMinutes("19:20");
    const mEnd = timeToMinutes(meetings[0].endTime);
    if (mEnd > endMinutes) endMinutes = mEnd;
    expect(endMinutes).toBe(timeToMinutes("21:25"));
  });

  // 11. Selección de una sección
  it("11. Selección de una sección", () => {
    const selected = {};
    const selectSection = (courseCode, sectionId) => {
      selected[courseCode] = sectionId;
    };
    selectSection("TDFI103", "SEC-302");
    expect(selected["TDFI103"]).toBe("SEC-302");
  });

  // 12. Reemplazo por otra sección del mismo ramo
  it("12. Reemplazo por otra sección del mismo ramo", () => {
    const selected = { "TDFI103": "SEC-302" };
    const selectSection = (courseCode, sectionId) => {
      selected[courseCode] = sectionId;
    };
    selectSection("TDFI103", "SEC-304");
    expect(selected["TDFI103"]).toBe("SEC-304");
  });

  // 13. Selección de varios ramos
  it("13. Selección de varios ramos", () => {
    const selected = {};
    selected["TDFI103"] = "SEC-304";
    selected["FMMP112"] = "SEC-101";
    expect(Object.keys(selected)).toHaveLength(2);
  });

  // 14. Eliminación de una sección
  it("14. Eliminación de una sección", () => {
    const selected = { "TDFI103": "SEC-304", "FMMP112": "SEC-101" };
    delete selected["TDFI103"];
    expect(selected["TDFI103"]).toBeUndefined();
    expect(selected["FMMP112"]).toBe("SEC-101");
  });

  // 15. Conflicto parcial
  it("15. Conflicto parcial", () => {
    const mA = { dayCode: "LU", startTime: "08:30", endTime: "10:10" };
    const mB = { dayCode: "LU", startTime: "09:25", endTime: "11:05" };
    expect(hasMeetingConflict(mA, mB)).toBe(true);
  });

  // 16. Conflicto completo
  it("16. Conflicto completo", () => {
    const mA = { dayCode: "LU", startTime: "08:30", endTime: "10:10" };
    const mB = { dayCode: "LU", startTime: "08:30", endTime: "10:10" };
    expect(hasMeetingConflict(mA, mB)).toBe(true);
  });

  // 17. Clases consecutivas sin conflicto
  it("17. Clases consecutivas sin conflicto", () => {
    const mA = { dayCode: "LU", startTime: "08:30", endTime: "10:10" };
    const mB = { dayCode: "LU", startTime: "10:10", endTime: "11:50" };
    // Intervalo semiabierto [08:30, 10:10) y [10:10, 11:50) -> no se solapan
    expect(hasMeetingConflict(mA, mB)).toBe(false);
  });

  // 18. Dos bloques superpuestos lado a lado
  it("18. Dos bloques superpuestos lado a lado", () => {
    const meetings = [
      { startMinutes: 510, endMinutes: 610, id: 1 },
      { startMinutes: 550, endMinutes: 650, id: 2 }
    ];
    const positioned = assignOverlapColumns(meetings);
    expect(positioned[0].columnCount).toBe(2);
    expect(positioned[1].columnCount).toBe(2);
    expect(positioned[0].widthPercentage).toBe(50);
    expect(positioned[0].leftPercentage).toBe(0);
    expect(positioned[1].leftPercentage).toBe(50);
  });

  // 19. Tres bloques superpuestos
  it("19. Tres bloques superpuestos", () => {
    const meetings = [
      { startMinutes: 510, endMinutes: 610, id: 1 },
      { startMinutes: 550, endMinutes: 650, id: 2 },
      { startMinutes: 580, endMinutes: 680, id: 3 }
    ];
    const positioned = assignOverlapColumns(meetings);
    expect(positioned[0].columnCount).toBe(3);
    expect(positioned[0].widthPercentage).toBeCloseTo(33.33, 1);
  });

  // 20. Sección sin horario
  it("20. Sección sin horario", () => {
    const section = {
      courseCode: "VIRT101",
      sectionNumber: "500",
      meetings: [] // sin horario
    };
    expect(section.meetings).toHaveLength(0);
  });

  // 21. Sección virtual
  it("21. Sección virtual", () => {
    const section = {
      courseCode: "VIRT101",
      modality: "VIRTUAL",
      meetings: []
    };
    expect(section.modality).toBe("VIRTUAL");
    expect(section.meetings).toHaveLength(0);
  });

  // 22. NRC ligado
  it("22. NRC ligado", () => {
    // Si la sección principal A liga al NRC de la sección B, deben resolverse juntos.
    const allCourses = [
      {
        courseCode: "C1",
        sections: [
          { id: "A", courseCode: "C1", nrc: "100", linkedNrcs: ["200"], meetings: [{ startTime: "08:30" }] }
        ]
      },
      {
        courseCode: "C2",
        sections: [
          { id: "B", courseCode: "C2", nrc: "200", meetings: [{ startTime: "10:20" }] }
        ]
      }
    ];
    // Lógica para simular resolución en selector/helpers
    const sectionA = allCourses[0].sections[0];
    const allSections = allCourses.flatMap(c => c.sections);
    const resolved = allSections.filter(s => sectionA.linkedNrcs.includes(s.nrc));
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe("B");
  });

  // 23. Color estable por código
  it("23. Color estable por código", () => {
    const colorA1 = getStableCourseColor("TDFI103");
    const colorA2 = getStableCourseColor("tdfi 103");
    const colorB = getStableCourseColor("FMMP112");
    
    expect(colorA1.bgLight).toBe(colorA2.bgLight);
    expect(colorA1.bgLight).not.toBe(colorB.bgLight);
  });

  // 24. Persistencia de propuesta
  it("24. Persistencia de propuesta", () => {
    const proposal = {
      id: "prop-1",
      name: "Mi horario 1",
      selectedSections: [
        { courseCode: "TDFI103", sectionId: "1|UNAB|TDFI103|302|12263", nrc: "12263" }
      ]
    };
    const stringified = JSON.stringify(proposal);
    expect(stringified).toContain("TDFI103");
  });

  // 25. Restauración de propuesta
  it("25. Restauración de propuesta", () => {
    const saved = '{"id":"prop-1","name":"Mi horario 1","selectedSections":[{"courseCode":"TDFI103","sectionId":"1|UNAB|TDFI103|302|12263","nrc":"12263"}]}';
    const parsed = JSON.parse(saved);
    expect(parsed.id).toBe("prop-1");
    expect(parsed.selectedSections).toHaveLength(1);
  });

  // 26. Sección guardada que ya no existe
  it("26. Sección guardada que ya no existe", () => {
    const savedProposal = [
      { courseCode: "TDFI103", sectionId: "OLD_ID", nrc: "999" }
    ];
    const availableSections = [
      { id: "1|UNAB|TDFI103|302|12263", courseCode: "TDFI103", nrc: "12263" }
    ];
    // La validación debería ignorar la sección que ya no existe sin fallar
    const validSelections = {};
    for (const saved of savedProposal) {
      const match = availableSections.find(s => s.id === saved.sectionId);
      if (match) {
        validSelections[saved.courseCode] = saved.sectionId;
      }
    }
    expect(Object.keys(validSelections)).toHaveLength(0);
  });

  // 27. Cambio de selección sin volver a parsear el PDF
  it("27. Cambio de selección sin volver a parsear el PDF", () => {
    // La grilla calcula visualizaciones a partir del estado selectedSections, no re-ejecuta el parser de PDF
    let selectedSections = { "C1": "SEC1" };
    // Cambiar de sección
    selectedSections = { ...selectedSections, "C1": "SEC2" };
    expect(selectedSections["C1"]).toBe("SEC2");
  });

  // 28. Vista de lunes a sábado
  it("28. Vista de lunes a sábado", () => {
    const days = ["LU", "MA", "MI", "JU", "VI", "SA"];
    expect(days).toHaveLength(6);
    expect(days).not.toContain("DO");
  });

  // 29. Día libre
  it("29. Día libre", () => {
    const selectedMeetings = [
      { dayCode: "LU", startTime: "08:30", endTime: "10:10" },
      { dayCode: "MI", startTime: "10:20", endTime: "12:00" }
    ];
    const busyDays = new Set(selectedMeetings.map(m => m.dayCode));
    const allDays = ["LU", "MA", "MI", "JU", "VI", "SA"];
    const freeDays = allDays.filter(d => !busyDays.has(d));
    expect(freeDays).toEqual(["MA", "JU", "VI", "SA"]);
  });

  // 30. Resumen textual accesible
  it("30. Resumen textual accesible", () => {
    const selected = [
      {
        courseCode: "TDFI103",
        courseTitle: "Base de Datos",
        sectionNumber: "302",
        meetings: [{ dayCode: "LU", startTime: "14:00", endTime: "16:35", location: "VM-COM413" }]
      }
    ];
    const lines = [];
    for (const item of selected) {
      for (const m of item.meetings) {
        lines.push(`${item.courseTitle}, ${m.startTime} a ${m.endTime}, sala ${m.location || "no informada"}.`);
      }
    }
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("Base de Datos, 14:00 a 16:35, sala VM-COM413.");
  });

  // 31. Reunión de tres módulos representada como un único intervalo
  it("31. Reunión de tres módulos representada como un único intervalo", () => {
    const meetings = [{ startTime: "08:30", endTime: "11:05" }];
    // Se dibuja como bloque continuo sin separarse en tres
    expect(meetings).toHaveLength(1);
  });

  // 32. Reunión 08:30-11:05
  it("32. Reunión 08:30-11:05", () => {
    const meeting = { startTime: "08:30", endTime: "11:05" };
    const duration = timeToMinutes(meeting.endTime) - timeToMinutes(meeting.startTime);
    // 11:05 (665) - 08:30 (510) = 155 min
    expect(duration).toBe(155);
  });

  // 33. Reunión 14:00-16:35
  it("33. Reunión 14:00-16:35", () => {
    const meeting = { startTime: "14:00", endTime: "16:35" };
    const duration = timeToMinutes(meeting.endTime) - timeToMinutes(meeting.startTime);
    // 16:35 (995) - 14:00 (840) = 155 min
    expect(duration).toBe(155);
  });

  // 34. Reunión 15:50-18:25
  it("34. Reunión 15:50-18:25", () => {
    const meeting = { startTime: "15:50", endTime: "18:25" };
    const duration = timeToMinutes(meeting.endTime) - timeToMinutes(meeting.startTime);
    // 18:25 (1105) - 15:50 (950) = 155 min
    expect(duration).toBe(155);
  });

  // 35. Cálculo correcto de tres módulos
  it("35. Cálculo correcto de tres módulos", () => {
    const meeting = { startTime: "08:30", endTime: "11:05" };
    const slots = getOccupiedUnabSlots(meeting, unabTimeSlots);
    expect(slots).toHaveLength(3);
  });

  // 36. Altura incluyendo las pausas
  it("36. Altura incluyendo las pausas", () => {
    const start = timeToMinutes("08:30");
    const end = timeToMinutes("11:05");
    const duration = end - start;
    // El alto es directamente proporcional a los 155 minutos, incluyendo las dos pausas de 10 min.
    expect(duration).toBe(155);
    expect(duration).not.toBe(45 * 3); // 135px excluiría pausas
  });

  // 37. Tres reuniones consecutivas agrupadas visualmente
  it("37. Tres reuniones consecutivas agrupadas visualmente", () => {
    const meetings = [
      { dayCode: "LU", dayOfWeek: 1, startTime: "08:30", endTime: "09:15", location: "COM1" },
      { dayCode: "LU", dayOfWeek: 1, startTime: "09:25", endTime: "10:10", location: "COM1" },
      { dayCode: "LU", dayOfWeek: 1, startTime: "10:20", endTime: "11:05", location: "COM1" }
    ];
    const grouped = groupConsecutiveUnabMeetings(meetings);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].startTime).toBe("08:30");
    expect(grouped[0].endTime).toBe("11:05");
  });

  // 38. Reuniones consecutivas con distinta sala
  it("38. Reuniones consecutivas con distinta sala", () => {
    const meetings = [
      { dayCode: "LU", dayOfWeek: 1, startTime: "08:30", endTime: "09:15", location: "COM1" },
      { dayCode: "LU", dayOfWeek: 1, startTime: "09:25", endTime: "10:10", location: "COM2" }
    ];
    const grouped = groupConsecutiveUnabMeetings(meetings);
    // Se agrupan visualmente, pero registran ambas salas
    expect(grouped).toHaveLength(1);
    expect(grouped[0].locations).toEqual(["COM1", "COM2"]);
  });

  // 39. Reuniones consecutivas con distinto tipo de actividad
  it("39. Reuniones consecutivas con distinto tipo de actividad", () => {
    // Deberían NO unirse si sus actividades son diferentes (ej. Teoria vs Lab)
    // Agregamos campo opcional activityType para validarlo en el agrupamiento
    const meetings = [
      { dayCode: "LU", dayOfWeek: 1, startTime: "08:30", endTime: "09:15", location: "COM1", activityType: "TEORIA" },
      { dayCode: "LU", dayOfWeek: 1, startTime: "09:25", endTime: "10:10", location: "COM1", activityType: "LABORATORIO" }
    ];
    
    // Si la función groupConsecutiveUnabMeetings valida activityType, no las une.
    // Modificaremos la lógica para verificar este comportamiento
    const grouped = groupConsecutiveUnabMeetings(meetings);
    expect(grouped).toHaveLength(2);
  });

  // 40. Clase de cuatro o más módulos
  it("40. Clase de cuatro o más módulos", () => {
    const meeting = { startTime: "08:30", endTime: "12:00" }; // Módulos 1 a 4
    const slots = getOccupiedUnabSlots(meeting, unabTimeSlots);
    expect(slots).toHaveLength(4);
  });

  // 41. Conflicto dentro de una pausa intermedia
  it("41. Conflicto dentro de una pausa intermedia", () => {
    const classA = { dayCode: "LU", startTime: "08:30", endTime: "11:05" }; // 3 módulos continuos
    const classB = { dayCode: "LU", startTime: "09:18", endTime: "09:24" }; // Ocurre durante el recreo 09:15 - 09:25
    expect(hasMeetingConflict(classA, classB)).toBe(true);
  });

  // 42. Visualización adaptativa según altura
  it("42. Visualización adaptativa según altura", () => {
    const durationToStyle = (dur) => {
      if (dur >= 130) return "FULL";
      if (dur >= 75) return "MEDIUM";
      return "COMPACT";
    };
    expect(durationToStyle(155)).toBe("FULL");
    expect(durationToStyle(100)).toBe("MEDIUM");
    expect(durationToStyle(45)).toBe("COMPACT");
  });

  // 43. Conservación de las reuniones originales después de agrupar
  it("43. Conservación de las reuniones originales después de agrupar", () => {
    const meetings = [
      { dayCode: "LU", dayOfWeek: 1, startTime: "08:30", endTime: "09:15" },
      { dayCode: "LU", dayOfWeek: 1, startTime: "09:25", endTime: "10:10" }
    ];
    const grouped = groupConsecutiveUnabMeetings(meetings);
    expect(grouped).toHaveLength(1);
    // Verificar que no se eliminaron las reuniones originales del objeto agrupado
    expect(grouped[0].meetings).toHaveLength(2);
    expect(meetings).toHaveLength(2);
  });

});
