import { useEffect, useState } from 'react'
import { dismissReminder, getCoachReminders } from '../../lib/coachReminders'
import {
  dateKey,
  loadDayHours,
  pendingJackrabbitDays,
  saveDayHours,
  setJackrabbitLogged,
  subscribeCoachHours,
} from '../../lib/coachHours'
import { fetchCalendarRange, type TodayCalendarEvent } from '../../lib/calendarClient'

/** End-of-day hours prompt: a number like 3.25, never a time range. */
function LogHoursBanner({
  coachId,
  date,
  estimate,
  pendingJackrabbit,
  onDone,
}: {
  coachId: string
  date: string
  estimate: number
  pendingJackrabbit: number
  onDone: () => void
}) {
  const [value, setValue] = useState(estimate > 0 ? String(estimate) : '')
  const [error, setError] = useState('')
  const [jackrabbit, setJackrabbit] = useState(false)

  const isToday = date === dateKey(new Date())
  const dayLabel = isToday
    ? 'today'
    : new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))).toLocaleDateString(
        [],
        { weekday: 'long', month: 'short', day: 'numeric' },
      )

  const save = () => {
    const hours = Number(value)
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
      setError('Enter your hours as a number, like 3.25.')
      return
    }
    const log = saveDayHours(coachId, date, hours, {
      jackrabbitLogged: jackrabbit,
    })
    if (!log) {
      setError('Enter your hours as a number, like 3.25.')
      return
    }
    onDone()
  }

  return (
    <div className="rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--text)]">
            How many hours did you work {dayLabel}?
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {estimate > 0
              ? `Your classes ${dayLabel} add up to about ${estimate}h from your presence marks. Adjust if needed.`
              : 'Just the number, like 3.25.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="shrink-0 rounded-full px-2 py-1 text-xs text-[var(--muted)]"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
          }}
          inputMode="decimal"
          placeholder="3.25"
          aria-label="Hours worked today"
          className="min-w-0 flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-[var(--text)] placeholder:text-white/30"
        />
        <button
          type="button"
          onClick={save}
          className="shrink-0 rounded-xl bg-emerald-300 px-5 py-2.5 text-sm font-black text-black"
        >
          Save
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-300">{error}</p>}
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-[var(--muted)]">
        <input
          type="checkbox"
          checked={jackrabbit}
          onChange={(e) => setJackrabbit(e.target.checked)}
          className="h-4 w-4 accent-emerald-300"
        />
        I already logged these hours in Jackrabbit
      </label>
      <p className="mt-1.5 text-xs font-semibold text-[var(--text)]">
        Don't forget to log these hours in Jackrabbit.
        {pendingJackrabbit > 0 &&
          ` ${pendingJackrabbit} earlier day${pendingJackrabbit === 1 ? '' : 's'} still waiting.`}
      </p>
    </div>
  )
}

/** Easy reference for Jackrabbit: days worked, hours, and what's been logged there. */
function HoursLogPanel({ coachId }: { coachId: string }) {
  const [tick, setTick] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => subscribeCoachHours(() => setTick((t) => t + 1)), [])

  if (tick < 0) return null
  const logs = loadDayHours(coachId)
  if (logs.length === 0) return null
  const pending = pendingJackrabbitDays(coachId).length

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3"
      >
        <span className="text-sm font-bold text-[var(--text)]">
          Hours log
          {pending > 0 && (
            <span className="ml-2 rounded-full bg-amber-300/20 px-2 py-0.5 text-xs font-bold text-amber-200">
              {pending} not in Jackrabbit
            </span>
          )}
        </span>
        <span className="text-xs text-[var(--muted)]">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"
            >
              <span className="text-sm text-[var(--text)]">
                <span className="font-semibold">{fmtDate(log.date)}</span>
                <span className="text-white/50"> · </span>
                <span className="font-bold">{log.hours}h</span>
              </span>
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={log.jackrabbitLogged}
                  onChange={(e) => {
                    setJackrabbitLogged(log.id, e.target.checked)
                    setTick((t) => t + 1)
                  }}
                  className="h-4 w-4 accent-emerald-300"
                />
                Jackrabbit
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Smart banners at the top of the coach Today tab.
 * - Evening: nudge to log wins in the recaps below, if classes/lessons ran today.
 * - Anytime: nudge to plan lessons on the calendar today/tomorrow with no plan.
 * Dismissing hides a banner for the rest of the day.
 */
