import { describe, expect, it } from "vitest";
import { normalizeCourseCode } from "../utils/normalizeCourseCode";
import {
  joinHyphenatedFragments,
  normalizeCellText,
  normalizeCourseTitle,
} from "../utils/normalizeCellText";
import { parseNrc, parseLinkedNrcs } from "../utils/parseNrc";
import { parseProfessors } from "../utils/parseProfessors";
import { parseModality } from "../utils/parseModality";
import { parseMeetings } from "../utils/parseMeetings";
import {
  sortSections,
  sortMeetings,
  compareSectionNumbers,
} from "../utils/sortAcademicProgramming";
import { createSectionId } from "../utils/createSectionId";
import { groupSectionsByCourse } from "../services/groupSectionsByCourse";
import { filterCourses } from "../services/filterCourses";
import {
  detectColumnBounds,
  groupElementsIntoRows,
  mapPdfTextItems,
  rowItemsToColumnFragments,
  findHeaderRowCluster,
} from "../parsers/pdfLayoutUtils";
import {
  isNewSectionRow,
  finalizeDraftSection,
  parsePeriodFromLabel,
  parseCurriculumLine,
} from "../parsers/sectionDraftUtils";

describe("normalizeCourseCode", () => {
  it("normaliza códigos con espacios y minúsculas", () => {
    expect(normalizeCourseCode("tdfi 103")).toBe("TDFI103");
    expect(normalizeCourseCode("TDFI-103")).toBe("TDFI103");
  });
});

describe("parseNrc", () => {
  it("une NRC dividido en dos líneas", () => {
    expect(parseNrc(["1297", "4"])).toBe("12974");
    expect(parseNrc(["1226", "3"])).toBe("12263");
  });

  it("parsea NRC ligados", () => {
    expect(parseLinkedNrcs("12345 12346")).toEqual(["12345", "12346"]);
    expect(parseLinkedNrcs("-")).toEqual([]);
    expect(parseLinkedNrcs("")).toEqual([]);
  });
});

describe("títulos y celdas", () => {
  it("une título dividido en varias líneas", () => {
    expect(
      normalizeCourseTitle(["INTRODUCCIÓN", "A LA", "PROGRAMACIÓN"])
    ).toBe("INTRODUCCIÓN A LA PROGRAMACIÓN");
  });

  it("conserva abreviaturas sin completarlas", () => {
    expect(normalizeCellText(["GEST DE LA", "TRANSFORMA", "DIGITAL"])).toBe(
      "GEST DE LA TRANSFORMA DIGITAL"
    );
  });

  it("une letra final partida por salto de línea del PDF", () => {
    expect(joinHyphenatedFragments(["CIBERSEGURIDA", "D"])).toBe("CIBERSEGURIDAD");
    expect(normalizeCourseTitle(["CIBERSEGURIDA", "D"])).toBe("CIBERSEGURIDAD");
  });

  it("une salas partidas por guion", () => {
    expect(joinHyphenatedFragments(["VM-", "COM413"])).toBe("VM-COM413");
    expect(joinHyphenatedFragments(["VM-E-", "SAL129"])).toBe("VM-E-SAL129");
    expect(joinHyphenatedFragments(["VM-", "INF418"])).toBe("VM-INF418");
  });
});

describe("parseProfessors", () => {
  it("une profesor dividido en varias líneas", () => {
    expect(parseProfessors(["CÉSAR GERMÁN CHEUQUE", "CERDA"])).toEqual([
      "CÉSAR GERMÁN CHEUQUE CERDA",
    ]);
  });

  it("separa por / y elimina duplicados", () => {
    expect(
      parseProfessors(
        "JOHANNA ANTONIA PERASSO ADUNCE / JOHANNA ANTONIA PERASSO ADUNCE"
      )
    ).toEqual(["JOHANNA ANTONIA PERASSO ADUNCE"]);
  });

  it("colapsa POR DEFINIR POR DEFINIR", () => {
    expect(parseProfessors("POR DEFINIR POR DEFINIR")).toEqual(["POR DEFINIR"]);
  });

  it("mantiene profesor real junto a POR DEFINIR colapsado", () => {
    expect(
      parseProfessors("MILENA ALEJANDRA PAEZ SILVA / POR DEFINIR POR DEFINIR")
    ).toEqual(["MILENA ALEJANDRA PAEZ SILVA", "POR DEFINIR"]);
  });
});

