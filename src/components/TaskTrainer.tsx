/**
 * TaskTrainer — curriculum pathway UI for a selected athlete.
 *
 * Talks through hits, close/almost, and the next shape; auto-continues the
 * pathway so the athlete does not retap Start. Snapshots go in the hit folder.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CURRICULUM_TASKS,
  getTask,
  holdSecondsForStep,
  isTaskUnlocked,
  suggestCurrentTaskId,
  taskStatus,
  type TaskDef,
} from '../config/curriculum'
import { getStepGuide } from '../config/walkthrough'
import { getShape } from '../config/shapes'
import { TaskAnalysisPanel } from './TaskAnalysisPanel'
import { playHitTick, playSuccessChime } from '../lib/sounds'
import {
  deleteCapture,
  listCaptures,
  saveCapture,
  snapshotCanvas,
  type TaskCapture,
} from '../lib/captureStore'
import { HitFolder } from './HitFolder'
import { useRollingCapture } from '../hooks/useRollingCapture'
import { useSpeechCoach, holdPrompt } from '../hooks/useSpeechCoach'
import {
  createId,
  fileToDataUrl,
  latestTaskAnalysis,
  recordTaskCompletion,
  recordTaskSkip,
  saveReferencePhoto,
  saveTaskAnalysis,
  saveTaskProgress,
} from '../lib/storage'
import { buildTaskReport, type LiveStepSample } from '../lib/taskAnalysis'
import { isOpenShoulderCue, isSoftShoulderShape, openShoulderScore } from '../lib/scoring'
import type {
  AthleteTaskProgress,
  ReferencePhoto,
  ScoreResult,
  TaskRunReport,
} from '../types'

type Props = {
  athleteId: string | null
  progress: AthleteTaskProgress | null
  onProgressChange: (p: AthleteTaskProgress) => void
  /** Live overall score for the active shape */
  overallScore: number
  qualityThreshold: number
  mainCorrection: string | null
  score: ScoreResult
  /** Ask parent to switch camera scoring to this shape (+ optional stance) */
  onRequestShape: (
    shapeId: string,
    stance?: 'left' | 'right' | 'auto',
    opts?: { profileOk?: boolean },
  ) => void
  referencePhotos: ReferencePhoto[]
  onReferencesChange: (photos: ReferencePhoto[]) => void
  voiceEnabled: boolean
  onVoiceEnabledChange: (on: boolean) => void
  /** Whether pose timing should accumulate (camera or demo active) */
  timingActive: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  cameraRunning: boolean
  /** Turn the pose camera on with Start pathway (one tap). */
  onEnsureCamera?: () => void
  /** Latest hit still for the PiP (parent holds the object URL). */
  onHitPreview?: (blob: Blob) => void
}

