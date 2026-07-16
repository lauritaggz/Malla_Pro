/**
 * Horarios compactos para comparación.
 * @param {{
 *   meetings: import('../types/academicProgramming').AcademicMeeting[],
 *   highlightedDays?: string[],
 *   compact?: boolean
 * }} props
 */
export default function MeetingSchedule({
  meetings,
  highlightedDays = [],
  compact = false,
}) {
  if (!meetings?.length) {
    return (
      <p className="text-xs text-textSecondary italic">Horario no informado</p>
    );
  }

  return (
    <ul className={compact ? "space-y-1" : "space-y-1.5"}>
      {meetings.map((m, idx) => {
        const highlighted = highlightedDays.includes(m.dayCode);
        const room =
          m.location || (m.isOnline ? "Online" : "Sala no informada");

        if (compact) {
          return (
            <li
              key={`${m.dayCode}-${m.startTime}-${idx}`}
              className="text-sm leading-snug"
            >
              <span
                className={`
                  inline-flex min-w-[1.6rem] justify-center rounded px-1 py-px
                  text-[10px] font-bold mr-1.5 align-middle
                  ${highlighted
                    ? "bg-primary text-white"
                    : "bg-bgPrimary border border-borderColor text-textSecondary"}
                `}
              >
                {m.dayCode}
              </span>
              <span className="font-semibold tabular-nums text-textPrimary">
                {m.startTime}–{m.endTime}
              </span>
              <span className="text-textSecondary"> · </span>
              <span className="text-xs text-textSecondary">{room}</span>
            </li>
          );
        }

        return (
          <li
            key={`${m.dayCode}-${m.startTime}-${idx}`}
            className="flex gap-2 items-start text-sm"
          >
            <span
              className={`
                shrink-0 mt-0.5 inline-flex min-w-[1.75rem] justify-center
                rounded px-1 py-0.5 text-[10px] font-bold tracking-wide
                ${highlighted
                  ? "bg-primary text-white"
                  : "bg-bgPrimary border border-borderColor text-textSecondary"}
              `}
            >
              {m.dayCode}
            </span>
            <div className="min-w-0 leading-snug">
              <p className="font-semibold tabular-nums text-textPrimary">
                {m.startTime}–{m.endTime}
              </p>
              <p className="text-xs text-textSecondary truncate">{room}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
