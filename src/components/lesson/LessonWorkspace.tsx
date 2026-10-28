import { useEffect, useMemo, useState } from 'react'
import { mergeExtras } from '../../lib/classExercises'
import { getActiveMeeting, getOffering } from '../../lib/coachClasses'
import {
  addAthleteToLesson,
  addLessonNote,
  endLessonSession,
  getLessonSession,
  lessonAthleteIds,
} from '../../lib/lessonStore'
import { HoldProperTimes } from '../HoldProperTimes'
import type { Athlete, Landmark, LessonPlan, LessonSession, ScoreResult } from '../../types'
import { lessonBlockLabel } from '../../lib/lessonPlan'
import { noteAudienceLabel } from '../../lib/noteAudience'
import { LessonTimesFields } from './LessonTimesFields'
import { TodayDock } from '../today/TodayDock'
import { ChalkboardPanel } from '../today/ChalkboardPanel'
import { VideoLibraryPanel } from '../VideoLibraryPanel'
import { AssignHomeworkBar } from './AssignHomeworkBar'
import { LessonNoteBar } from './LessonNoteBar'
import { rememberTypedHold } from '../../lib/typedHolds'
import { groupLessonWork } from './SkillPicker'
import { loadAllHomework, loadHomeworkLogs } from '../../lib/storage'
import { HomeworkLogList } from '../homework/HomeworkLogList'
import { AthleteProfileCard } from '../AthleteProfileCard'
import { addCoachNotesToAthletes } from '../../lib/athleteNotes'
import { AcroCheckinBoard } from './AcroCheckinBoard'
import { logClassSkillForAthlete } from '../../lib/classSessionLog'
import { publishTextPost } from '../../lib/feedPosts'
import { coachShareLabel } from '../../lib/coachShare'
import { CoachHoldEntry } from '../family/CoachHoldEntry'
import { SessionClock } from '../today/SessionClock'
import {
  getOrCreateClassPlan,
  plansForDate,
  togglePlanTask,
  taskDoneFor,
  taskRepsDoneFor,
  reorderPlanTask,
  subscribeClassPlans,
  pullClassPlans,
  todayKey,
} from '../../lib/classPlans'
import { useDragList, DragGrip } from '../today/useDragList'

type Props = {
  session: LessonSession
  plan: LessonPlan | null
  athlete: Athlete | null
  athleteName: string
  lessonAthletes?: Athlete[]
  coach: Athlete | null
  coachName: string
  athletes: Athlete[]
  onAthletesChange?: (next: Athlete[]) => void
  score: ScoreResult
  currentShapeId: string
  timingActive: boolean
  landmarks?: Landmark[] | null
  onRequestShape: (shapeId: string) => void
  onEnsureCamera?: () => void | Promise<void>
  onGoCompare: () => void
  onCompareItem?: (payload: { src: string; name: string; itemId?: string }) => void
  onOpenSkillPathGuide?: () => void
  onSessionChange: (session: LessonSession) => void
  onEnded: () => void
}

