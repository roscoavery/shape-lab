import { useEffect, useMemo, useRef, useState } from 'react'
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
import { PracticeNudge } from '../today/PracticeNudge'
import { AthleteName } from '../AthleteAvatar'
import { ClassStopwatch } from '../today/ClassStopwatch'
import { ChalkboardPanel } from '../today/ChalkboardPanel'
import { TodayCollages } from '../today/TodayCollages'
import {
  childAthletes,
  childNamesLabel,
} from '../../lib/parentLink'
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
  onOpenProfile?: () => void
  onViewProfile?: (id: string) => void
  onAthletesChange?: (next: Athlete[]) => void
  onParentHomework?: (athleteId: string) => void
}

export function HomeDashboard({
  athletes,
  signedIn,
  onUnlock,
  onStartLesson,
  onShortcut,
  onStartClass,
  onOpenProfile,
  onViewProfile,
  onAthletesChange,
  onParentHomework,
}: Props) {
  const coach = Boolean(signedIn && isCoachProfile(signedIn))
  const [withId, setWithId] = useState<string | null>(null)
  const [editing, setEditing] = useState<LessonPlan | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [unlockQuery, setUnlockQuery] = useState('')
  const [unlockMore, setUnlockMore] = useState(false)
  const [lessonQuery, setLessonQuery] = useState('')
  const [lessonMore, setLessonMore] = useState(false)
  const [pickHint, setPickHint] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

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

  const filteredUnlock = useMemo(() => {
    const q = unlockQuery.trim().toLowerCase()
    if (!q) return athletes
    return athletes.filter((a) => a.name.toLowerCase().includes(q))
  }, [athletes, unlockQuery])
  const visibleUnlock = unlockMore ? filteredUnlock : filteredUnlock.slice(0, 6)

  const filteredLesson = useMemo(() => {
    const q = lessonQuery.trim().toLowerCase()
    if (!q) return roster
    return roster.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        roleLabel(a).toLowerCase().includes(q),
    )
  }, [roster, lessonQuery])
  const visibleLesson = lessonMore ? filteredLesson : filteredLesson.slice(0, 6)

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
          {athletes.length > 6 && (
            <input
              className="mt-4 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 text-sm"
              placeholder="Search a name"
              value={unlockQuery}
              onChange={(e) => setUnlockQuery(e.target.value)}
            />
          )}
          <div className="mt-4 flex flex-col gap-2">
            {visibleUnlock.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  onClick={() => onUnlock(a.id)}
                  className="min-w-0 flex-1 text-left hover:text-[var(--accent)]"
                >
                  <AthleteName athlete={a} />
                  <span className="text-[var(--muted)]"> · {roleLabel(a)}</span>
                </button>
                {onViewProfile && (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-[var(--accent)]"
                    onClick={() => onViewProfile(a.id)}
                  >
                    View
                  </button>
                )}
              </div>
            ))}
          </div>
          {filteredUnlock.length > 6 && (
            <button
              type="button"
              onClick={() => setUnlockMore((v) => !v)}
              className="mt-2 text-sm font-semibold text-[var(--accent)]"
            >
              {unlockMore ? 'Show less' : `Show ${filteredUnlock.length - 6} more`}
            </button>
          )}
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
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold">
            <AthleteName athlete={signedIn} size="md" />
          </h2>
          {profileRole(signedIn) === 'parent' ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              {childAthletes(signedIn, athletes).length
                ? `You are linked as parent of ${childNamesLabel(signedIn, athletes)}. Wins, homework, and lessons for those athletes show here.`
                : 'Select who your athlete is on Profiles so coaches know you are their parent, and so you can see their wins, homework, and activity.'}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Homework lives under Practice. Lessons your coach ran — notes, hold
              times, and videos — show here.
            </p>
          )}
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="mt-3 rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm font-semibold text-white"
            >
              My profile
            </button>
          )}
        </section>
        {profileRole(signedIn) === 'parent' && childAthletes(signedIn, athletes).length > 0 && (
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Your athletes
            </p>
            <ul className="mt-3 space-y-2">
              {childAthletes(signedIn, athletes).map((kid) => (
                <li
                  key={kid.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#121820] px-3 py-2"
                >
                  <AthleteName athlete={kid} nameClassName="font-semibold" />
                  <span className="flex gap-2">
                    {onViewProfile && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[var(--accent)]"
                        onClick={() => onViewProfile(kid.id)}
                      >
                        Wins & profile
                      </button>
                    )}
                    {onParentHomework && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[var(--accent)]"
                        onClick={() => onParentHomework(kid.id)}
                      >
                        Homework
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ChalkboardPanel viewer={signedIn} onToday />
        {onShortcut && (
          <TodayCollages viewer={signedIn} onOpenLibrary={() => onShortcut('collages')} />
        )}
        {onShortcut && profileRole(signedIn) !== 'parent' && (
          <PracticeNudge
            athlete={signedIn}
            onTrain={() => onShortcut('homework')}
            onReview={() => onShortcut('library')}
          />
        )}
        {onShortcut && <TodayShortcuts onGo={onShortcut} showStation={false} />}
        {myPlans.length > 0 && profileRole(signedIn) !== 'parent' && (
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
          sessions={
            profileRole(signedIn) === 'parent'
              ? childAthletes(signedIn, athletes).flatMap((k) => sessionsForAthlete(k.id))
              : mine
          }
          athletes={athletes}
          viewer={signedIn}
          canEdit={false}
          title={profileRole(signedIn) === 'parent' ? 'Their lessons' : 'Recap of lessons'}
          emptyText={
            profileRole(signedIn) === 'parent'
              ? 'When a coach ends a lesson with your athlete, notes and videos show here.'
              : 'No lessons saved yet. After a coach ends a lesson, notes and videos show here.'
          }
          onChanged={() => setRefresh((n) => n + 1)}
          onViewProfile={onViewProfile}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Today</p>
            <h2 className="text-xl font-semibold">Start a lesson or a class</h2>
          </div>
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm font-semibold"
            >
              My profile
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Start lesson is one athlete. Start class is the hour you are teaching
          — Connections, Elevate, or Reps w/ Logan — so shape-test names and
          homework land on that roster. The chalkboard for that class opens on
          this page without taking it over.
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
        <div className={`mt-3 grid gap-2 ${onStartClass && !liveClass ? 'sm:grid-cols-2' : ''}`}>
          {onStartClass && !liveClass && (
            <button
              type="button"
              onClick={onStartClass}
              className="w-full rounded-2xl bg-gradient-to-br from-[#5cf0c8] via-[#2dd4a8] to-[#147a62] px-4 py-4 text-left text-[#06281f] shadow-[0_16px_40px_rgba(45,212,168,0.28)]"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
                Floor
              </span>
              <span className="mt-1 block text-2xl font-bold">Start class</span>
              <span className="mt-1 block text-sm font-medium opacity-80">
                Pick tonight’s class. Homework goes to that roster.
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!withAthlete) {
                setPickHint(true)
                setLessonMore(true)
                pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                return
              }
              onStartLesson(withAthlete.id, plans[0]?.id ?? null)
            }}
            className="w-full rounded-2xl bg-gradient-to-br from-[#7ad4ff] via-[#3aa8e8] to-[#156a96] px-4 py-4 text-left text-[#042433] shadow-[0_16px_40px_rgba(58,168,232,0.28)]"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
              1:1
            </span>
            <span className="mt-1 block text-2xl font-bold">Start lesson</span>
            <span className="mt-1 block text-sm font-medium opacity-80">
              {withAthlete
                ? `With ${withAthlete.name.split(' ')[0]}`
                : 'Pick who you are with, then go'}
            </span>
          </button>
        </div>
        <div
          ref={pickerRef}
          className={`mt-5 rounded-xl p-1 transition-shadow ${
            pickHint && !withAthlete
              ? 'shadow-[0_0_0_2px_var(--accent)]'
              : ''
          }`}
        >
          <h3 className="text-lg font-semibold">Who are you with?</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {pickHint && !withAthlete
              ? 'Tap an athlete, then Start lesson.'
              : 'Pick the athlete for a 1:1. Class roster is separate.'}
          </p>
        {roster.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            No athletes yet. Add one under More → Profiles.
          </p>
        ) : (
          <>
            <input
              className="mt-3 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 text-sm"
              placeholder="Search an athlete"
              value={lessonQuery}
              onChange={(e) => setLessonQuery(e.target.value)}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {visibleLesson.map((a) => (
                <div
                  key={a.id}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    withId === a.id
                      ? 'border-[var(--accent)] bg-[#102820]'
                      : 'border-[var(--panel-border)] bg-[#121820]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setWithId(a.id)
                      setEditing(null)
                      setPickHint(false)
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <AthleteName athlete={a} nameClassName="font-medium" />
                    <span className="block text-xs text-[var(--muted)]">{roleLabel(a)}</span>
                  </button>
                  {onViewProfile && (
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-[var(--accent)]"
                      onClick={() => onViewProfile(a.id)}
                    >
                      View
                    </button>
                  )}
                </div>
              ))}
            </div>
            {filteredLesson.length === 0 && (
              <p className="mt-2 text-sm text-[var(--muted)]">No names match that search.</p>
            )}
            {filteredLesson.length > 6 && (
              <button
                type="button"
                onClick={() => setLessonMore((v) => !v)}
                className="mt-2 text-sm font-semibold text-[var(--accent)]"
              >
                {lessonMore ? 'Show less' : `Show ${filteredLesson.length - 6} more`}
              </button>
            )}
          </>
        )}
        </div>
      </section>

      {withAthlete && !editing && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
          <h3 className="font-semibold">
            Lesson with <AthleteName athlete={withAthlete} size="md" />
          </h3>
          {onViewProfile && (
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-[var(--accent)] underline"
              onClick={() => onViewProfile(withAthlete.id)}
            >
              View profile
            </button>
          )}
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

      {coach && (
        <ClassStopwatch athletes={athletes} signedIn={signedIn} coach />
      )}

      <ChalkboardPanel viewer={signedIn} onToday />
      {onShortcut && (
        <TodayCollages viewer={signedIn} onOpenLibrary={() => onShortcut('collages')} />
      )}

      {onShortcut && <TodayShortcuts onGo={onShortcut} showStation />}

      <LessonReviewList
        sessions={sessionsForCoach(signedIn.id)}
        athletes={athletes}
        viewer={signedIn}
        canEdit
        title="Recap of lessons"
        emptyText="When you end a lesson, it lands here — notes, videos, more notes, and homework."
        onChanged={() => setRefresh((n) => n + 1)}
        onAthletesChange={onAthletesChange}
        onViewProfile={onViewProfile}
      />
    </div>
  )
}
