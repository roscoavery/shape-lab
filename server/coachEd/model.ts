import { randomBytes } from 'node:crypto'
import { masteryFor } from '../../src/content/coachEd/assessments.ts'
import type { ReviewStatus } from '../../src/content/coachEd/types.ts'
import { MANIFEST } from './manifest.generated.ts'

export const REVIEW_STATUSES: ReviewStatus[] = ['draft', 'in_review', 'approved', 'retired']
export const MEDIA_STATUSES = ['candidate', 'license_pending', 'license_verified', 'anatomy_pending', 'approved', 'rejected'] as const
export type MediaStatusId = (typeof MEDIA_STATUSES)[number]

export type ReviewEntry = { status: ReviewStatus; at: string; by: string; byName: string; reviewerName?: string; reviewerRole?: string; note?: string }
export type MediaEntry = {
  status: MediaStatusId
  at: string
  by: string
  byName: string
  note?: string
  anatomyReview?: { reviewer: string; on: string; note: string }
}
export type Revision = {
  id: string
  kind: 'condition' | 'lesson' | 'media' | 'settings'
  targetId: string
  from: string
  to: string
  at: string
  by: string
  byName: string
  note?: string
}

export type CoachEdFile = {
  kind: 'shape-lab-coach-ed'
  version: 1
  updatedAt: string
  passPercent: number
  conditions: Record<string, ReviewEntry>
  lessons: Record<string, ReviewEntry>
  media: Record<string, MediaEntry>
  revisions: Revision[]
}

export const EMPTY_COACH_ED: CoachEdFile = {
  kind: 'shape-lab-coach-ed',
  version: 1,
  updatedAt: '',
  passPercent: 85,
  conditions: {},
  lessons: {},
  media: {},
  revisions: [],
}

export type Actor = { accountId: string; displayName: string }

export class CoachEdError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const newId = (p: string) => `${p}_${randomBytes(6).toString('hex')}`
const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function pushRevision(file: CoachEdFile, r: Omit<Revision, 'id'>) {
  file.revisions.push({ id: newId('rev'), ...r })
  if (file.revisions.length > 500) file.revisions.splice(0, file.revisions.length - 500)
}

export function normalizeFile(raw: unknown): CoachEdFile {
  const f = raw as Partial<CoachEdFile> | null
  if (!f || f.kind !== 'shape-lab-coach-ed') return structuredClone(EMPTY_COACH_ED)
  return {
    ...structuredClone(EMPTY_COACH_ED),
    ...f,
    conditions: f.conditions && typeof f.conditions === 'object' ? f.conditions : {},
    lessons: f.lessons && typeof f.lessons === 'object' ? f.lessons : {},
    media: f.media && typeof f.media === 'object' ? f.media : {},
    revisions: Array.isArray(f.revisions) ? f.revisions : [],
  } as CoachEdFile
}

/**
 * Content review changes. `approved` is a human claim recorded with a reviewer
 * name and role. The server cannot check credentials, so the UI labels every
 * approval with who entered it.
 */
export function applyReview(
  file: CoachEdFile,
  input: Record<string, unknown>,
  actor: Actor,
  now = new Date().toISOString(),
): CoachEdFile {
  const kind = input.kind === 'condition' || input.kind === 'lesson' ? input.kind : null
  if (!kind) throw new CoachEdError(400, 'Review kind must be condition or lesson.')
  const id = clip(input.id, 80)
  const status = REVIEW_STATUSES.find((s) => s === input.status)
  if (!status) throw new CoachEdError(400, 'Unknown review status.')
  const cond = kind === 'condition' ? MANIFEST.conditions.find((c) => c.id === id) : undefined
  const known = cond ?? (kind === 'lesson' ? MANIFEST.lessons.find((l) => l.id === id) : undefined)
  if (!known) throw new CoachEdError(404, 'Unknown content id.')
  if (cond && status === 'approved' && cond.completeness !== 'complete') {
    throw new CoachEdError(400, 'An entry that is still in preparation cannot be approved.')
  }
  const reviewerName = clip(input.reviewerName, 120)
  const reviewerRole = clip(input.reviewerRole, 120)
  if (status === 'approved' && (!reviewerName || !reviewerRole)) {
    throw new CoachEdError(400, 'Approval needs the reviewer name and role.')
  }
  const bucket = kind === 'condition' ? file.conditions : file.lessons
  const from = bucket[id]?.status ?? known.review
  bucket[id] = {
    status,
    at: now,
    by: actor.accountId,
    byName: actor.displayName,
    reviewerName: reviewerName || undefined,
    reviewerRole: reviewerRole || undefined,
    note: clip(input.note, 500) || undefined,
  }
  pushRevision(file, { kind, targetId: id, from, to: status, at: now, by: actor.accountId, byName: actor.displayName, note: bucket[id].note })
  file.updatedAt = now
  return file
}

