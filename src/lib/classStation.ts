/**
 * Class-station drafts and shape-test names that never became a profile.
 * Lives in localStorage so an iPad at a station can pick up next cycle.
 */

export type CartwheelLeg = 'left' | 'right'
export type HarderShape = 'hollow' | 'superman'
export type OpenShoulderHardness = 1 | 2 | 3 | 4 | 5
export type TwistDirection = 'left' | 'right' | 'both' | 'not_yet'
export type TwistBetterSide = 'left' | 'right'
export type DominantHand = 'left' | 'right' | 'ambidextrous'
export type SkateStance = 'regular' | 'goofy'

export type StationStep =
  | 'who'
  | 'parentPhone'
  | 'cartwheel'
  | 'harder'
  | 'shoulder'
  | 'twist'
  | 'twistBetter'
  | 'hand'
  | 'skate'
  | 'photo'
  | 'done'

export type StationDraft = {
  id: string
  athleteId?: string
  firstName: string
  lastName: string
  parentPhone?: string
  email?: string
  phone?: string
  gymName?: string
  takesClassHere?: boolean
  cartwheelLeg?: CartwheelLeg
  harderShape?: HarderShape
  openShoulderHardness?: OpenShoulderHardness
  twistDirection?: TwistDirection
  twistBetterSide?: TwistBetterSide
  dominantHand?: DominantHand
  skateStance?: SkateStance
  photoDataUrl?: string
  step: StationStep
  updatedAt: string
}

export type QuizGuestName = {
  firstName: string
  lastName: string
  createdAt: string
}

const DRAFT_KEY = 'shape-lab.classStation.drafts.v1'
const GUEST_KEY = 'shape-lab.quizGuests.v1'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota */
  }
}

export function displayPersonName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.trim()
}

/** First name for confirmations — “you fist bumped Ellie”. */
export function givenName(person: { firstName?: string; name?: string } | null | undefined): string {
  if (!person) return 'them'
  const first = (person.firstName || '').trim()
  if (first) return first
  const fromFull = (person.name || '').trim().split(/\s+/).filter(Boolean)[0]
  return fromFull || 'them'
}

export function splitPersonName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0]!, lastName: '' }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') }
}

export function loadStationDrafts(): StationDraft[] {
  const list = readJson<StationDraft[]>(DRAFT_KEY, [])
  return list
    .filter((d) => d && d.firstName)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function saveStationDrafts(drafts: StationDraft[]) {
  writeJson(DRAFT_KEY, drafts)
}

export function upsertStationDraft(draft: StationDraft): StationDraft[] {
  const next = { ...draft, updatedAt: new Date().toISOString() }
  const prev = loadStationDrafts().filter((d) => d.id !== next.id)
  const all = [next, ...prev].slice(0, 80)
  saveStationDrafts(all)
  return all
}

export function removeStationDraft(id: string): StationDraft[] {
  const all = loadStationDrafts().filter((d) => d.id !== id)
  saveStationDrafts(all)
  return all
}

export function loadQuizGuests(): QuizGuestName[] {
  return readJson<QuizGuestName[]>(GUEST_KEY, [])
    .filter((g) => g?.firstName && g?.lastName)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function rememberQuizGuest(firstName: string, lastName: string): QuizGuestName[] {
  const first = firstName.trim()
  const last = lastName.trim()
  if (!first || !last) return loadQuizGuests()
  const key = `${first} ${last}`.toLowerCase()
  const rest = loadQuizGuests().filter(
    (g) => `${g.firstName} ${g.lastName}`.toLowerCase() !== key,
  )
  const next = [{ firstName: first, lastName: last, createdAt: new Date().toISOString() }, ...rest].slice(
    0,
    80,
  )
  writeJson(GUEST_KEY, next)
  return next
}

export function forgetQuizGuest(firstName: string, lastName: string): QuizGuestName[] {
  const key = `${firstName} ${lastName}`.trim().toLowerCase()
  const next = loadQuizGuests().filter(
    (g) => `${g.firstName} ${g.lastName}`.toLowerCase() !== key,
  )
  writeJson(GUEST_KEY, next)
  return next
}

export function namesMatch(
  a: { firstName?: string; lastName?: string; name?: string },
  first: string,
  last: string,
): boolean {
  const full = displayPersonName(first, last).toLowerCase()
  const named = (a.name ?? displayPersonName(a.firstName ?? '', a.lastName ?? '')).trim().toLowerCase()
  return Boolean(full) && named === full
}
