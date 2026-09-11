#!/usr/bin/env node
/**
 * Public home-gym port. /api is answered here (disk), everything else
 * is proxied to the Vite process on 127.0.0.1 so LAN phones do not hang
 * in Vite middleware.
 */

import http from 'node:http'
import net from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_PORT = Number(process.env.SHAPE_LAB_PORT || 43127)
const VITE_PORT = Number(process.env.SHAPE_LAB_VITE_PORT || 43128)

const { handleShapeLabApi } = await import(
  pathToFileURL(resolve(ROOT, 'server/apiHandler.ts')).href
)

function rewriteHeaders(headers) {
  const next = { ...headers }
  next.host = `127.0.0.1:${VITE_PORT}`
  delete next['accept-encoding']
  return next
}

function proxyVite(req, res) {
  const p = http.request(
    {
      hostname: '127.0.0.1',
      port: VITE_PORT,
      path: req.url,
      method: req.method,
      headers: rewriteHeaders(req.headers),
    },
    (incoming) => {
      res.writeHead(incoming.statusCode ?? 502, incoming.headers)
      incoming.pipe(res)
    },
  )
  p.on('error', () => {
    if (res.headersSent) return
    res.statusCode = 503
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Shape Lab is starting on the Mac. Refresh in a few seconds.')
  })
  req.pipe(p)
}

const server = http.createServer((req, res) => {
  const url = req.url || '/'
  if (url.startsWith('/api/') || url === '/api') {
    void handleShapeLabApi(req, res)
      .then((hit) => {
        if (hit || res.headersSent) return
        proxyVite(req, res)
      })
      .catch((err) => {
        if (res.headersSent) return
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'API failed' }))
      })
    return
  }
  proxyVite(req, res)
})

server.on('upgrade', (req, socket, head) => {
  const p = net.connect(VITE_PORT, '127.0.0.1', () => {
    let preamble = `${req.method} ${req.url} HTTP/1.1\r\n`
    const headers = rewriteHeaders(req.headers)
    for (const [key, value] of Object.entries(headers)) {
      if (value == null) continue
      preamble += `${key}: ${Array.isArray(value) ? value.join(', ') : value}\r\n`
    }
    preamble += '\r\n'
    p.write(preamble)
    if (head?.length) p.write(head)
    p.pipe(socket)
    socket.pipe(p)
  })
  p.on('error', () => socket.destroy())
})

server.listen(PUBLIC_PORT, '0.0.0.0', () => {
  console.log(`Gym gate on http://127.0.0.1:${PUBLIC_PORT}  (API here, pages via Vite :${VITE_PORT})`)
})
