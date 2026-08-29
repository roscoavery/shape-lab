import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleShapeLabApi } from './apiHandler.ts'
import { sendJson } from './instagramResolve.ts'

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (await handleShapeLabApi(req, res)) return
    sendJson(res, 404, { error: 'Not found' })
  } catch (err) {
    if (res.headersSent) return
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'API failed',
    })
  }
}
