/**
 * Shared gym API used by Vite middleware (local) and the Vercel function.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  isResolvableVideoUrl,
  proxyInstagramMedia,
  lookupPostedBy,
  resolveSocialSlides,
  sendJson,
} from './instagramResolve.ts'
import { postedByFromUrl } from '../src/lib/socialUrls.ts'
import { readLibraryFile, readRequestBody, writeLibraryFile } from './libraryStore.ts'
import { readCoachLibrary, writeCoachLibrary } from './coachLibraryStore.ts'
import { readRosterFile, writeRosterFile } from './rosterStore.ts'
import {
  readRosterPhoto,
  readRosterPhotosFile,
  sendRosterPhotoFile,
  writeRosterPhotoBytes,
  writeRosterPhotosFile,
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
  postsForClient,
  sendFeedFile,
  toggleFeedHi5,
  toggleFeedLike,
  toggleFeedRepost,
} from './feedStore.ts'
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
  deleteAthleteVideo,
  readRequestBuffer,
  sendAthleteVideoFile,
  videosForClient,
} from './athleteVideoDisk.ts'
import { readLessonsFile, writeLessonsFile } from './lessonStore.ts'
import { readCoachContentFile, writeCoachContentFile } from './coachContentStore.ts'
import { addCoachMedia, readCoachMediaBuffer, sendCoachMediaFile } from './coachMediaDisk.ts'
import { persistMode, readRevision } from './persist.ts'
import { sendContactsPage } from './contactsPage.ts'
import { readCoachClassesFile, writeCoachClassesFile } from './coachClassStore.ts'
import { readTrainingEventsFile, writeTrainingEventsFile } from './trainingEventStore.ts'
import { addNotice, markNoticesRead, noticesForClient } from './notifyStore.ts'
import { readChalkboardsFile, writeChalkboardsFile } from './chalkboardStore.ts'
import {
  addHighlight,
  addStoryFromBody,
  readStoryRequestBuffer,
  sendStoryFile,
  storiesForClient,
} from './storyStore.ts'

const API_PATHS = new Set([
  '/api/ig-resolve',
  '/api/ig-media',
  '/api/library',
  '/api/roster',
  '/api/roster-photos',
  '/api/roster-photo-file',
  '/api/revision',
  '/api/media-token',
  '/api/contacts',
  '/api/contacts.csv',
  '/api/persist',
  '/api/ig-stills',
  '/api/ig-still-file',
  '/api/shape-copy',
  '/api/learn-notes',
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

/** Returns true when this request is a Shape Lab API call (response already written). */
export async function handleShapeLabApi(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = requestUrl(req)
  const path = apiPath(url.pathname)
  if (!API_PATHS.has(path)) return false

  if (path === '/api/ig-stills') {
    if (req.method === 'GET') {
      sendJson(res, 200, { kind: 'shape-lab-ig-stills', stills: await stillsForClient() })
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
      revision: await readRevision(),
    })
    return true
  }
  if (path === '/api/revision') {
    sendJson(res, 200, await readRevision())
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
      !(pathname.startsWith('data/feed-blobs/') || pathname.startsWith('data/roster-photos/'))
    ) {
      sendJson(res, 400, { error: 'That upload path is not allowed.' })
      return true
    }
    try {
      const { generateClientTokenFromReadWriteToken } = await import('@vercel/blob/client')
      const token = await generateClientTokenFromReadWriteToken({
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
      })
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
    await sendContactsPage(req, res, path.endsWith('.csv') ? 'csv' : 'html')
    return true
  }
  if (path === '/api/roster-photo-file') {
    const photoId = url.searchParams.get('id') ?? ''
    if (!(await sendRosterPhotoFile(photoId, res))) {
      sendJson(res, 404, { error: 'Photo not found' })
    }
    return true
  }
  if (path === '/api/roster-photos') {
    const photoId = url.searchParams.get('id') ?? ''
    if (req.method === 'GET') {
      if (photoId) {
        sendJson(res, 200, {
          kind: 'shape-lab-roster-photo',
          id: photoId,
          photo: (await readRosterPhoto(photoId)) ?? '',
        })
        return true
      }
      sendJson(res, 200, await readRosterPhotosFile())
      return true
    }
    if (req.method === 'PUT') {
      const ct = String(req.headers['content-type'] || '').toLowerCase()
      if (photoId && (ct.startsWith('image/') || ct === 'application/octet-stream')) {
        const buf = await readRequestBuffer(req, 8 * 1024 * 1024)
        const saved = await writeRosterPhotoBytes(photoId, buf, ct.startsWith('image/') ? ct : 'image/jpeg')
        if (!saved) {
          sendJson(res, 400, { error: 'Could not save that photo.' })
          return true
        }
        sendJson(res, 200, { kind: 'shape-lab-roster-photo', id: photoId, ...saved })
        return true
      }
      const body = await readRequestBody(req)
      sendJson(res, 200, await writeRosterPhotosFile(JSON.parse(body)))
      return true
    }
    sendJson(res, 405, { error: 'Use GET or PUT' })
    return true
  }
  if (path === '/api/roster') {
    if (req.method === 'GET') {
      sendJson(res, 200, await readRosterFile())
      return true
    }
    if (req.method === 'PUT') {
      try {
        const body = await readRequestBody(req)
        const saved = await writeRosterFile(JSON.parse(body))
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
      const videos = (await videosForClient(athleteId || undefined, classId || undefined)).map((v) => ({
        ...v,
        url: `/api/athlete-video-file?id=${encodeURIComponent(v.id)}`,
      }))
      sendJson(res, 200, { kind: 'shape-lab-athlete-videos', videos })
      return true
    }
    if (req.method === 'POST') {
      const buf = await readRequestBuffer(req)
      const saved = await addAthleteVideoFromBody({
        id: url.searchParams.get('id') ?? '',
        athleteId: url.searchParams.get('athleteId') ?? '',
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
        url: `/api/athlete-video-file?id=${encodeURIComponent(saved.id)}`,
      })
      return true
    }
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id') ?? ''
      const athleteId = url.searchParams.get('athleteId') ?? ''
      if (!(await deleteAthleteVideo(id, athleteId || undefined))) {
        sendJson(res, 404, { error: 'Video not found' })
        return true
      }
      sendJson(res, 200, { ok: true })
      return true
    }
    sendJson(res, 405, { error: 'Use GET, POST, or DELETE' })
    return true
  }
  if (path === '/api/athlete-video-file') {
    const id = url.searchParams.get('id') ?? ''
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
      sendJson(res, 200, { kind: 'shape-lab-feed', posts: await postsForClient() })
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
        url.searchParams.get('kind') === 'repost'
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
        if (kind === 'like' || kind === 'hi5' || kind === 'repost') {
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
          sendJson(res, 200, {
            ...saved,
            url: saved.file ? `/api/feed-file?id=${encodeURIComponent(saved.id)}` : '',
          })
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
          sendJson(res, 200, { ...saved, url: saved.publicUrl || '' })
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
      sendJson(res, 200, {
        ...saved,
        url: `/api/feed-file?id=${encodeURIComponent(saved.id)}`,
      })
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
      sendJson(res, 200, await storiesForClient())
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
    const resolved = await resolveSocialSlides(page)
    if (!resolved) {
      sendJson(res, 422, {
        error:
          'Could not get a playable file for that video. It may be private, deleted, or blocked in this region.',
      })
      return true
    }
    const postedBy = resolved.postedBy ?? postedByFromUrl(page)
    sendJson(res, 200, {
      videoUrl: `/api/ig-media?src=${encodeURIComponent(resolved.url)}`,
      slides: resolved.slides.map((slide) => ({
        url: `/api/ig-media?src=${encodeURIComponent(slide.url)}`,
        kind: slide.kind,
      })),
      ...(postedBy ? { postedBy } : {}),
    })
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
