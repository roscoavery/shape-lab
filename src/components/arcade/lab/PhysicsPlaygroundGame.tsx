import { useMemo, useState } from 'react'
import { LabGameShell } from './LabGameShell'
import { PHYSICS_SCENARIOS, type PhysicsScenario } from '../../../data/arcade/physicsPlaygroundPack'

type Stage = 'predict' | 'predicted' | 'explore' | 'explained'

export function PhysicsPlaygroundGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="physics-playground"
      title="Physics Playground"
      tagline="Sliders, not textbooks. Feel how shape changes spin."
      rules={
        <>
          <p>
            Each round picks <strong>3 physics scenarios</strong>. Every scenario has two parts:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Predict (50 pts):</strong> answer the question first. A wrong first guess
              costs nothing. It is never punished.
            </li>
            <li>
              <strong>Explore (50 pts):</strong> drag the slider, then press "Play outcome" to run
              the animated demo and read the explanation.
            </li>
          </ul>
          <p className="mt-2">
            Every scenario states its assumptions up front. The demos are simple illustrative
            models. They show a relationship, not a full simulation, and they say nothing about
            any athlete's real capability.
          </p>
          <p className="mt-2 text-white/50">
            Practice note: unlimited replay. Predictions are never punished.
          </p>
        </>
      }
      whatPracticed="How shape changes rotation speed and flight. The physics behind tucks, layouts, and takeoffs."
      onExit={onExit}
    >
      {({ finish }) => <PhysicsPlaygroundPlay onFinish={finish} />}
    </LabGameShell>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function PhysicsPlaygroundPlay({ onFinish }: { onFinish: (r: { score: number; total: number; detail?: string }) => void }) {
  const scenarios = useMemo(() => shuffle(PHYSICS_SCENARIOS).slice(0, 3), [])
  const [idx, setIdx] = useState(0)
  const [stage, setStage] = useState<Stage>('predict')
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [value, setValue] = useState(scenarios[0].variable.start)
  const [played, setPlayed] = useState(false)

  const scenario = scenarios[idx]
  const total = scenarios.length * 100

  const resetScenario = (next: PhysicsScenario) => {
    setStage('predict')
    setChosen(null)
    setValue(next.variable.start)
    setPlayed(false)
  }

  const answer = (i: number) => {
    if (stage !== 'predict') return
    setChosen(i)
    if (i === scenario.answer) setScore((s) => s + 50)
    setStage('predicted')
  }

  const playOutcome = () => {
    if (stage !== 'explore') return
    setPlayed(true)
    setScore((s) => s + 50)
    setStage('explained')
  }

  const next = () => {
    if (idx + 1 >= scenarios.length) {
      onFinish({ score, total, detail: `${score} of ${total} · predictions never punished` })
      return
    }
    const n = scenarios[idx + 1]
    resetScenario(n)
    setIdx(idx + 1)
  }

  const v = scenario.variable

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          Scenario {idx + 1} of {scenarios.length} · {scenario.title}
        </span>
        <span className="font-mono font-bold tabular-nums text-[var(--text)]">
          {score} / {total}
        </span>
      </div>

      {(stage === 'predict' || stage === 'predicted') && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-black/25 p-3 text-xs leading-relaxed text-white/60">
            <span className="font-bold uppercase tracking-wider text-white/40">Assumes: </span>
            {scenario.assumptions}
          </div>
          <p className="text-base font-semibold">{scenario.question}</p>
          <div className="flex flex-col gap-2">
            {scenario.options.map((opt, i) => {
              const isAnswer = i === scenario.answer
              const isChosen = i === chosen
              let cls = 'border-white/10 bg-black/25 text-white/85'
              if (stage === 'predicted') {
                if (isAnswer) cls = 'border-emerald-400/60 bg-emerald-400/15 text-emerald-100'
                else if (isChosen) cls = 'border-white/10 bg-black/25 text-white/50'
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={stage !== 'predict'}
                  onClick={() => answer(i)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${cls}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {stage === 'predicted' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-white/60">
                {chosen === scenario.answer
                  ? 'Right. +50.'
                  : 'Not quite. No penalty, that is the point. +0.'}
              </p>
              <button
                type="button"
                onClick={() => setStage('explore')}
                className="rounded-2xl bg-[var(--accent)] px-6 py-3 text-base font-black text-black"
              >
                Explore the model
              </button>
            </div>
          )}
        </div>
      )}

      {(stage === 'explore' || stage === 'explained') && (
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-white/50">
              <span>{v.label}</span>
              <span className="font-mono font-bold tabular-nums text-[var(--text)]">
                {value} {v.unit}
              </span>
            </div>
            <input
              type="range"
              min={v.min}
              max={v.max}
              step={v.step}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>
          <Demo scenario={scenario} value={value} played={played} />
          {stage === 'explore' && (
            <button
              type="button"
              onClick={playOutcome}
              className="rounded-2xl bg-[var(--accent)] px-6 py-3 text-base font-black text-black"
            >
              Play outcome
            </button>
          )}
          {stage === 'explained' && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-black/25 p-3 text-sm leading-relaxed text-white/75">
                {scenario.explain}
              </div>
              <button
                type="button"
                onClick={next}
                className="rounded-2xl bg-[var(--accent)] px-6 py-3 text-base font-black text-black"
              >
                {idx + 1 >= scenarios.length ? 'See results' : 'Next scenario'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Demo({ scenario, value, played }: { scenario: PhysicsScenario; value: number; played: boolean }) {
  const r = scenario.compute(value)
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <style>{`@keyframes pp-spin { to { transform: rotate(360deg); } }`}</style>
      <p className="text-center font-mono text-xl font-black tabular-nums">{r.headline}</p>
      <p className="mt-0.5 text-center text-xs text-white/50">{r.sub}</p>
      <div className="mx-auto mt-2 max-w-[280px]">
        {scenario.demo.kind === 'arc' ? (
          <ArcDemo height={r.arcHeight ?? 40} durationMs={r.durationMs} played={played} />
        ) : scenario.demo.kind === 'pair' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <SpinnerFigure durationMs={r.durationMs} played={played} tuck />
              <p className="mt-1 text-center text-xs text-white/50">Tuck</p>
            </div>
            <div>
              <SpinnerFigure durationMs={r.durationMs} played={played} />
              <p className="mt-1 text-center text-xs text-white/50">Layout</p>
            </div>
          </div>
        ) : (
          <SpinnerFigure durationMs={r.durationMs} played={played} tuck />
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-white/35">
        Illustrative model. Shows the relationship, not a full simulation or any athlete's real
        capability.
      </p>
    </div>
  )
}

function SpinnerFigure({
  durationMs,
  played,
  tuck = false,
}: {
  durationMs: number
  played: boolean
  tuck?: boolean
}) {
  const animate = played && durationMs > 0
  return (
    <svg viewBox="0 0 120 120" className="w-full" role="img" aria-label="Rotating figure demo">
      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeDasharray="6 6" />
      <g
        style={
          animate
            ? {
                animation: `pp-spin ${durationMs}ms linear infinite`,
                transformBox: 'fill-box',
                transformOrigin: 'center',
              }
            : undefined
        }
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      >
        {tuck ? (
          <>
            <circle cx="60" cy="40" r="9" fill="var(--accent)" stroke="none" />
            <path d="M60 49 L60 72 M60 72 L80 58 M80 58 L68 46 M60 54 L82 60 M82 60 L72 50" />
          </>
        ) : (
          <>
            <circle cx="60" cy="28" r="9" fill="var(--accent)" stroke="none" />
            <path d="M60 37 L60 92 M60 42 L46 26 M60 42 L74 26" />
          </>
        )}
      </g>
    </svg>
  )
}

function ArcDemo({ height, durationMs, played }: { height: number; durationMs: number; played: boolean }) {
  const apex = 120 - Math.min(105, Math.max(15, height))
  const path = `M10,120 Q100,${apex} 190,120`
  return (
    <svg viewBox="0 0 200 140" className="w-full" role="img" aria-label="Flight arc demo">
      <path d={path} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeDasharray="5 5" />
      <line x1="4" y1="120" x2="196" y2="120" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <circle cx="10" cy="120" r="7" fill="var(--accent)">
        {played && <animateMotion dur={`${Math.max(300, durationMs)}ms`} repeatCount="indefinite" path={path} />}
      </circle>
    </svg>
  )
}
