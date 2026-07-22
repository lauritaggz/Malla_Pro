/**
 * Tutores — persistencia local (mock).
 * Esquema por tutor: ver JSDoc en loadTutors.
 */

export const TUTORS_STORAGE_KEY = "malla_pro_tutors";

/** @typedef {{ id: string, nombre: string, telefono: string, asignaturas: string[], precioPorSesion: number | null, disponible: boolean, ratings: number[], createdAt: string }} Tutor */

export const MOCK_TUTORS_INITIAL = [
  {
    id: "tutor-mock-1",
    nombre: "Valentina Rojas",
    telefono: "56912345678",
    asignaturas: ["Física general", "Cálculo diferencial", "Álgebra lineal"],
    precioPorSesion: 12000,
    disponible: true,
    ratings: [5, 5, 4, 5],
    createdAt: "2026-01-15T12:00:00.000Z",
  },
  {
    id: "tutor-mock-2",
    nombre: "Diego Morales",
    telefono: "56987654321",
    asignaturas: ["Química orgánica", "Bioquímica", "Laboratorio biología celular"],
    precioPorSesion: null,
    disponible: true,
    ratings: [4, 4, 5],
    createdAt: "2026-02-01T10:30:00.000Z",
  },
];

function normalizePhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("56") && d.length >= 10) return d;
  if (d.startsWith("9") && d.length === 9) return `56${d}`;
  return d;
}

export function waLink(telefono, asignaturaNombre) {
  const num = normalizePhone(telefono);
  const text = `Hola, te contacto desde Malla Pro para solicitar una tutoría de ${asignaturaNombre}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export function averageRating(ratings) {
  if (!ratings || ratings.length === 0) return 0;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return sum / ratings.length;
}

/** @returns {Tutor[]} */
export function loadTutors() {
  try {
    const raw = localStorage.getItem(TUTORS_STORAGE_KEY);
    if (!raw) {
      saveTutors(MOCK_TUTORS_INITIAL);
      return [...MOCK_TUTORS_INITIAL];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveTutors(MOCK_TUTORS_INITIAL);
      return [...MOCK_TUTORS_INITIAL];
    }
    return parsed;
  } catch {
    saveTutors(MOCK_TUTORS_INITIAL);
    return [...MOCK_TUTORS_INITIAL];
  }
}

/** @param {Tutor[]} list */
export function saveTutors(list) {
  localStorage.setItem(TUTORS_STORAGE_KEY, JSON.stringify(list));
}

/** @param {string} tutorId @param {number} stars 1-5 */
export function addRatingToTutor(tutorId, stars) {
  const list = loadTutors();
  const idx = list.findIndex((t) => t.id === tutorId);
  if (idx === -1) return list;
  const next = { ...list[idx], ratings: [...(list[idx].ratings || []), stars] };
  const copy = [...list];
  copy[idx] = next;
  saveTutors(copy);
  return copy;
}

/** @param {Omit<Tutor, 'id'|'ratings'|'createdAt'> & { ratings?: number[] }} data */
export function registerTutor(data) {
  const list = loadTutors();
  const tutor = {
    id: `tutor-${Date.now()}`,
    nombre: data.nombre.trim(),
    telefono: normalizePhone(data.telefono),
    asignaturas: data.asignaturas.map((s) => s.trim()).filter(Boolean),
    precioPorSesion:
      data.precioPorSesion === null || data.precioPorSesion === undefined || data.precioPorSesion === ""
        ? null
        : Number(data.precioPorSesion),
    disponible: !!data.disponible,
    ratings: data.ratings?.length ? data.ratings : [],
    createdAt: new Date().toISOString(),
  };
  list.push(tutor);
  saveTutors(list);
  return list;
}
