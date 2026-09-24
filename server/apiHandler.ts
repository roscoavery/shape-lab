/**
 * Shared gym API used by Vite middleware (local) and the Vercel function.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  isResolvableVideoUrl,
  cacheResolvedIgMedia,
  publicOrProxyIgUrl,
  proxyInstagramMedia,
  lookupPostedBy,
  resolveSocialSlides,
  forgetResolvedSocial,
  sendJson,
} from './instagramResolve.ts'
import { postedByFromUrl } from '../src/lib/socialUrls.ts'
import { readLibraryFile, readRequestBody, writeLibraryFile } from './libraryStore.ts'
import { readCoachLibrary, writeCoachLibrary } from './coachLibraryStore.ts'
import { readRosterFile, rosterPeopleStamp, writeRosterFile } from './rosterStore.ts'
import {
  readRosterPhoto,
  readRosterPhotosFile,
  sendRosterPhotoFile,
  writeRosterPhotoBytes,
} from './rosterPhotoStore.ts'
import { readClipLoopsFile, writeClipLoopsFile } from './clipLoopsStore.ts'
import { readFavoritesFile, writeFavoritesFile } from './favoritesStore.ts'
import {
  collagesForOwner,
  deleteCollage,
  readCollagesFile,
  upsertCollage,
  writeCollagesFile,
} from './collageStore.ts'
import {
  addCollageFeedPost,
  addFeedPostFromBody,
  addFeedPostFromUrl,
  addTextFeedPost,
  deleteFeedPost,
  findFeedPost,
  postsForClient,
  presentFeedPost,
  sendFeedFile,
  viewerMaySeeFeedPost,
  attachVideoToFeedPost,
  celebrateFeedPost,
  toggleFeedHi5,
  toggleFeedLike,
  toggleFeedRepost,
} from './feedStore.ts'
import {
  addCoachStillFromBody,
  deleteCoachStill,
  extrasForClient,
  readRequestBodyLimited as readCoachStillBody,
  sendCoachStillFile,
  writeCoachStillsFile,
} from './coachStillStore.ts'
import { readResearchFile, writeResearchFile } from './researchStore.ts'
import { readSocialFile, toggleFollowOnDisk, writeSocialFile } from './socialStore.ts'
import { readDiscussFile, writeDiscussFile } from './discussStore.ts'
import { readLearnNotesFile, writeLearnNotesFile } from './learnNotesStore.ts'
import {
  addIgStillFromBody,
  deleteIgStill,
  readRequestBodyLimited,
  sendIgStillFile,
  stillsForClient,
  updateIgStillMeta,
} from './igStillDisk.ts'
import { readShapeCopyFile, writeShapeCopyFile } from './shapeCopyStore.ts'
import { readStillCropFile, writeStillCropFile } from './stillCropStore.ts'
import {
  addAthleteVideoFromBody,
  addAthleteVideoFromUrl,
  athleteVideoClientUrl,
  deleteAthleteVideo,
  findAthleteVideo,
  readRequestBuffer,
  sendAthleteVideoFile,
  videosForClient,
} from './athleteVideoDisk.ts'
import { readLessonsFile, writeLessonsFile } from './lessonStore.ts'
import { readCoachContentFile, writeCoachContentFile } from './coachContentStore.ts'
import { addCoachMedia, readCoachMediaBuffer, sendCoachMediaFile } from './coachMediaDisk.ts'
import { isHomeGym, persistMode, readRevision } from './persist.ts'
import { sendContactsPage } from './contactsPage.ts'
import { readCoachClassesFile, writeCoachClassesFile } from './coachClassStore.ts'
import { readTrainingEventsFile, writeTrainingEventsFile } from './trainingEventStore.ts'
import { readSkillPathsFile, writeSkillPathsFile } from './skillPathStore.ts'
import { readImproveNotesFile, writeImproveNotesFile } from './improveNotesStore.ts'
import { addNotice, markNoticesRead, noticesForClient } from './notifyStore.ts'
import { readChalkboardsFile, writeChalkboardsFile } from './chalkboardStore.ts'
import {
  addHighlight,
  addStoryFromBody,
  readStoryRequestBuffer,
  findStory,
  sendStoryFile,
  storiesForClient,
  viewerMaySeeStory,
} from './storyStore.ts'

import { handleAuthRoutes } from './auth/routes.ts'
import { gateApiRequest } from './auth/gate.ts'
import { authorizeRosterWrite, presentRosterForViewer } from './auth/rosterAccess.ts'
import {
  applyConsentPatch,
  athletesViewerMayConsent,
  canEditConsent,
  consentFieldsOf,
  parseConsentPatch,
} from './auth/consent.ts'
import { canAccessAthlete, canCoachAthlete, canEditAthlete, canParentAccessAthlete, isAdmin, type RosterAthlete } from './auth/permissions.ts'
import { writeAudit } from './auth/audit.ts'
import type { AuthUser } from './auth/types.ts'
import { appendHoldLog } from './holdLog.ts'
import { readParentWellness, writeParentWellness } from './parentWellnessStore.ts'
import { patchStillTags, stillTagsForViewer } from './stillTags.ts'
import { handleCalendarApi } from './calendar/apiRoutes.ts'

const API_PATHS = new Set([
  '/api/auth/me',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/bootstrap',
  '/api/auth/accounts',
  '/api/auth/register',
  '/api/auth/delete-self',
  '/api/auth/password',
  '/api/auth/kiosk',
  '/api/auth/invite',
  '/api/auth/invites',
  '/api/auth/audit',
  '/api/auth/sessions',
  '/api/auth/unlock',
  '/api/ig-resolve',
  '/api/ig-media',
  '/api/library',
  '/api/roster',
  '/api/roster-photos',
  '/api/roster-photo-file',
  '/api/revision',
  '/api/media-token',
  '/api/consent',
  '/api/parent-wellness',
  '/api/hold-logs',
  '/api/still-tags',
  '/api/contacts',
  '/api/contacts.csv',
  '/api/health',
  '/api/persist',
  '/api/ig-stills',
  '/api/ig-still-file',
  '/api/shape-copy',
  '/api/learn-notes',
  '/api/coach-stills',
  '/api/coach-still-file',
  '/api/still-crops',
  '/api/athlete-videos',
  '/api/athlete-video-file',
  '/api/clip-loops',
  '/api/favorites',
  '/api/collages',
  '/api/feed',
  '/api/feed-file',
  '/api/notices',
  '/api/research',
  '/api/social',
  '/api/discuss',
  '/api/coach-library',
  '/api/lessons',
  '/api/coach-classes',
  '/api/training-events',
  '/api/skill-paths',
  '/api/improve-notes',
  '/api/chalkboards',
  '/api/coach-content',
  '/api/coach-media',
  '/api/coach-media-file',
  '/api/stories',
  '/api/story-file',
])

function requestUrl(req: IncomingMessage): URL {
  const raw = req.url ?? '/'
  if (/^https?:\/\//i.test(raw)) return new URL(raw)
  const host = (typeof req.headers.host === 'string' && req.headers.host) || '127.0.0.1'
  const proto =
    (typeof req.headers['x-forwarded-proto'] === 'string' && req.headers['x-forwarded-proto']) ||
    'http'
  return new URL(raw, `${proto}://${host}`)
}

function apiPath(pathname: string): string {
  if (API_PATHS.has(pathname)) return pathname
  if (!pathname.startsWith('/api/')) {
    const prefixed = `/api${pathname.startsWith('/') ? pathname : `/${pathname}`}`
    if (API_PATHS.has(prefixed)) return prefixed
  }
  return pathname
}

async function rosterAthleteById(id: string): Promise<{
  athlete: RosterAthlete | null
  athletes: RosterAthlete[]
}> {
  const roster = await readRosterFile()
  const athletes = (Array.isArray(roster.athletes) ? roster.athletes : []).filter(
    (row): row is RosterAthlete => Boolean(row && typeof row === 'object' && typeof (row as RosterAthlete).id === 'string'),
  ) as RosterAthlete[]
  return { athlete: athletes.find((row) => row.id === id) ?? null, athletes }
}

async function denyUnlessAthleteAccess(
  res: ServerResponse,
  user: AuthUser,
  athleteId: string,
  write: boolean,
): Promise<boolean> {
  const { athlete, athletes } = await rosterAthleteById(athleteId)
  if (!athlete) {
    sendJson(res, 404, { error: 'Athlete not found' })
    return true
  }
  const ok = write
    ? await canEditAthlete(user, athlete, athletes)
    : await canAccessAthlete(user, athlete, athletes)
  if (!ok) {
    sendJson(res, 403, { error: 'You cannot access that athlete.' })
    return true
  }
  return false
}

/** Returns true when this request is a Shape Lab API call (response already written). */
export async function handleShapeLabApi(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = requestUrl(req)
  const path = apiPath(url.pathname)
  if (path === '/api/calendar' || path.startsWith('/api/calendar/')) {
    const sub = path.slice('/api/calendar'.length) || '/'
    return await handleCalendarApi(req, res, sub)
  }
  if (!API_PATHS.has(path)) return false

  if (path === '/api/health') {
    sendJson(res, 200, { ok: true, homeGym: isHomeGym(), mode: persistMode(), holdBuild: 'lace' })
    return true
  }
  if (path.startsWith('/api/auth')) {
    return handleAuthRoutes(req, res, path)
  }

  const gate = await gateApiRequest(req, res, path)
  if (gate.handled) return true
  const viewer = gate.user

  if (path === '/api/ig-stills') {
    if (req.method === 'GET') {
      sendJson(res, 200, { kind: 'shape-lab-ig-stills', ...(await stillsForClient()) })
      return true
    }
    if (req.method === 'POST') {
      const body = await readRequestBodyLimited(req)
      const saved = await addIgStillFromBody(JSON.parse(body))
      sendJson(res, 200, saved)
      return true
    }
    if (req.method === 'PATCH') {
      const id = url.searchParams.get('id') ?? ''
      const body = await readRequestBodyLimited(req)
      const saved = await updateIgStillMeta(id, JSON.parse(body))
      if (!saved) {
        sendJson(res, 404, { error: 'Still not found' })
        return true
      }
      sendJson(res, 200, saved)
      return true
    }
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id') ?? ''
      if (!(await deleteIgStill(id))) {
        sendJson(res, 404, { error: 'Still not found' })
        return true
      }
      sendJson(res, 200, { ok: true })
      return true
    }
    sendJson(res, 405, { error: 'Use GET, POST, PATCH, or DELETE' })
    return true
  }
  if (path === '/api/ig-still-file') {
    const id = url.searchParams.get('id') ?? ''
    if (!(await sendIgStillFile(id, res))) {
      sendJson(res, 404, { error: 'Still file not found' })
    }
    return true
  }
  if (path === '/api/persist') {
    const mode = persistMode()
    sendJson(res, 200, {
      mode,
      lasting: mode === 'blob' || mode === 'disk',
      homeGym: isHomeGym(),
      revision: await readRevision(),
    })
    return true
  }
  if (path === '/api/revision') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=5')
    res.end(JSON.stringify(await readRevision()))
    return true
  }
  if (path === '/api/media-token') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use POST' })
      return true
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
      sendJson(res, 501, { error: 'direct' })
      return true
    }
    let body: { pathname?: string; contentType?: string } = {}
    try {
      const raw = await readRequestBody(req)
      body = raw ? (JSON.parse(raw) as typeof body) : {}
    } catch {
      sendJson(res, 400, { error: 'Could not start that upload.' })
      return true
    }
    const pathname = (body.pathname || '').trim()
    if (
      !pathname ||
      pathname.includes('..') ||
      !(
        pathname.startsWith('data/feed-blobs/') ||
        pathname.startsWith('data/roster-photos/') ||
        pathname.startsWith('data/athlete-video-blobs/') ||
        pathname.startsWith('data/library-blobs/')
      )
    ) {
      sendJson(res, 400, { error: 'That upload path is not allowed.' })
      return true
    }
    const photoMatch = pathname.match(/^data\/roster-photos\/([A-Za-z0-9_-]+)/)
    if (photoMatch?.[1] && (await denyUnlessAthleteAccess(res, viewer, photoMatch[1], true))) {
      return true
    }
    try {
      const { generateClientTokenFromReadWriteToken } = await import('@vercel/blob/client')
      const tokenOpts = {
        pathname,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        allowedContentTypes: [
          'video/mp4',
          'video/webm',
          'video/quicktime',
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/heic',
        ],
        maximumSizeInBytes: 80 * 1024 * 1024,
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 31536000,
      }
      let token: string
      try {
        token = await generateClientTokenFromReadWriteToken({
          ...tokenOpts,
          access: 'private',
        })
      } catch {
        token = await generateClientTokenFromReadWriteToken(tokenOpts)
      }
      sendJson(res, 200, { token, pathname })
    } catch (err) {
      sendJson(res, 400, {
        error: err instanceof Error ? err.message : 'Could not start that upload.',
      })
    }
    return true
  }
  if (path === '/api/contacts' || path === '/api/contacts.csv') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Use GET' })
      return true
    }
    await writeAudit('contacts.view', viewer, { detail: path })
    await sendContactsPage(req, res, path.endsWith('.csv') ? 'csv' : 'html')
    return true
  }
  if (path === '/api/roster-photo-file') {
    const photoId = url.searchParams.get('id') ?? ''
    if (await denyUnlessAthleteAccess(res, viewer, photoId, false)) return true
    await writeAudit('media.view', viewer, { athleteId: photoId, detail: 'roster-photo-file' })
    if (!(await sendRosterPhotoFile(photoId, res))) {
      sendJson(res, 404, { error: 'Photo not found' })
    }
    return true
  }
  if (path === '/api/roster-photos') {
    const photoId = url.searchParams.get('id') ?? ''
    if (req.method === 'GET') {
      if (photoId) {
        if (await denyUnlessAthleteAccess(res, viewer, photoId, false)) return true
        sendJson(res, 200, {
          kind: 'shape-lab-roster-photo',
          id: photoId,
          photo: (await readRosterPhoto(photoId)) ?? '',
        })
        return true
      }
      const index = await readRosterPhotosFile()
      const allowed: Record<string, unknown> = {}
      const photos = index.photos && typeof index.photos === 'object' ? index.photos : {}
      const roster = await readRosterFile()
      const athletes = (Array.isArray(roster.athletes) ? roster.athletes : []).filter(
        (row): row is RosterAthlete =>
          Boolean(row && typeof row === 'object' && typeof (row as RosterAthlete).id === 'string'),
      ) as RosterAthlete[]
      for (const id of Object.keys(photos)) {
        const athlete = athletes.find((row) => row.id === id)
        if (!athlete) continue
        if (await canAccessAthlete(viewer, athlete, athletes)) {
          allowed[id] = (photos as Record<string, unknown>)[id]
        }
      }
      sendJson(res, 200, { ...index, photos: allowed })
      return true
    }
    if (req.method === 'PUT') {
      const ct = String(req.headers['content-type'] || '').toLowerCase()
      if (photoId && (ct.startsWith('image/') || ct === 'application/octet-stream')) {
        if (await denyUnlessAthleteAccess(res, viewer, photoId, true)) return true
        const buf = await readRequestBuffer(req, 8 * 1024 * 1024)
        const saved = await writeRosterPhotoBytes(photoId, buf, ct.startsWith('image/') ? ct : 'image/jpeg')
        if (!saved) {
          sendJson(res, 400, { error: 'Could not save that photo.' })
          return true
        }
        sendJson(res, 200, { kind: 'shape-lab-roster-photo', id: photoId, ...saved })
        return true
      }
      sendJson(res, 403, { error: 'Bulk photo replace is limited to one authorized athlete at a time.' })
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/consent') {
    const { athletes } = await rosterAthleteById('')
    if (req.method === 'GET') {
      sendJson(res, 200, {
        kind: 'shape-lab-consent',
        athletes: athletesViewerMayConsent(viewer, athletes).map(consentFieldsOf),
      })
      return true
    }
    if (req.method === 'PATCH') {
      let body: Record<string, unknown> = {}
      try {
        const raw = await readRequestBody(req)
        body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      } catch {
        sendJson(res, 400, { error: 'That consent update did not save. Try again.' })
        return true
      }
      const athleteId = typeof body.athleteId === 'string' ? body.athleteId.trim() : ''
      const athlete = athletes.find((row) => row.id === athleteId)
      if (!athlete) {
        sendJson(res, 404, { error: 'Athlete not found' })
        return true
      }
      if (!canEditConsent(viewer, athlete, athletes)) {
        sendJson(res, 403, {
          error: 'Only a parent, the athlete, or gym admin can change consent.',
        })
        return true
      }
      try {
        const roster = await readRosterFile()
        const nextAthletes = (Array.isArray(roster.athletes) ? roster.athletes : []).map((row) => {
          if (!row || typeof row !== 'object' || (row as RosterAthlete).id !== athleteId) return row
          return applyConsentPatch(row as RosterAthlete, parseConsentPatch(body))
        })
        const saved = await writeRosterFile({ ...roster, athletes: nextAthletes })
        const updated = (Array.isArray(saved.athletes) ? saved.athletes : []).find(
          (row) => row && typeof row === 'object' && (row as RosterAthlete).id === athleteId,
        ) as RosterAthlete | undefined
        await writeAudit('athlete.edit', viewer, { athleteId, detail: 'consent' })
        sendJson(res, 200, {
          ok: true,
          athlete: updated ? consentFieldsOf(updated) : consentFieldsOf(athlete),
        })
      } catch (err) {
        sendJson(res, 503, {
          error: err instanceof Error ? err.message : 'Could not save consent on this gym.',
        })
      }
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PATCH' })
    return true
  }
  if (path === '/api/parent-wellness') {
    const accountId =
      isAdmin(viewer) && typeof url.searchParams.get('accountId') === 'string'
        ? url.searchParams.get('accountId') || viewer.accountId
        : viewer.accountId
    if (req.method === 'GET') {
      if (viewer.role === 'parent') {
        sendJson(res, 200, { profile: await readParentWellness(viewer.accountId) })
        return true
      }
      if (isAdmin(viewer)) {
        sendJson(res, 200, { profile: await readParentWellness(accountId) })
        return true
      }
      sendJson(res, 403, { error: 'Parent wellness notes stay with that parent.' })
      return true
    }
    if (req.method === 'PUT') {
      if (viewer.role !== 'parent' && !isAdmin(viewer)) {
        sendJson(res, 403, { error: 'Parent wellness notes stay with that parent.' })
        return true
      }
      if (viewer.role === 'parent' && accountId !== viewer.accountId) {
        sendJson(res, 403, { error: 'Parent wellness notes stay with that parent.' })
        return true
      }
      try {
        const body = JSON.parse(await readRequestBody(req))
        const target = viewer.role === 'parent' ? viewer.accountId : accountId
        const profile = await writeParentWellness(target, body)
        await writeAudit('athlete.edit', viewer, { detail: 'parent-wellness' })
        sendJson(res, 200, { profile })
      } catch (err) {
        sendJson(res, 400, {
          error: err instanceof Error ? err.message : 'Could not save wellness notes.',
        })
      }
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/still-tags') {
    const roster = await readRosterFile()
    const athletes = (Array.isArray(roster.athletes) ? roster.athletes : []).filter(
      (row): row is RosterAthlete =>
        Boolean(row && typeof row === 'object' && typeof (row as RosterAthlete).id === 'string'),
    )
    if (req.method === 'GET') {
      sendJson(res, 200, { stills: await stillTagsForViewer(viewer, athletes) })
      return true
    }
    if (req.method === 'PATCH') {
      try {
        const body = JSON.parse(await readRequestBody(req))
        const stills = await patchStillTags(viewer, body, athletes)
        await writeAudit('athlete.edit', viewer, { detail: 'still-tags' })
        sendJson(res, 200, { stills })
      } catch (err) {
        const status = (err as Error & { status?: number }).status ?? 400
        sendJson(res, status, {
          error: err instanceof Error ? err.message : 'Could not save that tag.',
        })
      }
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PATCH' })
    return true
  }
  if (path === '/api/hold-logs') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Use POST' })
      return true
    }
    let body: {
      athleteId?: string
      shapeId?: string
      shapeName?: string
      seconds?: number
      performedAt?: string
      source?: 'coach' | 'athlete' | 'parent'
      lessonId?: string
      classMeetingId?: string
      className?: string
      side?: 'left' | 'right'
      logId?: string
      loggedFrom?: 'lesson' | 'class' | 'profile' | 'today'
    } = {}
    try {
      body = JSON.parse(await readRequestBody(req)) as typeof body
    } catch {
      sendJson(res, 400, { error: 'Could not read that hold.' })
      return true
    }
    const athleteId = typeof body.athleteId === 'string' ? body.athleteId : ''
    if (!athleteId) {
      sendJson(res, 400, { error: 'Which athlete?' })
      return true
    }
    const seconds = Number(body.seconds)
    if (!Number.isFinite(seconds) || seconds < 0.2) {
      sendJson(res, 400, { error: 'Enter a hold time in seconds.' })
      return true
    }
    const { athlete, athletes } = await rosterAthleteById(athleteId)
    if (!athlete) {
      sendJson(res, 404, { error: 'Athlete not found' })
      return true
    }
    const source = body.source ?? (viewer.role === 'coach' || isAdmin(viewer) ? 'coach' : viewer.role === 'parent' ? 'parent' : 'athlete')
    if (source === 'coach') {
      if (!(await canCoachAthlete(viewer, athlete))) {
        sendJson(res, 403, { error: 'You cannot log a hold for that athlete.' })
        return true
      }
    } else if (source === 'parent') {
      if (!canParentAccessAthlete(viewer, athlete, athletes)) {
        sendJson(res, 403, { error: 'You cannot log a hold for that athlete.' })
        return true
      }
    } else if (viewer.rosterProfileId !== athleteId) {
      sendJson(res, 403, { error: 'You cannot log a hold for that athlete.' })
      return true
    }
    const saved = await appendHoldLog({
      athleteId,
      shapeId: body.shapeId,
      shapeName: body.shapeName,
      seconds,
      performedAt: body.performedAt,
      source,
      coachId: source === 'coach' ? viewer.rosterProfileId : undefined,
      coachName: source === 'coach' ? viewer.displayName : undefined,
      lessonId: body.lessonId,
      classMeetingId: body.classMeetingId,
      className: body.className,
      side: body.side,
      logId: body.logId,
      loggedFrom: body.loggedFrom,
    })
    if (!saved) {
      sendJson(res, 400, { error: 'Could not save that hold.' })
      return true
    }
    await writeAudit('athlete.edit', viewer, { athleteId, detail: 'hold-log' })
    sendJson(res, 200, { ok: true, log: saved })
    return true
  }
  if (path === '/api/roster') {
    if (req.method === 'GET') {
      const roster = await readRosterFile()
      const presented = await presentRosterForViewer(viewer, roster)
      await writeAudit('roster.view', viewer, { detail: `athletes:${Array.isArray(presented.athletes) ? presented.athletes.length : 0}` })
      sendJson(res, 200, presented)
      return true
    }
    if (req.method === 'PUT') {
      try {
        const body = await readRequestBody(req)
        const incoming = JSON.parse(body) as { athletes?: unknown[] }
        const existing = await readRosterFile()
        const authorized = await authorizeRosterWrite(viewer, existing, incoming)
        const saved = await writeRosterFile(authorized)
        if (rosterPeopleStamp(existing.athletes) !== rosterPeopleStamp(saved.athletes)) {
          await writeAudit('roster.write', viewer, {
            detail: `athletes:${saved.athletes.length}`,
          })
        }
        sendJson(res, 200, {
          kind: 'shape-lab-roster',
          ok: true,
          athleteCount: saved.athletes.length,
          exportedAt: saved.exportedAt,
        })
      } catch (err) {
        sendJson(res, 503, {
          error:
            err instanceof Error
              ? err.message
              : 'Could not save the gym file on this link.',
        })
      }
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/coach-stills') {
    if (req.method === 'GET') {
      sendJson(res, 200, await extrasForClient())
      return true
    }
    if (req.method === 'POST') {
      try {
        const body = await readCoachStillBody(req)
        const saved = await addCoachStillFromBody(JSON.parse(body))
        sendJson(res, 200, saved)
      } catch (err) {
        sendJson(res, 400, {
          error: err instanceof Error ? err.message : 'Could not save that still.',
        })
      }
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      const saved = await writeCoachStillsFile(JSON.parse(body))
      sendJson(res, 200, saved)
      return true
    }
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id') ?? ''
      const saved = await deleteCoachStill(id)
      if (!saved) {
        sendJson(res, 404, { error: 'Still not found' })
        return true
      }
      sendJson(res, 200, saved)
      return true
    }
    sendJson(res, 405, { error: 'Use GET, POST, PUT, or DELETE' })
    return true
  }
  if (path === '/api/coach-still-file') {
    const id = url.searchParams.get('id') ?? ''
    if (!(await sendCoachStillFile(id, res))) {
      sendJson(res, 404, { error: 'Still file not found' })
    }
    return true
  }
  if (path === '/api/learn-notes') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readLearnNotesFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      const saved = await writeLearnNotesFile(JSON.parse(body))
      sendJson(res, 200, saved)
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/shape-copy') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readShapeCopyFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      const saved = await writeShapeCopyFile(JSON.parse(body))
      sendJson(res, 200, saved)
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/still-crops') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readStillCropFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      const saved = await writeStillCropFile(JSON.parse(body))
      sendJson(res, 200, saved)
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/athlete-videos') {
    if (req.method === 'GET') {
      const athleteId = url.searchParams.get('athleteId') ?? ''
      const classId = url.searchParams.get('classId') ?? ''
      if (athleteId) {
        if (await denyUnlessAthleteAccess(res, viewer, athleteId, false)) return true
      }
      const roster = await readRosterFile()
      const athletes = (Array.isArray(roster.athletes) ? roster.athletes : []).filter(
        (row): row is RosterAthlete =>
          Boolean(row && typeof row === 'object' && typeof (row as RosterAthlete).id === 'string'),
      ) as RosterAthlete[]
      const visible = []
      for (const video of await videosForClient(athleteId || undefined, classId || undefined)) {
        const owner = athletes.find((row) => row.id === video.athleteId)
        if (!owner) continue
        if (!(await canAccessAthlete(viewer, owner, athletes))) continue
        visible.push({
          ...video,
          publicUrl: undefined,
          url: athleteVideoClientUrl(video),
        })
      }
      sendJson(res, 200, { kind: 'shape-lab-athlete-videos', videos: visible })
      return true
    }
    if (req.method === 'POST') {
      const ct = String(req.headers['content-type'] || '').toLowerCase()
      if (ct.includes('application/json')) {
        let body: {
          id?: string
          athleteId?: string
          name?: string
          source?: string
          createdAt?: string
          durationSec?: number | null
          mime?: string
          url?: string
          sizeBytes?: number
          lessonId?: string
          skillId?: string
          skillLabel?: string
          classId?: string
          className?: string
        } = {}
        try {
          const raw = await readRequestBody(req)
          body = raw ? (JSON.parse(raw) as typeof body) : {}
        } catch {
          sendJson(res, 400, { error: 'Could not save that video.' })
          return true
        }
        const videoAthleteId = body.athleteId ?? url.searchParams.get('athleteId') ?? ''
        if (await denyUnlessAthleteAccess(res, viewer, videoAthleteId, true)) return true
        const saved = await addAthleteVideoFromUrl({
          id: body.id ?? url.searchParams.get('id') ?? '',
          athleteId: videoAthleteId,
          name: body.name ?? url.searchParams.get('name') ?? 'Clip',
          source: body.source ?? url.searchParams.get('source') ?? 'compare-replay',
          createdAt: body.createdAt,
          durationSec: body.durationSec,
          mime: body.mime ?? url.searchParams.get('mime') ?? 'video/webm',
          url: body.url ?? '',
          sizeBytes: body.sizeBytes,
          lessonId: body.lessonId,
          skillId: body.skillId,
          skillLabel: body.skillLabel,
          classId: body.classId,
          className: body.className,
        })
        if (!saved) {
          sendJson(res, 400, { error: 'Could not save that video.' })
          return true
        }
        sendJson(res, 200, { ...saved, url: athleteVideoClientUrl(saved) })
        return true
      }
      const buf = await readRequestBuffer(req)
      const uploadAthleteId = url.searchParams.get('athleteId') ?? ''
      if (await denyUnlessAthleteAccess(res, viewer, uploadAthleteId, true)) return true
      const saved = await addAthleteVideoFromBody({
        id: url.searchParams.get('id') ?? '',
        athleteId: uploadAthleteId,
        name: url.searchParams.get('name') ?? 'Clip',
        source: url.searchParams.get('source') ?? 'compare-replay',
        createdAt: url.searchParams.get('createdAt') ?? undefined,
        durationSec: url.searchParams.get('durationSec')
          ? Number(url.searchParams.get('durationSec'))
          : null,
        mime: url.searchParams.get('mime') || req.headers['content-type'] || 'video/webm',
        buf,
        lessonId: url.searchParams.get('lessonId') ?? undefined,
        skillId: url.searchParams.get('skillId') ?? undefined,
        skillLabel: url.searchParams.get('skillLabel') ?? undefined,
        classId: url.searchParams.get('classId') ?? undefined,
        className: url.searchParams.get('className') ?? undefined,
      })
      if (!saved) {
        sendJson(res, 400, { error: 'Could not save that video.' })
        return true
      }
      sendJson(res, 200, {
        ...saved,
        url: athleteVideoClientUrl(saved),
      })
      return true
    }
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id') ?? ''
      const found = await findAthleteVideo(id)
      if (!found) {
        sendJson(res, 404, { error: 'Video not found' })
        return true
      }
      if (await denyUnlessAthleteAccess(res, viewer, found.athleteId, true)) return true
      if (!(await deleteAthleteVideo(id, found.athleteId))) {
        sendJson(res, 404, { error: 'Video not found' })
        return true
      }
      await writeAudit('media.delete', viewer, { athleteId: found.athleteId, detail: id })
      sendJson(res, 200, { ok: true })
      return true
    }
    sendJson(res, 405, { error: 'Use GET, POST, or DELETE' })
    return true
  }
  if (path === '/api/athlete-video-file') {
    const id = url.searchParams.get('id') ?? ''
    const found = await findAthleteVideo(id)
    if (!found) {
      sendJson(res, 404, { error: 'Video file not found' })
      return true
    }
    if (await denyUnlessAthleteAccess(res, viewer, found.athleteId, false)) return true
    await writeAudit('media.view', viewer, { athleteId: found.athleteId, detail: id })
    if (!(await sendAthleteVideoFile(id, res))) {
      sendJson(res, 404, { error: 'Video file not found' })
    }
    return true
  }
  if (path === '/api/clip-loops') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readClipLoopsFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeClipLoopsFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/favorites') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readFavoritesFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeFavoritesFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/collages') {
    if (req.method === 'GET') {
      const ownerId = url.searchParams.get('ownerId')
      sendJson(res, 200, {
        ...(await readCollagesFile()),
        collages: await collagesForOwner(ownerId),
      })
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeCollagesFile(JSON.parse(body)))
      return true
    }
    if (req.method === 'POST') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await upsertCollage(JSON.parse(body)))
      return true
    }
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id') ?? ''
      if (!(await deleteCollage(id))) {
        sendJson(res, 404, { error: 'Collage not found' })
        return true
      }
      sendJson(res, 200, { ok: true })
      return true
    }
    sendJson(res, 405, { error: 'Use GET, PUT, POST, or DELETE' })
    return true
  }
  if (path === '/api/feed') {
    if (req.method === 'GET') {
      const { athletes } = await rosterAthleteById('')
      sendJson(res, 200, { kind: 'shape-lab-feed', posts: await postsForClient(viewer, athletes) })
      return true
    }
    if (req.method === 'POST') {
      const ct = String(req.headers['content-type'] || '').toLowerCase()
      if (
        ct.includes('json') ||
        url.searchParams.get('kind') === 'collage' ||
        url.searchParams.get('kind') === 'text' ||
        url.searchParams.get('kind') === 'video' ||
        url.searchParams.get('kind') === 'like' ||
        url.searchParams.get('kind') === 'hi5' ||
        url.searchParams.get('kind') === 'repost' ||
        url.searchParams.get('kind') === 'celebrate' ||
        url.searchParams.get('kind') === 'attach'
      ) {
        let body: {
          kind?: string
          authorId?: string
          caption?: string
          taggedIds?: string[]
          createdAt?: string
          id?: string
          collage?: unknown
          channels?: unknown
          sharedById?: string
          sharedByName?: string
          url?: string
          mime?: string
          sizeBytes?: number
        } = {}
        try {
          const raw = await readRequestBody(req)
          body = raw ? (JSON.parse(raw) as typeof body) : {}
        } catch {
          sendJson(res, 400, { error: 'That post did not save. Try again.' })
          return true
        }
        const taggedIds = Array.isArray(body.taggedIds)
          ? body.taggedIds
          : (url.searchParams.get('taggedIds') ?? '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
        const kind = body.kind ?? url.searchParams.get('kind') ?? ''
        if (kind === 'like' || kind === 'hi5' || kind === 'repost' || kind === 'celebrate') {
          const saved =
            kind === 'hi5'
              ? await toggleFeedHi5(
                  body.id ?? url.searchParams.get('id') ?? '',
                  body.authorId ?? url.searchParams.get('authorId') ?? '',
                )
              : kind === 'repost'
                ? await toggleFeedRepost(
                    body.id ?? url.searchParams.get('id') ?? '',
                    body.authorId ?? url.searchParams.get('authorId') ?? '',
                  )
                : kind === 'celebrate'
                  ? await celebrateFeedPost(
                      body.id ?? url.searchParams.get('id') ?? '',
                      body.authorId ?? url.searchParams.get('authorId') ?? '',
                    )
              : await toggleFeedLike(
                  body.id ?? url.searchParams.get('id') ?? '',
                  body.authorId ?? url.searchParams.get('authorId') ?? '',
                )
          if (!saved) {
            sendJson(res, 400, {
              error:
                kind === 'hi5'
                  ? 'Could not high-five that post.'
                  : kind === 'repost'
                    ? 'Could not add that to your profile.'
                    : 'Could not like that post.',
            })
            return true
          }
          sendJson(res, 200, presentFeedPost(saved))
          return true
        }
        if (kind === 'attach') {
          const saved = await attachVideoToFeedPost({
            postId: body.id ?? url.searchParams.get('id') ?? '',
            actorId: body.authorId ?? url.searchParams.get('authorId') ?? '',
            admin: url.searchParams.get('admin') === '1' || Boolean((body as { admin?: boolean }).admin),
            coach: url.searchParams.get('coach') === '1' || Boolean((body as { coach?: boolean }).coach),
            mime: body.mime ?? url.searchParams.get('mime') ?? 'video/mp4',
            url: body.url ?? url.searchParams.get('url') ?? '',
            sizeBytes: body.sizeBytes,
          })
          if (!saved) {
            sendJson(res, 400, { error: 'Could not attach that clip to the win.' })
            return true
          }
          sendJson(res, 200, presentFeedPost(saved))
          return true
        }
        if (kind === 'video') {
          const saved = await addFeedPostFromUrl({
            id: body.id ?? url.searchParams.get('id') ?? '',
            authorId: body.authorId ?? url.searchParams.get('authorId') ?? '',
            caption: body.caption ?? url.searchParams.get('caption') ?? '',
            taggedIds,
            createdAt: body.createdAt,
            mime: body.mime ?? url.searchParams.get('mime') ?? 'video/mp4',
            url: body.url ?? url.searchParams.get('url') ?? '',
            sizeBytes: body.sizeBytes,
            channels: body.channels ?? url.searchParams.get('channels'),
            sharedById: body.sharedById ?? url.searchParams.get('sharedById') ?? undefined,
            sharedByName: body.sharedByName ?? url.searchParams.get('sharedByName') ?? undefined,
          })
          if (!saved) {
            sendJson(res, 400, { error: 'Could not save that video win.' })
            return true
          }
          sendJson(res, 200, presentFeedPost(saved))
          return true
        }
        if (kind === 'text') {
          const saved = await addTextFeedPost({
            id: body.id ?? url.searchParams.get('id') ?? '',
            authorId: body.authorId ?? url.searchParams.get('authorId') ?? '',
            caption: body.caption ?? url.searchParams.get('caption') ?? '',
            taggedIds,
            createdAt: body.createdAt,
            channels: body.channels ?? url.searchParams.get('channels'),
            sharedById: body.sharedById ?? url.searchParams.get('sharedById') ?? undefined,
            sharedByName: body.sharedByName ?? url.searchParams.get('sharedByName') ?? undefined,
          })
          if (!saved) {
            sendJson(res, 400, { error: 'Write a caption to post without a video.' })
            return true
          }
          sendJson(res, 200, { ...saved, url: '' })
          return true
        }
        const saved = await addCollageFeedPost({
          id: body.id ?? url.searchParams.get('id') ?? '',
          authorId: body.authorId ?? url.searchParams.get('authorId') ?? '',
          caption: body.caption ?? url.searchParams.get('caption') ?? '',
          taggedIds,
          createdAt: body.createdAt,
          collage: body.collage,
          channels: body.channels ?? url.searchParams.get('channels'),
        })
        if (!saved) {
          sendJson(res, 400, { error: 'Could not share that collage.' })
          return true
        }
        sendJson(res, 200, { ...saved, url: '' })
        return true
      }
      const buf = await readRequestBuffer(req)
      if (url.searchParams.get('kind') === 'attach') {
        const saved = await attachVideoToFeedPost({
          postId: url.searchParams.get('id') ?? '',
          actorId: url.searchParams.get('authorId') ?? '',
          admin: url.searchParams.get('admin') === '1',
          coach: url.searchParams.get('coach') === '1',
          mime: url.searchParams.get('mime') || req.headers['content-type'] || 'video/webm',
          buf,
        })
        if (!saved) {
          sendJson(res, 400, { error: 'Could not attach that clip to the win.' })
          return true
        }
        sendJson(res, 200, presentFeedPost(saved))
        return true
      }
      const taggedRaw = url.searchParams.get('taggedIds') ?? ''
      const saved = await addFeedPostFromBody({
        id: url.searchParams.get('id') ?? '',
        authorId: url.searchParams.get('authorId') ?? '',
        caption: url.searchParams.get('caption') ?? '',
        taggedIds: taggedRaw ? taggedRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
        createdAt: url.searchParams.get('createdAt') ?? undefined,
        mime: url.searchParams.get('mime') || req.headers['content-type'] || 'video/webm',
        buf,
        channels: url.searchParams.get('channels'),
        sharedById: url.searchParams.get('sharedById') ?? undefined,
        sharedByName: url.searchParams.get('sharedByName') ?? undefined,
      })
      if (!saved) {
        sendJson(res, 400, { error: 'Could not save that post.' })
        return true
      }
      sendJson(res, 200, presentFeedPost(saved))
      return true
    }
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id') ?? ''
      const actorId = url.searchParams.get('actorId') ?? ''
      const admin = url.searchParams.get('admin') === '1'
      if (!(await deleteFeedPost(id, actorId || undefined, admin))) {
        sendJson(res, 404, { error: 'Post not found' })
        return true
      }
      sendJson(res, 200, { ok: true })
      return true
    }
    sendJson(res, 405, { error: 'Use GET, POST, or DELETE' })
    return true
  }
  if (path === '/api/research') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readResearchFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeResearchFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/social') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readSocialFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeSocialFile(JSON.parse(body)))
      return true
    }
    if (req.method === 'POST') {
      try {
        const raw = await readRequestBody(req)
        const body = raw ? (JSON.parse(raw) as { followerId?: string; followingId?: string }) : {}
        sendJson(
          res,
          200,
          await toggleFollowOnDisk(body.followerId ?? '', body.followingId ?? ''),
        )
      } catch (err) {
        sendJson(res, 400, {
          error: err instanceof Error ? err.message : 'Could not update that follow.',
        })
      }
      return true
    }
    sendJson(res, 405, { error: 'Use GET, PUT, or POST' })
    return true
  }
  if (path === '/api/discuss') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readDiscussFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeDiscussFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/feed-file') {
    const id = url.searchParams.get('id') ?? ''
    const found = await findFeedPost(id)
    const { athletes } = await rosterAthleteById('')
    if (!found || !(await viewerMaySeeFeedPost(viewer, found, athletes))) {
      sendJson(res, 404, { error: 'Post video not found' })
      return true
    }
    if (!(await sendFeedFile(id, res))) {
      sendJson(res, 404, { error: 'Post video not found' })
    }
    return true
  }
  if (path === '/api/notices') {
    if (req.method === 'GET') {
      sendJson(res, 200, { kind: 'shape-lab-notices', notices: await noticesForClient() })
      return true
    }
    if (req.method === 'POST') {
      const body = JSON.parse(await readRequestBody(req))
      const saved = await addNotice(body)
      if (!saved) {
        sendJson(res, 400, { error: 'Could not save that reminder.' })
        return true
      }
      sendJson(res, 200, saved)
      return true
    }
    if (req.method === 'PUT') {
      const body = JSON.parse(await readRequestBody(req)) as { ids?: string[] }
      sendJson(res, 200, { notices: await markNoticesRead(body.ids) })
      return true
    }
    sendJson(res, 405, { error: 'Use GET, POST, or PUT' })
    return true
  }
  if (path === '/api/library') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readLibraryFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      const saved = await writeLibraryFile(JSON.parse(body))
      sendJson(res, 200, saved)
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/lessons') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readLessonsFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeLessonsFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/coach-classes') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readCoachClassesFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeCoachClassesFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/skill-paths') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readSkillPathsFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeSkillPathsFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/improve-notes') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readImproveNotesFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeImproveNotesFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/training-events') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readTrainingEventsFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeTrainingEventsFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/chalkboards') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readChalkboardsFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeChalkboardsFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/coach-content') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readCoachContentFile())
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeCoachContentFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/coach-media') {
    if (req.method === 'POST') {
      const id = url.searchParams.get('id') ?? ''
      const ownerId = url.searchParams.get('ownerId') ?? ''
      const name = url.searchParams.get('name') ?? 'Media'
      const mime = url.searchParams.get('mime') ?? req.headers['content-type'] ?? ''
      try {
        const buf = await readCoachMediaBuffer(req)
        const saved = await addCoachMedia({ id, ownerId, name, mime, buf })
        if (!saved) {
          sendJson(res, 400, { error: 'Could not save that file.' })
          return true
        }
        sendJson(res, 200, saved)
      } catch (err) {
        sendJson(res, 400, { error: err instanceof Error ? err.message : 'Upload failed.' })
      }
      return true
    }
    sendJson(res, 405, { error: 'Use POST' })
    return true
  }
  if (path === '/api/coach-media-file') {
    const id = url.searchParams.get('id') ?? ''
    if (!(await sendCoachMediaFile(id, res))) {
      sendJson(res, 404, { error: 'File not found' })
    }
    return true
  }
  if (path === '/api/stories') {
    if (req.method === 'GET') {
      const { athletes } = await rosterAthleteById('')
      sendJson(res, 200, await storiesForClient(viewer, athletes))
      return true
    }
    if (req.method === 'POST') {
      const kind = url.searchParams.get('kind') ?? ''
      if (kind === 'highlight') {
        try {
          const raw = await readRequestBody(req)
          const body = raw ? (JSON.parse(raw) as { id?: string; ownerId?: string; title?: string; storyIds?: string[] }) : {}
          const saved = await addHighlight({
            id: body.id ?? '',
            ownerId: body.ownerId ?? '',
            title: body.title ?? '',
            storyIds: Array.isArray(body.storyIds) ? body.storyIds : [],
          })
          if (!saved) {
            sendJson(res, 400, { error: 'Pick a story and a highlight name.' })
            return true
          }
          sendJson(res, 200, saved)
        } catch {
          sendJson(res, 400, { error: 'Could not save that highlight.' })
        }
        return true
      }
      try {
        const buf = await readStoryRequestBuffer(req)
        const saved = await addStoryFromBody({
          id: url.searchParams.get('id') ?? '',
          authorId: url.searchParams.get('authorId') ?? '',
          caption: url.searchParams.get('caption') ?? '',
          mime: url.searchParams.get('mime') || req.headers['content-type'] || 'video/webm',
          taggedIds: (url.searchParams.get('tagged') ?? '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
          buf,
        })
        if (!saved) {
          sendJson(res, 400, { error: 'Could not post that story.' })
          return true
        }
        sendJson(res, 200, saved)
      } catch (err) {
        sendJson(res, 400, { error: err instanceof Error ? err.message : 'Could not post that story.' })
      }
      return true
    }
    sendJson(res, 405, { error: 'Use GET or POST' })
    return true
  }
  if (path === '/api/story-file') {
    const id = url.searchParams.get('id') ?? ''
    const found = await findStory(id)
    const { athletes } = await rosterAthleteById('')
    if (!found || !(await viewerMaySeeStory(viewer, found, athletes))) {
      sendJson(res, 404, { error: 'Story not found' })
      return true
    }
    if (!(await sendStoryFile(id, res))) {
      sendJson(res, 404, { error: 'Story not found' })
    }
    return true
  }
  if (path === '/api/coach-library') {
    const athleteId = url.searchParams.get('athleteId') ?? ''
    if (!athleteId) {
      sendJson(res, 400, { error: 'Missing athleteId' })
      return true
    }
    if (req.method === 'GET') {
      sendJson(res, 200, await readCoachLibrary(athleteId))
      return true
    }
    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeCoachLibrary(athleteId, JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/ig-resolve') {
    const page = url.searchParams.get('url') ?? ''
    if (!isResolvableVideoUrl(page)) {
      sendJson(res, 400, {
        error: 'Paste a public Instagram, TikTok, or Facebook video URL.',
      })
      return true
    }
    if (url.searchParams.get('meta') === '1') {
      const postedBy = await lookupPostedBy(page)
      sendJson(res, 200, postedBy ? { postedBy } : {})
      return true
    }
    if (url.searchParams.get('fresh') === '1' || url.searchParams.get('retry') === '1') {
      forgetResolvedSocial(page)
    }
    const resolved = await resolveSocialSlides(page)
    if (!resolved) {
      sendJson(res, 422, {
        error:
          'Could not get a playable file for that video yet. Shape Lab will keep a copy once it loads.',
      })
      return true
    }
    const postedBy = resolved.postedBy ?? postedByFromUrl(page)
    const slides = await Promise.all(
      resolved.slides.map(async (slide) => ({
        url: await publicOrProxyIgUrl(slide.url, page),
        kind: slide.kind,
      })),
    )
    sendJson(res, 200, {
      videoUrl: slides.find((s) => s.kind === 'video')?.url ?? slides[0]?.url,
      slides,
      ...(postedBy ? { postedBy } : {}),
    })
    const firstVideo = resolved.slides.find((s) => s.kind === 'video') ?? resolved.slides[0]
    if (firstVideo?.url && persistMode() === 'blob') {
      void cacheResolvedIgMedia(firstVideo.url, page)
    }
    return true
  }
  const src = url.searchParams.get('src') ?? ''
  if (!src) {
    sendJson(res, 400, { error: 'Missing src' })
    return true
  }
  await proxyInstagramMedia(src, req, res)
  return true
}
