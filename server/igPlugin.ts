import type { Plugin, ViteDevServer } from 'vite'
import { sendJson } from './instagramResolve.ts'
import { handleShapeLabApi } from './apiHandler.ts'

function attach(server: { middlewares: ViteDevServer['middlewares'] }) {
  server.middlewares.use(async (req, res, next) => {
    try {
      if (await handleShapeLabApi(req, res)) return
      next()
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