describe("parseMeetings", () => {
  it("parsea una reunión", () => {
    const { meetings } = parseMeetings("JU 15:50 A 17:30 VM-COM412");
    expect(meetings).toHaveLength(1);
    expect(meetings[0]).toMatchObject({
      dayCode: "JU",
      dayOfWeek: 4,
      startTime: "15:50",
      endTime: "17:30",
      location: "VM-COM412",
      isOnline: false,
    });
  });

  it("parsea varias reuniones", () => {
    const { meetings } = parseMeetings(
      "LU 14:00 A 16:35 VM-COM412 ; MI 14:00 A 16:35 VM-COM413"
    );
    expect(meetings).toHaveLength(2);
    expect(meetings[0].dayCode).toBe("LU");
    expect(meetings[1].dayCode).toBe("MI");
    expect(meetings[1].location).toBe("VM-COM413");
  });

  it("une sala partida tras guion dentro del horario", () => {
    const { meetings } = parseMeetings(["LU 14:00 A 16:35 VM-", "COM413"]);
    expect(meetings[0].location).toBe("VM-COM413");
  });

  it("parsea sala VM-E-SAL129", () => {
    const { meetings } = parseMeetings("MA 10:00 A 11:40 VM-E-SAL129");
    expect(meetings[0].location).toBe("VM-E-SAL129");
  });

  it("horario con sala guion queda location null", () => {
    const { meetings } = parseMeetings("JU 19:30 A 21:10 -");
    expect(meetings).toHaveLength(1);
    expect(meetings[0].location).toBeNull();
  });

  it("horario con guion pegado a la hora de término", () => {
    const { meetings, warnings } = parseMeetings("MA 19:00 A 21:25-");
    expect(warnings).toEqual([]);
    expect(meetings).toHaveLength(1);
    expect(meetings[0]).toMatchObject({
      dayCode: "MA",
      dayOfWeek: 2,
      startTime: "19:00",
      endTime: "21:25",
      location: null,
    });
  });

  it("acepta alias de día MIE / JUE", () => {
    const { meetings } = parseMeetings("MIE 14:00 A 16:35 VM-COM412 ; JUE 15:50 A 17:30 -");
    expect(meetings).toHaveLength(2);
    expect(meetings[0].dayCode).toBe("MI");
    expect(meetings[1].dayCode).toBe("JU");
    expect(meetings[1].location).toBeNull();
  });

  it("sección virtual sin horario", () => {
    const { meetings } = parseMeetings("");
    expect(meetings).toEqual([]);
  });
});

describe("modalidades", () => {
  it("normaliza modalidades conocidas", () => {
    expect(parseModality("PRESENCIAL")).toBe("PRESENCIAL");
    expect(parseModality("VIRTUAL")).toBe("VIRTUAL");
    expect(parseModality("E-LEARNING")).toBe("E_LEARNING");
    expect(parseModality("E LEARNING")).toBe("E_LEARNING");
    expect(parseModality("BLENDED")).toBe("BLENDED");
    expect(parseModality("OTRA COSA")).toBe("UNKNOWN");
  });
});

describe("orden", () => {
  it("ordena secciones numéricamente", () => {
    const sorted = sortSections([
      { sectionNumber: "304", meetings: [] },
      { sectionNumber: "300", meetings: [] },
      { sectionNumber: "302", meetings: [] },
      { sectionNumber: "301", meetings: [] },
    ]);
    expect(sorted.map((s) => s.sectionNumber)).toEqual(["300", "301", "302", "304"]);
    expect(compareSectionNumbers("10", "2")).toBeGreaterThan(0);
  });

  it("ordena reuniones por día y hora", () => {
    const sorted = sortMeetings([
      { dayCode: "VI", dayOfWeek: 5, startTime: "14:00", endTime: "15:00", location: null, isOnline: false },
      { dayCode: "LU", dayOfWeek: 1, startTime: "16:00", endTime: "17:00", location: null, isOnline: false },
      { dayCode: "LU", dayOfWeek: 1, startTime: "08:00", endTime: "09:00", location: null, isOnline: false },
    ]);
    expect(sorted.map((m) => `${m.dayCode}-${m.startTime}`)).toEqual([
      "LU-08:00",
      "LU-16:00",
      "VI-14:00",
    ]);
  });
});

