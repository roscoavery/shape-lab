/**
 * Merge gym rosters so a new browser cannot replace everyone with Ryan-only.
 * Last-write-wins on the whole athletes array was wiping Profiles / Network.
 *
 * Lives under server/ so Vite's node tsconfig can import it without pulling
 * the React src graph. The browser sync code imports this file too.
 */

export type ProfileKind = 'gym_owner' | 'coach' | 'athlete' | 'parent'

export type Athlete = {
  id: string
  name: string
  notes?: string
  instagramHandle?: string
  shapeLabHandle?: string
  createdAt: string
  passcodeHash?: string
  role?: ProfileKind
  gymName?: string
  classGyms?: string[]
  eventIds?: string[]
  childName?: string
  linkedAthleteIds?: string[]
  worksWithCoachIds?: string[]
  showCoachesOnProfile?: boolean
  hasBackPain?: boolean
  injuryActive?: boolean
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  parentPhone?: string
  cartwheelLeg?: 'left' | 'right'
  harderShape?: 'hollow' | 'superman'
  openShoulderHardness?: 1 | 2 | 3 | 4 | 5
  photoDataUrl?: string
  twistDirection?: 'left' | 'right' | 'both' | 'not_yet'
  twistBetterSide?: 'left' | 'right'
  dominantHand?: 'left' | 'right' | 'ambidextrous'
  skateStance?: 'regular' | 'goofy'
  favoriteColor?:
    | 'red'
    | 'orange'
    | 'gold'
    | 'lime'
    | 'teal'
    | 'sky'
    | 'indigo'
    | 'violet'
    | 'pink'
    | 'slate'
  handstandFloor?: 'under_10' | 'over_10' | 'over_20' | 'contest'
  handstandWall?: 'under_min' | 'over_min'
  hollowHold?: 'under_10' | 'over_10' | 'over_20' | 'contest'
  supermanHold?: 'under_10' | 'over_10' | 'over_20' | 'contest'
  vUps?: 'under_10' | 'over_10' | 'over_20' | 'over_30'
  intakeAnswers?: IntakeAnswer[]
  gestures?: ProfileGesture[]
  coachNotes?: AthleteCoachNote[]
  shapeTests?: ShapeTestRecord[]
}

type IntakeAnswer = {
  questionId: string
  prompt: string
  answer: string
  askedAt: string
}

type ProfileGesture = {
  id: string
  kind: 'hi5' | 'fist'
  fromId: string
  fromName: string
  createdAt: string
}

type AthleteCoachNote = {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: string
  meetingId?: string
  lessonId?: string
  className?: string
  topicLabel?: string
}

type ShapeTestRecord = {
  id: string
  takenAt: number
  pool: 'pathway' | 'arm-positions'
  format: 'picture' | 'describe' | 'mixed'
  score: number
  total: number
}

const RYAN_PROFILE_ID = 'ath_ryan'

function isRyanAthlete(athlete: Athlete): boolean {
  return athlete.id === RYAN_PROFILE_ID || athlete.name.trim().toLowerCase() === 'ryan'
}

function isProfileKind(value: unknown): value is ProfileKind {
  return value === 'gym_owner' || value === 'coach' || value === 'athlete' || value === 'parent'
}

export type RosterLists = {
  athletes: Athlete[]
  homework: unknown[]
  homeworkLogs: unknown[]
  taskProgress: Record<string, unknown>
  flowProgress: Record<string, unknown>
  attempts: unknown[]
  compareLibraries: Record<string, unknown>
  removedAthleteIds: string[]
  activeAthleteId: string | null
  dismissedHomeworkKeys: string[]
  injuryLogs: unknown[]
  painJournals: unknown[]
  coachExercises: unknown[]
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x)
}

export function isAthleteRecord(x: unknown): x is Athlete {
  if (!isRecord(x)) return false
  return typeof x.id === 'string' && typeof x.name === 'string' && x.name.trim().length > 0
}