export function TaskTrainer({
  athleteId,
  progress,
  onProgressChange,
  overallScore,
  mainCorrection,
  score,
  onRequestShape,
  referencePhotos,
  onReferencesChange,
  voiceEnabled,
  onVoiceEnabledChange,
  timingActive,
  videoRef,
  canvasRef,
  cameraRunning,
  onEnsureCamera,
  onHitPreview,
}: Props) {
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [stepProgress, setStepProgress] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)
  const [captures, setCaptures] = useState<TaskCapture[]>([])
  const [liveKind, setLiveKind] = useState<'looking' | 'close' | 'holding' | 'gotit'>('looking')
  const [banner, setBanner] = useState('Start the pathway — keep listening and hit each shape.')
  const [analysis, setAnalysis] = useState<TaskRunReport | null>(null)
  const [tryDisplay, setTryDisplay] = useState(0)
  const holdAccumRef = useRef(0)
  const lastRef = useRef<number | null>(null)
  const completingRef = useRef(false)
  const inQualityRef = useRef(false)
  const readyAccumRef = useRef(0)
  const hitAtRef = useRef<number | null>(null)
  const advancingRef = useRef(false)
  const sessionRef = useRef(false)
  const skipIntroRef = useRef(false)
  const hadHitThisStepRef = useRef(false)
  const samplesRef = useRef<LiveStepSample[]>([])
  const spokenBeatsRef = useRef<Set<number>>(new Set())
  const tryCountRef = useRef(0)
  const tryAccumRef = useRef(0)
  const invertedRef = useRef(false)
  const scoreRef = useRef(score)
  useEffect(() => {
    scoreRef.current = score
  }, [score])

  const {
    speakCue,
    speakEvent,
    speakClose,
    speakLost,
    reset: resetSpeech,
    supported: speechSupported,
  } = useSpeechCoach(voiceEnabled)
  const { trimClip } = useRollingCapture(videoRef, canvasRef, active)

  const completions = progress?.completions ?? {}
  const skipped = progress?.skippedTaskIds ?? []
  const assigned = progress?.assignedTaskIds

  const visibleTasks = useMemo(() => {
    if (!assigned || assigned.length === 0) return CURRICULUM_TASKS
    const set = new Set(assigned)
    return CURRICULUM_TASKS.filter((t) => set.has(t.id))
  }, [assigned])

  const selectedTaskId =
    progress?.currentTaskId && getTask(progress.currentTaskId)
      ? progress.currentTaskId
      : suggestCurrentTaskId(completions, skipped)

  const task: TaskDef | undefined = getTask(selectedTaskId)
  const taskCompletions = task ? (completions[task.id] ?? 0) : 0
  const step = task?.steps[stepIndex]
  const stepHold =
    task && step ? holdSecondsForStep(task, step, taskCompletions) : 0
  const stepShape = step ? getShape(step.shapeId) : undefined

  const selectTask = (taskId: string) => {
    if (!athleteId || !progress) return
    const t = getTask(taskId)
    if (!t || !isTaskUnlocked(t, completions, skipped)) return
    const next = { ...progress, currentTaskId: taskId }
    saveTaskProgress(next)
    onProgressChange(next)
    setActive(false)
    setStepIndex(0)
    setStepProgress(0)
    holdAccumRef.current = 0
    setAnalysis(null)
    resetSpeech()
  }

  const beginTask = (t: TaskDef) => {
    if (!athleteId) return
    const comps = taskCompletionsFor(t)
    holdAccumRef.current = 0
    lastRef.current = null
    completingRef.current = false
    setStepIndex(0)
    setStepProgress(0)
    setTryDisplay(0)
    samplesRef.current = t.steps.map((s) => ({
      shapeId: s.shapeId,
      required: !s.gradeOnly,
      holdSeconds: holdSecondsForStep(t, s, comps),
      best: null,
      qualityHit: false,
    }))
    spokenBeatsRef.current = new Set()
    tryCountRef.current = 0
    tryAccumRef.current = 0
    invertedRef.current = false
    sessionRef.current = true
    skipIntroRef.current = true
    inQualityRef.current = false
    readyAccumRef.current = 0
    hitAtRef.current = null
    advancingRef.current = false
    hadHitThisStepRef.current = false
    setActive(true)
    resetSpeech()
    const first = t.steps[0]
    if (first) {
      onRequestShape(first.shapeId, first.stance ?? 'auto', {
        profileOk: Boolean(first.profileOk),
      })
    }
    const firstShape = first ? getShape(first.shapeId) : undefined
    const hold = first ? holdSecondsForStep(t, first, comps) : 0
    const guide = first ? getStepGuide(t.id, first.shapeId) : undefined
    const line =
      guide?.intro ??
      `Let's go. Show me a ${firstShape?.name ?? 'shape'}. ${holdPrompt(hold)}`
    setBanner(line)
    setLiveKind('looking')
    speakEvent(line)
  }

  const taskCompletionsFor = (t: TaskDef) => completions[t.id] ?? 0

  const beginTaskRef = useRef<(t: TaskDef) => void>(() => {})
  beginTaskRef.current = beginTask

  const start = () => {
    if (!task || !athleteId) return
    if (!isTaskUnlocked(task, completions, skipped)) {
      setFlash('Complete the previous task first.')
      return
    }
    onEnsureCamera?.()
    setAnalysis(null)
    beginTask(task)
  }

  const stop = () => {
    sessionRef.current = false
    setActive(false)
    lastRef.current = null
    setLiveKind('looking')
    setBanner('Pathway paused.')
    resetSpeech()
  }

  const skipCurrentShape = () => {
    if (!athleteId || !task) {
      skipToNextTask()
      return
    }
    const nextStep = task.steps[stepIndex + 1]
    if (!nextStep) {
      skipToNextTask()
      return
    }
    holdAccumRef.current = 0
    setStepProgress(0)
    lastRef.current = null
    inQualityRef.current = false
    readyAccumRef.current = 0
    hitAtRef.current = null
    spokenBeatsRef.current = new Set()
    tryCountRef.current = 0
    tryAccumRef.current = 0
    invertedRef.current = false
    hadHitThisStepRef.current = false
    advancingRef.current = false
    skipIntroRef.current = true
    const nextShape = getShape(nextStep.shapeId)
    const nextHold = holdSecondsForStep(task, nextStep, taskCompletions)
    const nextGuide = getStepGuide(task.id, nextStep.shapeId)
    const line =
      nextGuide?.intro ??
      `Skipping this shape. Next, show me a ${nextShape?.name ?? 'shape'}. ${holdPrompt(nextHold)}`
    setStepIndex((i) => i + 1)
    setBanner(line)
    setLiveKind('looking')
    setFlash('Skipped this shape')
    window.setTimeout(() => setFlash(null), 3000)
    speakEvent(line, true)
    onRequestShape(nextStep.shapeId, nextStep.stance ?? 'auto', {
      profileOk: Boolean(nextStep.profileOk),
    })
  }

  const skipToNextTask = () => {
    if (!athleteId || !task || !progress) return
    sessionRef.current = false
    setActive(false)
    lastRef.current = null
    resetSpeech()
    const updated = recordTaskSkip(athleteId, task.id)
    const idx = CURRICULUM_TASKS.findIndex((t) => t.id === task.id)
    const skippedIds = updated.skippedTaskIds ?? []
    const nextTask = CURRICULUM_TASKS.slice(idx + 1).find((t) =>
      isTaskUnlocked(t, updated.completions, skippedIds),
    )
    const withCurrent = {
      ...updated,
      currentTaskId: nextTask?.id ?? updated.currentTaskId,
    }
    saveTaskProgress(withCurrent)
    onProgressChange(withCurrent)
    setStepIndex(0)
    setStepProgress(0)
    holdAccumRef.current = 0
    setAnalysis(null)
    const line = nextTask
      ? `Skipping ahead. Next task: ${nextTask.name.replace(/^\d+\.\s*/, '')}.`
      : 'Skipped this task.'
    setFlash(line)
    setBanner(line)
    speakEvent(line, true)
    window.setTimeout(() => setFlash(null), 4000)
  }

  const finishTask = useCallback((prefix?: string) => {
    if (!athleteId || !task || completingRef.current) return
    completingRef.current = true
    const updated = recordTaskCompletion(athleteId, task.id)
    const idx = CURRICULUM_TASKS.findIndex((t) => t.id === task.id)
    const nextTask = CURRICULUM_TASKS[idx + 1]
    const report = buildTaskReport({
      id: createId('an'),
      athleteId,
      taskId: task.id,
      taskName: task.name,
      samples: samplesRef.current,
    })
    saveTaskAnalysis(report)
    setAnalysis(report)

    const nextUnlocked =
      nextTask &&
      isTaskUnlocked(nextTask, updated.completions, updated.skippedTaskIds ?? [])
    const nextId = nextUnlocked
      ? nextTask.id
      : suggestCurrentTaskId(updated.completions, updated.skippedTaskIds ?? [])
    const withCurrent = { ...updated, currentTaskId: nextId }
    saveTaskProgress(withCurrent)
    onProgressChange(withCurrent)

    if (nextUnlocked && nextTask) {
      const doneLine = [
        prefix,
        `That's ${task.name.replace(/^\d+\.\s*/, '')}. Keep going — next is ${nextTask.name.replace(/^\d+\.\s*/, '')}.`,
      ]
        .filter(Boolean)
        .join(' ')
      setFlash(`Completed: ${task.name}`)
      setBanner(doneLine)
      setLiveKind('gotit')
      speakEvent(doneLine)
      window.setTimeout(() => setFlash(null), 4000)
      window.setTimeout(() => {
        completingRef.current = false
        beginTaskRef.current(nextTask)
      }, 2200)
    } else {
      sessionRef.current = false
      setActive(false)
      const doneLine = [
        prefix,
        "That's the whole pathway. Read your analysis — great work.",
      ]
        .filter(Boolean)
        .join(' ')
      setFlash(`Completed: ${task.name}`)
      setBanner(doneLine)
      setLiveKind('gotit')
      speakEvent(doneLine)
      window.setTimeout(() => setFlash(null), 4000)
      completingRef.current = false
    }
  }, [athleteId, task, onProgressChange, speakEvent, onRequestShape])

  const refreshCaptures = useCallback(async () => {
    if (!athleteId) {
      setCaptures([])
      return
    }
    try {
      setCaptures(await listCaptures(athleteId))
    } catch {
      /* IDB unavailable */
    }
  }, [athleteId])

  useEffect(() => {
    void refreshCaptures()
  }, [refreshCaptures])

  useEffect(() => {
    inQualityRef.current = false
    readyAccumRef.current = 0
    hitAtRef.current = null
    hadHitThisStepRef.current = false
    spokenBeatsRef.current = new Set()
    tryCountRef.current = 0
    tryAccumRef.current = 0
    invertedRef.current = false
    setTryDisplay(0)
  }, [stepIndex, task?.id])

  useEffect(() => {
    if (!active || !stepShape || !step || !task) return
    if (skipIntroRef.current) {
      skipIntroRef.current = false
      return
    }
    const guide = getStepGuide(task.id, step.shapeId)
    const line =
      guide?.intro ?? `Show me a ${stepShape.name}. ${holdPrompt(stepHold)}`
    setBanner(line)
    setLiveKind('looking')
    speakEvent(line)
  }, [active, stepIndex, task, step, stepShape, stepHold, speakEvent])

  const saveHitSnapshot = useCallback(() => {
    if (!athleteId || !task || !stepShape) return
    const blob = snapshotCanvas(canvasRef.current)
    if (!blob) return
    const meta = {
      id: createId('snap'),
      athleteId,
      taskId: task.id,
      shapeId: stepShape.id,
      shapeName: stepShape.name,
      kind: 'snapshot' as const,
      createdAt: new Date().toISOString(),
      holdSeconds: 0,
    }
    void (async () => {
      try {
        await saveCapture(meta, blob)
        onHitPreview?.(blob)
        await refreshCaptures()
      } catch {
        /* capture optional */
      }
    })()
  }, [athleteId, task, stepShape, canvasRef, refreshCaptures, onHitPreview])

  // Hold quality, talk through hits / close / lost, advance the pathway
  useEffect(() => {
    if (!active || !task || !step || !stepShape) return
    if (!timingActive) {
      lastRef.current = null
      return
    }

    if (stepShape.id) {
      onRequestShape(step.shapeId, step.stance ?? 'auto', {
        profileOk: Boolean(step.profileOk),
      })
    }
    const guide = getStepGuide(task.id, step.shapeId)
    const scripted = Boolean(guide)
    const gradeOnly = Boolean(step.gradeOnly)
    const maxTries = step.tries ?? 3
    const tryWindow = step.trySeconds ?? 10
    const attemptFloor = 25

    const noteBest = (result: ScoreResult) => {
      const slot = samplesRef.current[stepIndex]
      if (!slot) return
      if (!slot.best || result.overall > slot.best.overall) {
        slot.best = result
      }
      if (result.holdReady) slot.qualityHit = true
      if (gradeOnly) slot.tries = tryCountRef.current
    }

    const completeStep = () => {
      holdAccumRef.current = 0
      setStepProgress(0)
      lastRef.current = null
      advancingRef.current = true
      playSuccessChime()
      const endAt = performance.now()
      const hitAt = hitAtRef.current ?? endAt - Math.max(stepHold, 0.4) * 1000
      const shapeName = stepShape.name
      const shapeId = stepShape.id
      const holdSec = stepHold
      const nextStep = task.steps[stepIndex + 1]
      const nextShape = nextStep ? getShape(nextStep.shapeId) : undefined
      const nextHold = nextStep ? holdSecondsForStep(task, nextStep, taskCompletions) : 0
      const nextGuide = nextStep ? getStepGuide(task.id, nextStep.shapeId) : undefined
      const isLast = stepIndex + 1 >= task.steps.length
      const outro = guide?.outro
      if (!isLast && nextShape) {
        skipIntroRef.current = true
        const line = [outro, nextGuide?.intro ?? `Got it. That's the ${shapeName}. Next, show me a ${nextShape.name}. ${holdPrompt(nextHold)}`]
          .filter(Boolean)
          .join(' ')
        setBanner(line)
        setLiveKind('gotit')
        speakEvent(line)
      } else if (isLast) {
        finishTask(outro)
      }
      void (async () => {
        try {
          const clip = await trimClip(hitAt, endAt)
          if (clip && clip.size > 400 && athleteId) {
            await saveCapture(
              {
                id: createId('clip'),
                athleteId,
                taskId: task.id,
                shapeId,
                shapeName,
                kind: 'clip',
                createdAt: new Date().toISOString(),
                holdSeconds: holdSec,
              },
              clip,
            )
            await refreshCaptures()
          }
        } catch {
          /* recording optional */
        }
        hitAtRef.current = null
        inQualityRef.current = false
        advancingRef.current = false
        if (!isLast) {
          setStepIndex((i) => i + 1)
        }
      })()
    }

    let raf = 0
    const tick = (now: number) => {
      if (advancingRef.current) {
        lastRef.current = now
        raf = requestAnimationFrame(tick)
        return
      }
      if (lastRef.current != null) {
        const dt = (now - lastRef.current) / 1000
        noteBest(scoreRef.current)
        if (scoreRef.current.holdReady) {
          readyAccumRef.current += dt
        } else {
          readyAccumRef.current = 0
        }
        // Must actually hold the shape — a 1-frame spike while walking
        // past the camera must not snapshot or say "got it".
        const inQ = readyAccumRef.current >= 0.2
        const close = !inQ && Boolean(scoreRef.current.nearHit)

        if (gradeOnly) {
          tryAccumRef.current += dt
          const inverted = overallScore >= attemptFloor
          if (inverted && !invertedRef.current) {
            invertedRef.current = true
            playHitTick()
            if (!hadHitThisStepRef.current) {
              hadHitThisStepRef.current = true
              saveHitSnapshot()
            }
            setLiveKind('holding')
            setBanner(
              `Try ${Math.min(tryCountRef.current + 1, maxTries)} of ${maxTries} — best kick-up`,
            )
          }
          const windowDone = tryAccumRef.current >= tryWindow
          const cameDown = invertedRef.current && !inverted
          if (cameDown || windowDone) {
            invertedRef.current = false
            tryAccumRef.current = 0
            tryCountRef.current += 1
            const n = tryCountRef.current
            const slot = samplesRef.current[stepIndex]
            if (slot) slot.tries = n
            setTryDisplay(n)
            if (n >= maxTries) {
              completeStep()
              return
            }
            const again = `That's ${n}. Kick up again — best handstand you can hit.`
            setBanner(again)
            setLiveKind('looking')
            speakEvent(again)
          }
        } else if (inQ) {
          if (!inQualityRef.current) {
            inQualityRef.current = true
            hitAtRef.current = now
            playHitTick()
            hadHitThisStepRef.current = true
            saveHitSnapshot()
            setLiveKind('holding')
            const sh = openShoulderScore(scoreRef.current)
            const shoulderCue =
              isSoftShoulderShape(stepShape.id) && sh && sh.score < 85
                ? ' Open your shoulders — arms by your ears.'
                : ''
            const hitLine = `Yes, that's a ${stepShape.name}.${shoulderCue}`
            setBanner(shoulderCue ? `HOLDING — that's a ${stepShape.name}. Open your shoulders.` : `HOLDING — that's a ${stepShape.name}`)
            speakEvent(hitLine)
          }
          holdAccumRef.current += dt
          setStepProgress(holdAccumRef.current)
          if (
            !scripted &&
            step.speakCorrections !== false &&
            mainCorrection &&
            !mainCorrection.toLowerCase().startsWith('excellent') &&
            !(isSoftShoulderShape(stepShape.id) && isOpenShoulderCue(mainCorrection))
          ) {
            speakCue(mainCorrection)
          }
          if (guide?.beats) {
            const remaining = stepHold - holdAccumRef.current
            for (const beat of guide.beats) {
              if (
                remaining <= beat.at &&
                remaining > beat.at - 0.85 &&
                !spokenBeatsRef.current.has(beat.at)
              ) {
                spokenBeatsRef.current.add(beat.at)
                speakEvent(beat.text)
              }
            }
          }
          if (holdAccumRef.current >= stepHold) {
            completeStep()
            return
          }
        } else {
          if (inQualityRef.current) {
            inQualityRef.current = false
            readyAccumRef.current = 0
            hitAtRef.current = null
            holdAccumRef.current = 0
            setStepProgress(0)
            spokenBeatsRef.current = new Set()
            if (!scripted && !isOpenShoulderCue(mainCorrection)) speakLost(mainCorrection)
            setLiveKind(close ? 'close' : 'looking')
            setBanner(close ? `Almost — ${mainCorrection ?? 'find it again'}` : 'Find the shape again')
          } else if (close) {
            setLiveKind((k) => (k === 'close' ? k : 'close'))
            if (
              !scripted &&
              step.speakCorrections !== false &&
              !(isSoftShoulderShape(stepShape.id) && isOpenShoulderCue(mainCorrection))
            ) {
              speakClose(mainCorrection)
            }
          } else {
            setLiveKind((k) => (k === 'holding' || k === 'gotit' ? k : 'looking'))
          }
        }
      }
      lastRef.current = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [
    active,
    task,
    step,
    stepShape,
    stepIndex,
    stepHold,
    taskCompletions,
    overallScore,
    timingActive,
    onRequestShape,
    finishTask,
    trimClip,
    athleteId,
    refreshCaptures,
    speakLost,
    speakClose,
    speakCue,
    speakEvent,
    saveHitSnapshot,
    mainCorrection,
  ])

  const onUploadSharedRef = async (file: File | null) => {
    if (!file || !stepShape) return
    try {
      const dataUrl = await fileToDataUrl(file)
      const photo: ReferencePhoto = {
        id: createId('ref'),
        shapeId: stepShape.id,
        athleteId: null,
        dataUrl,
        label: `${stepShape.name} (shared)`,
        createdAt: new Date().toISOString(),
      }
      await saveReferencePhoto(photo)
      onReferencesChange([
        photo,
        ...referencePhotos.filter(
          (p) => !(p.shapeId === photo.shapeId && p.athleteId === photo.athleteId),
        ),
      ])
      setFlash('Shared reference saved')
      setTimeout(() => setFlash(null), 2000)
    } catch {
      setFlash('Could not save reference photo')
    }
  }

  if (!athleteId) {
    return (
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
        Select or create an athlete to open the curriculum pathway.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
            Athlete tasks
          </p>
          <h2 className="text-lg font-semibold text-[var(--text)]">Curriculum pathway</h2>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => onVoiceEnabledChange(e.target.checked)}
          />
          Voice on
          {!speechSupported && (
            <span className="text-[10px] text-[var(--warn)]">(unavailable)</span>
          )}
        </label>
      </div>

      {task && (
        <div className="sticky top-0 z-20 rounded-lg border border-[var(--warn)]/60 bg-[#2a2410] p-2 shadow-lg">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--warn)]">
            Stuck? Skip without a pass
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={skipToNextTask}
              className="rounded-lg bg-[var(--warn)] px-3 py-2 text-sm font-semibold text-[#1a1408] hover:brightness-110"
            >
              App not working right? Try the next task
            </button>
            {active && (
              <button
                type="button"
                onClick={skipCurrentShape}
                className="rounded-lg border border-[var(--warn)]/70 px-3 py-2 text-sm text-[var(--warn)] hover:bg-[#3a3218]"
              >
                Skip this shape
              </button>
            )}
          </div>
        </div>
      )}

      <ol className="max-h-56 space-y-1 overflow-y-auto text-sm">
        {visibleTasks.map((t) => {
          const status = taskStatus(t, completions, skipped)
          const count = completions[t.id] ?? 0
          const wasSkipped = skipped.includes(t.id) && count === 0
          const selected = t.id === selectedTaskId
          const locked = status === 'locked'
          const holdLabel = t.steps.some((s) => s.gradeOnly)
            ? t.steps[0]?.gradeOnly
              ? '3 HS tries'
              : 'holds + 3 HS tries'
            : status === 'mastered'
              ? `${t.steps[0]?.masteredSeconds ?? 3}s holds`
              : `${t.steps[0]?.beginnerSeconds ?? 5}s holds`
          return (
            <li key={t.id}>
              <button
                type="button"
                disabled={locked || active}
                onClick={() => selectTask(t.id)}
                className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left ${
                  selected
                    ? 'bg-[var(--accent-dim)] text-white'
                    : locked
                      ? 'cursor-not-allowed opacity-45 text-[var(--muted)]'
                      : 'hover:bg-[#243040] text-[var(--text)]'
                }`}
              >
                <span className="mt-0.5 w-[4.5rem] shrink-0 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  {status === 'mastered'
                    ? 'Mastered'
                    : status === 'locked'
                      ? 'Locked'
                      : wasSkipped
                        ? 'Skipped'
                        : count > 0
                          ? `${count}× done`
                          : 'Open'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{t.name}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                    {holdLabel}
                    {status === 'mastered' ? '' : ` · master after ${t.masterAfterCompletions}`}
                    {' · '}
                    {t.description}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {task && (
        <div className="rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-[var(--text)]">{task.name}</p>
            <p className="text-xs text-[var(--muted)]">
              {task.steps.some((s) => s.gradeOnly)
                ? 'Handstand: 3 graded kick-up tries — not required to move on'
                : taskCompletions >= task.masterAfterCompletions
                  ? `Holds: ${task.steps[0]?.masteredSeconds ?? 3}s (mastered)`
                  : `Holds: ${task.steps[0]?.beginnerSeconds ?? 5}s → ${task.steps[0]?.masteredSeconds ?? 3}s after ${task.masterAfterCompletions} clears`}
            </p>
          </div>

          {active && (
            <div
              className={`mb-3 rounded-lg border px-3 py-2 ${
                liveKind === 'holding'
                  ? 'border-[var(--good)] bg-[#102820] text-[var(--good)]'
                  : liveKind === 'close'
                    ? 'border-[var(--warn)] bg-[#2a2410] text-[var(--warn)]'
                    : liveKind === 'gotit'
                      ? 'border-[var(--accent)] bg-[#102820] text-[var(--accent)]'
                      : 'border-[var(--panel-border)] text-[var(--text)]'
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                {liveKind === 'holding'
                  ? 'Holding — stay there'
                  : liveKind === 'close'
                    ? 'Close'
                    : liveKind === 'gotit'
                      ? 'Got it — next shape'
                      : 'Listening'}
              </p>
              <p className="text-sm font-semibold leading-snug">{banner}</p>
              {liveKind === 'holding' && (
                <div className="mt-2 h-2 overflow-hidden rounded bg-[#0d1218]">
                  <div
                    className="h-full rounded bg-[var(--good)] transition-[width] duration-100"
                    style={{
                      width: `${Math.min(100, (stepProgress / Math.max(stepHold, 0.01)) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <ol className="mb-3 space-y-1 text-sm">
            {task.steps.map((s, i) => {
              const shape = getShape(s.shapeId)
              const hold = holdSecondsForStep(task, s, taskCompletions)
              const isCurrent = active && i === stepIndex
              const done = active && i < stepIndex
              const tries = s.tries ?? 3
              return (
                <li
                  key={`${s.shapeId}-${i}`}
                  className={`rounded px-2 py-1 ${
                    isCurrent
                      ? 'bg-[var(--accent-dim)] text-white'
                      : done
                        ? 'text-[var(--good)]'
                        : 'text-[var(--muted)]'
                  }`}
                >
                  {i + 1}. {shape?.name ?? s.shapeId}{' '}
                  <span className="opacity-70">
                    {s.gradeOnly
                      ? `(${tries} tries · graded, not required)`
                      : `(${s.passThrough ? 'pass-through ' : ''}${Number.isInteger(hold) ? hold : hold.toFixed(1)}s)`}
                  </span>
                  {s.note && (
                    <span className="mt-0.5 block text-[11px] opacity-80">{s.note}</span>
                  )}
                  {isCurrent && !s.gradeOnly && (
                    <span className="ml-2 tabular-nums">
                      {Math.min(stepProgress, hold).toFixed(1)}/{hold}s
                    </span>
                  )}
                  {isCurrent && s.gradeOnly && (
                    <span className="ml-2 tabular-nums">
                      try {Math.min(tryDisplay + 1, tries)}/{tries}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>

          {active && score.mainCorrection && (
            <p className="mb-2 text-sm">
              <span className="text-[var(--muted)]">Cue: </span>
              <span className="font-medium text-[var(--text)]">{score.mainCorrection}</span>
            </p>
          )}

          {active && !cameraRunning && (
            <p className="mb-2 text-xs text-[var(--muted)]">
              Start the camera to save a snapshot and a short trimmed clip when you hit the shape.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {!active ? (
              <button
                type="button"
                onClick={start}
                disabled={!isTaskUnlocked(task, completions, skipped)}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-40"
              >
                Start pathway — camera + voice
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
              >
                Pause pathway
              </button>
            )}
            {athleteId && latestTaskAnalysis(athleteId, task.id) && !analysis && (
              <button
                type="button"
                onClick={() => setAnalysis(latestTaskAnalysis(athleteId, task.id))}
                className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
              >
                View last analysis
              </button>
            )}
            {active && (
              <button
                type="button"
                onClick={skipCurrentShape}
                className="rounded-lg border border-[var(--warn)]/50 px-3 py-2 text-sm text-[var(--warn)] hover:bg-[#2a2410]"
              >
                Skip this shape
              </button>
            )}
            <button
              type="button"
              onClick={skipToNextTask}
              className="rounded-lg border border-[var(--warn)]/50 px-3 py-2 text-sm text-[var(--warn)] hover:bg-[#2a2410]"
              title="Unlock the next task if scoring is stuck"
            >
              App not working right? Try the next task
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            Voice talks you through each shape and starts the next task on its
            own — no extra Start tap. We grade the written body position, not a
            match to the coach still. Body position, still, live feed, score, and
            delay cam sit together on the left.
          </p>
        </div>
      )}

      {analysis && athleteId && (
        <div className="space-y-2">
          <div className="rounded-lg border border-[var(--warn)]/60 bg-[#2a2410] p-2">
            <button
              type="button"
              onClick={skipToNextTask}
              className="rounded-lg bg-[var(--warn)] px-3 py-2 text-sm font-semibold text-[#1a1408]"
            >
              App not working right? Try the next task
            </button>
          </div>
          <TaskAnalysisPanel
            report={analysis}
            onClose={() => setAnalysis(null)}
            onContinue={() => setAnalysis(null)}
            continueLabel="Keep going"
          />
        </div>
      )}

      {stepShape && (
        <div className="rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
          {stepShape.coachNotes && (
            <p className="mb-2 text-sm leading-snug text-[var(--muted)]">{stepShape.coachNotes}</p>
          )}
          {step?.stance && (
            <p className="mb-2 text-xs text-[var(--accent)]">
              This step: {step.stance === 'right' ? 'RIGHT' : 'LEFT'} foot / support forward
            </p>
          )}
          <p className="mb-2 text-[11px] text-[var(--muted)]">
            Hits go in the folder below — they never replace the coach still.
          </p>
          <label className="cursor-pointer rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm hover:bg-[#243040]">
            Replace coach still
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={!stepShape}
              onChange={(e) => {
                void onUploadSharedRef(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      )}

      {flash && (
        <p className="rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          {flash}
        </p>
      )}

      <HitFolder
        captures={captures}
        onDelete={async (id) => {
          await deleteCapture(id)
          await refreshCaptures()
        }}
      />
    </div>
  )
}

