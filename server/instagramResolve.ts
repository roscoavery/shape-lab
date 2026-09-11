/**
 * Resolve a public Instagram / TikTok / Facebook video URL to a playable mp4.
 *
 * ---------------------------------------------------------------------------
 * KEEP THIS PATH. Ryan’s public reels play in Safari after “Continue on web”
 * but Instagram’s official /embed/ iframe on another site is a fake
 * “post removed / Visit Instagram” wall. Do not put that iframe back in the
 * player. We cannot click Continue on web inside a cross-origin iframe.
 *
 * What Continue on web actually does (copy this, do not iframe it):
 *   1. Always send Cookie: ig_nrcb=1 (CONTINUE_ON_WEB) plus guest csrftoken.
 *   2. Warm https://www.instagram.com/ as a document to get LSD + cookies.
 *   3. POST www.instagram.com/api/graphql PolarIS logged-out query
 *      (doc_id IG_GRAPHQL_DOC, media_id from the shortcode).
 *   4. If that misses, fetch the permalink as Sec-Fetch-Dest: document and
 *      parse video_versions / scontent…cdninstagram.com … .mp4.
 *   5. yt-dlp last, with NO Instagram in-app user-agent (that empties media).
 *
 * Play the cdninstagram mp4 in a first-party <video> via /api/ig-media.
 * Persist savedUrl after a successful play so Production does not need IG again.
 * ---------------------------------------------------------------------------
 */

import { spawn } from 'node:child_process'
import { Readable } from 'node:stream'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
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

/** Instagram’s desktop page is a login wall. The mobile embed still has video_url. */
const IG_EMBED_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

/**
 * Same flag Instagram sets when you tap Continue on web. Without it, guest
 * HTML is a login / rate-limit shell with no video file.
 */
const CONTINUE_ON_WEB = 'ig_nrcb=1'

const IG_SHORTCODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

const IG_GRAPHQL_DOC = '27130156389949648'

