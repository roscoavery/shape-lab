/**
 * Which coach still is the main picture for a shape, plus extra uploaded
 * stills that sit next to the shipped ones.
 */

const MAIN_KEY = 'shape-lab.mainCoachStill.v1'

export function loadMainCoachStills(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MAIN_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function setMainCoachStill(shapeId: string, stillId: string): Record<string, string> {
  const next = { ...loadMainCoachStills(), [shapeId]: stillId }
  try {
    localStorage.setItem(MAIN_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  return next
}