function asAthletes(list: unknown): Athlete[] {
  return Array.isArray(list) ? list.filter(isAthleteRecord) : []
}

function asIdList(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  return list.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
}

function mergeIdList(a?: string[], b?: string[]): string[] | undefined {
  const next = [...new Set([...(a ?? []), ...(b ?? [])].filter((id) => typeof id === 'string' && id))]
  if (next.length === 0) return a ?? b
  return next
}

function homeworkDedupeKey(item: Record<string, unknown>): string {
  const aid = typeof item.athleteId === 'string' ? item.athleteId : '_'
  const sid = typeof item.shapeId === 'string' ? item.shapeId : ''
  const autoKey = typeof item.autoKey === 'string' ? item.autoKey : ''
  if (autoKey === 'hollow' || sid === 'hollow' || sid === 'hollow_arms_down' || sid === 'hollow_arms_up') {
    return `${aid}::hollow`
  }
  const catalog =
    typeof item.catalogId === 'string' && item.catalogId
      ? item.catalogId
      : sid.startsWith('catalog:')
        ? sid.slice('catalog:'.length)
        : ''
  if (catalog) return `${aid}::catalog:${catalog}`
  if (typeof item.coachExerciseId === 'string' && item.coachExerciseId) {
    return `${aid}::cx:${item.coachExerciseId}`
  }
  return `${aid}::${sid || (typeof item.id === 'string' ? item.id : '')}`
}

function dropDismissedHomework(items: unknown[], keys: string[]): unknown[] {
  const dismissed = new Set(keys)
  if (dismissed.size === 0) return items
  return items.filter((raw) => {
    if (!isRecord(raw)) return false
    if (raw.source === 'auto') return true
    return !dismissed.has(homeworkDedupeKey(raw))
  })
}

function mergeHomework(local: unknown[], remote: unknown[]): unknown[] {
  const best = new Map<string, Record<string, unknown>>()
  const put = (raw: unknown) => {
    if (!isRecord(raw)) return
    const id = typeof raw.id === 'string' ? raw.id : ''
    const key = id ? `id:${id}` : homeworkDedupeKey(raw)
    const keep = best.get(key)
    if (!keep) {
      best.set(key, raw)
      return
    }
    const preferAuto =
      raw.source === 'auto' && keep.source !== 'auto'
        ? raw
        : keep.source === 'auto' && raw.source !== 'auto'
          ? keep
          : String(keep.createdAt ?? '') <= String(raw.createdAt ?? '')
            ? keep
            : raw
    best.set(key, preferAuto)
  }
  for (const row of local) put(row)
  for (const row of remote) put(row)
  return [...best.values()]
}

function mergeReactions(a: unknown, b: unknown): unknown[] {
  const list = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]
  const byFrom = new Map<string, Record<string, unknown>>()
  for (const row of list) {
    if (!isRecord(row) || typeof row.fromId !== 'string') continue
    const keep = byFrom.get(row.fromId)
    if (!keep || String(row.createdAt || '') >= String(keep.createdAt || '')) {
      byFrom.set(row.fromId, row)
    }
  }
  return [...byFrom.values()]
}

function mergeHomeworkLogs(local: unknown[], remote: unknown[], cap: number): unknown[] {
  const map = new Map<string, Record<string, unknown>>()
  let i = 0
  for (const row of [...local, ...remote]) {
    if (!isRecord(row)) continue
    const id = typeof row.id === 'string' && row.id ? row.id : `__anon_${i++}`
    const prev = map.get(id)
    if (!prev) {
      map.set(id, row)
      continue
    }
    map.set(id, {
      ...prev,
      ...row,
      reactions: mergeReactions(prev.reactions, row.reactions),
    })
  }
  return [...map.values()].slice(-cap)
}

