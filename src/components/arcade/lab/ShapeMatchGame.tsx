import { useEffect, useRef, useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { ShapeFigure } from './ShapeFigure'
import { ModePicker, SimPanel, type LabInputMode, type SimSignal } from './ManualSim'
import { SHAPE_MATCH_PACK, type ShapeMatchTarget } from '../../../data/arcade/shapeMatchPack'

const HOLD_GOAL = 3 // valid seconds per target

export function ShapeMatchGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="shape-match"
      title="Shape Match"
      tagline="Enter the shape and hold it steady."
      rules={
        <>
          <p className="font-semibold text-[var(--text)]">How it plays</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>You get a target shape — a figure, the name, and the coach cues.</li>
            <li>Enter the shape and hold it for {HOLD_GOAL} steady seconds. The bar fills as you hold.</li>
            <li>
              <span className="font-semibold text-[var(--text)]">Partner confirm:</span> a partner or
              coach watches and taps "Broke form" if the shape falls apart. Honest self-report
              works too.
            </li>
            <li>
              <span className="font-semibold text-[var(--text)]">Simulation:</span> the coach feeds
              scripted signals to test the game loop. Simulation earns no real practice credit.
            </li>
            <li>There is no camera scoring here — the partner is the judge.</li>
          </ul>
        </>
      }
      whatPracticed="Entering a shape and holding it steady — the basis of every clean skill."
      onExit={onExit}
    >
      {({ finish }) => <ShapeMatchPlay onFinish={finish} />}
    </LabGameShell>
  )
}

