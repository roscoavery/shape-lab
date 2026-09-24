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

const HOUR_START = 7
const HOUR_END = 23
const HOUR_PX = 48
const EVENT_COLORS = ['#c9b05a', '#8fbf6a', '#6ec8d6', '#7eb0e8', '#c49ae0', '#e09a72', '#8ad4c4']

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

function hourOffset(iso: string): number {
  const t = new Date(iso)
  const hours = t.getHours() + t.getMinutes() / 60
  return Math.max(0, Math.min(HOUR_END - HOUR_START, hours - HOUR_START))
}

function durationHours(startAt: string, endAt: string): number {
  const ms = Math.max(20 * 60 * 1000, Date.parse(endAt) - Date.parse(startAt))
  return Math.min(HOUR_END - HOUR_START, Math.max(0.5, ms / 3_600_000))
}

function isAllDay(ev: TodayCalendarEvent): boolean {
  const s = new Date(ev.startAt)
  const e = new Date(ev.endAt || ev.startAt)
  const hours = (e.getTime() - s.getTime()) / 3_600_000
  return hours >= 12 || (s.getHours() === 0 && s.getMinutes() === 0 && hours >= 8)
}

function eventColor(title: string): string {
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0
  return EVENT_COLORS[h % EVENT_COLORS.length]!
}

function formatHourLabel(h: number): string {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h > 12 ? `${h - 12} PM` : `${h} AM`
}

