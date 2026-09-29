/**
 * Dataset fijo de /portfolio-preview.
 *
 * Misma forma que public/mallas/*.json (se normaliza con mapMallaData) para que
 * la vista demo use exactamente los componentes y reglas de "Mi malla".
 * No proviene de localStorage ni del backend: es estático y congelado.
 */

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const DEMO_MALLA_JSON = deepFreeze({
  carrera: "Ingeniería en Computación e Informática (UNAB)",
  totalSemestres: 8,
  semestres: [
    {
      numero: 1,
      cursos: [
        { id: 1, codigo: "CFIS310", nombre: "Física General", sct: 18, prerrequisitos: [] },
        { id: 2, codigo: "FMMP012", nombre: "Introducción a las Matemáticas", sct: 16, prerrequisitos: [] },
        { id: 3, codigo: "TDFI101", nombre: "Introducción a la Ingeniería", sct: 16, prerrequisitos: [] },
        { id: 4, codigo: "TDFI102", nombre: "Introducción a la Programación", sct: 18, prerrequisitos: [] },
      ],
    },
    {
      numero: 2,
      cursos: [
        { id: 5, codigo: "ACAD101", nombre: "Taller de Innovación y Emprendimiento I", sct: 10, prerrequisitos: [3] },
        { id: 6, codigo: "CEGHC11", nombre: "Habilidades Comunicativas", sct: 8, prerrequisitos: [] },
        { id: 7, codigo: "CFIS328", nombre: "Física Experimental", sct: 16, prerrequisitos: [1, 2] },
        { id: 8, codigo: "FMMP112", nombre: "Cálculo Diferencial", sct: 16, prerrequisitos: [2] },
        { id: 9, codigo: "TDFI103", nombre: "Base de Datos", sct: 15, prerrequisitos: [4] },
      ],
    },
    {
      numero: 3,
      cursos: [
        { id: 10, codigo: "ACAD102", nombre: "Taller de Innovación y Emprendimiento II", sct: 10, prerrequisitos: [5] },
        { id: 11, codigo: "CFIS332", nombre: "Mecánica", sct: 18, prerrequisitos: [7, 8] },
        { id: 12, codigo: "FMMP212", nombre: "Cálculo Integral", sct: 16, prerrequisitos: [8] },
        { id: 13, codigo: "ING119", nombre: "Inglés I", sct: 12, prerrequisitos: [] },
        { id: 14, codigo: "TDFI104", nombre: "Compliance & Accountability", sct: 10, prerrequisitos: [3] },
      ],
    },
    {
      numero: 4,
      cursos: [
        { id: 15, codigo: "FMSP316", nombre: "Métodos Cuantitativos", sct: 20, prerrequisitos: [12] },
        { id: 16, codigo: "ING129", nombre: "Inglés II", sct: 12, prerrequisitos: [13] },
        { id: 17, codigo: "INSW220", nombre: "Práctica I", sct: 16, prerrequisitos: [10, 14] },
        { id: 18, codigo: "INSW221", nombre: "Tecnologías Disruptivas", sct: 8, prerrequisitos: [9] },
        { id: 19, codigo: "PTEC101", nombre: "Algoritmos y Estructuras de Datos", sct: 12, prerrequisitos: [4] },
      ],
    },
    {
      numero: 5,
      cursos: [
        { id: 20, codigo: "ING239", nombre: "Inglés III", sct: 12, prerrequisitos: [16] },
        { id: 21, codigo: "INSW311", nombre: "Disrupción Empresarial", sct: 18, prerrequisitos: [18] },
        { id: 22, codigo: "INSW312", nombre: "Conectividad y Soluciones Móviles", sct: 18, prerrequisitos: [18] },
        { id: 23, codigo: "PTEC102", nombre: "Paradigmas de Programación", sct: 8, prerrequisitos: [19] },
        { id: 24, codigo: "TDFI105", nombre: "Minería de Datos", sct: 12, prerrequisitos: [15, 9] },
      ],
    },
    {
      numero: 6,
      cursos: [
        { id: 25, codigo: "ACAD103", nombre: "Taller de Innovación y Emprendimiento III", sct: 10, prerrequisitos: [10] },
        { id: 26, codigo: "ING249", nombre: "Inglés IV", sct: 12, prerrequisitos: [20] },
        { id: 27, codigo: "INSW321", nombre: "Desafío Tecnológico", sct: 5, prerrequisitos: [21] },
        { id: 28, codigo: "PTEC103", nombre: "Desarrollo Web y Móvil", sct: 14, prerrequisitos: [23] },
        { id: 29, codigo: "PTEC105", nombre: "Ingeniería de Software I", sct: 15, prerrequisitos: [23] },
        { id: 30, codigo: "TDFI106", nombre: "Gestión de la Transformación Digital", sct: 12, prerrequisitos: [14] },
      ],
    },
    {
      numero: 7,
      cursos: [
        { id: 31, codigo: "CEGRS14", nombre: "Responsabilidad Social", sct: 6, prerrequisitos: [] },
        { id: 32, codigo: "INSW410", nombre: "Portafolio de Proyectos", sct: 10, prerrequisitos: [27, 28, 29] },
        { id: 33, codigo: "INSW411", nombre: "Tópico de Especialidad I", sct: 10, prerrequisitos: [21] },
        { id: 34, codigo: "INSW412", nombre: "Tópico de Especialidad II", sct: 10, prerrequisitos: [22] },
        { id: 35, codigo: "PTEC104", nombre: "Infraestructura TI", sct: 12, prerrequisitos: [23] },
        { id: 36, codigo: "PTEC106", nombre: "Ingeniería de Software II", sct: 15, prerrequisitos: [29, 28] },
      ],
    },
    {
      numero: 8,
      cursos: [
        { id: 37, codigo: "INSW420", nombre: "Práctica II", sct: 26, prerrequisitos: [25, 27, 28] },
        { id: 38, codigo: "INSW421", nombre: "Seminario de Licenciatura en Ingeniería", sct: 14, prerrequisitos: [36, 32] },
        { id: 39, codigo: "INSW422", nombre: "Proyecto de Título", sct: 14, prerrequisitos: [32] },
        { id: 40, codigo: "PTEC107", nombre: "Ciberseguridad", sct: 14, prerrequisitos: [35] },
      ],
    },
  ],
});

/**
 * 23 aprobados · 4 cursando · 13 pendientes (57 %).
 * Disponibles y bloqueados se derivan de los prerrequisitos, igual que en la app.
 */
export const DEMO_PROGRESS = deepFreeze({
  aprobados: [
    1, 2, 3, 4,
    5, 6, 7, 8, 9,
    10, 11, 12, 13, 14,
    15, 16, 17, 18, 19,
    20, 22, 24,
    31,
  ],
  cursando: [21, 23, 26, 30],
  excepciones: [],
});
