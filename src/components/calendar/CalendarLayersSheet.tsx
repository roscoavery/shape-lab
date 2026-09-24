import { useCallback, useEffect, useState } from 'react'
import {
  fetchCalendarStatus,
  syncCalendarNow,
  updateCalendarSelection,
  type ConnectedCalendarView,
} from '../../lib/calendarClient'
import {
  loadCalendarDisplayPrefs,
  saveCalendarDisplayPrefs,
  type CalendarDisplayPrefs,
} from '../../lib/calendarDisplay'

type Props = {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

export function CalendarLayersSheet({ open, onClose, onChanged }: Props) {
  const [calendars, setCalendars] = useState<ConnectedCalendarView[]>([])
  const [prefs, setPrefs] = useState<CalendarDisplayPrefs>(() => loadCalendarDisplayPrefs())
  const [eventFilter, setEventFilter] = useState<'all' | 'coaching_likely'>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const s = await fetchCalendarStatus()
    if (s.calendars) setCalendars(s.calendars)
    if (s.connection?.eventFilter) setEventFilter(s.connection.eventFilter)
  }, [])

  useEffect(() => {
    if (!open) return
    void reload()
    setPrefs(loadCalendarDisplayPrefs())
  }, [open, reload])

  if (!open) return null

  const saveCalendars = async (next: ConnectedCalendarView[]) => {
    setBusy(true)
    setError(null)
    try {
      await updateCalendarSelection(
        next.map((c) => ({ providerCalendarId: c.providerCalendarId, enabled: c.enabled })),
        eventFilter,
      )
      setCalendars(next)
      await syncCalendarNow()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save calendars.')
    } finally {
      setBusy(false)
    }
  }

  const toggleCal = (id: string) => {
    const next = calendars.map((c) =>
      c.providerCalendarId === id ? { ...c, enabled: !c.enabled } : c,
    )
    void saveCalendars(next)
  }

  const savePrefs = (next: CalendarDisplayPrefs) => {
    setPrefs(next)
    saveCalendarDisplayPrefs(next)
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog">
      <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Calendars</h3>
          <button type="button" className="text-sm text-[var(--muted)] underline" onClick={onClose}>
            Done
          </button>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Choose which iCloud calendars show here. Sync pulls the latest from Apple.
        </p>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <ul className="mt-4 space-y-1">
          {calendars.length === 0 && (
            <li className="text-sm text-[var(--muted)]">Connect iCloud under More → Accounts if nothing lists.</li>
          )}
          {calendars.map((cal) => (
            <li key={cal.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => toggleCal(cal.providerCalendarId)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: cal.color || '#6ec8d6' }}
                />
                <span className="min-w-0 flex-1 truncate">{cal.displayName}</span>
                <span className={`text-xs font-bold ${cal.enabled ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
                  {cal.enabled ? 'On' : 'Off'}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">ShapeLab</p>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.showShapeLabClasses}
              onChange={(e) => savePrefs({ ...prefs, showShapeLabClasses: e.target.checked })}
            />
            Show gym class schedule (from Start class list)
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.dedupeByTimeTitle}
              onChange={(e) => savePrefs({ ...prefs, dedupeByTimeTitle: e.target.checked })}
            />
            Merge duplicate events (same name &amp; time on two calendars)
          </label>
        </div>
        <label className="mt-4 block text-sm">
          <span className="text-[var(--muted)]">iCloud filter</span>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-2"
            value={eventFilter}
            onChange={(e) => {
              const v = e.target.value as 'all' | 'coaching_likely'
              setEventFilter(v)
              void updateCalendarSelection(
                calendars.map((c) => ({ providerCalendarId: c.providerCalendarId, enabled: c.enabled })),
                v,
              ).then(() => onChanged())
            }}
          >
            <option value="all">All events</option>
            <option value="coaching_likely">Coaching-likely titles only</option>
          </select>
        </label>
      </div>
    </div>
  )
}
