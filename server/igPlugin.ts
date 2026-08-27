import type { Plugin, ViteDevServer } from 'vite'
import {
  isResolvableVideoUrl,
  proxyInstagramMedia,
  resolveSocialVideo,
  sendJson,
} from './instagramResolve.ts'
import { readLibraryFile, readRequestBody, writeLibraryFile } from './libraryStore.ts'

function attach(server: { middlewares: ViteDevServer['middlewares'] }) {
  server.middlewares.use(async (req, res, next) => {
    const raw = req.url ?? ''
    const path = raw.split('?')[0]
    if (
      path !== '/api/ig-resolve' &&
      path !== '/api/ig-media' &&
      path !== '/api/library'
    ) {
      next()
      return
    }
    try {
      const url = new URL(raw, 'http://127.0.0.1')
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
