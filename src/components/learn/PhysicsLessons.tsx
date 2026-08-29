/**
 * Learn → Tumbling physics. Coach-facing, gym applications only.
 */

import { useState } from 'react'
import { PHYSICS_LESSONS } from '../../config/tumblingPhysics'

export function PhysicsLessons() {
  const [openId, setOpenId] = useState<string | null>(PHYSICS_LESSONS[0]?.id ?? null)
  const open = PHYSICS_LESSONS.find((l) => l.id === openId) ?? PHYSICS_LESSONS[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="flex flex-col gap-1">
        {PHYSICS_LESSONS.map((lesson) => (
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
      </nav>
      {open && (
        <article className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Tumbling physics
          </p>
          <h3 className="mt-1 text-xl font-semibold text-[var(--text)]">{open.title}</h3>
          <p className="mt-2 text-sm font-medium text-[var(--text)]">{open.kicker}</p>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--muted)]">
            {open.body.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <p className="mt-4 rounded-lg border border-[var(--panel-border)] bg-[#152018] px-3 py-2 text-sm text-[var(--text)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              In the gym
            </span>
            <span className="mt-1 block">{open.gym}</span>
          </p>
        </article>
      )}
    </div>
  )
}
