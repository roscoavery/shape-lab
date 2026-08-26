import type { Plugin, ViteDevServer } from 'vite'
import {
  isInstagramUrl,
  proxyInstagramMedia,
  resolveInstagramVideo,
  sendJson,
} from './instagramResolve.ts'

function attach(server: { middlewares: ViteDevServer['middlewares'] }) {
  server.middlewares.use(async (req, res, next) => {
    const raw = req.url ?? ''
    const path = raw.split('?')[0]
    if (path !== '/api/ig-resolve' && path !== '/api/ig-media') {
      next()
      return
    }
    try {
      const url = new URL(raw, 'http://127.0.0.1')
      if (path === '/api/ig-resolve') {
        const ig = url.searchParams.get('url') ?? ''
        if (!isInstagramUrl(ig)) {
          sendJson(res, 400, {
            error: 'Paste a full Instagram post or reel URL.',
          })
          return
        }
        const direct = await resolveInstagramVideo(ig)
        if (!direct) {
          sendJson(res, 422, {
            error:
              'Could not get a playable file for that reel. It may be private, deleted, or blocked in this region.',
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
        error: err instanceof Error ? err.message : 'Instagram resolve failed',
      })
    }
  })
}

/** Local helper so Compare can play & loop public Instagram reels. */
export function instagramResolvePlugin(): Plugin {
  return {
    name: 'shape-lab-ig-resolve',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}
