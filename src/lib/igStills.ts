/**
 * IG shapes library — cropped stills from Compare (Instagram / replay / reference video).
 * Separate from shipped coach stills in src/assets/references/.
 */

import { getShape } from '../config/shapes'
import { learnLibraryShapes } from './educationCopy'
import { isUsablePhotoSrc, makeShippedPhotos, pickCoachStill } from './shippedRefs'
import type { ReferencePhoto } from '../types'

export function isIgStill(photo: ReferencePhoto): boolean {
  return photo.library === 'ig'
}

/** Stable id for a typed shape name that is not in the scored library. */
export function customShapeId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48)
  return `custom_${slug || Date.now().toString(36)}`
}

export function igStillDisplayName(photo: ReferencePhoto): string {
  const fromLib = getShape(photo.shapeId)?.name
  if (fromLib) return fromLib
  const custom = photo.customName?.trim()
  if (custom) return custom
  const label = photo.label?.trim()
  if (label) return label
  if (photo.shapeId.startsWith('custom_')) {
    return photo.shapeId.slice('custom_'.length).replace(/_/g, ' ')
  }
  return photo.shapeId
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
    const shipped = makeShippedPhotos(s.id)
    const stills = shipped.length > 0 ? shipped : [pickCoachStill(photos, s.id)].filter(Boolean)
    for (const coach of stills) {
      const src = coach?.dataUrl
      if (!src || !isUsablePhotoSrc(src)) continue
      out.push({
        id: `coach:${s.id}:${coach!.id}`,
        shapeId: s.id,
        name: s.name,
        src,
        library: 'coach',
        label: coach!.label ?? 'Coach still',
      })
    }
  }
  return out
}

export function listIgOverlayStills(photos: ReferencePhoto[]): OverlayStillOption[] {
  return listIgStills(photos).map((p) => ({
    id: p.id,
    shapeId: p.shapeId,
    name: igStillDisplayName(p),
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
      name: igStillDisplayName(stills[0]!) ?? getShape(shapeId)?.name ?? shapeId,
      stills,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
