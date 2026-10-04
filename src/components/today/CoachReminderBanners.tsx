import { useEffect, useState } from 'react'
import { dismissReminder, getCoachReminders } from '../../lib/coachReminders'
import { fetchCalendarRange, type TodayCalendarEvent } from '../../lib/calendarClient'

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

  if (reminders.length === 0 || tick < 0) return null

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
    </div>
  )
}
