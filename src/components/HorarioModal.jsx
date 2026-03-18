import { useEffect, useMemo, useRef, useState } from "react"; // useRef para formRef
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Calendar, Copy, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { DAYS, buildSlots, createScheduleItem, getScheduleBounds } from "../utils/scheduleUtils";

const STORAGE_KEY = "malla-horario-v1";
const BLANK_DRAFT = { day: 1, startTime: "08:30", blocks: 2, courseId: "", sala: "" };

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
function loadSchedule() {
  const data = safeJsonParse(localStorage.getItem(STORAGE_KEY), null);
  if (!data || typeof data !== "object") return { items: [], imagesByDay: {} };
  return {
    items: Array.isArray(data.items) ? data.items : [],
    imagesByDay: typeof data.imagesByDay === "object" ? data.imagesByDay : {},
  };
}
function saveSchedule(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("horario-updated"));
}
function dayLabel(id) { return DAYS.find((d) => d.id === id)?.label ?? String(id); }
function formatEndTime(item, slotsByStart) {
  const slot = slotsByStart.get(item.startTime);
  if (!slot) return null;
  const endIndex = slot.index + (Math.max(1, Number(item.blocks || 1)) - 1);
  return Array.from(slotsByStart.values()).find((s) => s.index === endIndex)?.endTime ?? slot.endTime;
}

