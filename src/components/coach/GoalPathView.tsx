import { useMemo, useState } from 'react'
import type { AthleteSkillGoal } from '../../types'
import {
  NEED_KIND_LABEL,
  conditioningForSkill,
  needLabel,
  needsForSkill,
  resolveGoalSkill,
  surfaceLabel,
} from '../../lib/skillPaths'

type PathItem = {
  key: string
  label: string
  note?: string
  section: string
}

type Props = {
  goal: AthleteSkillGoal
  onGoalChange?: (next: AthleteSkillGoal) => void
  defaultOpen?: boolean
}

/** One athlete's path through a goal: the registry-assembled checklist, with their own progress. */
export function GoalPathView({ goal, onGoalChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  const { skill, items } = useMemo(() => {
    const resolved = resolveGoalSkill(goal)
    if (!resolved) return { skill: null, items: [] as PathItem[] }
    const out: PathItem[] = []
    const needs = needsForSkill(resolved.id, goal.surface)
    for (const kind of ['required', 'helpful'] as const) {
      for (const n of needs.filter((row) => row.kind === kind)) {
        out.push({
          key: `need:${n.id}`,
          label: needLabel(n),
          note: n.note ?? undefined,
          section: NEED_KIND_LABEL[kind],
        })
      }
    }
    for (const c of conditioningForSkill(resolved.id)) {
      out.push({ key: `cond:${c.id}`, label: c.label, note: c.note ?? undefined, section: 'Body prep' })
    }
    for (const n of needs.filter((row) => row.kind === 'alt')) {
      out.push({
        key: `need:${n.id}`,
        label: needLabel(n),
        note: n.note ?? undefined,
        section: NEED_KIND_LABEL.alt,
      })
    }
    for (const p of resolved.powerDown ?? []) {
      out.push({
        key: `pwr:${p.id}`,
        label: p.label,
        note: p.note ?? undefined,
        section: 'More power → less power',
      })
    }
    return { skill: resolved, items: out }
  }, [goal])

  const doneSet = useMemo(() => new Set(goal.pathDone ?? []), [goal.pathDone])
  const doneCount = items.filter((item) => doneSet.has(item.key)).length
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0

  const toggleItem = (key: string) => {
    if (!onGoalChange) return
    const next = new Set(goal.pathDone ?? [])
    if (next.has(key)) next.delete(key)
    else next.add(key)
    // Prune keys that no longer exist in the live path, keep the toggled one.
    const live = new Set(items.map((item) => item.key))
    onGoalChange({ ...goal, pathDone: [...next].filter((k) => k === key || live.has(k)) })
  }

  const toggleStep = (stepId: string) => {
    if (!onGoalChange) return
    onGoalChange({
      ...goal,
      steps: (goal.steps ?? []).map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)),
    })
  }

  const sections = useMemo(() => {
    const groups: { section: string; items: PathItem[] }[] = []
    for (const item of items) {
      const group = groups.find((g) => g.section === item.section)
      if (group) group.items.push(item)
      else groups.push({ section: item.section, items: [item] })
    }
    return groups
  }, [items])

  const customSteps = goal.steps ?? []

  return (
    <article className="rounded-2xl border border-[var(--panel-border)] bg-[#121820]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{goal.label}</span>
          {goal.surface && (
            <span className="block text-[11px] text-[var(--muted)]">
              On {surfaceLabel(goal.surface)}
            </span>
          )}
          {items.length > 0 && (
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-black/40">
              <span
                className="block h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </span>
          )}
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-[var(--muted)]">
          {items.length > 0 ? `${doneCount}/${items.length}` : open ? '–' : '+'}
        </span>
        <span className="shrink-0 text-[var(--muted)]" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--panel-border)] px-3 pb-3 pt-2">
          {!skill && (
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              This hope isn&apos;t linked to a guide yet, your coach can link it under Skill paths.
            </p>
          )}
          {skill && items.length === 0 && customSteps.length === 0 && (
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              The path for {skill.name} isn&apos;t written yet. Check back soon.
            </p>
          )}
          {sections.map((group) => (
            <div key={group.section} className="mt-2 first:mt-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                {group.section}
              </p>
              <ul className="mt-1 space-y-1">
                {group.items.map((item) => {
                  const done = doneSet.has(item.key)
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => toggleItem(item.key)}
                        disabled={!onGoalChange}
                        className="flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left disabled:cursor-default"
                      >
                        <span
                          className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${
                            done ? 'border-transparent bg-[var(--accent)]' : 'border-white/30'
                          }`}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span
                            className={`block text-sm font-semibold leading-snug ${
                              done ? 'line-through opacity-60' : ''
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.note && (
                            <span className="block text-xs leading-relaxed text-[var(--muted)]">
                              {item.note}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {customSteps.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                From your coach
              </p>
              <ul className="mt-1 space-y-1">
                {customSteps.map((step) => (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => toggleStep(step.id)}
                      disabled={!onGoalChange}
                      className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-xs disabled:cursor-default"
                    >
                      <span
                        className={`h-4 w-4 shrink-0 rounded border ${
                          step.done ? 'border-transparent bg-[var(--accent)]' : 'border-white/30'
                        }`}
                        aria-hidden
                      />
                      <span className={step.done ? 'line-through opacity-60' : ''}>
                        {step.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
