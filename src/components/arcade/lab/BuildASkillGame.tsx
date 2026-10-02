import { useMemo, useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { BUILD_A_SKILL_PUZZLES, type BuildASkillPuzzle } from '../../../data/arcade/buildASkillPack'

const PUZZLES_PER_ROUND = 3

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function BuildASkillGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="build-a-skill"
      title="Build a Skill"
      tagline="Put the phases of a skill back in order."
      rules={
        <>
          <p>Tap the shuffled step cards to place them in order. Tap a placed slot to remove it.</p>
          <p>
            Check your order: right the first time is 100 points, right after a retry is 50 and
            counts as completed with help. Either way you see why the order matters.
          </p>
          <p className="font-bold">
            Puzzles teach structure. They never authorize attempting the skill.
          </p>
        </>
      }
      whatPracticed="Seeing skills as ordered phases — the prerequisite thinking behind safe progressions."
      onExit={onExit}
    >
      {({ finish }) => <BuildASkillPlay onFinish={finish} />}
    </LabGameShell>
  )
}

type Verdict = 'correct' | 'wrong'

function BuildASkillPlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const puzzles = useMemo(
    () => shuffle(BUILD_A_SKILL_PUZZLES).slice(0, PUZZLES_PER_ROUND),
    []
  )
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [helped, setHelped] = useState(0)
  const [slots, setSlots] = useState<string[]>([])
  const [attempts, setAttempts] = useState(0)
  const [verdict, setVerdict] = useState<Verdict | null>(null)

  const puzzle: BuildASkillPuzzle = puzzles[idx]
  const cards = useMemo(() => shuffle(puzzle.steps), [puzzle])

  const byId = useMemo(() => new Map(puzzle.steps.map((s) => [s.id, s])), [puzzle])

  const place = (id: string) => {
    if (verdict || slots.length >= puzzle.steps.length) return
    setSlots((s) => [...s, id])
  }

  const unplace = (i: number) => {
    if (verdict) return
    setSlots((s) => s.filter((_, k) => k !== i))
  }

  const placed = (id: string) => slots.filter((s) => s === id).length

  const check = () => {
    if (slots.length < puzzle.steps.length) return
    const right = slots.every((id, i) => puzzle.correctOrder[i] === id)
    if (right) {
      const clean = attempts === 0
      const pts = clean ? 100 : 50
      setScore((s) => s + pts)
      if (!clean) setHelped((h) => h + 1)
      setVerdict('correct')
    } else {
      setAttempts((a) => a + 1)
      setVerdict('wrong')
    }
  }

  const tryAgain = () => {
    setSlots([])
    setVerdict(null)
  }

  const next = () => {
    if (idx + 1 >= PUZZLES_PER_ROUND) {
      const total = 300
      onFinish({
        score,
        total,
        detail: `${score} of ${total} · ${helped} completed with help`,
      })
      return
    }
    setIdx((i) => i + 1)
    setSlots([])
    setAttempts(0)
    setVerdict(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/50">
        <span>
          Puzzle {idx + 1} of {PUZZLES_PER_ROUND}
        </span>
        <span className="font-mono tabular-nums normal-case tracking-normal text-white/70">
          {score} pts
        </span>
      </div>

      <div>
        <h4 className="font-bold">{puzzle.title}</h4>
        <p className="mt-0.5 text-sm text-white/60">{puzzle.intro}</p>
      </div>

      {verdict === null && (
        <>
          <div className="grid grid-cols-1 gap-1.5">
            {puzzle.steps.map((_, i) => {
              const step = byId.get(slots[i])
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => unplace(i)}
                  className={`rounded-xl border px-4 py-2.5 text-left ${
                    step
                      ? 'border-[var(--accent)]/60 bg-[var(--accent)]/10'
                      : 'border-dashed border-white/15 bg-black/20 text-white/35'
                  }`}
                >
                  <span className="mr-2 font-mono text-white/40">{i + 1}.</span>
                  <span className="font-semibold">{step ? step.label : 'Tap a card below'}</span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {cards.map((s) => {
              const used = placed(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={used >= 1}
                  onClick={() => place(s.id)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left disabled:opacity-25"
                >
                  <span className="block text-sm font-semibold">{s.label}</span>
                  <span className="block text-xs text-white/50">{s.detail}</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            disabled={slots.length < puzzle.steps.length}
            onClick={check}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 font-black text-black disabled:opacity-40"
          >
            Check order
          </button>
        </>
      )}

      {verdict === 'correct' && (
        <div className="flex flex-col gap-3">
          <p className="font-bold text-[var(--accent)]">
            {attempts === 0 ? 'Correct — 100 points.' : 'Correct with help — 50 points.'}
          </p>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Why this order
            </p>
            <p className="mt-1 text-sm text-white/80">{puzzle.explanation}</p>
          </div>
          <button
            type="button"
            onClick={next}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 font-black text-black"
          >
            {idx + 1 >= PUZZLES_PER_ROUND ? 'See results' : 'Next puzzle'}
          </button>
        </div>
      )}

      {verdict === 'wrong' && (
        <div className="flex flex-col gap-3">
          <p className="font-bold text-red-300">Not quite. Here is why the order matters:</p>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="text-sm text-white/80">{puzzle.explanation}</p>
          </div>
          <button
            type="button"
            onClick={tryAgain}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 font-black text-black"
          >
            Try again (worth 50)
          </button>
        </div>
      )}
    </div>
  )
}
