import { useMemo } from 'react'
import type { Athlete } from '../../types'
import { buildPathHighlight } from '../../lib/skillPathHighlight'
import { getRegistrySkill } from '../../lib/skillRegistry'
import { hlGlowStyle, FAMILY_BY_SKILL, type SkillFamily } from '../learn/SkillMapView'

/**
 * Compact goal-path strip for the athlete home: the athlete's goal skill
 * glowing brightest with its prerequisites dimming down the chain — the
 * guiding-light language from the skill map, without the full map.
 * Tapping it opens the full path guide.
 */
export function AthletePathStrip({
  athlete,
  onOpenGuide,
}: {
  athlete: Athlete
  onOpenGuide: () => void
}) {
  const strip = useMemo(() => {
    const goal = (athlete.skillGoals ?? [])[0]
    const skillId = goal?.skillId?.trim() || goal?.id
    if (!skillId) return null
    const hl = buildPathHighlight(skillId)
    if (!hl) return null
    // Chain from deepest prerequisite up to the goal.
    const chain = [...hl.required.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, dist]) => ({ id, dist, name: getRegistrySkill(id)?.name ?? id }))
    if (chain.length === 0) return null
    return { hl, chain, goalName: hl.targetName }
  }, [athlete])

  if (!strip) return null
  const { hl, chain } = strip
  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Your path
      </p>
      <button
        type="button"
        onClick={onOpenGuide}
        className="mt-3 block w-full text-left"
        aria-label={`Open the skill path guide for ${strip.goalName}`}
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {chain.map(({ id, dist, name }, i) => {
            const isGoal = dist === 0
            const family: SkillFamily = FAMILY_BY_SKILL[id] ?? 'foundations'
            return (
              <span key={id} className="flex shrink-0 items-center gap-2">
                {i > 0 && <span className="text-[var(--muted)]">→</span>}
                <span
                  className="rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                  style={hlGlowStyle(hl, isGoal ? 'target' : 'required', dist, family)}
                >
                  {name}
                </span>
              </span>
            )
          })}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Tap to open your full skill path guide →
        </p>
      </button>
    </section>
  )
}