function mergeByRowId(local: unknown[], remote: unknown[], cap: number): unknown[] {
  const map = new Map<string, unknown>()
  let i = 0
  for (const row of [...local, ...remote]) {
    if (!isRecord(row)) continue
    const id = typeof row.id === 'string' && row.id ? row.id : `__anon_${i++}`
    map.set(id, row)
  }
  return [...map.values()].slice(-cap)
}

function mergeMaps(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
): Record<string, unknown> {
  return { ...local, ...remote }
}

function mergeCompareLibs(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...local }
  for (const [id, cols] of Object.entries(remote)) {
    if (!id) continue
    const incoming = Array.isArray(cols) ? cols : []
    const existing = Array.isArray(out[id]) ? (out[id] as unknown[]) : []
    out[id] = incoming.length >= existing.length ? incoming : existing
  }
  return out
}

/** Combine two profile rows. Keep passcodes, roles, and gym fields if either side has them. */
export function combineAthletes(keep: Athlete, incoming: Athlete): Athlete {
  const newerWins = (incoming.createdAt || '') >= (keep.createdAt || '')
  const newer = newerWins ? incoming : keep
  const older = newerWins ? keep : incoming
  const role: Athlete['role'] = newer.role || older.role
  return {
    ...older,
    ...newer,
    id: keep.id,
    passcodeHash: newer.passcodeHash || older.passcodeHash,
    gymName: newer.gymName || older.gymName || 'Tumble Smart Athletics',
    classGyms: mergeIdList(newer.classGyms, older.classGyms),
    eventIds: mergeIdList(newer.eventIds, older.eventIds),
    childName: newer.childName || older.childName,
    linkedAthleteIds: mergeIdList(newer.linkedAthleteIds, older.linkedAthleteIds),
    worksWithCoachIds: mergeIdList(newer.worksWithCoachIds, older.worksWithCoachIds),
    showCoachesOnProfile: newer.showCoachesOnProfile ?? older.showCoachesOnProfile,
    instagramHandle: newer.instagramHandle || older.instagramHandle,
    shapeLabHandle: newer.shapeLabHandle || older.shapeLabHandle,
    notes: newer.notes || older.notes,
    role,
    hasBackPain: newer.hasBackPain ?? older.hasBackPain,
    injuryActive: newer.injuryActive ?? older.injuryActive,
    firstName: newer.firstName || older.firstName,
    lastName: newer.lastName || older.lastName,
    email: newer.email || older.email,
    phone: newer.phone || older.phone,
    parentPhone: newer.parentPhone || older.parentPhone,
    cartwheelLeg: newer.cartwheelLeg || older.cartwheelLeg,
    harderShape: newer.harderShape || older.harderShape,
    openShoulderHardness: newer.openShoulderHardness ?? older.openShoulderHardness,
    photoDataUrl: newer.photoDataUrl || older.photoDataUrl,
    twistDirection: newer.twistDirection || older.twistDirection,
    twistBetterSide: newer.twistBetterSide || older.twistBetterSide,
    dominantHand: newer.dominantHand || older.dominantHand,
    skateStance: newer.skateStance || older.skateStance,
    favoriteColor: newer.favoriteColor || older.favoriteColor,
    handstandFloor: newer.handstandFloor || older.handstandFloor,
    handstandWall: newer.handstandWall || older.handstandWall,
    hollowHold: newer.hollowHold || older.hollowHold,
    supermanHold: newer.supermanHold || older.supermanHold,
    vUps: newer.vUps || older.vUps,
    intakeAnswers: mergeIntakeAnswers(newer.intakeAnswers, older.intakeAnswers),
    gestures: mergeGestures(newer.gestures, older.gestures),
    coachNotes: mergeCoachNotes(newer.coachNotes, older.coachNotes),
    shapeTests: mergeShapeTests(newer.shapeTests, older.shapeTests),
    createdAt: older.createdAt || newer.createdAt,
  }
}

