import { useState } from 'react'
import type { Athlete } from '../../types'
import type { AppTab } from '../../lib/storage'
import { loadAllHomework } from '../../lib/storage'
import { assignRec, daysSinceHomework, homeworkNudgeCopy, practiceRecsFor } from '../../lib/homeworkRecs'

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
  if (recs.length === 0 && (days === null || days < 3)) return null

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
    </section>
  )
}
