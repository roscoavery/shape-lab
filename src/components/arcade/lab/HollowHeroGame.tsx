import { useEffect, useState } from 'react'
import { LabGameShell } from './LabGameShell'
import { BoutClock, ModePicker, SimPanel, useCountdown, type LabInputMode, type SimSignal } from './ManualSim'
import { HOLLOW_HERO_PRESETS } from '../../../data/arcade/hollowHeroPack'

const VARIATIONS = [
  { id: 'hollow-arms-down', label: 'Hollow (arms down)' },
  { id: 'tucked-hollow', label: 'Tucked hollow — less demanding' },
]

export function HollowHeroGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="hollow-hero"
      title="Hollow Hero"
      tagline="Charge the hollow in short, honest bouts."
      rules={
        <>
          <p>
            Pick a preset and a hollow variation, then work through the bouts. Hold the shape
            while the clock runs — <strong>1 energy for every completed second</strong>, up to
            the bout goal.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>
                Short bouts with real rests. This is not a hold-to-failure contest — stop if form
                goes.
              </strong>
            </li>
            <li>
              Partner taps <strong>Pause — form broke</strong> the moment the shape goes, then{' '}
              <strong>Resume</strong> when it's set again. Earned energy is never drained by
              resting or pausing.
            </li>
            <li>
              The meter is labeled <strong>Stillness</strong> on purpose — a timer can't measure
              muscle work or safety. Your partner's eyes do that.
            </li>
            <li>
              Simulation mode is for testing the game loop only — it earns no real credit.
            </li>
          </ul>
        </>
      }
      whatPracticed="Charging the hollow in short, honest bouts — control over endurance."
      onExit={onExit}
    >
      {({ finish }) => <HollowHeroPlay onFinish={finish} />}
    </LabGameShell>
  )
}

type BoutPhase = 'ready' | 'holding' | 'resting'

