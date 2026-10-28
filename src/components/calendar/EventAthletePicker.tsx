import { useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteAvatar } from '../AthleteAvatar'

/** A lesson event holds up to 3 athletes. Above that, Ryan runs a group. */
export const MAX_EVENT_ATHLETES = 3

/**
 * Pick the athletes on a calendar event, before the lesson starts, so
 * checklists can be planned for each of them like a class. Controlled:
 * the parent owns the selection (it must survive the quick-add sheet
 * opening above this dialog) and saves it with matchCalendarEvent.
 */
export function EventAthletePicker({
  athletes,
  selectedIds,
  onChange,
  onAddNew,
}: {
  athletes: Athlete[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  /** When provided, shows an "Add a new athlete" row that opens quick-add. */
  onAddNew?: () => void
}) {
  const [query, setQuery] = useState('')
  const atCap = selectedIds.length >= MAX_EVENT_ATHLETES

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id))
    else if (!atCap) onChange([...selectedIds, id])
  }

  const shown = athletes
    .filter((a) => (query ? a.name.toLowerCase().includes(query.toLowerCase()) : true))
    .slice(0, 20)

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search athletes..."
        className="w-full rounded-lg border border-[var(--panel-border)] bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40"
      />
      <p className="mt-2 text-xs text-[var(--muted)]">
        {selectedIds.length}/{MAX_EVENT_ATHLETES} athletes · the first picked is the main athlete
      </p>
      <ul className="mt-2 flex max-h-64 flex-col gap-2 overflow-auto">
        {shown.map((a) => {
          const on = selectedIds.includes(a.id)
          const disabled = !on && atCap
          return (
            <li key={a.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(a.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-30 ${
                  on ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--panel-border)]'
                }`}
              >
                <AthleteAvatar athlete={a} size="sm" />
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    on ? 'border-[var(--accent)] bg-[var(--accent)] text-[#06281f]' : 'border-white/30'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {onAddNew && (
        <button
          type="button"
          onClick={onAddNew}
          className="mt-2 w-full rounded-lg border border-dashed border-white/25 px-3 py-2 text-left text-sm font-semibold text-white/80"
        >
          + Add a new athlete
        </button>
      )}
    </div>
  )
}
