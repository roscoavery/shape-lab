/** Lasting production gym URL. Preview / tunnel / localhost are different stores. */
export const LASTING_GYM_URL = 'https://temporary-racing-sulfur-78x9doy.vercel.app/'

export function isLastingGymOrigin(origin = typeof window === 'undefined' ? '' : window.location.origin): boolean {
  try {
    return new URL(LASTING_GYM_URL).origin === new URL(origin).origin
  } catch {
    return false
  }
}
