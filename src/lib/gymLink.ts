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
