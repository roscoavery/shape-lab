import manifest from './shippedCoachStills.json' with { type: 'json' }
import type { ReferencePhoto } from '../types'

export type ShippedCoachExtra = {
  id: string
  shapeId: string
  file: string
  label?: string
  createdAt?: string
}

export const SHIPPED_COACH_EXTRAS: ShippedCoachExtra[] = manifest.extras

const bundled = import.meta.glob('../assets/coach-stills/*.{jpg,jpeg,png}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

function bundledUrlForFile(file: string): string | null {
  for (const [path, url] of Object.entries(bundled)) {
    if (path.endsWith(`/${file}`)) return url
  }
  return null
}

function viteBasePrefix(): string {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

/** Every URL we should try for one shipped extra JPEG. */
export function shippedCoachExtraCandidates(file: string): string[] {
  const rel = `learn/coach-stills/${file}`
  const out: string[] = []
  const add = (u: string | null | undefined) => {
    if (u && !out.includes(u)) out.push(u)
  }
  add(bundledUrlForFile(file))
  add(`${viteBasePrefix()}${rel}`)
  add(`/${rel}`)
  add(rel)
  return out
}

export function shippedCoachExtraUrl(file: string): string | null {
  return shippedCoachExtraCandidates(file)[0] ?? null
}

export const SHIPPED_COACH_EXTRA_BY_ID = new Map(SHIPPED_COACH_EXTRAS.map((row) => [row.id, row]))

export function shippedExtraCandidatesForId(id: string): string[] {
  const row = SHIPPED_COACH_EXTRA_BY_ID.get(id)
  if (!row) return []
  return shippedCoachExtraCandidates(row.file)
}

export function makeShippedCoachExtraPhoto(row: ShippedCoachExtra): ReferencePhoto | null {
  const url = shippedCoachExtraUrl(row.file)
  if (!url) return null
  return {
    id: row.id,
    shapeId: row.shapeId,
    athleteId: null,
    dataUrl: url,
    label: row.label,
    createdAt: row.createdAt ?? '',
    library: 'coach',
    persistedToApp: true,
  }
}

export function makeShippedCoachExtras(): ReferencePhoto[] {
  return SHIPPED_COACH_EXTRAS.map(makeShippedCoachExtraPhoto).filter(
    (p): p is ReferencePhoto => Boolean(p),
  )
}

export function shippedExtrasForShape(shapeId: string): ReferencePhoto[] {
  return SHIPPED_COACH_EXTRAS.filter((row) => row.shapeId === shapeId)
    .map(makeShippedCoachExtraPhoto)
    .filter((p): p is ReferencePhoto => Boolean(p))
}

/** Listed stills that still need a photo (not in this batch). */
export const EMPTY_COACH_STILL_SLOTS: ReferencePhoto[] = [
  {
    id: 'coach_mtyzubfw_wpbfw7',
    shapeId: 'gym_back_support',
    athleteId: null,
    dataUrl: '',
    label: 'Back support',
    createdAt: '2026-09-13T18:00:00.000Z',
    library: 'coach',
  },
  {
    id: 'coach_mtz31vn3_4xhh49',
    shapeId: 'gym_cartwheel_head_placement',
    athleteId: null,
    dataUrl: '',
    label: 'Cartwheel head placement',
    createdAt: '2026-09-13T18:00:00.000Z',
    library: 'coach',
  },
]
