/**
 * Parked New athlete · shape test progress.
 * Answers already live on the athlete. This remembers which screen they
 * were on — including a mid-pictures quiz — so the next rotation can
 * continue without starting over.
 */

import type { Athlete, ReferencePhoto } from '../types'
import type { QuizFormat, QuizPool, QuizQuestion } from './shapeQuiz'
import { pickReferencePhoto } from './storage'
import { namesMatch } from './classStation'

export type ShapeTestParkPhase = 'intake' | 'format' | 'quiz'

export type ParkedQuizQuestion = {
  id: string
  kind: QuizQuestion['kind']
  shapeId: string
  prompt: string
  stillId: string | null
  choices: { id: string; label: string }[]
  answerId: string
}

export type ShapeTestPark = {
  phase: ShapeTestParkPhase
  format?: QuizFormat
  pool?: QuizPool
  index?: number
  picked?: string | null
  pickedIds?: (string | null)[]
  questions?: ParkedQuizQuestion[]
  updatedAt: string
}

export type GuestShapeTestPark = {
  firstName: string
  lastName: string
  park: ShapeTestPark
}

const GUEST_KEY = 'shape-lab.shapeTestPark.guests.v1'

function readGuests(): GuestShapeTestPark[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GuestShapeTestPark[]
    return Array.isArray(parsed) ? parsed.filter((g) => g?.firstName && g?.park) : []
  } catch {
    return []
  }
}

function writeGuests(list: GuestShapeTestPark[]) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(list.slice(0, 80)))
  } catch {
    /* quota */
  }
}

export function makeShapeTestPark(
  phase: ShapeTestParkPhase,
  extra: Partial<ShapeTestPark> = {},
): ShapeTestPark {
  return {
    phase,
    ...extra,
    updatedAt: new Date().toISOString(),
  }
}

export function parkQuestions(questions: QuizQuestion[]): ParkedQuizQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    kind: q.kind,
    shapeId: q.shapeId,
    prompt: q.prompt,
    stillId: q.stillId,
    choices: q.choices,
    answerId: q.answerId,
  }))
}

export function reviveQuestions(
  parked: ParkedQuizQuestion[],
  photos: ReferencePhoto[],
): QuizQuestion[] {
  return parked.map((q) => {
    const fromStill = q.stillId ? photos.find((p) => p.id === q.stillId) : null
    const fromShape = pickReferencePhoto(photos, q.shapeId, null)
    return {
      ...q,
      photoUrl: fromStill?.dataUrl ?? fromShape?.dataUrl ?? null,
    }
  })
}

export function parkPhaseLabel(park: ShapeTestPark): string {
  if (park.phase === 'intake') return 'Before the pictures'
  if (park.phase === 'format') return 'Choose how to take it'
  const n = (park.index ?? 0) + 1
  const total = park.questions?.length
  return total ? `Pictures test · ${n} / ${total}` : `Pictures test · ${n}`
}

export function loadGuestParks(): GuestShapeTestPark[] {
  return readGuests().sort((a, b) => b.park.updatedAt.localeCompare(a.park.updatedAt))
}

export function upsertGuestPark(
  firstName: string,
  lastName: string,
  park: ShapeTestPark,
): GuestShapeTestPark[] {
  const first = firstName.trim()
  const last = lastName.trim()
  if (!first) return loadGuestParks()
  const rest = readGuests().filter((g) => !namesMatch(g, first, last))
  const next = [{ firstName: first, lastName: last, park }, ...rest]
  writeGuests(next)
  return next
}

export function clearGuestPark(firstName: string, lastName: string): GuestShapeTestPark[] {
  const next = readGuests().filter((g) => !namesMatch(g, firstName, lastName))
  writeGuests(next)
  return next
}

export function peekGuestPark(firstName: string, lastName: string): ShapeTestPark | null {
  return readGuests().find((g) => namesMatch(g, firstName, lastName))?.park ?? null
}

export function readTakerPark(
  taker: { firstName: string; lastName: string; athleteId?: string } | null | undefined,
  athletes: Athlete[],
): ShapeTestPark | null {
  if (!taker) return null
  if (taker.athleteId) {
    const row = athletes.find((a) => a.id === taker.athleteId)
    if (row?.shapeTestPark) return row.shapeTestPark
  }
  const named = athletes.find((a) => namesMatch(a, taker.firstName, taker.lastName))
  if (named?.shapeTestPark) return named.shapeTestPark
  return peekGuestPark(taker.firstName, taker.lastName)
}

export function withClearedPark(athlete: Athlete): Athlete {
  if (!athlete.shapeTestPark) return athlete
  return { ...athlete, shapeTestPark: undefined }
}
