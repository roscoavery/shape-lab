import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import {
  authorizeCalendarApi,
  fetchTodayEvents,
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
    calendar?: { eventId: string; title: string; startAt: string; endAt: string },
  ) => void
}

function formatTimeRange(startAt: string, endAt: string): string {
  const s = new Date(startAt)
  const e = new Date(endAt)
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
  return `${s.toLocaleTimeString(undefined, opts)} – ${e.toLocaleTimeString(undefined, opts)}`
}

export function TodayCalendarSection({ coachId, athletes, onStartLesson }: Props) {
  const [events, setEvents] = useState<TodayCalendarEvent[]>([])
  const [loadError, setLoadError] = useState(false)
  const [pickEventId, setPickEventId] = useState<string | null>(null)
  const [saveSeries, setSaveSeries] = useState(false)
  const [saveTitle, setSaveTitle] = useState(false)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [passcode, setPasscode] = useState('')

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
      try {
        await syncCalendarNow()
      } catch {
        /* cached events still shown */
      }
      const { events: rows, unauthorized } = await fetchTodayEvents()
      setNeedsAuth(unauthorized && !hasCalendarApiToken())
      setEvents(rows)
    } catch {
      setLoadError(true)
      setEvents([])
      setNeedsAuth(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const activeLessonId = loadActiveLessonId()

  const athleteName = (id: string | null) =>
    roster.find((a) => a.id === id)?.name?.trim() || 'Athlete'

  const renderActions = (ev: TodayCalendarEvent) => {
    const linked = ev.lessonLinks?.[0]
    const linkedSession = linked ? getLessonSession(linked.lessonId) : null
    const activeForEvent =
      linked && activeLessonId === linked.lessonId && linkedSession && !linkedSession.endedAt

    if (ev.matchStatus === 'ambiguous' || ev.matchStatus === 'needs_athlete') {
      return (
        <button
          type="button"
          className="rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-xs font-semibold"
          onClick={() => setPickEventId(ev.id)}
        >
          Select athlete
        </button>
      )
    }

    if (ev.matchedAthleteId) {
      if (activeForEvent) {
        return (
          <button
            type="button"
            className="rounded-md bg-[var(--accent-dim)] px-2.5 py-1 text-xs font-semibold text-white"
            onClick={() =>
              onStartLesson([ev.matchedAthleteId!], null, {
                eventId: ev.id,
                title: ev.title,
                startAt: ev.startAt,
                endAt: ev.endAt,
              })
            }
          >
            Resume lesson
          </button>
        )
      }
      if (linkedSession?.endedAt) {
        return <span className="text-xs text-[var(--muted)]">Lesson completed</span>
      }
      return (
        <button
          type="button"
          className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[#06281f]"
          onClick={() =>
            onStartLesson([ev.matchedAthleteId!], null, {
              eventId: ev.id,
              title: ev.title,
              startAt: ev.startAt,
              endAt: ev.endAt,
            })
          }
        >
          Start lesson
        </button>
      )
    }

    return (
      <button
        type="button"
        className="rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-xs"
        onClick={() => setPickEventId(ev.id)}
      >
        Open event
      </button>
    )
  }

  const pickEvent = events.find((e) => e.id === pickEventId) ?? null

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Schedule</p>
          <h3 className="text-lg font-semibold">Today from calendar</h3>
        </div>
        <button
          type="button"
          className="text-xs text-[var(--muted)] underline"
          onClick={() => void refresh()}
        >
          Refresh
        </button>
      </div>
      {needsAuth && (
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
        <p className="mt-2 text-sm text-[var(--muted)]">
          Calendar could not load. Your lesson roster still works below.
        </p>
      )}
      {!loadError && !needsAuth && events.length === 0 && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          No events for today. Connect iCloud under More → Profiles → Calendar connections.
        </p>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {events.map((ev) => (
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
                      : 'Coaching event'}
                {ev.location ? ` · ${ev.location}` : ''}
              </p>
            </div>
            {renderActions(ev)}
          </li>
        ))}
      </ul>

      {pickEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
        >
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
                        saveSeries: saveSeries,
                        saveTitle: saveTitle,
                      }).then(() => {
                        setPickEventId(null)
                        void refresh()
                        if (pickEvent.matchStatus !== 'not_lesson') {
                          onStartLesson([a.id], null, {
                            eventId: pickEvent.id,
                            title: pickEvent.title,
                            startAt: pickEvent.startAt,
                            endAt: pickEvent.endAt,
                          })
                        }
                      })
                    }}
                  >
                    {a.name}
                  </button>
                </li>
              ))}
            </ul>
            <label className="mt-3 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={saveTitle}
                onChange={(e) => setSaveTitle(e.target.checked)}
              />
              Use this match for future events with the same title
            </label>
            <label className="mt-1 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={saveSeries}
                onChange={(e) => setSaveSeries(e.target.checked)}
              />
              Use for this recurring series
            </label>
            <button
              type="button"
              className="mt-3 text-sm text-[var(--muted)] underline"
              onClick={() => setPickEventId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
