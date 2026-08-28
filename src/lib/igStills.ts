/**
 * IG shapes library — cropped stills from Compare (Instagram / replay / reference video).
 * Separate from shipped coach stills in src/assets/references/.
 */

import { getShape } from '../config/shapes'
import { learnLibraryShapes } from './educationCopy'
import { isUsablePhotoSrc, pickCoachStill } from './shippedRefs'
import type { ReferencePhoto } from '../types'

export function isIgStill(photo: ReferencePhoto): boolean {
  return photo.library === 'ig'
}

export function listIgStills(photos: ReferencePhoto[]): ReferencePhoto[] {
  return photos.filter((p) => isIgStill(p) && isUsablePhotoSrc(p.dataUrl))
}

export function igStillsForShape(
  photos: ReferencePhoto[],
  shapeId: string,
): ReferencePhoto[] {
  return listIgStills(photos).filter((p) => p.shapeId === shapeId)
}

export type OverlayStillOption = {
  id: string
  shapeId: string
  name: string
  src: string
  library: 'coach' | 'ig'
  label?: string
}

/** Coach / glossary stills for every library shape that has a picture. */
export function listCoachOverlayStills(photos: ReferencePhoto[]): OverlayStillOption[] {
  const out: OverlayStillOption[] = []
  for (const s of learnLibraryShapes()) {
    const coach = pickCoachStill(photos, s.id)
    const src = coach?.dataUrl
    if (!src || !isUsablePhotoSrc(src)) continue
    out.push({
      id: `coach:${s.id}`,
      shapeId: s.id,
      name: s.name,
      src,
      library: 'coach',
      label: coach.label ?? 'Coach still',
    })
  }
  return out
}

export function listIgOverlayStills(photos: ReferencePhoto[]): OverlayStillOption[] {
  return listIgStills(photos).map((p) => ({
    id: p.id,
    shapeId: p.shapeId,
    name: getShape(p.shapeId)?.name ?? p.shapeId,
    src: p.dataUrl,
    library: 'ig' as const,
    label: p.label,
  }))
}

export function groupIgStillsByShape(
  photos: ReferencePhoto[],
): { shapeId: string; name: string; stills: ReferencePhoto[] }[] {
  const map = new Map<string, ReferencePhoto[]>()
  for (const p of listIgStills(photos)) {
    const list = map.get(p.shapeId) ?? []
    list.push(p)
    map.set(p.shapeId, list)
  }
  return [...map.entries()]
    .map(([shapeId, stills]) => ({
      shapeId,
      name: getShape(shapeId)?.name ?? shapeId,
      stills,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
