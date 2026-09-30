import { useState } from 'react'
import type { Athlete } from '../../types'
import type { AppTab } from '../../lib/storage'
import { loadAllHomework } from '../../lib/storage'
import { assignRec, daysSinceHomework, formatHoldSeconds, holdBenchmarksFor, homeworkNudgeCopy, practiceRecsFor } from '../../lib/homeworkRecs'

type Props = {
  athlete: Athlete
  onTrain: (tab: AppTab) => void
  onReview: () => void
}

export function PracticeNudge({ athlete, onTrain, onReview }: Props) {
  const [tick, setTick] = useState(0)
  const homework = loadAllHomework().filter((h) => h.athleteId === athlete.id)
  void tick
  const recs = practiceRecsFor(athlete, homework).slice(0, 3)
  const days = daysSinceHomework(athlete.id)
  const unmetHolds = holdBenchmarksFor(athlete.id).filter((b) => !b.met)
  const showHoldNudge = unmetHolds.length > 0 && days !== null && days >= 3
  if (recs.length === 0 && (days === null || days < 3) && !showHoldNudge) return null

  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        For you
      </p>
      {days !== null && days >= 3 && (
        <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{homeworkNudgeCopy(athlete)}</p>
      )}
      <ul className="mt-3 space-y-2">
        {recs.map((rec) => (
          <li key={rec.id} className="rounded-xl bg-[#0d1218] px-3 py-3">
            <p className="text-sm font-semibold">{rec.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{rec.why}</p>
            <button
              type="button"
              onClick={() => {
                if (rec.action === 'review') {
                  onReview()
                  return
                }
                assignRec(athlete.id, rec)
                setTick((n) => n + 1)
                onTrain('homework')
              }}
              className="mt-2 text-xs font-bold text-[var(--accent)]"
            >
              {rec.action === 'review' ? 'Review shapes' : 'Train'}
            </button>
          </li>
        ))}
      </ul>
      {showHoldNudge && (
        <div className="mt-3 rounded-xl bg-[#0d1218] px-3 py-3">
          <p className="text-sm font-semibold">Your holds</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Three times a week keeps you on track.
          </p>
          <ul className="mt-2 space-y-1.5">
            {unmetHolds.map((b) => (
              <li key={b.autoKey} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium text-[var(--text)]">{b.label}</span>
                <span className="text-[var(--muted)]">
                  best {formatHoldSeconds(b.bestSeconds)} · goal {formatHoldSeconds(b.targetSeconds)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
            Doesn&apos;t have to be all or nothing. Even if you just pick one, that goes a lot further than nothing at all. Little deposits over time compound into a stronger tumbling foundation.
          </p>
          <button
            type="button"
            onClick={() => onTrain('homework')}
            className="mt-2 text-xs font-bold text-[var(--accent)]"
          >
            Train
          </button>
        </div>
      )}
    </section>
  )
}
