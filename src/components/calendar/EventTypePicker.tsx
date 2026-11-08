import type { CalendarEventType } from '../../lib/calendarClient'

const OPTIONS: { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'lesson', label: 'Lesson' },
  { value: 'class', label: 'Class' },
  { value: 'school', label: 'School' },
  { value: 'camp', label: 'Camp' },
  { value: 'clinic', label: 'Clinic' },
]

/**
 * Pick what kind of work a calendar event is. Auto means unmarked: the app
 * guesses from the title like it always did. The parent saves the choice
 * with setCalendarEventType and refreshes its events.
 */
export function EventTypePicker({
  value,
  onChange,
  disabled = false,
}: {
  /** Null means unmarked (Auto). */
  value: CalendarEventType | null | undefined
  onChange: (t: CalendarEventType | null) => void
  disabled?: boolean
}) {
  return (
    <label className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[var(--muted)]">
      Type
      <select
        value={value ?? 'auto'}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === 'auto' ? null : (v as CalendarEventType))
        }}
        aria-label="Event type"
        className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1 text-xs font-semibold text-[var(--text)] disabled:opacity-40"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
