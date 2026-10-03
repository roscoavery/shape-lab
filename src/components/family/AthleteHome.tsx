import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { ensureAutoHomework, loadHomeworkLogs } from '../../lib/storage'
import { HomeworkLogList } from '../homework/HomeworkLogList'
import { AthleteUpcomingCard, AthleteProgressCard, AthleteActivityCard } from './AthleteDeskFeed'
import { DeskMessageCarousel } from './DeskMessageCarousel'
import { AthleteHomeworkGuide } from './AthleteHomeworkGuide'
import { AthletePathStrip } from './AthletePathStrip'
import { AthleteHoldStats } from './AthleteHoldStats'
import { AthleteFoundation } from './AthleteFoundation'
import { AthleteLeaderboards } from './AthleteLeaderboards'
import { CollapsibleSection } from '../CollapsibleSection'

type Props = {
  athlete: Athlete | null
}

export function AthleteHome({
  athlete,
  onPractice,
  onProgress,
  onVideos,
  onQuickLog,
  onOpenGuide,
  onOpenShapes,
}: Props & {
  onPractice: () => void
  onProgress: () => void
  onVideos: () => void
  onQuickLog?: () => void
  onOpenGuide: () => void
  onOpenShapes: () => void
}) {
  if (!athlete) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Your progress will start showing here as you practice and your coach logs new work.
      </p>
    )
  }
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      {/* TODAY — what should I work on? */}
      <section id="tour-athlete-today" className="rounded-xl border border-[var(--accent)]/30 bg-[var(--panel)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">Today</p>
        <h2 className="mt-1 text-2xl font-semibold">What should I work on?</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {athlete.skillGoals && athlete.skillGoals.length > 0
            ? `Working toward: ${athlete.skillGoals.map((g) => g.label || g.id).join(', ')}`
            : 'Your coach will set goals with you.'}
        </p>
        <button
          type="button"
          onClick={onPractice}
          style={{ animation: 'sl-skill-pulse 2.4s ease-in-out infinite' }}
          className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-bold text-[var(--on-accent)] sm:w-auto sm:px-8"
        >
          Start Practice
        </button>
      </section>
      <div id="tour-athlete-path">
      <CollapsibleSection title="Your path">
        <AthletePathStrip athlete={athlete} onOpenGuide={onOpenGuide} />
      </CollapsibleSection>
      </div>
      <div id="tour-athlete-foundation">
      <CollapsibleSection title="Strengthen your foundation">
        <AthleteFoundation athlete={athlete} />
      </CollapsibleSection>
      </div>
      <div id="tour-athlete-bests">
      <CollapsibleSection title="Gym bests">
        <AthleteLeaderboards athlete={athlete} />
      </CollapsibleSection>
      </div>
      <button
        id="tour-athlete-shapes"
        type="button"
        onClick={onOpenShapes}
        className="sl-skill-glow sl-left px-4 py-4"
      >
        <span className="block text-sm font-bold text-white">Study your shapes</span>
        <span className="text-xs text-white/70">
          The body positions every skill is built from — quiz yourself
        </span>
      </button>
      <div id="tour-athlete-homework">
      <CollapsibleSection title="Homework plan">
        <AthleteHomeworkGuide athlete={athlete} onPractice={onPractice} onQuickLog={onQuickLog} />
      </CollapsibleSection>
      </div>
      {/* Recent progress */}
      <div id="tour-athlete-progress">
      <CollapsibleSection title="Recent progress">
        <AthleteProgressCard athlete={athlete} />
      </CollapsibleSection>
      </div>
      {/* Coming up */}
      <div id="tour-athlete-upcoming">
      <AthleteUpcomingCard athlete={athlete} defaultOpen={false} />
      </div>
      {/* Secondary */}
      <div id="tour-athlete-messages">
      <CollapsibleSection title="Messages">
        <DeskMessageCarousel audience="athlete" surface="home" />
      </CollapsibleSection>
      </div>
      <div id="tour-athlete-activity">
      <AthleteActivityCard athlete={athlete} />
      </div>
      <div className="flex flex-wrap gap-2 px-1">
        <button type="button" onClick={onProgress} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
          Progress
        </button>
        <button type="button" onClick={onVideos} className="rounded-full bg-white/10 px-3 py-1.5 text-sm">
          Videos
        </button>
      </div>
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
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">Stats</p>
        <h3 className="mt-1 font-semibold">Hold & rep analytics</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Longest, averages, totals, and how your training stacks up over time.</p>
        <div className="mt-3">
          <AthleteHoldStats logs={logs} />
        </div>
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
