import { useMemo, useState } from 'react'
import { LabGameShell, type LabGameResult } from './LabGameShell'
import { COACHES_EYE_SCENARIOS } from '../../../data/arcade/coachesEyePack'

const SCENARIOS_PER_ROUND = 5
const POINTS_PER_SCENARIO = 100

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function CoachesEyePlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const scenarios = useMemo(
    () => shuffle(COACHES_EYE_SCENARIOS).slice(0, SCENARIOS_PER_ROUND),
    []
  )
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)

  const scenario = scenarios[index]
  const last = index === scenarios.length - 1
  const revealed = picked !== null
  const isRight = picked !== null && scenario.accepted.includes(picked)

  const choose = (i: number) => {
    if (revealed) return
    setPicked(i)
    if (scenario.accepted.includes(i)) setCorrect((c) => c + 1)
  }

  const next = () => {
    if (last) {
      onFinish({
        score: correct * POINTS_PER_SCENARIO,
        total: SCENARIOS_PER_ROUND * POINTS_PER_SCENARIO,
        detail: `${correct} of ${SCENARIOS_PER_ROUND} coach's calls matched`,
      })
      return
    }
    setIndex((i) => i + 1)
    setPicked(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Scenario {index + 1} of {scenarios.length}
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-[var(--accent)]">
          {correct * POINTS_PER_SCENARIO} pts
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          {scenario.title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/85">{scenario.context}</p>
        <p className="mt-3 text-base font-bold text-[var(--text)]">{scenario.question}</p>

        <div className="mt-3 flex flex-col gap-2">
          {scenario.options.map((opt, i) => {
            const accepted = scenario.accepted.includes(i)
            const chosen = picked === i
            let cls = 'border-white/10 bg-black/25 text-white/85'
            if (revealed && accepted) cls = 'border-[var(--accent)] bg-[var(--accent)]/15 text-white'
            else if (revealed && chosen) cls = 'border-red-400/50 bg-red-400/10 text-red-200'
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(i)}
                disabled={revealed}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${cls} ${
                  revealed ? '' : 'active:scale-[0.99]'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {revealed && (
          <div className="mt-4 flex flex-col gap-3">
            <p
              className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                isRight ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-white/10 text-white/70'
              }`}
            >
              {isRight
                ? "That's the coach's call. 100 points."
                : 'Not the first priority this time.'}
            </p>
            <div className="rounded-xl bg-black/25 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                Why this first
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/80">{scenario.rationale}</p>
              {scenario.drill && (
                <p className="mt-2 text-xs text-white/50">
                  Follow-up drill: <span className="font-semibold text-white/75">{scenario.drill}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={next}
              className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
            >
              {last ? 'See results' : 'Next scenario'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function CoachesEyeGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="coachs-eye"
      title="Coach's Eye"
      tagline="See the scene. Call the correction that matters first."
      rules={
        <>
          <p className="font-semibold text-white/90">How to play</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Read the scene. A real gym moment.</li>
            <li>Pick the ONE thing you would focus on first. 100 points if it matches the coach's call.</li>
            <li>Every scenario has one priority answer; the rationale explains why it comes first.</li>
            <li>Five scenarios per round. No physical activity needed. Play it anywhere.</li>
          </ul>
        </>
      }
      whatPracticed="Prioritizing corrections. Seeing what matters first, the way a coach does."
      onExit={onExit}
    >
      {({ finish }) => <CoachesEyePlay onFinish={finish} />}
    </LabGameShell>
  )
}