function mergeCoachNotes(
  a: AthleteCoachNote[] | undefined,
  b: AthleteCoachNote[] | undefined,
): AthleteCoachNote[] | undefined {
  const byId = new Map<string, AthleteCoachNote>()
  for (const row of [...(a ?? []), ...(b ?? [])]) {
    if (!row || typeof row.id !== 'string' || !row.id) continue
    byId.set(row.id, row)
  }
  if (byId.size === 0) return a ?? b
  return [...byId.values()]
    .sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || ''))
    .slice(0, 80)
}

function mergeIntakeAnswers(
  a: IntakeAnswer[] | undefined,
  b: IntakeAnswer[] | undefined,
): IntakeAnswer[] | undefined {
  const byId = new Map<string, IntakeAnswer>()
  for (const row of [...(b ?? []), ...(a ?? [])]) {
    if (!row || typeof row.questionId !== 'string' || !row.questionId) continue
    const keep = byId.get(row.questionId)
    if (!keep || (row.askedAt || '') >= (keep.askedAt || '')) byId.set(row.questionId, row)
  }
  if (byId.size === 0) return a ?? b
  return [...byId.values()].sort((x, y) => (y.askedAt || '').localeCompare(x.askedAt || '')).slice(0, 80)
}

function mergeGestures(
  a: ProfileGesture[] | undefined,
  b: ProfileGesture[] | undefined,
): ProfileGesture[] | undefined {
  const byId = new Map<string, ProfileGesture>()
  for (const row of [...(a ?? []), ...(b ?? [])]) {
    if (!row || typeof row.id !== 'string' || !row.id) continue
    byId.set(row.id, row)
  }
  if (byId.size === 0) return a ?? b
  return [...byId.values()]
    .sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || ''))
    .slice(0, 80)
}

function mergeShapeTests(
  a: ShapeTestRecord[] | undefined,
  b: ShapeTestRecord[] | undefined,
): ShapeTestRecord[] | undefined {
  const byId = new Map<string, ShapeTestRecord>()
  for (const row of [...(a ?? []), ...(b ?? [])]) {
    if (!row || typeof row.id !== 'string' || !row.id) continue
    byId.set(row.id, row)
  }
  if (byId.size === 0) return a ?? b
  return [...byId.values()]
    .sort((x, y) => (x.takenAt || 0) - (y.takenAt || 0))
    .slice(-24)
}

/**
 * Union by id. Same display name collapses only when one row is Ryan
 * (the gym-admin id used to be minted twice). Other duplicate names stay
 * as two people so a recovered stub cannot eat a real profile.
 */
export function mergeAthleteLists(local: Athlete[], remote: Athlete[]): Athlete[] {
  const byId = new Map<string, Athlete>()
  const put = (a: Athlete) => {
    const existing = byId.get(a.id)
    if (existing) {
      byId.set(a.id, combineAthletes(existing, a))
      return
    }
    if (isRyanAthlete(a)) {
      for (const [id, row] of byId) {
        if (!isRyanAthlete(row)) continue
        const combined = combineAthletes(row, { ...a, id: row.id })
        byId.delete(id)
        byId.set(combined.id === RYAN_PROFILE_ID ? RYAN_PROFILE_ID : combined.id, {
          ...combined,
          id: RYAN_PROFILE_ID,
          name: 'Ryan',
          role: 'coach',
        })
        return
      }
    }
    byId.set(a.id, a)
  }
  for (const a of local) put(a)
  for (const a of remote) put(a)
  return [...byId.values()]
}

export function normalizeRemovedIds(ids: Iterable<string>): string[] {
  const set = new Set<string>()
  for (const id of ids) {
    if (id && id !== RYAN_PROFILE_ID) set.add(id)
  }
  return [...set]
}

export function applyRemovals(athletes: Athlete[], removed: Iterable<string>): Athlete[] {
  const drop = new Set(normalizeRemovedIds(removed))
  return athletes.filter((a) => !drop.has(a.id) || isRyanAthlete(a))
}

