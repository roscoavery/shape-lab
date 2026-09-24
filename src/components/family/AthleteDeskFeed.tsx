import { useEffect, useMemo, useState } from 'react'
import type { Athlete, HomeworkLog } from '../../types'
import { loadHomeworkLogs } from '../../lib/storage'
import { formatSeconds } from '../../hooks/useHoldTimer'
import {
  formatWhen,
  holdGains,
  loadUpcomingLessons,
  recentVisitsForAthlete,
  subscribeAthleteDesk,
  type RecentVisit,
  type UpcomingLesson,
} from '../../lib/familySchedule'
import { pushNotice } from '../../lib/notify'
import { CollapsibleSection } from '../CollapsibleSection'

const LESSON_NOTICE_KEY = 'shape-lab.lesson-notice.v1'

type Props = {
  athlete: Athlete
  /** When set, homework logs are already loaded by the parent. */
  logs?: HomeworkLog[]
}

export function AthleteDeskFeed({ athlete, logs: logsProp }: Props) {
  const [upcoming, setUpcoming] = useState<UpcomingLesson[]>([])
  const [tick, setTick] = useState(0)
  const logs = useMemo(() => {
    void tick
    return logsProp ?? loadHomeworkLogs().filter((row) => row.athleteId === athlete.id)
  }, [logsProp, athlete.id, tick])
  const visits = useMemo(() => {
    void tick
    return recentVisitsForAthlete(athlete.id)
  }, [athlete.id, tick])
  const gains = useMemo(() => holdGains(logs), [logs])

  useEffect(() => subscribeAthleteDesk(() => setTick((n) => n + 1)), [])

  useEffect(() => {
    let cancelled = false
    void loadUpcomingLessons(athlete.id).then((rows) => {
      if (cancelled) return
      setUpcoming(rows)
      const soon = Date.now() + 48 * 3600 * 1000
      for (const row of rows) {
        const start = Date.parse(row.startAt)
        if (!Number.isFinite(start) || start < Date.now() - 30 * 60 * 1000 || start > soon) continue
        const key = `${LESSON_NOTICE_KEY}:${athlete.id}:${row.id}`
        try {
          if (localStorage.getItem(key)) continue
          localStorage.setItem(key, '1')
        } catch {
          continue
        }
        void pushNotice({
          toId: athlete.id,
          kind: 'lesson',
          title: `Lesson with ${row.coachName}`,
          body: `${formatWhen(row.startAt)} · ${row.title}`,
          href: 'today',
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [athlete.id])

  return (
    <div className="grid gap-4">
      <CollapsibleSection
        title="Upcoming with your coach"
        hint={upcoming.length ? `${upcoming.length} scheduled` : 'No matched lessons'}
        defaultOpen
      >
        <ul className="mt-3 space-y-2 text-sm">
          {upcoming.map((row) => (
            <li key={row.id} className="rounded-lg bg-[#0d1218] px-3 py-2">
              <p className="font-medium">{row.title}</p>
              <p className="text-[var(--muted)]">
                {formatWhen(row.startAt)} · {row.coachName}
                {row.location ? ` · ${row.location}` : ''}
              </p>
            </li>
          ))}
          {upcoming.length === 0 && (
            <li className="text-[var(--muted)]">No matched lessons on the calendar yet.</li>
          )}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection
        title="Recently attended"
        hint={visits.length ? `${visits.length} recent classes and lessons` : 'No recent visits'}
      >
        <ul className="mt-3 space-y-3 text-sm">
          {visits.map((row) => (
            <VisitRow key={row.id} row={row} />
          ))}
          {visits.length === 0 && (
            <li className="text-[var(--muted)]">No classes or lessons on file yet.</li>
          )}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection
        title="Hold times going up"
        hint={gains.length ? `${gains.length} recent improvement${gains.length === 1 ? '' : 's'}` : 'Progress appears after a longer hold'}
      >
        <ul className="mt-3 space-y-2 text-sm">
          {gains.map((row) => (
            <li key={row.name} className="rounded-lg bg-[#102820] px-3 py-2 text-[var(--accent)]">
              <span className="font-semibold text-[var(--text)]">{row.name}</span>
              {' · '}
              {formatSeconds(row.from)} → {formatSeconds(row.to)}
            </li>
          ))}
          {gains.length === 0 && (
            <li className="text-[var(--muted)]">
              Log another hold on a drill you already did. When the time is longer, it shows here.
            </li>
          )}
        </ul>
      </CollapsibleSection>
    </div>
  )
}

function VisitRow({ row }: { row: RecentVisit }) {
  return (
    <li className="rounded-lg bg-[#0d1218] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {row.kind === 'class' ? 'Class' : 'Lesson'}
      </p>
      <p className="font-medium">{row.title}</p>
      <p className="text-[var(--muted)]">
        {formatWhen(row.when)} · {row.coachName}
      </p>
      {row.notes.length > 0 && (
        <ul className="mt-2 space-y-1 text-[var(--text)]/90">
          {row.notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </li>
  )
}