type HoldStatus = 'idle' | 'holding' | 'paused'

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function ShapeMatchPlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const [mode, setMode] = useState<LabInputMode>('manual')
  const [difficulty, setDifficulty] = useState<'beginner' | 'standard'>('standard')
  const [targets, setTargets] = useState<ShapeMatchTarget[] | null>(null)

  const [idx, setIdx] = useState(0)
  const [held, setHeld] = useState(0)
  const [status, setStatus] = useState<HoldStatus>('idle')
  const [brokeNote, setBrokeNote] = useState(false)
  const [lostView, setLostView] = useState(false)
  const [score, setScore] = useState(0)

  const heldRef = useRef(0)
  const idxRef = useRef(0)
  const scoreRef = useRef(0)
  const targetsRef = useRef<ShapeMatchTarget[]>([])
  const completingRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const startRound = () => {
    const n = difficulty === 'beginner' ? 3 : 4
    const picked = shuffle(SHAPE_MATCH_PACK).slice(0, n)
    targetsRef.current = picked
    setTargets(picked)
    idxRef.current = 0
    setIdx(0)
    heldRef.current = 0
    setHeld(0)
    scoreRef.current = 0
    setScore(0)
    setStatus('idle')
    setBrokeNote(false)
    setLostView(false)
    completingRef.current = false
  }

  const completeTarget = () => {
    if (completingRef.current) return
    completingRef.current = true
    setStatus('idle')
    const t = targetsRef.current
    const newScore = scoreRef.current + 100
    scoreRef.current = newScore
    setScore(newScore)
    if (idxRef.current + 1 >= t.length) {
      onFinishRef.current({
        score: newScore,
        total: t.length * 100,
        detail: `${t.length} of ${t.length} shapes held for ${HOLD_GOAL} seconds`,
      })
      return
    }
    idxRef.current += 1
    setIdx(idxRef.current)
    heldRef.current = 0
    setHeld(0)
    setBrokeNote(false)
    setLostView(false)
    completingRef.current = false
  }

  const completeRef = useRef(completeTarget)
  completeRef.current = completeTarget

  // Accumulation tick — only while actively holding.
  useEffect(() => {
    if (status !== 'holding') return
    const id = window.setInterval(() => {
      heldRef.current = Math.min(HOLD_GOAL, Math.round((heldRef.current + 0.1) * 10) / 10)
      setHeld(heldRef.current)
      if (heldRef.current >= HOLD_GOAL) completeRef.current()
    }, 100)
    return () => window.clearInterval(id)
  }, [status])

  // --- manual controls -------------------------------------------------
  const startHold = () => {
    setBrokeNote(false)
    setLostView(false)
    setStatus('holding')
  }
  const pauseHold = () => setStatus('paused')
  const brokeForm = () => {
    setBrokeNote(true)
    setStatus('paused')
  }
  const resumeHold = () => {
    setBrokeNote(false)
    setLostView(false)
    setStatus('holding')
  }

  // --- sim signals ------------------------------------------------------
  const onSignal = (s: SimSignal) => {
    if (s === 'good') {
      setBrokeNote(false)
      setLostView(false)
      setStatus('holding')
    } else if (s === 'bad') {
      setLostView(false)
      setBrokeNote(true)
      setStatus('paused')
    } else {
      setBrokeNote(false)
      setLostView(true)
      setStatus('paused')
    }
  }

  if (!targets) {
    return (
      <div className="flex flex-col gap-4">
        <ModePicker mode={mode} onMode={setMode} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Difficulty
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDifficulty('beginner')}
              className={`rounded-xl px-4 py-3 text-sm font-bold ${
                difficulty === 'beginner'
                  ? 'bg-[var(--accent)] text-black'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              Beginner
              <span className="block text-xs font-semibold opacity-70">3 targets</span>
            </button>
            <button
              type="button"
              onClick={() => setDifficulty('standard')}
              className={`rounded-xl px-4 py-3 text-sm font-bold ${
                difficulty === 'standard'
                  ? 'bg-[var(--accent)] text-black'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              Standard
              <span className="block text-xs font-semibold opacity-70">4 targets</span>
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={startRound}
          className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
        >
          Start round
        </button>
      </div>
    )
  }

  const target = targets[idx]
  const pct = Math.min(100, (held / HOLD_GOAL) * 100)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Target {idx + 1} of {targets.length}
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-[var(--accent)]">
          {score} pts
        </p>
      </div>

      <div className="rounded-xl bg-black/25 p-4 text-center">
        <ShapeFigure pose={target.pose} className="mx-auto h-44 w-auto" />
        <p className="mt-2 text-lg font-black text-[var(--text)]">{target.shapeName}</p>
        <ul className="mx-auto mt-2 max-w-md space-y-1 text-left text-sm leading-relaxed text-white/75">
          {target.cues.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[var(--accent)]">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {lostView && (
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-center">
          <p className="text-lg font-black text-red-200">Step into view</p>
          <p className="mt-1 text-sm text-red-200/70">
            Tracking lost — get back in position, then keep holding.
          </p>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold">
          <span className="uppercase tracking-wider text-white/50">Hold</span>
          <span className="font-mono tabular-nums text-white/70">
            {held.toFixed(1)} / {HOLD_GOAL.toFixed(1)}s
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>
        {brokeNote && (
          <p className="mt-1.5 text-xs font-semibold text-amber-200">
            Form broke — hold paused. Reset the shape and resume.
          </p>
        )}
      </div>

      {mode === 'manual' ? (
        <div className="flex flex-col gap-2">
          {status === 'idle' && (
            <button
              type="button"
              onClick={startHold}
              className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
            >
              Start hold
            </button>
          )}
          {status === 'holding' && (
            <>
              <button
                type="button"
                onClick={pauseHold}
                className="rounded-2xl bg-white/10 px-6 py-4 text-lg font-black"
              >
                Pause
              </button>
              <button
                type="button"
                onClick={brokeForm}
                className="rounded-xl bg-amber-400/20 px-4 py-3 text-sm font-bold text-amber-200"
              >
                Broke form
              </button>
            </>
          )}
          {status === 'paused' && (
            <button
              type="button"
              onClick={resumeHold}
              className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
            >
              Resume
            </button>
          )}
        </div>
      ) : (
        <SimPanel onSignal={onSignal} />
      )}
    </div>
  )
}
