/** Lasting production gym URL. Preview / tunnel / localhost are different stores. */
export const LASTING_GYM_URL = 'https://temporary-racing-sulfur-78x9doy.vercel.app/'

function hostnameOf(origin: string): string {
  try {
    return new URL(origin).hostname
  } catch {
    return ''
  }
}

/** Mac / PC gym on this LAN — same store as `npm run gym`. */
export function isHomeNetworkOrigin(
  origin = typeof window === 'undefined' ? '' : window.location.origin,
): boolean {
  const host = hostnameOf(origin)
  if (!host) return false
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') {
    return true
  }
  if (host.endsWith('.local')) return true
  if (host.endsWith('.trycloudflare.com')) return true
  if (host === 'gym.shapelab.win' || host.endsWith('.shapelab.win')) return true
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true
  return false
}

export function isLastingGymOrigin(origin = typeof window === 'undefined' ? '' : window.location.origin): boolean {
  if (isHomeNetworkOrigin(origin)) return true
  try {
    return new URL(LASTING_GYM_URL).origin === new URL(origin).origin
  } catch {
    return false
  }
}

export function gymUrlForHumans(): string {
  if (typeof window !== 'undefined' && isHomeNetworkOrigin()) {
    return `${window.location.origin}/`
  }
  return LASTING_GYM_URL
}

/**
 * Base URL for public share links (build 682). Share recipients have no
 * account, so the link must be reachable from outside: prefer the current
 * origin when it's already the public tunnel host, otherwise fall back to
 * the known public tunnel host. The link only loads while the gym server
 * is running and the tunnel is up.
 */
export function shareBaseUrl(): string {
  const PUBLIC_TUNNEL = 'https://gym.shapelab.win'
  if (typeof window !== 'undefined') {
    try {
      const host = new URL(window.location.origin).hostname
      if (
        host === 'gym.shapelab.win' ||
        host.endsWith('.shapelab.win') ||
        host.endsWith('.trycloudflare.com')
      ) {
        return window.location.origin
      }
    } catch {
      /* fall through to the public host */
    }
  }
  return PUBLIC_TUNNEL
}
