import { useEffect, useMemo, useState } from 'react'
import { isCoachProfile, profileRole, roleLabel } from '../../lib/profileRole'
import {
  emptyPlan,
  plansForAthlete,
  sessionsForAthlete,
  sessionsForCoach,
  subscribeLessons,
} from '../../lib/lessonStore'
import type { Athlete, LessonPlan, LessonSession } from '../../types'
import { LessonPlanEditor } from './LessonPlanEditor'
import { LessonReviewList } from './LessonReviewList'

type Props = {
  athletes: Athlete[]
  signedIn: Athlete | null
  onUnlock: (id: string) => void
  onStartLesson: (athleteId: string, planId?: string | null) => void
  onOpenLesson?: (session: LessonSession) => void
}

export function HomeDashboard({
  athletes,
  signedIn,
  onUnlock,
  onStartLesson,
}: Props) {
  const coach = Boolean(signedIn && isCoachProfile(signedIn))
  const [withId, setWithId] = useState<string | null>(null)
  const [editing, setEditing] = useState<LessonPlan | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => subscribeLessons(() => setRefresh((n) => n + 1)), [])

  const roster = useMemo(
    () =>
      athletes.filter((a) => {
        if (!signedIn) return profileRole(a) === 'athlete'
        if (a.id === signedIn.id) return false
        return profileRole(a) !== 'parent'
      }),
    [athletes, signedIn],
  )

  const withAthlete = roster.find((a) => a.id === withId) ?? null
  const plans = withAthlete ? plansForAthlete(withAthlete.id) : []
  const mine = signedIn && !coach ? sessionsForAthlete(signedIn.id) : []
  const myPlans = signedIn && !coach ? plansForAthlete(signedIn.id) : []

  void refresh

  if (!signedIn) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h2 className="text-xl font-semibold">Unlock a profile</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Coaches start a lesson from here. Athletes see their notes, hold times,
          and lesson videos. Open <strong className="text-[var(--text)]">More → Profiles</strong>{' '}
          if you still need to create one.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {athletes.slice(0, 12).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onUnlock(a.id)}
              className="rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-left text-sm hover:border-[var(--accent-dim)]"
            >
              <span className="font-medium">{a.name}</span>
              <span className="text-[var(--muted)]"> · {roleLabel(a)}</span>
            </button>
          ))}
        </div>
        {athletes.length === 0 && (
          <p className="mt-3 text-sm text-[var(--muted)]">No profiles on this gym yet.</p>
        )}
      </section>
    )
  }

  if (!coach) {
    return (
      <div className="mx-auto grid max-w-3xl gap-4">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Today</p>
          <h2 className="text-xl font-semibold">Hi {signedIn.name}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Homework lives under Practice. Lessons your coach ran — notes, hold
            times, and videos — show here. Stretch is under Practice → Warm-up.
          </p>
        </section>
        {myPlans.length > 0 && (
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
            <h3 className="font-semibold">Coming up</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {myPlans.map((p) => (
                <li key={p.id} className="rounded-lg bg-[#121820] px-3 py-2 text-sm">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-[var(--muted)]">{p.blocks.length} blocks</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        <LessonReviewList
          sessions={mine}
          athletes={athletes}
          canEdit={false}
          title="Your lessons"
          emptyText="No lessons saved yet. After a coach ends a lesson, notes and videos show here."
          onChanged={() => setRefresh((n) => n + 1)}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Lesson</p>
        <h2 className="text-xl font-semibold">Who are you with?</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pick the athlete. Then start the lesson or write a plan first. Compare
          saves and hold times land in their folder. They can read the notes on
          their own Today page.
        </p>
        {roster.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            No athletes yet. Add one under More → Profiles.
          </p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {roster.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setWithId(a.id)
                  setEditing(null)
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  withId === a.id
                    ? 'border-[var(--accent)] bg-[#102820]'
                    : 'border-[var(--panel-border)] bg-[#121820] hover:border-[var(--accent-dim)]'
                }`}
              >
                <span className="font-medium">{a.name.trim() || 'Untitled'}</span>
                <span className="block text-xs text-[var(--muted)]">{roleLabel(a)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {withAthlete && !editing && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
          <h3 className="font-semibold">{withAthlete.name}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onStartLesson(withAthlete.id, plans[0]?.id ?? null)}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f]"
            >
              Start lesson
            </button>
            <button
              type="button"
              onClick={() => setEditing(emptyPlan(withAthlete.id, signedIn.id))}
              className="rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm font-semibold text-white"
            >
              Write a plan
            </button>
          </div>
          {plans.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {plans.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#121820] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-[var(--muted)]">{p.blocks.length} blocks</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs text-[var(--muted)] underline"
                      onClick={() => setEditing(p)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-[var(--accent-dim)] px-2.5 py-1 text-xs font-semibold text-white"
                      onClick={() => onStartLesson(withAthlete.id, p.id)}
                    >
                      Use plan
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {withAthlete && editing && (
        <LessonPlanEditor
          plan={editing}
          athleteName={withAthlete.name}
          onSaved={() => {
            setEditing(null)
            setRefresh((n) => n + 1)
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <LessonReviewList
        sessions={sessionsForCoach(signedIn.id)}
        athletes={athletes}
        canEdit
        title="Recent lessons"
        emptyText="When you end a lesson, it lands here — notes, videos, more notes, and homework."
        onChanged={() => setRefresh((n) => n + 1)}
      />
    </div>
  )
}