describe("agrupación", () => {
  it("agrupa por código y conserva todas las secciones", () => {
    const courses = groupSectionsByCourse([
      {
        id: "1",
        nrc: "1",
        linkedNrcs: [],
        courseCode: "TDFI103",
        courseTitle: "Base de Datos",
        sectionNumber: "302",
        activityType: "TEORIA",
        capacity: 30,
        professors: ["A"],
        modality: "PRESENCIAL",
        meetings: [],
        raw: {},
        warnings: [],
      },
      {
        id: "2",
        nrc: "2",
        linkedNrcs: [],
        courseCode: "tdfi 103",
        courseTitle: "Base de Datos",
        sectionNumber: "304",
        activityType: "TEORIA",
        capacity: 30,
        professors: ["B"],
        modality: "PRESENCIAL",
        meetings: [],
        raw: {},
        warnings: [],
      },
      {
        id: "3",
        nrc: "3",
        linkedNrcs: [],
        courseCode: "TDFI103",
        courseTitle: "Base de Datos",
        sectionNumber: "306",
        activityType: "TEORIA",
        capacity: 30,
        professors: ["C"],
        modality: "PRESENCIAL",
        meetings: [],
        raw: {},
        warnings: [],
      },
      {
        id: "4",
        nrc: "4",
        linkedNrcs: [],
        courseCode: "TDFI103",
        courseTitle: "Base de Datos",
        sectionNumber: "307",
        activityType: "TEORIA",
        capacity: 30,
        professors: ["D"],
        modality: "PRESENCIAL",
        meetings: [],
        raw: {},
        warnings: [],
      },
    ]);

    expect(courses).toHaveLength(1);
    expect(courses[0].courseCode).toBe("TDFI103");
    expect(courses[0].sections.map((s) => s.sectionNumber)).toEqual([
      "302",
      "304",
      "306",
      "307",
    ]);
  });
});

describe("búsqueda y filtros", () => {
  const sample = [
    {
      courseCode: "TDFI103",
      courseTitle: "Base de Datos",
      sections: [
        {
          nrc: "12263",
          courseCode: "TDFI103",
          courseTitle: "Base de Datos",
          sectionNumber: "302",
          professors: ["Sarita Gonzalez Catalan"],
          modality: "PRESENCIAL",
          activityType: "TEORIA",
          meetings: [
            {
              dayCode: "JU",
              dayOfWeek: 4,
              startTime: "15:50",
              endTime: "17:30",
              location: "VM-COM412",
              isOnline: false,
            },
          ],
        },
        {
          nrc: "12264",
          courseCode: "TDFI103",
          courseTitle: "Base de Datos",
          sectionNumber: "304",
          professors: ["Otro"],
          modality: "VIRTUAL",
          activityType: "TALLER",
          meetings: [
            {
              dayCode: "LU",
              dayOfWeek: 1,
              startTime: "10:00",
              endTime: "11:40",
              location: null,
              isOnline: true,
            },
          ],
        },
      ],
    },
  ];

  it("busca por NRC, código, título y profesor", () => {
    expect(filterCourses(sample, { query: "12263" })[0].sections).toHaveLength(1);
    expect(filterCourses(sample, { query: "tdfi" })[0].sections).toHaveLength(2);
    expect(filterCourses(sample, { query: "base de datos" })[0].sections).toHaveLength(2);
    expect(filterCourses(sample, { query: "sarita" })[0].sections).toHaveLength(1);
  });

  it("filtra por día mostrando solo secciones con ese bloque", () => {
    const result = filterCourses(sample, { dayCode: "JU" });
    expect(result[0].sections.map((s) => s.nrc)).toEqual(["12263"]);
  });

  it("filtra por jornada mañana", () => {
    const result = filterCourses(sample, { periods: ["MORNING"] });
    expect(result[0].sections.map((s) => s.nrc)).toEqual(["12264"]);
  });

  it("filtra por jornada tarde", () => {
    const result = filterCourses(sample, { periods: ["AFTERNOON"] });
    expect(result[0].sections.map((s) => s.nrc)).toEqual(["12263"]);
  });

  it("ordena por mayor cantidad de secciones", () => {
    const multi = [
      {
        courseCode: "AAA101",
        courseTitle: "Uno",
        sections: [{ nrc: "1", courseCode: "AAA101", sectionNumber: "1", professors: [], modality: "PRESENCIAL", activityType: "T", meetings: [] }],
      },
      {
        courseCode: "BBB202",
        courseTitle: "Dos",
        sections: [
          { nrc: "2", courseCode: "BBB202", sectionNumber: "1", professors: [], modality: "PRESENCIAL", activityType: "T", meetings: [] },
          { nrc: "3", courseCode: "BBB202", sectionNumber: "2", professors: [], modality: "PRESENCIAL", activityType: "T", meetings: [] },
        ],
      },
    ];
    const result = filterCourses(multi, { sortBy: "MOST_SECTIONS" });
    expect(result.map((c) => c.courseCode)).toEqual(["BBB202", "AAA101"]);
  });
});

