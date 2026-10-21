import type { Athlete, HomeworkItem } from '../types'
import { addHomeworkItem, createId, loadAllHomework, loadHomeworkLogs } from './storage'
import { FOUNDATION_FACTS_DRAFT } from '../config/foundationFacts'
import { homeworkTitle } from './homeworkLabel'

export type PracticeRec = {
  id: string
  title: string
  why: string
  action: 'train' | 'review'
  shapeId?: string
  notes?: string
  targetSeconds?: number
}

export function practiceRecsFor(athlete: Athlete, homework: HomeworkItem[]): PracticeRec[] {
  const recs: PracticeRec[] = []
  const has = (id: string) => homework.some((h) => h.athleteId === athlete.id && h.shapeId === id)

  if ((athlete.openShoulderHardness ?? 0) >= 3) {
    recs.push({
      id: 'open-shoulders',
      title: 'Open shoulders',
      why: 'Handstand push-ups and bridge work can make open shoulders feel easier over time.',
      action: 'train',
      shapeId: 'rainbow_bridge',
      notes:
        'Rainbow bridge first: feet flat, hips up, spread the arch. Then handstand push-ups when the shoulders start to open.',
      targetSeconds: 30,
    })
  }

  recs.push({
    id: 'handstand-skill',
    title: 'Handstand',
    why: 'The handstand may be the most important tumbling skill. A calm hold makes everything else cleaner.',
    action: 'train',
    shapeId: 'handstand',
    notes: 'Ears covered, ribs in, butt in, legs together. Wall first if the floor still wobbles.',
    targetSeconds: 20,
  })

  recs.push({
    id: 'hollow-staple',
    title: 'Hollow',
    why: 'Hollow is a staple in tumbling. It is how you stay tight in the air.',
    action: 'train',
    shapeId: 'hollow_arms_down',
    notes: 'Low back pressed down, ribs in, legs long. Arms by the ears when arms-down is easy.',
    targetSeconds: 30,
  })

  if (athlete.hasBackPain) {
    recs.push({
      id: 'iso-pain',
      title: 'Iso holds',
      why: 'Iso holds can get you out of pain and help keep you out of pain.',
      action: 'train',
      shapeId: 'hollow_arms_down',
      notes: 'Easy hollow and Superman holds. Stop if anything sharp shows up, this is care, not a max out.',
      targetSeconds: 20,
    })
  }

  if (athlete.harderShape === 'superman') {
    recs.push({
      id: 'superman-catchup',
      title: 'Superman',
      why: 'The Superman should feel as easy as your hollow. Train the one that still fights you.',
      action: 'train',
      shapeId: 'superman',
      notes: 'Thumbs up, chest off the floor, legs long. Match the hollow time you already have.',
      targetSeconds: 20,
    })
  }

  const last = athlete.shapeTests?.at(-1)
  if (last && last.total > 0 && last.score < last.total) {
    recs.push({
      id: 'review-shapes',
      title: 'Review shapes',
      why: 'You missed some on the last shape test. Look at the stills before you retake it.',
      action: 'review',
    })
  }

  return recs.filter((r) => r.action === 'review' || !r.shapeId || !has(r.shapeId))
}

export function assignRec(athleteId: string, rec: PracticeRec): void {
  if (rec.action !== 'train' || !rec.shapeId) return
  addHomeworkItem({
    id: createId('hw'),
    athleteId,
    shapeId: rec.shapeId,
    source: 'coach',
    notes: rec.notes,
    targetSeconds: rec.targetSeconds,
    createdAt: new Date().toISOString(),
  })
}

export function daysSinceHomework(athleteId: string): number | null {
  const logs = loadHomeworkLogs().filter((l) => l.athleteId === athleteId)
  if (logs.length === 0) return null
  const last = logs.reduce((a, b) => ((a.date || '') >= (b.date || '') ? a : b))
  const t = Date.parse(last.date || '')
  if (!Number.isFinite(t)) return null
  return Math.floor((Date.now() - t) / 86400000)
}

export type RechargeTarget = {
  label: string
  /** Days since this exercise was last logged; null when never logged. */
  days: number | null
  /** ISO date of the last log; null when never logged. */
  lastDate: string | null
  /** How long the exercise has been idle (last log, or creation when never logged). */
  idleDays: number
}

/**
 * The one exercise the standing recharge alert points at: the athlete's
 * stalest homework item, once it has been idle 3+ days. A never-logged
 * item counts from the day it was assigned. Null when everything is
 * fresh (or the athlete has no homework), which clears the alert.
 */
