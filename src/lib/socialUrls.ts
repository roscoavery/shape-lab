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

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
])

/** YouTube watch / shorts / youtu.be — play in an embed, not <video src>. */
export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./i, '')
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      return id ? id.slice(0, 20) : null
    }
    if (YOUTUBE_HOSTS.has(host)) {
      const v = u.searchParams.get('v')
      if (v) return v.slice(0, 20)
      const parts = u.pathname.split('/').filter(Boolean)
      if (
        parts[0] === 'shorts' ||
        parts[0] === 'embed' ||
        parts[0] === 'live' ||
        parts[0] === 'watch'
      ) {
        return parts[1] ? parts[1].slice(0, 20) : null
      }
    }
  } catch {
    return null
  }
  return null
}

/** Official embed page — plays in the phone’s Instagram / TikTok player. */
export function socialEmbedSrc(url: string): string | null {
  const ig = parseInstagramUrl(url)
  if (ig) {
    const kind = ig.type === 'tv' ? 'tv' : ig.type === 'p' ? 'p' : 'reel'
    return `https://www.instagram.com/${kind}/${ig.code}/embed/`
  }
  const tt = parseTikTokUrl(url)
  if (tt && /^\d{5,}$/.test(tt.id)) return `https://www.tiktok.com/embed/v2/${tt.id}`
  return null
}

export function youtubeEmbedSrc(url: string): string | null {
  const id = youtubeVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}?playsinline=1&rel=0` : null
}

const IG_RESERVED = new Set([
  'p',
  'reel',
  'reels',
  'tv',
  'stories',
  'share',
  'explore',
  'accounts',
  'directory',
  'legal',
])

/** 0-based carousel index from Instagram `img_index` (1-based) or `#igslide=`. */
export function instagramSlideIndex(url: string): number {
  try {
    const u = new URL(url, 'https://instagram.com')
    const fromQuery = Number(u.searchParams.get('img_index'))
    if (Number.isFinite(fromQuery) && fromQuery >= 1) return Math.floor(fromQuery) - 1
    const hash = u.hash.match(/igslide=(\d+)/i)
    if (hash) {
      const n = Number(hash[1])
      if (Number.isFinite(n) && n >= 1) return Math.floor(n) - 1
    }
  } catch {
    /* keep 0 */
  }
  return 0
}

export function urlWithIgSlide(url: string, index: number): string {
  const base = url.trim().replace(/#.*$/, '')
  if (index <= 0) return base
  return `${base}#igslide=${index + 1}`
}

export function parseInstagramUrl(
  url: string,
): { type: 'p' | 'reel' | 'tv'; code: string; username?: string } | null {
  const withUser = url.match(
    /instagr(?:am\.com|\.am)\/([A-Za-z0-9._]+)\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
  )
  if (withUser && !IG_RESERVED.has(withUser[1]!.toLowerCase())) {
    const raw = withUser[2]!.toLowerCase()
    const type = raw === 'reels' ? 'reel' : (raw as 'p' | 'reel' | 'tv')
    return { type, code: withUser[3]!, username: withUser[1] }
  }
  const m = url.match(
    /instagr(?:am\.com|\.am)\/(?:share\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
  )
  if (!m) {
    const share = url.match(/instagr(?:am\.com|\.am)\/share\/([A-Za-z0-9_-]+)/i)
    if (share) return { type: 'reel', code: share[1]! }
    return null
  }
  const type = m[1]!.toLowerCase() === 'reels' ? 'reel' : (m[1]!.toLowerCase() as 'p' | 'reel' | 'tv')
  return { type, code: m[2]! }
}

export function parseTikTokUrl(url: string): { id: string; username?: string } | null {
  const named = url.match(/tiktok\.com\/@([A-Za-z0-9._]+)\/video\/(\d+)/i)
  if (named) return { id: named[2]!, username: named[1] }
  const video = url.match(/tiktok\.com\/(?:@[^/]+\/)?video\/(\d+)/i) || url.match(/\/v\/(\d+)/i)
  if (video) return { id: video[1]! }
  const short = url.match(/(?:vm|vt|www)\.tiktok\.com\/(?:t\/)?([A-Za-z0-9]+)/i)
  if (short) return { id: short[1]! }
  const t = url.match(/tiktok\.com\/t\/([A-Za-z0-9]+)/i)
  if (t) return { id: t[1]! }
  return null
}

/** Instagram / TikTok handle of the account that posted the clip, when the URL has it. */
export function postedByFromUrl(url: string): string | null {
  const ig = parseInstagramUrl(url)
  if (ig?.username) return ig.username
  const tt = parseTikTokUrl(url)
  if (tt?.username) return tt.username
  return null
}

export function normalizeSocialHandle(raw: string | null | undefined): string | null {
  if (!raw) return null
  const h = raw.trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9._]/g, '')
  return h || null
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

const BARE_VIDEO_HOST =
  /^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com|music\.youtube\.com|youtube-nocookie\.com|instagram\.com|instagr\.am|tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com|facebook\.com|fb\.com|fb\.watch)\//i

/** Accept a paste that left off https:// — common from phone share sheets. */
export function coerceHttpUrl(raw: string): string {
  const t = raw.trim()
  if (!t) return t
  if (/^https?:\/\//i.test(t)) return t
  if (BARE_VIDEO_HOST.test(t) || /^(youtu\.be|instagram\.com|tiktok\.com)\//i.test(t)) {
    return `https://${t.replace(/^\/+/, '')}`
  }
  return t
}

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

/** Stable key for gym-wide A/B loop points on a pasted social / video URL. */
export function clipLoopKey(url: string): string {
  const trimmed = url.trim()
  if (/^(instagram|tiktok|facebook):/i.test(trimmed)) return trimmed.toLowerCase()
  // Old server rewrite of instagram:code → origin "null" + code
  if (/^null[a-z0-9_-]+$/i.test(trimmed)) {
    return `instagram:${trimmed.slice(4).toLowerCase()}`
  }
  const slide = instagramSlideIndex(trimmed)
  const base = socialVideoKey(trimmed) ?? canonicalSocialUrl(trimmed).replace(/\/+$/, '')
  return slide > 0 ? `${base}:s${slide}` : base
}

export function socialProfileUrl(handle: string, platform: SocialPlatform | null): string {
  const h = normalizeSocialHandle(handle)
  if (!h) return ''
  if (platform === 'tiktok') return `https://www.tiktok.com/@${h}`
  if (platform === 'facebook') return `https://www.facebook.com/${h}`
  return `https://www.instagram.com/${h}/`
}

export function defaultSocialName(url: string): string {
  const ig = parseInstagramUrl(url)
  if (ig) return ig.username ? `@${ig.username}` : `IG ${ig.code}`
  const tt = parseTikTokUrl(url)
  if (tt) return tt.username ? `@${tt.username}` : `TikTok ${tt.id}`
  const fb = parseFacebookUrl(url)
  if (fb) return `Facebook ${fb.id}`
  return url
}

export function socialOpenLabel(platform: SocialPlatform): string {
  if (platform === 'tiktok') return 'Open on TikTok'
  if (platform === 'facebook') return 'Open on Facebook'
  return 'Open on Instagram'
}