export function CoachReminderBanners({
  coachId,
  onJumpToRecaps,
}: {
  coachId: string
  onJumpToRecaps: () => void
}) {
  const [tick, setTick] = useState(0)
  const [calEvents, setCalEvents] = useState<TodayCalendarEvent[]>([])
  const reminders = getCoachReminders(coachId, new Date(), calEvents)

  useEffect(() => {
    let cancelled = false
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)
    fetchCalendarRange(now, tomorrow)
      .then(({ events }) => {
        if (!cancelled) setCalEvents(events)
      })
      .catch(() => {
        /* calendar unavailable — session-based reminders still work */
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  const dismiss = (kind: string) => {
    dismissReminder(kind)
    setTick((t) => t + 1)
  }

  if (tick < 0) return null

  return (
    <div className="flex flex-col gap-2">
      {reminders.map((r) => {
        if (r.kind === 'log-wins') {
          const bits = [
            r.meetings ? `${r.meetings} class${r.meetings === 1 ? '' : 'es'}` : null,
            r.lessons ? `${r.lessons} lesson${r.lessons === 1 ? '' : 's'}` : null,
          ].filter(Boolean)
          return (
            <div
              key="log-wins"
              className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">
                    Day's done, log the wins
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {bits.join(' · ')} today. Drop the wins in the recaps below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss('log-wins')}
                  className="shrink-0 rounded-full px-2 py-1 text-xs text-[var(--muted)]"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
              <button
                type="button"
                onClick={onJumpToRecaps}
                className="mt-2 w-full rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-black text-black"
              >
                Go to recaps
              </button>
            </div>
          )
        }
        if (r.kind === 'log-hours') {
          return (
            <LogHoursBanner
              key={`log-hours-${r.date}`}
              coachId={coachId}
              date={r.date}
              estimate={r.estimate}
              pendingJackrabbit={r.pendingJackrabbit}
              onDone={() => dismiss(`log-hours-${r.date}`)}
            />
          )
        }
        if (r.kind === 'plan-lessons') {
          return (
            <div
              key="plan-lessons"
              className="rounded-xl border border-sky-300/40 bg-sky-300/10 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">
                    {r.sessions.length} lesson{r.sessions.length === 1 ? '' : 's'} need{r.sessions.length === 1 ? 's' : ''} a plan
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-[var(--muted)]">
                    {r.sessions.slice(0, 4).map((s) => (
                      <li key={s.id}>
                        {(s.calendarTitle ?? 'Lesson')} ·{' '}
                        {new Date(s.calendarStartAt ?? s.startedAt).toLocaleString([], {
                          weekday: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </li>
                    ))}
                    {r.sessions.length > 4 && (
                      <li>+{r.sessions.length - 4} more</li>
                    )}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss('plan-lessons')}
                  className="shrink-0 rounded-full px-2 py-1 text-xs text-[var(--muted)]"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        }
        // Calendar lessons not yet linked to a lesson session in the app.
        return (
          <div
            key="plan-calendar-lessons"
            className="rounded-xl border border-sky-300/40 bg-sky-300/10 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--text)]">
                  {r.events.length} lesson{r.events.length === 1 ? '' : 's'} on your calendar need{r.events.length === 1 ? 's' : ''} a plan
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-[var(--muted)]">
                  {r.events.slice(0, 4).map((ev) => (
                    <li key={ev.id}>
                      {ev.title} ·{' '}
                      {new Date(ev.startAt).toLocaleString([], {
                        weekday: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </li>
                  ))}
                  {r.events.length > 4 && (
                    <li>+{r.events.length - 4} more</li>
                  )}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => dismiss('plan-calendar-lessons')}
                className="shrink-0 rounded-full px-2 py-1 text-xs text-[var(--muted)]"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )
      })}
      <HoursLogPanel coachId={coachId} />
    </div>
  )
}
