/**
 * Public social video URLs for Compare collections.
 * Instagram, TikTok, and Facebook — paste the post/reel/watch link.
 */

export type SocialPlatform = 'instagram' | 'tiktok' | 'facebook'

export function safeHost(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export function isInstagramUrl(url: string): boolean {
  return /(^|\.)instagram\.com$|(^|\.)instagr\.am$/i.test(safeHost(url))
}

export function isTikTokUrl(url: string): boolean {
  const host = safeHost(url)
  return (
    /(^|\.)tiktok\.com$/i.test(host) ||
    /(^|\.)tiktokv\.com$/i.test(host) ||
    /(^|\.)musical\.ly$/i.test(host)
  )
}

export function isFacebookUrl(url: string): boolean {
  const host = safeHost(url)
  return (
    /(^|\.)facebook\.com$/i.test(host) ||
    /(^|\.)fb\.com$/i.test(host) ||
    /(^|\.)fb\.watch$/i.test(host)
  )
}

export function socialPlatform(url: string): SocialPlatform | null {
  if (isInstagramUrl(url)) return 'instagram'
  if (isTikTokUrl(url)) return 'tiktok'
  if (isFacebookUrl(url)) return 'facebook'
  return null
}

export function parseInstagramUrl(
  url: string,
): { type: 'p' | 'reel' | 'tv'; code: string } | null {
  const m = url.match(
    /instagr(?:am\.com|\.am)\/(?:share\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
  )
  if (!m) return null
  const type = m[1].toLowerCase() === 'reels' ? 'reel' : (m[1].toLowerCase() as 'p' | 'reel' | 'tv')
  return { type, code: m[2] }
}

export function parseTikTokUrl(url: string): { id: string } | null {
  const video = url.match(/tiktok\.com\/(?:@[^/]+\/)?video\/(\d+)/i) || url.match(/\/v\/(\d+)/i)
  if (video) return { id: video[1]! }
  const short = url.match(/(?:vm|vt|www)\.tiktok\.com\/(?:t\/)?([A-Za-z0-9]+)/i)
  if (short) return { id: short[1]! }
  const t = url.match(/tiktok\.com\/t\/([A-Za-z0-9]+)/i)
  if (t) return { id: t[1]! }
  return null
}

export function parseFacebookUrl(url: string): { id: string } | null {
  const watch = url.match(/[?&]v=(\d+)/i)
  if (watch) return { id: watch[1]! }
  const reel = url.match(/\/reel[s]?\/(\d+)/i)
  if (reel) return { id: reel[1]! }
  const videos = url.match(/\/videos\/(?:[^/]+\/)?(\d+)/i)
  if (videos) return { id: videos[1]! }
  const share = url.match(/\/share\/(?:v|r|reel)\/([A-Za-z0-9_-]+)/i)
  if (share) return { id: share[1]! }
  const fbWatch = url.match(/fb\.watch\/([A-Za-z0-9_-]+)/i)
  if (fbWatch) return { id: fbWatch[1]! }
  return null
}

/** platform:id — used so the same clip pasted twice is one item. */
export function socialVideoKey(url: string): string | null {
  const ig = parseInstagramUrl(url)
  if (ig) return `instagram:${ig.code.toLowerCase()}`
  const tt = parseTikTokUrl(url)
  if (tt) return `tiktok:${tt.id}`
  const fb = parseFacebookUrl(url)
  if (fb) return `facebook:${fb.id}`
  return null
}

const DROP_PARAMS = /^(utm_|igsi$|fbclid$|ttclid$|si$|_r$|rdid$)/i

export function stripTrackingParams(url: string): string {
  try {
    const u = new URL(url)
    for (const key of [...u.searchParams.keys()]) {
      if (DROP_PARAMS.test(key)) u.searchParams.delete(key)
    }
    u.hash = ''
    const qs = u.searchParams.toString()
    return `${u.origin}${u.pathname}${qs ? `?${qs}` : ''}`
  } catch {
    return url.trim()
  }
}

export function canonicalSocialUrl(url: string): string {
  const cleaned = stripTrackingParams(url)
  const ig = parseInstagramUrl(cleaned)
  if (ig) return `https://www.instagram.com/${ig.type}/${ig.code}/`
  return cleaned
}

export function defaultSocialName(url: string): string {
  const ig = parseInstagramUrl(url)
  if (ig) return `IG ${ig.code}`
  const tt = parseTikTokUrl(url)
  if (tt) return `TikTok ${tt.id}`
  const fb = parseFacebookUrl(url)
  if (fb) return `Facebook ${fb.id}`
  return url
}

export function socialOpenLabel(platform: SocialPlatform): string {
  if (platform === 'tiktok') return 'Open on TikTok'
  if (platform === 'facebook') return 'Open on Facebook'
  return 'Open on Instagram'
}
