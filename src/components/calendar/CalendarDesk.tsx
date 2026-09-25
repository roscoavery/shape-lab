import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { Athlete } from '../../types'
import {
  authorizeCalendarApi,
  authorizeCalendarFromSession,
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarRange,
  hasCalendarApiToken,
  matchCalendarEvent,
  syncCalendarNow,
  type TodayCalendarEvent,
} from '../../lib/calendarClient'
import {
  eventIsPast,
  loadCalendarClipboard,
  loadCalendarDisplayPrefs,
  mergeCalendarEvents,
  saveCalendarClipboard,
} from '../../lib/calendarDisplay'
import {
  loadCalendarWeekColMin,
  saveCalendarWeekColMin,
  stepCalendarWeekColMin,
} from '../../lib/calendarWeekPrefs'
import { CalendarLayersSheet } from './CalendarLayersSheet'
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

function layoutTimedEvents(events: TodayCalendarEvent[], hourPx: number): LaidEvent[] {
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
      top: row.start * hourPx,
      height: Math.max(22, (row.end - row.start) * hourPx - 2),
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
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month')
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
  const [displayPrefs, setDisplayPrefs] = useState(() => loadCalendarDisplayPrefs())
  const [layersOpen, setLayersOpen] = useState(false)
  const [viewsOpen, setViewsOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const timelineHostRef = useRef<HTMLDivElement | null>(null)
  const [hourPx, setHourPx] = useState(HOUR_PX)
  const [weekColMin, setWeekColMin] = useState(() => loadCalendarWeekColMin())
  const weekScrollRef = useRef<HTMLDivElement | null>(null)

  const bumpWeekZoom = (delta: number) => {
    const next = stepCalendarWeekColMin(weekColMin, delta)
    setWeekColMin(next)
    saveCalendarWeekColMin(next)
  }

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

  const rangeFrom = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    from.setDate(from.getDate() - 7)
    return from
  }, [cursor])

  const rangeTo = useMemo(() => {
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 7)
    return to
  }, [cursor])

  const displayEvents = useMemo(() => {
    let rows = mergeCalendarEvents(events, coachId, rangeFrom, rangeTo, displayPrefs)
    const q = searchQuery.trim().toLowerCase()
    if (q) rows = rows.filter((ev) => (ev.title || '').toLowerCase().includes(q))
    return rows
  }, [events, coachId, rangeFrom, rangeTo, displayPrefs, searchQuery])

  const dayEvents = displayEvents
    .filter((ev) => sameDay(new Date(ev.startAt), selected))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))

  const runSync = useCallback(async () => {
    setSyncBusy(true)
    try {
      await syncCalendarNow()
      setMessage('Synced with iCloud.')
      await refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sync failed.')
    } finally {
      setSyncBusy(false)
    }
  }, [refresh])

  const athleteName = (id: string | null) => roster.find((a) => a.id === id)?.name?.trim() || 'Athlete'
  const activeLessonId = loadActiveLessonId()
  const pickEvent = displayEvents.find((e) => e.id === pickEventId) ?? events.find((e) => e.id === pickEventId) ?? null
  const openEvent = displayEvents.find((e) => e.id === openEventId) ?? events.find((e) => e.id === openEventId) ?? null

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

  useEffect(() => {
    if (!fullScreen || (view !== 'week' && view !== 'day')) return
    const el = timelineHostRef.current
    if (!el) return
    const fit = () => {
      const h = el.clientHeight
      if (h < 120) return
      const allDay = 36
      const next = Math.max(28, Math.min(HOUR_PX, Math.floor((h - allDay) / hours.length)))
      setHourPx(next)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fullScreen, view, hours.length])

  const copyOpenEvent = () => {
    if (!openEvent) return
    saveCalendarClipboard({
      title: openEvent.title,
      startAt: openEvent.startAt,
      endAt: openEvent.endAt,
      location: openEvent.location,
      notes: openEvent.notes,
    })
    setMessage('Event copied — use Tools → Paste on another slot.')
    setToolsOpen(false)
  }

  const pasteClipboard = () => {
    const clip = loadCalendarClipboard()
    if (!clip) {
      setMessage('Nothing copied yet.')
      return
    }
    const dur = Date.parse(clip.endAt) - Date.parse(clip.startAt)
    const start = new Date(selected)
    start.setHours(new Date(clip.startAt).getHours(), new Date(clip.startAt).getMinutes(), 0, 0)
    const end = new Date(start.getTime() + (Number.isFinite(dur) && dur > 0 ? dur : 3600000))
    setBusy(true)
    void createCalendarEvent({
      title: clip.title,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      location: clip.location,
    })
      .then(() => {
        setMessage('Pasted to iCloud on the selected day.')
        return refresh()
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Paste failed.'))
      .finally(() => {
        setBusy(false)
        setToolsOpen(false)
      })
  }

  const deleteOpenEvent = () => {
    if (!openEvent || openEvent.id.startsWith('shapelab-class:')) {
      setMessage('Only iCloud events can be deleted here.')
      return
    }
    if (!confirm(`Delete “${openEvent.title}” from iCloud?`)) return
    setBusy(true)
    void deleteCalendarEvent(openEvent.id)
      .then(() => {
        setOpenEventId(null)
        setMessage('Deleted from iCloud.')
        return refresh()
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Delete failed.'))
      .finally(() => {
        setBusy(false)
        setToolsOpen(false)
      })
  }

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Schedule</p>
          <h3 className="text-lg font-semibold">Calendar</h3>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {(['month', 'week', 'day', 'agenda'] as const).map((id) => (
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
          <button
            type="button"
            className="text-xs text-[var(--muted)] underline disabled:opacity-50"
            disabled={syncBusy}
            onClick={() => void runSync()}
          >
            {syncBusy ? 'Syncing…' : 'Sync'}
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--panel-border)] px-2.5 py-1 text-xs font-semibold"
            onClick={() => setLayersOpen(true)}
          >
            Calendars
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
              const count = displayEvents.filter((ev) => sameDay(new Date(ev.startAt), day)).length
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
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--muted)]">Pinch or use − / + to change day width.</p>
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded-full border border-[var(--panel-border)] px-2 py-0.5 text-xs"
              onClick={() => bumpWeekZoom(-1)}
              aria-label="Narrower days"
            >
              −
            </button>
            <button
              type="button"
              className="rounded-full border border-[var(--panel-border)] px-2 py-0.5 text-xs"
              onClick={() => bumpWeekZoom(1)}
              aria-label="Wider days"
            >
              +
            </button>
          </div>
        </div>
      )}

      {view === 'week' && !fullScreen && (
        <WeekTimeline
          scrollRef={weekScrollRef}
          days={weekDays}
          hours={hours}
          hourPx={HOUR_PX}
          dayColMin={weekColMin}
          events={displayEvents}
          selected={selected}
          openEventId={openEventId}
          onSelectDay={setSelected}
          onToggleEvent={(id) => setOpenEventId((cur) => (cur === id ? null : id))}
          onZoom={bumpWeekZoom}
        />
      )}

      {view === 'day' && !fullScreen && (
        <DayTimeline
          day={selected}
          hours={hours}
          hourPx={HOUR_PX}
          events={dayEvents}
          openEventId={openEventId}
          onToggleEvent={(id) => setOpenEventId((cur) => (cur === id ? null : id))}
        />
      )}

      {view === 'agenda' && (
        <AgendaList
          events={displayEvents.filter((ev) => {
            const t = Date.parse(ev.startAt)
            return t >= rangeFrom.getTime() && t <= rangeTo.getTime()
          })}
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
            onDelete={
              !openEvent.id.startsWith('shapelab-class:') ? () => deleteOpenEvent() : undefined
            }
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
          Nothing on this day. Tap Calendars above to turn on iCloud feeds or gym classes, then Sync.
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
        <div className="fixed inset-x-0 top-0 z-[70] flex h-[100dvh] flex-col bg-[#0b1118] text-[var(--text)]">
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
              {view === 'week' && (
                <div className="flex items-center gap-1 rounded-full border border-[var(--panel-border)] px-1 py-0.5">
                  <button
                    type="button"
                    className="px-2 text-xs"
                    aria-label="Fit week on screen"
                    onClick={() => {
                      setWeekColMin(0)
                      saveCalendarWeekColMin(0)
                    }}
                  >
                    Fit
                  </button>
                  <button type="button" className="px-2 text-xs" onClick={() => bumpWeekZoom(-1)} aria-label="Narrower">
                    −
                  </button>
                  <button type="button" className="px-2 text-xs" onClick={() => bumpWeekZoom(1)} aria-label="Wider">
                    +
                  </button>
                </div>
              )}
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
          <div ref={timelineHostRef} className="min-h-0 flex-1 overflow-hidden px-2">
            {view === 'week' ? (
              <WeekTimeline
                scrollRef={weekScrollRef}
                days={weekDays}
                hours={hours}
                hourPx={hourPx}
                dayColMin={weekColMin}
                events={displayEvents}
                selected={selected}
                openEventId={openEventId}
                onSelectDay={setSelected}
                onToggleEvent={(id) => setOpenEventId((cur) => (cur === id ? null : id))}
                onZoom={bumpWeekZoom}
                fullHeight
              />
            ) : (
              <DayTimeline
                day={selected}
                hours={hours}
                hourPx={hourPx}
                events={dayEvents}
                openEventId={openEventId}
                onToggleEvent={(id) => setOpenEventId((cur) => (cur === id ? null : id))}
                fullHeight
              />
            )}
          </div>
          {openEvent && (
            <div className="max-h-[30vh] shrink-0 overflow-y-auto border-t border-white/10 p-3">
              <EventPreview
                ev={openEvent}
                open
                onToggle={() => setOpenEventId(null)}
                athleteName={athleteName}
                activeLessonId={activeLessonId}
                onStart={startLesson}
                onPick={() => setPickEventId(openEvent.id)}
                onDelete={
                  !openEvent.id.startsWith('shapelab-class:') ? () => deleteOpenEvent() : undefined
                }
              />
            </div>
          )}
          <nav
            className="flex shrink-0 items-center justify-between gap-1 border-t border-white/10 bg-[#0a1014] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            aria-label="Calendar actions"
          >
            <button type="button" className="flex flex-1 flex-col items-center gap-0.5 text-[10px]" onClick={() => setViewsOpen(true)}>
              <span className="text-base">▤</span>
              Views
            </button>
            <button type="button" className="flex flex-1 flex-col items-center gap-0.5 text-[10px]" onClick={() => setLayersOpen(true)}>
              <span className="text-base">▦</span>
              Calendars
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e05a5a] text-xl font-light text-white"
              aria-label="New event"
              onClick={() => {
                setFullScreen(false)
                setCreating(true)
              }}
            >
              +
            </button>
            <button type="button" className="flex flex-1 flex-col items-center gap-0.5 text-[10px]" onClick={() => setToolsOpen(true)}>
              <span className="text-base">✎</span>
              Tools
            </button>
            <button type="button" className="flex flex-1 flex-col items-center gap-0.5 text-[10px]" onClick={() => setSearchOpen((v) => !v)}>
              <span className="text-base">⌕</span>
              Search
            </button>
          </nav>
          {searchOpen && (
            <div className="shrink-0 border-t border-white/10 px-3 py-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events…"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
              />
            </div>
          )}
          {viewsOpen && (
            <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/50 p-4" role="dialog">
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#121820] p-3">
                <p className="text-sm font-semibold">Views</p>
                {(['month', 'week', 'day', 'agenda'] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`mt-2 block w-full rounded-lg px-3 py-2 text-left text-sm ${
                      view === id ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-white/5'
                    }`}
                    onClick={() => {
                      setView(id)
                      setViewsOpen(false)
                      if (id === 'week' || id === 'day') setFullScreen(true)
                      else setFullScreen(false)
                    }}
                  >
                    {id === 'month' ? 'Month' : id === 'week' ? 'Week' : id === 'day' ? 'Day' : 'Agenda'}
                  </button>
                ))}
                <button type="button" className="mt-3 w-full text-sm text-[var(--muted)] underline" onClick={() => setViewsOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          )}
          {toolsOpen && (
            <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/50 p-4" role="dialog">
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#121820] p-3">
                <p className="text-sm font-semibold">Tools</p>
                <button type="button" className="mt-2 block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm" onClick={copyOpenEvent}>
                  Copy selected event
                </button>
                <button type="button" className="mt-2 block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm" onClick={pasteClipboard}>
                  Paste on selected day
                </button>
                <button type="button" className="mt-2 block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm text-red-300" onClick={deleteOpenEvent}>
                  Delete selected event (iCloud)
                </button>
                <button
                  type="button"
                  className="mt-2 block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm"
                  disabled={syncBusy}
                  onClick={() => void runSync().then(() => setToolsOpen(false))}
                >
                  {syncBusy ? 'Syncing…' : 'Sync with iCloud'}
                </button>
                <button type="button" className="mt-3 w-full text-sm text-[var(--muted)] underline" onClick={() => setToolsOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <CalendarLayersSheet
        open={layersOpen}
        onClose={() => setLayersOpen(false)}
        onChanged={() => {
          setDisplayPrefs(loadCalendarDisplayPrefs())
          void refresh()
        }}
      />
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
  onDelete,
  compact = false,
}: {
  ev: TodayCalendarEvent
  open: boolean
  onToggle: () => void
  athleteName: (id: string | null) => string
  activeLessonId: string | null
  onStart: (ev: TodayCalendarEvent, athleteId: string) => void
  onPick: () => void
  onDelete?: () => void
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
          {onDelete && (
            <button
              type="button"
              className="mt-2 rounded-md border border-red-400/40 px-2 py-1 text-[11px] font-semibold text-red-300"
              onClick={onDelete}
            >
              Delete from iCloud
            </button>
          )}
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

function HourLines({ hours, hourPx }: { hours: number[]; hourPx: number }) {
  return (
    <>
      {hours.map((h, i) => (
        <div
          key={h}
          className="absolute inset-x-0 border-t border-white/8"
          style={{ top: i * hourPx, height: hourPx }}
        />
      ))}
    </>
  )
}

function HourGutter({ hours, height, hourPx }: { hours: number[]; height: number; hourPx: number }) {
  return (
    <div className="relative sticky left-0 z-[3] bg-[var(--panel)]" style={{ height }}>
      {hours.map((h, i) => (
        <p
          key={h}
          className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-[var(--muted)]"
          style={{ top: i * hourPx }}
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
  const past = eventIsPast(laid.ev)
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`${formatTimeRange(laid.ev.startAt, laid.ev.endAt)} · ${laid.ev.title || 'Untitled'}`}
      className={`absolute z-[1] overflow-hidden rounded-md px-1 text-left font-semibold leading-tight text-[#10161c] ${
        short ? 'py-0 text-[10px]' : 'py-0.5 text-[11px]'
      } ${selected ? 'ring-2 ring-white' : ''} ${past ? 'opacity-45 saturate-[0.65]' : ''}`}
      style={{
        top: laid.top,
        height: laid.height,
        left: `calc(${leftPct}% + 1px)`,
        width: `calc(${widthPct}% - 2px)`,
        background: color,
      }}
    >
      <span className="block truncate font-semibold">{laid.ev.title || 'Untitled'}</span>
      <span className="block truncate text-[10px] font-normal opacity-80">{formatStart(laid.ev.startAt)}</span>
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

function NowLine({ day, hours, hourPx }: { day: Date; hours: number[]; hourPx: number }) {
  if (!sameDay(day, new Date())) return null
  const top = hourOffset(new Date().toISOString()) * hourPx
  if (top <= 0 || top >= hours.length * hourPx) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[2] flex items-center" style={{ top }}>
      <span className="h-2 w-2 -translate-x-1 rounded-full bg-[#e05a5a]" />
      <span className="h-0.5 flex-1 bg-[#e05a5a]" />
    </div>
  )
}

function WeekTimeline({
  scrollRef,
  days,
  hours,
  hourPx,
  dayColMin,
  events,
  selected,
  openEventId,
  onSelectDay,
  onToggleEvent,
  onZoom,
  fullHeight = false,
}: {
  scrollRef?: RefObject<HTMLDivElement | null>
  days: Date[]
  hours: number[]
  hourPx: number
  dayColMin: number
  events: TodayCalendarEvent[]
  selected: Date
  openEventId: string | null
  onSelectDay: (d: Date) => void
  onToggleEvent: (id: string) => void
  onZoom?: (delta: number) => void
  fullHeight?: boolean
}) {
  const height = hours.length * hourPx
  const colTemplate =
    dayColMin > 0
      ? `2.75rem repeat(7, minmax(${dayColMin}px, 1fr))`
      : '2.75rem repeat(7, minmax(0, 1fr))'
  const innerMinWidth = dayColMin > 0 ? dayColMin * 7 + 48 : undefined

  useEffect(() => {
    const el = scrollRef?.current
    if (!el || !onZoom) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      onZoom(e.deltaY > 0 ? -1 : 1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [scrollRef, onZoom])

  return (
    <div
      ref={scrollRef}
      className={`phone-h-scroll mt-3 w-full min-w-0 max-w-full overflow-x-auto overflow-y-auto ${fullHeight ? 'h-full' : ''}`}
      style={fullHeight ? undefined : { maxHeight: 'min(28rem, 58dvh)' }}
    >
      <div className="w-full" style={innerMinWidth ? { minWidth: innerMinWidth } : undefined}>
        <div className="grid" style={{ gridTemplateColumns: colTemplate }}>
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
        <div className="grid border-b border-white/10" style={{ gridTemplateColumns: colTemplate }}>
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
        <div className="grid" style={{ gridTemplateColumns: colTemplate }}>
          <HourGutter hours={hours} height={height} hourPx={hourPx} />
          {days.map((day) => {
            const laid = layoutTimedEvents(
              events.filter((ev) => sameDay(new Date(ev.startAt), day)),
              hourPx,
            )
            return (
              <div
                key={`col-${day.toISOString()}`}
                className="relative border-l border-white/8 bg-[#0d1218]"
                style={{ height }}
              >
                <HourLines hours={hours} hourPx={hourPx} />
                <NowLine day={day} hours={hours} hourPx={hourPx} />
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

function AgendaList({
  events,
  openEventId,
  onToggleEvent,
}: {
  events: TodayCalendarEvent[]
  openEventId: string | null
  onToggleEvent: (id: string) => void
}) {
  const groups = useMemo(() => {
    const map = new Map<string, TodayCalendarEvent[]>()
    for (const ev of events) {
      const key = ev.startAt.slice(0, 10)
      const list = map.get(key) ?? []
      list.push(ev)
      map.set(key, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [events])
  if (groups.length === 0) {
    return <p className="mt-3 text-sm text-[var(--muted)]">No events in this range.</p>
  }
  return (
    <ul className="mt-3 space-y-4">
      {groups.map(([day, list]) => (
        <li key={day}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <ul className="mt-2 space-y-1">
            {list.map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onToggleEvent(ev.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                    openEventId === ev.id ? 'bg-white/10' : 'bg-[#121820]'
                  } ${eventIsPast(ev) ? 'opacity-50' : ''}`}
                >
                  <span className="w-16 shrink-0 text-xs text-[var(--muted)]">{formatStart(ev.startAt)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{ev.title || 'Untitled'}</span>
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

function DayTimeline({
  day,
  hours,
  hourPx,
  events,
  openEventId,
  onToggleEvent,
  fullHeight = false,
}: {
  day: Date
  hours: number[]
  hourPx: number
  events: TodayCalendarEvent[]
  openEventId: string | null
  onToggleEvent: (id: string) => void
  fullHeight?: boolean
}) {
  const height = hours.length * hourPx
  const allDay = events.filter(isAllDay)
  const laid = layoutTimedEvents(events, hourPx)
  return (
    <div
      className={`phone-h-scroll mt-3 w-full min-w-0 max-w-full overflow-y-auto ${fullHeight ? 'h-full' : ''}`}
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
          <HourGutter hours={hours} height={height} hourPx={hourPx} />
          <div className="relative rounded-r-lg bg-[#0d1218]" style={{ height }}>
            <HourLines hours={hours} hourPx={hourPx} />
            <NowLine day={day} hours={hours} hourPx={hourPx} />
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