/**
 * Media workflow. Approval is refused unless the asset record carries a known,
 * commercially usable license, verification evidence, a hosted copy, a credit
 * line, and alt text, and an anatomy reviewer note is supplied.
 */
export function applyMediaStatus(
  file: CoachEdFile,
  input: Record<string, unknown>,
  actor: Actor,
  now = new Date().toISOString(),
): CoachEdFile {
  const id = clip(input.id, 80)
  const asset = MANIFEST.media.find((m) => m.id === id)
  if (!asset) throw new CoachEdError(404, 'Unknown media id.')
  const status = MEDIA_STATUSES.find((s) => s === input.status)
  if (!status) throw new CoachEdError(400, 'Unknown media status.')
  const current = (file.media[id]?.status ?? asset.status) as string
  const note = clip(input.note, 500)
  const reviewer = clip(input.reviewer, 120)
  if (asset.status === 'rejected' && !file.media[id] && status !== 'rejected') {
    throw new CoachEdError(400, 'This visual was rejected for a license or accuracy reason. It cannot be reopened here.')
  }
  if (status === 'approved') {
    if (asset.license === 'unknown') throw new CoachEdError(400, 'License is unknown.')
    if (!asset.commercialUseAllowed) throw new CoachEdError(400, 'License does not allow commercial use.')
    if (!asset.hasEvidence) throw new CoachEdError(400, 'No license verification evidence on file.')
    if (!asset.hasHostedCopy) throw new CoachEdError(400, 'No hosted copy of the file.')
    if (!asset.hasCredit || !asset.hasAlt) throw new CoachEdError(400, 'Credit line and alt text are required.')
    if (current !== 'anatomy_pending' && current !== 'license_verified' && current !== 'approved') {
      throw new CoachEdError(400, 'License must be verified before approval.')
    }
    if (!reviewer || !note) throw new CoachEdError(400, 'Approval needs the anatomy reviewer name and a note.')
  }
  if (status === 'rejected' && !note) throw new CoachEdError(400, 'Rejecting needs a reason.')
  file.media[id] = {
    status,
    at: now,
    by: actor.accountId,
    byName: actor.displayName,
    note: note || undefined,
    anatomyReview: status === 'approved' ? { reviewer, on: now.slice(0, 10), note } : undefined,
  }
  pushRevision(file, { kind: 'media', targetId: id, from: current, to: status, at: now, by: actor.accountId, byName: actor.displayName, note: note || undefined })
  file.updatedAt = now
  return file
}

export function applyPassPercent(file: CoachEdFile, value: number, actor: Actor, now = new Date().toISOString()): CoachEdFile {
  pushRevision(file, { kind: 'settings', targetId: 'passPercent', from: String(file.passPercent), to: String(value), at: now, by: actor.accountId, byName: actor.displayName })
  file.passPercent = value
  file.updatedAt = now
  return file
}

// ---- progress ----

export type AttemptRecord = {
  id: string
  assessmentId: string
  questionIds: string[]
  startedAt: string
  submittedAt?: string
  answers?: Record<string, string>
  correct?: number
  total?: number
  percent?: number
  passPercent?: number
  passed?: boolean
  criticalMissed?: string[]
}

