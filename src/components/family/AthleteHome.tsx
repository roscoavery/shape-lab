import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { ensureAutoHomework, loadHomeworkLogs } from '../../lib/storage'
import { HomeworkLogList } from '../homework/HomeworkLogList'
import { AthleteDeskFeed } from './AthleteDeskFeed'
import { DeskMessageCarousel } from './DeskMessageCarousel'
import { AthleteHomeworkGuide } from './AthleteHomeworkGuide'

type Props = {
  athlete: Athlete | null
}

export function AthleteHome({
  athlete,
  onPractice,
  onProgress,
  onVideos,
  onQuickLog,
}: Props & {
  onPractice: () => void
  onProgress: () => void
  onVideos: () => void
  onQuickLog?: () => void
}) {
  if (!athlete) {
    return <p className="text-sm text-[var(--muted)]">Sign in with your athlete login to see homework.</p>
  }
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">Home</p>
        <h2 className="mt-1 text-2xl font-semibold">{athlete.firstName || athlete.name}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Homework, practice, and your own progress.</p>
        {athlete.skillGoals && athlete.skillGoals.length > 0 && (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Goals: {athlete.skillGoals.map((g) => g.label || g.id).join(', ')}
          </p>
        )}
      </section>
      <AthleteHomeworkGuide athlete={athlete} onPractice={onPractice} onQuickLog={onQuickLog} />
      <div className="flex flex-wrap gap-2 px-1">
        <button type="button" onClick={onProgress} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
          Progress
        </button>
        <button type="button" onClick={onVideos} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
          Videos
        </button>
      </div>
      <DeskMessageCarousel audience="athlete" surface="home" />
      <AthleteDeskFeed athlete={athlete} />
    </div>
  )
}

export function AthleteProgress({ athlete }: Props) {
  const [logs, setLogs] = useState(() =>
    athlete ? loadHomeworkLogs().filter((row) => row.athleteId === athlete.id) : [],
  )
  const items = useMemo(
    () => (athlete ? ensureAutoHomework(athlete.id) : []),
    [athlete],
  )
  useEffect(() => {
    if (athlete) {
      setLogs(loadHomeworkLogs().filter((row) => row.athleteId === athlete.id))
    }
  }, [athlete])
  const tests = athlete?.shapeTests ?? []
  if (!athlete) return null
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">Progress</p>
        <h2 className="mt-1 text-2xl font-semibold">{athlete.name}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Your holds and shape tests. Not anyone else’s.</p>
      </section>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="font-semibold">Hold logs</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Grouped by day so older work stays readable.</p>
        <div className="mt-3">
          <HomeworkLogList
            logs={logs}
            items={items}
            athlete={athlete}
            viewer={athlete}
            onLogsChange={() =>
              athlete &&
              setLogs(loadHomeworkLogs().filter((row) => row.athleteId === athlete.id))
            }
          />
        </div>
      </section>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="font-semibold">Shape tests</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {tests.slice(-8).reverse().map((row) => (
            <li key={row.id}>
              {new Date(row.takenAt).toISOString().slice(0, 10)} · {row.pool} · {row.score}/{row.total}
            </li>
          ))}
          {tests.length === 0 && <li className="text-[var(--muted)]">No shape tests on file.</li>}
        </ul>
      </section>
    </div>
  )
}
