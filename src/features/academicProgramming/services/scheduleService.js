export const unabTimeSlots = [
  { id: 1,  start: "08:30", end: "09:15" },
  { id: 2,  start: "09:25", end: "10:10" },
  { id: 3,  start: "10:20", end: "11:05" },
  { id: 4,  start: "11:15", end: "12:00" },
  { id: 5,  start: "12:10", end: "12:55" },
  { id: 6,  start: "13:05", end: "13:50" },
  { id: 7,  start: "14:00", end: "14:45" },
  { id: 8,  start: "14:55", end: "15:40" },
  { id: 9,  start: "15:50", end: "16:35" },
  { id: 10, start: "16:45", end: "17:30" },
  { id: 11, start: "17:40", end: "18:25" },
  { id: 12, start: "18:35", end: "19:20" },
  { id: 13, start: "19:30", end: "20:15" },
  { id: 14, start: "20:25", end: "21:10" },
  { id: 15, start: "21:20", end: "22:05" }
];

export const scheduleDays = [
  { code: "LU", label: "Lunes", index: 1 },
  { code: "MA", label: "Martes", index: 2 },
  { code: "MI", label: "Miércoles", index: 3 },
  { code: "JU", label: "Jueves", index: 4 },
  { code: "VI", label: "Viernes", index: 5 },
  { code: "SA", label: "Sábado", index: 6 }
];

/**
 * Convierte hora a minutos reales desde las 00:00.
 * @param {string} time
 * @returns {number}
 */
export function timeToMinutes(time) {
  if (time == null || time === "") return 0;
  const parts = String(time).split(":");
  if (parts.length < 2) return Number.NaN;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return Number.NaN;
  return h * 60 + m;
}

/**
 * Convierte minutos a formato HH:mm.
 * @param {number} mins
 * @returns {string}
 */
export function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Obtiene los módulos UNAB que ocupa una reunión.
 * @param {{ startTime: string, endTime: string }} meeting
 * @param {Array<{ id: number, start: string, end: string }>} slots
 * @returns {Array<object>}
 */
export function getOccupiedUnabSlots(meeting, slots) {
  const meetingStart = timeToMinutes(meeting.startTime);
  const meetingEnd = timeToMinutes(meeting.endTime);

  return slots.filter((slot) => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    return slotStart < meetingEnd && slotEnd > meetingStart;
  });
}

/**
 * Agrupa reuniones consecutivas de una sección el mismo día.
 * @param {Array<object>} meetings
 * @returns {Array<object>}
 */
export function groupConsecutiveUnabMeetings(meetings) {
  if (!meetings || meetings.length === 0) return [];

  // Ordenar por día y hora de inicio
  const sorted = [...meetings].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return (a.dayOfWeek || 0) - (b.dayOfWeek || 0);
    }
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  const groups = [];

  for (const m of sorted) {
    if (groups.length === 0) {
      groups.push(createNewGroup(m));
      continue;
    }

    const lastGroup = groups[groups.length - 1];
    const sameDay = lastGroup.dayCode === m.dayCode;
    const endMins = timeToMinutes(lastGroup.endTime);
    const startMins = timeToMinutes(m.startTime);
    const consecutive = startMins >= endMins && (startMins - endMins <= 15);
    const sameActivity = lastGroup.activityType === m.activityType;

    if (sameDay && consecutive && sameActivity) {
      lastGroup.meetings.push(m);
      lastGroup.endTime = m.endTime;
      if (m.location && !lastGroup.locations.includes(m.location)) {
        lastGroup.locations.push(m.location);
      }
    } else {
      groups.push(createNewGroup(m));
    }
  }

  return groups;
}

function createNewGroup(m) {
  return {
    meetings: [m],
    startTime: m.startTime,
    endTime: m.endTime,
    dayCode: m.dayCode,
    dayOfWeek: m.dayOfWeek,
    location: m.location,
    locations: m.location ? [m.location] : [],
    isOnline: m.isOnline,
    activityType: m.activityType
  };
}

/**
 * Verifica si dos reuniones están en conflicto.
 * @param {{ dayCode: string, startTime: string, endTime: string }} meetingA
 * @param {{ dayCode: string, startTime: string, endTime: string }} meetingB
 * @returns {boolean}
 */
export function hasMeetingConflict(meetingA, meetingB) {
  if (meetingA.dayCode !== meetingB.dayCode) return false;

  const startA = timeToMinutes(meetingA.startTime);
  const endA = timeToMinutes(meetingA.endTime);
  const startB = timeToMinutes(meetingB.startTime);
  const endB = timeToMinutes(meetingB.endTime);

  if ([startA, endA, startB, endB].some((n) => Number.isNaN(n))) return false;
  if (startA >= endA || startB >= endB) return false;

  return startA < endB && endA > startB;
}

/**
 * Detecta todos los conflictos en el conjunto de secciones seleccionadas.
 * @param {Array<object>} selectedSections
 * @returns {Array<object>}
 */
