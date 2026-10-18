import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
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
import { classLabel, classMemberIds, getOffering, loadMeetings } from '../../lib/coachClasses'
import { lessonAthleteIds, loadLessonSessions } from '../../lib/lessonStore'
import { publishTextPostResult } from '../../lib/feedPosts'
import { coachShareLabel } from '../../lib/coachShare'
import { logClassSkillForAthlete } from '../../lib/classSessionLog'
import { addCoachNotesToAthletes } from '../../lib/athleteNotes'

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

/** Athletes from today's ended classes and lessons, in coaching order. */
function athletesWorkedToday(coachId: string, athletes: Athlete[]): Athlete[] {
  const seen = new Map<string, number>()
  const now = new Date()
  const isToday = (iso: string) => {
    const dt = new Date(iso)
    return (
      dt.getFullYear() === now.getFullYear() &&
      dt.getMonth() === now.getMonth() &&
      dt.getDate() === now.getDate()
    )
  }
  for (const m of loadMeetings(coachId)) {
    if (!m.endedAt || !isToday(m.startedAt)) continue
    const at = Date.parse(m.startedAt) || 0
    let hasAttendees = false
    for (const a of m.attendees) {
      if (a.athleteId && !seen.has(a.athleteId)) seen.set(a.athleteId, at)
      if (a.athleteId) hasAttendees = true
    }
    // If the class auto-started/ended with no attendance marked, fall back
    // to the class roster so the wins banner still lists the athletes.
    if (!hasAttendees && m.offeringId) {
      for (const id of classMemberIds(m.offeringId, athletes)) {
        if (!seen.has(id)) seen.set(id, at)
      }
    }
  }
  for (const s of loadLessonSessions()) {
    if (s.coachId !== coachId || !s.endedAt || !isToday(s.startedAt)) continue
    const at = Date.parse(s.startedAt) || 0
    for (const id of lessonAthleteIds(s)) {
      if (!seen.has(id)) seen.set(id, at)
    }
  }
  return [...seen.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => athletes.find((a) => a.id === id))
    .filter((a): a is Athlete => Boolean(a))
}

/**
 * Post a win for an athlete: skill log + wins feed + coach note, attached to
 * today's class or lesson when there is one. Same shape as the recap lists.
 * Returns true on success, or an error message to show.
 */
async function postWinForAthlete(
  coach: Athlete,
  athletes: Athlete[],
  onAthletesChange: (next: Athlete[]) => void,
  athlete: Athlete,
  text: string,
): Promise<true | string> {
  const t = text.trim()
  if (!t) return 'Write the win first.'
  let meetingId: string | undefined
  let lessonId: string | undefined
  let className: string | undefined
  const meeting = loadMeetings(coach.id)
    .filter((m) => {
      if (!m.endedAt || !m.attendees.some((a) => a.athleteId === athlete.id)) return false
      const dt = new Date(m.startedAt)
      const now = new Date()
      return (
        dt.getFullYear() === now.getFullYear() &&
        dt.getMonth() === now.getMonth() &&
        dt.getDate() === now.getDate()
      )
    })
    .pop()
  if (meeting) {
    meetingId = meeting.id
    const offering = getOffering(meeting.offeringId)
    if (offering) className = classLabel(offering)
  } else {
    const lesson = loadLessonSessions()
      .filter((s) => {
        if (s.coachId !== coach.id || !s.endedAt || !lessonAthleteIds(s).includes(athlete.id))
          return false
        const dt = new Date(s.startedAt)
        const now = new Date()
        return (
          dt.getFullYear() === now.getFullYear() &&
          dt.getMonth() === now.getMonth() &&
          dt.getDate() === now.getDate()
        )
      })
      .pop()
    if (lesson) lessonId = lesson.id
  }
  logClassSkillForAthlete({
    athleteId: athlete.id,
    text: t,
    ...(meetingId ? { meetingId } : {}),
    ...(className ? { className } : {}),
  })
  const published = await publishTextPostResult({
    authorId: athlete.id,
    caption: t,
    taggedIds: [athlete.id],
    channels: ['wins'],
    sharedById: coach.id,
    sharedByName: coachShareLabel(coach),
  })
  if (!published.post) return published.error || 'Could not post the win. Try again.'
  onAthletesChange(
    addCoachNotesToAthletes(athletes, [athlete.id], {
      author: coach,
      text: `Win · ${t}`,
      ...(meetingId ? { meetingId } : {}),
      ...(lessonId ? { lessonId } : {}),
      ...(className ? { className } : {}),
      topicLabel: 'Win',
    }),
  )
  return true
}

