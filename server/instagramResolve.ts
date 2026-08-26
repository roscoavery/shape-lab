/**
 * Resolve a public Instagram reel/post URL to a playable mp4.
 * Used by the Vite dev/preview server so Compare can loop the clip in-app.
 *
 * Tries (in order): public Cobalt instances, then local yt-dlp if installed.
 */

import { spawn } from 'node:child_process'
import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

/** Community Cobalt APIs that currently accept unauthenticated Instagram requests. */
const COBALT_APIS = ['https://cobaltapi.cjs.nz/']

const cache = new Map<string, { url: string; at: number }>()
const CACHE_MS = 25 * 60 * 1000

export function parseInstagramUrl(
  url: string,
): { type: string; code: string } | null {
  const m = url.match(
    /instagr(?:am\.com|\.am)\/(?:share\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
  )
  if (!m) return null
  const type = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase()
  return { type, code: m[2] }
}

export function isInstagramUrl(url: string): boolean {
  try {
    return /(^|\.)instagram\.com$|(^|\.)instagr\.am$/i.test(new URL(url).hostname)
  } catch {
    return false
  }
}

function canonicalIgUrl(url: string): string {
  const parsed = parseInstagramUrl(url)
  if (!parsed) return url
  const path = parsed.type === 'tv' ? 'tv' : parsed.type === 'p' ? 'p' : 'reel'
  return `https://www.instagram.com/${path}/${parsed.code}/`
}

async function cobaltResolve(igUrl: string): Promise<string | null> {
  for (const origin of COBALT_APIS) {
    try {
      const res = await fetch(origin, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': UA,
        },
        body: JSON.stringify({
          url: igUrl,
          videoQuality: '720',
          disableMetadata: true,
        }),
        signal: AbortSignal.timeout(20_000),
      })
      const data = (await res.json()) as {
        status?: string
        url?: string
        picker?: Array<{ type?: string; url?: string }>
      }
      if (
        (data.status === 'redirect' || data.status === 'tunnel') &&
        typeof data.url === 'string' &&
        data.url.startsWith('http')
      ) {
        return data.url
      }
      const pick = data.picker?.find((p) => p.type === 'video' && p.url)
      if (pick?.url) return pick.url
    } catch {
      // try next instance
    }
  }
  return null
}

function spawnResolve(cmd: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    const kill = setTimeout(() => {
      child.kill('SIGKILL')
      resolve(null)
    }, 25_000)
    child.stdout.on('data', (d: Buffer) => {
      out += d.toString('utf8')
    })
    child.on('error', () => {
      clearTimeout(kill)
      resolve(null)
    })
    child.on('close', (code) => {
      clearTimeout(kill)
      const line = out
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => /^https?:\/\//.test(l))
      resolve(code === 0 && line ? line : null)
    })
  })
}

async function ytdlpResolve(igUrl: string): Promise<string | null> {
  const args = ['-f', 'b', '-g', '--no-warnings', '--no-playlist', igUrl]
  return (
    (await spawnResolve('yt-dlp', args)) ??
    (await spawnResolve('python3', ['-m', 'yt_dlp', ...args]))
  )
}

export async function resolveInstagramVideo(rawUrl: string): Promise<string | null> {
  const igUrl = canonicalIgUrl(rawUrl)
  const hit = cache.get(igUrl)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.url
  const direct = (await cobaltResolve(igUrl)) ?? (await ytdlpResolve(igUrl))
  if (!direct) return null
  cache.set(igUrl, { url: direct, at: Date.now() })
  return direct
}

function mediaHostAllowed(src: string): boolean {
  try {
    const host = new URL(src).hostname
    return (
      /(^|\.)cdninstagram\.com$/i.test(host) ||
      /(^|\.)fbcdn\.net$/i.test(host) ||
      /(^|\.)instagram\.com$/i.test(host) ||
      /(^|\.)cjs\.nz$/i.test(host)
    )
  } catch {
    return false
  }
}

export async function proxyInstagramMedia(
  src: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!mediaHostAllowed(src)) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'That media host is not allowed.' }))
    return
  }
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Referer: 'https://www.instagram.com/',
  }
  if (typeof req.headers.range === 'string') headers.Range = req.headers.range
  const upstream = await fetch(src, { headers, redirect: 'follow' })
  res.statusCode = upstream.status
  const type = upstream.headers.get('content-type')
  if (type) res.setHeader('Content-Type', type)
  else res.setHeader('Content-Type', 'video/mp4')
  const len = upstream.headers.get('content-length')
  if (len) res.setHeader('Content-Length', len)
  const cr = upstream.headers.get('content-range')
  if (cr) res.setHeader('Content-Range', cr)
  res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes')
  res.setHeader('Cache-Control', 'private, max-age=1200')
  if (!upstream.body) {
    res.end()
    return
  }
  Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream).pipe(res)
}

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}
