/**
 * Stock strength homework — holds, reps, or both.
 * Camera scoring stays on the 4 core drills; these log reps / quality reps.
 */

import type { HomeworkTrackMode } from '../types'

export const CATALOG_PREFIX = 'catalog:'

export const PULLUP_GRIPS = [
  { id: 'overhand', label: 'Overhand' },
  { id: 'underhand', label: 'Underhand / chin-up' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'mixed', label: 'Mixed' },
] as const

export type HomeworkCatalogAudience = 'class' | 'care' | 'all'

export type HomeworkCatalogItem = {
  id: string
  name: string
  trackMode: HomeworkTrackMode
  targetReps?: number
  targetSeconds?: number
  allowWeight?: boolean
  grips?: boolean
  wristPrep?: boolean
  /** care = coach back-pain path; class = end-of-class stock; all = both. */
  audience?: HomeworkCatalogAudience
  notes: string
  cues: string[]
}

export const HOMEWORK_CATALOG: HomeworkCatalogItem[] = [
  {
    id: 'candlestick',
    name: 'Candlestick drills',
    trackMode: 'hold_or_reps',
    targetSeconds: 20,
    targetReps: 8,
    audience: 'class',
    notes:
      'Shoulder-stand candle and the handstand-roll candle. Open hips, ribs in, climb down with control.',
    cues: [
      'Ribs in. Hips open toward the ceiling.',
      'Hands stay on the floor unless this is a shoulder-stand finish.',
      'A quality rep is a still candle you can hold for a beat.',
    ],
  },
  {
    id: 'study_shapes',
    name: 'Study shapes + take the shape test',
    trackMode: 'journal',
    audience: 'class',
    notes:
      'At home: go through the shape library, then take the shape test. Log when you finish so the coach can see it.',
    cues: [
      'Open Learn → Shape library. Read the still and the written standard.',
      'Then take the shape test — pictures or descriptions.',
      'Write which shapes you studied if you want the coach to see it.',
    ],
  },
  {
    id: 'bridge_pushup',
    name: 'Bridge push-ups',
    trackMode: 'reps',
    targetReps: 8,
    wristPrep: true,
    notes:
      'From a rainbow or long bridge. Warm wrists first. Slow elbows, hips stay high, push the floor away.',
    cues: [
      'Warm the wrists before any bridge work.',
      'Hips stay the highest point.',
      'Count a quality rep only when the elbows finish and the hips do not sag.',
    ],
  },
  {
    id: 'v_up',
    name: 'V-ups',
    trackMode: 'reps',
    targetReps: 10,
    notes: 'Hollow body, reach for the toes, control the lower. Quality over speed.',
    cues: [
      'Low back stays heavy on the way down.',
      'Legs together, toes pointed if you can.',
      'A quality rep is a full reach you can hold for a beat.',
    ],
  },
  {
    id: 'pushup',
    name: 'Push-ups',
    trackMode: 'reps',
    targetReps: 10,
    notes: 'Plank line. Chest to a fist-height if full range is not there yet.',
    cues: [
      'Ribs in, glutes on, neck long.',
      'Elbows track about 45° — not flared to the ears.',
      'Quality reps keep the same plank from the first to the last.',
    ],
  },
  {
    id: 'pullup',
    name: 'Pull-ups',
    trackMode: 'reps',
    targetReps: 5,
    grips: true,
    notes: 'Log the grip you used. Chin over the bar is a full rep; quality reps stay quiet in the shoulders.',
    cues: [
      'Pick a grip and keep it for the set.',
      'Shoulders down before you pull.',
      'A quality rep is chin over without a huge kip unless that is the assigned style.',
    ],
  },
  {
    id: 'back_extension',
    name: 'Back extensions',
    trackMode: 'hold_or_reps',
    audience: 'care',
    targetSeconds: 120,
    targetReps: 8,
    allowWeight: true,
    notes:
      'Build tissue tolerance without chasing pain. Do not start reps until you can hold 2 minutes with no pain. If you cannot get on the machine, stay off a few days, then ease back in from a slight arch toward a straight body.',
    cues: [
      'Goal: expose the back to what it can handle today, then stop.',
      'Iso hold first. Two pain-free minutes unlocks slow, tiny-range reps.',
      'Reps are slow. Minimal range. No bouncing.',
      'If it hurts, that is information — write it in the journal and do less, not more.',
    ],
  },
  {
    id: 'glute_bridge',
    name: 'Glute bridges',
    trackMode: 'hold_or_reps',
    audience: 'care',
    targetSeconds: 30,
    targetReps: 10,
    allowWeight: true,
    notes:
      'Feet planted, ribs quiet, squeeze the glutes to lift. Holds or slow reps. A light weight on the hips is optional.',
    cues: [
      'Drive through the heels. Do not crank the low back.',
      'Pause at the top of a quality rep.',
      'If the back talks louder than the glutes, shorten the range.',
    ],
  },
]

