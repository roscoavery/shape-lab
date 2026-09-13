import type { AthleteSkillGoal } from '../../types'
import {
  NEED_KIND_LABEL,
  SKILL_GOAL_COACH_NOTE,
  conditioningForSkill,
  getSkill,
  needLabel,
  needsForSkill,
  resolveGoalSkill,
  surfaceLabel,
} from '../../lib/skillPaths'

type Props = {
  goals: AthleteSkillGoal[]
  coachView?: boolean
}

export function SkillPathPreview({ goals, coachView = false }: Props) {
  if (goals.length === 0) return null
  return (
    <div className="space-y-3">
      {coachView && (
        <p className="text-xs leading-relaxed text-[var(--muted)]">{SKILL_GOAL_COACH_NOTE}</p>
      )}
      {goals.map((goal) => {
        const skill = resolveGoalSkill(goal)
        const needs = skill ? needsForSkill(skill.id, goal.surface) : []
        const cond = skill ? conditioningForSkill(skill.id) : []
        const power = skill?.powerDown ?? []
        return (
          <article
            key={goal.id}
            className="rounded-2xl border border-[var(--panel-border)] bg-[#121820] p-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Long-term hope
            </p>
            <h4 className="mt-1 text-base font-bold">
              {goal.label}
              {goal.surface ? ` · ${surfaceLabel(goal.surface)}` : ''}
            </h4>
            {skill?.note && (
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{skill.note}</p>
            )}
            {needs.length > 0 && (
              <ul className="mt-3 space-y-2">
                {needs.map((need) => (
                  <li key={need.id}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      {NEED_KIND_LABEL[need.kind]}
                    </p>
                    <p className="text-sm font-semibold">{needLabel(need)}</p>
                    {need.note && (
                      <p className="text-xs leading-relaxed text-[var(--muted)]">{need.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {cond.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {cond.map((row) => (
                  <li key={row.id} className="text-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      {NEED_KIND_LABEL[row.kind]} · body
                    </span>
                    <span className="mt-0.5 block font-semibold">{row.label}</span>
                    {row.note && <span className="block text-xs text-[var(--muted)]">{row.note}</span>}
                  </li>
                ))}
              </ul>
            )}
            {power.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  More power → less power
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">
                  {power.map((step) => step.label).join(' → ')}
                </p>
              </div>
            )}
            {!skill && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                No path written for this name yet. Add it under Skill paths.
              </p>
            )}
            {skill && needs.length === 0 && cond.length === 0 && power.length === 0 && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                {getSkill(skill.id)
                  ? 'Add prerequisites for this skill in Skill paths when you know the pieces.'
                  : ''}
              </p>
            )}
          </article>
        )
      })}
    </div>
  )
}
