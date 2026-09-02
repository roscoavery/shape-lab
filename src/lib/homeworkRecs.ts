import type { Athlete, HomeworkItem } from '../types'
import { addHomeworkItem, createId, loadHomeworkLogs } from './storage'

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
      notes: 'Easy hollow and Superman holds. Stop if anything sharp shows up — this is care, not a max out.',
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

export function homeworkNudgeCopy(athlete: Athlete): string {
  if (athlete.harderShape === 'superman') {
    return `${athlete.name.split(' ')[0]}, Superman should feel as easy as hollow. A few holds today close that gap.`
  }
  if ((athlete.openShoulderHardness ?? 0) >= 4) {
    return `Open shoulders get easier with bridge and handstand work — not with hoping. One round today.`
  }
  if (athlete.hasBackPain) {
    return `Iso holds are how you stay out of pain. Hollow or Superman for a minute beats skipping.`
  }
  return `Handstand is the skill everything else hangs on. Even a short wall hold today counts.`
}
