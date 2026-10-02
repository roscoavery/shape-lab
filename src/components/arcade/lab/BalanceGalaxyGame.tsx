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
import { BALANCE_GALAXY_BALANCES, type BalanceGalaxyBalance } from '../../../data/arcade/balanceGalaxyPack'

const BOUTS = 3
const BOUT_SECONDS = 8
const STARS_PER_BOUT = 4
const ROUTE_STARS = BOUTS * STARS_PER_BOUT
const MS_PER_STAR = 2000

type BoutStage = 'pick' | 'flying' | 'rest'

export function BalanceGalaxyGame({ onExit }: { onExit: () => void }) {
  return (
    <LabGameShell
      gameId="balance-galaxy"
      title="Balance Galaxy"
      tagline="Hold a steady balance to fly the route."
      rules={
        <>
          <p>
            <strong>{BOUTS} bouts</strong>, one balance each. Tap <strong>Launch</strong> for an{' '}
            <strong>{BOUT_SECONDS}-second</strong> flight — every {MS_PER_STAR / 1000} steady seconds
            earns a star (up to {STARS_PER_BOUT} per bout). <strong>{ROUTE_STARS} stars</strong> flies
            the full route.
          </p>
          <p className="mt-2">
            Sway pauses the ship — that's the game working, not failing. Both sides available;
            pick the steadier one.
          </p>
          <p className="mt-2">
            Make sure you have clear space around you and a soft surface nearby. A partner watches
            and taps <strong>Wobble — pause</strong> when the balance breaks.
          </p>
        </>
      }
      whatPracticed="Steady balances that travel — control you can feel."
      onExit={onExit}
    >
      {({ finish }) => <BalanceGalaxyPlay onFinish={finish} />}
    </LabGameShell>
  )
}