export function rechargeTargetFor(athleteId: string): RechargeTarget | null {
  const items = loadAllHomework().filter((h) => h.athleteId === athleteId)
  if (items.length === 0) return null
  const logs = loadHomeworkLogs().filter((l) => l.athleteId === athleteId)
  const now = Date.now()
  let best: RechargeTarget | null = null
  for (const item of items) {
    const mine = logs.filter((l) => l.homeworkId === item.id)
    const last = mine.length > 0 ? mine.reduce((a, b) => ((a.date || '') >= (b.date || '') ? a : b)) : null
    const lastT = last ? Date.parse(last.date || '') : NaN
    const days = Number.isFinite(lastT) ? Math.floor((now - lastT) / 86400000) : null
    const createdT = Date.parse(item.createdAt || '')
    const idleDays = days ?? (Number.isFinite(createdT) ? Math.floor((now - createdT) / 86400000) : 9999)
    if (idleDays < 3) continue
    if (!best || idleDays > best.idleDays) {
      best = { label: homeworkTitle(item), days, lastDate: last?.date ?? null, idleDays }
    }
  }
  return best
}

/** Title and body for the standing recharge alert. */
export function rechargeCopy(target: RechargeTarget): { title: string; body: string } {
  const title = `Recharge: ${target.label}`
  if (target.days === null || !target.lastDate) {
    return {
      title,
      body: `You have not logged ${target.label} yet. Do it today and log what you did to get it started.`,
    }
  }
  const when = new Date(target.lastDate).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const ago = target.days === 1 ? '1 day ago' : `${target.days} days ago`
  return {
    title,
    body: `You last logged ${target.label} on ${when}, ${ago}. Do it today and log what you did to recharge it.`,
  }
}

/**
 * True when the athlete has back pain, was consistent on 2-minute back
 * extensions, and then stopped for over a week. The ONLY case where the
 * "stay out of pain" nudge fires.
 */
function lapsedBackExtension(athleteId: string): boolean {
  const itemIds = new Set(
    loadAllHomework()
      .filter((h) => h.athleteId === athleteId && h.catalogId === 'back_extension')
      .map((h) => h.id),
  )
  if (itemIds.size === 0) return false
  const now = Date.now()
  const logs = loadHomeworkLogs().filter(
    (l) =>
      l.athleteId === athleteId &&
      itemIds.has(l.homeworkId) &&
      Number.isFinite(Date.parse(l.date || '')) &&
      now - Date.parse(l.date || '') < 90 * 86400000,
  )
  if (logs.length === 0) return false
  // "done 2 minutes consistently": at least 3 logs hitting the 2:00 standard
  const twoMin = logs.filter((l) => (l.totalHoldSeconds ?? 0) >= 120).length
  if (twoMin < 3) return false
  // "stopped for over a week": nothing logged in the last 7 days
  const last = logs.reduce((a, b) => ((a.date || '') >= (b.date || '') ? a : b))
  return now - Date.parse(last.date || '') > 7 * 86400000
}

/**
 * Starter holds in Ryan's priority order, each with a known benefit from the
 * foundation facts. Used to nudge athletes who haven't logged any of these.
 */
const STARTER_HOLDS: { label: string; benefit?: string; match: (h: HomeworkItem) => boolean }[] = [
  {
    label: 'Hollow',
    benefit: 'It all starts with a strong hollow.',
    match: (h) => h.autoKey === 'hollow',
  },
  {
    label: 'Superman',
    match: (h) => h.autoKey === 'superman',
  },
  {
    label: 'Side plank',
    benefit: 'Develops the lateral core and is a useful shape for twist drills.',
    match: (h) => h.autoKey === 'side_plank',
  },
  {
    label: 'Push-ups',
    benefit: 'Push ups build stronger shoulder support for handstands, round offs and back handsprings.',
    match: (h) => h.catalogId === 'pushup',
  },
  {
    label: 'V-ups',
    benefit: 'Strong V ups lead to stronger standing tucks and stronger layouts. Build them early on!',
    match: (h) => h.catalogId === 'v_up',
  },
]

/**
 * If the athlete hasn't logged any of the starter holds, suggest the first
 * unlogged one with its benefit. Returns null when they've started.
 */
