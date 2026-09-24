import { useState } from 'react'
import { createId } from '../../lib/storage'
import type { AthleteSkillGoal, TrainingSurface } from '../../types'
import { CollapsibleSection } from '../CollapsibleSection'
import {
  SKILL_GOAL_CHOICES,
  SKILL_GOAL_GROUPS,
  type SkillGoalChoice,
  type SkillGoalGroupId,
} from '../../config/skillGoalCatalog'
import {
  SKILL_GOAL_DISCLAIMER,
  TRAINING_SURFACES,
  goalLine,
  makeSkillGoal,
  matchCatalogChoice,
} from '../../lib/skillPaths'

type Props = {
  value: AthleteSkillGoal[]
  onChange: (next: AthleteSkillGoal[]) => void
  athleteFacing?: boolean
}

export function SkillGoalPicker({ value, onChange, athleteFacing = true }: Props) {
  const [surface, setSurface] = useState<TrainingSurface | ''>('')
  const [otherGroup, setOtherGroup] = useState<SkillGoalGroupId | null>(null)
  const [otherText, setOtherText] = useState('')

  const addGoal = (label: string, skillId?: string, matchNames?: string[]) => {
    const goal = makeSkillGoal({
      skillId,
      label,
      matchNames,
      surface: surface || undefined,
      source: athleteFacing ? 'intake' : 'coach',
    })
    if (!goal) return
    if (
      value.some(
        (g) =>
          g.label.toLowerCase() === goal.label.toLowerCase() && g.surface === goal.surface,
      )
    ) {
      return
    }
    onChange([...value, goal])
  }

  const pick = (choice: SkillGoalChoice) => {
    if (choice.other) {
      setOtherGroup(choice.group)
      setOtherText('')
      return
    }
    const skill = matchCatalogChoice(choice)
    addGoal(choice.label, skill?.id, choice.matchNames)
    setOtherGroup(null)
  }

  const addOther = () => {
    const label = otherText.trim()
    if (!label || !otherGroup) return
    const skill = matchCatalogChoice(
      SKILL_GOAL_CHOICES.find((c) => c.group === otherGroup && c.other)!,
      label,
    )
    addGoal(label, skill?.id)
    setOtherText('')
    setOtherGroup(null)
  }

  return (
    <CollapsibleSection
      title={athleteFacing ? 'Hopes' : 'Skill hopes'}
      hint={value.length ? `${value.length} on this profile` : 'Collapsed — open to add or edit'}
      defaultOpen={false}
    >
    <div className="space-y-3">
      <p className="rounded-xl bg-[#1a160c] px-3 py-2 text-sm leading-relaxed text-[#e8d9a8]">
        {SKILL_GOAL_DISCLAIMER}
      </p>
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((g) => (
            <li key={g.id} className="rounded-xl border border-[#6ec8d6]/30 bg-[#102028] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{goalLine(g)}</p>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((row) => row.id !== g.id))}
                  className="text-[11px] text-[var(--muted)] underline"
                >
                  Remove
                </button>
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted)]">Smaller pieces that get them there</p>
              <ul className="mt-1 space-y-1">
                {(g.steps ?? []).map((step) => (
                  <li key={step.id} className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          value.map((row) =>
                            row.id === g.id
                              ? {
                                  ...row,
                                  steps: (row.steps ?? []).map((s) =>
                                    s.id === step.id ? { ...s, done: !s.done } : s,
                                  ),
                                }
                              : row,
                          ),
                        )
                      }
                      className={`h-4 w-4 rounded border ${step.done ? 'bg-[var(--accent)]' : 'border-white/30'}`}
                      aria-label={step.done ? 'Mark undone' : 'Mark done'}
                    />
                    <span className={step.done ? 'line-through opacity-60' : ''}>{step.label}</span>
                  </li>
                ))}
              </ul>
              <input
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs"
                placeholder="Add a sub-goal and press enter"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  const label = e.currentTarget.value.trim()
                  if (!label) return
                  onChange(
                    value.map((row) =>
                      row.id === g.id
                        ? { ...row, steps: [...(row.steps ?? []), { id: createId('stp'), label }] }
                        : row,
                    ),
                  )
                  e.currentTarget.value = ''
                }}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Surface they want it on
      </p>
      <div className="flex flex-wrap gap-1.5">
        {TRAINING_SURFACES.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setSurface((cur) => (cur === row.id ? '' : row.id))}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              surface === row.id
                ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                : 'border border-[var(--panel-border)] bg-[#121820]'
            }`}
          >
            {row.short}
          </button>
        ))}
      </div>
      {SKILL_GOAL_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6ec8d6]">
            {group.title}
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {SKILL_GOAL_CHOICES.filter((row) => row.group === group.id).map((choice) => {
              const selected = value.some(
                (g) =>
                  g.label.toLowerCase() === choice.label.toLowerCase() &&
                  g.surface === (surface || undefined),
              )
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => pick(choice)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${
                    selected
                      ? 'border-[#6ec8d6] bg-[#102028] text-[#d7f6fb]'
                      : choice.other
                        ? 'border-dashed border-white/25 bg-black/20'
                        : 'border-white/10 bg-black/25'
                  }`}
                >
                  {choice.other ? 'Other… write it' : choice.label}
                </button>
              )
            })}
          </div>
          {otherGroup === group.id && (
            <div className="mt-2 flex gap-2">
              <input
                className="h-11 min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
                placeholder={`Name the ${group.title.toLowerCase()} skill`}
                value={otherText}
                autoFocus
                onChange={(e) => setOtherText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addOther()
                  }
                }}
              />
              <button
                type="button"
                disabled={!otherText.trim()}
                onClick={addOther}
                className="rounded-lg bg-[var(--accent)] px-3 text-sm font-bold text-[var(--on-accent)] disabled:opacity-40"
              >
                Add
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
    </CollapsibleSection>
  )
}
