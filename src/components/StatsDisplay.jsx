import { useEffect, useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { DAYS, getItemEndMinutes, timeToMinutes } from "../utils/scheduleUtils";
import { safeStorage } from "../utils/safeStorage";
import { LEGACY_KEYS } from "../utils/storageKeys";

/* ─── Lógica próxima clase ─── */
const SCHEDULE_KEY = LEGACY_KEYS.horario;

function loadItems() {
  const data = safeStorage.get(SCHEDULE_KEY, {});
  return Array.isArray(data?.items) ? data.items : [];
}

function findNextClass(items, now = new Date()) {
  if (!items.length) return null;
  const todayId = now.getDay();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const dayOrder = Array.from({ length: 8 }, (_, i) => (todayId + i) % 7);

  for (const dayId of dayOrder) {
    const isToday = dayId === todayId;
    const dayItems = items
      .filter((it) => Number(it.day) === dayId)
      .map((it) => ({ ...it, _startMins: timeToMinutes(it.startTime) ?? 0, _endMins: getItemEndMinutes(it) ?? 0 }))
      .sort((a, b) => a._startMins - b._startMins);

    for (const it of dayItems) {
      if (isToday) {
        if (it._endMins > nowMins) {
          return { ...it, isNow: it._startMins <= nowMins && it._endMins > nowMins, dayLabel: "Hoy" };
        }
      } else {
        const daysAhead = (dayId - todayId + 7) % 7;
        return { ...it, isNow: false, dayLabel: daysAhead === 1 ? "Mañana" : DAYS.find((d) => d.id === dayId)?.label ?? "" };
      }
    }
  }
  return null;
}

/* ─── Widget próxima clase ─── */
function ProximaClase({ nextClass }) {
  if (!nextClass) return null;

  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-lg transition-all hover:scale-105 ${
      nextClass.isNow
        ? "bg-primary border border-primary/30 shadow-primary/25"
        : "glass-card border border-borderColor/60 shadow-md"
    }`}>
      <div className="relative flex-shrink-0">
        <div className={`w-3 h-3 rounded-full ${nextClass.isNow ? "bg-white/90" : "bg-primary"}`} />
        {nextClass.isNow && <div className="absolute inset-0 w-3 h-3 rounded-full bg-white/60 animate-ping" />}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`text-xs font-semibold uppercase tracking-wider ${nextClass.isNow ? "text-white/90" : "text-textSecondary"}`}>
          {nextClass.isNow ? "En curso ahora" : `Próxima · ${nextClass.dayLabel}`}
        </span>
        <span className={`text-sm font-bold leading-tight ${nextClass.isNow ? "text-white" : "text-textPrimary"}`}>
          {nextClass.title || "Sin nombre"}
        </span>
        <div className={`flex items-center gap-2 text-xs mt-0.5 ${nextClass.isNow ? "text-white/80" : "text-textSecondary"}`}>
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{nextClass.startTime}</span>
          {nextClass.sala && (
            <>
              <span className="opacity-50">·</span>
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>{nextClass.sala}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── StatsDisplay ─── */
export default function StatsDisplay({
  cursosAprobados,
  cursosCursando,
  cursosEnCursoData = [],
}) {
  const [promedioEnCurso, setPromedioEnCurso] = useState(null);
  const [nextClass, setNextClass] = useState(null);

  useEffect(() => {
    const refresh = () => setNextClass(findNextClass(loadItems()));
    refresh();
    const interval = setInterval(refresh, 60_000);
    const onStorage = (e) => { if (!e.key || e.key === SCHEDULE_KEY) refresh(); };
    const onHorarioUpdated = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("horario-updated", onHorarioUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("horario-updated", onHorarioUpdated);
    };
  }, []);

  useEffect(() => {
    if (!cursosEnCursoData?.length) { setPromedioEnCurso(null); return; }
    const notasGuardadas = safeStorage.get(LEGACY_KEYS.notas, {});
    let sumaPonderada = 0, totalSct = 0;
    cursosEnCursoData.forEach((curso) => {
      const evaluaciones = (notasGuardadas[curso.id] || []).filter((e) => e.nota != null);
      if (!evaluaciones.length) return;
      const pesoConNota = evaluaciones.reduce((s, e) => s + (e.peso || 0), 0);
      if (pesoConNota <= 0) return;
      const promedio = evaluaciones.reduce((s, e) => s + (e.nota || 0) * (e.peso || 0), 0) / pesoConNota;
      const sct = curso.sct || 1;
      sumaPonderada += promedio * sct;
      totalSct += sct;
    });
    setPromedioEnCurso(totalSct > 0 ? sumaPonderada / totalSct : null);
  }, [cursosEnCursoData]);

  const hasDesktopContent = nextClass !== null || promedioEnCurso !== null;

  return (
    <>
      {/* Mobile: chips compactos */}
      <div className="mobile-progress-chips sm:hidden">
        <span className="mobile-progress-chip mobile-progress-chip--aprobados">
          ✓ {cursosAprobados} aprobado{cursosAprobados !== 1 ? "s" : ""}
        </span>
        <span className="text-textSecondary/40 text-[11px]">·</span>
        <span className="mobile-progress-chip mobile-progress-chip--encurso">
          ● {cursosCursando} en curso
        </span>
      </div>

      {/* Desktop / tablet: tarjetas completas */}
      {hasDesktopContent && (
        <div className="hidden sm:block w-full max-w-7xl mx-auto px-6 py-3">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">

            {/* Próxima clase */}
            <ProximaClase nextClass={nextClass} />

            {/* Promedio en curso */}
            {promedioEnCurso !== null && (
              <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl glass-card border border-borderColor/60 shadow-md transition-all hover:scale-105">
                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm" />
                <div className="flex flex-col">
                  <span className="text-textSecondary text-xs font-semibold uppercase tracking-wider">Promedio En Curso</span>
                  <span className="text-textPrimary text-xl font-bold leading-tight">{promedioEnCurso.toFixed(1)}</span>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}

import React from "react";
export const MemoizedStatsDisplay = React.memo(StatsDisplay);
