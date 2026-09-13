/**
 * Coach names test — pair faces with names for a class, camp, school,
 * or the desk roster. Two directions: who is this, and which face is this name.
 */

import type { Athlete } from '../types'
import { coachWorkedWithAthlete } from './coachLink'
import {
  classLabel,
  getActiveMeeting,
  loadMeetings,
  loadOfferingsForCoach,
  resolveAttendeeAthletes,
  type ClassMeeting,
  type CoachClassOffering,
} from './coachClasses'
import { findLiveLesson, lessonAthleteIds } from './lessonStore'
import { givenName } from './classStation'
import { eventKindLabel, listTrainingEvents, type TrainingEvent } from './trainingEvents'
import { profileRole } from './profileRole'
import { namesHardness, namesStatsForCoach, type NamesAthleteStat } from './namesMisses'

export type NamesQuizMode = 'mix' | 'who' | 'face'

export type NamesGroupKind = 'live' | 'event' | 'class' | 'desk'

export type NamesGroup = {
  id: string
  kind: NamesGroupKind
  label: string
  eyebrow: string
  athleteIds: string[]
}

export type NamesChoice = {
  id: string
  label: string
  photoDataUrl?: string
}

export type NamesQuestion = {
  id: string
  kind: 'who' | 'face'
  prompt: string
  /** First name only — shown for face cards, never on who-is-this options. */
  namePrompt?: string
  answerId: string
  photoUrl?: string
  choices: NamesChoice[]
  explain: string
}

export function hasAthleteFace(athlete: Athlete | null | undefined): boolean {
  const src = athlete?.photoDataUrl?.trim() ?? ''
  return src.length > 24
}

export function isNamesKid(athlete: Athlete): boolean {
  const role = profileRole(athlete)
  return role === 'athlete' || !athlete.role
}

export function namesReadyCount(athletes: Athlete[]): {
  faces: number
  missing: number
  total: number
} {
  const kids = athletes.filter(isNamesKid)
  const faces = kids.filter(hasAthleteFace).length
  return { faces, missing: kids.length - faces, total: kids.length }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Standing roster plus every profile matched from past and live meetings. */
function allOfferingAthleteIds(offering: CoachClassOffering, athletes: Athlete[]): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const id of offering.rosterIds) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    ordered.push(id)
  }
  for (const meeting of loadMeetings()) {
    if (meeting.offeringId !== offering.id) continue
    for (const row of resolveAttendeeAthletes(meeting, athletes)) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      ordered.push(row.id)
    }
  }
  return ordered
}

