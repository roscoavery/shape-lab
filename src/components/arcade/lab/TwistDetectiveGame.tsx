import { useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { ShapeFigure, type Facing, type FigurePose, type FigureView } from './ShapeFigure'
import {
  TWIST_DETECTIVE_PUZZLES,
  type TwistDetectivePuzzle,
} from '../../../data/arcade/twistDetectivePack'

const ROUNDS = 6
const TOTAL = 600

/** Fisher-Yates shuffle. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const TWIST_POSE: FigurePose = {
  arms: 't',
  knees: 'straight',
  back: 'flat',
  head: 'neutral',
  feet: 'together',
}

type Round = {
  puzzle: TwistDetectivePuzzle
  options: string[]
  answerIdx: number
}

function startFigure(p: TwistDetectivePuzzle): { view: FigureView; facing: Facing } {
  if (p.startView === 'top') return { view: 'top', facing: p.startFacing ?? 'up' }
  if (p.startView === 'left') return { view: 'side', facing: 'left' }
  if (p.startView === 'right') return { view: 'side', facing: 'right' }
  return { view: p.startView, facing: 'right' }
}

function optionFigure(label: string): { view: FigureView; facing: Facing } {
  if (label === 'Back') return { view: 'back', facing: 'right' }
  if (label === 'Left side') return { view: 'side', facing: 'left' }
  if (label === 'Right side') return { view: 'side', facing: 'right' }
  return { view: 'front', facing: 'right' }
}

export function TwistDetectiveGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="twist-detective"
      title="Twist Detective"
      tagline="Track which way she faces — from any viewpoint."
      rules={
        <>
          <p>
            You get <strong>{ROUNDS} puzzles</strong> per round. Maya starts in a shown view, makes
            a turn, and you pick which way she faces now.
          </p>
          <p className="mt-2">
            Use the wrist dots: <strong className="text-[#60a5fa]">blue = her left</strong>,{' '}
            <strong className="text-[#4ade80]">green = her right</strong>. Her left and right never
            change — the camera does.
          </p>
          <p className="mt-2">
            <strong>100 points</strong> per correct answer. Orientation puzzles only — this doesn't
            teach you how to initiate a twist in the air.
          </p>
        </>
      }
      whatPracticed="Tracking orientation and twist direction from any viewpoint — the mental model behind clean twisting."
      onExit={onExit}
    >
      {({ finish }) => <TwistDetectivePlay onFinish={finish} />}
    </LabGameShell>
  )
}

function TwistDetectivePlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const [rounds] = useState<Round[]>(() =>
    shuffled(TWIST_DETECTIVE_PUZZLES)
      .slice(0, ROUNDS)
      .map((puzzle) => {
        const order = shuffled(puzzle.options.map((_, i) => i))
        return {
          puzzle,
          options: order.map((i) => puzzle.options[i]),
          answerIdx: order.indexOf(puzzle.answer),
        }
      })
  )
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)

  const round = rounds[index]
  const last = index === rounds.length - 1
  const start = startFigure(round.puzzle)

  const choose = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (i === round.answerIdx) {
      setScore((s) => s + 100)
      setCorrect((n) => n + 1)
    }
  }

  const next = () => {
    if (last) {
      onFinish({ score, total: TOTAL, detail: `${correct} of ${ROUNDS} orientations tracked` })
    } else {
      setIndex((i) => i + 1)
      setPicked(null)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          Puzzle {index + 1} of {rounds.length}
        </span>
        <span className="font-mono font-bold tabular-nums text-[var(--text)]">{score} pts</span>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/60">
        <span className="inline-block h-3 w-3 rounded-full bg-[#60a5fa]" />
        <span>Her left</span>
        <span className="inline-block h-3 w-3 rounded-full bg-[#4ade80]" />
        <span>Her right</span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          {round.puzzle.startLabel}
        </p>
        <ShapeFigure
          pose={TWIST_POSE}
          view={start.view}
          facing={start.facing}
          markers
          className={`mx-auto w-auto ${start.view === 'top' ? 'h-32' : 'h-44'}`}
        />
        <p className="mt-2 text-center text-sm text-white/80">
          She makes <strong className="text-[var(--text)]">{round.puzzle.rotation}</strong>.
        </p>
        <p className="mt-1 text-center text-base font-bold text-[var(--text)]">
          {round.puzzle.question}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {round.options.map((label, i) => {
          const fig = optionFigure(label)
          const isAnswer = i === round.answerIdx
          const isPick = i === picked
          const border =
            picked === null
              ? 'border-white/10'
              : isAnswer
                ? 'border-[var(--accent)]'
                : isPick
                  ? 'border-red-400/70'
                  : 'border-white/10 opacity-50'
          return (
            <button
              key={label}
              type="button"
              onClick={() => choose(i)}
              disabled={picked !== null}
              className={`rounded-2xl border bg-black/30 p-2 transition ${border} ${
                picked === null ? 'active:scale-95' : ''
              }`}
            >
              <ShapeFigure pose={TWIST_POSE} view={fig.view} facing={fig.facing} className="mx-auto h-24 w-auto" />
              <p className="mt-1 text-center text-xs font-bold text-white/70">{label}</p>
            </button>
          )
        })}
      </div>

      {picked !== null && (
        <div
          className={`rounded-xl border p-3 ${
            picked === round.answerIdx
              ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10'
              : 'border-red-400/30 bg-red-400/10'
          }`}
        >
          <p className="text-sm font-black text-[var(--text)]">
            {picked === round.answerIdx
              ? 'Correct — 100 points.'
              : `Not quite — the answer was ${round.options[round.answerIdx]}.`}
          </p>
          <p className="mt-1 text-sm text-white/70">{round.puzzle.explanation}</p>
          <button
            type="button"
            onClick={next}
            className="mt-3 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-black"
          >
            {last ? 'See results' : 'Next puzzle'}
          </button>
        </div>
      )}
    </div>
  )
}
