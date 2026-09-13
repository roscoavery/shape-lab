import { useMemo, useState } from 'react'
import type { AthleteSkillGoal, TrainingSurface } from '../../types'
import {
  SKILL_GOAL_DISCLAIMER,
  TRAINING_SURFACES,
  goalLine,
  makeSkillGoal,
  searchSkills,
} from '../../lib/skillPaths'

type Props = {
  value: AthleteSkillGoal[]
  onChange: (next: AthleteSkillGoal[]) => void
  athleteFacing?: boolean
}

export function SkillGoalPicker({ value, onChange, athleteFacing = true }: Props) {
  const [query, setQuery] = useState('')
  const [surface, setSurface] = useState<TrainingSurface | ''>('')
  const matches = useMemo(() => searchSkills(query).slice(0, 8), [query])

  const add = (skillId?: string, label?: string) => {
    const goal = makeSkillGoal({
      skillId,
      label: label || query,
      surface: surface || undefined,
      source: athleteFacing ? 'intake' : 'coach',
    })
    if (!goal) return
    if (value.some((g) => g.label.toLowerCase() === goal.label.toLowerCase() && g.surface === goal.surface)) {
      setQuery('')
      return
    }
    onChange([...value, goal])
    setQuery('')
  }

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-[#1a160c] px-3 py-2 text-sm leading-relaxed text-[#e8d9a8]">
        {SKILL_GOAL_DISCLAIMER}
      </p>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onChange(value.filter((row) => row.id !== g.id))}
                className="rounded-full border border-[#6ec8d6]/40 bg-[#102028] px-3 py-1 text-xs font-semibold"
              >
                {goalLine(g)} · remove
              </button>
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
      <input
        className="h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
        placeholder="Round-off handspring tuck, standing full…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(matches[0]?.id, query.trim() || matches[0]?.name)
          }
        }}
      />
      <div className="grid gap-1.5">
        {matches.map((skill) => (
          <button
            key={skill.id}
            type="button"
            onClick={() => add(skill.id, skill.name)}
            className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-left text-sm font-semibold"
          >
            {skill.name}
          </button>
        ))}
        {query.trim() && !matches.some((s) => s.name.toLowerCase() === query.trim().toLowerCase()) && (
          <button
            type="button"
            onClick={() => add(undefined, query.trim())}
            className="rounded-xl border border-dashed border-white/20 px-3 py-2 text-left text-sm"
          >
            Add “{query.trim()}”{surface ? ` on ${TRAINING_SURFACES.find((s) => s.id === surface)?.label}` : ''}
          </button>
        )}
      </div>
    </div>
  )
}
