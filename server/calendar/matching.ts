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

const SKIP_NAME_TOKENS = new Set([
  'lesson',
  'private',
  'tumble',
  'tumbling',
  'gym',
  'coach',
  'coaching',
  'athlete',
  'student',
  'training',
  'camp',
  'class',
  'with',
  'from',
  'for',
  'and',
  'the',
  'clinic',
  'school',
  'parent',
  'mom',
  'dad',
  'bring',
  'grips',
  'please',
  'thanks',
  'thank',
  'after',
  'before',
  'phone',
  'email',
  'years',
  'year',
  'old',
  'age',
  'see',
  'call',
  'text',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'missed',
  'reschedule',
  'cancel',
  'cancelled',
  'confirmed',
  'new',
  'kid',
  'child',
  'high',
  'bar',
  'floor',
  'beam',
  'vault',
  'about',
  'notes',
])

export type MatchInput = {
  title: string
  description?: string
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
  const rest = tokens.slice(1)
  if (rest.length === 0) return [only]
  if (rest.every((t) => SKIP_NAME_TOKENS.has(t))) return [only]
  return []
}

export function unescapeCalendarText(input: string): string {
  return input
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function haystackOf(input: Pick<MatchInput, 'title' | 'description'>): string {
  return normalizeAlias(`${input.title}\n${unescapeCalendarText(input.description ?? '')}`)
}

function fullNameHits(hay: string, athletes: Athlete[]): Athlete[] {
  const hits: Athlete[] = []
  for (const a of athletes) {
    const full = normalizePersonName(athleteFullName(a))
    if (full.split(/\s+/).length < 2) continue
    const re = new RegExp(`(?:^|\\s)${full}(?:\\s|$)`)
    if (re.test(hay) || hay === full) hits.push(a)
  }
  return hits
}

export function extractContactBits(text: string): { phone?: string; email?: string } {
  const raw = unescapeCalendarText(text)
  const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  const phone = raw.match(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]*)\d{3}[-.\s]?\d{4}\b/)?.[0]
  return {
    ...(email ? { email: email.trim() } : {}),
    ...(phone ? { phone: phone.replace(/\s+/g, ' ').trim() } : {}),
  }
}

/** One First Last in event notes that is not already on the gym roster. Title is ignored — parents often put their own name there. */
export function extractUnmatchedPersonName(
  _title: string,
  description: string,
  athletes: Athlete[],
): { firstName: string; lastName: string; fullName: string } | null {
  const raw = unescapeCalendarText(description).trim()
  if (!raw) return null
  const found = new Map<string, { firstName: string; lastName: string }>()
  const re = /\b([A-Za-z][A-Za-z'-]{1,24})\s+([A-Za-z][A-Za-z'-]{1,24})\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) {
    const first = m[1]!.replace(/^./, (c) => c.toUpperCase())
    const last = m[2]!.replace(/^./, (c) => c.toUpperCase())
    if (SKIP_NAME_TOKENS.has(first.toLowerCase()) || SKIP_NAME_TOKENS.has(last.toLowerCase())) {
      re.lastIndex = m.index + m[1]!.length
      continue
    }
    const full = normalizePersonName(`${first} ${last}`)
    if (athletes.some((a) => normalizePersonName(athleteFullName(a)) === full)) continue
    found.set(full, { firstName: first, lastName: last })
  }
  if (found.size !== 1) return null
  const parts = [...found.values()][0]!
  return { firstName: parts.firstName, lastName: parts.lastName, fullName: `${parts.firstName} ${parts.lastName}` }
}

export function matchEventToAthlete(input: MatchInput): MatchResult {
  const titleNorm = normalizeAlias(input.title)
  const hay = haystackOf(input)

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

  const notesHay = normalizeAlias(unescapeCalendarText(input.description ?? ''))
  const namedInNotes = notesHay ? fullNameHits(notesHay, input.coachAthletes) : []
  if (namedInNotes.length === 1) {
    return {
      athleteId: namedInNotes[0]!.id,
      matchStatus: 'matched',
      matchConfidence: 0.93,
    }
  }
  if (namedInNotes.length > 1) {
    return {
      athleteId: null,
      matchStatus: 'ambiguous',
      matchConfidence: 0,
      ambiguousAthleteIds: namedInNotes.map((a) => a.id),
    }
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

  const named = fullNameHits(hay, input.coachAthletes)
  if (named.length === 1) {
    return {
      athleteId: named[0]!.id,
      matchStatus: 'matched',
      matchConfidence: 0.92,
    }
  }
  if (named.length > 1) {
    return {
      athleteId: null,
      matchStatus: 'ambiguous',
      matchConfidence: 0,
      ambiguousAthleteIds: named.map((a) => a.id),
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