function BalanceGalaxyPlay({ onFinish }: { onFinish: (r: LabGameResult) => void }) {
  const [mode, setMode] = useState<LabInputMode>('manual')
  const [stage, setStage] = useState<BoutStage>('pick')
  const [bout, setBout] = useState(0)
  const [balanceId, setBalanceId] = useState(BALANCE_GALAXY_BALANCES[0].id)
  const [side, setSide] = useState<'left' | 'right'>('right')
  const [steady, setSteady] = useState(true)
  const [lostView, setLostView] = useState(false)
  const [validMs, setValidMs] = useState(0)
  const [totalStars, setTotalStars] = useState(0)
  const [lastBoutStars, setLastBoutStars] = useState(0)
  const { left, running, start, reset: resetClock } = useCountdown(BOUT_SECONDS)

  const balance: BalanceGalaxyBalance =
    BALANCE_GALAXY_BALANCES.find((b) => b.id === balanceId) ?? BALANCE_GALAXY_BALANCES[0]
  const starsThisBout = Math.min(STARS_PER_BOUT, Math.floor(validMs / MS_PER_STAR))
  const last = bout === BOUTS - 1

  // Accrue valid flight time only while the clock runs and the balance holds.
  useEffect(() => {
    if (stage !== 'flying' || !running || !steady) return
    const id = window.setInterval(() => setValidMs((v) => v + 250), 250)
    return () => window.clearInterval(id)
  }, [stage, running, steady])

  // Bout clock ran out — bank the stars.
  useEffect(() => {
    if (stage !== 'flying' || running || left > 0) return
    const stars = Math.min(STARS_PER_BOUT, Math.floor(validMs / MS_PER_STAR))
    const nextTotal = totalStars + stars
    setTotalStars(nextTotal)
    setLastBoutStars(stars)
    setStage('rest')
    if (last) {
      onFinish({
        score: nextTotal,
        total: ROUTE_STARS,
        detail: `${nextTotal} of ${ROUTE_STARS} stars across ${BOUTS} bouts`,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, running, left])

  const launch = () => {
    setValidMs(0)
    setSteady(true)
    setLostView(false)
    resetClock()
    setStage('flying')
    start(BOUT_SECONDS)
  }

  const nextBout = () => {
    setBout((b) => b + 1)
    setValidMs(0)
    setSteady(true)
    setLostView(false)
    setStage('pick')
  }

  const wobble = () => setSteady(false)
  const recover = () => {
    setSteady(true)
    setLostView(false)
  }

  const onSignal = (s: SimSignal) => {
    if (stage !== 'flying') return
    if (s === 'good') {
      recover()
    } else if (s === 'bad') {
      setSteady(false)
    } else {
      setSteady(false)
      setLostView(true)
    }
  }

  const routePct = Math.min(100, (totalStars / ROUTE_STARS) * 100)

  return (
    <div className="mt-4 flex flex-col gap-4">
      <ModePicker mode={mode} onMode={setMode} />

      {/* Spaceship route: fills with stars, 12 = full route. */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-white/50">
          <span>Route to the stars</span>
          <span className="font-mono font-bold tabular-nums text-[var(--text)]">
            {totalStars} / {ROUTE_STARS}
          </span>
        </div>
        <div className="relative h-4 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-amber-300 transition-all duration-500"
            style={{ width: `${routePct}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: `${routePct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <span>
          Bout {Math.min(bout + 1, BOUTS)} of {BOUTS}
        </span>
      </div>

      {stage === 'pick' && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              The balance
            </p>
            <div className="grid grid-cols-2 gap-2">
              {BALANCE_GALAXY_BALANCES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBalanceId(b.id)}
                  className={`rounded-xl px-4 py-3 text-sm font-bold ${
                    balanceId === b.id ? 'bg-[var(--accent)] text-black' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {b.shapeName}
                </button>
              ))}
            </div>
          </div>

          {balance.sides && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                Side — pick the steadier one
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['left', 'right'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={`rounded-xl px-4 py-3 text-sm font-bold capitalize ${
                      side === s ? 'bg-[var(--accent)] text-black' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-black/25 p-3">
            <ShapeFigure pose={balance.pose} className="mx-auto h-36 w-auto" />
            <p className="mt-2 text-center text-sm font-bold text-[var(--text)]">
              {balance.shapeName}
              {balance.sides ? ` — ${side} side` : ''}
            </p>
            <p className="mt-1 text-center text-sm text-white/65">{balance.cue}</p>
          </div>

          <button
            type="button"
            onClick={launch}
            className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black active:scale-95"
          >
            Launch — {BOUT_SECONDS} seconds
          </button>
        </div>
      )}

      {stage === 'flying' && (
        <div className="flex flex-col gap-3">
          <BoutClock left={left} urgentAt={3} />
          <p className="text-center text-sm font-bold text-white/70">
            {balance.shapeName}
            {balance.sides ? ` — ${side} side` : ''}
          </p>

          {/* Stars earned this bout so far. */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: STARS_PER_BOUT }).map((_, i) => (
              <span
                key={i}
                className={`text-2xl ${i < starsThisBout ? 'text-amber-300' : 'text-white/20'}`}
                aria-hidden
              >
                ★
              </span>
            ))}
          </div>

          {!steady && (
            <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-center">
              <p className="text-sm font-bold text-amber-200">
                {lostView ? 'Step into view, then steady up to keep flying.' : 'Wobble — ship paused.'}
              </p>
            </div>
          )}

          {mode === 'manual' ? (
            steady ? (
              <button
                type="button"
                onClick={wobble}
                className="rounded-2xl bg-white/10 px-6 py-4 text-base font-black text-white/80 active:scale-95"
              >
                Wobble — pause
              </button>
            ) : (
              <button
                type="button"
                onClick={recover}
                className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-base font-black text-black active:scale-95"
              >
                Steady — resume
              </button>
            )
          ) : (
            <SimPanel onSignal={onSignal} />
          )}
        </div>
      )}

      {stage === 'rest' && !last && (
        <div className="rounded-xl border border-white/15 bg-black/30 p-4 text-center">
          <p className="text-sm font-black text-[var(--text)]">
            Bout {bout + 1} done — {lastBoutStars} of {STARS_PER_BOUT} stars.
          </p>
          <p className="mt-1 text-sm text-white/60">
            Rest, shake it out, breathe. Pick your next balance when you're ready.
          </p>
          <button
            type="button"
            onClick={nextBout}
            className="mt-3 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-black"
          >
            Next bout
          </button>
        </div>
      )}
    </div>
  )
}
