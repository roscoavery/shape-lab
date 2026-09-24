const KEY = 'shape-lab.calendar.weekColMin.v1'

/** 0 = fit all 7 days to screen width; higher = wider columns (horizontal scroll). */
export function loadCalendarWeekColMin(): number {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return 0
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return 0
    return Math.min(120, Math.round(n))
  } catch {
    return 0
  }
}

export function saveCalendarWeekColMin(px: number) {
  try {
    const n = Math.max(0, Math.min(120, Math.round(px)))
    localStorage.setItem(KEY, String(n))
  } catch {
    /* quota */
  }
}

export function stepCalendarWeekColMin(current: number, delta: number): number {
  const steps = [0, 28, 36, 44, 52, 60, 72, 88, 104, 120]
  if (current <= 0 && delta < 0) return 0
  const idx = steps.findIndex((s) => s === current)
  const at = idx >= 0 ? idx : steps.findIndex((s) => s >= current) || 0
  const next = Math.max(0, Math.min(steps.length - 1, at + delta))
  return steps[next] ?? 0
}
