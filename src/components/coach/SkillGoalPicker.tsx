import { useMemo, useRef, useState } from 'react'
import { createId } from '../../lib/storage'
import type { AthleteSkillGoal, TrainingSurface } from '../../types'
import { CollapsibleSection } from '../CollapsibleSection'
import {
  makeRegistrySkillGoal,
  matchRegistrySkill,
  searchSkills,
  TRACK_LABELS,
  TRACK_ORDER,
  type SkillSearchHit,
  type UnifiedSkill,
} from '../../lib/skillRegistry'
import {
  SKILL_GOAL_DISCLAIMER,
  TRAINING_SURFACES,
  goalLine,
} from '../../lib/skillPaths'

type Props = {
  value: AthleteSkillGoal[]
  onChange: (next: AthleteSkillGoal[]) => void
  athleteFacing?: boolean
}

export function SkillGoalPicker({ value, onChange, athleteFacing = true }: Props) {
  const [surface, setSurface] = useState<TrainingSurface | ''>('')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const isDuplicate = (label: string) =>
    value.some(
      (g) => g.label.toLowerCase() === label.toLowerCase() && g.surface === (surface || undefined),
    )

  const addGoal = (goal: AthleteSkillGoal) => {
    if (isDuplicate(goal.label)) return
    onChange([...value, goal])
  }

  const addSkill = (skill: UnifiedSkill) => {
    addGoal(
      makeRegistrySkillGoal(skill, {
        createId,
        surface: surface || undefined,
        source: athleteFacing ? 'intake' : 'coach',
      }),
    )
    setQuery('')
    setOpen(false)
    setHighlight(0)
    inputRef.current?.focus()
  }

  /** Free-text path: resolve against the registry first; truly custom hopes stay guideless. */
  const addCustom = (rawLabel: string) => {
    const label = rawLabel.trim()
    if (!label || isDuplicate(label)) return
    const skill = matchRegistrySkill(label)
    if (skill) {
      addSkill(skill)
      return
    }
    addGoal({
      id: createId('goal'),
      label,
      surface: surface || undefined,
      setAt: new Date().toISOString(),
      source: athleteFacing ? 'intake' : 'coach',
    })
    setQuery('')
    setOpen(false)
    setHighlight(0)
    inputRef.current?.focus()
  }

  const hits: SkillSearchHit[] = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return []
    return searchSkills(trimmed).filter(
      (h) =>
        !value.some(
          (g) =>
            g.label.toLowerCase() === h.skill.name.toLowerCase() &&
            g.surface === (surface || undefined),
        ),
    )
  }, [query, value, surface])

  const grouped = useMemo(() => {
    const groups: { track: (typeof TRACK_ORDER)[number]; hits: SkillSearchHit[] }[] = []
    for (const track of TRACK_ORDER) {
      const trackHits = hits.filter((h) => h.skill.track === track)
      if (trackHits.length > 0) groups.push({ track, hits: trackHits })
    }
    return groups
  }, [hits])

  // Flat list for keyboard navigation: suggestions first, then the custom row.
  const flatCount = hits.length + 1

  const commitHighlight = () => {
    if (highlight < hits.length) addSkill(hits[highlight].skill)
    else addCustom(query)
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Add a hope
      </p>
      <div className="relative">
        <input
          ref={inputRef}
          className="h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
          placeholder="Type a skill — back tuck, aerial, handstand…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so suggestion clicks land before the list closes.
            setTimeout(() => setOpen(false), 150)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setHighlight((h) => Math.min(h + 1, flatCount - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setHighlight((h) => Math.max(h - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (query.trim()) commitHighlight()
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        {open && query.trim() && (
          <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[var(--panel-border)] bg-[#0d1218] shadow-xl">
            {grouped.map(({ track, hits: trackHits }) => (
              <div key={track}>
                <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6ec8d6]">
                  {TRACK_LABELS[track]}
                </p>
                {trackHits.map((hit) => {
                  const flatIdx = hits.indexOf(hit)
                  return (
                    <button
                      key={hit.skill.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addSkill(hit.skill)}
                      onMouseEnter={() => setHighlight(flatIdx)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                        highlight === flatIdx ? 'bg-white/10' : ''
                      }`}
                    >
                      <span className="font-semibold">{hit.skill.name}</span>
                      {!hit.skill.guideId && (
                        <span className="shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-[var(--muted)]">
                          no guide yet
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
            {hits.length === 0 && (
              <p className="px-3 py-2 text-xs text-[var(--muted)]">
                No matching skill — add it as a custom hope below.
              </p>
            )}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addCustom(query)}
              onMouseEnter={() => setHighlight(hits.length)}
              className={`flex w-full items-center justify-between gap-2 border-t border-dashed border-white/25 px-3 py-2.5 text-left text-sm ${
                highlight === hits.length ? 'bg-white/10' : ''
              }`}
            >
              <span>
                Add <span className="font-semibold">“{query.trim()}”</span> as a custom hope
              </span>
              <span className="shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-[var(--muted)]">
                no guide
              </span>
            </button>
          </div>
        )}
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        Picking a skill links it to its progression guide. Custom hopes stay as written.
      </p>
    </div>
    </CollapsibleSection>
  )
}
