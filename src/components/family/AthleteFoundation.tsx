import { useState } from 'react'
import type { Athlete } from '../../types'
import { FOUNDATION_FACTS_DRAFT } from '../../config/foundationFacts'
import { AthleteChallengeFlow } from './AthleteChallengeFlow'

/**
 * "Strengthen your foundation" — conditioning that athletes are driven
 * to do because they understand the benefits. Amber identity (foundations).
 *
 * v1: benefit-facts shuffle deck (DRAFT copy — Ryan approves every line)
 * + entry to challenges (next). The deck is swipeable / tappable,
 * user-paced.
 */

const AMBER_GLOW = '0 0 14px rgba(251,191,36,0.4), 0 0 36px rgba(251,191,36,0.18)'

export function AthleteFoundation({ athlete }: { athlete: Athlete }) {
  const facts = FOUNDATION_FACTS_DRAFT
  const [idx, setIdx] = useState(0)
  const [touchX, setTouchX] = useState<number | null>(null)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const fact = facts[idx]!

  const next = () => setIdx((i) => (i + 1) % facts.length)
  const prev = () => setIdx((i) => (i - 1 + facts.length) % facts.length)
  const shuffle = () => {
    let n = idx
    while (n === idx && facts.length > 1) n = Math.floor(Math.random() * facts.length)
    setIdx(n)
  }

  return (
    <section
      id="hw-tour-foundation"
      className="rounded-2xl border bg-[#141008] p-5"
      style={{ borderColor: 'rgba(251,191,36,0.4)', boxShadow: '0 0 24px rgba(251,191,36,0.10)' }}
    >
      <p
        className="text-[10px] font-black uppercase tracking-widest text-amber-300"
        style={{ textShadow: '0 0 12px rgba(251,191,36,0.6)' }}
      >
        Strengthen your foundation
      </p>
      <h2 className="mt-1 text-xl font-black text-[var(--text)]">
        Know the benefits
      </h2>

      {/* Facts deck */}
      <div
        className="mt-4 select-none"
        onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchX == null) return
          const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX
          if (dx < -40) next()
          else if (dx > 40) prev()
          setTouchX(null)
        }}
      >
        <div
          className="rounded-xl border border-amber-300/25 bg-black/40 p-4"
          style={{ boxShadow: AMBER_GLOW }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300/80">
            {fact.exercise}
          </p>
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-[var(--text)]">
            “{fact.fact}”
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            {fact.builds.map((b) => (
              <span key={b} className="rounded-full bg-amber-300/10 px-2 py-0.5 font-semibold text-amber-200/90">
                builds {b}
              </span>
            ))}
            {fact.powers.map((p) => (
              <span key={p} className="rounded-full bg-white/5 px-2 py-0.5 font-semibold text-[var(--muted)]">
                powers {p}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            className="rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]"
            aria-label="Previous fact"
          >
            ←
          </button>
          <div className="flex gap-1.5" aria-hidden>
            {facts.map((f, i) => (
              <span
                key={f.id}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === idx ? 18 : 6,
                  background: i === idx ? '#fcd34d' : 'rgba(255,255,255,0.15)',
                  boxShadow: i === idx ? '0 0 8px rgba(251,191,36,0.8)' : undefined,
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]"
            aria-label="Next fact"
          >
            →
          </button>
        </div>
        <button
          type="button"
          onClick={shuffle}
          className="mt-2 w-full rounded-xl border border-amber-300/30 px-4 py-2 text-sm font-bold text-amber-200"
          style={{ animation: 'sl-skill-pulse 2.4s ease-in-out infinite' }}
        >
          Shuffle a fact
        </button>
      </div>

      {/* Challenges entry */}
      <div className="mt-4 rounded-xl border border-[var(--panel-border)] bg-black/30 p-4">
        <p className="text-sm font-bold text-[var(--text)]">Foundation challenges</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Hollow, plank, wall-sit, superman, side plank, and lever on the
          camera — push-ups and v-ups as rep battles. Beat your best.
        </p>
        <button
          type="button"
          onClick={() => setChallengeOpen(true)}
          className="mt-3 w-full rounded-xl bg-amber-300 px-4 py-3 text-base font-black text-black"
          style={{ animation: 'sl-skill-pulse 2.4s ease-in-out infinite' }}
        >
          Start a challenge
        </button>
      </div>

      {challengeOpen && (
        <AthleteChallengeFlow athlete={athlete} onClose={() => setChallengeOpen(false)} />
      )}
    </section>
  )
}