export default function HorarioModal({ isOpen, onClose, cursosCursandoData = [] }) {
  const formRef = useRef(null);

  // Domingo (0) y Sábado (6) no son días de clases habituales → caer en Lunes
  const todayDayId = new Date().getDay();
  const defaultDay = todayDayId >= 1 && todayDayId <= 5 ? todayDayId : 1;

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [schedule, setSchedule] = useState(() => loadSchedule());
  const [draft, setDraft] = useState({ ...BLANK_DRAFT, day: defaultDay });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { if (isOpen) setSchedule(loadSchedule()); }, [isOpen]);
  useEffect(() => { if (isOpen) saveSchedule(schedule); }, [schedule, isOpen]);

  const cursosOptions = useMemo(() =>
    (Array.isArray(cursosCursandoData) ? cursosCursandoData : [])
      .map((c) => ({ id: String(c.id), nombre: c.nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [cursosCursandoData]
  );

  const slots = useMemo(() => buildSlots({ firstTime: "08:30", lastTime: "22:00" }), []);
  const slotsByStart = useMemo(() => new Map(slots.map((s) => [s.startTime, s])), [slots]);
  const hasCursando = cursosOptions.length > 0;

  // Celdas interiores a bloques multi-row (para ocultar línea intermedia)
  const interiorByDay = useMemo(() => {
    const map = new Map();
    schedule.items.forEach((it) => {
      const startIdx = slotsByStart.get(it.startTime)?.index;
      if (startIdx == null) return;
      const blocks = Math.max(1, Number(it.blocks || 1));
      for (let i = 1; i < blocks; i++) {
        if (!map.has(it.day)) map.set(it.day, new Set());
        map.get(it.day).add(startIdx + i);
      }
    });
    return map;
  }, [schedule.items, slotsByStart]);

  const interiorSlotIndices = useMemo(() => {
    const set = new Set();
    schedule.items.forEach((it) => {
      const startIdx = slotsByStart.get(it.startTime)?.index;
      if (startIdx == null) return;
      const blocks = Math.max(1, Number(it.blocks || 1));
      for (let i = 1; i < blocks; i++) set.add(startIdx + i);
    });
    return set;
  }, [schedule.items, slotsByStart]);

  // Solo mostrar el rango de slots relevante
  const visibleSlots = useMemo(() => {
    if (schedule.items.length === 0) return slots.slice(0, 12);
    const bounds = getScheduleBounds(schedule.items, slots);
    const from = Math.max(0, bounds.minSlotIndex - 1);
    const to = Math.min(slots.length - 1, bounds.maxSlotIndex + 2);
    return slots.slice(from, to + 1);
  }, [schedule.items, slots]);

  if (!isOpen) return null;

  /* ── helpers ── */
  const resolvedTitle = (d) => {
    if (d.courseId) return cursosOptions.find((c) => c.id === d.courseId)?.nombre || "Sin nombre";
    return "Sin nombre";
  };

  const hasCollision = (items, candidate, excludeId = null) => {
    const cStartIdx = slotsByStart.get(candidate.startTime)?.index;
    if (cStartIdx == null) return false;
    const cEndIdx = cStartIdx + Math.max(1, Number(candidate.blocks || 1));
    return items.some((it) => {
      if (excludeId && it.id === excludeId) return false;
      if (Number(it.day) !== Number(candidate.day)) return false;
      const iStartIdx = slotsByStart.get(it.startTime)?.index;
      if (iStartIdx == null) return false;
      const iEndIdx = iStartIdx + Math.max(1, Number(it.blocks || 1));
      return cStartIdx < iEndIdx && iStartIdx < cEndIdx;
    });
  };

  const nextFreeSlot = (items, day, fromIndex, blocks, excludeId = null) => {
    const sorted = Array.from(slotsByStart.values()).sort((a, b) => a.index - b.index);
    for (const s of sorted) {
      if (s.index < fromIndex) continue;
      if (!hasCollision(items, { day, startTime: s.startTime, blocks }, excludeId)) return s;
    }
    return null;
  };

  const clearForm = (day = selectedDay) => {
    setDraft({ ...BLANK_DRAFT, day });
    setEditingId(null);
  };

  const loadItemIntoDraft = (item) => {
    setDraft({
      day: item.day,
      startTime: item.startTime,
      blocks: Number(item.blocks || 2),
      courseId: item.courseId != null ? String(item.courseId) : "",
      sala: item.sala || "",
    });
    setEditingId(item.id);
    setSelectedDay(item.day);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const commitDraft = () => {
    const title = resolvedTitle(draft);
    const courseId = draft.courseId ? String(draft.courseId) : null;
    const candidate = { day: draft.day, startTime: draft.startTime, blocks: Number(draft.blocks || 1) };
    if (hasCollision(schedule.items, candidate, editingId || null)) {
      alert("Ya existe una clase en ese horario. Toca otra celda para cambiar la hora.");
      return;
    }
    if (editingId) {
      setSchedule((p) => ({
        ...p,
        items: p.items.map((it) =>
          it.id === editingId
            ? { ...it, day: draft.day, startTime: draft.startTime, blocks: Number(draft.blocks), title, courseId, sala: draft.sala || "" }
            : it
        ),
      }));
    } else {
      setSchedule((p) => ({
        ...p,
        items: [...p.items, createScheduleItem({ day: draft.day, startTime: draft.startTime, blocks: Number(draft.blocks || 1), title, courseId, sala: draft.sala || "" })],
      }));
    }
    clearForm(draft.day);
  };

  const deleteItem = (id) => {
    setSchedule((p) => ({ ...p, items: p.items.filter((it) => it.id !== id) }));
    if (editingId === id) clearForm();
  };

  const duplicateItem = () => {
    if (!editingItem) return;
    const currentSlot = slotsByStart.get(editingItem.startTime);
    const afterIndex = (currentSlot?.index ?? 0) + Math.max(1, Number(editingItem.blocks || 1));
    const freeSlot = nextFreeSlot(schedule.items, editingItem.day, afterIndex, editingItem.blocks);
    if (!freeSlot) { alert("No hay espacio libre después de esta clase en el mismo día."); return; }
    setSchedule((p) => ({
      ...p,
      items: [...p.items, createScheduleItem({
        day: editingItem.day,
        startTime: freeSlot.startTime,
        blocks: editingItem.blocks,
        title: editingItem.title,
        courseId: editingItem.courseId,
        sala: editingItem.sala,
      })],
    }));
    clearForm(editingItem.day);
  };

  const dropCursando = (courseId, day, startTime) => {
    const course = cursosOptions.find((c) => c.id === String(courseId));
    if (!course) return;
    const blocks = 2;
    if (hasCollision(schedule.items, { day, startTime, blocks })) {
      alert("Ya existe una clase en ese horario.");
      return;
    }
    setSchedule((p) => ({
      ...p,
      items: [...p.items, createScheduleItem({ day, startTime, blocks, title: course.nombre, courseId: String(courseId), sala: "" })],
    }));
  };

  const updateItem = (id, patch) =>
    setSchedule((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));

  const isEditing = editingId !== null;
  const editingItem = isEditing ? schedule.items.find((it) => it.id === editingId) : null;

  /* ── RENDER ── */
  return (
    <AnimatePresence>
      <motion.div
        key="horario-modal"
        exit={{ opacity: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[85] flex items-center justify-center p-2 sm:p-4 pb-[5rem] sm:pb-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-bgPrimary max-w-5xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl border border-borderColor p-4 sm:p-6"
        >
          <button onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 rounded-full bg-bgSecondary/60 hover:bg-bgSecondary transition flex items-center justify-center text-lg font-bold border border-borderColor text-textPrimary z-10">
            ✕
          </button>

          {/* Header */}
          <div className="mb-5 pr-10">
            <h1 className="text-xl sm:text-2xl font-bold text-textPrimary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary flex-shrink-0" /> Horario
            </h1>
            <p className="text-xs sm:text-sm text-textSecondary mt-0.5">
              Bloques 45 min + 10 min pausa · arrastra un ramo a la planilla
            </p>
          </div>

          {/* Formulario */}
          <div ref={formRef}
            className={`rounded-2xl border p-4 sm:p-5 mb-5 transition-colors duration-200 ${
              isEditing ? "border-primary/40 bg-primary/5" : "border-borderColor/50 bg-bgSecondary/40"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              {isEditing ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
              <span className="text-sm font-bold text-textPrimary flex-1">
                {isEditing ? `Editando: ${editingItem?.title || "clase"}` : "Agregar clase"}
              </span>
              {isEditing && (
                <button onClick={() => clearForm(selectedDay)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-textSecondary hover:text-primary border border-borderColor/50 hover:border-primary/30 transition">
                  <X className="w-3 h-3" /> Nuevo
                </button>
              )}
            </div>

            {/* Indicador de celda seleccionada */}
            {(draft.startTime && draft.day) && (
              <div className="flex items-center gap-1.5 text-xs text-textSecondary mb-4 px-1">
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>
                  Se colocará en <strong className="text-textPrimary">{dayLabel(draft.day)}</strong> a las{" "}
                  <strong className="text-textPrimary">{draft.startTime}</strong>
                  <span className="text-textSecondary/60"> · toca otra celda para cambiar</span>
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* Ramo */}
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">Ramo</label>
                <select value={draft.courseId}
                  onChange={(e) => setDraft((d) => ({ ...d, courseId: e.target.value }))}
                  className="w-full appearance-none rounded-xl px-3 py-2.5 border border-borderColor bg-bgPrimary text-textPrimary text-sm outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">Sin ramo / manual</option>
                  {cursosOptions.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              {/* Sala */}
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">Sala / Lugar</label>
                <input value={draft.sala}
                  onChange={(e) => setDraft((d) => ({ ...d, sala: e.target.value }))}
                  placeholder="Ej: A-201, Edificio B"
                  className="w-full rounded-xl px-3 py-2.5 border border-borderColor bg-bgPrimary text-textPrimary text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              {/* Duración */}
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">Duración</label>
                <select value={draft.blocks}
                  onChange={(e) => setDraft((d) => ({ ...d, blocks: Number(e.target.value) }))}
                  className="w-full appearance-none rounded-xl px-3 py-2.5 border border-borderColor bg-bgPrimary text-textPrimary text-sm outline-none focus:ring-2 focus:ring-primary/40">
                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} bloque{n > 1 ? "s" : ""} · {n * 45} min</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={commitDraft}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 transition shadow-sm flex items-center gap-1.5">
                {isEditing ? <><Pencil className="w-4 h-4" />Guardar cambios</> : <><Plus className="w-4 h-4" />Agregar al horario</>}
              </button>
              {isEditing && editingItem && (
                <>
                  <button onClick={duplicateItem}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold border border-borderColor bg-bgPrimary text-textPrimary hover:border-primary/50 hover:text-primary transition flex items-center gap-1.5">
                    <Copy className="w-4 h-4" />Duplicar
                  </button>
                  <button onClick={() => deleteItem(editingItem.id)}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/15 transition flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" />Eliminar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Aviso sin ramos cursando */}
          {!hasCursando && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mb-5 flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-textPrimary">Sin ramos "cursando"</div>
                <div className="text-xs text-textSecondary mt-0.5">
                  Márcalos como <strong>cursando</strong> en la malla para que aparezcan aquí.
                  De todas formas puedes agregar clases manualmente.
                </div>
              </div>
            </div>
          )}

          {/* Chips de cursando arrastrables */}
          {hasCursando && (
            <div className="rounded-2xl border border-borderColor/50 bg-bgSecondary/40 p-4 mb-5">
              <p className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
                Ramos cursando · arrastra a la planilla o toca para editar
              </p>
              <div className="flex flex-wrap gap-2">
                {cursosOptions.map((c) => {
                  const active = draft.courseId === c.id && isEditing;
                  return (
                    <button key={c.id} type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/cursando-id", c.id);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => {
                        setDraft((d) => ({ ...d, courseId: active ? "" : c.id }));
                        if (editingId) formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-grab active:cursor-grabbing select-none ${
                        active
                          ? "bg-primary text-white border-primary shadow"
                          : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                      }`}>
                      {c.nombre}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-textSecondary/60 mt-2">
                Arrastra directamente sobre la planilla · 2 bloques por defecto
              </p>
            </div>
          )}

          {/* Vista: semana desktop / día móvil */}
          <div className="rounded-2xl border border-borderColor/50 bg-bgSecondary/30 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-textPrimary">
                <span className="hidden sm:inline">Semana completa</span>
                <span className="sm:hidden">{dayLabel(selectedDay)}</span>
              </span>
              <span className="text-xs text-textSecondary">{schedule.items.length} clase{schedule.items.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Selector de día (solo móvil) */}
            <div className="flex flex-wrap gap-1.5 mb-3 sm:hidden">
              {DAYS.map((d) => (
                <button key={d.id}
                  onClick={() => { setSelectedDay(d.id); setDraft((prev) => ({ ...prev, day: d.id })); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    selectedDay === d.id ? "bg-primary text-white border-primary" :
                    d.id === todayDayId ? "bg-primary/10 text-primary border-primary/30" :
                    "bg-bgSecondary/60 text-textSecondary border-borderColor"
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>

            {/* Lista día (móvil) */}
            <div className="sm:hidden">
              <DayList
                items={schedule.items.filter((it) => it.day === selectedDay)
                  .sort((a, b) => (slotsByStart.get(a.startTime)?.startMinutes ?? 0) - (slotsByStart.get(b.startTime)?.startMinutes ?? 0))}
                allSlots={slots}
                slotsByStart={slotsByStart}
                editingId={editingId}
                onSelect={(it) => it.id === editingId ? clearForm(selectedDay) : loadItemIntoDraft(it)}
                onSelectEmpty={(startTime) => {
                  if (!isEditing) clearForm(selectedDay);
                  setDraft((d) => ({ ...d, day: selectedDay, startTime }));
                  formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
                formatEndTime={formatEndTime}
              />
            </div>

            {/* Grid semanal (desktop) */}
            <div className="hidden sm:block overflow-x-auto">
              <WeekGrid
                slots={visibleSlots}
                slotsByStart={slotsByStart}
                schedule={schedule}
                updateItem={updateItem}
                todayDayId={todayDayId}
                editingId={editingId}
                formatEndTime={formatEndTime}
                interiorByDay={interiorByDay}
                interiorSlotIndices={interiorSlotIndices}
                onSelectItem={loadItemIntoDraft}
                onSelectEmpty={(dayId, startTime) => {
                  if (!isEditing) clearForm(dayId);
                  setSelectedDay(dayId);
                  setDraft((d) => ({ ...d, day: dayId, startTime }));
                  formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
                onDropCursando={dropCursando}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Vista lista por día (móvil) ── */
function DayList({ items, allSlots, slotsByStart, editingId, onSelect, onSelectEmpty, formatEndTime }) {
  const visibleSlots = allSlots.slice(0, 16);
  return (
    <div className="flex flex-col gap-1">
      {visibleSlots.map((slot) => {
        const item = items.find((it) => it.startTime === slot.startTime);
        if (item) {
          const end = formatEndTime(item, slotsByStart);
          const sel = editingId === item.id;
          return (
            <button key={slot.startTime} type="button" onClick={() => onSelect(item)}
              className={`flex items-stretch rounded-2xl overflow-hidden border text-left w-full transition ${
                sel ? "border-primary bg-primary/10 shadow-md" : "border-borderColor/40 bg-bgPrimary/50 hover:border-primary/40"
              }`}>
              <div className="w-1 flex-shrink-0 bg-primary" />
              <div className="flex flex-col gap-0.5 flex-1 px-3 py-2.5">
                <div className="text-xs font-bold text-primary">{item.startTime}{end ? ` → ${end}` : ""}</div>
                <div className="text-sm font-semibold text-textPrimary">{item.title || "Sin nombre"}</div>
                {item.sala && <div className="text-xs text-textSecondary">📍 {item.sala}</div>}
              </div>
            </button>
          );
        }
        return (
          <button key={slot.startTime} type="button" onClick={() => onSelectEmpty(slot.startTime)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-left w-full hover:bg-primary/5 transition group">
            <span className="text-[11px] font-semibold text-textSecondary/50 w-10 flex-shrink-0">{slot.startTime}</span>
            <span className="text-xs text-textSecondary/30 group-hover:text-primary/40 transition">+ agregar</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── WeekGrid (desktop) ── */
function WeekGrid({ slots, slotsByStart, schedule, updateItem, todayDayId, editingId, formatEndTime, interiorByDay, interiorSlotIndices, onSelectItem, onSelectEmpty, onDropCursando }) {
  const ROW_H = 44;
  const HEAD_H = 48;

  const items = schedule.items
    .filter((it) => slotsByStart.has(it.startTime))
    .map((it) => {
      const absIdx = slotsByStart.get(it.startTime)?.index ?? 0;
      const visibleIdx = slots.findIndex((s) => s.index === absIdx);
      if (visibleIdx === -1) return null;
      return {
        ...it,
        _row: visibleIdx + 2,
        _rowSpan: Math.max(1, Number(it.blocks || 1)),
        _col: DAYS.findIndex((d) => d.id === it.day) + 2,
      };
    })
    .filter(Boolean);

  const handleDrop = (e, dayId, startTime) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/schedule-item-id");
    if (itemId) { updateItem(itemId, { day: dayId, startTime }); return; }
    const cursandoId = e.dataTransfer.getData("text/cursando-id");
    if (cursandoId) onDropCursando(cursandoId, dayId, startTime);
  };

  return (
    <div className="relative"
      style={{
        display: "grid",
        gridTemplateColumns: `64px repeat(7, minmax(80px, 1fr))`,
        gridTemplateRows: `${HEAD_H}px repeat(${slots.length}, ${ROW_H}px)`,
        minWidth: 640,
      }}
    >
      <div style={{ gridColumn: 1, gridRow: 1 }} />

      {DAYS.map((d, ci) => (
        <div key={d.id} style={{ gridColumn: ci + 2, gridRow: 1 }}
          className={`flex items-center justify-center text-xs font-bold uppercase tracking-wider rounded-xl mx-0.5 ${
            d.id === todayDayId ? "bg-primary/10 text-primary" : "text-textSecondary"
          }`}>
          {d.label}
        </div>
      ))}

      {slots.map((slot, i) => (
        <div key={`h-${slot.startTime}`} style={{ gridColumn: 1, gridRow: i + 2 }}
          className="pr-2 flex items-start pt-1 justify-end">
          {!interiorSlotIndices.has(slot.index) && (
            <span className="text-[11px] font-semibold text-textSecondary/70">{slot.startTime}</span>
          )}
        </div>
      ))}

      {slots.flatMap((slot, i) =>
        DAYS.map((d, ci) => {
          const isInterior = interiorByDay.get(d.id)?.has(slot.index) ?? false;
          return (
            <div key={`${slot.startTime}-${d.id}`}
              style={{ gridColumn: ci + 2, gridRow: i + 2 }}
              className={`mx-0.5 cursor-pointer hover:bg-primary/5 transition ${isInterior ? "" : "border-t border-borderColor/20"}`}
              onClick={() => onSelectEmpty(d.id, slot.startTime)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = e.dataTransfer.types.includes("text/schedule-item-id") ? "move" : "copy";
              }}
              onDrop={(e) => handleDrop(e, d.id, slot.startTime)}
            />
          );
        })
      )}

      {items.map((it) => {
        const end = formatEndTime(it, slotsByStart);
        const sel = editingId === it.id;
        return (
          <div key={it.id}
            style={{ gridColumn: it._col, gridRow: `${it._row} / span ${it._rowSpan}`, margin: "2px 3px", zIndex: 10, position: "relative" }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/schedule-item-id", it.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={(e) => { e.stopPropagation(); onSelectItem(it); }}
            className={`cursor-pointer rounded-xl overflow-hidden flex flex-col transition ${sel ? "ring-2 ring-primary" : ""}`}
          >
            <div className={`flex h-full rounded-xl overflow-hidden border transition ${
              sel ? "border-primary bg-primary/20" : "border-primary/20 bg-primary/10 hover:bg-primary/15"
            }`}>
              <div className="w-[3px] flex-shrink-0 bg-primary" />
              <div className="flex flex-col justify-center px-2 py-1 min-w-0 flex-1 overflow-hidden">
                <div className="text-[11px] font-bold text-textPrimary leading-tight truncate">{it.title || "Sin nombre"}</div>
                {it.sala && <div className="text-[10px] text-textSecondary leading-tight truncate">📍 {it.sala}</div>}
                {end && <div className="text-[10px] text-textSecondary leading-tight">{it.startTime} → {end}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
