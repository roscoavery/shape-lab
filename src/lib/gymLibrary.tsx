/**
 * Gym Compare library as a live list of clips.
 * Learn scroll, Classes collages, and Compare all read the same names/URLs.
 * A rename saved into the app shows up here on the next pull.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCollections, putCollection, isSameReferenceUrl, type RefItem } from './clipStore'
import {
  pullServerLibrary,
  shippedCompareLibrary,
  type LibraryBackup,
} from './libraryBackup'
import { pullCoachLibrary } from './coachLibrary'
import { clipLoopKey, postedByFromUrl, socialPlatform, youtubeVideoId } from './socialUrls'
import { LIBRARY_CHANGED_EVENT } from './libraryEvents'
import { listCoachSkillRefs, subscribeCoachContent } from './coachContentStore'
import { playableRank, subscribeClipPlayability } from './clipPlayability'
import { postedByForUrl, rememberPostedBy, subscribePostedBy } from './postedByCache'
import {
  libraryUrlKey,
  loadRemovedLibraryItemIds,
  loadRemovedLibraryUrlKeys,
} from './libraryRemovals'
import {
  TECHNIQUE_EVIDENCE,
  FEATURED_PROOF,
  evidenceKeyForSkill,
  type ProofVideo,
} from '../config/techniqueEvidence'
import { guideSkillsInOrder, guidelessSkills } from './skillRegistry'
import { listDrills } from './coachContentStore'
import { listSkillCardDrillVideos, getSkill } from './skillPaths'

export type GymClip = {
  id: string
  name: string
  url: string
  savedUrl?: string
  kind: RefItem['kind']
  collectionId: string
  collectionName: string
  keywords?: string[]
  postedBy?: string
  /** When the underlying library item was added — powers "last added" sorting. */
  createdAt?: string
}

/**
 * Uploaded video (not an IG/TikTok/FB/YouTube reference): direct files like
 * /videos/*.mp4 and gym-hosted uploads. Powers the reference scroll's
 * "Uploaded" filter.
 */
export function isUploadedClip(clip: Pick<GymClip, 'url' | 'kind' | 'collectionId'>): boolean {
  if (
    clip.collectionId === 'virtual:skill-cards' ||
    clip.collectionId === 'virtual:drills' ||
    clip.collectionId === 'virtual:skill-drills'
  ) {
    return true
  }
  if (clip.kind === 'instagram' || clip.kind === 'tiktok' || clip.kind === 'facebook') return false
  if (youtubeVideoId(clip.url)) return false
  if (socialPlatform(clip.url)) return false
  return true
}

/**
 * Uploaded videos filed on skill cards (seed evidence + featured proof).
 * These are Ryan's own uploads and third-party references he curated —
 * searchable in the reference scroll by who, what to watch for, and skill.
 */
function flattenSkillCardVideos(seen: Set<string>, goneUrls: Set<string>): GymClip[] {
  // Evidence key -> skill name + aliases, for keyword tagging.
  const keyToSkill = new Map<string, { name: string; aliases: string[] }>()
  for (const s of [...guideSkillsInOrder(), ...guidelessSkills()]) {
    const key = evidenceKeyForSkill(s)
    if (!keyToSkill.has(key)) {
      keyToSkill.set(key, { name: s.name, aliases: s.aliases ?? [] })
    }
  }
  const out: GymClip[] = []
  const pushVideo = (evidenceKey: string, video: ProofVideo, index: number) => {
    const url = (video.url || '').trim()
    if (!url) return
    const urlKey = libraryUrlKey(url)
    if (goneUrls.has(urlKey) || goneUrls.has(url)) return
    const key = clipLoopKey(url).toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    const skill = keyToSkill.get(evidenceKey)
    const who = (video.who || video.creator || '').trim()
    const watchFor = (video.watchFor || '').trim()
    const keywords = [
      ...(skill ? [skill.name, ...skill.aliases] : []),
      evidenceKey.replace(/-/g, ' '),
      who,
      watchFor,
    ].filter(Boolean)
    out.push({
      id: `skillcard:${evidenceKey}:${index}`,
      name: watchFor || who || url,
      url,
      kind: socialPlatform(url) ?? 'url',
      collectionId: 'virtual:skill-cards',
      collectionName: 'Skill cards',
      keywords,
      postedBy: who || postedByFromUrl(url) || undefined,
    })
  }
  let index = 0
  for (const [evidenceKey, video] of Object.entries(FEATURED_PROOF)) {
    pushVideo(evidenceKey, video, index++)
  }
  for (const [evidenceKey, videos] of Object.entries(TECHNIQUE_EVIDENCE)) {
    for (const video of videos) pushVideo(evidenceKey, video, index++)
  }
  return out
}

