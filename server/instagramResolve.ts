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
  parseInstagramUrl,
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

export type ResolvedSlide = {
  url: string
  kind: 'video' | 'image'
}

type CacheHit = {
  url: string
  slides: ResolvedSlide[]
  at: number
  postedBy?: string | null
}

const cache = new Map<string, CacheHit>()
const CACHE_MS = 25 * 60 * 1000
const CAROUSEL_CAP = 12

export function isResolvableVideoUrl(url: string): boolean {
  return socialPlatform(url) !== null
}

/** @deprecated use isResolvableVideoUrl */
export function isInstagramUrl(url: string): boolean {
  return socialPlatform(url) === 'instagram'
}

function handleFromField(raw: string | null | undefined): string | null {
  const h = normalizeSocialHandle(raw)
  if (!h || /^\d+$/.test(h) || h.length < 2) return null
  const lower = h.toLowerCase()
  if (lower === 'na' || lower === 'none' || lower === 'null') return null
  return h
}

type YtHit = { url: string | null; postedBy: string | null }

function spawnYtdlp(cmd: string, args: string[]): Promise<YtHit> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    const kill = setTimeout(() => {
      child.kill('SIGKILL')
      resolve({ url: null, postedBy: null })
    }, 25_000)
    child.stdout.on('data', (d: Buffer) => {
      out += d.toString('utf8')
    })
    child.on('error', () => {
      clearTimeout(kill)
      resolve({ url: null, postedBy: null })
    })
    child.on('close', (code) => {
      clearTimeout(kill)
      if (code !== 0) {
        resolve({ url: null, postedBy: null })
        return
      }
      let url: string | null = null
      let postedBy: string | null = null
      for (const line of out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
        if (/^https?:\/\//.test(line)) url = line
        else postedBy = postedBy ?? handleFromField(line)
      }
      resolve({ url, postedBy })
    })
  })
}

async function ytdlpResolve(pageUrl: string): Promise<YtHit> {
  const args = ['-f', 'b', '-g', '--print', '%(channel)s', '--no-warnings', '--no-playlist', pageUrl]
  const first = await spawnYtdlp('yt-dlp', args)
  if (first.url || first.postedBy) return first
  return spawnYtdlp('python3', ['-m', 'yt_dlp', ...args])
}

function slidesFromUrlLines(out: string): ResolvedSlide[] {
  const slides: ResolvedSlide[] = []
  const seen = new Set<string>()
  for (const line of out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    if (!/^https?:\/\//.test(line) || seen.has(line)) continue
    seen.add(line)
    slides.push({ url: line, kind: 'video' })
    if (slides.length >= CAROUSEL_CAP) break
  }
  return slides
}

function spawnYtdlpLines(cmd: string, args: string[]): Promise<ResolvedSlide[]> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    const kill = setTimeout(() => {
      child.kill('SIGKILL')
      resolve(slidesFromUrlLines(out))
    }, 28_000)
    child.stdout.on('data', (d: Buffer) => {
      out += d.toString('utf8')
    })
    child.on('error', () => {
      clearTimeout(kill)
      resolve([])
    })
    child.on('close', () => {
      clearTimeout(kill)
      resolve(slidesFromUrlLines(out))
    })
  })
}

async function ytdlpResolveAll(pageUrl: string): Promise<ResolvedSlide[]> {
  const args = [
    '-f',
    'b',
    '-g',
    '--yes-playlist',
    '--playlist-end',
    String(CAROUSEL_CAP),
    '--no-warnings',
    pageUrl,
  ]
  const first = await spawnYtdlpLines('yt-dlp', args)
  if (first.length > 0) return first
  return spawnYtdlpLines('python3', ['-m', 'yt_dlp', ...args])
}

async function ytdlpPostedBy(pageUrl: string): Promise<string | null> {
  const args = ['--print', '%(channel)s', '--skip-download', '--no-warnings', '--no-playlist', pageUrl]
  const first = await spawnYtdlp('yt-dlp', args)
  if (first.postedBy) return first.postedBy
  const second = await spawnYtdlp('python3', ['-m', 'yt_dlp', ...args])
  return second.postedBy
}

function cobaltSlides(data: {
  status?: string
  url?: string
  picker?: Array<{ type?: string; url?: string }>
}): ResolvedSlide[] {
  const fromPicker = (data.picker ?? [])
    .map((p) => {
      if (typeof p.url !== 'string' || !p.url.startsWith('http')) return null
      const kind: ResolvedSlide['kind'] =
        p.type === 'photo' || p.type === 'image' || p.type === 'gif' ? 'image' : 'video'
      return { url: p.url, kind }
    })
    .filter((s): s is ResolvedSlide => Boolean(s))
    .slice(0, CAROUSEL_CAP)
  if (fromPicker.length > 0) return fromPicker
  if (
    (data.status === 'redirect' || data.status === 'tunnel') &&
    typeof data.url === 'string' &&
    data.url.startsWith('http')
  ) {
    return [{ url: data.url, kind: 'video' }]
  }
  return []
}

async function cobaltResolveAll(pageUrl: string): Promise<ResolvedSlide[]> {
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
      const slides = cobaltSlides(data)
      if (slides.length > 0) return slides
    } catch {
      // try next instance
    }
  }
  return []
}

