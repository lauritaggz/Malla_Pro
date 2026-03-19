import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, Calendar, ChevronRight,
  Copy, MapPin, Pencil, Plus, Trash2, X,
} from "lucide-react";
import { DAYS, buildSlots, createScheduleItem, getScheduleBounds } from "../utils/scheduleUtils";
import DrawerPanel from "./DrawerPanel";

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

  const todayDayId = new Date().getDay();
  const defaultDay = todayDayId >= 1 && todayDayId <= 5 ? todayDayId : 1;

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [schedule, setSchedule] = useState(() => loadSchedule());
  const [draft, setDraft] = useState({ ...BLANK_DRAFT, day: defaultDay });
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileView, setMobileView] = useState("schedule"); // "schedule" | "form"
  const toastTimerRef = useRef(null);

  useEffect(() => { if (isOpen) setSchedule(loadSchedule()); }, [isOpen]);
  useEffect(() => { if (isOpen) saveSchedule(schedule); }, [schedule, isOpen]);

  // Reset mobile view when modal closes
  useEffect(() => { if (!isOpen) setMobileView("schedule"); }, [isOpen]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const cursosOptions = useMemo(() =>
    (Array.isArray(cursosCursandoData) ? cursosCursandoData : [])
      .map((c) => ({ id: String(c.id), nombre: c.nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [cursosCursandoData]
  );

  const slots = useMemo(() => buildSlots({ firstTime: "08:30", lastTime: "22:00" }), []);
  const slotsByStart = useMemo(() => new Map(slots.map((s) => [s.startTime, s])), [slots]);
  const hasCursando = cursosOptions.length > 0;

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

  const visibleSlots = useMemo(() => {
    if (schedule.items.length === 0) return slots.slice(0, 12);
    const bounds = getScheduleBounds(schedule.items, slots);
    const from = Math.max(0, bounds.minSlotIndex - 1);
    const to = Math.min(slots.length - 1, bounds.maxSlotIndex + 2);
    return slots.slice(from, to + 1);
  }, [schedule.items, slots]);

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
    setMobileView("form");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const commitDraft = () => {
    const title = resolvedTitle(draft);
    const courseId = draft.courseId ? String(draft.courseId) : null;
    const candidate = { day: draft.day, startTime: draft.startTime, blocks: Number(draft.blocks || 1) };
    if (hasCollision(schedule.items, candidate, editingId || null)) {
      showToast("Ya existe una clase en ese horario.");
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
    setMobileView("schedule");
  };

  const deleteItem = (id) => {
    setSchedule((p) => ({ ...p, items: p.items.filter((it) => it.id !== id) }));
    if (editingId === id) { clearForm(); setMobileView("schedule"); }
  };

  const duplicateItem = () => {
    if (!editingItem) return;
    const currentSlot = slotsByStart.get(editingItem.startTime);
    const afterIndex = (currentSlot?.index ?? 0) + Math.max(1, Number(editingItem.blocks || 1));
    const freeSlot = nextFreeSlot(schedule.items, editingItem.day, afterIndex, editingItem.blocks);
    if (!freeSlot) { showToast("No hay espacio libre después de esta clase en el mismo día."); return; }
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
    setMobileView("schedule");
  };

  const dropCursando = (courseId, day, startTime) => {
    const course = cursosOptions.find((c) => c.id === String(courseId));
    if (!course) return;
    const blocks = 2;
    if (hasCollision(schedule.items, { day, startTime, blocks })) {
      showToast("Ya existe una clase en ese horario.");
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

  // Clases del día seleccionado ordenadas por hora
  const dayItems = useMemo(() =>
    schedule.items
      .filter((it) => it.day === selectedDay)
      .sort((a, b) => (slotsByStart.get(a.startTime)?.startMinutes ?? 0) - (slotsByStart.get(b.startTime)?.startMinutes ?? 0)),
    [schedule.items, selectedDay, slotsByStart]
  );

  // Conteo de clases por día
  const countByDay = useMemo(() => {
    const map = new Map();
    schedule.items.forEach((it) => map.set(it.day, (map.get(it.day) || 0) + 1));
    return map;
  }, [schedule.items]);

  /* ── Shared form fields ── */
  const FormFields = ({ compact = false }) => (
    <div className={`space-y-3 ${compact ? "" : "mb-4"}`}>
      <div>
        <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Ramo</label>
        <select
          value={draft.courseId}
          onChange={(e) => setDraft((d) => ({ ...d, courseId: e.target.value }))}
          className="w-full rounded-lg px-3 py-2.5 border border-borderColor bg-bgPrimary text-textPrimary text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition appearance-none"
        >
          <option value="">Sin ramo</option>
          {cursosOptions.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Sala</label>
          <input
            value={draft.sala}
            onChange={(e) => setDraft((d) => ({ ...d, sala: e.target.value }))}
            placeholder="Ej: A-201"
            className="w-full rounded-lg px-3 py-2.5 border border-borderColor bg-bgPrimary text-textPrimary text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Duración</label>
          <select
            value={draft.blocks}
            onChange={(e) => setDraft((d) => ({ ...d, blocks: Number(e.target.value) }))}
            className="w-full rounded-lg px-3 py-2.5 border border-borderColor bg-bgPrimary text-textPrimary text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition appearance-none"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} bl · {n * 45}min</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  /* ── RENDER ── */
  return (
    <DrawerPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Horario"
      subtitle={`${schedule.items.length} clase${schedule.items.length !== 1 ? "s" : ""} · bloques 45 min`}
      width="max-w-2xl"
    >
      {/* ══════════════════════════════════════════
          MOBILE LAYOUT
          ══════════════════════════════════════════ */}
      <div className="sm:hidden" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast-m"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="absolute top-2 left-4 right-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-sm font-medium shadow-lg"
            >
              <span className="flex-1">{toast}</span>
              <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Day bar (siempre visible) ── */}
        <MobileDayBar
          days={DAYS}
          selectedDay={selectedDay}
          todayDayId={todayDayId}
          countByDay={countByDay}
          onSelect={(id) => {
            setSelectedDay(id);
            setDraft((d) => ({ ...d, day: id }));
            setMobileView("schedule");
          }}
        />

        {/* ── Vistas con animación ── */}
        <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
          <AnimatePresence mode="wait" initial={false}>
            {mobileView === "schedule" ? (
              /* Vista A — Lista de clases del día */
              <motion.div
                key="schedule-view"
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute inset-0 overflow-y-auto"
              >
                <MobileClassList
                  items={dayItems}
                  slotsByStart={slotsByStart}
                  editingId={editingId}
                  onSelect={loadItemIntoDraft}
                  formatEndTime={formatEndTime}
                />
              </motion.div>
            ) : (
              /* Vista B — Formulario */
              <motion.div
                key="form-view"
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="absolute inset-0 overflow-y-auto"
                ref={formRef}
              >
                <div className="px-4 py-4 space-y-5 pb-8">
                  {/* Sub-header de la vista B */}
                  <div className={`rounded-xl border p-4 ${isEditing ? "border-primary/30 bg-primaryMuted" : "border-borderColor bg-bgSurface"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {isEditing ? <Pencil className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
                      <span className="text-sm font-semibold text-textPrimary">
                        {isEditing ? `Editando: ${editingItem?.title || "clase"}` : "Nueva clase"}
                      </span>
                    </div>
                    {/* Posición seleccionada */}
                    <div className="flex items-center gap-1.5 text-xs text-textSecondary">
                      <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                      <span>
                        <strong className="text-textPrimary">{dayLabel(draft.day)}</strong> · <strong className="text-textPrimary">{draft.startTime}</strong>
                        <span className="text-textSecondary/60"> · toca el horario para cambiar</span>
                      </span>
                    </div>
                  </div>

                  {/* Campos del formulario */}
                  <FormFields />

                  {/* Chips de cursando */}
                  {hasCursando && (
                    <div>
                      <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-2">Ramos cursando</p>
                      <div className="flex flex-wrap gap-2">
                        {cursosOptions.map((c) => {
                          const active = draft.courseId === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setDraft((d) => ({ ...d, courseId: active ? "" : c.id }))}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition select-none ${
                                active
                                  ? "bg-primary text-white border-primary"
                                  : "border-primary/25 bg-primaryMuted text-primary hover:bg-primary/15"
                              }`}
                            >
                              {c.nombre}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!hasCursando && (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-3 flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-textSecondary">
                        Sin ramos marcados como <strong>cursando</strong>. Puedes igualmente agregar la clase manualmente.
                      </p>
                    </div>
                  )}

                  {/* Hora manual (selector de slot) */}
                  <div>
                    <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-2">
                      Hora de inicio
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {slots.slice(0, 20).map((s) => (
                        <button
                          key={s.startTime}
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, startTime: s.startTime }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                            draft.startTime === s.startTime
                              ? "bg-primary text-white border-primary"
                              : "border-borderColor bg-bgPrimary text-textSecondary hover:border-primary/40"
                          }`}
                        >
                          {s.startTime}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={commitDraft}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:opacity-90 transition"
                    >
                      {isEditing ? <><Pencil className="w-4 h-4" />Guardar cambios</> : <><Plus className="w-4 h-4" />Agregar al horario</>}
                    </button>
                    {isEditing && editingItem && (
                      <div className="flex gap-2">
                        <button
                          onClick={duplicateItem}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border border-borderColor bg-bgPrimary text-textPrimary hover:border-primary/40 hover:text-primary transition"
                        >
                          <Copy className="w-4 h-4" />Duplicar
                        </button>
                        <button
                          onClick={() => deleteItem(editingItem.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border border-red-500/25 bg-red-500/8 text-red-500 hover:bg-red-500/15 transition"
                        >
                          <Trash2 className="w-4 h-4" />Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── FAB (solo en vista schedule) ── */}
        <AnimatePresence>
          {mobileView === "schedule" && (
            <motion.button
              key="fab"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onClick={() => {
                clearForm(selectedDay);
                setMobileView("form");
              }}
              className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center z-10"
              style={{ boxShadow: "0 4px 20px var(--shadowPrimary)" }}
              aria-label="Agregar clase"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Botón volver (solo en vista form) ── */}
        <AnimatePresence>
          {mobileView === "form" && (
            <motion.div
              key="back-bar"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex-shrink-0 border-t border-borderColor px-4 py-3 bg-bgSecondary"
            >
              <button
                onClick={() => { clearForm(selectedDay); setMobileView("schedule"); }}
                className="flex items-center gap-2 text-sm text-textSecondary hover:text-textPrimary transition"
              >
                <ArrowLeft className="w-4 h-4" /> Volver al horario
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP LAYOUT (sin cambios)
          ══════════════════════════════════════════ */}
      <div className="hidden sm:block px-6 py-5 space-y-5" style={{ overflowY: "auto", flex: 1 }}>

        {/* Toast desktop */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast-d"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-sm font-medium"
            >
              <span className="flex-shrink-0">⚠</span>
              <span className="flex-1">{toast}</span>
              <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulario Agregar / Editar */}
        <div
          ref={formRef}
          className={`rounded-xl border p-4 transition-colors duration-200 ${
            isEditing ? "border-primary/30 bg-primaryMuted" : "border-borderColor bg-bgSurface"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            {isEditing ? <Pencil className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
            <span className="text-xs font-semibold text-textPrimary uppercase tracking-wide flex-1">
              {isEditing ? `Editando: ${editingItem?.title || "clase"}` : "Agregar clase"}
            </span>
            {isEditing && (
              <button
                onClick={() => clearForm(selectedDay)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-textSecondary hover:text-primary border border-borderColor hover:border-primary/30 transition"
              >
                <X className="w-3 h-3" /> Nuevo
              </button>
            )}
          </div>

          {draft.startTime && draft.day && (
            <div className="flex items-center gap-1.5 text-xs text-textSecondary mb-4 px-1">
              <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span>
                <strong className="text-textPrimary">{dayLabel(draft.day)}</strong>{" "}
                a las <strong className="text-textPrimary">{draft.startTime}</strong>
                <span className="text-textSecondary/60"> · toca otra celda para cambiar</span>
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Ramo</label>
              <select
                value={draft.courseId}
                onChange={(e) => setDraft((d) => ({ ...d, courseId: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 border border-borderColor bg-bgPrimary text-textPrimary text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition appearance-none"
              >
                <option value="">Sin ramo</option>
                {cursosOptions.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Sala</label>
              <input
                value={draft.sala}
                onChange={(e) => setDraft((d) => ({ ...d, sala: e.target.value }))}
                placeholder="Ej: A-201"
                className="w-full rounded-lg px-3 py-2 border border-borderColor bg-bgPrimary text-textPrimary text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Duración</label>
              <select
                value={draft.blocks}
                onChange={(e) => setDraft((d) => ({ ...d, blocks: Number(e.target.value) }))}
                className="w-full rounded-lg px-3 py-2 border border-borderColor bg-bgPrimary text-textPrimary text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition appearance-none"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} bloque{n > 1 ? "s" : ""} · {n * 45} min</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={commitDraft}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:opacity-90 transition shadow-sm"
            >
              {isEditing ? <><Pencil className="w-3.5 h-3.5" />Guardar</> : <><Plus className="w-3.5 h-3.5" />Agregar</>}
            </button>
            {isEditing && editingItem && (
              <>
                <button
                  onClick={duplicateItem}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-borderColor bg-bgPrimary text-textPrimary hover:border-primary/40 hover:text-primary transition"
                >
                  <Copy className="w-3.5 h-3.5" />Duplicar
                </button>
                <button
                  onClick={() => deleteItem(editingItem.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-red-500/25 bg-red-500/8 text-red-500 hover:bg-red-500/15 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />Eliminar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Ramos cursando */}
        {!hasCursando ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-textPrimary">Sin ramos marcados como cursando</div>
              <div className="text-xs text-textSecondary mt-0.5">
                Márcalos como <strong>cursando</strong> en la malla para que aparezcan aquí.
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-borderColor bg-bgSurface p-4">
            <p className="text-[11px] font-semibold text-textSecondary uppercase tracking-wide mb-3">
              Ramos cursando · arrastra a la planilla
            </p>
            <div className="flex flex-wrap gap-2">
              {cursosOptions.map((c) => {
                const active = draft.courseId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/cursando-id", c.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => setDraft((d) => ({ ...d, courseId: active ? "" : c.id }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-grab active:cursor-grabbing select-none ${
                      active ? "bg-primary text-white border-primary" : "border-primary/25 bg-primaryMuted text-primary hover:bg-primary/15"
                    }`}
                  >
                    {c.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Planilla desktop */}
        <div className="rounded-xl border border-borderColor bg-bgSurface overflow-hidden">
          <div className="px-4 py-3 border-b border-borderColor flex items-center justify-between">
            <span className="text-xs font-semibold text-textPrimary uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5 inline mr-1.5 text-primary" />Semana
            </span>
            <span className="text-xs text-textSecondary">{schedule.items.length} clase{schedule.items.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto p-4">
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
      </div>
    </DrawerPanel>
  );
}

/* ── MobileDayBar ── */
function MobileDayBar({ days, selectedDay, todayDayId, countByDay, onSelect }) {
  return (
    <div className="flex-shrink-0 border-b border-borderColor bg-bgSecondary">
      <div className="flex overflow-x-auto px-3 py-2 gap-1 scroll-smooth">
        {days.map((d) => {
          const count = countByDay.get(d.id) || 0;
          const isToday = d.id === todayDayId;
          const isSelected = d.id === selectedDay;
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition min-w-[52px] ${
                isSelected
                  ? "bg-primary text-white"
                  : isToday
                    ? "bg-primaryMuted text-primary"
                    : "text-textSecondary hover:bg-borderColor/30"
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wide">{d.label.slice(0, 2)}</span>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isSelected
                  ? "bg-white/20 text-white"
                  : count > 0
                    ? "bg-primary/15 text-primary"
                    : "text-textSecondary/40"
              }`}>
                {count > 0 ? count : "·"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── MobileClassList ── */
function MobileClassList({ items, slotsByStart, editingId, onSelect, formatEndTime }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 text-center py-24" style={{ minHeight: "100%" }}>
        <div className="w-14 h-14 rounded-2xl bg-borderColor/30 flex items-center justify-center">
          <Calendar className="w-7 h-7 text-textSecondary/40" />
        </div>
        <div>
          <p className="text-sm font-semibold text-textPrimary">Sin clases este día</p>
          <p className="text-xs text-textSecondary mt-0.5">Toca <strong>+</strong> para agregar una clase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2.5 pb-24">
      {items.map((item) => {
        const end = formatEndTime(item, slotsByStart);
        const sel = editingId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`w-full text-left rounded-2xl border overflow-hidden flex items-stretch transition active:scale-[0.98] ${
              sel ? "border-primary bg-primaryMuted" : "border-borderColor bg-bgPrimary hover:border-primary/30"
            }`}
          >
            {/* Borde de color */}
            <div className="w-1.5 flex-shrink-0 bg-primary" />
            <div className="flex-1 px-4 py-3.5 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-textPrimary leading-snug truncate">
                    {item.title || "Sin nombre"}
                  </div>
                  {item.sala && (
                    <div className="text-xs text-textSecondary mt-0.5">📍 {item.sala}</div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-textSecondary/40 flex-shrink-0 mt-0.5" />
              </div>
              <div className="text-xs font-semibold text-primary mt-1.5">
                {item.startTime}{end ? ` → ${end}` : ""}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── WeekGrid (desktop, sin cambios) ── */
function WeekGrid({ slots, slotsByStart, schedule, updateItem, todayDayId, editingId, formatEndTime, interiorByDay, interiorSlotIndices, onSelectItem, onSelectEmpty, onDropCursando }) {
  const ROW_H = 44;
  const HEAD_H = 40;

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
    <div
      className="relative"
      style={{
        display: "grid",
        gridTemplateColumns: `60px repeat(7, minmax(72px, 1fr))`,
        gridTemplateRows: `${HEAD_H}px repeat(${slots.length}, ${ROW_H}px)`,
        minWidth: 580,
      }}
    >
      <div style={{ gridColumn: 1, gridRow: 1 }} />
      {DAYS.map((d, ci) => (
        <div key={d.id} style={{ gridColumn: ci + 2, gridRow: 1 }}
          className={`flex items-center justify-center text-[11px] font-bold uppercase tracking-widest pb-1 ${
            d.id === todayDayId ? "text-primary" : "text-textSecondary/60"
          }`}>
          {d.label.slice(0, 3)}
        </div>
      ))}
      {slots.map((slot, i) => (
        <div key={`h-${slot.startTime}`} style={{ gridColumn: 1, gridRow: i + 2 }}
          className="pr-2 flex items-start pt-1 justify-end">
          {!interiorSlotIndices.has(slot.index) && (
            <span className="text-[10px] font-medium text-textSecondary/50">{slot.startTime}</span>
          )}
        </div>
      ))}
      {slots.flatMap((slot, i) =>
        DAYS.map((d, ci) => {
          const isInterior = interiorByDay.get(d.id)?.has(slot.index) ?? false;
          return (
            <div key={`${slot.startTime}-${d.id}`}
              style={{ gridColumn: ci + 2, gridRow: i + 2 }}
              className={`mx-0.5 cursor-pointer hover:bg-primaryMuted transition-colors ${isInterior ? "" : "border-t border-borderColor/30"}`}
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
            className={`cursor-pointer rounded-lg overflow-hidden flex flex-col transition-all ${sel ? "ring-2 ring-primary ring-offset-1" : ""}`}
          >
            <div className={`flex h-full rounded-lg overflow-hidden border transition ${
              sel ? "border-primary bg-primaryMuted" : "border-primary/20 bg-primary/8 hover:bg-primary/12 hover:border-primary/35"
            }`}>
              <div className="w-[3px] flex-shrink-0" style={{ background: "var(--primary)" }} />
              <div className="flex flex-col justify-center px-1.5 py-1 min-w-0 flex-1 overflow-hidden gap-0.5">
                <div className="text-[10px] font-bold text-textPrimary leading-tight truncate">{it.title || "Sin nombre"}</div>
                {it.sala && <div className="text-[9px] text-textSecondary leading-tight truncate">📍 {it.sala}</div>}
                {end && <div className="text-[9px] text-textSecondary/70 leading-tight">{it.startTime}–{end}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