function remnantIds(lists: {
  homework: unknown[]
  homeworkLogs: unknown[]
  attempts: unknown[]
  taskProgress: Record<string, unknown>
  flowProgress: Record<string, unknown>
  compareLibraries: Record<string, unknown>
}): Set<string> {
  const ids = new Set<string>()
  const add = (value: unknown) => {
    if (typeof value === 'string' && value.startsWith('ath_')) ids.add(value)
  }
  for (const row of [...lists.homework, ...lists.homeworkLogs, ...lists.attempts]) {
    if (isRecord(row)) add(row.athleteId)
  }
  for (const id of Object.keys(lists.taskProgress)) add(id)
  for (const id of Object.keys(lists.flowProgress)) add(id)
  for (const id of Object.keys(lists.compareLibraries)) add(id)
  return ids
}

export type ProfileHint = { name: string; role?: ProfileKind }

function memberName(id: string): string {
  const tail = id.replace(/^ath_/, '').slice(-6)
  return `Saved profile ${tail}`
}

function createdAtFor(id: string, homework: unknown[]): string {
  let earliest = ''
  for (const row of homework) {
    if (!isRecord(row) || row.athleteId !== id) continue
    const at = typeof row.createdAt === 'string' ? row.createdAt : ''
    if (at && (!earliest || at < earliest)) earliest = at
  }
  return earliest || new Date().toISOString()
}

function roleFor(id: string, lists: RosterLists, hint?: ProfileHint): ProfileKind {
  if (hint?.role && isProfileKind(hint.role)) return hint.role
  if (Array.isArray(lists.compareLibraries[id]) && (lists.compareLibraries[id] as unknown[]).length > 0) {
    return 'coach'
  }
  return 'athlete'
}

/** Re-attach people who still have homework / libraries after a Ryan-only overwrite. */
export function restoreMissingAthletes(
  lists: RosterLists,
  hints: Record<string, ProfileHint> = {},
): Athlete[] {
  const removed = new Set(normalizeRemovedIds(lists.removedAthleteIds))
  const have = new Set(lists.athletes.map((a) => a.id))
  const extra: Athlete[] = []
  for (const id of remnantIds(lists)) {
    if (have.has(id) || removed.has(id)) continue
    const hint = hints[id]
    extra.push({
      id,
      name: hint?.name?.trim() || memberName(id),
      createdAt: createdAtFor(id, lists.homework),
      role: roleFor(id, lists, hint),
    })
    have.add(id)
  }
  return [...lists.athletes, ...extra]
}

export function emptyRosterLists(): RosterLists {
  return {
    athletes: [],
    homework: [],
    homeworkLogs: [],
    taskProgress: {},
    flowProgress: {},
    attempts: [],
    compareLibraries: {},
    removedAthleteIds: [],
    activeAthleteId: null,
    dismissedHomeworkKeys: [],
    injuryLogs: [],
    painJournals: [],
    coachExercises: [],
  }
}

export function rosterListsFromUnknown(data: unknown): RosterLists {
  if (!isRecord(data)) return emptyRosterLists()
  const taskProgress =
    data.taskProgress && typeof data.taskProgress === 'object' && !Array.isArray(data.taskProgress)
      ? (data.taskProgress as Record<string, unknown>)
      : {}
  const flowProgress =
    data.flowProgress && typeof data.flowProgress === 'object' && !Array.isArray(data.flowProgress)
      ? (data.flowProgress as Record<string, unknown>)
      : {}
  const compareLibraries =
    data.compareLibraries &&
    typeof data.compareLibraries === 'object' &&
    !Array.isArray(data.compareLibraries)
      ? (data.compareLibraries as Record<string, unknown>)
      : {}
  return {
    athletes: asAthletes(data.athletes),
    homework: Array.isArray(data.homework) ? data.homework : [],
    homeworkLogs: Array.isArray(data.homeworkLogs) ? data.homeworkLogs : [],
    taskProgress,
    flowProgress,
    attempts: Array.isArray(data.attempts) ? data.attempts : [],
    compareLibraries,
    removedAthleteIds: asIdList(data.removedAthleteIds),
    activeAthleteId: typeof data.activeAthleteId === 'string' ? data.activeAthleteId : null,
    dismissedHomeworkKeys: asIdList(data.dismissedHomeworkKeys),
    injuryLogs: Array.isArray(data.injuryLogs) ? data.injuryLogs : [],
    painJournals: Array.isArray(data.painJournals) ? data.painJournals : [],
    coachExercises: Array.isArray(data.coachExercises) ? data.coachExercises : [],
  }
}

