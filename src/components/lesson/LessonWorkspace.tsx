import { useEffect, useMemo, useRef, useState } from 'react'
import { getShape } from '../../config/shapes'
import { formatSeconds } from '../../hooks/useHoldTimer'
import { logLessonHoldOnAthleteHomework, logLessonRepsOnAthleteHomework } from '../../lib/lessonHomework'
import { makeClassExtra, mergeExtras } from '../../lib/classExercises'
import { getActiveMeeting, getOffering } from '../../lib/coachClasses'
import {
  addLessonHold,
  addLessonNote,
  endLessonSession,
  lessonAthleteIds,
} from '../../lib/lessonStore'
import { HoldProperTimes } from '../HoldProperTimes'
import type { Athlete, Landmark, LessonPlan, LessonSession, ScoreResult } from '../../types'
import { TodayDock } from '../today/TodayDock'
import { VideoLibraryPanel } from '../VideoLibraryPanel'
import { AssignHomeworkBar } from './AssignHomeworkBar'
import { LessonNoteBar } from './LessonNoteBar'
import { rememberTypedHold } from '../../lib/typedHolds'
import { SkillPicker, emptySkillTopic, groupLessonWork, type SkillTopic } from './SkillPicker'
import { AthleteProfileCard } from '../AthleteProfileCard'
import { addCoachNotesToAthletes } from '../../lib/athleteNotes'
import { logClassSkillForAthlete } from '../../lib/classSessionLog'
import { publishTextPost } from '../../lib/feedPosts'
import { coachShareLabel } from '../../lib/coachShare'

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
  const [holdTopic, setHoldTopic] = useState<SkillTopic>(() => {
    const first = plan?.blocks.find((b) => b.kind === 'hold')
    if (first?.shapeId) {
      return {
        kind: 'shape',
        id: first.shapeId,
        label: first.title || getShape(first.shapeId)?.name || first.shapeId,
      }
    }
    return emptySkillTopic()
  })
  const [tick, setTick] = useState(0)
  const [watchRunning, setWatchRunning] = useState(false)
  const [watchMs, setWatchMs] = useState(0)
  const watchStartRef = useRef<number | null>(null)
  const watchAccRef = useRef(0)
  useEffect(() => {
    if (!watchRunning) return
    const id = window.setInterval(() => {
      const start = watchStartRef.current
      if (start == null) return
      setWatchMs(watchAccRef.current + (performance.now() - start))
    }, 80)
    return () => window.clearInterval(id)
  }, [watchRunning])

  const startWatch = () => {
    watchStartRef.current = performance.now()
    setWatchRunning(true)
  }

  const stopWatch = () => {
    const start = watchStartRef.current
    if (start != null) watchAccRef.current += performance.now() - start
    watchStartRef.current = null
    setWatchRunning(false)
    setWatchMs(watchAccRef.current)
  }

  const resetWatch = () => {
    watchStartRef.current = watchRunning ? performance.now() : null
    watchAccRef.current = 0
    setWatchMs(0)
  }

  const pickHold = (topic: SkillTopic) => {
    setHoldTopic(topic)
  }

  const logHold = (seconds: number, method: 'camera' | 'manual', proper = 0, scoreValue = 0) => {
    const label = holdTopic.label.trim()
    if (!label) return
    const next = addLessonHold(session.id, {
      shapeId: holdTopic.id || `custom:${label.toLowerCase()}`,
      shapeName: label,
      totalHoldSeconds: Number(seconds.toFixed(1)),
      properHoldSeconds: Number(proper.toFixed(1)),
      score: scoreValue,
      method,
      topicKind: holdTopic.kind,
      ...(holdTopic.side ? { side: holdTopic.side } : {}),
    })
    if (next) {
      if (holdTopic.kind === 'custom') rememberTypedHold(session.coachId, label)
      for (const id of peopleIds) {
        logLessonHoldOnAthleteHomework({
          athleteId: id,
          coachId: session.coachId,
          coachName,
          lessonId: session.id,
          shapeId: holdTopic.id || `custom:${label.toLowerCase()}`,
          shapeName: label,
          totalHoldSeconds: Number(seconds.toFixed(1)),
          properHoldSeconds: Number(proper.toFixed(1)),
          score: scoreValue,
          method,
          ...(holdTopic.side ? { side: holdTopic.side } : {}),
        })
      }
      onSessionChange(next)
      if (method === 'manual') resetWatch()
    }
  }

  const [repCounts, setRepCounts] = useState<Record<string, string>>({})
  const [repFlash, setRepFlash] = useState<string | null>(null)
  const [otherName, setOtherName] = useState('')
  const [otherReps, setOtherReps] = useState('')
  const [otherSets, setOtherSets] = useState('1')
  const extras = useMemo(() => {
    const meeting = getActiveMeeting()
    const offering = meeting ? getOffering(meeting.offeringId) : null
    return mergeExtras(plan?.extraExercises, offering?.extraExercises)
  }, [plan?.extraExercises, tick])
  const extraHolds = extras.filter((ex) => ex.trackMode === 'hold')
  const extraReps = extras.filter((ex) => ex.trackMode === 'reps')

  const grouped = useMemo(() => groupLessonWork(session), [session])
  const people = lessonAthletes?.length ? lessonAthletes : athlete ? [athlete] : []
  const peopleIds = people.length ? people.map((a) => a.id) : lessonAthleteIds(session)
  const [videoAthleteId, setVideoAthleteId] = useState(peopleIds[0] ?? session.athleteId)
  const videoAthlete = people.find((a) => a.id === videoAthleteId) ?? people[0] ?? athlete

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-xl border border-[var(--accent)]/40 bg-[var(--panel)] p-4">
        <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Live lesson</p>
        <h2 className="text-xl font-semibold">
          {athleteName}
          <span className="font-normal text-[var(--muted)]"> with {coachName}</span>
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {plan ? plan.title : 'Open lesson'} · start the clock, log the hold.{' '}
          {athleteName} {people.length > 1 ? 'see' : 'sees'} notes grouped by skill after you end.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGoCompare}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
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
              ? (text) => {
                  onAthletesChange(
                    addCoachNotesToAthletes(athletes, [person.id], {
                      author: coach,
                      text,
                      lessonId: session.id,
                    }),
                  )
                  const next = addLessonNote(session.id, text, 'general')
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

      {plan && plan.blocks.length > 0 && (
        <TodayDock
          id="lesson-plan"
          icon="📝"
          eyebrow="Lesson"
          title="Lesson plan"
          hint={`${plan.blocks.length} block${plan.blocks.length === 1 ? '' : 's'} · ${plan.title}`}
        >
          <ol className="flex flex-col gap-2">
            {plan.blocks.map((b, i) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#121820] px-3 py-2"
              >
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                    {i + 1}. {b.kind}
                  </p>
                  <p className="text-sm font-medium">{b.title}</p>
                  {b.notes && <p className="text-xs text-[var(--muted)]">{b.notes}</p>}
                </div>
                {b.kind === 'hold' && (
                  <button
                    type="button"
                    onClick={() =>
                      pickHold({
                        kind: b.shapeId ? 'shape' : 'custom',
                        id: b.shapeId,
                        label: b.title,
                      })
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
        </TodayDock>
      )}

      <TodayDock
        id="lesson-clock"
        icon="⏱️"
        eyebrow="Class clock"
        title="Holds & stopwatch"
        hint="Time it. Log it. No camera grade."
      >
        <p className="text-sm text-white/55">
          Pick the hold, Start, Stop, Log. It lands on {athleteName}’s homework as
          a lesson with {coachName}.
        </p>
        <div className="mt-3">
          <SkillPicker
            value={holdTopic}
            onChange={setHoldTopic}
            label="What are you holding"
            compactHolds
            allowSequence={false}
            coachId={session.coachId}
            extraHolds={extraHolds}
          />
        </div>
        <p className="mt-3 text-4xl font-black tabular-nums tracking-tight">
          {formatSeconds(watchMs / 1000)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {!watchRunning ? (
            <button
              type="button"
              onClick={startWatch}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f]"
            >
              Start
            </button>
          ) : (
            <button
              type="button"
              onClick={stopWatch}
              className="rounded-lg bg-[var(--warn)] px-4 py-2 text-sm font-semibold text-[#2a1c00]"
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={resetWatch}
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={!holdTopic.label.trim() || watchMs < 200}
            onClick={() => logHold(watchMs / 1000, 'manual')}
            className="rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Log this time
          </button>
        </div>
        <div className="mt-4 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] p-3">
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Also count reps / sets</p>
            {repFlash && (
              <p className="mt-1 text-sm font-semibold text-[var(--accent)]">{repFlash}</p>
            )}
            <ul className="mt-2 flex flex-col gap-2">
              {extraReps.map((ex) => (
                <li key={ex.id} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-[7rem] text-sm font-semibold">{ex.label}</span>
                  <input
                    inputMode="numeric"
                    value={repCounts[ex.id] ?? ''}
                    onChange={(e) =>
                      setRepCounts((prev) => ({ ...prev, [ex.id]: e.target.value }))
                    }
                    placeholder="Reps"
                    className="h-10 w-20 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
                  />
                  <button
                    type="button"
                    className="rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => {
                      const n = Number(repCounts[ex.id])
                      if (!Number.isFinite(n) || n <= 0) {
                        setRepFlash(`Type how many ${ex.label} they did.`)
                        return
                      }
                      let logged = 0
                      for (const id of peopleIds) {
                        const row = logLessonRepsOnAthleteHomework({
                          athleteId: id,
                          coachId: session.coachId,
                          coachName,
                          lessonId: session.id,
                          extra: ex,
                          reps: n,
                        })
                        if (row) logged += 1
                      }
                      setTick((t) => t + 1)
                      setRepFlash(
                        `Logged ${n} ${ex.label} for ${logged} athlete${logged === 1 ? '' : 's'}.`,
                      )
                    }}
                  >
                    Log for {athleteName}
                  </button>
                </li>
              ))}
              <li className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2">
                <input
                  className="h-10 min-w-[8rem] flex-1 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
                  placeholder="Other exercise"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                />
                <input
                  inputMode="numeric"
                  value={otherSets}
                  onChange={(e) => setOtherSets(e.target.value)}
                  placeholder="Sets"
                  className="h-10 w-16 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
                />
                <input
                  inputMode="numeric"
                  value={otherReps}
                  onChange={(e) => setOtherReps(e.target.value)}
                  placeholder="Reps"
                  className="h-10 w-16 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
                />
                <button
                  type="button"
                  className="rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => {
                    const label = otherName.trim()
                    const n = Number(otherReps)
                    if (!label) {
                      setRepFlash('Type the exercise they just did.')
                      return
                    }
                    if (!Number.isFinite(n) || n <= 0) {
                      setRepFlash(`Type how many ${label} they did.`)
                      return
                    }
                    const extra = makeClassExtra({ kind: 'custom', label, trackMode: 'reps' })
                    if (!extra) return
                    const nSets = Number(otherSets)
                    let logged = 0
                    for (const id of peopleIds) {
                      const row = logLessonRepsOnAthleteHomework({
                        athleteId: id,
                        coachId: session.coachId,
                        coachName,
                        lessonId: session.id,
                        extra,
                        reps: n,
                        sets: Number.isFinite(nSets) && nSets > 1 ? nSets : undefined,
                      })
                      if (row) logged += 1
                    }
                    setTick((t) => t + 1)
                    setOtherName('')
                    setRepFlash(
                      `Logged ${Number(otherSets) > 1 ? `${otherSets}×` : ''}${n} ${label} for ${logged} athlete${logged === 1 ? '' : 's'}.`,
                    )
                  }}
                >
                  Log other
                </button>
              </li>
            </ul>
          </div>
        {!holdTopic.label.trim() && (
          <p className="mt-2 text-xs text-[var(--muted)]">Select or type the skill before you log.</p>
        )}
      </TodayDock>

      <TodayDock
        id="lesson-notes"
        icon="📌"
        eyebrow="Lesson"
        title="Notes"
        hint={`What ${athleteName} should remember.`}
      >
        <p className="text-sm text-[var(--muted)]">
          One note per thought is fine. File each on the shape or sequence so{' '}
          {people.length > 1 ? 'they' : athleteName} can find “remember this” next to that
          skill
          {people.length > 1 ? ' — notes land on every athlete in this lesson' : ''}.
        </p>
        <div className="mt-3">
          <LessonNoteBar
            preset={holdTopic.label.trim() ? holdTopic : undefined}
            coachId={session.coachId}
            onAdd={(text, topic) => {
              if (topic.kind === 'custom') rememberTypedHold(session.coachId, topic.label)
              const next = addLessonNote(session.id, text, 'general', topic)
              if (next) onSessionChange(next)
              if (coach && onAthletesChange) {
                onAthletesChange(
                  addCoachNotesToAthletes(athletes, peopleIds, {
                    author: coach,
                    text,
                    lessonId: session.id,
                    topicLabel: topic.label,
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
                    {n.text}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
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