function byId(athletes: Athlete[], ids: string[]): Athlete[] {
  const seen = new Set<string>()
  const out: Athlete[] = []
  for (const id of ids) {
    if (!id || seen.has(id)) continue
    const row = athletes.find((a) => a.id === id)
    if (!row || !isNamesKid(row)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

export function listNamesGroups(opts: {
  athletes: Athlete[]
  coach: Athlete | null
  events?: TrainingEvent[]
  offerings?: CoachClassOffering[]
  liveMeeting?: ClassMeeting | null
}): NamesGroup[] {
  const coach = opts.coach
  if (!coach) return []
  const events = opts.events ?? listTrainingEvents().filter((e) => e.coachIds.includes(coach.id))
  const offerings = opts.offerings ?? loadOfferingsForCoach(coach.id)
  const live = opts.liveMeeting ?? getActiveMeeting(coach.id)
  const groups: NamesGroup[] = []

  if (live) {
    const offering = offerings.find((o) => o.id === live.offeringId)
    const here = resolveAttendeeAthletes(live, opts.athletes).map((a) => a.id)
    const fromOffering = offering ? allOfferingAthleteIds(offering, opts.athletes) : []
    const ids = [...new Set([...here, ...fromOffering])]
    groups.push({
      id: 'live',
      kind: 'live',
      eyebrow: 'Live class',
      label: offering ? classLabel(offering) : 'Class tonight',
      athleteIds: ids,
    })
  }

  const liveLesson = findLiveLesson(coach.id)
  if (liveLesson) {
    groups.push({
      id: 'live-lesson',
      kind: 'live',
      eyebrow: 'Live lesson',
      label: 'Lesson now',
      athleteIds: [...lessonAthleteIds(liveLesson)],
    })
  }

  for (const event of events) {
    groups.push({
      id: `event:${event.id}`,
      kind: 'event',
      eyebrow: eventKindLabel(event.kind),
      label: event.name,
      athleteIds: [...event.athleteIds],
    })
  }

  for (const offering of offerings) {
    const ids = allOfferingAthleteIds(offering, opts.athletes)
    if (ids.length === 0) continue
    groups.push({
      id: `class:${offering.id}`,
      kind: 'class',
      eyebrow: 'Class',
      label: classLabel(offering),
      athleteIds: ids,
    })
  }

  const desk = opts.athletes.filter(
    (a) => isNamesKid(a) && coachWorkedWithAthlete(coach.id, a),
  )
  groups.push({
    id: 'desk',
    kind: 'desk',
    eyebrow: 'Desk',
    label: 'My athletes',
    athleteIds: desk.map((a) => a.id),
  })

  return groups
}

export function resolveNamesRoster(group: NamesGroup | null | undefined, athletes: Athlete[]): Athlete[] {
  if (!group) return []
  return byId(athletes, group.athleteIds)
}

export function findNamesGroup(groups: NamesGroup[], id: string | null | undefined): NamesGroup | null {
  if (!id) return null
  return groups.find((g) => g.id === id) ?? null
}

export type NamesDeckItem = {
  athleteId: string
  kind: 'who' | 'face'
}

/** Every athlete on the roster, hardest names first. Mix asks both ways. */
export function buildNamesDeck(
  roster: Athlete[],
  mode: NamesQuizMode = 'mix',
  coachId?: string | null,
): NamesDeckItem[] {
  const faces = roster.filter((a) => isNamesKid(a) && hasAthleteFace(a))
  if (faces.length < 2) return []
  const stats = namesStatsForCoach(coachId)
  const kinds: Array<'who' | 'face'> =
    mode === 'mix' ? ['who', 'face'] : mode === 'who' ? ['who'] : ['face']
  const slots: NamesDeckItem[] = faces.flatMap((athlete) =>
    kinds.map((kind) => ({ athleteId: athlete.id, kind })),
  )
  return shuffle(slots).sort(
    (a, b) => namesHardness(stats[b.athleteId]) - namesHardness(stats[a.athleteId]),
  )
}

export function makeNamesQuestion(
  item: NamesDeckItem,
  roster: Athlete[],
  serial: number,
): NamesQuestion | null {
  const kids = roster.filter(isNamesKid)
  const faces = kids.filter(hasAthleteFace)
  const answer = faces.find((a) => a.id === item.athleteId)
  if (!answer) return null
  const who = givenName(answer)
  const nameChoiceN = Math.min(4, Math.max(2, kids.length))
  const faceChoiceN = Math.min(4, Math.max(2, faces.length))
  if (item.kind === 'who') {
    const decoys = shuffle(kids.filter((a) => a.id !== answer.id)).slice(0, nameChoiceN - 1)
    return {
      id: `who-${answer.id}-${serial}`,
      kind: 'who',
      prompt: 'Who is this?',
      answerId: answer.id,
      photoUrl: answer.photoDataUrl,
      choices: shuffle([answer, ...decoys]).map((a) => ({
        id: a.id,
        label: givenName(a),
      })),
      explain: `That’s ${who} — ${answer.name}.`,
    }
  }
  const decoys = shuffle(faces.filter((a) => a.id !== answer.id)).slice(0, faceChoiceN - 1)
  return {
    id: `face-${answer.id}-${serial}`,
    kind: 'face',
    prompt: `Which face is this name?`,
    answerId: answer.id,
    namePrompt: who,
    choices: shuffle([answer, ...decoys]).map((a) => ({
      id: a.id,
      label: a.name,
      photoDataUrl: a.photoDataUrl,
    })),
    explain: `${who} is this face — ${answer.name}.`,
  }
}

/** Missed item comes back after a couple of others so the face is not the next card. */
export function requeueMiss(remaining: NamesDeckItem[], missed: NamesDeckItem): NamesDeckItem[] {
  const rest = remaining.filter(
    (row) => !(row.athleteId === missed.athleteId && row.kind === missed.kind),
  )
  const insertAt = Math.min(2, rest.length)
  return [...rest.slice(0, insertAt), missed, ...rest.slice(insertAt)]
}

export function namesDeckLabel(mode: NamesQuizMode, faces: number): string {
  const cards = mode === 'mix' ? faces * 2 : faces
  if (mode === 'mix') return `Every name, both ways · ${cards} cards`
  if (mode === 'who') return `Every face · ${cards} cards`
  return `Every name · ${cards} cards`
}

export function buildNamesQuiz(
  roster: Athlete[],
  mode: NamesQuizMode = 'mix',
  _count = 10,
  coachId?: string | null,
): NamesQuestion[] {
  return buildNamesDeck(roster, mode, coachId)
    .map((item, index) => makeNamesQuestion(item, roster, index))
    .filter((q): q is NamesQuestion => Boolean(q))
}

export type { NamesAthleteStat }