function unstartedHoldSuggestion(athleteId: string): string | null {
  const items = loadAllHomework().filter((h) => h.athleteId === athleteId)
  const logs = loadHomeworkLogs().filter((l) => l.athleteId === athleteId)
  const loggedHomeworkIds = new Set(logs.map((l) => l.homeworkId))
  for (const starter of STARTER_HOLDS) {
    const item = items.find(starter.match)
    // Suggest it when there's no item yet, or the item has no logs.
    if (!item || !loggedHomeworkIds.has(item.id)) {
      const why = starter.benefit ? ` ${starter.benefit}` : ''
      return `${starter.label} is a good place to start.${why} Log your first one today.`
    }
  }
  return null
}
export function homeworkNudgeCopy(athlete: Athlete): string {
  const firstName = athlete.name.split(' ')[0]
  const dayOfYear = Math.floor(Date.now() / 86400000)

  // Back-pain re-engagement: ONLY for athletes with back pain who were
  // consistent on 2-minute back extensions and then stopped for over a week.
  if (athlete.hasBackPain && lapsedBackExtension(athlete.id)) {
    return `It's easier to stay out of pain than it is to get out of pain. Stay on top of back extension work.`
  }

  // Check consistency: longest streak in the last 60 days
  const logs = loadHomeworkLogs().filter((l) => l.athleteId === athlete.id)
  const recentLogs = logs.filter((l) => {
    const t = Date.parse(l.date || '')
    return Number.isFinite(t) && Date.now() - t < 60 * 86400000
  })
  const wasConsistent = recentLogs.length >= 8

  // Pool of nudge angles — rotates daily
  const pool: string[] = []

  // 1. Profile-based
  if (athlete.harderShape === 'superman') {
    pool.push(`${firstName}, Superman should feel as easy as hollow. A few holds today close that gap.`)
  }
  if ((athlete.openShoulderHardness ?? 0) >= 4) {
    pool.push(`Open shoulders get easier with bridge and handstand work. One round today.`)
  }

  // 2. Starter holds: hasn't logged any of the core holds yet. Rotates in
  // with everything else so it encourages without flooding.
  const starter = unstartedHoldSuggestion(athlete.id)
  if (starter) pool.push(starter)

  // 3. Consistency encouragement
  if (wasConsistent) {
    pool.push(`${firstName}, you were on a roll not long ago. One round today gets it back.`)
    pool.push(`Remember how consistent you were? That version of you is one session away.`)
  } else {
    pool.push(`Small today beats perfect tomorrow. One round of holds and you're back in it.`)
  }

  // 4. Specific exercise recharge (from foundation facts)
  const facts = FOUNDATION_FACTS_DRAFT
  if (facts.length > 0) {
    const fact = facts[dayOfYear % facts.length]!
    pool.push(`Remember to recharge with ${fact.exercise.toLowerCase()}: ${fact.fact}`)
  }

  // 5. Default fallback
  pool.push(`Handstand is the skill everything else hangs on. Even a short wall hold today counts.`)

  return pool[dayOfYear % pool.length]!
}

export type HoldBenchmarkKey = 'hollow' | 'superman' | 'side_plank' | 'wall_handstand'

export type HoldBenchmark = {
  autoKey: HoldBenchmarkKey
  label: string
  targetSeconds: number
  bestSeconds: number
  met: boolean
}

/**
 * Ryan's hold benchmarks behind the training nudge: 60s hollow, 60s Superman,
 * 60s wall handstand, 45s side plank.
 */
export const HOLD_BENCHMARKS: {
  autoKey: HoldBenchmarkKey
  label: string
  targetSeconds: number
}[] = [
  { autoKey: 'hollow', label: 'Hollow hold', targetSeconds: 60 },
  { autoKey: 'superman', label: 'Superman', targetSeconds: 60 },
  { autoKey: 'wall_handstand', label: 'Wall handstand', targetSeconds: 60 },
  { autoKey: 'side_plank', label: 'Side plank', targetSeconds: 45 },
]

/** Best logged hold per benchmark hold, from the athlete's auto homework logs. */
export function holdBenchmarksFor(athleteId: string): HoldBenchmark[] {
  const homework = loadAllHomework().filter((h) => h.athleteId === athleteId)
  const keyByHomeworkId = new Map(homework.map((h) => [h.id, h.autoKey]))
  const logs = loadHomeworkLogs().filter((l) => l.athleteId === athleteId)
  return HOLD_BENCHMARKS.map((b) => {
    let best = 0
    for (const log of logs) {
      if (keyByHomeworkId.get(log.homeworkId) !== b.autoKey) continue
      const s = log.totalHoldSeconds ?? 0
      if (s > best) best = s
    }
    return { ...b, bestSeconds: best, met: best >= b.targetSeconds }
  })
}

export function formatHoldSeconds(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
