/**
 * Resolve a public Instagram / TikTok / Facebook video URL to a playable mp4.
 * Used by the Vite dev/preview server so Compare can loop the clip in-app.
 *
 * Tries (in order): public Cobalt instances, then local yt-dlp if installed.
 */

import { spawn } from 'node:child_process'
import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  canonicalSocialUrl,
  normalizeSocialHandle,
  postedByFromUrl,
  socialPlatform,
} from '../src/lib/socialUrls.ts'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

/** Community Cobalt APIs that currently accept unauthenticated requests. */
const COBALT_APIS = [
  'https://api.cobalt.tools/',
  'https://cobaltapi.cjs.nz/',
  'https://co.wuk.sh/',
  'https://cobalt-api.kwiatekmiki.com/',
]

const cache = new Map<string, { url: string; at: number }>()
const CACHE_MS = 25 * 60 * 1000

export function isResolvableVideoUrl(url: string): boolean {
  return socialPlatform(url) !== null
}

/** @deprecated use isResolvableVideoUrl */
export function isInstagramUrl(url: string): boolean {
  return socialPlatform(url) === 'instagram'
}

async function cobaltResolve(pageUrl: string): Promise<string | null> {
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
          url: pageUrl,
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

async function ytdlpResolve(pageUrl: string): Promise<string | null> {
  const args = ['-f', 'b', '-g', '--no-warnings', '--no-playlist', pageUrl]
  return (
    (await spawnResolve('yt-dlp', args)) ??
    (await spawnResolve('python3', ['-m', 'yt_dlp', ...args]))
  )
}

async function fetchText(url: string, ms = 6000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/json' },
      signal: AbortSignal.timeout(ms),
      redirect: 'follow',
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function oembedPostedBy(pageUrl: string): Promise<string | null> {
  const body = await fetchText(
    `https://www.instagram.com/oembed/?url=${encodeURIComponent(pageUrl)}&omitscript=true`,
    5000,
  )
  if (!body) return null
  try {
    const data = JSON.parse(body) as { author_url?: string; author_name?: string }
    const fromUrl = data.author_url?.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1]
    return normalizeSocialHandle(fromUrl ?? data.author_name ?? null)
  } catch {
    return null
  }
}

async function htmlPostedBy(pageUrl: string): Promise<string | null> {
  const html = await fetchText(pageUrl, 6000)
  if (!html) return null
  const owner = html.match(/"owner"\s*:\s*\{[^}]{0,240}"username"\s*:\s*"([A-Za-z0-9._]+)"/)
  if (owner) return normalizeSocialHandle(owner[1])
  const user = html.match(/"username"\s*:\s*"([A-Za-z0-9._]+)"/)
  if (user) return normalizeSocialHandle(user[1])
  const og = html.match(/content="(?:Watch )?@?([A-Za-z0-9._]+) on Instagram/i)
  if (og) return normalizeSocialHandle(og[1])
  const tt = html.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i)
  if (tt) return normalizeSocialHandle(tt[1])
  return null
}

/** Who originally posted the public clip — from the URL, oEmbed, or the page. */
export async function lookupPostedBy(rawUrl: string): Promise<string | null> {
  const fromUrl = postedByFromUrl(rawUrl)
  if (fromUrl) return fromUrl
  const pageUrl = canonicalSocialUrl(rawUrl)
  const platform = socialPlatform(pageUrl)
  if (platform === 'instagram') {
    return (await oembedPostedBy(pageUrl)) ?? (await htmlPostedBy(pageUrl))
  }
  if (platform === 'tiktok' || platform === 'facebook') {
    return htmlPostedBy(pageUrl)
  }
  return null
}

export async function resolveSocialVideo(rawUrl: string): Promise<string | null> {
  if (!isResolvableVideoUrl(rawUrl)) return null
  const pageUrl = canonicalSocialUrl(rawUrl)
  const hit = cache.get(pageUrl)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.url
  const direct = (await ytdlpResolve(pageUrl)) ?? (await cobaltResolve(pageUrl))
  if (!direct) return null
  cache.set(pageUrl, { url: direct, at: Date.now() })
  return direct
}

export async function resolveInstagramVideo(rawUrl: string): Promise<string | null> {
  return resolveSocialVideo(rawUrl)
}

function cachedDirectUrls(): Set<string> {
  return new Set([...cache.values()].map((v) => v.url))
}

function mediaHostAllowed(src: string): boolean {
  if (cachedDirectUrls().has(src)) return true
  try {
    const host = new URL(src).hostname
    return (
      /(^|\.)cdninstagram\.com$/i.test(host) ||
      /(^|\.)fbcdn\.net$/i.test(host) ||
      /(^|\.)facebook\.com$/i.test(host) ||
      /(^|\.)fb\.com$/i.test(host) ||
      /(^|\.)instagram\.com$/i.test(host) ||
      /(^|\.)tiktokcdn\.com$/i.test(host) ||
      /(^|\.)tiktokcdn-us\.com$/i.test(host) ||
      /(^|\.)tiktokv\.com$/i.test(host) ||
      /(^|\.)musical\.ly$/i.test(host) ||
      /(^|\.)byteoversea\.com$/i.test(host) ||
      /(^|\.)ibyteimg\.com$/i.test(host) ||
      /(^|\.)akamaized\.net$/i.test(host) ||
      /(^|\.)cjs\.nz$/i.test(host)
    )
  } catch {
    return false
  }
}

function refererFor(src: string): string {
  try {
    const host = new URL(src).hostname
    if (/(tiktok|musical\.ly|byteoversea|ibyteimg)/i.test(host)) return 'https://www.tiktok.com/'
    if (/(fbcdn|facebook|fb\.com)/i.test(host)) return 'https://www.facebook.com/'
  } catch {
    /* fall through */
  }
  return 'https://www.instagram.com/'
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
    Referer: refererFor(src),
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
