import { useMemo } from 'react'
import type { Athlete } from '../../types'
import { loadAllHomework, loadHomeworkLogs, logProperHoldSeconds } from '../../lib/storage'

type Props = {
  athlete: Athlete | null
}

export function AthleteHome({ athlete, onPractice, onProgress, onVideos }: Props & {
  onPractice: () => void
  onProgress: () => void
  onVideos: () => void
}) {
  const homework = useMemo(
    () => (athlete ? loadAllHomework().filter((row) => row.athleteId === athlete.id).slice(0, 6) : []),
    [athlete],
  )
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
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="font-semibold">Today’s homework</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {homework.map((row) => (
            <li key={row.id}>{row.customLabel || row.shapeId}</li>
          ))}
          {homework.length === 0 && <li className="text-[var(--muted)]">Nothing assigned yet.</li>}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onPractice} className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-bold text-[var(--on-accent)]">
            Practice
          </button>
          <button type="button" onClick={onProgress} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
            Progress
          </button>
          <button type="button" onClick={onVideos} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
            Videos
          </button>
        </div>
      </section>
    </div>
  )
}

export function AthleteProgress({ athlete }: Props) {
  const logs = useMemo(
    () => (athlete ? loadHomeworkLogs().filter((row) => row.athleteId === athlete.id) : []),
    [athlete],
  )
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
        <h3 className="font-semibold">Recent holds</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {logs.slice(0, 12).map((row) => (
            <li key={row.id}>
              {row.date.slice(0, 10)} · {row.sourceLabel || row.shapeId} ·{' '}
              {Math.round(logProperHoldSeconds(row) || row.totalHoldSeconds)}s
            </li>
          ))}
          {logs.length === 0 && <li className="text-[var(--muted)]">No holds logged yet.</li>}
        </ul>
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