/**
 * Drill library videos — Ryan's uploaded drill clips, searchable by title
 * and notes.
 */
function flattenDrills(seen: Set<string>, goneUrls: Set<string>): GymClip[] {
  const out: GymClip[] = []
  for (const drill of listDrills()) {
    const url = (drill.src || '').trim()
    if (!url) continue
    const urlKey = libraryUrlKey(url)
    if (goneUrls.has(urlKey) || goneUrls.has(url)) continue
    const key = clipLoopKey(url).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: `drill:${drill.id}`,
      name: drill.title || url,
      url,
      kind: socialPlatform(url) ?? 'url',
      collectionId: 'virtual:drills',
      collectionName: 'Drill library',
      keywords: [drill.title, drill.notes ?? ''].filter(Boolean),
      postedBy: undefined,
      createdAt: drill.updatedAt || drill.createdAt,
    })
  }
  return out
}

/**
 * Drill videos on skill cards (including per-coach "my system" cards).
 * A coach sees their own cards' videos; admins see everything.
 */
function flattenSkillDrillVideos(
  seen: Set<string>,
  goneUrls: Set<string>,
  viewer: { viewerId: string | null; isAdmin: boolean },
): GymClip[] {
  const out: GymClip[] = []
  for (const { drill, skillName } of listSkillCardDrillVideos()) {
    const url = (drill.videoUrl || '').trim()
    if (!url) continue
    const skill = getSkill(drill.skillId)
    const ownerId = skill?.coachId ?? null
    if (ownerId && ownerId !== viewer.viewerId && !viewer.isAdmin) continue
    const urlKey = libraryUrlKey(url)
    if (goneUrls.has(urlKey) || goneUrls.has(url)) continue
    const key = clipLoopKey(url).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: `skilldrill:${drill.id}`,
      name: drill.label || skillName,
      url,
      kind: socialPlatform(url) ?? 'url',
      collectionId: 'virtual:skill-drills',
      collectionName: skillName ? `Skill drills · ${skillName}` : 'Skill drills',
      keywords: [drill.label, skillName, drill.note ?? ''].filter(Boolean),
      postedBy: undefined,
    })
  }
  return out
}

function flattenSkillRefs(
  seen: Set<string>,
  goneIds: Set<string>,
  goneUrls: Set<string>,
): GymClip[] {  const out: GymClip[] = []
  for (const ref of listCoachSkillRefs()) {
    if (!ref.src) continue
    const key = clipLoopKey(ref.src).toLowerCase()
    if (seen.has(key)) continue
    const urlKey = libraryUrlKey(ref.src)
    if (goneUrls.has(urlKey) || goneUrls.has(ref.src) || goneIds.has(ref.id)) continue
    seen.add(key)
    out.push({
      id: ref.id,
      name: ref.athleteName ? `${ref.name} · ${ref.athleteName}` : ref.name,
      url: ref.src,
      kind: 'url',
      collectionId: `virtual:coach-refs:${ref.coachId}`,
      collectionName: `${ref.coachName} skill refs`,
      keywords: [ref.notes ?? '', 'skill'].filter(Boolean),
        postedBy: postedByForUrl(ref.src) || postedByFromUrl(ref.src) || undefined,
      createdAt: ref.createdAt,
    })
  }
  return out
}

function flattenLibrary(
  backup: LibraryBackup | null,
  viewer: { viewerId: string | null; isAdmin: boolean } = { viewerId: null, isAdmin: false },
): GymClip[] {
  const seen = new Set<string>()
  const goneIds = new Set([
    ...loadRemovedLibraryItemIds(),
    ...(backup?.removedItemIds ?? []),
  ])
  const goneUrls = new Set([
    ...loadRemovedLibraryUrlKeys(),
    ...(backup?.removedUrlKeys ?? []),
  ])
  const out: GymClip[] = []
  if (backup) {
  for (const col of backup.collections) {
    for (const item of col.items) {
      if (!item.url) continue
      if (item.id && goneIds.has(item.id)) continue
      const urlKey = libraryUrlKey(item.url)
      if (goneUrls.has(urlKey) || goneUrls.has(item.url)) continue
      const key = clipLoopKey(item.url).toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const platform = socialPlatform(item.url)
      out.push({
        id: item.id,
        name: item.name || item.url,
        url: item.url,
        ...(item.savedUrl ? { savedUrl: item.savedUrl } : {}),
        kind:
          item.kind === 'instagram' ||
          item.kind === 'tiktok' ||
          item.kind === 'facebook' ||
          item.kind === 'url'
            ? item.kind
            : platform ?? 'url',
        collectionId: col.id,
        collectionName: col.athleteId ? `${col.name} (mine)` : col.name,
        keywords: item.keywords,
        postedBy: item.postedBy || postedByForUrl(item.url) || postedByFromUrl(item.url) || undefined,
        createdAt: item.createdAt,
      })
    }
  }
  }
  out.push(...flattenSkillRefs(seen, goneIds, goneUrls))
  out.push(...flattenSkillCardVideos(seen, goneUrls))
  // Ryan's private drill library — only he sees these in the scroll.
  if (viewer.isAdmin) {
    out.push(...flattenDrills(seen, goneUrls))
  }
  out.push(...flattenSkillDrillVideos(seen, goneUrls, viewer))
  out.sort((a, b) => playableRank(a.url) - playableRank(b.url))
  return out
}

