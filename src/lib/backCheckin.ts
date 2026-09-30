/**
 * Ryan's back check-in for Today: "How's your back doing?" asked every few
 * days, answered in one tap, then gone until the next interval. Same nudge
 * pattern as the athlete hold benchmarks, applied to his back-extension work.
 */
import { getCatalogItem } from '../config/homeworkCatalog'
import { buildHomeworkItem } from './homeworkAssign'
import { addHomeworkItem, loadAllHomework, loadHomeworkLogs } from './storage'

export type BackStatus = 'good' | 'okay' | 'rough'

const LS_KEY = 'shapelab.backCheckin.v1'

export type BackCheckin = { status: BackStatus; at: string }

export function getBackCheckin(): BackCheckin | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BackCheckin
    if (!parsed?.at || !['good', 'okay', 'rough'].includes(parsed.status)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveBackCheckin(status: BackStatus): void {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ status, at: new Date().toISOString() } satisfies BackCheckin),
    )
  } catch {
    /* storage unavailable — the question just asks again */
  }
}

/** Ask every few days; answering dismisses the question until the next interval. */
export function backCheckinDue(intervalDays = 3): boolean {
  const last = getBackCheckin()
  if (!last) return true
  const t = Date.parse(last.at)
  if (!Number.isFinite(t)) return true
  return Date.now() - t >= intervalDays * 86400000
}

const BACK_CARE_CATALOG_IDS = ['back_extension', 'glute_bridge']

/** Days since back-extension / glute-bridge work was last logged. Null = never. */
export function daysSinceBackCare(athleteId: string): number | null {
  const ids = new Set(
    loadAllHomework()
      .filter(
        (h) =>
          h.athleteId === athleteId &&
          h.catalogId &&
          BACK_CARE_CATALOG_IDS.includes(h.catalogId),
      )
      .map((h) => h.id),
  )
  if (ids.size === 0) return null
  const logs = loadHomeworkLogs().filter(
    (l) => l.athleteId === athleteId && ids.has(l.homeworkId),
  )
  if (logs.length === 0) return null
  const last = logs.reduce((a, b) => ((a.date || '') >= (b.date || '') ? a : b))
  const t = Date.parse(last.date || '')
  if (!Number.isFinite(t)) return null
  return Math.floor((Date.now() - t) / 86400000)
}

/** Make sure back extensions are on his homework list so one tap can log a hold. */
export function ensureBackExtensionHomework(athleteId: string): void {
  const items = loadAllHomework().filter((h) => h.athleteId === athleteId)
  if (items.some((i) => i.catalogId === 'back_extension')) return
  const cat = getCatalogItem('back_extension')
  if (!cat) return
  const item = buildHomeworkItem(athleteId, {
    pick: { kind: 'catalog', id: cat.id, name: cat.name },
    source: 'athlete',
  })
  if (item) addHomeworkItem(item)
}