export type AccountProgress = {
  lessons: Record<string, string>
  attempts: AttemptRecord[]
}

export type ProgressFile = {
  kind: 'shape-lab-coach-ed-progress'
  version: 1
  updatedAt: string
  accounts: Record<string, AccountProgress>
}

export const EMPTY_PROGRESS: ProgressFile = {
  kind: 'shape-lab-coach-ed-progress',
  version: 1,
  updatedAt: '',
  accounts: {},
}

export const OPEN_ATTEMPT_MS = 3 * 60 * 60 * 1000
const MAX_ATTEMPTS = 120

export function normalizeProgress(raw: unknown): ProgressFile {
  const f = raw as Partial<ProgressFile> | null
  if (!f || f.kind !== 'shape-lab-coach-ed-progress' || typeof f.accounts !== 'object' || !f.accounts) {
    return structuredClone(EMPTY_PROGRESS)
  }
  return { ...structuredClone(EMPTY_PROGRESS), ...f, accounts: f.accounts } as ProgressFile
}

export function accountProgress(file: ProgressFile, accountId: string): AccountProgress {
  const row = file.accounts[accountId]
  if (row) return row
  const fresh: AccountProgress = { lessons: {}, attempts: [] }
  file.accounts[accountId] = fresh
  return fresh
}

export function startAttempt(
  file: ProgressFile,
  accountId: string,
  assessmentId: string,
  questionIds: string[],
  now = new Date().toISOString(),
): AttemptRecord {
  const row = accountProgress(file, accountId)
  const cutoff = Date.parse(now) - OPEN_ATTEMPT_MS
  row.attempts = row.attempts.filter((a) => a.submittedAt || Date.parse(a.startedAt) >= cutoff)
  const attempt: AttemptRecord = { id: newId('att'), assessmentId, questionIds, startedAt: now }
  row.attempts.push(attempt)
  if (row.attempts.length > MAX_ATTEMPTS) row.attempts.splice(0, row.attempts.length - MAX_ATTEMPTS)
  file.updatedAt = now
  return attempt
}

export function findOpenAttempt(file: ProgressFile, accountId: string, attemptId: string, now = new Date().toISOString()): AttemptRecord {
  const a = file.accounts[accountId]?.attempts.find((x) => x.id === attemptId)
  if (!a) throw new CoachEdError(404, 'Attempt not found.')
  if (a.submittedAt) throw new CoachEdError(409, 'This attempt was already submitted.')
  if (Date.parse(a.startedAt) < Date.parse(now) - OPEN_ATTEMPT_MS) throw new CoachEdError(410, 'This attempt expired. Start a new one.')
  return a
}

export function passedAssessments(row: AccountProgress | undefined): Set<string> {
  const out = new Set<string>()
  for (const a of row?.attempts ?? []) if (a.passed && a.submittedAt) out.add(a.assessmentId)
  return out
}

export type ProgressSummary = {
  lessons: Record<string, string>
  assessments: Record<string, { attempts: number; bestPercent: number; passed: boolean; lastAt: string; passedAt?: string }>
  mastery: { id: string; label: string } | null
}

export function summarize(row: AccountProgress | undefined): ProgressSummary {
  const assessments: ProgressSummary['assessments'] = {}
  for (const a of row?.attempts ?? []) {
    if (!a.submittedAt) continue
    const cur = assessments[a.assessmentId] ?? { attempts: 0, bestPercent: 0, passed: false, lastAt: '' }
    cur.attempts += 1
    cur.bestPercent = Math.max(cur.bestPercent, a.percent ?? 0)
    cur.lastAt = a.submittedAt > cur.lastAt ? a.submittedAt : cur.lastAt
    if (a.passed) {
      cur.passed = true
      if (!cur.passedAt || a.submittedAt < cur.passedAt) cur.passedAt = a.submittedAt
    }
    assessments[a.assessmentId] = cur
  }
  const m = masteryFor(passedAssessments(row))
  return { lessons: row?.lessons ?? {}, assessments, mastery: m ? { id: m.id, label: m.label } : null }
}
