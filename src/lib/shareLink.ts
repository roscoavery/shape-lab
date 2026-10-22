import { coerceHttpUrl } from './socialUrls'

const PENDING_KEY = 'shape-lab.shared-url'

/**
 * Pull the shared video URL out of an incoming share link. Shares arrive
 * as ?watch=<url> (our shortcut and the web app manifest), ?url=, or
 * buried in a ?text= blurb ("Check out this reel by @x https://...").
 * The raw query string is scanned on purpose: a shortcut may append the
 * shared URL without encoding it, so the value can contain characters
 * URLSearchParams would split on.
 */
export function extractSharedUrl(search: string): string | null {
  if (!search) return null
  const candidates: string[] = []
  const re = /https?%3A%2F%2F[^\s"'<>]+|https?:\/\/[^\s"'<>]+/gi
  for (const m of search.matchAll(re)) candidates.push(m[0])
  try {
    const params = new URLSearchParams(search)
    for (const key of ['watch', 'url', 'text', 'title']) {
      const v = params.get(key)
      if (v) candidates.push(v)
    }
  } catch {
    /* ignore */
  }
  for (const candidate of candidates) {
    let raw = candidate.trim()
    try {
      raw = decodeURIComponent(raw)
    } catch {
      /* keep the raw value */
    }
    const inner = /https?:\/\/[^\s"'<>]+/i.exec(raw)
    const url = coerceHttpUrl(inner ? inner[0] : raw)
    if (/^https?:\/\//i.test(url)) return url.replace(/[),.;]+$/, '')
  }
  return null
}

/** Remember a shared URL across the sign-in screen. */
export function stashSharedUrl(url: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, url)
  } catch {
    /* ignore */
  }
}

export function takeSharedUrl(): string | null {
  try {
    const url = sessionStorage.getItem(PENDING_KEY)
    if (url) sessionStorage.removeItem(PENDING_KEY)
    return url
  } catch {
    return null
  }
}

export function sharedWhoLabel(url: string): string {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  })()
  if (host.includes('instagram')) return 'Instagram'
  if (host.includes('tiktok')) return 'TikTok'
  if (host.includes('facebook') || host === 'fb.watch') return 'Facebook'
  if (host.includes('youtube') || host === 'youtu.be') return 'YouTube'
  return 'Shared video'
}