export function mergeRosterLists(
  local: RosterLists,
  remote: RosterLists,
  hints: Record<string, ProfileHint> = {},
): RosterLists {
  const incomingLiving = new Set(remote.athletes.map((a) => a.id))
  const serverCount = local.athletes.length
  const incomingCount = remote.athletes.length
  // A phone that only has Ryan + a couple names cannot delete the rest of the gym.
  const acceptClientRemovals =
    incomingCount === 0 || incomingCount >= Math.max(1, Math.ceil(serverCount * 0.8))
  const clientRemovals = acceptClientRemovals ? remote.removedAthleteIds : []
  const removed = normalizeRemovedIds([
    ...local.removedAthleteIds,
    ...clientRemovals,
  ]).filter((id) => !incomingLiving.has(id))
  const dismissedHomeworkKeys = [
    ...new Set([...local.dismissedHomeworkKeys, ...remote.dismissedHomeworkKeys]),
  ]
  const homework = dropDismissedHomework(
    mergeHomework(local.homework, remote.homework),
    dismissedHomeworkKeys,
  )
  const athletes = restoreMissingAthletes(
    {
      athletes: applyRemovals(mergeAthleteLists(local.athletes, remote.athletes), removed),
      homework,
      homeworkLogs: mergeHomeworkLogs(local.homeworkLogs, remote.homeworkLogs, 1000),
      taskProgress: mergeMaps(local.taskProgress, remote.taskProgress),
      flowProgress: mergeMaps(local.flowProgress, remote.flowProgress),
      attempts: mergeByRowId(local.attempts, remote.attempts, 2000),
      compareLibraries: mergeCompareLibs(local.compareLibraries, remote.compareLibraries),
      removedAthleteIds: removed,
      activeAthleteId: remote.activeAthleteId || local.activeAthleteId,
      dismissedHomeworkKeys,
      injuryLogs: mergeByRowId(local.injuryLogs, remote.injuryLogs, 400),
      painJournals: mergeByRowId(local.painJournals, remote.painJournals, 400),
      coachExercises: mergeByRowId(local.coachExercises, remote.coachExercises, 200),
    },
    hints,
  )
  return {
    athletes: applyRemovals(athletes, removed),
    homework,
    homeworkLogs: mergeHomeworkLogs(local.homeworkLogs, remote.homeworkLogs, 1000),
    taskProgress: mergeMaps(local.taskProgress, remote.taskProgress),
    flowProgress: mergeMaps(local.flowProgress, remote.flowProgress),
    attempts: mergeByRowId(local.attempts, remote.attempts, 2000),
    compareLibraries: mergeCompareLibs(local.compareLibraries, remote.compareLibraries),
    removedAthleteIds: removed,
    activeAthleteId: remote.activeAthleteId || local.activeAthleteId,
    dismissedHomeworkKeys,
    injuryLogs: mergeByRowId(local.injuryLogs, remote.injuryLogs, 400),
    painJournals: mergeByRowId(local.painJournals, remote.painJournals, 400),
    coachExercises: mergeByRowId(local.coachExercises, remote.coachExercises, 200),
  }
}