export function LessonWorkspace({
  session,
  plan,
  athlete,
  athleteName,
  lessonAthletes,
  coach,
  coachName,
  athletes,
  onAthletesChange,
  onGoCompare,
  onCompareItem,
  onOpenSkillPathGuide,
  onSessionChange,
  onEnded,
}: Props) {
  const [tick, setTick] = useState(0)
  const [plansTick, setPlansTick] = useState(0)
  const [showAddAthlete, setShowAddAthlete] = useState(false)
  const [addAthleteQuery, setAddAthleteQuery] = useState('')
  const [showCheckinBoard, setShowCheckinBoard] = useState(false)

  // Planned tasks for this lesson (written in the morning brief or calendar).
  // The plan lives in the class-plan store under lesson:<calendarEventId>,
  // keyed by the event's date so a plan written days ahead is still there
  // on lesson day. Falls back to finding today's lesson plans for this
  // athlete if the lesson wasn't started from a calendar event.
  const planDate = useMemo(
    () => (session.calendarStartAt ?? session.startedAt ?? '').slice(0, 10) || todayKey(),
    [session.calendarStartAt, session.startedAt],
  )
  const lessonTasks = useMemo(() => {
    void plansTick
    if (!coach) return []
    const date = planDate
    // Primary: plan linked to the calendar event.
    if (session.calendarEventId) {
      const p = getOrCreateClassPlan(date, `lesson:${session.calendarEventId}`, coach.id)
      if (p.tasks.length > 0) return p.tasks
    }
    // Fallback: find today's lesson plans with tasks for this athlete.
    const athleteIds = new Set<string>()
    if (athlete) athleteIds.add(athlete.id)
    for (const a of lessonAthletes ?? []) athleteIds.add(a.id)
    for (const sid of lessonAthleteIds(session)) athleteIds.add(sid)
    if (athleteIds.size === 0) return []
    const plans = plansForDate(date).filter((p) => p.offeringId.startsWith('lesson:'))
    for (const p of plans) {
      const mine = p.tasks.filter(
        (t) => t.athleteIds.includes('all') || t.athleteIds.some((id) => athleteIds.has(id)),
      )
      if (mine.length > 0) return mine
    }
    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.calendarEventId, session.id, coach?.id, athlete?.id, plansTick, planDate])

  useEffect(() => subscribeClassPlans(() => setPlansTick((n) => n + 1)), [])
  useEffect(() => {
    void pullClassPlans()
  }, [])

  // Find the plan holding these tasks (for toggle/reorder).
  const findTaskPlan = () => {
    if (!coach) return null
    const date = planDate
    if (session.calendarEventId) {
      const p = getOrCreateClassPlan(date, `lesson:${session.calendarEventId}`, coach.id)
      if (p.tasks.length > 0) return p
    }
    const athleteIds = new Set<string>()
    if (athlete) athleteIds.add(athlete.id)
    for (const a of lessonAthletes ?? []) athleteIds.add(a.id)
    for (const sid of lessonAthleteIds(session)) athleteIds.add(sid)
    const plans = plansForDate(date).filter((p) => p.offeringId.startsWith('lesson:'))
    for (const p of plans) {
      if (p.tasks.some((t) => t.athleteIds.includes('all') || t.athleteIds.some((id) => athleteIds.has(id)))) {
        return p
      }
    }
    return null
  }

  const { handleProps, rowStyle } = useDragList((from, to) => {
    const p = findTaskPlan()
    const task = lessonTasks[from]
    if (p && task) reorderPlanTask(p.id, task.id, to)
  })

  const extras = useMemo(() => {
    const meeting = getActiveMeeting()
    const offering = meeting ? getOffering(meeting.offeringId) : null
    return mergeExtras(plan?.extraExercises, offering?.extraExercises)
  }, [plan?.extraExercises, tick])

  const grouped = useMemo(() => groupLessonWork(session), [session])
  const people = lessonAthletes?.length ? lessonAthletes : athlete ? [athlete] : []
  const peopleIds = people.length ? people.map((a) => a.id) : lessonAthleteIds(session)
  const [videoAthleteId, setVideoAthleteId] = useState(peopleIds[0] ?? session.athleteId)
  const [boardAthleteId, setBoardAthleteId] = useState(peopleIds[0] ?? session.athleteId)
  const videoAthlete = people.find((a) => a.id === videoAthleteId) ?? people[0] ?? athlete
  const boardAthlete = people.find((a) => a.id === boardAthleteId) ?? people[0] ?? athlete

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-xl border border-[var(--accent)]/40 bg-[var(--panel)] p-4">
        <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Live lesson</p>
        <h2 className="text-xl font-semibold">
          {athleteName}
          <span className="font-normal text-[var(--muted)]"> with {coachName}</span>
        </h2>
        {(athlete?.needsOnboarding || athlete?.createdFromCalendar) && (
          <div className="mt-2 rounded-lg bg-[#102820] px-3 py-2">
            <p className="text-xs text-[var(--accent)]">
              {athlete.firstName || 'This athlete'} was added from your calendar.
              {!athlete.lastName?.trim() ? (
                <> What is {athlete.firstName || 'their'}'s last name? Tap their profile to add it.</>
              ) : (
                <> Take a minute at the start to finish their profile.</>
              )}
            </p>
          </div>
        )}
        {session.calendarTitle && session.calendarStartAt && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            Calendar · {session.calendarTitle} ·{' '}
            {new Date(session.calendarStartAt).toLocaleString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        )}
        {session.calendarNotes && (
          <div className="mt-2 rounded-lg bg-[#121820] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              From the calendar
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
              {session.calendarNotes}
            </p>
          </div>
        )}
        {lessonTasks.length > 0 && (
          <div className="mt-2 rounded-lg bg-[#121820] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Today's plan
            </p>
            <ul className="mt-1 space-y-1">
              {lessonTasks.map((t, i) => {
                // Done means done for every athlete in this lesson.
                const done =
                  peopleIds.length > 0 ? peopleIds.every((id) => taskDoneFor(t, id)) : false
                const reps = peopleIds.length === 1 ? taskRepsDoneFor(t, peopleIds[0]) : null
                return (
                <li
                  key={t.id}
                  style={rowStyle(i)}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <DragGrip {...handleProps(i)} />
                  <button
                    type="button"
                    onClick={() => {
                      const p = findTaskPlan()
                      if (p) togglePlanTask(p.id, t.id, peopleIds.length > 0 ? peopleIds : undefined)
                    }}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      done
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[#06281f]'
                        : 'border-white/30'
                    }`}
                    aria-label={done ? 'Mark not done' : 'Mark done'}
                  >
                    {done ? '✓' : ''}
                  </button>
                  <span className={`min-w-0 flex-1 ${done ? 'line-through opacity-50' : ''}`}>
                    {t.text}
                    {t.repsTarget
                      ? reps === null
                        ? ` (${t.repsTarget} reps)`
                        : ` (${reps}/${t.repsTarget})`
                      : ''}
                  </span>
                </li>
                )
              })}
            </ul>
          </div>
        )}
        <p className="mt-1 text-sm text-[var(--muted)]">
          {plan ? plan.title : 'Open lesson'} · start the clock, log the hold.{' '}
          Leave the app if you need to, this lesson stays open until you End lesson.
        </p>
        <div className="mt-3">
          <LessonTimesFields session={session} onChange={onSessionChange} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGoCompare}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)]"
          >
            Open Compare
          </button>
          {onOpenSkillPathGuide && (
            <button
              type="button"
              onClick={onOpenSkillPathGuide}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white"
            >
              Skill path guide
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddAthlete((v) => !v)}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white"
          >
            + Add athlete
          </button>
          <button
            type="button"
            onClick={() => setShowCheckinBoard(true)}
            className="rounded-lg border border-[var(--accent)]/50 px-3 py-2 text-sm font-semibold text-[var(--accent)]"
          >
            Check-in board
          </button>
          <button
            type="button"
            onClick={() => {
              endLessonSession(session.id)
              onEnded()
            }}
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
          >
            End lesson
          </button>
        </div>
        {showAddAthlete && (
          <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
            <input
              type="text"
              value={addAthleteQuery}
              onChange={(e) => setAddAthleteQuery(e.target.value)}
              placeholder="Search athletes..."
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40"
            />
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {athletes
                .filter((a) => !lessonAthleteIds(session).includes(a.id))
                .filter((a) =>
                  addAthleteQuery
                    ? a.name.toLowerCase().includes(addAthleteQuery.toLowerCase())
                    : true,
                )
                .slice(0, 20)
                .map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      addAthleteToLesson(session.id, a.id)
                      setShowAddAthlete(false)
                      setAddAthleteQuery('')
                      onSessionChange({ ...session, athleteIds: [...lessonAthleteIds(session), a.id] })
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                  >
                    {a.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </section>

      {plan && (plan.blocks.length > 0 || (plan.extraExercises?.length ?? 0) > 0) && (
        <section className="rounded-xl border border-[var(--accent)]/30 bg-[var(--panel)] p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Today’s plan</p>
          <h3 className="text-lg font-semibold">{plan.title}</h3>
          {plan.blocks.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Clock extras only, {plan.extraExercises?.map((ex) => ex.label).join(', ')}
            </p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2">
              {plan.blocks.map((b, i) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-[#121820] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                      {i + 1}. {lessonBlockLabel(b.kind)}
                      {b.targetSeconds ? ` · ${b.targetSeconds}s` : ''}
                    </p>
                    <p className="text-sm font-medium">{b.title}</p>
                    {b.notes ? <p className="mt-0.5 text-sm text-[var(--text)]">{b.notes}</p> : null}
                  </div>
                  {b.kind === 'hold' && (
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById('lesson-clock')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                      className="rounded-md bg-[var(--accent-dim)] px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      Time this
                    </button>
                  )}
                  {b.kind === 'compare' && (
                    <button
                      type="button"
                      onClick={onGoCompare}
                      className="rounded-md bg-[var(--accent-dim)] px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      Open Compare
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {people.map((person) => (
        <AthleteProfileCard
          key={person.id}
          athlete={person}
          viewer={coach}
          athletes={athletes}
          variant="embed"
          onAthleteChange={
            onAthletesChange
              ? (next) => onAthletesChange(athletes.map((a) => (a.id === next.id ? next : a)))
              : undefined
          }
          onAddNote={
            coach && onAthletesChange
              ? (text, audience) => {
                  onAthletesChange(
                    addCoachNotesToAthletes(athletes, [person.id], {
                      author: coach,
                      text,
                      lessonId: session.id,
                      audience,
                    }),
                  )
                  const next = addLessonNote(session.id, text, 'general', { audience })
                  if (next) onSessionChange(next)
                }
              : undefined
          }
          onAddWin={
            coach
              ? async (text, big) => {
                  logClassSkillForAthlete({ athleteId: person.id, text })
                  await publishTextPost({
                    authorId: person.id,
                    caption: text,
                    taggedIds: [person.id],
                    channels: big ? ['wins', 'gym'] : ['wins'],
                    sharedById: coach.id,
                    sharedByName: coachShareLabel(coach),
                  })
                  if (onAthletesChange) {
                    onAthletesChange(
                      addCoachNotesToAthletes(athletes, [person.id], {
                        author: coach,
                        text: `Win · ${text}`,
                        lessonId: session.id,
                        topicLabel: 'Win',
                      }),
                    )
                  }
                }
              : undefined
          }
        />
      ))}

      <TodayDock
        id="lesson-clock"
        icon="⏱️"
        eyebrow="Class clock"
        title="Holds & stopwatch"
        hint="Time it. Log it. No camera grade."
      >
        <SessionClock
          athletes={athletes}
          present={people}
          signedIn={coach}
          coach
          embedClock
          className={plan?.title}
          lesson={{ lessonId: session.id, coachId: session.coachId, coachName }}
          extras={extras}
          onLessonActivity={() => {
            const next = getLessonSession(session.id)
            if (next) onSessionChange(next)
            setTick((t) => t + 1)
          }}
        />
        <details className="mt-3 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Hold history & homework logs
          </summary>
          <p className="mt-1 text-xs text-[var(--muted)]">
            What {people.length > 1 ? 'these athletes have' : `${athleteName} has`} logged before,
            last times and longest holds live here.
          </p>
          <div className="mt-2 space-y-4">
            {people.map((person) => (
              <div key={person.id}>
                {people.length > 1 && (
                  <p className="mb-1 text-xs font-bold text-white/70">{person.name}</p>
                )}
                <HomeworkLogList
                  logs={loadHomeworkLogs(person.id)}
                  items={loadAllHomework()}
                  athlete={person}
                  viewer={coach}
                  athletes={athletes}
                />
              </div>
            ))}
          </div>
        </details>
        <details className="mt-3 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] p-3">
          <summary className="cursor-pointer text-sm font-semibold">Log an older hold</summary>
          <p className="mt-1 text-xs text-[var(--muted)]">
            From notes or a previous date. One athlete at a time.
          </p>
          {people.map((row) => (
            <div key={row.id} className="mt-2">
              <CoachHoldEntry
                athlete={row}
                viewer={coach}
                lessonId={session.id}
                collapsed
              />
            </div>
          ))}
        </details>
      </TodayDock>

      <TodayDock
        id="lesson-notes"
        icon="📌"
        eyebrow="Lesson"
        title="Notes"
        hint="Athlete-facing or coach-only."
      >
        <p className="text-sm text-[var(--muted)]">
          Pick who can see each note. Athlete notes show on their recap. Coach-only
          stays with you
          {people.length > 1 ? ', notes land on every athlete in this lesson' : ''}.
        </p>
        <div className="mt-3">
          <LessonNoteBar
            coachId={session.coachId}
            onAdd={(text, topic, audience) => {
              if (topic.kind === 'custom') rememberTypedHold(session.coachId, topic.label)
              const next = addLessonNote(session.id, text, 'general', { ...topic, audience })
              if (next) onSessionChange(next)
              if (coach && onAthletesChange) {
                onAthletesChange(
                  addCoachNotesToAthletes(athletes, peopleIds, {
                    author: coach,
                    text,
                    lessonId: session.id,
                    topicLabel: topic.label,
                    audience,
                  }),
                )
              }
            }}
          />
        </div>
      </TodayDock>

      <TodayDock
        id="lesson-hw"
        icon="⭐"
        eyebrow="Lesson"
        title="Assign homework"
        hint="Add a drill they will see under Practice."
      >
        <AssignHomeworkBar
          athleteIds={peopleIds}
          coachId={session.coachId}
          hideHeading
        />
      </TodayDock>

      <TodayDock
        id="lesson-recap"
        icon="📒"
        eyebrow="Lesson"
        title="Recap"
        hint={
          grouped.length === 0
            ? 'Nothing filed yet this lesson'
            : `${grouped.length} skill${grouped.length === 1 ? '' : 's'} with notes or holds`
        }
      >
        {grouped.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nothing filed yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {grouped.map((g) => (
              <div key={g.key} className="rounded-lg bg-[#121820] px-3 py-2">
                <p className="text-sm font-semibold">{g.label}</p>
                {g.holds.map((h) => (
                  <p key={h.id} className="text-sm">
                    <HoldProperTimes
                      total={h.totalHoldSeconds}
                      proper={h.method === 'camera' ? h.properHoldSeconds : null}
                    />
                  </p>
                ))}
                {g.notes.map((n) => (
                  <p key={n.id} className="mt-1 text-sm">
                    <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      {noteAudienceLabel(n)} ·
                    </span>
                    {n.text}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </TodayDock>

      <TodayDock
        id="lesson-chalk"
        icon="📋"
        eyebrow="Lesson"
        title="Athlete chalkboard"
        hint="A board for this person. Switch athletes to pull up a different one."
      >
        <ChalkboardPanel
          viewer={coach}
          athleteId={boardAthlete?.id ?? boardAthleteId}
          athleteName={boardAthlete?.name}
          lessonId={session.id}
          lessonAthletes={people}
          onPickAthlete={setBoardAthleteId}
          embed
          onCompareItem={onCompareItem}
        />
      </TodayDock>

      <TodayDock
        id="lesson-video"
        icon="🎥"
        eyebrow="Lesson"
        title="Video library"
        hint="Clips saved from delay cam and Compare."
      >
        {people.length > 1 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => setVideoAthleteId(person.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  videoAthleteId === person.id
                    ? 'border-[var(--accent)] bg-[#102820] text-[var(--accent)]'
                    : 'border-[var(--panel-border)]'
                }`}
              >
                {person.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
        <VideoLibraryPanel
          athleteId={videoAthlete?.id ?? session.athleteId}
          athleteName={videoAthlete?.name ?? athleteName}
          refreshKey={tick}
          folder="lesson"
          lessonId={session.id}
          embedded
        />
        <button
          type="button"
          className="mt-2 text-left text-xs text-[var(--muted)] underline"
          onClick={() => setTick((n) => n + 1)}
        >
          Refresh videos
        </button>
      </TodayDock>
      {showCheckinBoard && (
        <AcroCheckinBoard
          athletes={athletes}
          sessionAthleteIds={lessonAthleteIds(session)}
          onClose={() => setShowCheckinBoard(false)}
          onAthletesChange={onAthletesChange}
        />
      )}
    </div>
  )
}

