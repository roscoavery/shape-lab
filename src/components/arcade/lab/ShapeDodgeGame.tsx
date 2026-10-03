import { useEffect, useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { ShapeFigure } from './ShapeFigure'
import {
  BoutClock,
  ModePicker,
  SimPanel,
  useCountdown,
  type LabInputMode,
  type SimSignal,
} from './ManualSim'
import { SHAPE_DODGE_WALLS, type ShapeDodgeWall } from '../../../data/arcade/shapeDodgePack'

const POINTS = 100
const MATCH_SECONDS = 2

type WallStage = 'ready' | 'counting' | 'matched' | 'expired'

/** Fisher-Yates shuffle. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function ShapeDodgeGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="shape-dodge"
      title="Shape Dodge"
      tagline="A wall drops. Hit the shape before it closes."
      rules={
        <>
          <p>
            A wall shows a <strong>shaped opening</strong>. Tap <strong>I'm set</strong> when you're
            ready, then you have a <strong>{MATCH_SECONDS}-second window</strong> to be in the
            shape. A partner taps <strong>Fit!</strong> if you're in it. {POINTS} points per wall.
          </p>
          <p className="mt-2">
            Miss the window and it's just <strong>reset, no rush</strong>. Retry the wall, no
            penalty. Generous and paced: speed never forces unsafe movement.
          </p>
        </>
      }
      whatPracticed="Hitting a shape on demand. Calm, quick positioning."
      onExit={onExit}
    >
      {({ finish }) => <ShapeDodgePlay onFinish={finish} />}
    </LabGameShell>
  )
}

function ShapeDodgePlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const [walls] = useState<ShapeDodgeWall[]>(() => shuffled(SHAPE_DODGE_WALLS))
  const [mode, setMode] = useState<LabInputMode>('manual')
  const [index, setIndex] = useState(0)
  const [stage, setStage] = useState<WallStage>('ready')
  const [score, setScore] = useState(0)
  const [hits, setHits] = useState(0)
  const { left, running, start, reset: resetClock } = useCountdown(MATCH_SECONDS)

  const wall = walls[index]
  const last = index === walls.length - 1
  const total = walls.length * POINTS

  // The window expired without a confirmed fit.
  useEffect(() => {
    if (stage === 'counting' && !running && left === 0) {
      setStage('expired')
    }
  }, [stage, running, left])

  const beginWindow = () => {
    resetClock()
    setStage('counting')
    start(MATCH_SECONDS)
  }

  const fit = () => {
    if (stage !== 'counting') return
    const nextScore = score + POINTS
    const nextHits = hits + 1
    setScore(nextScore)
    setHits(nextHits)
    setStage('matched')
    if (last) {
      onFinish({
        score: nextScore,
        total,
        detail: `${nextHits} of ${walls.length} walls fit clean`,
      })
    }
  }

  const resetWall = () => {
    resetClock()
    setStage('ready')
  }

  const next = () => {
    resetClock()
    setStage('ready')
    setIndex((i) => i + 1)
  }

  const onSignal = (s: SimSignal) => {
    if (stage !== 'counting') return
    if (s === 'good') {
      fit()
    } else {
      // bad or lost: reset the wall, no penalty.
      setStage('expired')
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <ModePicker mode={mode} onMode={setMode} />

      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          Wall {index + 1} of {walls.length}
        </span>
        <span className="font-mono font-bold tabular-nums text-[var(--text)]">{score} pts</span>
      </div>

      {/* The wall: a card with a shaped opening. The figure is the target. */}
      <div
        className={`rounded-2xl border-2 bg-black/40 p-4 transition ${
          stage === 'counting' ? 'border-[var(--accent)]' : 'border-white/15'
        }`}
      >
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Shaped opening
        </p>
        <ShapeFigure pose={wall.pose} className="mx-auto mt-2 h-44 w-auto" />
        <p className="mt-2 text-center text-base font-black text-[var(--text)]">{wall.shapeName}</p>
        {wall.note && <p className="mt-1 text-center text-xs text-white/50">{wall.note}</p>}
      </div>

      <div className="rounded-xl bg-black/25 p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-white/45">The cue</p>
        <p className="mt-1 text-sm leading-relaxed text-white/85">{wall.cue}</p>
      </div>

      {stage === 'ready' && (
        <button
          type="button"
          onClick={beginWindow}
          className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black active:scale-95"
        >
          I'm set. Drop the wall
        </button>
      )}

      {stage === 'counting' && (
        <div className="flex flex-col gap-3">
          <div className="flex h-16 items-center justify-center overflow-hidden">
            <div className="scale-[0.55]">
              <BoutClock left={left} urgentAt={MATCH_SECONDS} />
            </div>
          </div>
          {mode === 'manual' ? (
            <button
              type="button"
              onClick={fit}
              className="rounded-2xl bg-emerald-400 px-6 py-4 text-lg font-black text-black active:scale-95"
            >
              Fit!
            </button>
          ) : (
            <SimPanel onSignal={onSignal} />
          )}
        </div>
      )}

      {stage === 'matched' && !last && (
        <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-3">
          <p className="text-sm font-black text-[var(--text)]">Fit. {POINTS} points.</p>
          <button
            type="button"
            onClick={next}
            className="mt-3 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-black"
          >
            Next wall
          </button>
        </div>
      )}

      {stage === 'expired' && (
        <div className="rounded-xl border border-white/15 bg-black/30 p-3">
          <p className="text-sm font-black text-[var(--text)]">Reset. No rush.</p>
          <p className="mt-1 text-sm text-white/65">
            The window closed without a confirmed fit. Take your time and try this wall again. No
            penalty.
          </p>
          <button
            type="button"
            onClick={resetWall}
            className="mt-3 w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
          >
            Try this wall again
          </button>
        </div>
      )}
    </div>
  )
}
