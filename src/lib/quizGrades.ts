import type { Athlete, ShapeTestRecord } from '../types'
import type { QuizFormat, QuizPool } from './shapeQuiz'
import { createId } from './storage'

const GUEST_KEY = 'shape-lab.guest-quiz-grades.v1'

export function makeShapeTestRecord(
  pool: QuizPool,
  format: QuizFormat,
  score: number,
  total: number,
): ShapeTestRecord {
  return {
    id: createId('quiz'),
    takenAt: Date.now(),
    pool,
    format,
    score,
    total,
  }
}

export function appendShapeTest(athlete: Athlete, record: ShapeTestRecord): Athlete {
  return {
    ...athlete,
    shapeTests: mergeShapeTests(athlete.shapeTests, [record]),
  }
}

export function mergeShapeTests(
  a: ShapeTestRecord[] | undefined,
  b: ShapeTestRecord[] | undefined,
): ShapeTestRecord[] {
  const byId = new Map<string, ShapeTestRecord>()
  for (const row of [...(a ?? []), ...(b ?? [])]) {
    if (!row?.id) continue
    byId.set(row.id, row)
  }
  return [...byId.values()]
    .sort((x, y) => x.takenAt - y.takenAt)
    .slice(-24)
}

export function lastShapeTest(athlete: Athlete | undefined): ShapeTestRecord | null {
  const list = athlete?.shapeTests
  if (!list?.length) return null
  return list[list.length - 1] ?? null
}

export function formatQuizScore(record: ShapeTestRecord): string {
  return `${record.score}/${record.total}`
}

export function quizKindLabel(record: ShapeTestRecord): string {
  const pool = record.pool === 'arm-positions' ? 'Arms' : 'Shapes'
  const format =
    record.format === 'picture'
      ? 'pictures'
      : record.format === 'describe'
        ? 'descriptions'
        : 'mixed'
  return `${pool} · ${format}`
}

export function guestGradeKey(first: string, last: string): string {
  return `${first.trim().toLowerCase()}|${last.trim().toLowerCase()}`
}

function loadGuestMap(): Record<string, ShapeTestRecord[]> {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ShapeTestRecord[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveGuestMap(map: Record<string, ShapeTestRecord[]>) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(map))
}

export function rememberGuestGrade(first: string, last: string, record: ShapeTestRecord) {
  const key = guestGradeKey(first, last)
  const map = loadGuestMap()
  map[key] = mergeShapeTests(map[key], [record])
  saveGuestMap(map)
}

export function peekGuestGrades(first: string, last: string): ShapeTestRecord[] {
  return loadGuestMap()[guestGradeKey(first, last)] ?? []
}

export function lastGuestGrade(first: string, last: string): ShapeTestRecord | null {
  const list = peekGuestGrades(first, last)
  return list[list.length - 1] ?? null
}

/** Move guest scores onto a new profile, then drop the guest cache. */
export function takeGuestGrades(first: string, last: string): ShapeTestRecord[] {
  const key = guestGradeKey(first, last)
  const map = loadGuestMap()
  const list = map[key] ?? []
  if (key in map) {
    delete map[key]
    saveGuestMap(map)
  }
  return list
}
