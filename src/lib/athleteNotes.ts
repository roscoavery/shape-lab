import type { Athlete, AthleteCoachNote } from '../types'
import { isGymAdmin, isCoachProfile } from './profileRole'
import { createId } from './storage'

export function visibleCoachNotes(
  athlete: Athlete,
  viewer: Athlete | null,
): AthleteCoachNote[] {
  const all = athlete.coachNotes ?? []
  if (!viewer) return []
  if (isGymAdmin(viewer)) return all
  if (isCoachProfile(viewer)) return all.filter((n) => n.authorId === viewer.id)
  return []
}

export function canWriteCoachNotes(viewer: Athlete | null): boolean {
  return Boolean(viewer && (isCoachProfile(viewer) || isGymAdmin(viewer)))
}

export function addCoachNotesToAthletes(
  athletes: Athlete[],
  athleteIds: string[],
  input: {
    author: Athlete
    text: string
    meetingId?: string
    lessonId?: string
    className?: string
    topicLabel?: string
  },
): Athlete[] {
  const text = input.text.trim()
  if (!text || athleteIds.length === 0) return athletes
  const now = new Date().toISOString()
  const ids = new Set(athleteIds)
  return athletes.map((a) => {
    if (!ids.has(a.id)) return a
    const note: AthleteCoachNote = {
      id: createId('anote'),
      authorId: input.author.id,
      authorName: input.author.name,
      text: text.slice(0, 800),
      createdAt: now,
      ...(input.meetingId ? { meetingId: input.meetingId } : {}),
      ...(input.lessonId ? { lessonId: input.lessonId } : {}),
      ...(input.className ? { className: input.className } : {}),
      ...(input.topicLabel?.trim() ? { topicLabel: input.topicLabel.trim() } : {}),
    }
    return {
      ...a,
      coachNotes: [note, ...(a.coachNotes ?? [])].slice(0, 80),
    }
  })
}