function formatStart(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

type LaidEvent = {
  ev: TodayCalendarEvent
  col: number
  cols: number
  top: number
  height: number
}

function layoutTimedEvents(events: TodayCalendarEvent[]): LaidEvent[] {
  const timed = events
    .filter((ev) => !isAllDay(ev))
    .map((ev) => ({
      ev,
      start: hourOffset(ev.startAt),
      end: hourOffset(ev.startAt) + durationHours(ev.startAt, ev.endAt),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end)
  const colEnd: number[] = []
  const placed: { ev: TodayCalendarEvent; start: number; end: number; col: number }[] = []
  for (const item of timed) {
    let col = colEnd.findIndex((end) => end <= item.start + 0.02)
    if (col < 0) {
      col = colEnd.length
      colEnd.push(item.end)
    } else {
      colEnd[col] = item.end
    }
    placed.push({ ...item, col })
  }
  return placed.map((row) => {
    const overlap = placed.filter((other) => other.start < row.end - 0.02 && other.end > row.start + 0.02)
    const cols = Math.max(1, ...overlap.map((o) => o.col + 1))
    return {
      ev: row.ev,
      col: row.col,
      cols,
      top: row.start * HOUR_PX,
      height: Math.max(22, (row.end - row.start) * HOUR_PX - 2),
    }
  })
}

function weekNumberLabel(d: Date): string {
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const day = new Date(utc).getUTCDay() || 7
  const thursday = new Date(utc)
  thursday.setUTCDate(thursday.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `Week ${week}, ${d.toLocaleString(undefined, { month: 'short', year: 'numeric' })}`
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
  const [openEventId, setOpenEventId] = useState<string | null>(null)
  const [fullScreen, setFullScreen] = useState(false)

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

  useEffect(() => {
    if (!fullScreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullScreen(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [fullScreen])

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

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selected), i)),
    [selected],
  )

  const dayEvents = events
    .filter((ev) => sameDay(new Date(ev.startAt), selected))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  const athleteName = (id: string | null) => roster.find((a) => a.id === id)?.name?.trim() || 'Athlete'
  const activeLessonId = loadActiveLessonId()
  const pickEvent = events.find((e) => e.id === pickEventId) ?? null
  const openEvent = events.find((e) => e.id === openEventId) ?? null

  const startLesson = (ev: TodayCalendarEvent, athleteId: string) => {
    onStartLesson([athleteId], null, {
      eventId: ev.id,
      title: ev.title,
      startAt: ev.startAt,
      endAt: ev.endAt,
      notes: ev.notes ?? null,
    })
  }

  const hours = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i),
    [],
  )

  return (
    <section className="min-w-0 max-w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Schedule</p>
          <h3 className="text-lg font-semibold">Calendar</h3>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
          <p className="min-w-[7rem] text-center text-sm font-semibold">
            {view === 'month'
              ? cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })
              : view === 'week'
                ? weekNumberLabel(selected)
                : selected.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
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
          {(view === 'week' || view === 'day') && (
            <button
              type="button"
              className="rounded-full border border-[var(--panel-border)] px-2.5 py-1 text-xs font-semibold"
              onClick={() => setFullScreen(true)}
            >
              Full screen
            </button>
          )}
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

      {view === 'month' && (
        <>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-[var(--muted)]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
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

      {view === 'week' && !fullScreen && (
        <WeekTimeline
          days={weekDays}
          hours={hours}
          events={events}
          selected={selected}
          openEventId={openEventId}
          onSelectDay={setSelected}
          onToggleEvent={(id) => setOpenEventId((cur) => (cur === id ? null : id))}
        />
      )}

      {view === 'day' && !fullScreen && (
        <DayTimeline
          day={selected}
          hours={hours}
          events={dayEvents}
          openEventId={openEventId}
          onToggleEvent={(id) => setOpenEventId((cur) => (cur === id ? null : id))}
        />
      )}

      {openEvent && (view === 'week' || view === 'day') && !fullScreen && (
        <div className="mt-3">
          <EventPreview
            ev={openEvent}
            open
            onToggle={() => setOpenEventId(null)}
            athleteName={athleteName}
            activeLessonId={activeLessonId}
            onStart={startLesson}
            onPick={() => setPickEventId(openEvent.id)}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold">
          {view === 'week'
            ? 'Week timeline'
            : selected.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
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

      {view === 'month' && !loadError && !needsAuth && dayEvents.length === 0 && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Nothing on this day. If sync said it worked, turn on “All events” and the right calendars under More →
          Profiles → Calendar connections.
        </p>
      )}

      {view === 'month' && (
        <ul className="mt-3 flex flex-col gap-2">
          {dayEvents.map((ev) => (
            <li key={ev.id}>
              <EventPreview
                ev={ev}
                open={openEventId === ev.id}
                onToggle={() => setOpenEventId((cur) => (cur === ev.id ? null : ev.id))}
                athleteName={athleteName}
                activeLessonId={activeLessonId}
                onStart={startLesson}
                onPick={() => setPickEventId(ev.id)}
              />
            </li>
          ))}
        </ul>
      )}

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

      {fullScreen && (view === 'week' || view === 'day') && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-[#0b1118] text-[var(--text)]">
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Calendar</p>
              <h3 className="truncate text-base font-semibold">
                {view === 'week'
                  ? weekNumberLabel(selected)
                  : selected.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-[var(--panel-border)] px-2 py-1 text-xs"
                onClick={() => {
                  const next = addDays(selected, view === 'week' ? -7 : -1)
                  setSelected(next)
                  setCursor(startOfMonth(next))
                }}
              >
                ←
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--panel-border)] px-2 py-1 text-xs"
                onClick={() => {
                  const next = addDays(selected, view === 'week' ? 7 : 1)
                  setSelected(next)
                  setCursor(startOfMonth(next))
                }}
              >
                →
              </button>
              <button
                type="button"
                className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--on-accent)]"
                onClick={() => setFullScreen(false)}
              >
                Close
              </button>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden px-2">
            {view === 'week' ? (
              <WeekTimeline
                days={weekDays}
                hours={hours}
                events={events}
                selected={selected}
                openEventId={openEventId}
                onSelectDay={setSelected}
                onToggleEvent={(id) => setOpenEventId((cur) => (cur === id ? null : id))}
                fullHeight
              />
            ) : (
              <DayTimeline
                day={selected}
                hours={hours}
                events={dayEvents}
                openEventId={openEventId}
                onToggleEvent={(id) => setOpenEventId((cur) => (cur === id ? null : id))}
                fullHeight
              />
            )}
          </div>
          {openEvent && (
            <div className="max-h-[36vh] shrink-0 overflow-y-auto border-t border-white/10 p-3">
              <EventPreview
                ev={openEvent}
                open
                onToggle={() => setOpenEventId(null)}
                athleteName={athleteName}
                activeLessonId={activeLessonId}
                onStart={startLesson}
                onPick={() => setPickEventId(openEvent.id)}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function EventPreview({
  ev,
  open,
  onToggle,
  athleteName,
  activeLessonId,
  onStart,
  onPick,
  compact = false,
}: {
  ev: TodayCalendarEvent
  open: boolean
  onToggle: () => void
  athleteName: (id: string | null) => string
  activeLessonId: string | null
  onStart: (ev: TodayCalendarEvent, athleteId: string) => void
  onPick: () => void
  compact?: boolean
}) {
  const linked = ev.lessonLinks?.[0]
  const linkedSession = linked ? getLessonSession(linked.lessonId) : null
  const activeForEvent = linked && activeLessonId === linked.lessonId && linkedSession && !linkedSession.endedAt
  const matchLine = ev.matchedAthleteId
    ? athleteName(ev.matchedAthleteId)
    : ev.matchStatus === 'ambiguous'
      ? 'Multiple athletes possible'
      : ev.matchStatus === 'needs_athlete'
        ? 'Needs athlete'
        : 'Event'
  return (
    <div className={`rounded-lg bg-[#121820] ${compact ? 'px-1.5 py-1' : 'px-3 py-2'}`}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className={`text-[10px] text-[var(--muted)] ${compact ? 'leading-tight' : ''}`}>
            {formatTimeRange(ev.startAt, ev.endAt)}
          </p>
          <p className={`font-medium ${compact ? 'truncate text-[11px] leading-tight' : ''}`}>
            {ev.title || 'Untitled'}
          </p>
          {!compact && <p className="text-xs text-[var(--muted)]">{matchLine}</p>}
        </button>
        {!compact &&
          (ev.matchedAthleteId ? (
            <button
              type="button"
              className="shrink-0 rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[#06281f]"
              onClick={() => onStart(ev, ev.matchedAthleteId!)}
            >
              {activeForEvent ? 'Resume' : 'Start'}
            </button>
          ) : (
            <button
              type="button"
              className="shrink-0 rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-xs font-semibold"
              onClick={onPick}
            >
              Select
            </button>
          ))}
      </div>
      {open && (
        <div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-xs text-[var(--muted)]">
          {compact && <p>{matchLine}</p>}
          {ev.location ? <p>Where · {ev.location}</p> : null}
          {ev.notes?.trim() ? (
            <p className="whitespace-pre-wrap text-[var(--text)]/85">{ev.notes.trim()}</p>
          ) : (
            <p>No notes on this event.</p>
          )}
          {compact &&
            (ev.matchedAthleteId ? (
              <button
                type="button"
                className="mt-1 rounded-md bg-[var(--accent)] px-2 py-1 text-[11px] font-semibold text-[#06281f]"
                onClick={() => onStart(ev, ev.matchedAthleteId!)}
              >
                {activeForEvent ? 'Resume lesson' : 'Start lesson'}
              </button>
            ) : (
              <button
                type="button"
                className="mt-1 rounded-md border border-[var(--panel-border)] px-2 py-1 text-[11px] font-semibold"
                onClick={onPick}
              >
                Select athlete
              </button>
            ))}
        </div>
      )}
      {!open && (ev.notes?.trim() || ev.location) && (
        <button type="button" onClick={onToggle} className="mt-1 text-[10px] font-semibold text-[var(--accent)]">
          Details
        </button>
      )}
    </div>
  )
}

function HourLines({ hours }: { hours: number[] }) {
  return (
    <>
      {hours.map((h, i) => (
        <div
          key={h}
          className="absolute inset-x-0 border-t border-white/8"
          style={{ top: i * HOUR_PX, height: HOUR_PX }}
        />
      ))}
    </>
  )
}

function HourGutter({ hours, height }: { hours: number[]; height: number }) {
  return (
    <div className="relative sticky left-0 z-[3] bg-[var(--panel)]" style={{ height }}>
      {hours.map((h, i) => (
        <p
          key={h}
          className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-[var(--muted)]"
          style={{ top: i * HOUR_PX }}
        >
          {formatHourLabel(h)}
        </p>
      ))}
    </div>
  )
}

function EventChip({
  laid,
  selected,
  onToggle,
}: {
  laid: LaidEvent
  selected: boolean
  onToggle: () => void
}) {
  const color = eventColor(laid.ev.title)
  const widthPct = 100 / laid.cols
  const leftPct = laid.col * widthPct
  const short = laid.height < 36
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`${formatTimeRange(laid.ev.startAt, laid.ev.endAt)} · ${laid.ev.title || 'Untitled'}`}
      className={`absolute z-[1] overflow-hidden rounded-md px-1 text-left font-semibold leading-tight text-[#10161c] ${
        short ? 'py-0 text-[10px]' : 'py-0.5 text-[11px]'
      } ${selected ? 'ring-2 ring-white' : ''}`}
      style={{
        top: laid.top,
        height: laid.height,
        left: `calc(${leftPct}% + 1px)`,
        width: `calc(${widthPct}% - 2px)`,
        background: color,
      }}
    >
      <span className="block truncate opacity-80">{formatStart(laid.ev.startAt)}</span>
      <span className="block truncate">{laid.ev.title || 'Untitled'}</span>
    </button>
  )
}

function AllDayPills({
  events,
  selectedId,
  onToggle,
}: {
  events: TodayCalendarEvent[]
  selectedId: string | null
  onToggle: (id: string) => void
}) {
  if (events.length === 0) {
    return <div className="min-h-8" />
  }
  return (
    <div className="flex min-h-8 flex-col gap-0.5 p-0.5">
      {events.map((ev) => (
        <button
          key={ev.id}
          type="button"
          onClick={() => onToggle(ev.id)}
          className={`w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-semibold text-[#10161c] ${
            selectedId === ev.id ? 'ring-2 ring-white' : ''
          }`}
          style={{ background: eventColor(ev.title) }}
        >
          {ev.title || 'Untitled'}
        </button>
      ))}
    </div>
  )
}

function NowLine({ day, hours }: { day: Date; hours: number[] }) {
  if (!sameDay(day, new Date())) return null
  const top = hourOffset(new Date().toISOString()) * HOUR_PX
  if (top <= 0 || top >= hours.length * HOUR_PX) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[2] flex items-center" style={{ top }}>
      <span className="h-2 w-2 -translate-x-1 rounded-full bg-[#e05a5a]" />
      <span className="h-0.5 flex-1 bg-[#e05a5a]" />
    </div>
  )
}

function WeekTimeline({
  days,
  hours,
  events,
  selected,
  openEventId,
  onSelectDay,
  onToggleEvent,
  fullHeight = false,
}: {
  days: Date[]
  hours: number[]
  events: TodayCalendarEvent[]
  selected: Date
  openEventId: string | null
  onSelectDay: (d: Date) => void
  onToggleEvent: (id: string) => void
  fullHeight?: boolean
}) {
  const height = hours.length * HOUR_PX
  return (
    <div
      className={`mt-3 w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto ${fullHeight ? 'h-full' : ''}`}
      style={fullHeight ? undefined : { maxHeight: 'min(24rem, 52dvh)' }}
    >
      <div className="min-w-[42rem]">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <div className="sticky left-0 z-[3] bg-[var(--panel)]" />
          {days.map((day) => {
            const on = sameDay(day, selected)
            const today = sameDay(day, new Date())
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDay(day)}
                className={`rounded-t-md px-1 py-1.5 text-center text-[11px] font-semibold ${
                  on
                    ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                    : today
                      ? 'bg-[#102028] text-[var(--accent)]'
                      : 'bg-[#121820]'
                }`}
              >
                <span className="block text-[10px] uppercase tracking-wider opacity-70">
                  {day.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                {day.getDate()}
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-white/10">
          <p className="sticky left-0 z-[3] bg-[var(--panel)] pr-1 pt-1.5 text-right text-[9px] uppercase tracking-wider text-[var(--muted)]">
            All-day
          </p>
          {days.map((day) => (
            <AllDayPills
              key={`all-${day.toISOString()}`}
              events={events.filter((ev) => isAllDay(ev) && sameDay(new Date(ev.startAt), day))}
              selectedId={openEventId}
              onToggle={onToggleEvent}
            />
          ))}
        </div>
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <HourGutter hours={hours} height={height} />
          {days.map((day) => {
            const laid = layoutTimedEvents(events.filter((ev) => sameDay(new Date(ev.startAt), day)))
            return (
              <div
                key={`col-${day.toISOString()}`}
                className="relative border-l border-white/8 bg-[#0d1218]"
                style={{ height }}
              >
                <HourLines hours={hours} />
                <NowLine day={day} hours={hours} />
                {laid.map((row) => (
                  <EventChip
                    key={row.ev.id}
                    laid={row}
                    selected={openEventId === row.ev.id}
                    onToggle={() => onToggleEvent(row.ev.id)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DayTimeline({
  day,
  hours,
  events,
  openEventId,
  onToggleEvent,
  fullHeight = false,
}: {
  day: Date
  hours: number[]
  events: TodayCalendarEvent[]
  openEventId: string | null
  onToggleEvent: (id: string) => void
  fullHeight?: boolean
}) {
  const height = hours.length * HOUR_PX
  const allDay = events.filter(isAllDay)
  const laid = layoutTimedEvents(events)
  return (
    <div
      className={`mt-3 w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto ${fullHeight ? 'h-full' : ''}`}
      style={fullHeight ? undefined : { maxHeight: 'min(24rem, 52dvh)' }}
    >
      <p className="mb-2 text-sm text-[var(--muted)]">
        {day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
      <div className="min-w-[18rem]">
        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] border-b border-white/10">
          <p className="pr-1 pt-1.5 text-right text-[9px] uppercase tracking-wider text-[var(--muted)]">All-day</p>
          <AllDayPills events={allDay} selectedId={openEventId} onToggle={onToggleEvent} />
        </div>
        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)]">
          <HourGutter hours={hours} height={height} />
          <div className="relative rounded-r-lg bg-[#0d1218]" style={{ height }}>
            <HourLines hours={hours} />
            <NowLine day={day} hours={hours} />
            {events.length === 0 && (
              <p className="absolute inset-x-3 top-4 text-sm text-[var(--muted)]">Nothing on this day.</p>
            )}
            {laid.map((row) => (
              <EventChip
                key={row.ev.id}
                laid={row}
                selected={openEventId === row.ev.id}
                onToggle={() => onToggleEvent(row.ev.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
