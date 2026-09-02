import { useEffect, useMemo, useRef, useState } from 'react'
import { getShape } from '../../config/shapes'
import { formatSeconds, useHoldTimer } from '../../hooks/useHoldTimer'
import { homeworkLooksReady } from '../../lib/homeworkPose'
import { logLessonHoldOnAthleteHomework } from '../../lib/lessonHomework'
import {
  addLessonHold,
  addLessonNote,
  endLessonSession,
  lessonAthleteIds,
} from '../../lib/lessonStore'
import { DEFAULT_FORM_STANDARD } from '../../lib/storage'
import { HoldProperTimes } from '../HoldProperTimes'
import type { Athlete, Landmark, LessonPlan, LessonSession, ScoreResult } from '../../types'
import { CollapsibleSection } from '../CollapsibleSection'
import { VideoLibraryPanel } from '../VideoLibraryPanel'
import { AssignHomeworkBar } from './AssignHomeworkBar'
import { LessonNoteBar } from './LessonNoteBar'
import { lessonScoreShapes } from '../../lib/lessonShapes'
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

function applyTopicToCamera(topic: SkillTopic, onRequestShape: (id: string) => void) {
  const scoreId =
    topic.scoreShapeId ||
    (topic.kind === 'shape' && topic.id ? topic.id : undefined)
  if (scoreId) onRequestShape(scoreId)
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
  score,
  currentShapeId,
  timingActive,
  landmarks,
  onRequestShape,
  onEnsureCamera,
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
  const formStandard = DEFAULT_FORM_STANDARD
  const cameraShapeId =
    holdTopic.scoreShapeId ||
    (holdTopic.kind === 'shape' && holdTopic.id ? holdTopic.id : currentShapeId)
  const inShape = homeworkLooksReady(cameraShapeId, landmarks ?? null, score.overall)
  const hold = useHoldTimer(
    timingActive && inShape && currentShapeId === cameraShapeId,
    score.overall,
    formStandard,
  )

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
    applyTopicToCamera(topic, onRequestShape)
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
        })
      }
      onSessionChange(next)
      if (method === 'manual') resetWatch()
      else hold.reset()
    }
  }

  const grouped = useMemo(() => groupLessonWork(session), [session])
  const scoreShapes = useMemo(() => lessonScoreShapes(), [])
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
          {plan ? plan.title : 'Open lesson'} · start the stopwatch yourself. Pick the body
          position so the live score grades that shape if the camera is on.{' '}
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
        <CollapsibleSection
          title="View lesson plan"
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
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Stopwatch / holds"
        hint={`Start the clock when they go. Logged holds go on ${athleteName}’s homework, marked as a lesson with ${coachName}.`}
      >
        <p className="text-sm text-[var(--muted)]">
          The clock does not wait for the camera. Pick the body position, tap Start
          when they go, Stop when they come down, then log it. If you want live
          analysis, turn the camera on — it grades the shape you selected. Every
          log lands on {athleteName}’s homework as a lesson with {coachName} — not
          on your admin profile.
        </p>
        <div className="mt-3">
          <SkillPicker
            value={holdTopic}
            onChange={(next) => {
              setHoldTopic(next)
              applyTopicToCamera(next, onRequestShape)
            }}
            label="What are you holding"
            compactHolds
            allowSequence={false}
            coachId={session.coachId}
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
        {!holdTopic.label.trim() && (
          <p className="mt-2 text-xs text-[var(--muted)]">Select or type the skill before you log.</p>
        )}
        {holdTopic.label.trim() && (
          <p className="mt-3 text-sm">
            Live score for <strong>{getShape(cameraShapeId)?.name ?? holdTopic.label}</strong>:{' '}
            <strong>{Math.round(score.overall)}</strong>
            <span className="text-[var(--muted)]">
              {timingActive
                ? inShape
                  ? ' · in shape'
                  : ' · camera on, waiting for the position'
                : ' · camera off — stopwatch still works'}
            </span>
          </p>
        )}

        <div className="mt-4 border-t border-[var(--panel-border)] pt-3">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Camera analysis (optional)</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pick any scored shape (arm-position drills are hidden for now).
            Proper time counts at {formStandard}+. The stopwatch above does not
            need this.
          </p>
          <select
            className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            value={
              scoreShapes.some((s) => s.id === cameraShapeId) ? cameraShapeId : ''
            }
            onChange={(e) => {
              const id = e.target.value
              if (!id) return
              const s = scoreShapes.find((x) => x.id === id)
              onRequestShape(id)
              setHoldTopic({
                kind: 'shape',
                id,
                label: s?.name ?? id,
                scoreShapeId: id,
              })
            }}
          >
            <option value="">Score any shape…</option>
            {scoreShapes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm">
            Proper{' '}
            <strong className="text-[var(--good)]">{formatSeconds(hold.qualityHoldSeconds)}</strong>
            <span className="text-[var(--muted)]">
              {' '}
              · scoring {getShape(cameraShapeId)?.name ?? cameraShapeId}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm"
              onClick={() => {
                applyTopicToCamera(holdTopic, onRequestShape)
                void onEnsureCamera?.()
              }}
            >
              Grade this shape
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm"
              onClick={() => {
                applyTopicToCamera(holdTopic, onRequestShape)
                logHold(
                  hold.totalHoldSeconds || watchMs / 1000,
                  'camera',
                  hold.qualityHoldSeconds,
                  score.overall,
                )
              }}
            >
              Save camera hold
            </button>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Notes"
        hint={`File what ${athleteName} should remember, grouped by skill.`}
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Assign homework"
        hint="Add a drill they will see under Practice → Homework."
      >
        <AssignHomeworkBar
          athleteIds={peopleIds}
          coachId={session.coachId}
          hideHeading
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Recap of lessons"
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Video library"
        hint="Lesson clips saved from delay cam and Compare."
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
      </CollapsibleSection>
    </div>
  )
}