function HollowHeroPlay({
  onFinish,
}: {
  onFinish: (r: { score: number; total: number; detail?: string }) => void
}) {
  const [mode, setMode] = useState<LabInputMode>('manual')
  const [presetId, setPresetId] = useState(HOLLOW_HERO_PRESETS[0].id)
  const [variationId, setVariationId] = useState(VARIATIONS[0].id)
  const [configured, setConfigured] = useState(false)
  const [boutIdx, setBoutIdx] = useState(0)
  const [phase, setPhase] = useState<BoutPhase>('ready')
  const [banked, setBanked] = useState(0)
  // Sim-mode bout state (signal-driven, no real timer).
  const [simLeft, setSimLeft] = useState(0)
  const [simEarned, setSimEarned] = useState(0)
  const [simPaused, setSimPaused] = useState(false)
  const [pauseNote, setPauseNote] = useState('')

  const preset = HOLLOW_HERO_PRESETS.find((p) => p.id === presetId) ?? HOLLOW_HERO_PRESETS[0]
  const variation = VARIATIONS.find((v) => v.id === variationId) ?? VARIATIONS[0]

  const cd = useCountdown(preset.seconds)
  const rest = useCountdown(preset.restSeconds)

  const total = preset.bouts * preset.seconds
  const earnedThisBout = mode === 'manual' ? preset.seconds - cd.left : simEarned
  const energy = banked + (phase === 'holding' ? Math.min(earnedThisBout, preset.seconds) : 0)
  const pct = total > 0 ? Math.round((energy / total) * 100) : 0

  const completeBout = () => {
    cd.reset()
    const finalBanked = banked + preset.seconds
    setBanked(finalBanked)
    setSimPaused(false)
    if (boutIdx + 1 >= preset.bouts) {
      onFinish({
        score: finalBanked,
        total,
        detail: `shield charged ${Math.round((finalBanked / total) * 100)}%${
          mode === 'sim' ? ' (simulation — no real credit)' : ''
        }`,
      })
      return
    }
    rest.start(preset.restSeconds)
    setPhase('resting')
  }

  // Manual mode: the bout ends when the countdown reaches zero.
  useEffect(() => {
    if (configured && phase === 'holding' && mode === 'manual' && !cd.running && cd.left === 0) {
      completeBout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, phase, mode, cd.running, cd.left])

  // Rest ends -> next bout is ready.
  useEffect(() => {
    if (configured && phase === 'resting' && !rest.running && rest.left === 0) {
      setBoutIdx((i) => i + 1)
      setPhase('ready')
    }
  }, [configured, phase, rest.running, rest.left])

  const startBout = () => {
    setSimLeft(preset.seconds)
    setSimEarned(0)
    setSimPaused(false)
    setPauseNote('')
    if (mode === 'manual') cd.start(preset.seconds)
    setPhase('holding')
  }

  const skipRest = () => {
    rest.reset()
    setBoutIdx((i) => i + 1)
    setPhase('ready')
  }

  const onSignal = (s: SimSignal) => {
    if (phase !== 'holding') return
    if (s === 'good') {
      if (simPaused) {
        setSimPaused(false)
        return
      }
      const next = Math.min(simEarned + 1, preset.seconds)
      setSimEarned(next)
      setSimLeft(preset.seconds - next)
      if (next >= preset.seconds) completeBout()
    } else {
      setSimPaused(true)
      setPauseNote(
        s === 'lost' ? 'Step into view, then resume.' : 'Form check — reset the shape, then resume.'
      )
    }
  }

  if (!configured) {
    return (
      <div className="flex flex-col gap-4">
        <ModePicker mode={mode} onMode={setMode} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Preset
          </p>
          <div className="flex flex-col gap-2">
            {HOLLOW_HERO_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                className={`rounded-xl border px-4 py-3 text-left ${
                  p.id === presetId
                    ? 'border-[var(--accent)] bg-[var(--accent)]/15'
                    : 'border-white/10 bg-black/20'
                }`}
              >
                <p className="text-sm font-bold text-[var(--text)]">{p.name}</p>
                <p className="mt-0.5 text-xs text-white/55">
                  {p.bouts} bouts × {p.seconds}s · {p.restSeconds}s rest
                </p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Variation
          </p>
          <select
            value={variationId}
            onChange={(e) => setVariationId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base font-semibold"
          >
            {VARIATIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setConfigured(true)}
          className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
        >
          Start the circuit
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
          {variation.label} — bout {Math.min(boutIdx + 1, preset.bouts)} of {preset.bouts}
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-[var(--accent)]">
          {energy} / {total}
        </p>
      </div>

      <div>
        <div className="h-3 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-center text-xs text-white/50">
          Shield charged {pct}% · Stillness meter — rests never drain it
        </p>
      </div>

      {phase === 'ready' && (
        <div className="flex flex-col gap-3 rounded-xl bg-black/25 p-4 text-center">
          <p className="text-sm text-white/70">
            Set the {variation.label.toLowerCase()} — lower back down, shape locked.
          </p>
          <button
            type="button"
            onClick={startBout}
            className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
          >
            Start bout — {preset.seconds}s
          </button>
        </div>
      )}

      {phase === 'holding' && (
        <div className="flex flex-col gap-3">
          <BoutClock left={mode === 'manual' ? cd.left : simLeft} urgentAt={2} />
          {mode === 'manual' ? (
            cd.running ? (
              <button
                type="button"
                onClick={cd.pause}
                className="rounded-xl bg-amber-300/15 px-4 py-3 text-sm font-bold text-amber-200"
              >
                Pause — form broke
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-center text-sm text-white/60">
                  Paused. Reset the shape before resuming.
                </p>
                <button
                  type="button"
                  onClick={cd.resume}
                  className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
                >
                  Resume
                </button>
              </div>
            )
          ) : simPaused ? (
            <div className="flex flex-col gap-2">
              <p className="text-center text-sm text-white/60">{pauseNote}</p>
              <button
                type="button"
                onClick={() => setSimPaused(false)}
                className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
              >
                Resume
              </button>
            </div>
          ) : (
            <SimPanel onSignal={onSignal} />
          )}
        </div>
      )}

      {phase === 'resting' && (
        <div className="flex flex-col gap-3 rounded-xl bg-black/25 p-4 text-center">
          <p className="text-sm font-semibold text-[var(--text)]">Bout banked. Rest.</p>
          <BoutClock left={rest.left} urgentAt={3} />
          <button
            type="button"
            onClick={skipRest}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
          >
            Skip rest
          </button>
        </div>
      )}
    </div>
  )
}
