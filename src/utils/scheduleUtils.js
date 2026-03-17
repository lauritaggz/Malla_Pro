const SLOT_MINUTES = 45;
const BREAK_MINUTES = 10;
const STEP_MINUTES = SLOT_MINUTES + BREAK_MINUTES; // 55

export const DAYS = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mié" },
  { id: 4, label: "Jue" },
  { id: 5, label: "Vie" },
  { id: 6, label: "Sáb" },
  { id: 0, label: "Dom" },
];

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function timeToMinutes(t) {
  const [hStr, mStr] = String(t || "").split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function buildSlots({
  firstTime = "08:30",
  lastTime = "21:00",
} = {}) {
  const first = timeToMinutes(firstTime);
  const last = timeToMinutes(lastTime);
  if (first == null || last == null) return [];

  const slots = [];
  for (let start = first; start <= last; start += STEP_MINUTES) {
    slots.push({
      index: slots.length,
      startMinutes: start,
      startTime: minutesToTime(start),
      endMinutes: start + SLOT_MINUTES,
      endTime: minutesToTime(start + SLOT_MINUTES),
    });
  }
  return slots;
}

export function getItemEndMinutes(item) {
  const start = timeToMinutes(item?.startTime);
  if (start == null) return null;
  const blocks = Math.max(1, Number(item?.blocks || 1));
  return start + SLOT_MINUTES + (blocks - 1) * STEP_MINUTES;
}

export function getScheduleBounds(items, slots) {
  if (!Array.isArray(items) || items.length === 0) {
    return { minSlotIndex: 0, maxSlotIndex: Math.max(0, slots.length - 1) };
  }

  const byTime = new Map(slots.map((s) => [s.startTime, s.index]));

  let minIdx = Infinity;
  let maxIdx = -Infinity;
  for (const it of items) {
    const sIdx = byTime.get(it.startTime);
    if (sIdx == null) continue;
    const blocks = Math.max(1, Number(it.blocks || 1));
    const eIdx = sIdx + (blocks - 1);
    minIdx = Math.min(minIdx, sIdx);
    maxIdx = Math.max(maxIdx, eIdx);
  }

  if (!Number.isFinite(minIdx) || !Number.isFinite(maxIdx)) {
    return { minSlotIndex: 0, maxSlotIndex: Math.max(0, slots.length - 1) };
  }

  return {
    minSlotIndex: Math.max(0, minIdx),
    maxSlotIndex: Math.min(slots.length - 1, maxIdx),
  };
}

export function createScheduleItem({
  day,
  startTime,
  blocks = 1,
  title = "",
  courseId = null,
} = {}) {
  return {
    id: crypto?.randomUUID?.() || String(Date.now() + Math.random()),
    day,
    startTime,
    blocks: Math.max(1, Number(blocks || 1)),
    title: String(title || ""),
    courseId: courseId ?? null,
    createdAt: Date.now(),
  };
}

