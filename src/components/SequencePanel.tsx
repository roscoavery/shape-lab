import { useEffect, useRef, useState } from 'react'
import { SEQUENCES } from '../config/sequences'
import { getShape } from '../config/shapes'
import type { SequenceDef } from '../types'

type Props = {
  currentShapeId: string
  overallScore: number
  onJumpToShape: (shapeId: string) => void
}

export function SequencePanel({ currentShapeId, overallScore, onJumpToShape }: Props) {
  const [sequenceId, setSequenceId] = useState(SEQUENCES[0]?.id ?? '')
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [stepProgress, setStepProgress] = useState(0)
  const holdAccumRef = useRef(0)
  const lastRef = useRef<number | null>(null)

  const sequence: SequenceDef | undefined = SEQUENCES.find((s) => s.id === sequenceId)
  const step = sequence?.steps[stepIndex]

  useEffect(() => {
    if (!active || !step || !sequence) return
    const shape = getShape(step.shapeId)
    if (!shape) return

    if (currentShapeId !== step.shapeId) {
      onJumpToShape(step.shapeId)
    }

    let raf = 0
    const tick = (now: number) => {
      if (lastRef.current != null) {
        const dt = (now - lastRef.current) / 1000
        if (overallScore >= shape.qualityThreshold) {
          holdAccumRef.current += dt
          setStepProgress(holdAccumRef.current)
          if (holdAccumRef.current >= step.holdSeconds) {
            holdAccumRef.current = 0
            setStepProgress(0)
            lastRef.current = null
            if (stepIndex + 1 >= sequence.steps.length) {
              setActive(false)
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
  }, [active, step, stepIndex, overallScore, currentShapeId, onJumpToShape, sequence])

  const start = () => {
    holdAccumRef.current = 0
    lastRef.current = null
    setStepIndex(0)
    setStepProgress(0)
    setActive(true)
    const first = sequence?.steps[0]
    if (first) onJumpToShape(first.shapeId)
  }

  const stop = () => {
    setActive(false)
    lastRef.current = null
  }

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">Sequence trainer</p>
      <select
        className="mb-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        value={sequenceId}
        disabled={active}
        onChange={(e) => setSequenceId(e.target.value)}
      >
        {SEQUENCES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {sequence && (
        <p className="mb-3 text-xs text-[var(--muted)]">{sequence.description}</p>
      )}

      {sequence && (
        <ol className="mb-3 space-y-1 text-sm">
          {sequence.steps.map((s, i) => {
            const shape = getShape(s.shapeId)
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
                <span className="opacity-70">({s.holdSeconds}s)</span>
                {isCurrent && (
                  <span className="ml-2 tabular-nums">
                    {Math.min(stepProgress, s.holdSeconds).toFixed(1)}/{s.holdSeconds}s
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <div className="flex gap-2">
        {!active ? (
          <button
            type="button"
            onClick={start}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
          >
            Start sequence
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
          >
            Stop sequence
          </button>
        )}
      </div>
      {active && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Stay above the shape quality threshold to advance each step.
        </p>
      )}
    </div>
  )
}
