import { markedFetch } from './authSession'

export const WELLNESS_NOTICE =
  'This is general exercise and wellness guidance, not a diagnosis or treatment. Persistent, severe, worsening, neurologic, traumatic, or otherwise concerning symptoms should be evaluated by an appropriate healthcare professional.'

export type WellnessExerciseId =
  | 'glute_bridge'
  | 'bird_dog'
  | 'back_extension'
  | 'walking'
  | 'mobility'
  | 'other'

export const WELLNESS_EXERCISES: { id: WellnessExerciseId; label: string }[] = [
  { id: 'glute_bridge', label: 'Glute bridges' },
  { id: 'bird_dog', label: 'Bird dogs' },
  { id: 'back_extension', label: 'Back extension' },
  { id: 'walking', label: 'Walking' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'other', label: 'Other' },
]

export type ParentPainEntry = {
  id: string
  date: string
  painLevel: number
  location?: string
  notes?: string
  activity?: string
}

export type ParentExerciseEntry = {
  id: string
  date: string
  exerciseId: WellnessExerciseId
  label: string
  completed: boolean
  holdSeconds?: number
  reps?: number
  notes?: string
}

export type ParentJournalEntry = {
  id: string
  date: string
  body: string
}

export type ParentWellnessProfile = {
  accountId: string
  updatedAt: string
  currentGoals?: string
  mobilityGoals?: string
  strengthGoals?: string
  painAreas?: string
  painEntries: ParentPainEntry[]
  exercises: ParentExerciseEntry[]
  journal: ParentJournalEntry[]
}

export function emptyParentWellness(accountId: string): ParentWellnessProfile {
  return {
    accountId,
    updatedAt: new Date().toISOString(),
    painEntries: [],
    exercises: [],
    journal: [],
  }
}

export async function loadParentWellness(): Promise<ParentWellnessProfile | null> {
  const res = await fetch('/api/parent-wellness', { credentials: 'same-origin', cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Could not load wellness notes.')
  const data = (await res.json()) as { profile?: ParentWellnessProfile }
  return data.profile ?? null
}

export async function saveParentWellness(
  profile: ParentWellnessProfile,
): Promise<ParentWellnessProfile> {
  const res = await markedFetch('/api/parent-wellness', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  if (!res.ok) throw new Error('Could not save wellness notes.')
  const data = (await res.json()) as { profile?: ParentWellnessProfile }
  return data.profile ?? profile
}