function unescapeIgUrl(raw: string): string {
  return raw
    .replace(/\\u0026/g, '&')
    .replace(/\\u003d/g, '=')
    .replace(/\\\//g, '/')
}

function slidesFromInstagramHtml(html: string): ResolvedSlide[] {
  const slides: ResolvedSlide[] = []
  const seen = new Set<string>()
  const push = (url: string, kind: ResolvedSlide['kind']) => {
    const clean = unescapeIgUrl(url)
    if (!clean.startsWith('http') || seen.has(clean) || slides.length >= CAROUSEL_CAP) return
    seen.add(clean)
    slides.push({ url: clean, kind })
  }

  const sidecar = html.match(
    /"edge_sidecar_to_children"\s*:\s*\{\s*"edges"\s*:\s*(\[[\s\S]*?\])\s*\}/,
  )
  if (sidecar?.[1]) {
    const edges = sidecar[1].match(/\{[^{}]*"node"\s*:\s*\{[\s\S]*?\}\s*\}/g) ?? []
    for (const edge of edges) {
      const video = edge.match(/"video_url"\s*:\s*"(https?:[^"]+)"/)
      if (video) {
        push(video[1]!, 'video')
        continue
      }
      const photo = edge.match(/"display_url"\s*:\s*"(https?:[^"]+)"/)
      if (photo) push(photo[1]!, 'image')
    }
  }

  if (slides.length < 2) {
    const carousel = html.match(/"carousel_media"\s*:\s*(\[[\s\S]*?\])\s*,\s*"/)
    if (carousel?.[1]) {
      const blocks = carousel[1].split(/"pk"\s*:/)
      for (const block of blocks) {
        const video = block.match(/"url"\s*:\s*"(https?:[^"]+video[^"]*)"/i)
          ?? block.match(/"video_versions"[\s\S]*?"url"\s*:\s*"(https?:[^"]+)"/)
        if (video) {
          push(video[1]!, 'video')
          continue
        }
        const photo = block.match(/"url"\s*:\s*"(https?:[^"]+)"/)
        if (photo) push(photo[1]!, 'image')
      }
    }
  }

  return slides
}

async function htmlCarouselSlides(pageUrl: string): Promise<ResolvedSlide[]> {
  const html = await fetchText(pageUrl, 7000)
  if (!html) return []
  return slidesFromInstagramHtml(html)
}

function looksLikeCarousel(slides: ResolvedSlide[], pageUrl: string): boolean {
  if (slides.length < 2) return false
  const hasImage = slides.some((s) => s.kind === 'image')
  const hasVideo = slides.some((s) => s.kind === 'video')
  if (hasImage && (hasVideo || slides.length >= 2)) return true
  const ig = parseInstagramUrl(pageUrl)
  if (ig?.type === 'reel' || ig?.type === 'tv') return false
  return slides.length <= CAROUSEL_CAP
}

function pickCarouselSlides(pageUrl: string, ...lists: ResolvedSlide[][]): ResolvedSlide[] {
  let best: ResolvedSlide[] = []
  for (const list of lists) {
    if (looksLikeCarousel(list, pageUrl) && list.length > best.length) best = list
  }
  return best
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

/** Who originally posted the public clip — URL, yt-dlp channel, oEmbed, or the page. */
export async function lookupPostedBy(rawUrl: string): Promise<string | null> {
  const fromUrl = postedByFromUrl(rawUrl)
  if (fromUrl) return fromUrl
  const pageUrl = canonicalSocialUrl(rawUrl)
  const hit = cache.get(pageUrl)
  if (hit?.postedBy) return hit.postedBy
  const fromYt = await ytdlpPostedBy(pageUrl)
  if (fromYt) {
    if (hit) hit.postedBy = fromYt
    return fromYt
  }
  const platform = socialPlatform(pageUrl)
  if (platform === 'instagram') {
    return (await oembedPostedBy(pageUrl)) ?? (await htmlPostedBy(pageUrl))
  }
  if (platform === 'tiktok' || platform === 'facebook') {
    return htmlPostedBy(pageUrl)
  }
  return null
}

export async function resolveSocialSlides(rawUrl: string): Promise<{
  url: string
  slides: ResolvedSlide[]
  postedBy?: string | null
} | null> {
  if (!isResolvableVideoUrl(rawUrl)) return null
  const pageUrl = canonicalSocialUrl(rawUrl)
  const hit = cache.get(pageUrl)
  if (hit && Date.now() - hit.at < CACHE_MS && hit.slides.length > 0) {
    return { url: hit.url, slides: hit.slides, postedBy: hit.postedBy }
  }
  const yt = await ytdlpResolve(pageUrl)
  const ig = parseInstagramUrl(pageUrl)
  const [ytAll, cobalt, html] = await Promise.all([
    ig?.type === 'p' ? ytdlpResolveAll(pageUrl) : Promise.resolve([]),
    cobaltResolveAll(pageUrl),
    ig ? htmlCarouselSlides(pageUrl) : Promise.resolve([]),
  ])
  const single: ResolvedSlide[] = yt.url
    ? [{ url: yt.url, kind: 'video' }]
    : cobalt.slice(0, 1)
  const carousel = pickCarouselSlides(pageUrl, html, cobalt, ytAll)
  const chosen = carousel.length > 0 ? carousel : single
  const direct = chosen.find((s) => s.kind === 'video')?.url ?? chosen[0]?.url ?? yt.url ?? null
  if (!direct || chosen.length === 0) return null
  cache.set(pageUrl, {
    url: direct,
    slides: chosen,
    at: Date.now(),
    postedBy: yt.postedBy,
  })
  return { url: direct, slides: chosen, postedBy: yt.postedBy }
}

export async function resolveSocialVideo(rawUrl: string): Promise<string | null> {
  const resolved = await resolveSocialSlides(rawUrl)
  return resolved?.url ?? null
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
