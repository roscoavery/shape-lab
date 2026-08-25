/**
 * TaskTrainer — curriculum pathway UI for a selected athlete.
 *
 * Lists locked / unlocked / mastered tasks, runs the active task with
 * adaptive hold times (5s → 3s after mastery), pass-through lever support,
 * reference image display/upload, and voice coaching toggle.
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
import { getShape } from '../config/shapes'
import { useSpeechCoach } from '../hooks/useSpeechCoach'
import {
  createId,
  deleteReferencePhoto,
  fileToDataUrl,
  pickReferencePhoto,
  recordTaskCompletion,
  saveReferencePhoto,
  saveTaskProgress,
} from '../lib/storage'
import type {
  AthleteTaskProgress,
  ReferencePhoto,
  ScoreResult,
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
  /** Ask parent to switch camera scoring to this shape */
  onRequestShape: (shapeId: string) => void
  referencePhotos: ReferencePhoto[]
  onReferencesChange: (photos: ReferencePhoto[]) => void
  voiceEnabled: boolean
  onVoiceEnabledChange: (on: boolean) => void
  /** Whether pose timing should accumulate (camera or demo active) */
  timingActive: boolean
}

export function TaskTrainer({
  athleteId,
  progress,
  onProgressChange,
  overallScore,
  qualityThreshold,
  mainCorrection,
  score,
  onRequestShape,
  referencePhotos,
  onReferencesChange,
  voiceEnabled,
  onVoiceEnabledChange,
  timingActive,
}: Props) {
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [stepProgress, setStepProgress] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)
  const [refFailedId, setRefFailedId] = useState<string | null>(null)
  const holdAccumRef = useRef(0)
  const lastRef = useRef<number | null>(null)
  const completingRef = useRef(false)

  const { speak, reset: resetSpeech, supported: speechSupported } = useSpeechCoach(
    voiceEnabled && active,
  )

  const completions = progress?.completions ?? {}
  const assigned = progress?.assignedTaskIds

  const visibleTasks = useMemo(() => {
    if (!assigned || assigned.length === 0) return CURRICULUM_TASKS
    const set = new Set(assigned)
    return CURRICULUM_TASKS.filter((t) => set.has(t.id))
  }, [assigned])

  const selectedTaskId =
    progress?.currentTaskId && getTask(progress.currentTaskId)
      ? progress.currentTaskId
      : suggestCurrentTaskId(completions)

  const task: TaskDef | undefined = getTask(selectedTaskId)
  const taskCompletions = task ? (completions[task.id] ?? 0) : 0
  const step = task?.steps[stepIndex]
  const stepHold =
    task && step ? holdSecondsForStep(task, step, taskCompletions) : 0
  const stepShape = step ? getShape(step.shapeId) : undefined

  const activeRef = pickReferencePhoto(
    referencePhotos,
    step?.shapeId ?? task?.steps[0]?.shapeId ?? '',
    athleteId,
  )
  const showRef = Boolean(activeRef?.dataUrl) && refFailedId !== activeRef?.id

  const selectTask = (taskId: string) => {
    if (!athleteId || !progress) return
    const t = getTask(taskId)
    if (!t || !isTaskUnlocked(t, completions)) return
    const next = { ...progress, currentTaskId: taskId }
    saveTaskProgress(next)
    onProgressChange(next)
    setActive(false)
    setStepIndex(0)
    setStepProgress(0)
    holdAccumRef.current = 0
    resetSpeech()
  }

  const start = () => {
    if (!task || !athleteId) return
    if (!isTaskUnlocked(task, completions)) {
      setFlash('Complete the previous task first.')
      return
    }
    holdAccumRef.current = 0
    lastRef.current = null
    completingRef.current = false
    setStepIndex(0)
    setStepProgress(0)
    setActive(true)
    resetSpeech()
    const first = task.steps[0]
    if (first) onRequestShape(first.shapeId)
  }

  const stop = () => {
    setActive(false)
    lastRef.current = null
    resetSpeech()
  }

  const finishTask = useCallback(() => {
    if (!athleteId || !task || completingRef.current) return
    completingRef.current = true
    setActive(false)
    const updated = recordTaskCompletion(athleteId, task.id)
    const nextId = suggestCurrentTaskId(updated.completions)
    const withCurrent = { ...updated, currentTaskId: nextId }
    saveTaskProgress(withCurrent)
    onProgressChange(withCurrent)
    setFlash(`Completed: ${task.name}`)
    setTimeout(() => setFlash(null), 3000)
    resetSpeech()
  }, [athleteId, task, onProgressChange, resetSpeech])

  // Advance steps while holding quality
  useEffect(() => {
    if (!active || !task || !step || !stepShape) return
    if (!timingActive) {
      lastRef.current = null
      return
    }

    if (stepShape.id) onRequestShape(step.shapeId)

    let raf = 0
    const tick = (now: number) => {
      if (lastRef.current != null) {
        const dt = (now - lastRef.current) / 1000
        if (overallScore >= (qualityThreshold || stepShape.qualityThreshold)) {
          holdAccumRef.current += dt
          setStepProgress(holdAccumRef.current)
          if (holdAccumRef.current >= stepHold) {
            holdAccumRef.current = 0
            setStepProgress(0)
            lastRef.current = null
            if (stepIndex + 1 >= task.steps.length) {
              finishTask()
            } else {
              setStepIndex((i) => i + 1)
            }
            return
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
    overallScore,
    qualityThreshold,
    timingActive,
    onRequestShape,
    finishTask,
  ])

  // Voice coaching on steps that request it
  useEffect(() => {
    if (!active || !step?.speakCorrections) return
    if (!mainCorrection) return
    // Don't spam "Excellent" while holding
    if (mainCorrection.startsWith('Excellent')) return
    if (overallScore < 5) return
    speak(mainCorrection)
  }, [active, step, mainCorrection, overallScore, speak])

  const onUploadRef = async (file: File | null) => {
    if (!file || !stepShape) return
    try {
      const dataUrl = await fileToDataUrl(file)
      const photo: ReferencePhoto = {
        id: createId('ref'),
        shapeId: stepShape.id,
        athleteId: athleteId,
        dataUrl,
        label: stepShape.name,
        createdAt: new Date().toISOString(),
      }
      await saveReferencePhoto(photo)
      onReferencesChange([
        photo,
        ...referencePhotos.filter(
          (p) => !(p.shapeId === photo.shapeId && p.athleteId === photo.athleteId),
        ),
      ])
      setFlash('Reference photo saved')
      setTimeout(() => setFlash(null), 2000)
    } catch {
      setFlash('Could not save reference photo')
    }
  }

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

  const removeRef = async (id: string) => {
    await deleteReferencePhoto(id)
    onReferencesChange(referencePhotos.filter((p) => p.id !== id))
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

      <ol className="max-h-56 space-y-1 overflow-y-auto text-sm">
        {visibleTasks.map((t) => {
          const status = taskStatus(t, completions)
          const count = completions[t.id] ?? 0
          const selected = t.id === selectedTaskId
          const locked = status === 'locked'
          const holdLabel =
            status === 'mastered'
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
              Holds:{' '}
              {taskCompletions >= task.masterAfterCompletions
                ? `${task.steps[0]?.masteredSeconds ?? 3}s (mastered)`
                : `${task.steps[0]?.beginnerSeconds ?? 5}s → ${task.steps[0]?.masteredSeconds ?? 3}s after ${task.masterAfterCompletions} clears`}
            </p>
          </div>

          <ol className="mb-3 space-y-1 text-sm">
            {task.steps.map((s, i) => {
              const shape = getShape(s.shapeId)
              const hold = holdSecondsForStep(task, s, taskCompletions)
              const isCurrent = active && i === stepIndex
              const done = active && i < stepIndex
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
                    ({s.passThrough ? 'pass-through ' : ''}
                    {hold}s)
                  </span>
                  {s.note && (
                    <span className="mt-0.5 block text-[11px] opacity-80">{s.note}</span>
                  )}
                  {isCurrent && (
                    <span className="ml-2 tabular-nums">
                      {Math.min(stepProgress, hold).toFixed(1)}/{hold}s
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

          <div className="flex flex-wrap gap-2">
            {!active ? (
              <button
                type="button"
                onClick={start}
                disabled={!isTaskUnlocked(task, completions)}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-40"
              >
                Start task
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
              >
                Stop task
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reference photo — shown beside camera while training */}
      <div className="rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
        <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">
          Reference photo
          {stepShape ? ` · ${stepShape.name}` : ''}
        </p>
        {showRef && activeRef ? (
          <div className="mb-2">
            <img
              key={activeRef.id}
              src={activeRef.dataUrl}
              alt={activeRef.label ?? 'Reference'}
              className="max-h-48 w-full rounded-md object-contain bg-[#0d1218]"
              onError={() => setRefFailedId(activeRef.id)}
            />
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
              <span>
                {activeRef.id.startsWith('default_')
                  ? 'Default file'
                  : activeRef.athleteId
                    ? 'Athlete-specific'
                    : 'Shared for shape'}
              </span>
              {!activeRef.id.startsWith('default_') && (
                <button
                  type="button"
                  className="text-[var(--bad)] underline"
                  onClick={() => void removeRef(activeRef.id)}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="mb-2 text-xs text-[var(--muted)]">
            No reference yet — upload a coach photo, or place a JPG in{' '}
            <code className="text-[var(--accent)]">public/references/</code>.
          </p>
        )}
        <div className="flex flex-wrap gap-2 text-sm">
          <label className="cursor-pointer rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-[#243040]">
            Upload for athlete
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={!stepShape || !athleteId}
              onChange={(e) => {
                setRefFailedId(null)
                void onUploadRef(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
          </label>
          <label className="cursor-pointer rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-[#243040]">
            Upload shared
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={!stepShape}
              onChange={(e) => {
                setRefFailedId(null)
                void onUploadSharedRef(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </div>

      {flash && (
        <p className="rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          {flash}
        </p>
      )}
    </div>
  )
}