/**
 * Smart banners at the top of the coach Today tab.
 * - Evening: nudge to log wins in the recaps below, if classes/lessons ran today.
 * - Anytime: nudge to plan lessons on the calendar today/tomorrow with no plan.
 * Dismissing hides a banner for the rest of the day.
 */
export function CoachReminderBanners({
  coachId,
  coach,
  athletes,
  onAthletesChange,
  onJumpToRecaps,
  onPlanLesson,
}: {
  coachId: string
  coach: Athlete
  athletes: Athlete[]
  onAthletesChange: (next: Athlete[]) => void
  onJumpToRecaps: () => void
  onPlanLesson?: (ev: TodayCalendarEvent) => void
}) {
  const [tick, setTick] = useState(0)
  const [calEvents, setCalEvents] = useState<TodayCalendarEvent[]>([])
  const [winDrafts, setWinDrafts] = useState<Record<string, string>>({})
  const [winBusy, setWinBusy] = useState<Record<string, boolean>>({})
  const [winDone, setWinDone] = useState<Record<string, boolean>>({})
  const [winError, setWinError] = useState<Record<string, string | undefined>>({})
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

  const submitWin = (a: Athlete) => {
    void (async () => {
      setWinBusy((s) => ({ ...s, [a.id]: true }))
      setWinError((s) => ({ ...s, [a.id]: undefined }))
      try {
        const result = await postWinForAthlete(
          coach,
          athletes,
          onAthletesChange,
          a,
          winDrafts[a.id] ?? '',
        )
        if (result === true) {
          setWinDrafts((s) => ({ ...s, [a.id]: '' }))
          setWinDone((s) => ({ ...s, [a.id]: true }))
        } else {
          setWinError((s) => ({ ...s, [a.id]: result }))
        }
      } catch {
        setWinError((s) => ({ ...s, [a.id]: 'Could not post the win. Try again.' }))
      } finally {
        setWinBusy((s) => ({ ...s, [a.id]: false }))
      }
    })()
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
          const worked = athletesWorkedToday(coachId, athletes)
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
                    {bits.join(' · ')} today. Post the wins here, or walk the recaps below.
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
              {worked.length > 0 && (
                <div className="mt-2 space-y-2">
                  {worked.map((a) => (
                    <div key={a.id} className="rounded-xl bg-black/25 p-2.5">
                      <p className="mb-1.5 text-sm font-semibold text-[var(--text)]">{a.name}</p>
                      {winDone[a.id] ? (
                        <p className="text-xs font-semibold text-[var(--accent)]">
                          Win posted ✓
                        </p>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <input
                              value={winDrafts[a.id] ?? ''}
                              onChange={(e) =>
                                setWinDrafts((s) => ({ ...s, [a.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  submitWin(a)
                                }
                              }}
                              placeholder={`A win for ${a.name.split(' ')[0]}…`}
                              className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
                            />
                            <button
                              type="button"
                              disabled={!(winDrafts[a.id] ?? '').trim() || winBusy[a.id]}
                              onClick={() => submitWin(a)}
                              className="h-10 shrink-0 rounded-lg bg-[var(--accent)] px-3 text-sm font-bold text-[var(--on-accent)] disabled:opacity-40"
                            >
                              {winBusy[a.id] ? 'Posting…' : 'Post'}
                            </button>
                          </div>
                          {winError[a.id] && (
                            <p className="mt-1 text-xs text-red-300">{winError[a.id]}</p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {worked.length === 0 && (
                <button
                  type="button"
                  onClick={onJumpToRecaps}
                  className="mt-2 w-full rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-black text-black"
                >
                  Go to recaps
                </button>
              )}
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
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--text)]">
                  {r.events.length} lesson{r.events.length === 1 ? '' : 's'} on your calendar need{r.events.length === 1 ? 's' : ''} a plan
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-[var(--muted)]">
                  {r.events.slice(0, 4).map((ev) => {
                    // Show the athlete's name, not the parent's name from the
                    // Acuity event title.
                    const matched = ev.matchedAthleteId
                      ? athletes.find((a) => a.id === ev.matchedAthleteId)
                      : null
                    const label = matched?.name ?? ev.title
                    return (
                      <li key={ev.id}>
                        {onPlanLesson ? (
                          <button
                            type="button"
                            onClick={() => onPlanLesson(ev)}
                            className="text-left underline decoration-sky-300/50 underline-offset-2"
                          >
                            {label} ·{' '}
                            {new Date(ev.startAt).toLocaleString([], {
                              weekday: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </button>
                        ) : (
                          <span>
                            {label} ·{' '}
                            {new Date(ev.startAt).toLocaleString([], {
                              weekday: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </li>
                    )
                  })}
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
