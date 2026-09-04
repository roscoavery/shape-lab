import type { Athlete, AthleteCoachNote } from '../types'
import { isGymAdmin, isCoachProfile } from './profileRole'
import { canSeePrivateCoaching } from './coachLink'
import { createId } from './storage'

export function visibleCoachNotes(
  athlete: Athlete,
  viewer: Athlete | null,
): AthleteCoachNote[] {
  const all = athlete.coachNotes ?? []
  if (!viewer) return []
  if (isGymAdmin(viewer) || (isCoachProfile(viewer) && canSeePrivateCoaching(viewer, athlete))) {
    return all.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }
  if (isCoachProfile(viewer)) return all.filter((n) => n.authorId === viewer.id)
  return []
}

export function notesForMeeting(athlete: Athlete, meetingId?: string): AthleteCoachNote[] {
  const all = athlete.coachNotes ?? []
  if (!meetingId) return all
  return all.filter((n) => n.meetingId === meetingId)
}

export function groupNotesByAuthor(notes: AthleteCoachNote[]): {
  authorId: string
  authorName: string
  notes: AthleteCoachNote[]
}[] {
  const order: string[] = []
  const byAuthor = new Map<string, AthleteCoachNote[]>()
  for (const note of notes.slice().sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))) {
    const id = note.authorId || 'unknown'
    if (!byAuthor.has(id)) {
      order.push(id)
      byAuthor.set(id, [])
    }
    byAuthor.get(id)!.push(note)
  }
  return order.map((authorId) => {
    const rows = byAuthor.get(authorId) ?? []
    return {
      authorId,
      authorName: rows[0]?.authorName || 'Coach',
      notes: rows,
    }
  })
}

export function canEditCoachNote(viewer: Athlete | null, note: AthleteCoachNote): boolean {
  if (!viewer || !canWriteCoachNotes(viewer)) return false
  return isGymAdmin(viewer) || note.authorId === viewer.id
}

export function updateCoachNote(
  athlete: Athlete,
  noteId: string,
  text: string,
  editor: Athlete,
): Athlete {
  const next = text.trim().slice(0, 800)
  if (!next) return athlete
  return {
    ...athlete,
    coachNotes: (athlete.coachNotes ?? []).map((n) => {
      if (n.id !== noteId) return n
      if (!canEditCoachNote(editor, n)) return n
      return { ...n, text: next, updatedAt: new Date().toISOString() }
    }),
  }
}

export function relabelMeetingNotes(
  athletes: Athlete[],
  meetingId: string,
  className: string,
): Athlete[] {
  return athletes.map((a) => ({
    ...a,
    coachNotes: (a.coachNotes ?? []).map((n) =>
      n.meetingId === meetingId ? { ...n, className } : n,
    ),
  }))
}

export function applyCoachNoteUpdate(
  athletes: Athlete[],
  athleteId: string,
  noteId: string,
  text: string,
  editor: Athlete,
): Athlete[] {
  return athletes.map((a) => (a.id === athleteId ? updateCoachNote(a, noteId, text, editor) : a))
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
