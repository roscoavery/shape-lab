import { useEffect, useState } from 'react'
import type { Athlete } from '../types'
import {
  canSeePrivateCoaching,
  classAttendanceForAthlete,
  coachesLabel,
  coachesOf,
  lessonsForAthlete,
  recentHomeworkLogs,
  worksWithCoachIds,
} from '../lib/coachLink'
import { subscribeHomework } from '../lib/storage'
import { subscribeLessons } from '../lib/lessonStore'
import {
  attendeeCountsOnProfile,
  classLabel,
  loadMeetings,
  loadOfferings,
  markClassAttendance,
  removeClassAttendance,
  subscribeCoachClasses,
} from '../lib/coachClasses'
import { splitPersonName } from '../lib/classStation'
import { isCoachProfile, isGymAdmin } from '../lib/profileRole'
import { HomeworkLogReactions } from './homework/HomeworkLogReactions'

type Props = {
  athlete: Athlete
  viewer: Athlete | null
  athletes: Athlete[]
  compact?: boolean
}

export function CoachAthleteActivity({ athlete, viewer, athletes, compact = false }: Props) {
  const allowed = canSeePrivateCoaching(viewer, athlete)
  const [, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    const unsubHw = subscribeHomework(bump)
    const unsubLessons = subscribeLessons(bump)
    const unsubClass = subscribeCoachClasses(bump)
    return () => {
      unsubHw()
      unsubLessons()
      unsubClass()
    }
  }, [])

  const own = viewer?.id === athlete.id
  const admin = isGymAdmin(viewer)
  const canEditNights = own || admin
  const addable = (() => {
    if (!admin) return []
    const offerings = loadOfferings()
    return loadMeetings()
      .filter((m) => m.endedAt)
      .filter((m) => {
        const already = m.attendees.some(
          (row) =>
            attendeeCountsOnProfile(m, row) &&
            (row.athleteId === athlete.id ||
              (row.firstName &&
                row.lastName &&
                athlete.firstName &&
                athlete.lastName &&
                row.firstName.toLowerCase() === athlete.firstName.toLowerCase() &&
                row.lastName.toLowerCase() === athlete.lastName.toLowerCase())),
        )
        return !already
      })
      .slice(0, 12)
      .map((m) => ({
        meeting: m,
        label: classLabel(
          offerings.find((o) => o.id === m.offeringId) ?? {
            name: 'Class',
            weekday: 'Monday' as const,
            time: '',
          },
        ),
      }))
  })()

  if (!allowed && !own) return null

  const coaches = coachesOf(athlete, athletes)
  const logs = allowed ? recentHomeworkLogs(athlete.id, compact ? 6 : 12) : []
  const lessons = allowed ? lessonsForAthlete(athlete.id).slice(0, compact ? 4 : 8) : []
  const classes = allowed ? classAttendanceForAthlete(athlete).slice(0, compact ? 4 : 12) : []
  const picked = worksWithCoachIds(athlete).length > 0

  return (
    <section className="flex flex-col gap-3">
      {own && !picked && (
        <p className="rounded-lg border border-[var(--accent)]/40 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          Pick the coaches you work with under Edit photo and answers. They
          will see homework you log, sequences, class nights, and lessons.
          Wins and posts stay public.
        </p>
      )}
      {coaches.length > 0 && (
        <p className="text-xs text-[var(--muted)]">
          Coaches{own ? ' who can see your training' : ''}: {coachesLabel(athlete, athletes)}
        </p>
      )}
      {allowed && (
        <div className="rounded-xl border border-[var(--panel-border)] bg-black/20 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {own ? 'Your training' : `${athlete.name.split(' ')[0]}’s training`}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            Homework, class nights, and lessons — only coaches they work with
            {own ? ' (and you)' : ''}.
          </p>

          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Homework logs
          </p>
          {logs.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--muted)]">Nothing logged yet.</p>
          ) : (
            <ul className="mt-1 divide-y divide-white/5">
              {logs.map(({ log, line }) => (
                <li key={log.id} className="py-1.5">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="min-w-0">{line}</span>
                    <span className="shrink-0 text-[11px] text-[var(--muted)]">
                      {new Date(log.date).toLocaleDateString()}
                    </span>
                  </div>
                  <HomeworkLogReactions
                    log={log}
                    athletes={athletes}
                    viewer={viewer}
                    canReact={Boolean(
                      viewer &&
                        viewer.id !== athlete.id &&
                        isCoachProfile(viewer) &&
                        canSeePrivateCoaching(viewer, athlete),
                    )}
                  />
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Lessons
          </p>
          {lessons.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--muted)]">No ended lessons yet.</p>
          ) : (
            <ul className="mt-1 divide-y divide-white/5">
              {lessons.map((s) => {
                const coach = athletes.find((a) => a.id === s.coachId)
                return (
                  <li key={s.id} className="flex justify-between gap-2 py-1.5 text-sm">
                    <span>
                      Lesson{coach ? ` with ${coach.name.split(' ')[0]}` : ''}
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--muted)]">
                      {new Date(s.endedAt ?? s.startedAt).toLocaleDateString()}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Class nights
          </p>
          {classes.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--muted)]">No class attendance logged yet.</p>
          ) : (
            <ul className="mt-1 divide-y divide-white/5">
              {classes.map((row) => (
                <li key={row.meetingId} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="min-w-0">
                    {row.className}
                    <span className="ml-2 shrink-0 text-[11px] text-[var(--muted)]">
                      {new Date(row.startedAt).toLocaleDateString()}
                    </span>
                  </span>
                  {canEditNights && (
                    <button
                      type="button"
                      className="shrink-0 text-[11px] text-[var(--bad)] underline"
                      onClick={() => {
                        removeClassAttendance(row.meetingId, athlete.id)
                      }}
                    >
                      {own ? 'I wasn’t there' : 'Remove'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {admin && addable.length > 0 && (
            <label className="mt-2 block text-[11px] text-[var(--muted)]">
              Add a class night
              <select
                className="mt-1 h-9 w-full rounded-lg border border-[var(--panel-border)] bg-black/40 px-2 text-sm text-[var(--text)]"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value
                  e.target.value = ''
                  const found = addable.find((row) => row.meeting.id === id)
                  if (!found) return
                  const parts = splitPersonName(athlete.name)
                  markClassAttendance({
                    meetingId: found.meeting.id,
                    athleteId: athlete.id,
                    firstName: athlete.firstName || parts.firstName,
                    lastName: athlete.lastName || parts.lastName,
                    source: 'manual',
                    logged: true,
                  })
                }}
              >
                <option value="">Pick an ended class…</option>
                {addable.map((row) => (
                  <option key={row.meeting.id} value={row.meeting.id}>
                    {row.label} · {new Date(row.meeting.startedAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </section>
  )
}
