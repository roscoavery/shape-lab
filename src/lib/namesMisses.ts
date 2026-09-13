/**
 * Per-coach miss history for the names test. Hard names stay at the
 * front of the next run so coaches practice the faces they keep missing.
 */

export type NamesAthleteStat = {
  misses: number
  hits: number
  lastMissAt?: string
  lastHitAt?: string
}

export type NamesMissFile = {
  kind: 'shape-lab-names-misses'
  version: 1
  coaches: Record<string, Record<string, NamesAthleteStat>>
}

const KEY = 'shape-lab.namesMisses.v1'

function emptyFile(): NamesMissFile {
  return { kind: 'shape-lab-names-misses', version: 1, coaches: {} }
}

function read(): NamesMissFile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyFile()
    const data = JSON.parse(raw) as NamesMissFile
    if (data?.kind !== 'shape-lab-names-misses' || !data.coaches) return emptyFile()
    return { ...emptyFile(), coaches: data.coaches }
  } catch {
    return emptyFile()
  }
}

function write(file: NamesMissFile) {
  localStorage.setItem(KEY, JSON.stringify(file))
}

export function namesStatsForCoach(coachId: string | null | undefined): Record<string, NamesAthleteStat> {
  if (!coachId) return {}
  return { ...(read().coaches[coachId] ?? {}) }
}

export function namesStatFor(coachId: string | null | undefined, athleteId: string): NamesAthleteStat {
  return namesStatsForCoach(coachId)[athleteId] ?? { misses: 0, hits: 0 }
}

/** Higher = coach misses this athlete more. Used to order the deck. */
export function namesHardness(stat: NamesAthleteStat | undefined): number {
  if (!stat) return 1
  const tries = stat.misses + stat.hits
  if (tries === 0) return 1
  const rate = stat.misses / tries
  const recency = stat.lastMissAt ? Math.min(2, Date.now() - Date.parse(stat.lastMissAt) < 1000 * 60 * 60 * 24 * 7 ? 0.6 : 0) : 0
  return stat.misses * 2 + rate * 4 + recency
}

export function recordNamesAnswer(opts: {
  coachId: string
  athleteId: string
  correct: boolean
}): NamesAthleteStat {
  const file = read()
  const coach = { ...(file.coaches[opts.coachId] ?? {}) }
  const prev = coach[opts.athleteId] ?? { misses: 0, hits: 0 }
  const now = new Date().toISOString()
  const next: NamesAthleteStat = opts.correct
    ? { ...prev, hits: prev.hits + 1, lastHitAt: now }
    : { ...prev, misses: prev.misses + 1, lastMissAt: now }
  coach[opts.athleteId] = next
  write({ ...file, coaches: { ...file.coaches, [opts.coachId]: coach } })
  return next
}

export function hardestNames(
  coachId: string | null | undefined,
  athleteIds: string[],
): { athleteId: string; stat: NamesAthleteStat; hardness: number }[] {
  const stats = namesStatsForCoach(coachId)
  return athleteIds
    .map((athleteId) => {
      const stat = stats[athleteId] ?? { misses: 0, hits: 0 }
      return { athleteId, stat, hardness: namesHardness(stat) }
    })
    .filter((row) => row.stat.misses > 0)
    .sort((a, b) => b.hardness - a.hardness)
}
