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
import { CollapsibleSection } from '../CollapsibleSection'
import { LessonPlanEditor } from './LessonPlanEditor'
import { LessonReviewList } from './LessonReviewList'
import { TodayShortcuts, type TodayShortcutId } from '../today/TodayShortcuts'
import {
  classLabel,
  endClassMeeting,
  getActiveMeeting,
  getOffering,
  subscribeCoachClasses,
} from '../../lib/coachClasses'

type Props = {
  athletes: Athlete[]
  signedIn: Athlete | null
  onUnlock: (id: string) => void
  onStartLesson: (athleteId: string, planId?: string | null) => void
  onOpenLesson?: (session: LessonSession) => void
  onShortcut?: (id: TodayShortcutId) => void
  onStartClass?: () => void
}

export function HomeDashboard({
  athletes,
  signedIn,
  onUnlock,
  onStartLesson,
  onShortcut,
  onStartClass,
}: Props) {
  const coach = Boolean(signedIn && isCoachProfile(signedIn))
  const [withId, setWithId] = useState<string | null>(null)
  const [editing, setEditing] = useState<LessonPlan | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => subscribeLessons(() => setRefresh((n) => n + 1)), [])
  useEffect(() => subscribeCoachClasses(() => setRefresh((n) => n + 1)), [])
  const liveClass = coach ? getActiveMeeting() : null
  const liveOffering = liveClass ? getOffering(liveClass.offeringId) : null

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
      <div className="mx-auto grid max-w-3xl gap-4">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
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
        {onShortcut && <TodayShortcuts onGo={onShortcut} showStation />}
      </div>
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
            times, and videos — show here.
          </p>
        </section>
        {onShortcut && <TodayShortcuts onGo={onShortcut} showStation={false} />}
        {myPlans.length > 0 && (
          <CollapsibleSection
            title="View lesson plan"
            hint={`${myPlans.length} plan${myPlans.length === 1 ? '' : 's'} on the board`}
          >
            <ul className="flex flex-col gap-2">
              {myPlans.map((p) => (
                <li key={p.id} className="rounded-lg bg-[#121820] px-3 py-2 text-sm">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-[var(--muted)]">{p.blocks.length} blocks</p>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}
        <LessonReviewList
          sessions={mine}
          athletes={athletes}
          canEdit={false}
          title="Recap of lessons"
          emptyText="No lessons saved yet. After a coach ends a lesson, notes and videos show here."
          onChanged={() => setRefresh((n) => n + 1)}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Today</p>
        <h2 className="text-xl font-semibold">Start a lesson or a class</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Start lesson is one athlete. Start class is the hour you are teaching
          — Connections (Monday 5pm) — so shape-test names and homework land on
          that roster.
        </p>
        {onStartClass && liveClass && liveOffering && (
          <div className="mt-3 rounded-2xl border border-[var(--accent)] bg-[#102820] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Class is running
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--text)]">
              {classLabel(liveOffering)}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {liveClass.attendees.length} on tonight&apos;s roster. Close this
              only after you tap End class.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onStartClass}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f]"
              >
                Open running class
              </button>
              <button
                type="button"
                onClick={() => {
                  endClassMeeting(liveClass.id)
                  setRefresh((n) => n + 1)
                  onStartClass()
                }}
                className="rounded-lg border border-[var(--bad)] px-4 py-2 text-sm font-semibold text-[var(--bad)]"
              >
                End class
              </button>
            </div>
          </div>
        )}
        {onStartClass && !liveClass && (
          <button
            type="button"
            onClick={onStartClass}
            className="mt-3 w-full rounded-2xl bg-gradient-to-br from-[#5cf0c8] via-[#2dd4a8] to-[#147a62] px-4 py-4 text-left text-[#06281f] shadow-[0_16px_40px_rgba(45,212,168,0.28)]"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
              Floor
            </span>
            <span className="mt-1 block text-2xl font-bold">Start class</span>
            <span className="mt-1 block text-sm font-medium opacity-80">
              Pick the class you teach tonight. Only that class roster gets
              homework — not every name on the gym.
            </span>
          </button>
        )}
        <h3 className="mt-5 text-lg font-semibold">Start lesson · who are you with?</h3>
        {roster.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            No athletes yet. Add one under More → Profiles.
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
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

      {onShortcut && <TodayShortcuts onGo={onShortcut} showStation />}

      <LessonReviewList
        sessions={sessionsForCoach(signedIn.id)}
        athletes={athletes}
        canEdit
        title="Recap of lessons"
        emptyText="When you end a lesson, it lands here — notes, videos, more notes, and homework."
        onChanged={() => setRefresh((n) => n + 1)}
      />
    </div>
  )
}
