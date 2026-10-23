import { markedFetch } from '../../lib/authSession'
import type { MediaStatus, ReviewStatus } from '../../content/coachEd/types'

export type ReviewEntryView = {
  status: ReviewStatus
  at: string
  byName: string
  reviewerName?: string
  reviewerRole?: string
  note?: string
}

export type MediaEntryView = {
  status: MediaStatus
  at: string
  byName: string
  note?: string
  anatomyReview?: { reviewer: string; on: string; note: string }
}

export type AssessmentSummary = {
  attempts: number
  bestPercent: number
  passed: boolean
  lastAt: string
  passedAt?: string
}

export type MineSummary = {
  lessons: Record<string, string>
  assessments: Record<string, AssessmentSummary>
  mastery: { id: string; label: string } | null
}

export type CoachEdState = {
  passPercent: number
  conditions: Record<string, ReviewEntryView>
  lessons: Record<string, ReviewEntryView>
  media: Record<string, MediaEntryView>
  updatedAt: string
  mine: MineSummary
  isAdmin: boolean
}

export type GradedQuestion = {
  id: string
  given: string | null
  correct: boolean
  critical: boolean
  answerId: string
  explain: string
}

export type GradeResponse = {
  total: number
  correct: number
  percent: number
  passPercent: number
  criticalMissed: string[]
  passed: boolean
  results: GradedQuestion[]
  mine: MineSummary
}

export type DashboardRow = {
  accountId: string
  name: string
  role: string
  lessonsDone: number
  assessments: Record<string, AssessmentSummary>
  mastery: { id: string; label: string } | null
}

export type RevisionRow = {
  id: string
  kind: string
  targetId: string
  from: string
  to: string
  at: string
  byName: string
  note?: string
}

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(body),
})

const get = (path: string) => fetch(path, { credentials: 'same-origin', cache: 'no-store' })

export const coachEdApi = {
  state: () => get('/api/coach-ed/state').then((r) => parse<CoachEdState>(r)),
  markLesson: (lessonId: string, done: boolean) =>
    markedFetch('/api/coach-ed/lesson', json('PUT', { lessonId, done })).then((r) => parse<MineSummary>(r)),
  startAttempt: (assessmentId: string) =>
    markedFetch('/api/coach-ed/attempt/start', json('POST', { assessmentId })).then((r) =>
      parse<{ attemptId: string; assessmentId: string; questionIds: string[]; passPercent: number }>(r),
    ),
  submitAttempt: (attemptId: string, answers: Record<string, string>) =>
    markedFetch('/api/coach-ed/attempt/submit', json('POST', { attemptId, answers })).then((r) => parse<GradeResponse>(r)),
  dashboard: () =>
    get('/api/coach-ed/dashboard').then((r) => parse<{ coaches: DashboardRow[]; lessonCount: number }>(r)),
  revisions: () => get('/api/coach-ed/revisions').then((r) => parse<{ revisions: RevisionRow[] }>(r)),
  review: (body: { kind: 'condition' | 'lesson'; id: string; status: ReviewStatus; reviewerName?: string; reviewerRole?: string; note?: string }) =>
    markedFetch('/api/coach-ed/review', json('PUT', body)).then((r) => parse<Omit<CoachEdState, 'mine' | 'isAdmin'>>(r)),
  media: (body: { id: string; status: MediaStatus; reviewer?: string; note?: string }) =>
    markedFetch('/api/coach-ed/media', json('PUT', body)).then((r) => parse<Omit<CoachEdState, 'mine' | 'isAdmin'>>(r)),
  settings: (passPercent: number) =>
    markedFetch('/api/coach-ed/settings', json('PUT', { passPercent })).then((r) => parse<Omit<CoachEdState, 'mine' | 'isAdmin'>>(r)),
}
