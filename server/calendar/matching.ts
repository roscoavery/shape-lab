import type { Athlete } from '../../src/types.ts'
import type {
  AthleteCalendarAlias,
  CalendarEvent,
  CalendarEventMapping,
  CalendarTitleMapping,
  CalendarMatchStatus,
} from './types.ts'

export function normalizeAlias(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
}

export function normalizePersonName(name: string): string {
  return normalizeAlias(name)
}

export function athleteFullName(a: Athlete): string {
  const first = a.firstName?.trim()
  const last = a.lastName?.trim()
  if (first && last) return `${first} ${last}`
  return a.name.trim()
}

export type MatchInput = {
  title: string
  seriesKey: string
  connectionId: string
  coachAthletes: Athlete[]
  aliases: AthleteCalendarAlias[]
  seriesMappings: CalendarEventMapping[]
  titleMappings: CalendarTitleMapping[]
}

export type MatchResult = {
  athleteId: string | null
  matchStatus: CalendarMatchStatus
  matchConfidence: number
  ambiguousAthleteIds?: string[]
}

function uniqueFirstNameMatches(titleNorm: string, athletes: Athlete[]): Athlete[] {
  const tokens = titleNorm.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []
  const first = tokens[0]!
  const hits = athletes.filter((a) => {
    const fn = (a.firstName?.trim() || a.name.trim().split(/\s+/)[0] || '').toLowerCase()
    return fn === first
  })
  const byFirst = new Map<string, Athlete[]>()
  for (const a of hits) {
    const fn = (a.firstName?.trim() || a.name.trim().split(/\s+/)[0] || '').toLowerCase()
    const list = byFirst.get(fn) ?? []
    list.push(a)
    byFirst.set(fn, list)
  }
  const group = byFirst.get(first)
  if (!group || group.length !== 1) return []
  const only = group[0]!
  const full = normalizePersonName(athleteFullName(only))
  if (titleNorm === full) return [only]
  if (titleNorm === first) return [only]
  if (titleNorm.startsWith(`${first} `)) return [only]
  return []
}

export function matchEventToAthlete(input: MatchInput): MatchResult {
  const titleNorm = normalizeAlias(input.title)

  const series = input.seriesMappings.find(
    (m) => m.connectionId === input.connectionId && m.seriesKey === input.seriesKey,
  )
  if (series) {
    return { athleteId: series.athleteId, matchStatus: 'matched', matchConfidence: 1 }
  }

  const titleMap = input.titleMappings.find((m) => m.normalizedTitle === titleNorm)
  if (titleMap) {
    return { athleteId: titleMap.athleteId, matchStatus: 'matched', matchConfidence: 0.95 }
  }

  const exactName = input.coachAthletes.filter(
    (a) => normalizePersonName(athleteFullName(a)) === titleNorm,
  )
  if (exactName.length === 1) {
    return {
      athleteId: exactName[0]!.id,
      matchStatus: 'matched',
      matchConfidence: 0.9,
    }
  }
  if (exactName.length > 1) {
    return {
      athleteId: null,
      matchStatus: 'ambiguous',
      matchConfidence: 0,
      ambiguousAthleteIds: exactName.map((a) => a.id),
    }
  }

  const aliasHit = input.aliases.filter((al) => al.normalizedAlias === titleNorm)
  if (aliasHit.length === 1) {
    return { athleteId: aliasHit[0]!.athleteId, matchStatus: 'matched', matchConfidence: 0.88 }
  }
  if (aliasHit.length > 1) {
    return {
      athleteId: null,
      matchStatus: 'ambiguous',
      matchConfidence: 0,
      ambiguousAthleteIds: aliasHit.map((a) => a.athleteId),
    }
  }

  const firstOnly = uniqueFirstNameMatches(titleNorm, input.coachAthletes)
  if (firstOnly.length === 1) {
    return {
      athleteId: firstOnly[0]!.id,
      matchStatus: 'matched',
      matchConfidence: 0.7,
    }
  }
  if (firstOnly.length > 1) {
    return {
      athleteId: null,
      matchStatus: 'ambiguous',
      matchConfidence: 0,
      ambiguousAthleteIds: firstOnly.map((a) => a.id),
    }
  }

  return { athleteId: null, matchStatus: 'needs_athlete', matchConfidence: 0 }
}

export function eventUpsertKey(ev: Pick<CalendarEvent, 'connectionId' | 'providerCalendarId' | 'providerEventId' | 'recurrenceInstanceKey'>): string {
  return `${ev.connectionId}|${ev.providerCalendarId}|${ev.providerEventId}|${ev.recurrenceInstanceKey}`
}

export function coachingLikelyTitle(title: string): boolean {
  const t = title.toLowerCase()
  if (!t.trim()) return false
  const coachingWords = [
    'lesson',
    'private',
    'tumble',
    'tumbling',
    'gym',
    'coach',
    'athlete',
    'training',
    'camp',
    'class',
  ]
  return coachingWords.some((w) => t.includes(w))
}
