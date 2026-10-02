import { useRef, useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { ShapeFigure } from './ShapeFigure'
import { ModePicker, SimPanel, type LabInputMode, type SimSignal } from './ManualSim'
import { SHAPE_SHIFTER_SEQUENCES, type ShapeShifterSequence } from '../../../data/arcade/shapeShifterPack'

const SEQUENCES_PER_ROUND = 2

export function ShapeShifterGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="shape-shifter"
      title="Shape Shifter"
      tagline="Move between shapes in order."
      rules={
        <>
          <p className="font-semibold text-[var(--text)]">How it plays</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Pick a sequence (or surprise me). The full order is shown up top.</li>
            <li>Move through the positions one at a time — only the current step counts.</li>
            <li>
              <span className="font-semibold text-[var(--text)]">Partner confirm:</span> when you
              match the shown shape, the partner taps "Matched — next". Honest self-report works
              too.
            </li>
            <li>
              <span className="font-semibold text-[var(--text)]">Simulation:</span> the coach feeds
              scripted signals to test the game loop. Simulation earns no real practice credit.
            </li>
            <li>100 points per position, plus 100 bonus for finishing a sequence.</li>
            <li>There is no camera scoring here — the partner is the judge.</li>
          </ul>
        </>
      }
      whatPracticed="Moving between shapes in order — control through transitions, not just positions."
      onExit={onExit}
    >
      {({ finish }) => <ShapeShifterPlay onFinish={finish} />}
    </LabGameShell>
  )
}

const PLAYABLE = SHAPE_SHIFTER_SEQUENCES.filter((s) => !s.supervised)
const SUPERVISED = SHAPE_SHIFTER_SEQUENCES.filter((s) => s.supervised)

function ShapeShifterPlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const [mode, setMode] = useState<LabInputMode>('manual')
  // Completed sequence ids this round, in order. Length < 2 = still picking.
  const [doneIds, setDoneIds] = useState<string[]>([])
  const [current, setCurrent] = useState<ShapeShifterSequence | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [flag, setFlag] = useState<'none' | 'bad' | 'lost'>('none')

  const scoreRef = useRef(0)
  const doneRef = useRef<string[]>([])
  const currentRef = useRef<ShapeShifterSequence | null>(null)
  const stepRef = useRef(0)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const chooseSequence = (seq: ShapeShifterSequence) => {
    currentRef.current = seq
    setCurrent(seq)
    stepRef.current = 0
    setStepIdx(0)
    setFlag('none')
  }

  const surprise = () => {
    const already = new Set(doneRef.current)
    const pool = PLAYABLE.filter((s) => !already.has(s.id))
    const pick = (pool.length > 0 ? pool : PLAYABLE)[
      Math.floor(Math.random() * (pool.length > 0 ? pool.length : PLAYABLE.length))
    ]
    chooseSequence(pick)
  }

  const advance = () => {
    const seq = currentRef.current
    if (!seq) return
    const newScore = scoreRef.current + 100
    const lastStep = stepRef.current + 1 >= seq.shapes.length
    if (lastStep) {
      const withBonus = newScore + 100
      scoreRef.current = withBonus
      setScore(withBonus)
      const newDone = [...doneRef.current, seq.id]
      doneRef.current = newDone
      setDoneIds(newDone)
      if (newDone.length >= SEQUENCES_PER_ROUND) {
        onFinishRef.current({
          score: withBonus,
          total: SEQUENCES_PER_ROUND * 400,
          detail: `${SEQUENCES_PER_ROUND * 3} of ${SEQUENCES_PER_ROUND * 3} positions matched across ${SEQUENCES_PER_ROUND} sequences`,
        })
        return
      }
      currentRef.current = null
      setCurrent(null)
      setStepIdx(0)
      setFlag('none')
    } else {
      scoreRef.current = newScore
      setScore(newScore)
      stepRef.current += 1
      setStepIdx(stepRef.current)
      setFlag('none')
    }
  }

  const onSignal = (s: SimSignal) => {
    if (s === 'good') advance()
    else if (s === 'bad') setFlag('bad')
    else setFlag('lost')
  }

  // --- sequence pick screen (before each sequence) ----------------------
  if (!current) {
    return (
      <div className="flex flex-col gap-4">
        <ModePicker mode={mode} onMode={setMode} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Sequence {doneIds.length + 1} of {SEQUENCES_PER_ROUND}
          </p>
          <ul className="flex flex-col gap-2">
            {PLAYABLE.map((seq) => (
              <li key={seq.id}>
                <button
                  type="button"
                  onClick={() => chooseSequence(seq)}
                  className="flex w-full items-center gap-3 rounded-xl bg-black/25 px-3 py-2 text-left"
                >
                  <span className="flex shrink-0 items-center gap-1">
                    {seq.shapes.map((p, i) => (
                      <ShapeFigure key={i} pose={p.pose} className="h-12 w-auto" />
                    ))}
                  </span>
                  <span className="flex-1 text-sm font-bold text-[var(--text)]">{seq.name}</span>
                  <span className="text-xs font-semibold text-[var(--accent)]">Play</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={surprise}
            className="mt-2 w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
          >
            Surprise me
          </button>
        </div>
        {SUPERVISED.map((seq) => (
          <div
            key={seq.id}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 opacity-50"
          >
            <p className="text-sm font-bold text-white/60">{seq.name}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">
              Coach supervised only — not in the rotation
            </p>
          </div>
        ))}
      </div>
    )
  }

  // --- stepping through the current sequence -----------------------------
  const position = current.shapes[stepIdx]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          {current.name} — position {stepIdx + 1} of {current.shapes.length}
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-[var(--accent)]">
          {score} pts
        </p>
      </div>

      {/* Full ordered sequence — context, not clickable */}
      <div className="flex items-center justify-center gap-3 rounded-xl bg-black/25 px-3 py-2">
        {current.shapes.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            {i > 0 && <span className="text-white/30">→</span>}
            <div className="flex flex-col items-center">
              <ShapeFigure
                pose={p.pose}
                className={`h-14 w-auto ${i === stepIdx ? '' : 'opacity-35'}`}
              />
              <span
                className={`mt-1 text-[10px] font-bold ${
                  i === stepIdx ? 'text-[var(--accent)]' : 'text-white/40'
                }`}
              >
                {p.shapeName}
              </span>
            </div>
          </div>
        ))}
      </div>

      {flag === 'lost' ? (
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-6 text-center">
          <p className="text-lg font-black text-red-200">Step into view</p>
          <p className="mt-1 text-sm text-red-200/70">
            Tracking lost — get back in position for{' '}
            <span className="font-bold">{position.shapeName}</span>, then match it again.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-black/25 p-4 text-center">
          <ShapeFigure pose={position.pose} className="mx-auto h-44 w-auto" />
          <p className="mt-2 text-lg font-black text-[var(--text)]">{position.shapeName}</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-white/75">
            {position.cue}
          </p>
          {flag === 'bad' && (
            <p className="mt-2 text-xs font-semibold text-amber-200">
              Not quite — check the cue and match the shape again.
            </p>
          )}
        </div>
      )}

      {mode === 'manual' ? (
        <button
          type="button"
          onClick={advance}
          className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
        >
          Matched — next
        </button>
      ) : (
        <SimPanel onSignal={onSignal} />
      )}
    </div>
  )
}
