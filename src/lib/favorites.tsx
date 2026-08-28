/**
 * Gym-wide favorites for Compare URLs and named A/B loops on each URL.
 * Compare, Learn scroll, and Classes share the same stars.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { clipLoopKey } from './socialUrls'

type FavoritesFile = {
  kind: 'shape-lab-favorites'
  version: 1
  exportedAt: string
  urls: string[]
  loops: Record<string, string[]>
}

type FavoritesState = {
  urls: string[]
  loops: Record<string, string[]>
}

type FavoritesValue = {
  urls: Set<string>
  loops: Record<string, string[]>
  isUrlFavorite: (url: string) => boolean
  toggleUrlFavorite: (url: string) => void
  isLoopFavorite: (url: string, presetId: string) => boolean
  toggleLoopFavorite: (url: string, presetId: string) => void
  unfavoriteLoop: (url: string, presetId: string) => void
}

const FavoritesContext = createContext<FavoritesValue | null>(null)

export function favoriteUrlKey(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('item:')) return trimmed
  return clipLoopKey(trimmed)
}

async function pullFavorites(): Promise<FavoritesState> {
  try {
    const res = await fetch('/api/favorites')
    if (!res.ok) return { urls: [], loops: {} }
    const data = (await res.json()) as FavoritesFile
    if (!data || data.kind !== 'shape-lab-favorites') return { urls: [], loops: {} }
    return {
      urls: Array.isArray(data.urls) ? data.urls.map(favoriteUrlKey).filter(Boolean) : [],
      loops: data.loops && typeof data.loops === 'object' ? data.loops : {},
    }
  } catch {
    return { urls: [], loops: {} }
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FavoritesState>({ urls: [], loops: {} })
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    void pullFavorites().then((remote) => {
      setState((local) => {
        if (local.urls.length === 0 && Object.keys(local.loops).length === 0) return remote
        const urls = [...new Set([...remote.urls, ...local.urls])]
        const loops = { ...remote.loops }
        for (const [key, ids] of Object.entries(local.loops)) {
          loops[key] = [...new Set([...(loops[key] ?? []), ...ids])]
        }
        return { urls, loops }
      })
    })
  }, [])

  const flush = useCallback((next: FavoritesState) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void fetch('/api/favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'shape-lab-favorites',
          version: 1,
          exportedAt: new Date().toISOString(),
          urls: next.urls,
          loops: next.loops,
        }),
      })
    }, 400)
  }, [])

  const patch = useCallback(
    (fn: (current: FavoritesState) => FavoritesState) => {
      setState((prev) => {
        const next = fn(prev)
        flush(next)
        return next
      })
    },
    [flush],
  )

  const isUrlFavorite = useCallback((url: string) => {
    const key = favoriteUrlKey(url)
    if (!key) return false
    return state.urls.includes(key)
  }, [state.urls])

  const toggleUrlFavorite = useCallback(
    (url: string) => {
      const key = favoriteUrlKey(url)
      if (!key) return
      patch((current) => {
        const has = current.urls.includes(key)
        return {
          ...current,
          urls: has ? current.urls.filter((u) => u !== key) : [...current.urls, key],
        }
      })
    },
    [patch],
  )

  const isLoopFavorite = useCallback(
    (url: string, presetId: string) => {
      const key = favoriteUrlKey(url)
      if (!key || !presetId) return false
      return (state.loops[key] ?? []).includes(presetId)
    },
    [state.loops],
  )

  const toggleLoopFavorite = useCallback(
    (url: string, presetId: string) => {
      const key = favoriteUrlKey(url)
      if (!key || !presetId) return
      patch((current) => {
        const ids = current.loops[key] ?? []
        const has = ids.includes(presetId)
        const nextIds = has ? ids.filter((id) => id !== presetId) : [...ids, presetId]
        const loops = { ...current.loops }
        if (nextIds.length === 0) delete loops[key]
        else loops[key] = nextIds
        return { ...current, loops }
      })
    },
    [patch],
  )

  const unfavoriteLoop = useCallback(
    (url: string, presetId: string) => {
      const key = favoriteUrlKey(url)
      if (!key || !presetId) return
      patch((current) => {
        const ids = current.loops[key] ?? []
        if (!ids.includes(presetId)) return current
        const nextIds = ids.filter((id) => id !== presetId)
        const loops = { ...current.loops }
        if (nextIds.length === 0) delete loops[key]
        else loops[key] = nextIds
        return { ...current, loops }
      })
    },
    [patch],
  )

  const urlSet = useMemo(() => new Set(state.urls), [state.urls])

  const value = useMemo(
    () => ({
      urls: urlSet,
      loops: state.loops,
      isUrlFavorite,
      toggleUrlFavorite,
      isLoopFavorite,
      toggleLoopFavorite,
      unfavoriteLoop,
    }),
    [
      urlSet,
      state.loops,
      isUrlFavorite,
      toggleUrlFavorite,
      isLoopFavorite,
      toggleLoopFavorite,
      unfavoriteLoop,
    ],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext)
  if (!ctx) {
    throw new Error('useFavorites must be used inside FavoritesProvider')
  }
  return ctx
}

export function useFavoritesOptional(): FavoritesValue | null {
  return useContext(FavoritesContext)
}
