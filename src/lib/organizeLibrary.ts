/**
 * Copy a reference clip into a Compare collection, or add it to a class collage.
 * Gym collections stay Ryan-only; coaches write lists tagged to their profile.
 */

import {
  canonicalReferenceUrl,
  getBlob,
  getCollections,
  isSameReferenceUrl,
  kindFromUrl,
  putBlob,
  putCollection,
  type RefCollection,
  type RefItem,
} from './clipStore'
import { isGymCollection, pushCoachLibrary } from './coachLibrary'
import {
  isGymCollage,
  listCollages,
  MAX_COLLAGE_SLOTS,
  newCollage,
  saveCollage,
  type Collage,
  type CollageSlot,
} from './collages'
import { persistLibraryMeta, pushServerLibrary } from './libraryBackup'
import { dispatchLibraryChanged } from './libraryEvents'
import { postedByFromUrl } from './socialUrls'
import { createId } from './storage'

export type ClipToCopy = {
  name: string
  url?: string
  kind?: RefItem['kind']
  keywords?: string[]
  postedBy?: string
  /** Source item id — used to copy a file blob when there is no URL. */
  sourceId?: string
}

export type OrganizeEditor = {
  gymEditor: boolean
  personalEditor: boolean
  profileId: string | null
}

export function canWriteCollection(col: RefCollection, opts: OrganizeEditor): boolean {
  if (opts.gymEditor && isGymCollection(col)) return true
  if (opts.personalEditor && opts.profileId && col.athleteId === opts.profileId) return true
  return false
}

export async function listWritableCollections(opts: OrganizeEditor): Promise<RefCollection[]> {
  const all = await getCollections()
  return all.filter((c) => canWriteCollection(c, opts))
}

async function persistAfterWrite(collection: RefCollection, opts: OrganizeEditor): Promise<void> {
  const all = await getCollections()
  if (isGymCollection(collection) && opts.gymEditor) {
    persistLibraryMeta(all.filter(isGymCollection))
    await pushServerLibrary(all)
  }
  if (collection.athleteId && opts.personalEditor && opts.profileId === collection.athleteId) {
    await pushCoachLibrary(
      opts.profileId,
      all.filter((c) => c.athleteId === opts.profileId),
    )
  }
  dispatchLibraryChanged()
}

export async function createWritableCollection(
  name: string,
  opts: OrganizeEditor,
): Promise<RefCollection | null> {
  if (!opts.gymEditor && !(opts.personalEditor && opts.profileId)) return null
  const trimmed = name.trim() || 'My references'
  const col: RefCollection = {
    id: createId('col'),
    name: trimmed,
    items: [],
    createdAt: new Date().toISOString(),
    ...(opts.gymEditor ? {} : { athleteId: opts.profileId! }),
  }
  await putCollection(col)
  await persistAfterWrite(col, opts)
  return col
}

export async function copyClipToCollection(
  clip: ClipToCopy,
  collectionId: string,
  opts: OrganizeEditor,
): Promise<{ ok: true; collectionName: string; already: boolean } | { ok: false; reason: string }> {
  const all = await getCollections()
  const col = all.find((c) => c.id === collectionId)
  if (!col) return { ok: false, reason: 'That collection is gone.' }
  if (!canWriteCollection(col, opts)) {
    return { ok: false, reason: 'You can only add clips to a collection you can edit.' }
  }

  const url = clip.url ? canonicalReferenceUrl(clip.url) : undefined
  if (url && col.items.some((i) => i.url && isSameReferenceUrl(i.url, url))) {
    return { ok: true, collectionName: col.name, already: true }
  }

  const posted = clip.postedBy || (url ? postedByFromUrl(url) : null)
  const item: RefItem = {
    id: createId('ref'),
    kind: clip.kind ?? (url ? kindFromUrl(url) : 'file'),
    name: clip.name.trim() || 'Clip',
    ...(url ? { url } : {}),
    ...(clip.keywords?.length ? { keywords: [...clip.keywords] } : {}),
    ...(posted ? { postedBy: posted } : {}),
    createdAt: new Date().toISOString(),
  }

  if (!url) {
    if (!clip.sourceId) return { ok: false, reason: 'That clip has no URL to copy.' }
    const blob = await getBlob(clip.sourceId)
    if (!blob) return { ok: false, reason: 'Could not copy that file — it is not stored in this app.' }
    await putBlob(item.id, blob)
  }

  const next: RefCollection = { ...col, items: [item, ...col.items] }
  await putCollection(next)
  await persistAfterWrite(next, opts)
  return { ok: true, collectionName: next.name, already: false }
}

function clipToSlot(clip: { id: string; url: string }): CollageSlot {
  return {
    clipId: clip.id,
    url: clip.url,
    caption: '',
    loopA: null,
    loopB: null,
  }
}

export function canEditCollage(
  collage: Collage,
  opts: { athleteId: string; gymAdmin: boolean },
): boolean {
  if (isGymCollage(collage)) return opts.gymAdmin
  return collage.ownerId === opts.athleteId || collage.createdById === opts.athleteId
}

export async function listEditableCollages(
  athleteId: string,
  gymAdmin: boolean,
): Promise<Collage[]> {
  const all = await listCollages(athleteId)
  return all.filter((c) => canEditCollage(c, { athleteId, gymAdmin }))
}

export async function addClipToCollage(
  clip: { id: string; url: string },
  collageId: string | 'new',
  opts: { athleteId: string; gymAdmin: boolean },
): Promise<
  { ok: true; collageName: string; created: boolean } | { ok: false; reason: string }
> {
  if (!clip.url) return { ok: false, reason: 'That clip needs a URL to go on a collage.' }

  let collage: Collage | null = null
  let created = false
  if (collageId === 'new') {
    collage = newCollage(opts.athleteId, 'New drill collage')
    created = true
  } else {
    const all = await listCollages(opts.athleteId)
    collage = all.find((c) => c.id === collageId) ?? null
  }
  if (!collage) return { ok: false, reason: 'That collage is gone.' }
  if (!canEditCollage(collage, opts)) {
    return { ok: false, reason: 'That collage belongs to another profile.' }
  }
  if (collage.slots.length >= MAX_COLLAGE_SLOTS) {
    return { ok: false, reason: `A collage can hold ${MAX_COLLAGE_SLOTS} videos.` }
  }

  const next: Collage = {
    ...collage,
    slots: [...collage.slots, clipToSlot(clip)],
    updatedAt: new Date().toISOString(),
  }
  const saved = await saveCollage(next)
  if (!saved) return { ok: false, reason: 'Could not save that collage.' }
  return { ok: true, collageName: saved.name, created }
}
