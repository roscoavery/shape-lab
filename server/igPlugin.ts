import type { Plugin, ViteDevServer } from 'vite'
import {
  isResolvableVideoUrl,
  proxyInstagramMedia,
  resolveSocialVideo,
  sendJson,
} from './instagramResolve.ts'
import { readLibraryFile, readRequestBody, writeLibraryFile } from './libraryStore.ts'
import { readCoachLibrary, writeCoachLibrary } from './coachLibraryStore.ts'
import { readRosterFile, writeRosterFile } from './rosterStore.ts'
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
  addTextFeedPost,
  deleteFeedPost,
  postsForClient,
  sendFeedFile,
} from './feedStore.ts'
import { readResearchFile, writeResearchFile } from './researchStore.ts'
import { readSocialFile, writeSocialFile } from './socialStore.ts'
import { readDiscussFile, writeDiscussFile } from './discussStore.ts'
import {
  addIgStillFromBody,
  deleteIgStill,
  readRequestBodyLimited,
  sendIgStillFile,
  stillsForClient,
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

function attach(server: { middlewares: ViteDevServer['middlewares'] }) {
  server.middlewares.use(async (req, res, next) => {
    const raw = req.url ?? ''
    const path = raw.split('?')[0]
    if (
      path !== '/api/ig-resolve' &&
      path !== '/api/ig-media' &&
      path !== '/api/library' &&
      path !== '/api/roster' &&
      path !== '/api/ig-stills' &&
      path !== '/api/ig-still-file' &&
      path !== '/api/shape-copy' &&
      path !== '/api/still-crops' &&
      path !== '/api/athlete-videos' &&
      path !== '/api/athlete-video-file' &&
      path !== '/api/clip-loops' &&
      path !== '/api/favorites' &&
      path !== '/api/collages' &&
      path !== '/api/feed' &&
      path !== '/api/feed-file' &&
      path !== '/api/research' &&
      path !== '/api/social' &&
      path !== '/api/discuss' &&
      path !== '/api/coach-library'
    ) {
      next()
      return
    }
    try {
      const url = new URL(raw, 'http://127.0.0.1')
      if (path === '/api/ig-stills') {
        if (req.method === 'GET') {
          sendJson(res, 200, { kind: 'shape-lab-ig-stills', stills: stillsForClient() })
          return
        }
        if (req.method === 'POST') {
          const body = await readRequestBodyLimited(req)
          const saved = addIgStillFromBody(JSON.parse(body))
          sendJson(res, 200, saved)
          return
        }
        if (req.method === 'DELETE') {
          const id = url.searchParams.get('id') ?? ''
          if (!deleteIgStill(id)) {
            sendJson(res, 404, { error: 'Still not found' })
            return
          }
          sendJson(res, 200, { ok: true })
          return
        }
        sendJson(res, 405, { error: 'Use GET, POST, or DELETE' })
        return
      }
      if (path === '/api/ig-still-file') {
        const id = url.searchParams.get('id') ?? ''
        if (!sendIgStillFile(id, res)) {
          sendJson(res, 404, { error: 'Still file not found' })
        }
        return
      }
      if (path === '/api/roster') {
        if (req.method === 'GET') {
          sendJson(res, 200, readRosterFile())
          return
        }
        if (req.method === 'PUT') {
          const body = await readRequestBody(req)
          const saved = writeRosterFile(JSON.parse(body))
          sendJson(res, 200, saved)
          return
        }
        sendJson(res, 405, { error: 'Use GET or PUT' })
        return
      }
      if (path === '/api/shape-copy') {
        if (req.method === 'GET') {
          sendJson(res, 200, readShapeCopyFile())
          return
        }
        if (req.method === 'PUT') {
          const body = await readRequestBody(req)
          const saved = writeShapeCopyFile(JSON.parse(body))
          sendJson(res, 200, saved)
          return
        }
        sendJson(res, 405, { error: 'Use GET or PUT' })
        return
      }
      if (path === '/api/still-crops') {
        if (req.method === 'GET') {
          sendJson(res, 200, readStillCropFile())
          return
        }
        if (req.method === 'PUT') {
          const body = await readRequestBody(req)
          const saved = writeStillCropFile(JSON.parse(body))
          sendJson(res, 200, saved)
          return
        }
        sendJson(res, 405, { error: 'Use GET or PUT' })
        return
      }
      if (path === '/api/athlete-videos') {
        if (req.method === 'GET') {
          const athleteId = url.searchParams.get('athleteId') ?? ''
          const videos = videosForClient(athleteId || undefined).map((v) => ({
            ...v,
            url: `/api/athlete-video-file?id=${encodeURIComponent(v.id)}`,
          }))
          sendJson(res, 200, { kind: 'shape-lab-athlete-videos', videos })
          return
        }
        if (req.method === 'POST') {
          const buf = await readRequestBuffer(req)
          const saved = addAthleteVideoFromBody({
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
          })
          if (!saved) {
            sendJson(res, 400, { error: 'Could not save that video.' })
            return
          }
          sendJson(res, 200, {
            ...saved,
            url: `/api/athlete-video-file?id=${encodeURIComponent(saved.id)}`,
          })
          return
        }
        if (req.method === 'DELETE') {
          const id = url.searchParams.get('id') ?? ''
          const athleteId = url.searchParams.get('athleteId') ?? ''
          if (!deleteAthleteVideo(id, athleteId || undefined)) {
            sendJson(res, 404, { error: 'Video not found' })
            return
          }
          sendJson(res, 200, { ok: true })
          return
        }
        sendJson(res, 405, { error: 'Use GET, POST, or DELETE' })
        return
      }
      if (path === '/api/athlete-video-file') {
        const id = url.searchParams.get('id') ?? ''
        if (!sendAthleteVideoFile(id, res)) {
          sendJson(res, 404, { error: 'Video file not found' })
        }
        return
      }
      if (path === '/api/clip-loops') {
        if (req.method === 'GET') {
          sendJson(res, 200, readClipLoopsFile())
          return
        }
        if (req.method === 'PUT') {
          const body = await readRequestBody(req)
          sendJson(res, 200, writeClipLoopsFile(JSON.parse(body)))
          return
        }
        sendJson(res, 405, { error: 'Use GET or PUT' })
        return
      }
      if (path === '/api/favorites') {
        if (req.method === 'GET') {
          sendJson(res, 200, readFavoritesFile())
          return
        }
        if (req.method === 'PUT') {
          const body = await readRequestBody(req)
          sendJson(res, 200, writeFavoritesFile(JSON.parse(body)))
          return
        }
        sendJson(res, 405, { error: 'Use GET or PUT' })
        return
      }
      if (path === '/api/collages') {
        if (req.method === 'GET') {
          const ownerId = url.searchParams.get('ownerId')
          sendJson(res, 200, {
            ...readCollagesFile(),
            collages: collagesForOwner(ownerId),
          })
          return
        }
        if (req.method === 'PUT') {
          const body = await readRequestBody(req)
          sendJson(res, 200, writeCollagesFile(JSON.parse(body)))
          return
        }
        if (req.method === 'POST') {
          const body = await readRequestBody(req)
          sendJson(res, 200, upsertCollage(JSON.parse(body)))
          return
        }
        if (req.method === 'DELETE') {
          const id = url.searchParams.get('id') ?? ''
          if (!deleteCollage(id)) {
            sendJson(res, 404, { error: 'Collage not found' })
            return
          }
          sendJson(res, 200, { ok: true })
          return
        }
        sendJson(res, 405, { error: 'Use GET, PUT, POST, or DELETE' })
        return
      }
      if (path === '/api/feed') {
        if (req.method === 'GET') {
          sendJson(res, 200, { kind: 'shape-lab-feed', posts: postsForClient() })
          return
        }
        if (req.method === 'POST') {
          const ct = String(req.headers['content-type'] || '').toLowerCase()
          if (
            ct.includes('json') ||
            url.searchParams.get('kind') === 'collage' ||
            url.searchParams.get('kind') === 'text'
          ) {
            const body = JSON.parse(await readRequestBody(req)) as {
              kind?: string
              authorId?: string
              caption?: string
              taggedIds?: string[]
              createdAt?: string
              id?: string
              collage?: unknown
            }
            const taggedIds = Array.isArray(body.taggedIds)
              ? body.taggedIds
              : (url.searchParams.get('taggedIds') ?? '')
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
            const kind = body.kind ?? url.searchParams.get('kind') ?? ''
            if (kind === 'text') {
              const saved = addTextFeedPost({
                id: body.id ?? url.searchParams.get('id') ?? '',
                authorId: body.authorId ?? url.searchParams.get('authorId') ?? '',
                caption: body.caption ?? url.searchParams.get('caption') ?? '',
                taggedIds,
                createdAt: body.createdAt,
              })
              if (!saved) {
                sendJson(res, 400, { error: 'Write a caption to post without a video.' })
                return
              }
              sendJson(res, 200, { ...saved, url: '' })
              return
            }
            const saved = addCollageFeedPost({
              id: body.id ?? url.searchParams.get('id') ?? '',
              authorId: body.authorId ?? url.searchParams.get('authorId') ?? '',
              caption: body.caption ?? url.searchParams.get('caption') ?? '',
              taggedIds,
              createdAt: body.createdAt,
              collage: body.collage,
            })
            if (!saved) {
              sendJson(res, 400, { error: 'Could not share that collage.' })
              return
            }
            sendJson(res, 200, { ...saved, url: '' })
            return
          }
          const buf = await readRequestBuffer(req)
          const taggedRaw = url.searchParams.get('taggedIds') ?? ''
          const saved = addFeedPostFromBody({
            id: url.searchParams.get('id') ?? '',
            authorId: url.searchParams.get('authorId') ?? '',
            caption: url.searchParams.get('caption') ?? '',
            taggedIds: taggedRaw ? taggedRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
            createdAt: url.searchParams.get('createdAt') ?? undefined,
            mime: url.searchParams.get('mime') || req.headers['content-type'] || 'video/webm',
            buf,
          })
          if (!saved) {
            sendJson(res, 400, { error: 'Could not save that post.' })
            return
          }
          sendJson(res, 200, {
            ...saved,
            url: `/api/feed-file?id=${encodeURIComponent(saved.id)}`,
          })
          return
        }
        if (req.method === 'DELETE') {
          const id = url.searchParams.get('id') ?? ''
          const actorId = url.searchParams.get('actorId') ?? ''
          const admin = url.searchParams.get('admin') === '1'
          if (!deleteFeedPost(id, actorId || undefined, admin)) {
            sendJson(res, 404, { error: 'Post not found' })
            return
          }
          sendJson(res, 200, { ok: true })
          return
        }
        sendJson(res, 405, { error: 'Use GET, POST, or DELETE' })
        return
      }
      if (path === '/api/research') {
        if (req.method === 'GET') {
          sendJson(res, 200, readResearchFile())
          return
        }
        if (req.method === 'PUT') {
          const body = await readRequestBody(req)
          sendJson(res, 200, writeResearchFile(JSON.parse(body)))
          return
        }
        sendJson(res, 405, { error: 'Use GET or PUT' })
        return
      }
      if (path === '/api/social') {
        if (req.method === 'GET') {
          sendJson(res, 200, readSocialFile())
          return
        }
        if (req.method === 'PUT') {
          const body = await readRequestBody(req)
          sendJson(res, 200, writeSocialFile(JSON.parse(body)))
          return
        }
        sendJson(res, 405, { error: 'Use GET or PUT' })
        return
      }
      if (path === '/api/discuss') {
        if (req.method === 'GET') {
          sendJson(res, 200, readDiscussFile())
          return
        }
        if (req.method === 'PUT') {
          const body = await readRequestBody(req)
          sendJson(res, 200, writeDiscussFile(JSON.parse(body)))
          return
        }
        sendJson(res, 405, { error: 'Use GET or PUT' })
        return
      }
      if (path === '/api/feed-file') {
        const id = url.searchParams.get('id') ?? ''
        if (!sendFeedFile(id, res)) {
          sendJson(res, 404, { error: 'Post video not found' })
        }
        return
      }
      if (path === '/api/library') {
        if (req.method === 'GET') {
          sendJson(res, 200, readLibraryFile())
          return
        }
        if (req.method === 'PUT') {
          const body = await readRequestBody(req)
          const saved = writeLibraryFile(JSON.parse(body))
          sendJson(res, 200, saved)
          return
        }
        sendJson(res, 405, { error: 'Use GET or PUT' })
        return
      }
      if (path === '/api/coach-library') {
        const athleteId = url.searchParams.get('athleteId') ?? ''
        if (!athleteId) {
          sendJson(res, 400, { error: 'Missing athleteId' })
          return
        }
        if (req.method === 'GET') {
          sendJson(res, 200, readCoachLibrary(athleteId))
          return
        }
        if (req.method === 'PUT') {
          const body = await readRequestBody(req)
          sendJson(res, 200, writeCoachLibrary(athleteId, JSON.parse(body)))
          return
        }
        sendJson(res, 405, { error: 'Use GET or PUT' })
        return
      }
      if (path === '/api/ig-resolve') {
        const page = url.searchParams.get('url') ?? ''
        if (!isResolvableVideoUrl(page)) {
          sendJson(res, 400, {
            error: 'Paste a public Instagram, TikTok, or Facebook video URL.',
          })
          return
        }
        const direct = await resolveSocialVideo(page)
        if (!direct) {
          sendJson(res, 422, {
            error:
              'Could not get a playable file for that video. It may be private, deleted, or blocked in this region.',
          })
          return
        }
        sendJson(res, 200, {
          videoUrl: `/api/ig-media?src=${encodeURIComponent(direct)}`,
        })
        return
      }
      const src = url.searchParams.get('src') ?? ''
      if (!src) {
        sendJson(res, 400, { error: 'Missing src' })
        return
      }
      await proxyInstagramMedia(src, req, res)
    } catch (err) {
      if (res.headersSent) return
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : 'Video resolve failed',
      })
    }
  })
}

/** Local helper so Compare can play public Instagram, TikTok, and Facebook videos. */
export function instagramResolvePlugin(): Plugin {
  return {
    name: 'shape-lab-ig-resolve',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}
