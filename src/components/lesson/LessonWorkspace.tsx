import { useEffect, useMemo, useState } from 'react'
import { mergeExtras } from '../../lib/classExercises'
import { getActiveMeeting, getOffering } from '../../lib/coachClasses'
import {
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
import { logClassSkillForAthlete } from '../../lib/classSessionLog'
import { publishTextPost } from '../../lib/feedPosts'
import { coachShareLabel } from '../../lib/coachShare'
import { CoachHoldEntry } from '../family/CoachHoldEntry'
import { SessionClock } from '../today/SessionClock'
import {
  getOrCreateClassPlan,
  togglePlanTask,
  movePlanTask,
  subscribeClassPlans,
  pullClassPlans,
  todayKey,
} from '../../lib/classPlans'

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
  onSessionChange,
  onEnded,
}: Props) {
  const [tick, setTick] = useState(0)
  const [plansTick, setPlansTick] = useState(0)

  // Planned tasks for this lesson (written in the morning brief or calendar).
  // The plan lives in the class-plan store under lesson:<calendarEventId>.
  const lessonTasks = useMemo(() => {
    void plansTick
    if (!session.calendarEventId || !coach) return []
    const p = getOrCreateClassPlan(todayKey(), `lesson:${session.calendarEventId}`, coach.id)
    return p.tasks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.calendarEventId, coach?.id, plansTick])

  useEffect(() => subscribeClassPlans(() => setPlansTick((n) => n + 1)), [])
  useEffect(() => {
    void pullClassPlans()
  }, [])

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
              {lessonTasks.map((t, i) => (
                <li key={t.id} className="flex items-center gap-1.5 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      if (!session.calendarEventId || !coach) return
                      const p = getOrCreateClassPlan(todayKey(), `lesson:${session.calendarEventId}`, coach.id)
                      togglePlanTask(p.id, t.id)
                    }}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      t.done
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[#06281f]'
                        : 'border-white/30'
                    }`}
                    aria-label={t.done ? 'Mark not done' : 'Mark done'}
                  >
                    {t.done ? '✓' : ''}
                  </button>
                  <span className={`min-w-0 flex-1 ${t.done ? 'line-through opacity-50' : ''}`}>
                    {t.text}
                    {t.repsTarget ? ` (${t.repsDone ?? 0}/${t.repsTarget})` : ''}
                  </span>
                  <span className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (!session.calendarEventId || !coach) return
                        const p = getOrCreateClassPlan(todayKey(), `lesson:${session.calendarEventId}`, coach.id)
                        movePlanTask(p.id, t.id, 'up')
                      }}
                      disabled={i === 0}
                      className="px-1 text-xs text-[var(--muted)] disabled:opacity-20"
                      aria-label="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!session.calendarEventId || !coach) return
                        const p = getOrCreateClassPlan(todayKey(), `lesson:${session.calendarEventId}`, coach.id)
                        movePlanTask(p.id, t.id, 'down')
                      }}
                      disabled={i === lessonTasks.length - 1}
                      className="px-1 text-xs text-[var(--muted)] disabled:opacity-20"
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                  </span>
                </li>
              ))}
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
    </div>
  )
}

