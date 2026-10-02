import { useEffect, useState } from 'react'
import { LabGameShell } from './LabGameShell'
import { BoutClock, ModePicker, SimPanel, useCountdown, type LabInputMode, type SimSignal } from './ManualSim'
import { STICK_LAB_DRILLS } from '../../../data/arcade/stickLabPack'

const ATTEMPTS = 3
const POINTS_PER_STICK = 100
const STABILITY_SECONDS = 3

export function StickLabGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="stick-lab"
      title="Stick Lab"
      tagline="Land it. Freeze it. Three low-impact attempts."
      rules={
        <>
          <p>
            Pick a landing drill and take {ATTEMPTS} attempts. Land, freeze, then the partner
            starts a {STABILITY_SECONDS}-second stability countdown. Hold the freeze — the clock
            is measuring stillness, nothing else.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              When the countdown ends, the partner taps <strong>Stuck it</strong> (100 pts) or{' '}
              <strong>Didn't stick</strong> (0 — "reset and try again", no shame).
            </li>
            <li>
              Shake it out between attempts. Low-impact drills only here — no flips, no height.
            </li>
            <li>
              <strong>
                The game scores stillness after landing — it can't judge landing force or safety.
                Coach's eyes do that.
              </strong>
            </li>
            <li>
              Simulation mode is for testing the game loop only — it earns no real credit.
            </li>
          </ul>
        </>
      }
      whatPracticed="Freezing the landing — stillness is a skill."
      onExit={onExit}
    >
      {({ finish }) => <StickLabPlay onFinish={finish} />}
    </LabGameShell>
  )
}

type AttemptPhase = 'ready' | 'counting' | 'judging' | 'rest'

function StickLabPlay({
  onFinish,
}: {
  onFinish: (r: { score: number; total: number; detail?: string }) => void
}) {
  const [mode, setMode] = useState<LabInputMode>('manual')
  const [drillId, setDrillId] = useState(STICK_LAB_DRILLS[0].id)
  const [configured, setConfigured] = useState(false)
  const [attemptIdx, setAttemptIdx] = useState(0)
  const [results, setResults] = useState<('stuck' | 'missed')[]>([])
  const [phase, setPhase] = useState<AttemptPhase>('ready')
  const [simPaused, setSimPaused] = useState(false)

  const cd = useCountdown(STABILITY_SECONDS)
  const drill = STICK_LAB_DRILLS.find((d) => d.id === drillId) ?? STICK_LAB_DRILLS[0]
  const score = results.filter((r) => r === 'stuck').length * POINTS_PER_STICK

  // Manual mode: when the stability window closes, move to partner judgment.
  useEffect(() => {
    if (configured && phase === 'counting' && mode === 'manual' && !cd.running && cd.left === 0) {
      setPhase('judging')
    }
  }, [configured, phase, mode, cd.running, cd.left])

  const startAttempt = () => {
    setSimPaused(false)
    cd.start(STABILITY_SECONDS)
    setPhase('counting')
  }

  const judge = (stuck: boolean) => {
    cd.reset()
    setSimPaused(false)
    const next = [...results, stuck ? ('stuck' as const) : ('missed' as const)]
    setResults(next)
    if (next.length >= ATTEMPTS) {
      const finalScore = next.filter((r) => r === 'stuck').length * POINTS_PER_STICK
      onFinish({
        score: finalScore,
        total: ATTEMPTS * POINTS_PER_STICK,
        detail: `${finalScore / POINTS_PER_STICK} of ${ATTEMPTS} landings stuck — ${drill.name}${
          mode === 'sim' ? ' (simulation — no real credit)' : ''
        }`,
      })
      return
    }
    setPhase('rest')
  }

  const nextAttempt = () => {
    setAttemptIdx((i) => i + 1)
    setPhase('ready')
  }

  const onSignal = (s: SimSignal) => {
    if (phase !== 'counting') return
    if (s === 'good') judge(true)
    else if (s === 'bad') judge(false)
    else {
      cd.pause()
      setSimPaused(true)
    }
  }

  if (!configured) {
    return (
      <div className="flex flex-col gap-4">
        <ModePicker mode={mode} onMode={setMode} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Landing drill
          </p>
          <div className="flex flex-col gap-2">
            {STICK_LAB_DRILLS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDrillId(d.id)}
                className={`rounded-xl border px-4 py-3 text-left ${
                  d.id === drillId
                    ? 'border-[var(--accent)] bg-[var(--accent)]/15'
                    : 'border-white/10 bg-black/20'
                }`}
              >
                <p className="text-sm font-bold text-[var(--text)]">{d.name}</p>
                <p className="mt-0.5 text-xs text-white/55">{d.setup}</p>
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfigured(true)}
          className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
        >
          Set up the mat
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          {drill.name} — attempt {Math.min(attemptIdx + 1, ATTEMPTS)} of {ATTEMPTS}
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-[var(--accent)]">
          {score} pts
        </p>
      </div>

      {phase === 'ready' && (
        <div className="flex flex-col gap-3 rounded-xl bg-black/25 p-4">
          <p className="text-sm text-white/70">{drill.setup}</p>
          <p className="text-sm font-semibold text-[var(--text)]">
            Land the drill and freeze — then start the {STABILITY_SECONDS}-second stillness check.
          </p>
          <button
            type="button"
            onClick={startAttempt}
            className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
          >
            Start attempt
          </button>
        </div>
      )}

      {phase === 'counting' && (
        <div className="flex flex-col gap-3">
          <BoutClock left={cd.left} urgentAt={1} />
          <p className="text-center text-sm text-white/60">
            {simPaused ? 'Paused — step into view, then resume.' : 'Freeze… stay still.'}
          </p>
          {mode === 'sim' &&
            (simPaused ? (
              <button
                type="button"
                onClick={() => {
                  cd.resume()
                  setSimPaused(false)
                }}
                className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
              >
                Resume
              </button>
            ) : (
              <SimPanel onSignal={onSignal} />
            ))}
        </div>
      )}

      {phase === 'judging' && (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-semibold text-[var(--text)]">
            {STABILITY_SECONDS} seconds up — did it stick?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => judge(true)}
              className="rounded-2xl bg-emerald-400 px-4 py-4 text-lg font-black text-black"
            >
              Stuck it
            </button>
            <button
              type="button"
              onClick={() => judge(false)}
              className="rounded-2xl bg-white/10 px-4 py-4 text-lg font-black text-white/80"
            >
              Didn't stick
            </button>
          </div>
          <p className="text-center text-xs text-white/45">
            A miss is just "reset and try again".
          </p>
        </div>
      )}

      {phase === 'rest' && (
        <div className="flex flex-col gap-3 rounded-xl bg-black/25 p-4 text-center">
          <p className="text-sm font-semibold text-[var(--text)]">
            {results[results.length - 1] === 'stuck'
              ? 'Stuck. Nice freeze.'
              : "Didn't stick — reset and try again."}
          </p>
          <p className="text-sm text-white/60">Shake it out. Next attempt when ready.</p>
          <button
            type="button"
            onClick={nextAttempt}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-black"
          >
            Next attempt
          </button>
        </div>
      )}
    </div>
  )
}