export function catalogShapeId(id: string): string {
  return `${CATALOG_PREFIX}${id}`
}

export function catalogIdFromShape(shapeId: string): string | null {
  if (!shapeId.startsWith(CATALOG_PREFIX)) return null
  return shapeId.slice(CATALOG_PREFIX.length)
}

export function catalogAudience(item: HomeworkCatalogItem): HomeworkCatalogAudience {
  return item.audience ?? 'all'
}

export function stockCatalogFor(audience: HomeworkCatalogAudience | 'class'): HomeworkCatalogItem[] {
  if (audience === 'class') {
    return HOMEWORK_CATALOG.filter((item) => {
      const who = catalogAudience(item)
      return who === 'class'
    })
  }
  return HOMEWORK_CATALOG.filter((item) => catalogAudience(item) !== 'care')
}

export const CORE_HOMEWORK_PICKS: { autoKey: string; name: string; hint: string }[] = [
  { autoKey: 'hollow', name: 'Hollow', hint: 'Core drill already on every athlete — coach assigned, no second card' },
  { autoKey: 'superman', name: 'Superman', hint: 'Core drill already on every athlete — coach assigned, no second card' },
  { autoKey: 'side_plank', name: 'Side plank', hint: 'Core drill already on every athlete — coach assigned, no second card' },
  { autoKey: 'wall_handstand', name: 'Wall handstand', hint: 'Core drill already on every athlete — coach assigned, no second card' },
]

export function getCatalogItem(id: string | undefined | null): HomeworkCatalogItem | undefined {
  if (!id) return undefined
  const key = id.startsWith(CATALOG_PREFIX) ? id.slice(CATALOG_PREFIX.length) : id
  return HOMEWORK_CATALOG.find((item) => item.id === key)
}

export function needsWristPrep(shapeId: string, catalogId?: string): boolean {
  if (shapeId === 'rainbow_bridge' || shapeId === 'long_bridge') return true
  if (shapeId.includes('long_bridge') || shapeId.includes('rainbow')) return true
  const cat = getCatalogItem(catalogId ?? catalogIdFromShape(shapeId) ?? undefined)
  return Boolean(cat?.wristPrep)
}

export const CARE_RESOURCES = {
  back: {
    name: 'Brendan Backstrom · Low Back Ability',
    why: 'A patient, tissue-tolerance approach to getting a back that can handle life again.',
    links: [
      { label: 'Low Back Ability program', href: 'https://lowbackability.com/' },
      { label: 'What the LBA program is', href: 'https://lowbackability.com/what-is-lba/' },
      { label: 'Brendan on Medium', href: 'https://lowbackability.medium.com/' },
    ],
  },
  knee: {
    name: 'Ben Patrick · Knees Over Toes Guy',
    why: 'Free and paid knee-strength work that meets you where you are.',
    links: [
      { label: 'YouTube — Kneesovertoesguy', href: 'https://www.youtube.com/@Kneesovertoesguy' },
      { label: 'ATG Online Coaching', href: 'https://www.atgonlinecoaching.com/' },
      { label: 'Instagram', href: 'https://www.instagram.com/kneesovertoesguy/' },
    ],
  },
} as const
