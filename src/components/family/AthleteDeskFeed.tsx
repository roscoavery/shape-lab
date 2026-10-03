import { useEffect, useMemo, useState } from 'react'
import type { Athlete, HomeworkLog } from '../../types'
import { loadHomeworkLogs } from '../../lib/storage'
import {
  formatWhen,
  loadUpcomingLessons,
  recentVisitsForAthlete,
  subscribeAthleteDesk,
  type RecentVisit,
  type UpcomingLesson,
} from '../../lib/familySchedule'
import { perShapeHoldStats, formatSecondsShort, shortDate } from '../../lib/holdStats'
import { pushNotice } from '../../lib/notify'
import { CollapsibleSection } from '../CollapsibleSection'

const LESSON_NOTICE_KEY = 'shape-lab.lesson-notice.v1'

type Props = {
  athlete: Athlete
  /** When set, homework logs are already loaded by the parent. */
  logs?: HomeworkLog[]
}

function useAthleteDeskData(athlete: Athlete, logsProp?: HomeworkLog[]) {
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
  return { upcoming, visits, logs }
}

export function AthleteUpcomingCard({ athlete, defaultOpen = true }: { athlete: Athlete; defaultOpen?: boolean }) {
  const { upcoming } = useAthleteDeskData(athlete)
  return (
    <CollapsibleSection
      title="Upcoming with your coach"
      hint={upcoming.length ? `${upcoming.length} scheduled` : 'No upcoming lesson is matched yet'}
      defaultOpen={defaultOpen}
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
          <li className="text-[var(--muted)]">No upcoming lesson is matched yet.</li>
        )}
      </ul>
    </CollapsibleSection>
  )
}

export function AthleteProgressCard({ athlete, logs: logsProp }: Props) {
  const { logs } = useAthleteDeskData(athlete, logsProp)
  const shapes = useMemo(() => perShapeHoldStats(logs), [logs])
  const hasGains = shapes.some((s) => s.count > 1 && s.latestSeconds > s.firstSeconds)
  return (
    <div
      className="rounded-2xl"
      style={
        hasGains
          ? { boxShadow: '0 0 22px rgba(150, 110, 220, 0.28)', border: '1px solid rgba(180, 140, 232, 0.5)' }
          : undefined
      }
    >
    <CollapsibleSection
      title="Hold times going up"
      hint={shapes.length ? `${shapes.length} shape${shapes.length === 1 ? '' : 's'} tracked` : 'No progress yet'}
      defaultOpen
    >
      <ul className="mt-3 space-y-2 text-sm">
        {shapes.slice(0, 4).map((s) => {
          const delta = s.latestSeconds - s.firstSeconds
          return (
            <li
              key={s.shapeId}
              className="rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold text-[var(--text)]">{s.name}</span>
                <span className="text-xs tabular-nums">
                  <span
                    className="font-black text-amber-200"
                    style={{ textShadow: '0 0 10px rgba(251,191,36,0.5)' }}
                  >
                    {formatSecondsShort(s.longest)}
                  </span>
                  <span className="text-[var(--muted)]"> best · {shortDate(s.longestDate)}</span>
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {s.count > 1 ? (
                  delta > 0 ? (
                    <>up <span className="font-black text-green-300" style={{ textShadow: '0 0 10px rgba(74,222,128,0.5)' }}>{formatSecondsShort(delta)}</span> since {shortDate(s.firstDate)} <span className="tabular-nums">({formatSecondsShort(s.firstSeconds)} → {formatSecondsShort(s.latestSeconds)})</span></>
                  ) : delta < 0 ? (
                    <><span className="font-black text-orange-300">{formatSecondsShort(delta)}</span> since {shortDate(s.firstDate)} — next one counts</>
                  ) : (
                    <>holding steady since {shortDate(s.firstDate)}</>
                  )
                ) : (
                  <>first hold logged {shortDate(s.firstDate)} — keep going</>
                )}
              </p>
            </li>
          )
        })}
        {shapes.length === 0 && (
          <li className="text-[var(--muted)]">
            Your progress will start showing here as you practice and your coach logs new work.
          </li>
        )}
      </ul>
      {shapes.length > 4 && (
        <p className="mt-2 text-xs text-[var(--muted)]">+{shapes.length - 4} more in Progress →</p>
      )}
    </CollapsibleSection>
    </div>
  )
}

export function AthleteActivityCard({ athlete, logs: logsProp }: Props) {
  const { visits } = useAthleteDeskData(athlete, logsProp)
  return (
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
  )
}

export function AthleteDeskFeed({ athlete, logs: logsProp }: Props) {
  return (
    <div className="grid gap-4">
      <AthleteUpcomingCard athlete={athlete} />
      <AthleteActivityCard athlete={athlete} logs={logsProp} />
      <AthleteProgressCard athlete={athlete} logs={logsProp} />
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
