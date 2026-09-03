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
import { EndClassPrompt } from '../today/EndClassPrompt'
import { ChalkboardPanel } from '../today/ChalkboardPanel'
import { TodayCollages } from '../today/TodayCollages'
import { TodayDock } from '../today/TodayDock'
import {
  childAthletes,
  childNamesLabel,
} from '../../lib/parentLink'
import { athletesOfCoach } from '../../lib/coachLink'
import {
  classLabel,
  endClassMeeting,
  getActiveMeeting,
  getOffering,
  hydrateCoachClasses,
  subscribeCoachClasses,
} from '../../lib/coachClasses'
import { ClassRecapList } from '../today/ClassRecapList'
import {
  athleteMatchesQuery,
  listKnownGyms,
  otherGymLabel,
  scopeAthletes,
  trainsAtGym,
  viewerHomeGym,
  withClassGym,
  withEventMembership,
  type GymScope,
} from '../../lib/gymScope'
import {
  getTrainingEvent,
  listTrainingEvents,
  setEventAthletes,
  subscribeTrainingEvents,
  toggleEventAthlete,
} from '../../lib/trainingEvents'
import { GymBadge, gymHint } from '../today/GymBadge'
import { TodayGymScope } from '../today/TodayGymScope'

function coachRecapSessions(coachId: string, athletes: Athlete[]): LessonSession[] {
  const seen = new Set<string>()
  const out: LessonSession[] = []
  const extra = athletesOfCoach(coachId, athletes).flatMap((a) => sessionsForAthlete(a.id))
  for (const session of [...sessionsForCoach(coachId), ...extra]) {
    if (seen.has(session.id)) continue
    seen.add(session.id)
    out.push(session)
  }
  return out
}

