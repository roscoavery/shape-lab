/**
 * Learn → coach notes. Same reader for tumbling physics, anatomy, and
 * progression / blocks.
 */

import { useEffect, useMemo, useState } from 'react'
import { PHYSICS_LESSONS, type PhysicsLesson } from '../../config/tumblingPhysics'

type Props = {
  onTakeTest?: () => void
  lessons?: PhysicsLesson[]
  heading?: string
  testLabel?: string
}

function groupLessons(lessons: PhysicsLesson[]): { title: string; items: PhysicsLesson[] }[] {
  const groups: { title: string; items: PhysicsLesson[] }[] = []
  for (const lesson of lessons) {
    const title = lesson.section ?? ''
    const last = groups[groups.length - 1]
    if (last && last.title === title) last.items.push(lesson)
    else groups.push({ title, items: [lesson] })
  }
  return groups
}

export function PhysicsLessons({
  onTakeTest,
  lessons = PHYSICS_LESSONS,
  heading = 'Tumbling physics',
  testLabel = 'Physics in tumbling test →',
}: Props) {
  const [openId, setOpenId] = useState<string | null>(lessons[0]?.id ?? null)

  useEffect(() => {
    setOpenId(lessons[0]?.id ?? null)
  }, [lessons])

  const groups = useMemo(() => groupLessons(lessons), [lessons])
  const open = lessons.find((l) => l.id === openId) ?? lessons[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="flex flex-col gap-3">
        {groups.map((group, i) => (
          <div key={group.title || `group-${i}`} className="flex flex-col gap-1">
            {group.title ? (
              <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {group.title}
              </p>
            ) : null}
            {group.items.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                onClick={() => setOpenId(lesson.id)}
                className={`rounded-lg px-3 py-2 text-left text-sm ${
                  open?.id === lesson.id
                    ? 'bg-[var(--accent-dim)] font-semibold text-white'
                    : 'text-[var(--muted)] hover:bg-[#152018] hover:text-[var(--text)]'
                }`}
              >
                {lesson.title}
              </button>
            ))}
          </div>
        ))}
      </nav>
      {open && (
        <article className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {open.section ?? heading}
          </p>
          <h3 className="mt-1 text-xl font-semibold text-[var(--text)]">{open.title}</h3>
          <p className="mt-2 text-sm font-medium text-[var(--text)]">{open.kicker}</p>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--muted)]">
            {open.body.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>
          <p className="mt-4 rounded-lg border border-[var(--panel-border)] bg-[#152018] px-3 py-2 text-sm text-[var(--text)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              In the gym
            </span>
            <span className="mt-1 block">{open.gym}</span>
          </p>
          {onTakeTest && (
            <button
              type="button"
              onClick={onTakeTest}
              className="mt-4 rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-sm font-medium text-white"
            >
              {testLabel}
            </button>
          )}
        </article>
      )}
    </div>
  )
}
