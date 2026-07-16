import { describe, it, expect } from "vitest";
import { getAdjustedBounds } from "../services/scheduleService";

describe("Schedule PDF and UX Enhancements Tests", () => {
  describe("getAdjustedBounds", () => {
    it("should return default range (08:30 - 19:20) when meetings list is empty", () => {
      const bounds = getAdjustedBounds([]);
      expect(bounds.start).toBe(8 * 60 + 30); // 510 minutes (08:30)
      expect(bounds.end).toBe(19 * 60 + 20);   // 1160 minutes (19:20)
    });

    it("should cover at least the default range even with small afternoon class", () => {
      const meetings = [
        { dayCode: "LU", startTime: "14:00", endTime: "15:40" }
      ];
      const bounds = getAdjustedBounds(meetings);
      expect(bounds.start).toBe(8 * 60 + 30); // 08:30
      expect(bounds.end).toBe(19 * 60 + 20);   // 19:20
    });

    it("should expand the range to 22:05 if there is a class ending late (e.g., 21:10)", () => {
      const meetings = [
        { dayCode: "LU", startTime: "19:30", endTime: "21:10" }
      ];
      // La última clase termina a las 21:10 (módulo 14), el módulo posterior (15) termina a las 22:05
      const bounds = getAdjustedBounds(meetings);
      expect(bounds.start).toBe(8 * 60 + 30); // 08:30
      expect(bounds.end).toBe(22 * 60 + 5);   // 22:05 (1325 minutes)
    });

    it("should cover early classes if they start before 08:30 (e.g., test limit)", () => {
      const meetings = [
        { dayCode: "LU", startTime: "08:00", endTime: "09:15" }
      ];
      const bounds = getAdjustedBounds(meetings);
      // Debe retroceder un bloque o empezar al menos en el inicio de la clase
      expect(bounds.start).toBeLessThanOrEqual(8 * 60); // 08:00 o antes
    });
  });

  describe("Credits and Capacity helper mock logic", () => {
    const mockSelectedSections = [
      {
        courseCode: "INSW422",
        courseTitle: "Proyecto de Título",
        sectionNumber: "301",
        nrc: "12345",
        capacity: 20,
        curriculumCourse: { sct: 8 }
      },
      {
        courseCode: "TDFI105",
        courseTitle: "Ciberseguridad",
        sectionNumber: "302",
        nrc: "12974",
        capacity: null, // Sin cupos informados
        curriculumCourse: null // Sin créditos
      }
    ];

    it("should calculate correct total credits and handle courses with no credits", () => {
      const totalCredits = mockSelectedSections.reduce((acc, sec) => {
        return acc + (sec.curriculumCourse?.sct ?? 0);
      }, 0);
      expect(totalCredits).toBe(8);
    });

    it("should display credit labels correctly including fallback for no credits", () => {
      const creditLabels = mockSelectedSections.map((sec) => {
        const val = sec.curriculumCourse?.sct;
        return val != null ? `${val} créditos` : "—";
      });
      expect(creditLabels[0]).toBe("8 créditos");
      expect(creditLabels[1]).toBe("—");
    });

    it("should display capacity labels correctly including fallback for no capacity", () => {
      const capacityLabels = mockSelectedSections.map((sec) => {
        const val = sec.capacity;
        return val != null ? String(val) : "—";
      });
      expect(capacityLabels[0]).toBe("20");
      expect(capacityLabels[1]).toBe("—");
    });
  });
});
