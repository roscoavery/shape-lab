import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import {
  authorizeCalendarApi,
  authorizeCalendarFromSession,
  createCalendarEvent,
  fetchCalendarRange,
  hasCalendarApiToken,
  matchCalendarEvent,
  syncCalendarNow,
  type TodayCalendarEvent,
} from '../../lib/calendarClient'
import { digitsOnlyPin } from '../../lib/athletePasscode'
import { getLessonSession, loadActiveLessonId } from '../../lib/lessonStore'

type Props = {
  coachId: string
  athletes: Athlete[]
  onStartLesson: (
    athleteIds: string[],
    planId?: string | null,
    calendar?: { eventId: string; title: string; startAt: string; endAt: string; notes?: string | null },
  ) => void
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfWeek(d: Date) {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  next.setDate(next.getDate() - next.getDay())
  return next
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatTimeRange(startAt: string, endAt: string): string {
  const s = new Date(startAt)
  const e = new Date(endAt)
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
  return `${s.toLocaleTimeString(undefined, opts)} – ${e.toLocaleTimeString(undefined, opts)}`
}

export function happeningNow(events: TodayCalendarEvent[], now = new Date()): TodayCalendarEvent | null {
  return (
    events.find((ev) => {
      const start = Date.parse(ev.startAt)
      const end = Date.parse(ev.endAt || ev.startAt)
      return Number.isFinite(start) && start <= now.getTime() && now.getTime() <= end
    }) ?? null
  )
}

export function CalendarDesk({ coachId, athletes, onStartLesson }: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [events, setEvents] = useState<TodayCalendarEvent[]>([])
  const [loadError, setLoadError] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [pickEventId, setPickEventId] = useState<string | null>(null)
  const [saveSeries, setSaveSeries] = useState(false)
  const [saveTitle, setSaveTitle] = useState(false)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [startLocal, setStartLocal] = useState('')
  const [endLocal, setEndLocal] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const roster = useMemo(
    () =>
      athletes.filter((a) => {
        if (a.id === coachId) return false
        const role = a.role
        return role !== 'coach' && role !== 'gym_owner' && role !== 'parent'
      }),
    [athletes, coachId],
  )

  const refresh = useCallback(async () => {
    try {
      setLoadError(false)
      if (!hasCalendarApiToken()) {
        const ok = await authorizeCalendarFromSession()
        if (!ok) {
          const { unauthorized } = await fetchCalendarRange(new Date(), new Date())
          if (unauthorized) {
            setNeedsAuth(true)
            return
          }
        }
      }
      try {
        await syncCalendarNow()
      } catch {
        /* cached events still shown */
      }
      const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      from.setDate(from.getDate() - 7)
      const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 7)
      const { events: rows, unauthorized } = await fetchCalendarRange(from, to)
      if (unauthorized) {
        const ok = await authorizeCalendarFromSession()
        if (ok) {
          const retry = await fetchCalendarRange(from, to)
          setNeedsAuth(false)
          setEvents(retry.events)
          return
        }
        setNeedsAuth(true)
        setEvents([])
        return
      }
      setNeedsAuth(false)
      setEvents(rows)
    } catch {
      setLoadError(true)
      setEvents([])
    } finally {
      setAuthChecked(true)
    }
  }, [cursor])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const days = useMemo(() => {
    const first = startOfMonth(cursor)
    const startPad = first.getDay()
    const last = endOfMonth(cursor).getDate()
    const cells: Date[] = []
    for (let i = 0; i < startPad; i++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), i - startPad + 1))
    }
    for (let d = 1; d <= last; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
    while (cells.length % 7) {
      const next = cells[cells.length - 1]!
      cells.push(new Date(next.getFullYear(), next.getMonth(), next.getDate() + 1))
    }
    return cells
  }, [cursor])

  const dayEvents = events
    .filter((ev) => sameDay(new Date(ev.startAt), selected))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  const athleteName = (id: string | null) => roster.find((a) => a.id === id)?.name?.trim() || 'Athlete'
  const activeLessonId = loadActiveLessonId()
  const pickEvent = events.find((e) => e.id === pickEventId) ?? null

  const startLesson = (ev: TodayCalendarEvent, athleteId: string) => {
    onStartLesson([athleteId], null, {
      eventId: ev.id,
      title: ev.title,
      startAt: ev.startAt,
      endAt: ev.endAt,
      notes: ev.notes ?? null,
    })
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Schedule</p>
          <h3 className="text-lg font-semibold">Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          {(['month', 'week', 'day'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                view === id ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'border border-[var(--panel-border)]'
              }`}
            >
              {id[0]!.toUpperCase() + id.slice(1)}
            </button>
          ))}
          <button
            type="button"
            className="rounded-full border border-[var(--panel-border)] px-2 py-1 text-xs"
            onClick={() => {
              if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
              else if (view === 'week') {
                const next = addDays(selected, -7)
                setSelected(next)
                setCursor(startOfMonth(next))
              } else {
                const next = addDays(selected, -1)
                setSelected(next)
                setCursor(startOfMonth(next))
              }
            }}
          >
            ←
          </button>
          <p className="min-w-[8rem] text-center text-sm font-semibold">
            {view === 'month'
              ? cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })
              : selected.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
          <button
            type="button"
            className="rounded-full border border-[var(--panel-border)] px-2 py-1 text-xs"
            onClick={() => {
              if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
              else if (view === 'week') {
                const next = addDays(selected, 7)
                setSelected(next)
                setCursor(startOfMonth(next))
              } else {
                const next = addDays(selected, 1)
                setSelected(next)
                setCursor(startOfMonth(next))
              }
            }}
          >
            →
          </button>
          <button type="button" className="text-xs text-[var(--muted)] underline" onClick={() => void refresh()}>
            Sync
          </button>
        </div>
      </div>

      {needsAuth && authChecked && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg bg-[#121820] p-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Coach passcode to load calendar
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={passcode}
              onChange={(e) => setPasscode(digitsOnlyPin(e.target.value))}
              className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={passcode.length < 4}
            onClick={() => {
              void authorizeCalendarApi(coachId, passcode).then((ok) => {
                if (!ok) return
                setPasscode('')
                setNeedsAuth(false)
                void refresh()
              })
            }}
            className="rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Unlock
          </button>
        </div>
      )}

      {loadError && (
        <p className="mt-2 text-sm text-[var(--muted)]">Calendar could not load. Your lesson roster still works below.</p>
      )}

      {view !== 'day' && (
      <>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-[var(--muted)]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {(view === 'week'
          ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selected), i))
          : days
        ).map((day) => {
          const count = events.filter((ev) => sameDay(new Date(ev.startAt), day)).length
          const on = sameDay(day, selected)
          const today = sameDay(day, new Date())
          const inMonth = day.getMonth() === cursor.getMonth()
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelected(day)}
              className={`min-h-11 rounded-lg px-1 py-1 text-left text-xs ${
                on
                  ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                  : today
                    ? 'border border-[var(--accent)] bg-[#102028]'
                    : 'bg-[#121820]'
              } ${inMonth ? '' : 'opacity-40'}`}
            >
              <span className="font-semibold">{day.getDate()}</span>
              {count > 0 && <span className="mt-0.5 block text-[10px] opacity-80">{count}</span>}
            </button>
          )
        })}
      </div>
      </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">
          {selected.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </h4>
        <button
          type="button"
          className="text-xs font-semibold text-[var(--accent)]"
          onClick={() => {
            setCreating((v) => !v)
            if (!startLocal) {
              const start = new Date(selected)
              start.setHours(16, 0, 0, 0)
              const end = new Date(start.getTime() + 60 * 60 * 1000)
              const toLocal = (d: Date) => {
                const p = (n: number) => String(n).padStart(2, '0')
                return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
              }
              setStartLocal(toLocal(start))
              setEndLocal(toLocal(end))
            }
          }}
        >
          {creating ? 'Cancel' : 'New event'}
        </button>
      </div>

      {creating && (
        <form
          className="mt-2 grid gap-2 rounded-lg bg-[#121820] p-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!title.trim() || !startLocal || !endLocal) return
            setBusy(true)
            void createCalendarEvent({
              title: title.trim(),
              startAt: new Date(startLocal).toISOString(),
              endAt: new Date(endLocal).toISOString(),
            })
              .then(() => {
                setTitle('')
                setCreating(false)
                setMessage('Event added to iCloud.')
                return refresh()
              })
              .catch((err) => setMessage(err instanceof Error ? err.message : 'Could not create that event.'))
              .finally(() => setBusy(false))
          }}
        >
          <input
            className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-[var(--muted)]">
              Starts
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </label>
            <label className="text-xs text-[var(--muted)]">
              Ends
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
          >
            Save to iCloud
          </button>
        </form>
      )}

      {message && <p className="mt-2 text-sm text-[var(--accent)]">{message}</p>}

      {!loadError && !needsAuth && dayEvents.length === 0 && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Nothing on this day. If sync said it worked, turn on “All events” and the right calendars under More →
          Profiles → Calendar connections.
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {dayEvents.map((ev) => {
          const linked = ev.lessonLinks?.[0]
          const linkedSession = linked ? getLessonSession(linked.lessonId) : null
          const activeForEvent =
            linked && activeLessonId === linked.lessonId && linkedSession && !linkedSession.endedAt
          return (
            <li
              key={ev.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#121820] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--muted)]">{formatTimeRange(ev.startAt, ev.endAt)}</p>
                <p className="font-medium">{ev.title || 'Untitled'}</p>
                <p className="text-xs text-[var(--muted)]">
                  {ev.matchedAthleteId
                    ? athleteName(ev.matchedAthleteId)
                    : ev.matchStatus === 'ambiguous'
                      ? 'Multiple athletes possible'
                      : ev.matchStatus === 'needs_athlete'
                        ? 'Needs athlete'
                        : 'Event'}
                  {ev.location ? ` · ${ev.location}` : ''}
                </p>
                {ev.notes?.trim() ? (
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-[var(--text)]/80">
                    {ev.notes.trim()}
                  </p>
                ) : null}
              </div>
              {ev.matchedAthleteId ? (
                <button
                  type="button"
                  className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[#06281f]"
                  onClick={() => startLesson(ev, ev.matchedAthleteId!)}
                >
                  {activeForEvent ? 'Resume lesson' : 'Start lesson'}
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-xs font-semibold"
                  onClick={() => setPickEventId(ev.id)}
                >
                  Select athlete
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {pickEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog">
          <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
            <h4 className="font-semibold">{pickEvent.title}</h4>
            <p className="text-sm text-[var(--muted)]">Match this event to an athlete</p>
            <ul className="mt-3 flex flex-col gap-2">
              {roster.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-[var(--panel-border)] px-3 py-2 text-left text-sm hover:border-[var(--accent-dim)]"
                    onClick={() => {
                      void matchCalendarEvent(pickEvent.id, a.id, {
                        saveSeries,
                        saveTitle,
                      }).then(() => {
                        setPickEventId(null)
                        void refresh()
                        startLesson(pickEvent, a.id)
                      })
                    }}
                  >
                    {a.name}
                  </button>
                </li>
              ))}
            </ul>
            <label className="mt-3 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={saveTitle} onChange={(e) => setSaveTitle(e.target.checked)} />
              Use this match for future events with the same title
            </label>
            <label className="mt-1 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={saveSeries} onChange={(e) => setSaveSeries(e.target.checked)} />
              Use for this recurring series
            </label>
            <button type="button" className="mt-3 text-sm text-[var(--muted)] underline" onClick={() => setPickEventId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
