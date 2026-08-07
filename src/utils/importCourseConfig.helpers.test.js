import { describe, expect, it } from "vitest";
import { hasExistingPerformance } from "../components/ImportCourseConfigModal";

describe("hasExistingPerformance", () => {
  it("detecta nota y subNotas", () => {
    expect(hasExistingPerformance([])).toBe(false);
    expect(
      hasExistingPerformance([{ nombre: "A", peso: 10, nota: null, subNotas: [] }])
    ).toBe(false);
    expect(
      hasExistingPerformance([{ nombre: "A", peso: 10, nota: 5.5, subNotas: [] }])
    ).toBe(true);
    expect(
      hasExistingPerformance([
        { nombre: "A", peso: 10, nota: null, subNotas: [{ id: 1, nota: 6 }] },
      ])
    ).toBe(true);
  });
});
