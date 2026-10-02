import { useEffect, useRef, useState } from 'react'

/**
 * Shared manual + simulation primitives for Experimental Lab movement games.
 *
 * Honest modes only: "Partner confirm" (a coach/partner confirms what they see,
 * or the athlete self-reports) and "Simulation" (scripted signals for testing
 * the game loop — earns no real practice credit). There is deliberately no
 * camera scoring here yet; when real pose scoring lands it will be a third
 * mode with its own verified status.
 */

/** Countdown timer with pause/resume for manual-mode bouts. */
export function useCountdown(totalSeconds: number) {
  const [left, setLeft] = useState(totalSeconds)
  const [running, setRunning] = useState(false)
  const remainRef = useRef(totalSeconds)
  const endRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const stopTick = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
  }

  const start = (seconds = totalSeconds) => {
    stopTick()
    remainRef.current = seconds
    setLeft(seconds)
    endRef.current = Date.now() + seconds * 1000
    setRunning(true)
    timerRef.current = window.setInterval(() => {
      const l = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000))
      remainRef.current = l
      setLeft(l)
      if (l <= 0) {
        stopTick()
        setRunning(false)
      }
    }, 200)
  }

  const pause = () => {
    if (!running) return
    stopTick()
    setRunning(false)
  }

  const resume = () => {
    if (running || remainRef.current <= 0) return
    endRef.current = Date.now() + remainRef.current * 1000
    setRunning(true)
    timerRef.current = window.setInterval(() => {
      const l = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000))
      remainRef.current = l
      setLeft(l)
      if (l <= 0) {
        stopTick()
        setRunning(false)
      }
    }, 200)
  }

  const reset = () => {
    stopTick()
    setRunning(false)
    remainRef.current = totalSeconds
    setLeft(totalSeconds)
  }

  useEffect(
    () => () => {
      stopTick()
    },
    []
  )

  return { left, running, start, pause, resume, reset }
}

export type SimSignal = 'good' | 'bad' | 'lost'

/**
 * Coach-only simulation panel. Feeds scripted signals into the game loop so
 * the full flow (match / no-match / tracking loss) can be tested with no
 * camera. Simulation never earns real practice credit.
 */
export function SimPanel({ onSignal }: { onSignal: (s: SimSignal) => void }) {
  return (
    <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        Simulation — coach testing only, no real credit
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSignal('good')}
          className="rounded-xl bg-emerald-400/20 px-4 py-2 text-sm font-bold text-emerald-200"
        >
          Good match
        </button>
        <button
          type="button"
          onClick={() => onSignal('bad')}
          className="rounded-xl bg-amber-400/20 px-4 py-2 text-sm font-bold text-amber-200"
        >
          Bad match
        </button>
        <button
          type="button"
          onClick={() => onSignal('lost')}
          className="rounded-xl bg-red-400/20 px-4 py-2 text-sm font-bold text-red-200"
        >
          Tracking lost
        </button>
      </div>
    </div>
  )
}

export type LabInputMode = 'manual' | 'sim'

/** Mode picker shown on movement-game setup screens. */
export function ModePicker({
  mode,
  onMode,
}: {
  mode: LabInputMode
  onMode: (m: LabInputMode) => void
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
        How it's scored
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onMode('manual')}
          className={`rounded-xl px-4 py-3 text-sm font-bold ${
            mode === 'manual' ? 'bg-[var(--accent)] text-black' : 'bg-white/10 text-white/70'
          }`}
        >
          Partner confirm
        </button>
        <button
          type="button"
          onClick={() => onMode('sim')}
          className={`rounded-xl px-4 py-3 text-sm font-bold ${
            mode === 'sim' ? 'bg-[var(--accent)] text-black' : 'bg-white/10 text-white/70'
          }`}
        >
          Simulation
        </button>
      </div>
      <p className="mt-1.5 text-xs text-white/45">
        {mode === 'manual'
          ? 'A partner or coach confirms what they see. Honest self-report works too.'
          : 'Scripted signals for testing the game loop. Earns no real practice credit.'}
      </p>
    </div>
  )
}

/** Big readable countdown display shared by bout-based games. */
export function BoutClock({ left, urgentAt = 10 }: { left: number; urgentAt?: number }) {
  return (
    <p
      className={`text-center font-mono text-6xl font-black tabular-nums ${
        left <= urgentAt ? 'text-red-400' : 'text-[var(--text)]'
      }`}
    >
      {left}
    </p>
  )
}