/** Community Cobalt APIs that currently accept unauthenticated requests. */
const COBALT_APIS = [
  'https://api.cobalt.tools/',
  'https://cobaltapi.cjs.nz/',
  'https://co.wuk.sh/',
  'https://cobalt-api.kwiatekmiki.com/',
  'https://cobalt.api.timelessnesses.me/',
  'https://api.cobalt.best/',
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
const IG_COOKIE_MS = 20 * 60 * 1000

let igCookieHeader = CONTINUE_ON_WEB
let igCookieAt = 0
let igLsd = ''
const igPostedBy = new Map<string, string>()

function cookiesFromResponse(res: Response): string {
  const raw =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : res.headers.get('set-cookie')
        ? [res.headers.get('set-cookie') as string]
        : []
  return raw
    .map((row) => row.split(';')[0]?.trim())
    .filter((part): part is string => Boolean(part) && part.includes('='))
    .join('; ')
}

function mergeCookieHeader(prev: string, next: string): string {
  const map = new Map<string, string>()
  for (const part of `${prev};${next}`.split(';')) {
    const piece = part.trim()
    const i = piece.indexOf('=')
    if (i <= 0) continue
    map.set(piece.slice(0, i), piece.slice(i + 1))
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

function rememberIgCookies(res: Response) {
  const next = cookiesFromResponse(res)
  if (!next) return
  igCookieHeader = mergeCookieHeader(CONTINUE_ON_WEB, mergeCookieHeader(igCookieHeader, next))
  igCookieAt = Date.now()
}

function cookieHeader(): string {
  return mergeCookieHeader(CONTINUE_ON_WEB, igCookieHeader)
}

function rememberLsd(html: string) {
  const hit =
    html.match(/\["LSD",\[\],\{"token":"([^"]+)"\}/) ??
    html.match(/<script\b[^>]*\bid="__eqmc"[^>]*>[\s\S]*?"l"\s*:\s*"([^"]+)"/)
  if (hit?.[1]) igLsd = hit[1]
}

function shortcodeToMediaId(code: string): string | null {
  const short = code.length > 28 ? code.slice(0, -28) : code
  let n = 0n
  for (const ch of short) {
    const i = IG_SHORTCODE_ALPHABET.indexOf(ch)
    if (i < 0) return null
    n = n * 64n + BigInt(i)
  }
  if (n <= 0n) return null
  return n.toString()
}

function rememberPostedHandle(code: string, handle: string | null | undefined) {
  const h = handleFromField(handle)
  if (h) igPostedBy.set(code, h)
}

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

function spawnYtdlp(cmd: string, args: string[], ms = 14_000): Promise<YtHit> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    const kill = setTimeout(() => {
      child.kill('SIGKILL')
      resolve({ url: null, postedBy: null })
    }, ms)
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

function cookieFileFromHeader(header: string): string | null {
  const envCookies = process.env.IG_COOKIES?.trim()
  const raw = envCookies || header
  if (!raw) return null
  const lines = ['# Netscape HTTP Cookie File']
  for (const part of raw.split(';')) {
    const piece = part.trim()
    const i = piece.indexOf('=')
    if (i <= 0) continue
    const name = piece.slice(0, i)
    const value = piece.slice(i + 1)
    if (!name || !value) continue
    lines.push(`.instagram.com\tTRUE\t/\tTRUE\t2147483647\t${name}\t${value}`)
  }
  if (lines.length < 2) return null
  try {
    const file = path.join(os.tmpdir(), 'shape-lab-ig-cookies.txt')
    fs.writeFileSync(file, lines.join('\n') + '\n')
    return file
  } catch {
    return null
  }
}

async function ytdlpResolve(pageUrl: string): Promise<YtHit> {
  const base = [
    '-f',
    'b',
    '-g',
    '--print',
    '%(channel)s',
    '--no-warnings',
    '--no-playlist',
    pageUrl,
  ]
  const run = async (extra: string[]) => {
    const args = extra.length ? [...extra, ...base] : base
    const localBin = path.join(os.homedir(), '.local', 'bin', 'yt-dlp')
    for (const [cmd, cmdArgs] of [
      [localBin, args],
      ['yt-dlp', args],
      ['python3', ['-m', 'yt_dlp', ...args]],
    ] as Array<[string, string[]]>) {
      const hit = await spawnYtdlp(cmd, cmdArgs, 10_000)
      if (hit.url || hit.postedBy) return hit
    }
    return { url: null, postedBy: null }
  }
  const first = await run([])
  if (first.url) return first
  await refreshInstagramCookies()
  const cookieFile = cookieFileFromHeader(cookieHeader())
  if (!cookieFile) return first
  const cookied = await run(['--cookies', cookieFile])
  return cookied.url ? cookied : first
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

async function cobaltOne(origin: string, pageUrl: string): Promise<ResolvedSlide[]> {
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
    signal: AbortSignal.timeout(8_000),
  })
  const data = (await res.json()) as {
    status?: string
    url?: string
    picker?: Array<{ type?: string; url?: string }>
  }
  return cobaltSlides(data)
}

async function cobaltResolveAll(pageUrl: string): Promise<ResolvedSlide[]> {
  const hits = await Promise.all(
    COBALT_APIS.map((origin) => cobaltOne(origin, pageUrl).catch(() => [] as ResolvedSlide[])),
  )
  return hits.find((slides) => slides.length > 0) ?? []
}

function unescapeIgUrl(raw: string): string {
  let s = raw
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003d/gi, '=')
    .replace(/&amp;/g, '&')
  for (let i = 0; i < 5; i++) {
    const next = s.replace(/\\\//g, '/')
    if (next === s) break
    s = next
  }
  return s
}

/** Instagram now hides video_url on the public page; the embed page still has it, escaped. */
function normalizeIgHtml(html: string): string {
  return unescapeIgUrl(html).replace(/\\"/g, '"')
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

function slidesFromPageHtml(html: string): ResolvedSlide[] {
  const carousel = slidesFromInstagramHtml(html)
  if (carousel.length > 0) return carousel
  const slides: ResolvedSlide[] = []
  const seen = new Set<string>()
  const push = (raw: string | undefined, kind: ResolvedSlide['kind'] = 'video') => {
    if (!raw) return
    const clean = unescapeIgUrl(raw)
    if (!clean.startsWith('http') || seen.has(clean)) return
    seen.add(clean)
    slides.push({ url: clean, kind })
  }
  push(html.match(/"video_url"\s*:\s*"(https?:[^"]+)"/)?.[1])
  if (slides.length === 0) {
    const loose = html.match(/video_url[^h]{0,12}(https?:[^"\\]+)/)
    if (loose?.[1]) push(loose[1])
  }
  push(html.match(/"playback_url"\s*:\s*"(https?:[^"]+)"/)?.[1])
  const versions = html.match(/"video_versions"\s*:\s*\[([\s\S]{0,4000}?)\]/)
  if (versions?.[1]) {
    const urls = versions[1].matchAll(/"url"\s*:\s*"(https?:[^"]+)"/g)
    for (const hit of urls) push(hit[1])
  }
  const xdt = html.match(
    /"xdt_shortcode_media"\s*:\s*\{[\s\S]{0,12000}?"video_url"\s*:\s*"(https?:[^"]+)"/,
  )
  if (xdt?.[1]) push(xdt[1])
  push(
    html.match(/property="og:video(?::secure_url)?"\s+content="(https?:[^"]+)"/i)?.[1]
      ?? html.match(/content="(https?:[^"]+)"\s+property="og:video(?::secure_url)?"/i)?.[1],
  )
  push(html.match(/"playAddr"\s*:\s*"(https?:[^"]+)"/)?.[1])
  push(html.match(/"contentUrl"\s*:\s*"(https?:[^"]+\.mp4[^"]*)"/i)?.[1])
  push(html.match(/<meta[^>]+property="og:video"[^>]+content="(https?:[^"]+)"/i)?.[1])
  push(html.match(/<video[^>]+src="(https?:[^"]+)"/i)?.[1])
  push(html.match(/"browser_native_hd_url"\s*:\s*"(https?:[^"]+)"/)?.[1])
  push(html.match(/"browser_native_sd_url"\s*:\s*"(https?:[^"]+)"/)?.[1])
  if (slides.length === 0) {
    const versionsLoose = html.matchAll(
      /"url"\s*:\s*"(https?:[^"]+(?:cdninstagram\.com|fbcdn\.net)[^"]+\.mp4[^"]*)"/gi,
    )
    for (const hit of versionsLoose) push(hit[1])
  }
  if (slides.length === 0) {
    const cdn = html.matchAll(
      /https?:\/\/scontent[^"'\\\s]+(?:cdninstagram\.com|fbcdn\.net)[^"'\\\s]*\/o1\/v\/t[^"'\\\s]+\.mp4[^"'\\\s]*/gi,
    )
    for (const hit of cdn) push(hit[0])
  }
  return slides
}

async function fetchText(
  url: string,
  ms = 6000,
  ua = UA,
  extra: Record<string, string> = {},
): Promise<string | null> {
  try {
    const instagram = /instagram\.com|ddinstagram|imginn/i.test(url)
    const embed = /\/embed/i.test(url)
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(instagram ? { Cookie: cookieHeader() } : {}),
        ...(embed
          ? {
              Referer: 'https://www.instagram.com/',
              Origin: 'https://www.instagram.com/',
              'Sec-Fetch-Dest': 'iframe',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'same-origin',
            }
          : instagram
            ? {
                Referer: 'https://www.instagram.com/',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
              }
            : {}),
        ...extra,
      },
      signal: AbortSignal.timeout(ms),
      redirect: 'follow',
    })
    if (/instagram\.com/i.test(url)) {
      rememberIgCookies(res)
      const text = await res.text()
      rememberLsd(text)
      if (!res.ok) return null
      return text
    }
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function slidesFromGraphqlJson(raw: string): ResolvedSlide[] {
  const slides: ResolvedSlide[] = []
  const seen = new Set<string>()
  const push = (url: unknown, kind: ResolvedSlide['kind'] = 'video') => {
    if (typeof url !== 'string') return
    const clean = unescapeIgUrl(url)
    if (!clean.startsWith('http') || seen.has(clean) || slides.length >= CAROUSEL_CAP) return
    seen.add(clean)
    slides.push({ url: clean, kind })
  }

  const takeMedia = (media: Record<string, unknown> | null | undefined) => {
    if (!media || typeof media !== 'object') return
    const versions = media.video_versions
    if (Array.isArray(versions)) {
      for (const row of versions) {
        if (row && typeof row === 'object' && 'url' in row) push((row as { url?: string }).url)
      }
    }
    push(media.video_url)
    push(media.browser_native_hd_url)
    push(media.browser_native_sd_url)
    const carousel = media.carousel_media
    if (Array.isArray(carousel)) {
      for (const item of carousel) {
        if (!item || typeof item !== 'object') continue
        const block = item as Record<string, unknown>
        const nested = block.video_versions
        if (Array.isArray(nested) && nested[0] && typeof nested[0] === 'object') {
          push((nested[0] as { url?: string }).url, 'video')
        } else if (typeof block.video_url === 'string') {
          push(block.video_url, 'video')
        } else if (typeof block.display_uri === 'string') {
          push(block.display_uri, 'image')
        } else if (typeof block.display_url === 'string') {
          push(block.display_url, 'image')
        }
      }
    }
  }

  try {
    const data = JSON.parse(raw) as {
      data?: {
        xig_polaris_media?: {
          code?: string
          if_not_gated_logged_out?: Record<string, unknown> & {
            user?: { username?: string }
            video_versions?: Array<{ url?: string }>
          }
        }
      }
    }
    const media = data.data?.xig_polaris_media
    const info = media?.if_not_gated_logged_out
    rememberPostedHandle(media?.code ?? '', info?.user?.username)
    takeMedia(info)
    if (slides.some((s) => s.kind === 'video')) return slides
  } catch {
    /* fall through to regex */
  }
  return slidesFromPageHtml(normalizeIgHtml(raw))
}

async function instagramGraphqlSlides(code: string, pageUrl: string): Promise<ResolvedSlide[]> {
  await refreshInstagramCookies()
  const mediaId = shortcodeToMediaId(code)
  if (!mediaId || !igLsd) return []
  const csrf = cookieHeader().match(/(?:^|;\s*)csrftoken=([^;]+)/i)?.[1] ?? ''
  try {
    const res = await fetch('https://www.instagram.com/api/graphql', {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        Accept: '*/*',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeader(),
        Origin: 'https://www.instagram.com',
        Referer: pageUrl,
        'X-FB-Friendly-Name': 'PolarisLoggedOutDesktopWWWPostRootContentQuery',
        'X-CSRFToken': csrf,
        'X-FB-LSD': igLsd,
        'X-Requested-With': 'XMLHttpRequest',
        'X-IG-App-ID': '936619743392459',
        'X-ASBD-ID': '359341',
        'X-IG-WWW-Claim': '0',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      body: new URLSearchParams({
        lsd: igLsd,
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: 'PolarisLoggedOutDesktopWWWPostRootContentQuery',
        server_timestamps: 'true',
        variables: JSON.stringify({ media_id: mediaId }),
        doc_id: IG_GRAPHQL_DOC,
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    })
    rememberIgCookies(res)
    if (!res.ok) return []
    const text = await res.text()
    rememberLsd(text)
    return slidesFromGraphqlJson(text)
  } catch {
    return []
  }
}

async function instagramPermalinkSlides(pageUrl: string): Promise<ResolvedSlide[]> {
  await refreshInstagramCookies()
  for (const ua of [UA, IG_EMBED_UA]) {
    const html = await fetchText(pageUrl, 9000, ua, {
      Referer: 'https://www.instagram.com/',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    })
    if (!html) continue
    const slides = slidesFromPageHtml(normalizeIgHtml(html))
    if (slides.some((s) => s.kind === 'video')) return slides
  }
  return []
}

async function htmlCarouselSlides(pageUrl: string): Promise<ResolvedSlide[]> {
  const ig = parseInstagramUrl(pageUrl)
  if (ig) {
    const permalink = `https://www.instagram.com/${ig.type}/${ig.code}/`
    const videoOrThrow = async (slides: ResolvedSlide[]) => {
      if (!slides.some((s) => s.kind === 'video') && slides.length < 2) throw new Error('ig-miss')
      return slides
    }
    const first = await Promise.any([
      instagramGraphqlSlides(ig.code, permalink).then(videoOrThrow),
      instagramPermalinkSlides(permalink).then(videoOrThrow),
    ]).catch(() => [] as ResolvedSlide[])
    if (first.some((s) => s.kind === 'video') || first.length > 0) return first
    for (const candidate of [
      `https://www.ddinstagram.com/${ig.type}/${ig.code}/`,
      `https://ddinstagram.com/${ig.type}/${ig.code}`,
      `https://imginn.com/p/${ig.code}/`,
    ]) {
      const html = await fetchText(candidate, 7000, IG_EMBED_UA)
      if (!html) continue
      const slides = slidesFromPageHtml(normalizeIgHtml(html))
      if (slides.some((s) => s.kind === 'video') || slides.length > 0) return slides
    }
    return first
  }

  const html = await fetchText(pageUrl, 7000, UA)
  if (!html) return []
  return slidesFromPageHtml(normalizeIgHtml(html))
}

function firstVideoSlides(lists: ResolvedSlide[][]): ResolvedSlide[] | null {
  for (const list of lists) {
    if (list.some((s) => s.kind === 'video') || list.length > 0) return list
  }
  return null
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

async function refreshInstagramCookies(): Promise<string> {
  const fresh =
    igLsd &&
    /csrftoken=/i.test(cookieHeader()) &&
    Date.now() - igCookieAt < IG_COOKIE_MS
  if (fresh) return cookieHeader()
  await fetchText('https://www.instagram.com/', 8000, UA, {
    Referer: 'https://www.instagram.com/',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  })
  return cookieHeader()
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
  const igHandle = parseInstagramUrl(pageUrl)
  if (igHandle && igPostedBy.get(igHandle.code)) return igPostedBy.get(igHandle.code) ?? null
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

export function forgetResolvedSocial(rawUrl: string) {
  cache.delete(canonicalSocialUrl(rawUrl))
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
  const ig = parseInstagramUrl(pageUrl)
  const fromUrl = postedByFromUrl(rawUrl)

  const finish = (slides: ResolvedSlide[], postedBy?: string | null) => {
    const direct = slides.find((s) => s.kind === 'video')?.url ?? slides[0]?.url ?? null
    if (!direct || slides.length === 0) return null
    const posted = postedBy ?? fromUrl ?? (ig ? igPostedBy.get(ig.code) : null)
    cache.set(pageUrl, { url: direct, slides, at: Date.now(), postedBy: posted })
    return { url: direct, slides, postedBy: posted }
  }

  const platform = socialPlatform(pageUrl)
  const htmlP = htmlCarouselSlides(pageUrl)
  const ytP = ytdlpResolve(pageUrl)
  // Cobalt can return a URL that 502s in <video>. Never let it win a race
  // against Continue-on-web (GraphQL / permalink) or yt-dlp.
  const cobaltP =
    platform === 'instagram' ? null : cobaltResolveAll(pageUrl)

  const html = await htmlP
  if (html.some((s) => s.kind === 'video') || (ig?.type === 'p' && html.length > 1)) {
    const ready = finish(html)
    if (ready) return ready
  }

  const yt = await ytP
  if (yt.url) {
    const ready = finish([{ url: yt.url, kind: 'video' }], yt.postedBy)
    if (ready) return ready
  }

  const cobalt = await (cobaltP ?? cobaltResolveAll(pageUrl))
  const htmlOrCobalt = pickCarouselSlides(pageUrl, html, cobalt)
  if (htmlOrCobalt.length > 0) {
    const ready = finish(htmlOrCobalt)
    if (ready) return ready
  }
  if (cobalt.length > 0) {
    const ready = finish(cobalt)
    if (ready) return ready
  }

  const ytSlides: ResolvedSlide[] = yt.url ? [{ url: yt.url, kind: 'video' }] : []
  const chosen = firstVideoSlides([html, cobalt, ytSlides]) ?? []
  return finish(chosen, yt.postedBy)
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
      /(^|\.)cjs\.nz$/i.test(host) ||
      /(^|\.)ddinstagram\.com$/i.test(host) ||
      /(^|\.)imginn\.com$/i.test(host)
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
  const instagram = /instagram|cdninstagram|fbcdn/i.test(src)
  if (instagram) await refreshInstagramCookies()
  const tries: Array<Record<string, string>> = instagram
    ? [
        {
          'User-Agent': IG_EMBED_UA,
          Referer: 'https://www.instagram.com/',
          Origin: 'https://www.instagram.com/',
          Accept: '*/*',
          Cookie: cookieHeader(),
        },
        {
          'User-Agent': UA,
          Referer: 'https://www.instagram.com/',
          Origin: 'https://www.instagram.com/',
          Accept: '*/*',
          Cookie: cookieHeader(),
        },
        {
          'User-Agent': IG_EMBED_UA,
          Referer: refererFor(src),
          Accept: '*/*',
        },
      ]
    : [
        {
          'User-Agent': UA,
          Referer: refererFor(src),
          Accept: '*/*',
        },
      ]
  let upstream: Response | null = null
  for (const base of tries) {
    const headers = { ...base }
    if (typeof req.headers.range === 'string' && !upstream) headers.Range = req.headers.range
    const hit = await fetch(src, { headers, redirect: 'follow' })
    rememberIgCookies(hit)
    const type = hit.headers.get('content-type') || ''
    if (hit.ok && (type.startsWith('video/') || type.startsWith('image/') || type.startsWith('application/octet-stream'))) {
      upstream = hit
      break
    }
    if (hit.status === 206 && type.startsWith('video/')) {
      upstream = hit
      break
    }
    // Range + missing session often 403s. Retry this header set without Range.
    if (headers.Range && (hit.status === 403 || hit.status === 401)) {
      delete headers.Range
      const retry = await fetch(src, { headers, redirect: 'follow' })
      rememberIgCookies(retry)
      const retryType = retry.headers.get('content-type') || ''
      if (
        retry.ok &&
        (retryType.startsWith('video/') ||
          retryType.startsWith('image/') ||
          retryType.startsWith('application/octet-stream'))
      ) {
        upstream = retry
        break
      }
    }
  }
  if (!upstream) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Could not fetch that video file.' }))
    return
  }
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
