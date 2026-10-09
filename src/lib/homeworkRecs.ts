import type { Athlete, HomeworkItem } from '../types'
import { addHomeworkItem, createId, loadAllHomework, loadHomeworkLogs } from './storage'
import { FOUNDATION_FACTS_DRAFT } from '../config/foundationFacts'

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

/**
 * Rotating homework nudge copy. Picks a different message each day so it's
 * not the same alert on repeat. Mixes:
 * - Profile-based coaching (superman gap, open shoulders, back pain)
 * - Pain prevention ("easier to stay out of pain than to get out of pain")
 * - Consistency encouragement (references their own log streaks)
 * - Specific exercise recharge (from the foundation facts deck)
 */
export function homeworkNudgeCopy(athlete: Athlete): string {
  const firstName = athlete.name.split(' ')[0]
  const dayOfYear = Math.floor(Date.now() / 86400000)

  // Check consistency: longest streak in the last 60 days
  const logs = loadHomeworkLogs().filter((l) => l.athleteId === athlete.id)
  const recentLogs = logs.filter((l) => {
    const t = Date.parse(l.date || '')
    return Number.isFinite(t) && Date.now() - t < 60 * 86400000
  })
  const wasConsistent = recentLogs.length >= 8

  // Pool of nudge angles — rotates daily
  const pool: string[] = []

  // 1. Profile-based (original logic, kept)
  if (athlete.harderShape === 'superman') {
    pool.push(`${firstName}, Superman should feel as easy as hollow. A few holds today close that gap.`)
  }
  if ((athlete.openShoulderHardness ?? 0) >= 4) {
    pool.push(`Open shoulders get easier with bridge and handstand work. One round today.`)
  }
  if (athlete.hasBackPain) {
    pool.push(`Iso holds are how you stay out of pain. Hollow or Superman for a minute beats skipping.`)
  }

  // 2. Pain prevention (Ryan's wording)
  pool.push(`It's easier to stay out of pain than to get out of pain. Back extension work today keeps you there.`)
  pool.push(`Your back will thank you later. Superman holds or bridges, just a few minutes.`)

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
