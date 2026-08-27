/**
 * Coach stills that ship in the app bundle (src/assets/references/).
 * These live in git, so every Preview / tunnel / clone shows the same pictures
 * and the written cues in src/config/shapes.ts — not browser storage.
 */

import type { ReferencePhoto } from '../types'

/** Filename under src/assets/references/ (and public/references/ as fallback). */
export const SHIPPED_FILES: Record<string, string> = {
  stand_clean: 'stand_clean.jpg',
  feet_together_open_shoulders: 'feet_together_open_shoulders.jpg',
  passe: 'passe.jpg',
  lunge_start: 'lunge_start.jpg',
  lever: 'lever.jpg',
  lunge_land: 'lunge_land.jpg',
  c_shape: 'c_shape.jpg',
  handstand: 'handstand.jpg',
  candlestick: 'candlestick.jpg',
  hollow_arms_down: 'hollow_arms_down.jpg',
  hollow_arms_up: 'hollow_arms_up.jpg',
  zombie: 'zombie.jpg',
  mountain_climber: 'mountain_climber.jpg',
}

export const SHIPPED_REFERENCE_IDS = new Set(Object.keys(SHIPPED_FILES))

/** Vite-hashed URLs — these travel with the JS bundle. */
const bundledStills = import.meta.glob('../assets/references/*.{jpg,jpeg,png}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function bundledUrl(shapeId: string): string | null {
  const file = SHIPPED_FILES[shapeId]
  if (!file) return null
  for (const [path, url] of Object.entries(bundledStills)) {
    if (path.endsWith(`/${file}`)) return url
  }
  return null
}

/** Root-absolute public/ paths (legacy + extra fallback). */
export const DEFAULT_REFERENCE_PATHS: Record<string, string> = Object.fromEntries(
  Object.entries(SHIPPED_FILES).map(([id, file]) => [id, `/references/${file}`]),
)

export function isUsablePhotoSrc(src: string | null | undefined): boolean {
  if (!src || typeof src !== 'string') return false
  const s = src.trim()
  if (!s) return false
  if (s.startsWith('blob:')) return false
  if (s.startsWith('data:image/') && s.length > 80) return true
  if (s.startsWith('data:')) return false
  if (s.startsWith('http://') || s.startsWith('https://')) return true
  if (s.includes('references/')) return true
  if (s.startsWith('/') || s.startsWith('./')) return true
  return false
}

function viteBasePrefix(): string {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

/** Every URL we should try for a shipped still, first = bundled asset. */
export function shippedStillCandidates(shapeId: string): string[] {
  const file = SHIPPED_FILES[shapeId]
  if (!file) return []
  const rel = `references/${file}`
  const out: string[] = []
  const add = (u: string | null | undefined) => {
    if (u && !out.includes(u)) out.push(u)
  }
  add(bundledUrl(shapeId))
  add(`${viteBasePrefix()}${rel}`)
  add(`/${rel}`)
  add(rel)
  if (typeof document !== 'undefined') {
    try {
      add(new URL(rel, document.baseURI).href)
    } catch {
      /* ignore */
    }
  }
  return out
}

export function shippedStillUrl(shapeId: string): string | null {
  return shippedStillCandidates(shapeId)[0] ?? null
}

export function makeShippedPhoto(shapeId: string): ReferencePhoto | null {
  const url = shippedStillUrl(shapeId)
  if (!url) return null
  return {
    id: `default_${shapeId}`,
    shapeId,
    athleteId: null,
    dataUrl: url,
    label: 'Coach reference',
    createdAt: '',
  }
}

/**
 * Coach still for teaching / matching.
 * Hit snapshots are never used here — they live in the hit folder.
 * A Glossary data:image upload can stand in only for shapes that have no shipped file.
 */
export function pickCoachStill(
  photos: ReferencePhoto[],
  shapeId: string,
): ReferencePhoto | null {
  if (!shapeId) return null
  const shipped = makeShippedPhoto(shapeId)
  if (shipped) return shipped
  const uploaded = photos.find(
    (p) =>
      p.shapeId === shapeId &&
      p.athleteId == null &&
      isUsablePhotoSrc(p.dataUrl) &&
      p.dataUrl.startsWith('data:image') &&
      !p.id.startsWith('hitref_'),
  )
  return uploaded ?? null
}

/** Same as pickCoachStill — athlete hits do not replace coach pictures. */
export function pickReferencePhoto(
  photos: ReferencePhoto[],
  shapeId: string,
  _athleteId: string | null,
): ReferencePhoto | null {
  return pickCoachStill(photos, shapeId)
}
