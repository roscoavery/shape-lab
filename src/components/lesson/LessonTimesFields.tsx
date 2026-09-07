import { fromDatetimeLocal, lessonDisplayEnd, lessonDisplayStart, toDatetimeLocal } from '../../lib/lessonPlan'
import { saveLessonTimes } from '../../lib/lessonStore'
import type { LessonSession } from '../../types'

type Props = {
  session: LessonSession
  onChange?: (session: LessonSession) => void
}

export function LessonTimesFields({ session, onChange }: Props) {
  const start = toDatetimeLocal(lessonDisplayStart(session))
  const end = toDatetimeLocal(lessonDisplayEnd(session))
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="block text-xs uppercase tracking-wider text-[var(--muted)]">
        Lesson start
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => {
            const next = saveLessonTimes(session.id, {
              coachStartedAt: fromDatetimeLocal(e.target.value),
            })
            if (next) onChange?.(next)
          }}
          className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
        />
      </label>
      <label className="block text-xs uppercase tracking-wider text-[var(--muted)]">
        Lesson end
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => {
            const next = saveLessonTimes(session.id, {
              coachEndedAt: fromDatetimeLocal(e.target.value),
            })
            if (next) onChange?.(next)
          }}
          className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
        />
      </label>
    </div>
  )
}
