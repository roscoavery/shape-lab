/**
 * Gym Compare library as a live list of clips.
 * Learn scroll, Classes collages, and Compare all read the same names/URLs.
 * A rename saved into the app shows up here on the next pull.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { RefItem } from './clipStore'
import { isSameReferenceUrl } from './clipStore'
import {
  pullServerLibrary,
  shippedCompareLibrary,
  type LibraryBackup,
} from './libraryBackup'
import { clipLoopKey, socialPlatform } from './socialUrls'
import { LIBRARY_CHANGED_EVENT } from './libraryEvents'
export type GymClip = {
  id: string
  name: string
  url: string
  kind: RefItem['kind']
  collectionId: string
  collectionName: string
  keywords?: string[]
}

function flattenLibrary(backup: LibraryBackup | null): GymClip[] {
  if (!backup) return []
  const seen = new Set<string>()
  const out: GymClip[] = []
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
        collectionName: col.name,
        keywords: item.keywords,
      })
    }
  }
  return out
}

type GymLibraryValue = {
  clips: GymClip[]
  collections: LibraryBackup['collections']
  loading: boolean
  refresh: () => Promise<void>
  nameForUrl: (url: string) => string
  clipForUrl: (url: string) => GymClip | undefined
}

const GymLibraryContext = createContext<GymLibraryValue | null>(null)

export function GymLibraryProvider({ children }: { children: ReactNode }) {
  const [backup, setBackup] = useState<LibraryBackup | null>(() => shippedCompareLibrary())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const server = await pullServerLibrary()
      if (server && server.collections.length > 0) {
        setBackup(server)
        return
      }
      const seed = shippedCompareLibrary()
      if (seed) setBackup(seed)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onChange = () => void refresh()
    window.addEventListener(LIBRARY_CHANGED_EVENT, onChange)
    window.addEventListener('focus', onChange)
    return () => {
      window.removeEventListener(LIBRARY_CHANGED_EVENT, onChange)
      window.removeEventListener('focus', onChange)
    }
  }, [refresh])

  const clips = useMemo(() => flattenLibrary(backup), [backup])
  const collections = backup?.collections ?? []

  const clipForUrl = useCallback(
    (url: string) => clips.find((c) => isSameReferenceUrl(c.url, url)),
    [clips],
  )

  const nameForUrl = useCallback(
    (url: string) => clipForUrl(url)?.name || url,
    [clipForUrl],
  )

  const value = useMemo(
    () => ({ clips, collections, loading, refresh, nameForUrl, clipForUrl }),
    [clips, collections, loading, refresh, nameForUrl, clipForUrl],
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