type Props = {
  athletes: Athlete[]
  signedIn: Athlete | null
  onUnlock: (id: string) => void
  onStartLesson: (athleteIds: string[], planId?: string | null) => void
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
  const [withIds, setWithIds] = useState<string[]>([])
  const [editing, setEditing] = useState<LessonPlan | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [unlockQuery, setUnlockQuery] = useState('')
  const [unlockGym, setUnlockGym] = useState<string | 'all'>('all')
  const [lessonQuery, setLessonQuery] = useState('')
  const [gymScope, setGymScope] = useState<GymScope>({ kind: 'desk' })
  const [campPickId, setCampPickId] = useState<string | null>(null)
  const [pickHint, setPickHint] = useState(false)
  const [endAsk, setEndAsk] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => subscribeLessons(() => setRefresh((n) => n + 1)), [])
  useEffect(() => subscribeCoachClasses(() => setRefresh((n) => n + 1)), [])
  useEffect(() => {
    void hydrateCoachClasses().then(() => setRefresh((n) => n + 1))
  }, [])
  useEffect(() => subscribeTrainingEvents(() => setRefresh((n) => n + 1)), [])
  const liveClass = coach && signedIn ? getActiveMeeting(signedIn.id) : null
  const liveOffering = liveClass ? getOffering(liveClass.offeringId) : null
  const events = useMemo(() => {
    void refresh
    return listTrainingEvents()
  }, [refresh])
  const knownGyms = useMemo(() => listKnownGyms(athletes), [athletes])
  const viewerGym = viewerHomeGym(signedIn)

  const roster = useMemo(
    () => scopeAthletes(athletes, signedIn, gymScope, events),
    [athletes, signedIn, gymScope, events],
  )

  const filteredUnlock = useMemo(() => {
    const list = [...athletes]
      .filter((a) => athleteMatchesQuery(a, unlockQuery))
      .filter((a) => unlockGym === 'all' || trainsAtGym(a, unlockGym))
      .sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [athletes, unlockQuery, unlockGym])

  const filteredLesson = useMemo(
    () => roster.filter((a) => athleteMatchesQuery(a, lessonQuery)),
    [roster, lessonQuery],
  )

  const eventAddMatches = useMemo(() => {
    if (gymScope.kind !== 'event' || !signedIn) return []
    const onEvent = new Set(roster.map((a) => a.id))
    const q = lessonQuery.trim()
    const fromDesk = scopeAthletes(athletes, signedIn, { kind: 'desk' }, events).filter(
      (a) => !onEvent.has(a.id),
    )
    if (!q) return fromDesk
    return scopeAthletes(athletes, signedIn, { kind: 'all' }, events)
      .filter((a) => !onEvent.has(a.id) && athleteMatchesQuery(a, q))
      .slice(0, 16)
  }, [athletes, signedIn, events, gymScope, lessonQuery, roster])

  const withAthletes = withIds
    .map((id) => athletes.find((a) => a.id === id) ?? null)
    .filter((a): a is Athlete => Boolean(a))
  const withAthlete = withAthletes[0] ?? null
  const plans = withAthlete ? plansForAthlete(withAthlete.id) : []
  const toggleLessonAthlete = (id: string) => {
    setWithIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    setEditing(null)
    setPickHint(false)
  }
  const toggleCampAthlete = (athleteId: string, eventId = gymScope.kind === 'event' ? gymScope.eventId : '') => {
    if (!eventId) return
    const next = toggleEventAthlete(eventId, athleteId)
    if (next && onAthletesChange) {
      const on = next.athleteIds.includes(athleteId)
      onAthletesChange(
        athletes.map((a) => (a.id === athleteId ? withEventMembership(a, eventId, on) : a)),
      )
    }
    setRefresh((n) => n + 1)
  }
  const addToThisGym = (athlete: Athlete) => {
    if (!onAthletesChange) return
    onAthletesChange(athletes.map((a) => (a.id === athlete.id ? withClassGym(a, viewerGym) : a)))
  }
  const addToCamp = (athleteId: string, eventId: string) => {
    const event = getTrainingEvent(eventId)
    if (!event) return
    if (!event.athleteIds.includes(athleteId)) {
      setEventAthletes(eventId, [...event.athleteIds, athleteId])
      onAthletesChange?.(
        athletes.map((a) => (a.id === athleteId ? withEventMembership(a, eventId, true) : a)),
      )
    }
    setCampPickId(null)
    setRefresh((n) => n + 1)
  }
  const lessonFirstNames = withAthletes.map((a) => a.name.split(' ')[0] || a.name)
  const lessonWithLabel =
    lessonFirstNames.length === 0
      ? ''
      : lessonFirstNames.length === 1
        ? `With ${lessonFirstNames[0]}`
        : lessonFirstNames.length === 2
          ? `With ${lessonFirstNames[0]} and ${lessonFirstNames[1]}`
          : `With ${lessonFirstNames[0]} + ${lessonFirstNames.length - 1}`
  const mine = signedIn && !coach ? sessionsForAthlete(signedIn.id) : []
  const myPlans = signedIn && !coach ? plansForAthlete(signedIn.id) : []

  void refresh

  if (!signedIn) {
    return (
      <div className="mx-auto grid max-w-3xl gap-4">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <h2 className="text-xl font-semibold">Unlock a profile</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Tap your name. {athletes.length > 0 ? `${athletes.length} on the network.` : ''} Open{' '}
            <strong className="text-[var(--text)]">More → Profiles</strong> to create one.
          </p>
          {knownGyms.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  unlockGym === 'all'
                    ? 'bg-[var(--accent)] text-[#06281f]'
                    : 'border border-[var(--panel-border)] bg-[#121820]'
                }`}
                onClick={() => setUnlockGym('all')}
              >
                All gyms
              </button>
              {knownGyms.map((gym) => (
                <button
                  key={gym}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    unlockGym === gym
                      ? 'bg-[var(--accent)] text-[#06281f]'
                      : 'border border-[var(--panel-border)] bg-[#121820]'
                  }`}
                  onClick={() => setUnlockGym(gym)}
                >
                  {gym}
                </button>
              ))}
            </div>
          )}
          {athletes.length > 4 && (
            <input
              className="mt-4 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 text-sm"
              placeholder="Search a name or gym"
              value={unlockQuery}
              onChange={(e) => setUnlockQuery(e.target.value)}
            />
          )}
          <div className="mt-4 flex max-h-[min(70vh,36rem)] flex-col gap-2 overflow-y-auto pr-0.5">
            {filteredUnlock.map((a) => (
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
                  {otherGymLabel(a, viewerGym) ? (
                    <span className="mt-0.5 block text-[11px] text-[var(--accent)]">
                      {gymHint(a, viewerGym)}
                    </span>
                  ) : null}
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
          {filteredUnlock.length === 0 && athletes.length > 0 && (
            <p className="mt-3 text-sm text-[var(--muted)]">No names match that search.</p>
          )}
          {athletes.length === 0 && (
            <p className="mt-3 text-sm text-[var(--muted)]">No profiles on the network yet.</p>
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
        {(isCoachProfile(signedIn) || getActiveMeeting()) && (
          <TodayDock
            id="chalk"
            icon="📋"
            eyebrow="Today"
            title="Prepare chalkboard"
            hint="Pin clips and drills. Tap to open."
          >
            <ChalkboardPanel viewer={signedIn} onToday embed />
          </TodayDock>
        )}
        {onShortcut && (
          <TodayDock
            id="collage"
            icon="🎬"
            eyebrow="Class drills"
            title="Collages"
            hint="Play the board. Save it. Keep editing later."
          >
            <TodayCollages viewer={signedIn} onOpenLibrary={() => onShortcut('collages')} embed />
          </TodayDock>
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
          Start lesson is who you are with — one athlete or several. Start class is the hour you are teaching
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
              {liveClass.attendees.length} marked here tonight. End class asks
              whether to write Class nights — it does not log the roster by itself.
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
                onClick={() => setEndAsk(true)}
                className="rounded-lg border border-[var(--bad)] px-4 py-2 text-sm font-semibold text-[var(--bad)]"
              >
                End class
              </button>
            </div>
          </div>
        )}
        {endAsk && liveClass && (
          <EndClassPrompt
            count={liveClass.attendees.length}
            onLog={() => {
              endClassMeeting(liveClass.id, { logAttendance: true })
              setEndAsk(false)
              setRefresh((n) => n + 1)
            }}
            onSkip={() => {
              endClassMeeting(liveClass.id, { logAttendance: false })
              setEndAsk(false)
              setRefresh((n) => n + 1)
            }}
            onStay={() => setEndAsk(false)}
          />
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
              if (withAthletes.length === 0) {
                setPickHint(true)
                pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                return
              }
              onStartLesson(withAthletes.map((a) => a.id), plans[0]?.id ?? null)
            }}
            className="w-full rounded-2xl bg-gradient-to-br from-[#7ad4ff] via-[#3aa8e8] to-[#156a96] px-4 py-4 text-left text-[#042433] shadow-[0_16px_40px_rgba(58,168,232,0.28)]"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
              Lesson
            </span>
            <span className="mt-1 block text-2xl font-bold">Start lesson</span>
            <span className="mt-1 block text-sm font-medium opacity-80">
              {withAthletes.length
                ? lessonWithLabel
                : 'Tap everyone in this lesson, then go'}
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
            {pickHint && withAthletes.length === 0
              ? 'Tap every athlete in this lesson, then Start lesson.'
              : gymScope.kind === 'event'
                ? 'This camp list is separate from Tumble Smart’s main desk. Search to add someone from any gym.'
                : 'Tap one or more athletes. Class roster is separate.'}
          </p>
          <TodayGymScope
            scope={gymScope}
            onScope={setGymScope}
            gyms={knownGyms}
            events={events}
            viewerGym={viewerGym}
            coachId={signedIn.id}
            seedAthleteIds={withIds}
            onEventsChange={() => setRefresh((n) => n + 1)}
            onCreated={(event) => {
              if (!onAthletesChange || event.athleteIds.length === 0) return
              onAthletesChange(
                athletes.map((a) =>
                  event.athleteIds.includes(a.id) ? withEventMembership(a, event.id, true) : a,
                ),
              )
            }}
          />
        {roster.length === 0 && gymScope.kind !== 'event' ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            {gymScope.kind === 'all'
              ? 'No other profiles on the network yet. Add one under More → Profiles.'
              : 'Nobody on this gym desk yet. Search all to find a visiting athlete, or add one under More → Profiles.'}
          </p>
        ) : (
          <>
            <input
              className="mt-3 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 text-sm"
              placeholder={
                gymScope.kind === 'event'
                  ? 'Search this camp, or type a name to add from any gym'
                  : gymScope.kind === 'all'
                    ? 'Search every profile'
                    : 'Search this gym'
              }
              value={lessonQuery}
              onChange={(e) => setLessonQuery(e.target.value)}
            />
            <div className="mt-3 grid max-h-[min(50vh,24rem)] gap-2 overflow-y-auto sm:grid-cols-2">
              {filteredLesson.map((a) => (
                <div
                  key={a.id}
                  className={`flex w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    withIds.includes(a.id)
                      ? 'border-[var(--accent)] bg-[#102820]'
                      : 'border-[var(--panel-border)] bg-[#121820]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleLessonAthlete(a.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <AthleteName athlete={a} nameClassName="font-medium" />
                    <span className="block text-xs text-[var(--muted)]">{roleLabel(a)}</span>
                    <GymBadge athlete={a} viewerGym={viewerGym} className="mt-1" />
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {gymScope.kind === 'event' && (
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-[var(--muted)]"
                        onClick={() => toggleCampAthlete(a.id)}
                      >
                        Remove
                      </button>
                    )}
                    {!trainsAtGym(a, viewerGym) && onAthletesChange && (
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-[var(--accent)]"
                        onClick={() => addToThisGym(a)}
                      >
                        Add to this gym
                      </button>
                    )}
                    {events.length > 0 && gymScope.kind !== 'event' && (
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-[var(--accent)]"
                        onClick={() =>
                          events.length === 1 ? addToCamp(a.id, events[0]!.id) : setCampPickId(a.id)
                        }
                      >
                        Add to camp
                      </button>
                    )}
                    {onViewProfile && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[var(--accent)]"
                        onClick={() => onViewProfile(a.id)}
                      >
                        View
                      </button>
                    )}
                  </div>
                  {campPickId === a.id && events.length > 1 && (
                    <div className="flex w-full flex-wrap gap-1 pt-1">
                      {events.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          className="rounded-full bg-[var(--accent-dim)] px-2 py-1 text-[11px] font-semibold text-white"
                          onClick={() => addToCamp(a.id, event.id)}
                        >
                          {event.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {gymScope.kind === 'event' && eventAddMatches.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {lessonQuery.trim() ? 'Add from the network' : 'Add from this gym'}
                </p>
                {eventAddMatches.map((a) => (
                  <div
                    key={`add-${a.id}`}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <AthleteName athlete={a} nameClassName="font-medium" />
                      <span className="block text-xs text-[var(--muted)]">{gymHint(a, viewerGym)}</span>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-[var(--accent)]"
                      onClick={() => toggleCampAthlete(a.id)}
                    >
                      Add to camp
                    </button>
                  </div>
                ))}
              </div>
            )}
            {filteredLesson.length === 0 && (
              <p className="mt-2 text-sm text-[var(--muted)]">
                {gymScope.kind === 'event'
                  ? lessonQuery.trim()
                    ? 'No network names match that search. Create their profile under More → Profiles or New athlete / shape test, then add them here.'
                    : 'No one on this camp yet. Names from this gym are listed below so you can add them. Search any gym to add a visiting profile.'
                  : 'No names match that search. Try Search all if they train at another gym.'}
              </p>
            )}
            {filteredLesson.length > 0 && (
              <p className="mt-2 text-[11px] text-[var(--muted)]">
                {filteredLesson.length} {filteredLesson.length === 1 ? 'person' : 'people'}
                {gymScope.kind === 'desk' ? ` on ${viewerGym}` : ''}
              </p>
            )}
          </>
        )}
        </div>
      </section>

      {withAthlete && !editing && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
          <h3 className="font-semibold">
            Lesson with{' '}
            {withAthletes.map((a, i) => (
              <span key={a.id}>
                {i > 0 ? i === withAthletes.length - 1 ? ' and ' : ', ' : ''}
                <AthleteName athlete={a} size="md" />
              </span>
            ))}
          </h3>
          {onViewProfile && withAthletes.length === 1 && (
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
              onClick={() => onStartLesson(withAthletes.map((a) => a.id), plans[0]?.id ?? null)}
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
                      onClick={() => onStartLesson(withAthletes.map((a) => a.id), p.id)}
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
        <TodayDock
          id="clock"
          icon="⏱️"
          eyebrow="Class clock"
          title="Holds & stopwatch"
          hint="Time it. Log it. No camera grade."
        >
          <ClassStopwatch athletes={athletes} signedIn={signedIn} coach embed />
        </TodayDock>
      )}

      <TodayDock
        id="chalk"
        icon="📋"
        eyebrow="Today"
        title="Prepare chalkboard"
        hint="Pin clips and drills. Tap to open."
      >
        <ChalkboardPanel viewer={signedIn} onToday embed />
      </TodayDock>
      {onShortcut && (
        <TodayDock
          id="collage"
          icon="🎬"
          eyebrow="Class drills"
          title="Collages"
          hint="Play the board. Save it. Keep editing later."
        >
          <TodayCollages viewer={signedIn} onOpenLibrary={() => onShortcut('collages')} embed />
        </TodayDock>
      )}

      {onShortcut && <TodayShortcuts onGo={onShortcut} showStation />}

      <ClassRecapList
        athletes={athletes}
        viewer={signedIn}
        classInSession={Boolean(liveClass)}
        onAthletesChange={onAthletesChange}
      />

      <LessonReviewList
        sessions={coachRecapSessions(signedIn.id, athletes)}
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
