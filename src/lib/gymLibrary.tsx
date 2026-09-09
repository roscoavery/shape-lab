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
import { clipLoopKey, postedByFromUrl, socialPlatform } from './socialUrls'
import { LIBRARY_CHANGED_EVENT } from './libraryEvents'
import { listCoachSkillRefs, subscribeCoachContent } from './coachContentStore'
import { playableRank, subscribeClipPlayability } from './clipPlayability'
import { postedByForUrl, rememberPostedBy, subscribePostedBy } from './postedByCache'
export type GymClip = {
  id: string
  name: string
  url: string
  kind: RefItem['kind']
  collectionId: string
  collectionName: string
  keywords?: string[]
  postedBy?: string
}

function flattenSkillRefs(seen: Set<string>): GymClip[] {
  const out: GymClip[] = []
  for (const ref of listCoachSkillRefs()) {
    if (!ref.src) continue
    const key = clipLoopKey(ref.src).toLowerCase()
    if (seen.has(key)) continue
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
    })
  }
  return out
}

function flattenLibrary(backup: LibraryBackup | null): GymClip[] {
  const seen = new Set<string>()
  const out: GymClip[] = []
  if (backup) {
  for (const col of backup.collections) {
    for (const item of col.items) {
      if (!item.url) continue
      const key = clipLoopKey(item.url).toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const platform = socialPlatform(item.url)
      out.push({
        id: item.id,
        name: item.name || item.url,
        url: item.url,
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
      })
    }
  }
  }
  out.push(...flattenSkillRefs(seen))
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
}: {
  children: ReactNode
  profileId?: string | null
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
        server && server.collections.length > 0 ? server : shippedCompareLibrary()
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
    return flattenLibrary(backup)
  }, [backup, metaTick])
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
