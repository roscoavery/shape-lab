import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from '../instagramResolve.ts'
import { readRequestBody } from '../libraryStore.ts'
import { listAccounts } from '../auth/accounts.ts'
import { isAdmin } from '../auth/permissions.ts'
import { tooMany } from '../auth/rateLimit.ts'
import type { AuthUser } from '../auth/types.ts'
import { assessmentById } from '../../src/content/coachEd/assessments.ts'
import { drawQuestionIds, gradeAttempt, normalizePassPercent } from './grading.ts'
import { MANIFEST } from './manifest.generated.ts'
import {
  accountProgress,
  applyMediaStatus,
  applyPassPercent,
  applyReview,
  CoachEdError,
  findOpenAttempt,
  startAttempt,
  summarize,
} from './model.ts'
import { readCoachEd, readProgress, writeCoachEd, writeProgress } from './store.ts'

/** Coach education is for coaches and gym admin. Athletes, parents, and kiosks never get it. */
export function canUseCoachEd(user: AuthUser): boolean {
  if (user.kiosk) return false
  return user.role === 'coach' || user.role === 'admin' || user.role === 'gymOwner'
}

async function jsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readRequestBody(req)
  try {
    const v = JSON.parse(raw || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    throw new CoachEdError(400, 'Request body must be JSON.')
  }
}

function publicOverlay(file: Awaited<ReturnType<typeof readCoachEd>>) {
  const strip = <T extends { by: string }>(rec: Record<string, T>) =>
    Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, { ...v, by: undefined }]))
  return {
    passPercent: file.passPercent,
    conditions: strip(file.conditions),
    lessons: strip(file.lessons),
    media: strip(file.media),
    updatedAt: file.updatedAt,
  }
}

export async function handleCoachEdApi(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  viewer: AuthUser,
): Promise<boolean> {
  const sub = path.slice('/api/coach-ed'.length) || '/'
  try {
    if (!canUseCoachEd(viewer)) {
      sendJson(res, 403, { error: 'Coach education is for coaches and gym admin.' })
      return true
    }
    const admin = isAdmin(viewer)
    const actor = { accountId: viewer.accountId, displayName: viewer.displayName }

    if (sub === '/state' && req.method === 'GET') {
      const [file, progress] = await Promise.all([readCoachEd(), readProgress()])
      sendJson(res, 200, {
        ...publicOverlay(file),
        mine: summarize(progress.accounts[viewer.accountId]),
        isAdmin: admin,
      })
      return true
    }

    if (sub === '/lesson' && req.method === 'PUT') {
      const body = await jsonBody(req)
      const id = typeof body.lessonId === 'string' ? body.lessonId : ''
      if (!MANIFEST.lessons.some((l) => l.id === id)) throw new CoachEdError(404, 'Unknown lesson.')
      const progress = await readProgress()
      const row = accountProgress(progress, viewer.accountId)
      if (body.done === false) delete row.lessons[id]
      else row.lessons[id] = new Date().toISOString()
      progress.updatedAt = new Date().toISOString()
      await writeProgress(progress)
      sendJson(res, 200, summarize(row))
      return true
    }

    if (sub === '/attempt/start' && req.method === 'POST') {
      if (tooMany(`coach-ed-start:${viewer.accountId}`, 30, 60 * 60_000)) {
        sendJson(res, 429, { error: 'Too many attempts. Wait a while.' })
        return true
      }
      const body = await jsonBody(req)
      const assessmentId = typeof body.assessmentId === 'string' ? body.assessmentId : ''
      if (!assessmentById(assessmentId)) throw new CoachEdError(404, 'Unknown assessment.')
      const ids = drawQuestionIds(assessmentId)
      if (!ids) throw new CoachEdError(404, 'No questions for this assessment yet.')
      const progress = await readProgress()
      const attempt = startAttempt(progress, viewer.accountId, assessmentId, ids)
      await writeProgress(progress)
      const file = await readCoachEd()
      sendJson(res, 200, { attemptId: attempt.id, assessmentId, questionIds: ids, passPercent: file.passPercent })
      return true
    }

    if (sub === '/attempt/submit' && req.method === 'POST') {
      const body = await jsonBody(req)
      const attemptId = typeof body.attemptId === 'string' ? body.attemptId : ''
      const given = body.answers && typeof body.answers === 'object' ? (body.answers as Record<string, unknown>) : {}
      const progress = await readProgress()
      const now = new Date().toISOString()
      const attempt = findOpenAttempt(progress, viewer.accountId, attemptId, now)
      const file = await readCoachEd()
      const graded = gradeAttempt(attempt.questionIds, given, normalizePassPercent(file.passPercent))
      attempt.submittedAt = now
      attempt.answers = Object.fromEntries(
        graded.results.filter((r) => r.given).map((r) => [r.id, r.given as string]),
      )
      attempt.correct = graded.correct
      attempt.total = graded.total
      attempt.percent = graded.percent
      attempt.passPercent = graded.passPercent
      attempt.passed = graded.passed
      attempt.criticalMissed = graded.criticalMissed
      progress.updatedAt = now
      await writeProgress(progress)
      sendJson(res, 200, { ...graded, mine: summarize(progress.accounts[viewer.accountId]) })
      return true
    }

    // Everything below is admin only.
    if (!admin) {
      sendJson(res, 403, { error: 'That action is limited to gym admin.' })
      return true
    }

    if (sub === '/dashboard' && req.method === 'GET') {
      const [accounts, progress] = await Promise.all([listAccounts(), readProgress()])
      const rows = accounts
        .filter((a) => a.role === 'coach' || a.role === 'admin' || a.role === 'gymOwner')
        .map((a) => {
          const s = summarize(progress.accounts[a.id])
          return {
            accountId: a.id,
            name: a.displayName,
            role: a.role,
            lessonsDone: Object.keys(s.lessons).length,
            assessments: s.assessments,
            mastery: s.mastery,
          }
        })
      sendJson(res, 200, { coaches: rows, lessonCount: MANIFEST.lessons.length })
      return true
    }

    if (sub === '/revisions' && req.method === 'GET') {
      const file = await readCoachEd()
      sendJson(res, 200, { revisions: file.revisions.slice(-200).reverse() })
      return true
    }

    if (sub === '/review' && req.method === 'PUT') {
      const file = await readCoachEd()
      applyReview(file, await jsonBody(req), actor)
      await writeCoachEd(file)
      sendJson(res, 200, publicOverlay(file))
      return true
    }

    if (sub === '/media' && req.method === 'PUT') {
      const file = await readCoachEd()
      applyMediaStatus(file, await jsonBody(req), actor)
      await writeCoachEd(file)
      sendJson(res, 200, publicOverlay(file))
      return true
    }

    if (sub === '/settings' && req.method === 'PUT') {
      const body = await jsonBody(req)
      const file = await readCoachEd()
      applyPassPercent(file, normalizePassPercent(body.passPercent), actor)
      await writeCoachEd(file)
      sendJson(res, 200, publicOverlay(file))
      return true
    }

    sendJson(res, 404, { error: 'Unknown coach education route.' })
    return true
  } catch (err) {
    if (err instanceof CoachEdError) {
      sendJson(res, err.status, { error: err.message })
      return true
    }
    throw err
  }
}