export function getSelectionConflicts(selectedSections) {
  const conflicts = [];
  const flatMeetings = [];

  for (const sec of selectedSections || []) {
    for (const m of sec.meetings || []) {
      flatMeetings.push({
        meeting: m,
        section: sec,
        courseCode: sec.courseCode,
        courseTitle: sec.courseTitle
      });
    }
  }

  for (let i = 0; i < flatMeetings.length; i++) {
    for (let j = i + 1; j < flatMeetings.length; j++) {
      const mA = flatMeetings[i];
      const mB = flatMeetings[j];

      if (mA.courseCode !== mB.courseCode && hasMeetingConflict(mA.meeting, mB.meeting)) {
        conflicts.push({
          meetingA: mA,
          meetingB: mB
        });
      }
    }
  }

  return conflicts;
}

/**
 * Evalúa los conflictos de una sección candidata contra las seleccionadas.
 * @param {object} section
 * @param {Array<object>} selectedSections
 * @returns {Array<object>}
 */
export function getConflictsForSection(section, selectedSections) {
  const conflicts = [];
  const activeCourseCode = section.courseCode;

  // Filtrar la sección seleccionada del mismo ramo para simular reemplazo
  const otherSelected = (selectedSections || []).filter(
    (s) => s.courseCode !== activeCourseCode
  );

  const candidateMeetings = section.meetings || [];

  for (const otherSec of otherSelected) {
    for (const otherM of otherSec.meetings || []) {
      for (const m of candidateMeetings) {
        if (hasMeetingConflict(m, otherM)) {
          conflicts.push({
            myMeeting: m,
            otherMeeting: otherM,
            otherSection: otherSec
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Obtiene un color HSL estable y legible por código.
 * Evita verdes puros y rojos de conflicto.
 * @param {string} courseCode
 * @returns {{ bgLight: string, borderLight: string, textLight: string, bgDark: string, borderDark: string, textDark: string }}
 */
export function getStableCourseColor(courseCode) {
  const norm = String(courseCode || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Hues variados y agradables (se evitan 0/360 para rojo y se controlan verdes)
  const hues = [200, 270, 35, 160, 310, 80, 220, 255, 130, 340, 50, 185];

  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }

  const idx = Math.abs(hash) % hues.length;
  const hue = hues[idx];

  return {
    bgLight: `hsl(${hue}, 75%, 95%)`,
    borderLight: `hsl(${hue}, 60%, 80%)`,
    textLight: `hsl(${hue}, 80%, 25%)`,

    bgDark: `hsl(${hue}, 40%, 15%)`,
    borderDark: `hsl(${hue}, 35%, 28%)`,
    textDark: `hsl(${hue}, 80%, 85%)`
  };
}

/**
 * Calcula los límites inferior y superior del horario semanal.
 * @param {Array<object>} flatMeetings
 * @param {boolean} showFullDay
 * @returns {{ start: number, end: number }}
 */
export function getScheduleBounds(flatMeetings, showFullDay) {
  let start = timeToMinutes("08:30");
  let end = showFullDay ? timeToMinutes("22:05") : timeToMinutes("19:20");

  for (const m of flatMeetings || []) {
    const mStart = timeToMinutes(m.startTime);
    const mEnd = timeToMinutes(m.endTime);
    if (mStart < start) start = mStart;
    if (mEnd > end) end = mEnd;
  }

  return { start, end };
}

/**
 * Calcula los límites ajustados a clases.
 * Módulo anterior a la primera clase y módulo posterior a la última clase.
 * Rango mínimo por defecto: 08:30 a 19:20.
 * @param {Array<object>} flatMeetings
 * @returns {{ start: number, end: number }}
 */
export function getAdjustedBounds(flatMeetings) {
  if (!flatMeetings || flatMeetings.length === 0) {
    return { start: timeToMinutes("08:30"), end: timeToMinutes("19:20") };
  }

  let minStart = 24 * 60;
  let maxEnd = 0;

  for (const m of flatMeetings) {
    if (!m.startTime || !m.endTime) continue;
    const s = timeToMinutes(m.startTime);
    const e = timeToMinutes(m.endTime);
    if (s < minStart) minStart = s;
    if (e > maxEnd) maxEnd = e;
  }

  if (minStart === 24 * 60 || maxEnd === 0) {
    return { start: timeToMinutes("08:30"), end: timeToMinutes("19:20") };
  }

  const startSlotIdx = unabTimeSlots.findIndex(
    (slot) => timeToMinutes(slot.start) <= minStart && timeToMinutes(slot.end) >= minStart
  );
  const endSlotIdx = unabTimeSlots.findIndex(
    (slot) => timeToMinutes(slot.start) <= maxEnd && timeToMinutes(slot.end) >= maxEnd
  );

  const finalStartIdx = startSlotIdx !== -1 ? Math.max(0, startSlotIdx - 1) : 0;
  const finalEndIdx =
    endSlotIdx !== -1
      ? Math.min(unabTimeSlots.length - 1, endSlotIdx + 1)
      : unabTimeSlots.length - 1;

  const defaultStart = timeToMinutes("08:30");
  const defaultEnd = timeToMinutes("19:20");

  let start = timeToMinutes(unabTimeSlots[finalStartIdx].start);
  let end = timeToMinutes(unabTimeSlots[finalEndIdx].end);

  if (start > defaultStart) start = defaultStart;
  if (end < defaultEnd) end = defaultEnd;

  if (start > minStart) start = minStart;
  if (end < maxEnd) end = maxEnd;

  return { start, end };
}
