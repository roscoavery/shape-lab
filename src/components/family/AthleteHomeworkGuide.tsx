import { useMemo } from 'react'
import type { Athlete, HomeworkItem, HomeworkLog } from '../../types'
import { getCatalogItem } from '../../config/homeworkCatalog'
import { AUTO_HOMEWORK_DEFS, loadAllHomework, loadHomeworkLogs } from '../../lib/storage'

const WEEKLY_HOLD_GOAL = 3

function friendlyHomeworkLabel(item: HomeworkItem): string {
  if (item.customLabel?.trim()) return item.customLabel.trim()
  if (item.catalogId) {
    const cat = getCatalogItem(item.catalogId)
    if (cat?.name) return cat.name
  }
  const auto = AUTO_HOMEWORK_DEFS.find((d) => d.autoKey === item.autoKey)
  if (auto) {
    if (item.autoKey === 'hollow') {
      if (item.shapeId === 'hollow_arms_up') return 'Hollow hold (arms up)'
      return 'Hollow hold (arms down)'
    }
    if (item.autoKey === 'side_plank') return 'Side plank (both sides)'
    if (item.autoKey === 'wall_handstand') return 'Wall handstand hold'
    if (item.autoKey === 'superman') return 'Superman hold'
  }
  const id = item.shapeId || ''
  return id
    .replace(/^catalog_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function isHoldItem(item: HomeworkItem): boolean {
  if (item.trackMode === 'hold') return true
  if (item.source === 'auto') return true
  const cat = item.catalogId ? getCatalogItem(item.catalogId) : null
  return cat?.trackMode === 'hold' || cat?.trackMode === 'hold_or_reps'
}

function sessionsThisWeek(logs: HomeworkLog[], homeworkId: string): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const days = new Set<string>()
  for (const row of logs) {
    if (row.homeworkId !== homeworkId) continue
    if (row.kind !== 'hold' && (row.totalHoldSeconds ?? 0) <= 0) continue
    const t = Date.parse(row.date || row.loggedAt || '')
    if (!Number.isFinite(t) || t < cutoff) continue
    days.add(new Date(t).toISOString().slice(0, 10))
  }
  return days.size
}

type Row = {
  item: HomeworkItem
  label: string
  hold: boolean
  done: number
  goal: number
  targetSeconds?: number
  standardLabel?: string
}

export function AthleteHomeworkGuide({
  athlete,
  onPractice,
  onQuickLog,
}: {
  athlete: Athlete
  onPractice: () => void
  onQuickLog?: () => void
}) {
  const rows = useMemo((): Row[] => {
    const items = loadAllHomework().filter((h) => h.athleteId === athlete.id)
    const logs = loadHomeworkLogs().filter((l) => l.athleteId === athlete.id)
    const list = items
      .map((item) => {
        const hold = isHoldItem(item)
        const autoDef = AUTO_HOMEWORK_DEFS.find((d) => d.autoKey === item.autoKey)
        // The card shows the current standard, not a stale value baked into the item.
        const cat = item.catalogId ? getCatalogItem(item.catalogId) : null
        return {
          item,
          label: friendlyHomeworkLabel(item),
          hold,
          done: hold ? sessionsThisWeek(logs, item.id) : 0,
          goal: hold ? WEEKLY_HOLD_GOAL : 0,
          targetSeconds: autoDef?.targetSeconds ?? cat?.targetSeconds ?? item.targetSeconds,
          standardLabel: cat?.standardLabel,
        }
      })
      .sort((a, b) => {
        if (a.hold !== b.hold) return a.hold ? -1 : 1
        return a.label.localeCompare(b.label)
      })
    return list
  }, [athlete.id])

  const holdRows = rows.filter((r) => r.hold)

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">This week</p>
      <h3 className="mt-1 text-lg font-semibold">Homework plan</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        Aim for <strong className="font-semibold text-[var(--text)]">{WEEKLY_HOLD_GOAL} hold sessions</strong>{' '}
        per drill each week. Short, quality holds beat one long grind.
      </p>
      <ul className="mt-4 space-y-3">
        {holdRows.length === 0 && (
          <li className="text-sm text-[var(--muted)]">No holds on your card yet — your coach will add them.</li>
        )}
        {holdRows.map((row) => {
          const pct = Math.min(100, Math.round((row.done / row.goal) * 100))
          const onTrack = row.done >= row.goal
          return (
            <li key={row.item.id} className="rounded-lg bg-[#121820] px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text)]">{row.label}</p>
                  {row.standardLabel ? (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{row.standardLabel}</p>
                  ) : row.targetSeconds ? (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      Work toward {row.targetSeconds}s per hold
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">Log time with Class clock or Practice</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    onTrack ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-white/10 text-white/80'
                  }`}
                >
                  {row.done}/{row.goal}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {rows.some((r) => !r.hold) && (
        <p className="mt-4 text-xs text-[var(--muted)]">
          Reps and skills: open Practice for coach-assigned work beyond these holds.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPractice}
          className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-bold text-[var(--on-accent)]"
        >
          Practice
        </button>
        {onQuickLog && (
          <button
            type="button"
            onClick={onQuickLog}
            className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold"
          >
            Class clock
          </button>
        )}
      </div>
    </section>
  )
}
