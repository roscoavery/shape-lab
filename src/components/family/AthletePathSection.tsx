import { useMemo, useState } from 'react'
import type { Athlete, AthleteSkillGoal } from '../../types'
import { buildPathHighlight } from '../../lib/skillPathHighlight'
import { getRegistrySkill } from '../../lib/skillRegistry'
import { hlGlowStyle, FAMILY_BY_SKILL, type SkillFamily } from '../learn/SkillMapView'
import { SkillGoalPicker } from '../coach/SkillGoalPicker'

type Props = {
  athlete: Athlete
  onAthleteChange: (next: Athlete) => void
  onOpenGuide: () => void
  onOpenSkill?: (skillId: string) => void
}

function goalSkillId(goal: AthleteSkillGoal): string | null {
  return goal.skillId?.trim() || goal.id?.trim() || null
}

/**
 * Your path, rebuilt: when empty it asks what skill the coach wants them
 * working on and lets them pick from the guide. Athletes can add and remove
 * their own goals; goals set by the coach are pinned and marked.
 */
export function AthletePathSection({ athlete, onAthleteChange, onOpenGuide, onOpenSkill }: Props) {
  const [picking, setPicking] = useState(false)
  const goals = athlete.skillGoals ?? []

  const strips = useMemo(() => {
    return goals
      .map((goal) => {
        const skillId = goalSkillId(goal)
        if (!skillId) return null
        const hl = buildPathHighlight(skillId)
        if (!hl) return { goal, hl: null, chain: [], goalName: goal.label }
        const chain = [...hl.required.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([id, dist]) => ({ id, dist, name: getRegistrySkill(id)?.name ?? id }))
        return { goal, hl, chain, goalName: hl.targetName }
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
  }, [goals])

  const removeGoal = (id: string) => {
    onAthleteChange({
      ...athlete,
      skillGoals: (athlete.skillGoals ?? []).filter((g) => g.id !== id),
    })
  }

  const addGoals = (next: AthleteSkillGoal[]) => {
    onAthleteChange({ ...athlete, skillGoals: next })
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Your path
        </p>
        {goals.length > 0 && (
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            className="text-xs font-semibold text-[var(--accent)]"
          >
            {picking ? 'Done' : '+ Add a skill'}
          </button>
        )}
      </div>

      {goals.length === 0 ? (
        <div className="mt-3">
          <h3 className="text-lg font-semibold text-[var(--text)]">
            What skill does your coach want you working on?
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Pick the skill you're working toward. Your path shows every step
            that leads to it. Your coach can also set this for you.
          </p>
          <div className="mt-3">
            <SkillGoalPicker
              athleteFacing
              value={goals}
              onChange={addGoals}
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          {picking && (
            <div className="rounded-xl border border-[var(--panel-border)] p-3">
              <SkillGoalPicker
                athleteFacing
                value={goals}
                onChange={addGoals}
              />
            </div>
          )}
          {strips.map(({ goal, hl, chain, goalName }) => {
            const isCoachSet = goal.source === 'coach'
            return (
              <div
                key={goal.id}
                className="rounded-xl border border-[var(--panel-border)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[var(--text)]">
                    {goalName}
                    {isCoachSet && (
                      <span className="ml-2 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                        Set by your coach
                      </span>
                    )}
                  </p>
                  {!isCoachSet && (
                    <button
                      type="button"
                      onClick={() => removeGoal(goal.id)}
                      className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--bad)]"
                      aria-label={`Remove ${goalName} from your path`}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {hl && chain.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const sid = goalSkillId(goal)
                      if (sid && onOpenSkill) onOpenSkill(sid)
                      else onOpenGuide()
                    }}
                    className="mt-2 block w-full text-left"
                    aria-label={`Open ${goalName} in the skill guide`}
                  >
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {chain.map(({ id, dist, name }, i) => {
                        const isGoal = dist === 0
                        const family: SkillFamily = FAMILY_BY_SKILL[id] ?? 'foundations'
                        return (
                          <span key={id} className="flex shrink-0 items-center gap-2">
                            {i > 0 && <span className="text-[var(--muted)]">→</span>}
                            <span
                              className="whitespace-nowrap rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold"
                              style={hlGlowStyle(hl, isGoal ? 'target' : 'required', dist, family)}
                            >
                              {name}
                            </span>
                          </span>
                        )
                      })}
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Tap to open the skill card →
                    </p>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenGuide}
                    className="mt-1 text-xs text-[var(--muted)] underline"
                  >
                    Open the skill path guide →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