type GymLibraryValue = {
  clips: GymClip[]
  collections: LibraryBackup['collections']
  loading: boolean
  refresh: () => Promise<void>
  nameForUrl: (url: string) => string
  clipForUrl: (url: string) => GymClip | undefined
  rememberHandle: (url: string, handle: string) => void
}

const GymLibraryContext = createContext<GymLibraryValue | null>(null)

export function GymLibraryProvider({
  children,
  profileId = null,
  isAdmin = false,
}: {
  children: ReactNode
  profileId?: string | null
  /** Ryan/admin viewer — sees private libraries (drill library, all skill videos). */
  isAdmin?: boolean
}) {
  const [backup, setBackup] = useState<LibraryBackup | null>(() => shippedCompareLibrary())
  const [loading, setLoading] = useState(true)
  const [metaTick, setMetaTick] = useState(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const server = await pullServerLibrary()
      const personal = profileId ? await pullCoachLibrary(profileId) : null
      const gym =
        server && (server.managed || server.exportedAt || (server.removedItemIds?.length ?? 0) > 0)
          ? server
          : server && server.collections.length > 0
            ? server
            : shippedCompareLibrary()
      if (!gym && !personal) return
      setBackup({
        kind: 'shape-lab-library',
        version: 1,
        exportedAt: personal?.exportedAt || gym?.exportedAt || new Date().toISOString(),
        managed: true,
        collections: [...(gym?.collections ?? []), ...(personal?.collections ?? [])],
      })
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void refresh()
    const onChange = () => void refresh()
    window.addEventListener(LIBRARY_CHANGED_EVENT, onChange)
    window.addEventListener('focus', onChange)
    const unsub = subscribeCoachContent(onChange)
    const unsubHandles = subscribePostedBy(() => setMetaTick((n) => n + 1))
    const unsubPlay = subscribeClipPlayability(() => setMetaTick((n) => n + 1))
    return () => {
      window.removeEventListener(LIBRARY_CHANGED_EVENT, onChange)
      window.removeEventListener('focus', onChange)
      unsub()
      unsubHandles()
      unsubPlay()
    }
  }, [refresh])

  const clips = useMemo(() => {
    void metaTick
    return flattenLibrary(backup, { viewerId: profileId, isAdmin })
  }, [backup, metaTick, profileId, isAdmin])
  const collections = backup?.collections ?? []

  const clipForUrl = useCallback(
    (url: string) => clips.find((c) => isSameReferenceUrl(c.url, url)),
    [clips],
  )

  const nameForUrl = useCallback(
    (url: string) => clipForUrl(url)?.name || url,
    [clipForUrl],
  )

  const rememberHandle = useCallback((url: string, handle: string) => {
    const saved = rememberPostedBy(url, handle)
    if (!saved) return
    void getCollections().then(async (cols) => {
      for (const col of cols) {
        let dirty = false
        const items = col.items.map((item) => {
          if (!item.url || item.postedBy === saved) return item
          if (!isSameReferenceUrl(item.url, url)) return item
          dirty = true
          return { ...item, postedBy: saved }
        })
        if (dirty) await putCollection({ ...col, items })
      }
    })
  }, [])

  const value = useMemo(
    () => ({ clips, collections, loading, refresh, nameForUrl, clipForUrl, rememberHandle }),
    [clips, collections, loading, refresh, nameForUrl, clipForUrl, rememberHandle],
  )

  return <GymLibraryContext.Provider value={value}>{children}</GymLibraryContext.Provider>
}

export function useGymLibrary(): GymLibraryValue {
  const ctx = useContext(GymLibraryContext)
  if (!ctx) {
    throw new Error('useGymLibrary must be used inside GymLibraryProvider')
  }
  return ctx
}
