/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { unabTimeSlots, getStableCourseColor, timeToMinutes } from "../services/scheduleService";

const styles = StyleSheet.create({
  page: {
    padding: 24,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1e293b",
    paddingBottom: 8,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "column",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  periodText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f172a",
  },
  summaryText: {
    fontSize: 8.5,
    color: "#64748b",
    marginTop: 2.5,
  },
  // Grilla
  gridContainer: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    flexDirection: "row",
    height: 290,
    position: "relative",
    marginBottom: 16,
  },
  timeColumn: {
    width: 50,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "flex-end",
    paddingRight: 4,
  },
  timeLabel: {
    fontSize: 8,
    color: "#64748b",
    position: "absolute",
    right: 4,
    transform: "translateY(-4px)",
  },
  dayColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    position: "relative",
    height: "100%",
  },
  dayColumnLast: {
    flex: 1,
    position: "relative",
    height: "100%",
  },
  dayHeader: {
    height: 16,
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
  },
  dayHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#475569",
  },
  // Líneas horizontales de fondo
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  pauseBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#fafafa",
  },
  // Bloques de clase
  meetingBlock: {
    position: "absolute",
    borderRadius: 4,
    borderWidth: 1,
    padding: 3,
    left: 2,
    right: 2,
  },
  blockTitle: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.15,
  },
  blockMeta: {
    fontSize: 6.5,
    color: "#475569",
    marginTop: 1,
  },
  // Tabla de ramos
  tableHeader: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
    marginTop: 6,
  },
  table: {
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  colCourse: { flex: 3 },
  colSec: { flex: 1, textAlign: "center" },
  colNrc: { flex: 1, textAlign: "center" },
  colCred: { flex: 1, textAlign: "center" },
  colCap: { flex: 1.2, textAlign: "center" },
  thText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#475569",
  },
  tdText: {
    fontSize: 8,
    color: "#0f172a",
  },
  tdTextSec: {
    fontSize: 7,
    color: "#64748b",
    marginTop: 1,
  },
  tableFooterRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: "flex-end",
  },
  footerText: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 8,
    textAlign: "center",
  },
});

const SLOT_HEIGHT = 15; // altura de slot en puntos
const PAUSE_HEIGHT = 3;  // altura de pausa en puntos
const ROW_TOTAL = SLOT_HEIGHT + PAUSE_HEIGHT; // 18 pt en total por bloque

function getSlotIndices(startTime, endTime) {
  const startVal = timeToMinutes(startTime);
  const endVal = timeToMinutes(endTime);

  const startIdx = unabTimeSlots.findIndex(
    (s) => timeToMinutes(s.start) <= startVal && timeToMinutes(s.end) >= startVal
  );
  const endIdx = unabTimeSlots.findIndex(
    (s) => timeToMinutes(s.start) <= endVal && timeToMinutes(s.end) >= endVal
  );

  return {
    startIdx: startIdx !== -1 ? startIdx : 0,
    endIdx: endIdx !== -1 ? endIdx : 0,
  };
}

