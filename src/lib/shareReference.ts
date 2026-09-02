/**
 * One share target for reels, stills, drills, and collages:
 * chalkboard, athlete, coach, or gym feed.
 */

import type { ChalkboardDraft } from './chalkboard'
import { getShape } from '../config/shapes'
import { pickCoachStill } from './shippedRefs'
import type { ReferencePhoto } from '../types'

export function referenceShareUrl(draft: ChalkboardDraft): string {
  const url = draft.url?.trim()
  if (url) return url
  if (draft.shapeId) {
    const still = draft.stillId ? `?still=${encodeURIComponent(draft.stillId)}` : ''
    return `shape-lab:shape/${draft.shapeId}${still}`
  }
  if (draft.stillId) return `shape-lab:still/${draft.stillId}`
  if (draft.drillId) return `shape-lab:drill/${draft.drillId}`
  if (draft.collageId) return `shape-lab:collage/${draft.collageId}`
  return ''
}

export function shareUrlLabel(url: string, fallback = 'Reference'): string {
  const u = url.trim()
  if (!u) return fallback
  if (u.startsWith('shape-lab:shape/')) {
    const id = decodeURIComponent(u.slice('shape-lab:shape/'.length).split('?')[0] || '')
    return getShape(id)?.name || fallback
  }
  if (u.startsWith('shape-lab:still/')) return fallback
  if (u.startsWith('shape-lab:drill/')) return fallback
  if (u.startsWith('shape-lab:collage/')) return fallback
  return u
}

export function isInternalShareUrl(url: string): boolean {
  return url.trim().startsWith('shape-lab:')
}

export function clipShareDraft(
  title: string,
  url: string,
  loopA?: number | null,
  loopB?: number | null,
): ChalkboardDraft {
  if (loopA != null && loopB != null) {
    return { kind: 'loop', title: `${title} · loop`, url, loopA, loopB }
  }
  return { kind: 'clip', title, url }
}

export function shapeStillDraft(
  shapeId: string,
  photos: ReferencePhoto[],
  title?: string,
): ChalkboardDraft {
  const still = pickCoachStill(photos, shapeId)
  return {
    kind: 'still',
    title: title || getShape(shapeId)?.name || 'Shape',
    stillId: still?.id ?? `default_${shapeId}_0`,
    shapeId,
    photoSrc: still?.dataUrl || undefined,
  }
}
