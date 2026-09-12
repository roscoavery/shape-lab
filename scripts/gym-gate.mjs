#!/usr/bin/env node
/**
 * Public home-gym port. /api is answered here (disk). Pages come from the
 * production `dist/` build (few hashed files, like Vercel) unless GYM_DEV=1,
 * in which case they are proxied to Vite on 127.0.0.1.
 *
 * cloudflared may speak HTTP/1.1 or HTTP/2 and may send an absolute URL
 * (https://gym.shapelab.win/…). A plain Node HTTP/1 server RSTs those.
 */

import { execSync } from 'node:child_process'
import http from 'node:http'
import http2 from 'node:http2'
import net from 'node:net'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const PUBLIC_PORT = Number(process.env.SHAPE_LAB_PORT || 43127)
const VITE_PORT = Number(process.env.SHAPE_LAB_VITE_PORT || 43128)
const WANT_VITE = /^(1|true|yes)$/i.test(String(process.env.GYM_DEV || ''))
const HOLD_BUILD = 'gold'

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

const GIT_SHA = gitSha()

function distReady() {
  return existsSync(join(DIST, 'index.html'))
}

function requestUrl(req) {
  let raw = String(req.url || req.headers?.[':path'] || '/')
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw)
      raw = `${u.pathname}${u.search}`
    } catch {
      /* keep raw */
    }
  }
  return raw || '/'
}

const { handleShapeLabApi } = await import(
  pathToFileURL(resolve(ROOT, 'server/apiHandler.ts')).href
)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
}

function rewriteHeaders(headers) {
  const next = { ...headers }
  next.host = `127.0.0.1:${VITE_PORT}`
  delete next['accept-encoding']
  delete next.connection
  delete next[':method']
  delete next[':path']
  delete next[':scheme']
  delete next[':authority']
  return next
}

function proxyVite(req, res) {
  req.on('error', () => {
    /* client hung up */
  })
  res.on('error', () => {
    /* client hung up */
  })
  const p = http.request(
    {
      hostname: '127.0.0.1',
      port: VITE_PORT,
      path: requestUrl(req),
      method: req.method,
      headers: rewriteHeaders(req.headers),
    },
    (incoming) => {
      incoming.on('error', () => {
        if (!res.headersSent) res.writeHead(502)
        res.end()
      })
      res.writeHead(incoming.statusCode ?? 502, incoming.headers)
      incoming.pipe(res)
    },
  )
  p.on('error', () => {
    if (res.headersSent) {
      res.end()
      return
    }
    res.statusCode = 503
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Shape Lab is starting on the Mac. Refresh in a few seconds.')
  })
  req.pipe(p)
}

function sendFile(res, file) {
  let st
  try {
    st = statSync(file)
  } catch {
    return false
  }
  if (!st.isFile()) return false
  const ext = extname(file).toLowerCase()
  const hashedAsset = file.includes(`${sep}assets${sep}`)
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': st.size,
    'Cache-Control': hashedAsset
      ? 'public, max-age=31536000, immutable'
      : ext === '.html'
        ? 'no-store'
        : 'public, max-age=3600',
  }
  res.writeHead(200, headers)
  createReadStream(file).on('error', () => res.end()).pipe(res)
  return true
}

function safeDistFile(pathname) {
  const rel = pathname.replace(/^\/+/, '')
  const file = resolve(DIST, rel)
  const root = DIST.endsWith(sep) ? DIST : DIST + sep
  if (file !== DIST && !file.startsWith(root)) return null
  return file
}

function serveBoot(res) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(
    '<!doctype html><meta charset="utf-8"><title>Shape Lab</title><body style="font-family:system-ui;background:#111;color:#eee;padding:2rem"><div style="background:#ff4d9a;color:#3b071c;font-weight:900;padding:12px 16px;border-radius:12px;text-align:center">PINK BUILD — gym is still starting. Refresh in a few seconds.</div>',
  )
}

function servePages(req, res) {
  if (distReady()) {
    serveStatic(req, res)
    return
  }
  if (WANT_VITE) {
    proxyVite(req, res)
    return
  }
  serveBoot(res)
}