// Mapear reuniones de secciones seleccionadas y calcular posiciones y columnas de superposición
function preparePdfMeetings(selectedSectionsList) {
  const meetingsByDay = { LU: [], MA: [], MI: [], JU: [], VI: [], SA: [] };

  for (const sec of selectedSectionsList) {
    for (const m of sec.meetings || []) {
      if (m.dayCode && m.startTime && m.endTime) {
        const { startIdx, endIdx } = getSlotIndices(m.startTime, m.endTime);
        const top = startIdx * ROW_TOTAL + 16; // 16pt offset por header de día
        const height = (endIdx - startIdx + 1) * ROW_TOTAL - PAUSE_HEIGHT;

        meetingsByDay[m.dayCode].push({
          ...m,
          courseCode: sec.courseCode,
          courseTitle: sec.courseTitle,
          sectionNumber: sec.sectionNumber,
          top,
          height,
          startIdx,
          endIdx,
          section: sec,
        });
      }
    }
  }

  // Algoritmo greedy simple para asignar columnas a superposiciones en PDF
  for (const day of Object.keys(meetingsByDay)) {
    const list = meetingsByDay[day];
    list.sort((a, b) => a.startIdx - b.startIdx);

    const activeGroups = [];

    for (const item of list) {
      let placed = false;
      for (const group of activeGroups) {
        const hasOverlap = group.some(
          (other) => Math.max(item.startIdx, other.startIdx) <= Math.min(item.endIdx, other.endIdx)
        );
        if (hasOverlap) {
          group.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        activeGroups.push([item]);
      }
    }

    for (const group of activeGroups) {
      const columns = [];
      for (const item of group) {
        let colIdx = 0;
        while (true) {
          const collides = columns[colIdx]?.some(
            (other) => Math.max(item.startIdx, other.startIdx) <= Math.min(item.endIdx, other.endIdx)
          );
          if (!collides) {
            if (!columns[colIdx]) columns[colIdx] = [];
            columns[colIdx].push(item);
            item.colIdx = colIdx;
            break;
          }
          colIdx++;
        }
      }
      for (const item of group) {
        item.colCount = columns.length;
      }
    }
  }

  return meetingsByDay;
}

function SchedulePdfDocument({
  selectedSectionsList,
  conflicts,
  programming,
  totalCredits,
  careerName,
  periodLabel,
}) {
  const meetingsByDay = preparePdfMeetings(selectedSectionsList);
  const totalRamos = selectedSectionsList.length;
  const busyDays = Object.keys(meetingsByDay).filter((d) => meetingsByDay[d].length > 0);

  const pdfTitle = "Horario Académico";
  const pdfSubtitle = `${careerName || "Malla Pro"} · ${programming?.curriculum?.campus || "Sede No Informada"}`;
  const summaryLine = `${totalRamos} ${totalRamos === 1 ? "ramo" : "ramos"} · ${totalCredits} créditos · ${busyDays.length} días con clases · ${
    conflicts.length > 0 ? `${conflicts.length} conflicto(s) detectado(s)` : "Sin conflictos"
  }`;

  return (
    <Document>
      {/* Página 1: Encabezado y Horario */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{pdfTitle}</Text>
            <Text style={styles.subtitle}>{pdfSubtitle}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.periodText}>{periodLabel}</Text>
            <Text style={styles.summaryText}>{summaryLine}</Text>
          </View>
        </View>

        {/* Grilla Semanal */}
        <View style={styles.gridContainer}>
          {/* Eje de Horas */}
          <View style={styles.timeColumn}>
            <View style={{ height: 16 }} />
            {unabTimeSlots.map((slot, idx) => {
              const top = idx * ROW_TOTAL + 16;
              return (
                <Text key={slot.id} style={[styles.timeLabel, { top }]}>
                  {slot.start}
                </Text>
              );
            })}
          </View>

          {/* Columnas de los Días */}
          {["LU", "MA", "MI", "JU", "VI", "SA"].map((dayCode, dayIdx) => {
            const isLast = dayIdx === 5;
            const dayMeetings = meetingsByDay[dayCode] || [];
            const dayLabel = { LU: "Lunes", MA: "Martes", MI: "Miércoles", JU: "Jueves", VI: "Viernes", SA: "Sábado" }[dayCode];

            return (
              <View
                key={dayCode}
                style={isLast ? styles.dayColumnLast : styles.dayColumn}
              >
                <View style={styles.dayHeader}>
                  <Text style={styles.dayHeaderText}>{dayLabel}</Text>
                </View>

                {/* Líneas horizontales de los bloques */}
                {unabTimeSlots.map((slot, idx) => {
                  const top = idx * ROW_TOTAL + 16;
                  return (
                    <React.Fragment key={slot.id}>
                      <View style={[styles.gridLine, { top, height: 1 }]} />
                      <View
                        style={[
                          styles.pauseBlock,
                          {
                            top: top + SLOT_HEIGHT,
                            height: PAUSE_HEIGHT,
                          },
                        ]}
                      />
                    </React.Fragment>
                  );
                })}

                {/* Bloques de clase en este día */}
                {dayMeetings.map((m, idx) => {
                  const colors = getStableCourseColor(m.courseCode);
                  const isConflicting = conflicts.some(
                    (col) =>
                      (col.meetingA.courseCode === m.courseCode && col.meetingA.meeting.dayCode === m.dayCode && col.meetingA.meeting.startTime === m.startTime) ||
                      (col.meetingB.courseCode === m.courseCode && col.meetingB.meeting.dayCode === m.dayCode && col.meetingB.meeting.startTime === m.startTime)
                  );

                  const colIdx = m.colIdx || 0;
                  const colCount = m.colCount || 1;
                  const widthPercent = 96 / colCount;
                  const leftPercent = 2 + colIdx * widthPercent;

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.meetingBlock,
                        {
                          top: m.top + 1,
                          height: m.height - 2,
                          left: `${leftPercent}%`,
                          width: `${widthPercent - 1}%`,
                          backgroundColor: isConflicting ? "#fee2e2" : colors.bgLight,
                          borderColor: isConflicting ? "#ef4444" : colors.borderLight,
                          color: isConflicting ? "#991b1b" : colors.textLight,
                        },
                      ]}
                    >
                      <Text style={styles.blockTitle}>
                        {isConflicting ? "[TOPE] " : ""}
                        {m.courseTitle}
                      </Text>
                      <Text style={styles.blockMeta}>
                        {m.courseCode} · Sec. {m.sectionNumber}
                      </Text>
                      <Text style={styles.blockMeta}>
                        {m.startTime}–{m.endTime} · {m.location || "no inf."}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        <Text style={styles.footerText}>
          Generado automáticamente por Malla Pro. Los cupos e información indicados pueden no representar disponibilidad en tiempo real.
        </Text>
      </Page>

      {/* Página 2: Resumen de Ramos Seleccionados */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{pdfTitle} - Ramos Seleccionados</Text>
            <Text style={styles.subtitle}>{pdfSubtitle}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.periodText}>{periodLabel}</Text>
          </View>
        </View>

        <Text style={styles.tableHeader}>Detalle de Asignaturas Inscritas</Text>

        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeaderRow}>
            <View style={styles.colCourse}><Text style={styles.thText}>Asignatura</Text></View>
            <View style={styles.colSec}><Text style={styles.thText}>Sección</Text></View>
            <View style={styles.colNrc}><Text style={styles.thText}>NRC</Text></View>
            <View style={styles.colCred}><Text style={styles.thText}>Créditos</Text></View>
            <View style={styles.colCap}><Text style={styles.thText}>Cupos Informados</Text></View>
          </View>

          {/* Rows */}
          {selectedSectionsList.map((sec) => {
            const creditsVal = sec.courseCode
              ? selectedSectionsList.find((s) => s.courseCode === sec.courseCode)?.curriculumCourse?.sct ?? null
              : null;
            const creditsLabel = creditsVal != null ? String(creditsVal) : "—";
            const capacityLabel = sec.capacity != null ? String(sec.capacity) : "—";

            return (
              <View key={sec.id} style={styles.tableRow}>
                <View style={styles.colCourse}>
                  <Text style={styles.tdText}>{sec.courseTitle}</Text>
                  <Text style={styles.tdTextSec}>{sec.courseCode}</Text>
                </View>
                <View style={styles.colSec}><Text style={styles.tdText}>{sec.sectionNumber}</Text></View>
                <View style={styles.colNrc}><Text style={styles.tdText}>{sec.nrc}</Text></View>
                <View style={styles.colCred}><Text style={styles.tdText}>{creditsLabel}</Text></View>
                <View style={styles.colCap}><Text style={styles.tdText}>{capacityLabel}</Text></View>
              </View>
            );
          })}

          {/* Footer Row */}
          <View style={styles.tableFooterRow}>
            <Text style={[styles.thText, { marginRight: 24 }]}>
              {totalRamos} {totalRamos === 1 ? "ramo" : "ramos"} seleccionados
            </Text>
            <Text style={styles.thText}>
              {totalCredits} créditos totales
            </Text>
          </View>
        </View>

        <Text style={styles.footerText}>
          Nota: La información de cupos es meramente referencial y representa el estado registrado en el PDF de programación académica.
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Función exportable para generar y descargar el PDF de horario.
 */
export async function generateSchedulePdf({
  selectedSectionsList,
  conflicts,
  programming,
  totalCredits,
  careerName,
  periodLabel,
}) {
  const doc = (
    <SchedulePdfDocument
      selectedSectionsList={selectedSectionsList}
      conflicts={conflicts}
      programming={programming}
      totalCredits={totalCredits}
      careerName={careerName}
      periodLabel={periodLabel}
    />
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);

  // Gatillar descarga
  const link = document.createElement("a");
  link.href = url;
  const dateStr = new Date().toISOString().split("T")[0];
  const normPeriod = String(periodLabel || "2026-2")
    .replace(/[^A-Za-z0-9]/g, "-")
    .toLowerCase();

  link.download = `horario-${normPeriod}-${dateStr}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
