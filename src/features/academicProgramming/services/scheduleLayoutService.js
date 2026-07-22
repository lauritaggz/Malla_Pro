import { timeToMinutes } from "./scheduleService";

/**
 * @typedef {Object} PositionedMeeting
 * @property {object} meeting - La reunión original.
 * @property {number} startMinutes - Minuto de inicio real.
 * @property {number} endMinutes - Minuto de término real.
 * @property {number} [columnIndex] - Índice de la subcolumna.
 * @property {number} [columnCount] - Total de subcolumnas solapadas.
 * @property {number} [leftPercentage] - Posición izquierda en porcentaje (0-100).
 * @property {number} [widthPercentage] - Ancho del bloque en porcentaje (0-100).
 */

/**
 * Agrupa y calcula columnas para bloques de clases solapados.
 * @param {Array<PositionedMeeting>} meetings
 * @returns {Array<PositionedMeeting>}
 */
export function assignOverlapColumns(meetings) {
  if (!meetings || meetings.length === 0) return [];

  // Asegurar que tengan calculados los minutos
  const prepared = meetings.map((m) => {
    const startMinutes = m.startMinutes ?? timeToMinutes(m.startTime ?? m.meeting?.startTime);
    const endMinutes = m.endMinutes ?? timeToMinutes(m.endTime ?? m.meeting?.endTime);
    return {
      ...m,
      startMinutes,
      endMinutes,
      columnIndex: 0,
      columnCount: 1,
      leftPercentage: 0,
      widthPercentage: 100,
    };
  });

  // Ordenar por hora de inicio
  prepared.sort((a, b) => a.startMinutes - b.startMinutes);

  // Encontrar componentes conexos de colisiones
  const groups = [];

  for (const m of prepared) {
    let placed = false;
    for (const g of groups) {
      const overlaps = g.some(
        (other) =>
          m.startMinutes < other.endMinutes && m.endMinutes > other.startMinutes
      );
      if (overlaps) {
        g.push(m);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([m]);
    }
  }

  // Asignar subcolumnas en cada grupo
  for (const g of groups) {
    const columns = []; // columnas[i] es la lista de bloques en la subcolumna i

    for (const m of g) {
      let colIndex = 0;
      while (true) {
        if (!columns[colIndex]) {
          columns[colIndex] = [];
        }
        const overlaps = columns[colIndex].some(
          (other) =>
            m.startMinutes < other.endMinutes && m.endMinutes > other.startMinutes
        );
        if (!overlaps) {
          columns[colIndex].push(m);
          m.columnIndex = colIndex;
          break;
        }
        colIndex++;
      }
    }

    const colCount = columns.length;
    for (const m of g) {
      m.columnCount = colCount;
      m.leftPercentage = (m.columnIndex / colCount) * 100;
      m.widthPercentage = 100 / colCount;
    }
  }

  return prepared;
}
