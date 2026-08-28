/**
 * Coach stills that ship in the app bundle (src/assets/references/).
 * These live in git, so every Preview / tunnel / clone shows the same pictures
 * and the written cues in src/config/shapes.ts — not browser storage.
 */

import type { ReferencePhoto } from '../types'

/** Filename under src/assets/references/ (and public/references/ as fallback). */
export const SHIPPED_FILES: Record<string, string | string[]> = {
  stand_clean: 'stand_clean.jpg',
  feet_together_open_shoulders: 'feet_together_open_shoulders.jpg',
  passe: 'passe.jpg',
  lunge_start: 'lunge_start.jpg',
  lever: 'lever.jpg',
  lunge_land: 'lunge_land.jpg',
  // Same body position as landing lunge — keep the arm-drill name, share the still.
  lunge_arms_open: 'lunge_land.jpg',
  // Same overhead line as FTOS — keep the arm-drill name, share the still.
  arms_open_shoulders: 'feet_together_open_shoulders.jpg',
  c_shape: 'c_shape.jpg',
  handstand: 'handstand.jpg',
  candlestick: 'candlestick.jpg',
  hollow_arms_down: 'hollow_arms_down.jpg',
  hollow_arms_up: 'hollow_arms_up.jpg',
  zombie: ['zombie.jpg', 'hands_push_through.jpg'],
  seated_pike: ['pike_zombie_arms.jpg', 'hands_push_through.jpg'],
  hands_push_through: 'hands_push_through.jpg',
  pike_open_shoulders: ['pike_open_shoulders.jpg', 'pike_open_shoulders_class.jpg'],
  tuck_open_shoulders: [
    'tuck_open_shoulders.jpg',
    'tuck_open_shoulders_b.jpg',
    'tuck_open_shoulders_class.jpg',
  ],
  mountain_climber: 'mountain_climber.jpg',
  superman: 'superman.jpg',
  rainbow_bridge: 'rainbow_bridge.jpg',
  long_bridge: 'long_bridge.jpg',
  side_plank: ['side_plank_left.jpg', 'side_plank_right.jpg'],
}

/** Caption on a second (or later) shipped still for the same shape. */
const SHIPPED_STILL_LABELS: Record<string, string> = {
  'pike_open_shoulders.jpg': 'Close-up',
  'pike_open_shoulders_class.jpg': 'Class',
  'tuck_open_shoulders.jpg': 'Close-up',
  'tuck_open_shoulders_b.jpg': 'Flexed feet',
  'tuck_open_shoulders_class.jpg': 'Class',
  'zombie.jpg': 'Stand',
  'pike_zombie_arms.jpg': 'Pike',
  'hands_push_through.jpg': 'Hands',
  'side_plank_left.jpg': 'Left',
  'side_plank_right.jpg': 'Right',
}

export function shippedFileList(shapeId: string): string[] {
  const v = SHIPPED_FILES[shapeId]
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

export const SHIPPED_REFERENCE_IDS = new Set(Object.keys(SHIPPED_FILES))

/** Vite-hashed URLs — these travel with the JS bundle. */
const bundledStills = import.meta.glob('../assets/references/*.{jpg,jpeg,png}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function bundledUrlForFile(file: string): string | null {
  for (const [path, url] of Object.entries(bundledStills)) {
    if (path.endsWith(`/${file}`)) return url
  }
  return null
}

/** Root-absolute public/ paths (legacy + extra fallback). First still if several. */
export const DEFAULT_REFERENCE_PATHS: Record<string, string> = Object.fromEntries(
  Object.entries(SHIPPED_FILES).map(([id, file]) => {
    const first = Array.isArray(file) ? file[0] : file
    return [id, `/references/${first}`]
  }),
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

/** Every URL we should try for one shipped file, first = bundled asset. */
export function shippedFileCandidates(file: string): string[] {
  const rel = `references/${file}`
  const out: string[] = []
  const add = (u: string | null | undefined) => {
    if (u && !out.includes(u)) out.push(u)
  }
  add(bundledUrlForFile(file))
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

/** Every URL we should try for a shipped still, first = bundled asset. */
export function shippedStillCandidates(shapeId: string): string[] {
  const out: string[] = []
  for (const file of shippedFileList(shapeId)) {
    for (const u of shippedFileCandidates(file)) {
      if (!out.includes(u)) out.push(u)
    }
  }
  return out
}

export function shippedStillUrl(shapeId: string): string | null {
  return shippedStillCandidates(shapeId)[0] ?? null
}

export function makeShippedPhoto(shapeId: string): ReferencePhoto | null {
  return makeShippedPhotos(shapeId)[0] ?? null
}

/** All coach stills that ship for this shape (one or more). */
export function makeShippedPhotos(shapeId: string): ReferencePhoto[] {
  const files = shippedFileList(shapeId)
  const out: ReferencePhoto[] = []
  files.forEach((file, i) => {
    const url = shippedFileCandidates(file)[0]
    if (!url) return
    out.push({
      id: `default_${shapeId}_${i}`,
      shapeId,
      athleteId: null,
      dataUrl: url,
      label: SHIPPED_STILL_LABELS[file] ?? (i === 0 ? 'Coach reference' : `Coach reference ${i + 1}`),
      createdAt: '',
    })
  })
  return out
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
      p.library !== 'ig' &&
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
