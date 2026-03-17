import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ImagePlus, LayoutGrid, List, Plus, Trash2 } from "lucide-react";
import {
  DAYS,
  buildSlots,
  createScheduleItem,
  getScheduleBounds,
} from "../utils/scheduleUtils";

const STORAGE_KEY = "malla-horario-v1";

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function loadSchedule() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const data = safeJsonParse(raw, null);
  if (!data || typeof data !== "object") return { items: [], imagesByDay: {} };
  return {
    items: Array.isArray(data.items) ? data.items : [],
    imagesByDay: data.imagesByDay && typeof data.imagesByDay === "object" ? data.imagesByDay : {},
  };
}

function saveSchedule(schedule) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

function dayLabel(dayId) {
  return DAYS.find((d) => d.id === dayId)?.label ?? String(dayId);
}

function formatEndTime(item, slotsByStart) {
  const slot = slotsByStart.get(item.startTime);
  if (!slot) return null;
  const blocks = Math.max(1, Number(item.blocks || 1));
  const endIndex = slot.index + (blocks - 1);
  const endSlot = Array.from(slotsByStart.values()).find((s) => s.index === endIndex);
  // endTime real = end of last slot in the block
  return endSlot?.endTime ?? slot.endTime;
}

export default function HorarioModal({
  isOpen,
  onClose,
  cursosCursandoData = [],
}) {
  const [tab, setTab] = useState("dia"); // "dia" | "semana"
  const [selectedDay, setSelectedDay] = useState(1);
  const fileRef = useRef(null);

  const [schedule, setSchedule] = useState(() => loadSchedule());

  useEffect(() => {
    if (!isOpen) return;
    setSchedule(loadSchedule());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    saveSchedule(schedule);
  }, [schedule, isOpen]);

  const cursosOptions = useMemo(() => {
    const items = Array.isArray(cursosCursandoData) ? cursosCursandoData : [];
    return items
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        codigo: c.codigo,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [cursosCursandoData]);

  const slots = useMemo(() => buildSlots({ firstTime: "08:30", lastTime: "22:00" }), []);
  const slotsByStart = useMemo(() => new Map(slots.map((s) => [s.startTime, s])), [slots]);

  const dayItems = useMemo(() => {
    return schedule.items
      .filter((it) => it.day === selectedDay)
      .sort((a, b) => {
        const sa = slotsByStart.get(a.startTime)?.startMinutes ?? 0;
        const sb = slotsByStart.get(b.startTime)?.startMinutes ?? 0;
        return sa - sb;
      });
  }, [schedule.items, selectedDay, slotsByStart]);

  const weekBounds = useMemo(() => getScheduleBounds(schedule.items, slots), [schedule.items, slots]);
  const visibleSlots = useMemo(() => slots.slice(weekBounds.minSlotIndex, weekBounds.maxSlotIndex + 1), [slots, weekBounds]);

  const [draft, setDraft] = useState(() => ({
    day: selectedDay,
    startTime: "08:30",
    blocks: 1,
    title: "",
    courseId: "",
  }));

  useEffect(() => {
    setDraft((d) => ({ ...d, day: selectedDay }));
  }, [selectedDay]);

  if (!isOpen) return null;

  const setDayImage = async (dayId, file) => {
    if (!file) return;
    const maxBytes = 2.5 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("La imagen es muy pesada (máx 2.5MB).");
      return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    setSchedule((prev) => ({
      ...prev,
      imagesByDay: { ...prev.imagesByDay, [String(dayId)]: dataUrl },
    }));
  };

  const removeDayImage = (dayId) => {
    setSchedule((prev) => {
      const next = { ...prev.imagesByDay };
      delete next[String(dayId)];
      return { ...prev, imagesByDay: next };
    });
  };

  const addItem = () => {
    const titleFromCourse =
      draft.courseId && draft.courseId !== ""
        ? cursosOptions.find((c) => c.id === draft.courseId)?.nombre || ""
        : "";

    const item = createScheduleItem({
      day: draft.day,
      startTime: draft.startTime,
      blocks: Number(draft.blocks || 1),
      title: (draft.title || titleFromCourse || "").trim(),
      courseId: draft.courseId || null,
    });

    setSchedule((prev) => ({ ...prev, items: [...prev.items, item] }));
    setDraft((d) => ({ ...d, title: "" }));
  };

  const updateItem = (id, patch) => {
    setSchedule((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const deleteItem = (id) => {
    setSchedule((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== id) }));
  };

  const importFromCursando = () => {
    const existing = new Set(schedule.items.map((it) => it.courseId).filter(Boolean));
    const toAdd = cursosOptions
      .filter((c) => !existing.has(c.id))
      .slice(0, 50)
      .map((c, idx) =>
        createScheduleItem({
          day: selectedDay,
          startTime: slots[Math.min(idx, slots.length - 1)]?.startTime || "08:30",
          blocks: 1,
          title: c.nombre,
          courseId: c.id,
        })
      );

    if (toAdd.length === 0) return;
    setSchedule((prev) => ({ ...prev, items: [...prev.items, ...toAdd] }));
  };

  return (
    <AnimatePresence>
      <motion.div
        key="horario-modal"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[85] flex items-center justify-center p-4 pb-[5rem] sm:pb-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-bgPrimary max-w-5xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-borderColor p-6"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-bgSecondary/60 hover:bg-bgSecondary transition flex items-center justify-center text-xl font-bold border border-borderColor"
            aria-label="Cerrar"
          >
            ✕
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
            <div>
              <h1 className="text-3xl font-bold text-textPrimary mb-1 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Horario
              </h1>
              <p className="text-textSecondary">
                Crea tu horario por bloques (45 min + 10 min pausa) y edita los nombres como quieras.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab("dia")}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                  tab === "dia"
                    ? "bg-primary text-white border-primary"
                    : "bg-bgSecondary/60 text-textSecondary border-borderColor hover:text-primary hover:border-primary/50"
                }`}
              >
                <List className="inline-block w-4 h-4 mr-2" />
                Día
              </button>
              <button
                onClick={() => setTab("semana")}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                  tab === "semana"
                    ? "bg-primary text-white border-primary"
                    : "bg-bgSecondary/60 text-textSecondary border-borderColor hover:text-primary hover:border-primary/50"
                }`}
              >
                <LayoutGrid className="inline-block w-4 h-4 mr-2" />
                Semana
              </button>
            </div>
          </div>

          {/* Selector de día */}
          <div className="flex flex-wrap gap-2 mb-4">
            {DAYS.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDay(d.id)}
                className={`px-3 py-2 rounded-full text-sm font-semibold border transition ${
                  selectedDay === d.id
                    ? "bg-primary text-white border-primary"
                    : "bg-bgSecondary/60 text-textSecondary border-borderColor hover:text-primary hover:border-primary/50"
                }`}
              >
                {d.label}
              </button>
            ))}

            <div className="flex-1" />

            <button
              onClick={importFromCursando}
              className="px-4 py-2 rounded-full text-sm font-semibold border bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 transition"
              title="Crea bloques base para tus ramos marcados como cursando"
            >
              Importar “cursando”
            </button>
          </div>

          {/* Imagen del horario por día */}
          <div className="glass-card p-4 rounded-xl border border-borderColor mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold text-textPrimary">
                  Imagen del horario ({dayLabel(selectedDay)})
                </div>
                <div className="text-sm text-textSecondary">
                  Sube una captura/PDF como imagen para tener referencia rápida (guardado localmente).
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setDayImage(selectedDay, e.target.files?.[0])}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-4 py-2 rounded-full text-sm font-semibold border bg-bgSecondary/70 text-textPrimary border-borderColor hover:border-primary/40 hover:text-primary transition"
                >
                  <ImagePlus className="inline-block w-4 h-4 mr-2" />
                  Subir
                </button>
                {schedule.imagesByDay?.[String(selectedDay)] && (
                  <button
                    onClick={() => removeDayImage(selectedDay)}
                    className="px-4 py-2 rounded-full text-sm font-semibold border bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15 transition"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>

            {schedule.imagesByDay?.[String(selectedDay)] && (
              <div className="mt-4 overflow-hidden rounded-xl border border-borderColor/50 bg-bgSecondary/40">
                <img
                  src={schedule.imagesByDay[String(selectedDay)]}
                  alt={`Horario ${dayLabel(selectedDay)}`}
                  className="w-full max-h-[320px] object-contain"
                />
              </div>
            )}
          </div>

          {/* Formulario: agregar bloque */}
          <div className="glass-card p-4 rounded-xl border border-borderColor mb-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">
                  Ramo (cursando)
                </label>
                <select
                  value={draft.courseId}
                  onChange={(e) => setDraft((d) => ({ ...d, courseId: e.target.value }))}
                  className="mt-1 w-full appearance-none rounded-xl px-3 py-2 border border-borderColor bg-bgSecondary/70 text-textPrimary text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">(Opcional) Elegir ramo</option>
                  {cursosOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">
                  Nombre (editable)
                </label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Ej: Matemáticas I"
                  className="mt-1 w-full rounded-xl px-3 py-2 border border-borderColor bg-bgSecondary/70 text-textPrimary text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">
                  Inicio
                </label>
                <select
                  value={draft.startTime}
                  onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
                  className="mt-1 w-full appearance-none rounded-xl px-3 py-2 border border-borderColor bg-bgSecondary/70 text-textPrimary text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {slots.map((s) => (
                    <option key={s.startTime} value={s.startTime}>
                      {s.startTime} → {s.endTime}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">
                  Bloques
                </label>
                <select
                  value={draft.blocks}
                  onChange={(e) => setDraft((d) => ({ ...d, blocks: Number(e.target.value) }))}
                  className="mt-1 w-full appearance-none rounded-xl px-3 py-2 border border-borderColor bg-bgSecondary/70 text-textPrimary text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} bloque{n > 1 ? "s" : ""} ({n * 45} min + {Math.max(0, n - 1) * 10} pausa)
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex gap-2">
                <button
                  onClick={addItem}
                  className="w-full px-4 py-2 rounded-xl text-sm font-bold border bg-primary text-white border-primary hover:brightness-110 transition"
                >
                  <Plus className="inline-block w-4 h-4 mr-2" />
                  Agregar
                </button>
              </div>
            </div>
          </div>

          {tab === "dia" ? (
            <div className="glass-card p-4 rounded-xl border border-borderColor">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-textPrimary">Clases del día ({dayLabel(selectedDay)})</div>
                <div className="text-sm text-textSecondary">{dayItems.length} bloque(s)</div>
              </div>

              {dayItems.length === 0 ? (
                <div className="text-textSecondary text-sm">
                  Aún no tienes bloques este día. Agrega uno arriba o importa desde “cursando”.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {dayItems.map((it) => {
                    const endTime = formatEndTime(it, slotsByStart);
                    return (
                      <div
                        key={it.id}
                        className="rounded-2xl border border-borderColor/50 bg-bgSecondary/60 p-4 flex flex-col md:flex-row md:items-center gap-3"
                      >
                        <div className="min-w-[170px]">
                          <div className="text-sm font-bold text-primary">
                            {it.startTime} {endTime ? `→ ${endTime}` : ""}
                          </div>
                          <div className="text-xs text-textSecondary">
                            {it.blocks} bloque{it.blocks > 1 ? "s" : ""} · {dayLabel(it.day)}
                          </div>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            value={it.title || ""}
                            onChange={(e) => updateItem(it.id, { title: e.target.value })}
                            className="w-full rounded-xl px-3 py-2 border border-borderColor bg-bgPrimary/40 text-textPrimary text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/40"
                          />

                          <select
                            value={it.courseId || ""}
                            onChange={(e) => {
                              const courseId = e.target.value || null;
                              const name = courseId
                                ? cursosOptions.find((c) => c.id === courseId)?.nombre || it.title
                                : it.title;
                              updateItem(it.id, { courseId, title: name });
                            }}
                            className="w-full appearance-none rounded-xl px-3 py-2 border border-borderColor bg-bgPrimary/40 text-textPrimary text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
                          >
                            <option value="">(Sin ramo asociado)</option>
                            {cursosOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={it.startTime}
                            onChange={(e) => updateItem(it.id, { startTime: e.target.value })}
                            className="appearance-none rounded-xl px-3 py-2 border border-borderColor bg-bgPrimary/40 text-textPrimary text-sm font-medium outline-none"
                          >
                            {slots.map((s) => (
                              <option key={s.startTime} value={s.startTime}>
                                {s.startTime}
                              </option>
                            ))}
                          </select>
                          <select
                            value={it.blocks}
                            onChange={(e) => updateItem(it.id, { blocks: Number(e.target.value) })}
                            className="appearance-none rounded-xl px-3 py-2 border border-borderColor bg-bgPrimary/40 text-textPrimary text-sm font-medium outline-none"
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n}b
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => deleteItem(it.id)}
                            className="w-10 h-10 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/15 transition flex items-center justify-center"
                            aria-label="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-4 rounded-xl border border-borderColor">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-textPrimary">Semana (ajustada a tus horas)</div>
                <div className="text-sm text-textSecondary">
                  {visibleSlots.length} bloque(s) visibles
                </div>
              </div>

              <div className="overflow-x-auto">
                <WeekGrid
                  visibleSlots={visibleSlots}
                  minSlotIndex={weekBounds.minSlotIndex}
                  schedule={schedule}
                  slotsByStart={slotsByStart}
                  cursosOptions={cursosOptions}
                  updateItem={updateItem}
                  deleteItem={deleteItem}
                />
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function WeekGrid({
  visibleSlots,
  minSlotIndex,
  schedule,
  slotsByStart,
  cursosOptions,
  updateItem,
  deleteItem,
}) {
  const rowHeight = 56; // px
  const headerHeight = 44; // px

  const items = schedule.items
    .filter((it) => slotsByStart.has(it.startTime))
    .map((it) => {
      const startIdx = slotsByStart.get(it.startTime)?.index ?? 0;
      const blocks = Math.max(1, Number(it.blocks || 1));
      return {
        ...it,
        _gridRowStart: startIdx - minSlotIndex + 2, // row 1 is header
        _gridRowEnd: startIdx - minSlotIndex + 2 + blocks,
        _gridCol: dayToGridCol(it.day),
      };
    });

  return (
    <div
      className="min-w-[980px] grid gap-2 relative"
      style={{
        gridTemplateColumns: `140px repeat(7, minmax(0, 1fr))`,
        gridTemplateRows: `${headerHeight}px repeat(${visibleSlots.length}, ${rowHeight}px)`,
      }}
    >
      {/* Header */}
      <div className="text-xs font-bold text-textSecondary uppercase tracking-wider px-2 py-2 flex items-center">
        Hora
      </div>
      {DAYS.map((d) => (
        <div
          key={d.id}
          className="text-xs font-bold text-textSecondary uppercase tracking-wider px-2 py-2 rounded-xl border border-borderColor/40 bg-bgSecondary/50 flex items-center"
        >
          {d.label}
        </div>
      ))}

      {/* Time column */}
      {visibleSlots.map((slot, i) => (
        <div
          key={slot.startTime}
          className="px-2 py-2 rounded-xl border border-borderColor/30 bg-bgSecondary/30"
          style={{ gridColumn: 1, gridRow: i + 2 }}
        >
          <div className="text-sm font-bold text-primary">{slot.startTime}</div>
          <div className="text-[11px] text-textSecondary">{slot.endTime}</div>
        </div>
      ))}

      {/* Background cells */}
      {visibleSlots.flatMap((slot, i) =>
        DAYS.map((d) => (
          <div
            key={`${slot.startTime}-${d.id}-bg`}
            className="rounded-xl border border-borderColor/30 bg-bgPrimary/20"
            style={{ gridColumn: dayToGridCol(d.id), gridRow: i + 2 }}
          />
        ))
      )}

      {/* Items (spanning rows) */}
      {items.map((it) => (
        <div
          key={it.id}
          className="z-[2] rounded-xl border border-primary/25 bg-primary/10 text-textPrimary p-2 overflow-hidden"
          style={{
            gridColumn: it._gridCol,
            gridRow: `${it._gridRowStart} / ${it._gridRowEnd}`,
            margin: "4px",
          }}
        >
          <input
            value={it.title || ""}
            onChange={(e) => updateItem(it.id, { title: e.target.value })}
            className="w-full bg-transparent outline-none text-sm font-bold"
          />
          <div className="mt-1 flex items-center gap-2">
            <select
              value={it.courseId || ""}
              onChange={(e) => {
                const courseId = e.target.value || null;
                const name = courseId
                  ? cursosOptions.find((c) => c.id === courseId)?.nombre || it.title
                  : it.title;
                updateItem(it.id, { courseId, title: name });
              }}
              className="flex-1 appearance-none rounded-lg px-2 py-1 border border-borderColor/40 bg-bgSecondary/40 text-[12px] font-medium outline-none"
            >
              <option value="">(sin ramo)</option>
              {cursosOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={() => deleteItem(it.id)}
              className="w-8 h-8 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/15 transition flex items-center justify-center"
              aria-label="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[11px] text-textSecondary mt-1">
            {it.startTime} · {Math.max(1, Number(it.blocks || 1))} bloque{Number(it.blocks || 1) > 1 ? "s" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

function dayToGridCol(dayId) {
  // grid columns: 1 = time, 2..8 = days (in DAYS order)
  const idx = DAYS.findIndex((d) => d.id === dayId);
  return 2 + (idx >= 0 ? idx : 0);
}