describe("createSectionId", () => {
  it("genera id estable", () => {
    expect(
      createSectionId({
        period: "2026-2",
        curriculumCode: "UNAB11500",
        courseCode: "TDFI103",
        sectionNumber: "302",
        nrc: "12263",
      })
    ).toBe("2026-2|UNAB11500|TDFI103|302|12263");
  });
});

describe("metadatos UNAB", () => {
  it("parsea periodo y curriculum", () => {
    expect(
      parsePeriodFromLabel("PROGRAMACIÓN ACADÉMICA - SEGUNDO SEMESTRE 2026")
    ).toMatchObject({ year: 2026, semester: 2 });

    expect(
      parseCurriculumLine("UNAB11500 - INGENIERÍA EN COMPUTACIÓN E INFORMÁTICA")
    ).toEqual({
      code: "UNAB11500",
      careerName: "INGENIERÍA EN COMPUTACIÓN E INFORMÁTICA",
    });
  });
});

describe("integración con coordenadas simuladas PDF.js", () => {
  const headerItems = [
    { str: "NRC", transform: [1, 0, 0, 1, 20, 700], width: 20, height: 8 },
    { str: "NRC LIGADOS", transform: [1, 0, 0, 1, 60, 700], width: 40, height: 8 },
    { str: "TIPO ACTIVIDAD", transform: [1, 0, 0, 1, 120, 700], width: 50, height: 8 },
    { str: "CODIGO ASIGNATURA", transform: [1, 0, 0, 1, 190, 700], width: 55, height: 8 },
    { str: "SECCIÓN", transform: [1, 0, 0, 1, 260, 700], width: 35, height: 8 },
    { str: "TITULO", transform: [1, 0, 0, 1, 310, 700], width: 35, height: 8 },
    { str: "VACANTES", transform: [1, 0, 0, 1, 400, 700], width: 40, height: 8 },
    { str: "NOMBRE PROFESOR", transform: [1, 0, 0, 1, 460, 700], width: 55, height: 8 },
    { str: "HORARIO", transform: [1, 0, 0, 1, 560, 700], width: 40, height: 8 },
    { str: "MODALIDAD", transform: [1, 0, 0, 1, 680, 700], width: 45, height: 8 },
  ];

  it("detecta columnas y reconstruye sección con NRC partido y continuación", () => {
    const pageHeight = 792;
    const headerEls = mapPdfTextItems(headerItems, pageHeight);
    const bounds = detectColumnBounds(headerEls, 800);
    expect(bounds).not.toBeNull();
    expect(bounds.nrc).toBeDefined();
    expect(bounds.schedule).toBeDefined();

    // Fila 1: inicio de sección con NRC partido visualmente en dos Y cercanos
    const row1 = mapPdfTextItems(
      [
        { str: "1297", transform: [1, 0, 0, 1, 22, 650], width: 18, height: 8 },
        { str: "TEORIA", transform: [1, 0, 0, 1, 125, 650], width: 30, height: 8 },
        { str: "FMMP112", transform: [1, 0, 0, 1, 195, 650], width: 40, height: 8 },
        { str: "303", transform: [1, 0, 0, 1, 265, 650], width: 18, height: 8 },
        { str: "FISICA", transform: [1, 0, 0, 1, 315, 650], width: 30, height: 8 },
        { str: "30", transform: [1, 0, 0, 1, 405, 650], width: 12, height: 8 },
        { str: "PRESENCIAL", transform: [1, 0, 0, 1, 685, 650], width: 45, height: 8 },
      ],
      pageHeight
    );

    const row1b = mapPdfTextItems(
      [
        { str: "4", transform: [1, 0, 0, 1, 24, 640], width: 8, height: 8 },
        { str: "GENERAL", transform: [1, 0, 0, 1, 315, 640], width: 35, height: 8 },
      ],
      pageHeight
    );

    // Página 2: continuación profesor + horario (sin NRC/código/sección nuevos)
    const rowCont = mapPdfTextItems(
      [
        {
          str: "ANA MARIA PEREZ",
          transform: [1, 0, 0, 1, 465, 750],
          width: 70,
          height: 8,
        },
        {
          str: "LU 14:00 A 16:35 VM-",
          transform: [1, 0, 0, 1, 565, 750],
          width: 90,
          height: 8,
        },
      ],
      pageHeight
    );
    const rowCont2 = mapPdfTextItems(
      [
        {
          str: "INF418",
          transform: [1, 0, 0, 1, 565, 740],
          width: 30,
          height: 8,
        },
      ],
      pageHeight
    );

    const { cells: c1 } = rowItemsToColumnFragments(row1, bounds);
    expect(isNewSectionRow(c1)).toBe(true);

    const fragments = {
      nrc: [...(c1.nrc || [])],
      linkedNrcs: [],
      activityType: [...(c1.activityType || [])],
      courseCode: [...(c1.courseCode || [])],
      sectionNumber: [...(c1.sectionNumber || [])],
      courseTitle: [...(c1.courseTitle || [])],
      capacity: [...(c1.capacity || [])],
      professors: [],
      schedule: [],
      modality: [...(c1.modality || [])],
    };

    const { cells: c1b } = rowItemsToColumnFragments(row1b, bounds);
    expect(isNewSectionRow(c1b)).toBe(false);
    for (const [k, v] of Object.entries(c1b)) {
      if (v?.length) fragments[k].push(...v);
    }

    const { cells: cc } = rowItemsToColumnFragments(rowCont, bounds);
    expect(isNewSectionRow(cc)).toBe(false);
    for (const [k, v] of Object.entries(cc)) {
      if (v?.length) fragments[k].push(...v);
    }

    const { cells: cc2 } = rowItemsToColumnFragments(rowCont2, bounds);
    for (const [k, v] of Object.entries(cc2)) {
      if (v?.length) fragments[k].push(...v);
    }

    const section = finalizeDraftSection(fragments, {
      period: "2026-2",
      curriculumCode: "UNAB11500",
      page: 1,
      continuedAcrossPages: true,
    });

    expect(section.nrc).toBe("12974");
    expect(section.courseCode).toBe("FMMP112");
    expect(section.sectionNumber).toBe("303");
    expect(section.courseTitle).toContain("FISICA");
    expect(section.professors[0]).toContain("ANA MARIA PEREZ");
    expect(section.meetings).toHaveLength(1);
    expect(section.meetings[0].location).toBe("VM-INF418");
    expect(section.warnings.some((w) => w.includes("páginas"))).toBe(true);
  });

  it("agrupa filas por Y y encuentra cabecera", () => {
    const els = mapPdfTextItems(headerItems, 792);
    const rows = groupElementsIntoRows(els, 4);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const cluster = findHeaderRowCluster(rows);
    expect(cluster).not.toBeNull();
    expect(Object.keys(cluster.bounds).length).toBeGreaterThanOrEqual(6);
  });
});
