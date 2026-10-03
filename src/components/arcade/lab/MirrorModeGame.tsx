import { useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { ShapeFigure } from './ShapeFigure'
import { ModePicker, SimPanel, type LabInputMode, type SimSignal } from './ManualSim'
import { MIRROR_MODE_PROMPTS, type MirrorPrompt } from '../../../data/arcade/mirrorModePack'

const PROMPTS_PER_ROUND = 6
const POINTS = 100
const TOTAL = PROMPTS_PER_ROUND * POINTS

type Convention = 'mirror' | 'same-side'

/** Fisher-Yates shuffle. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function MirrorModeGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="mirror-mode"
      title="Mirror Mode"
      tagline="Copy the avatar's position. Exactly."
      rules={
        <>
          <p>
            The avatar shows you <strong>{PROMPTS_PER_ROUND} positions</strong> per round. Get into
            the position, hold it, and confirm the match. <strong>{POINTS} points</strong> each.
          </p>
          <p className="mt-2">
            Pick your convention first: <strong>mirror the avatar</strong> (like a mirror image) or{' '}
            <strong>same side</strong> (her right is your right). The blue dot is her left wrist,
            the green dot is her right.
          </p>
          <p className="mt-2">No rushing, no camera scoring. Precision is the whole game.</p>
        </>
      }
      whatPracticed="Copying positions precisely. The observation skill behind fast learning."
      onExit={onExit}
    >
      {({ finish }) => <MirrorModePlay onFinish={finish} />}
    </LabGameShell>
  )
}

function MirrorModePlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const [prompts] = useState<MirrorPrompt[]>(() =>
    shuffled(MIRROR_MODE_PROMPTS).slice(0, PROMPTS_PER_ROUND)
  )
  const [mode, setMode] = useState<LabInputMode>('manual')
  const [convention, setConvention] = useState<Convention>('mirror')
  const [begun, setBegun] = useState(false)
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [tipReplay, setTipReplay] = useState(false)
  const [lostView, setLostView] = useState(false)

  const prompt = prompts[index]
  const last = index === prompts.length - 1
  const conventionText = convention === 'mirror' ? 'Copy as a mirror' : 'Copy same-side'

  const advance = () => {
    const nextScore = score + POINTS
    setScore(nextScore)
    if (last) {
      onFinish({
        score: nextScore,
        total: TOTAL,
        detail: `${nextScore / POINTS} of ${PROMPTS_PER_ROUND} positions matched`,
      })
    } else {
      setIndex((i) => i + 1)
      setTipReplay(false)
      setLostView(false)
    }
  }

  const onSignal = (s: SimSignal) => {
    if (s === 'good') {
      advance()
    } else if (s === 'bad') {
      setTipReplay(true)
    } else {
      setLostView(true)
    }
  }

  if (!begun) {
    return (
      <div className="mt-4 flex flex-col gap-4">
        <ModePicker mode={mode} onMode={setMode} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Copy convention
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'mirror', label: 'Mirror the avatar' },
                { id: 'same-side', label: 'Same side as avatar' },
              ] as const
            ).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setConvention(c.id)}
                className={`rounded-xl px-4 py-3 text-sm font-bold ${
                  convention === c.id ? 'bg-[var(--accent)] text-black' : 'bg-white/10 text-white/70'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-white/45">
            {convention === 'mirror'
              ? 'Copy as a mirror. Her right (green dot) is on your left.'
              : 'Copy same-side. Her right (green dot) is on your right.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBegun(true)}
          className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
        >
          Start copying: {PROMPTS_PER_ROUND} positions
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          Position {index + 1} of {prompts.length}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 font-bold text-white/70">
          {conventionText}
        </span>
        <span className="font-mono font-bold tabular-nums text-[var(--text)]">{score} pts</span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <ShapeFigure pose={prompt.pose} markers className="mx-auto h-52 w-auto" />
        <p className="mt-3 text-center text-lg font-black text-[var(--text)]">{prompt.label}</p>
      </div>

      <div
        className={`rounded-xl p-3 ${
          tipReplay
            ? 'border border-[var(--accent)]/50 bg-[var(--accent)]/10'
            : 'bg-black/25'
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-white/45">
          {tipReplay ? 'Look again. The detail' : 'The detail'}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-white/85">{prompt.tip}</p>
      </div>

      <p className="text-xs text-white/45">
        Blue dot = her left wrist · Green dot = her right wrist · {conventionText}
      </p>

      {lostView && (
        <div className="rounded-xl border border-red-300/30 bg-red-300/10 p-3">
          <p className="text-sm font-bold text-red-200">
            Step into view, then signal a good match to continue.
          </p>
        </div>
      )}

      {mode === 'manual' ? (
        <button
          type="button"
          onClick={advance}
          className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black active:scale-95"
        >
          Matched. Next
        </button>
      ) : (
        <SimPanel onSignal={onSignal} />
      )}
    </div>
  )
}