function serveStatic(req, res) {
  const raw = requestUrl(req).split('?')[0]
  let pathname = '/'
  try {
    pathname = decodeURIComponent(raw)
  } catch {
    pathname = raw
  }
  if (pathname.includes('\0') || pathname.includes('..')) {
    res.statusCode = 400
    res.end()
    return
  }
  if (pathname === '/') pathname = '/index.html'
  const file = safeDistFile(normalize(pathname))
  if (file && sendFile(res, file)) return
  const hasExt = /\.[a-zA-Z0-9]+$/.test(pathname)
  if (hasExt) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('Not found')
    return
  }
  sendFile(res, join(DIST, 'index.html'))
}

function onRequest(req, res) {
  req.on('error', () => {
    /* cloudflared hung up */
  })
  res.on('error', () => {
    /* cloudflared hung up */
  })
  try {
    const url = requestUrl(req)
    req.url = url
    if (url === '/api/health' || url.startsWith('/api/health?')) {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(
        JSON.stringify({
          ok: true,
          static: distReady(),
          port: PUBLIC_PORT,
          sha: GIT_SHA,
          holdBuild: HOLD_BUILD,
        }),
      )
      return
    }
    if (url.startsWith('/api/') || url === '/api') {
      void handleShapeLabApi(req, res)
        .then((hit) => {
          if (hit || res.headersSent) return
          servePages(req, res)
        })
        .catch((err) => {
          if (res.headersSent) return
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'API failed' }))
        })
      return
    }
    servePages(req, res)
  } catch (err) {
    if (res.headersSent) {
      res.end()
      return
    }
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(err instanceof Error ? err.message : 'Gym gate failed')
  }
}

const http1 = http.createServer(
  {
    insecureHTTPParser: true,
    keepAlive: true,
    joinDuplicateHeaders: true,
  },
  onRequest,
)
const http2Server = http2.createServer({ settings: { maxConcurrentStreams: 200 } }, onRequest)

let first = true
function logFirst(req) {
  if (!first) return
  first = false
  console.log(
    `Gym gate first request: HTTP/${req.httpVersion || '?'} ${req.method} ${requestUrl(req)} host=${req.headers.host || req.headers[':authority'] || ''}`,
  )
}
http1.on('request', logFirst)
http2Server.on('request', logFirst)

http1.on('upgrade', (req, socket, head) => {
  socket.on('error', () => {
    /* ignore */
  })
  if (distReady() && !WANT_VITE) {
    socket.end()
    return
  }
  const p = net.connect(VITE_PORT, '127.0.0.1', () => {
    let preamble = `${req.method} ${requestUrl(req)} HTTP/1.1\r\n`
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
  p.on('error', () => socket.end())
})

http1.on('clientError', (_err, socket) => {
  if (!socket.writable || socket.destroyed) return
  socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
})

http2Server.on('sessionError', () => {
  /* HTTP/2 session closed by cloudflared */
})

for (const s of [http1, http2Server]) {
  s.keepAliveTimeout = 90_000
  s.headersTimeout = 95_000
  s.requestTimeout = 0
  s.timeout = 0
}

const server = net.createServer((socket) => {
  socket.on('error', () => {
    /* cloudflared or a phone hung up */
  })
  socket.once('data', (chunk) => {
    socket.unshift(chunk)
    const preface = chunk.subarray(0, Math.min(3, chunk.length)).toString('latin1')
    if (preface === 'PRI') http2Server.emit('connection', socket)
    else http1.emit('connection', socket)
  })
})

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PUBLIC_PORT} is already in use.`)
    console.error('Another gym window is probably still open. Ctrl+C there, then start again.')
    console.error(`Or: lsof -nP -iTCP:${PUBLIC_PORT} -sTCP:LISTEN`)
    process.exit(1)
  }
  console.error(`Gym gate: ${err.message}`)
})

server.listen(PUBLIC_PORT, '0.0.0.0', () => {
  const stamp = `holdBuild=${HOLD_BUILD} sha=${GIT_SHA ?? '?'}`
  if (distReady()) {
    console.log(`Gym gate on http://127.0.0.1:${PUBLIC_PORT}  (API + production build)  ${stamp}`)
  } else if (WANT_VITE) {
    console.log(`Gym gate on http://127.0.0.1:${PUBLIC_PORT}  (API here, pages via Vite :${VITE_PORT})  ${stamp}`)
  } else {
    console.log(`Gym gate on http://127.0.0.1:${PUBLIC_PORT}  (API up; app build still running)  ${stamp}`)
  }
})
