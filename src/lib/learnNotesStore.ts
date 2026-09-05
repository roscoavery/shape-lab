/**
 * Ryan edits for Learn → physics / anatomy / progression.
 * Overlays sit on top of the shipped lesson text and persist on the gym computer.
 */

import type { PhysicsLesson } from '../config/tumblingPhysics'

export type LearnNoteOverlay = {
  title?: string
  kicker?: string
  body?: string[]
  gym?: string
}

export type LearnNotesFile = {
  kind: 'shape-lab-learn-notes'
  version: 1
  updatedAt: string
  lessons: Record<string, LearnNoteOverlay>
}

export function applyLearnOverlay(
  lesson: PhysicsLesson,
  overlay?: LearnNoteOverlay | null,
): PhysicsLesson {
  if (!overlay) return lesson
  return {
    ...lesson,
    title: overlay.title?.trim() || lesson.title,
    kicker: overlay.kicker?.trim() || lesson.kicker,
    body: overlay.body && overlay.body.length > 0 ? overlay.body : lesson.body,
    gym: overlay.gym?.trim() || lesson.gym,
  }
}

export function overlayFromDraft(draft: {
  title: string
  kicker: string
  bodyText: string
  gym: string
}): LearnNoteOverlay {
  const body = draft.bodyText
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+\n/g, ' ').trim())
    .filter(Boolean)
  return {
    title: draft.title.trim(),
    kicker: draft.kicker.trim(),
    body,
    gym: draft.gym.trim(),
  }
}

export async function pullLearnNotes(): Promise<Record<string, LearnNoteOverlay>> {
  try {
    const res = await fetch('/api/learn-notes')
    if (!res.ok) return {}
    const data = (await res.json()) as LearnNotesFile
    if (!data || data.kind !== 'shape-lab-learn-notes' || typeof data.lessons !== 'object') {
      return {}
    }
    return data.lessons
  } catch {
    return {}
  }
}

export async function pushLearnNotes(
  lessons: Record<string, LearnNoteOverlay>,
): Promise<Record<string, LearnNoteOverlay>> {
  const res = await fetch('/api/learn-notes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'shape-lab-learn-notes',
      version: 1,
      updatedAt: new Date().toISOString(),
      lessons,
    }),
  })
  if (!res.ok) throw new Error('Could not save Learn notes to the app.')
  const data = (await res.json()) as LearnNotesFile
  return data.lessons ?? lessons
}
