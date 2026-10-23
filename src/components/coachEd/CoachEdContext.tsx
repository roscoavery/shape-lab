import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MediaAsset, ReviewStatus } from '../../content/coachEd/types'
import { coachEdApi, type CoachEdState } from './api'

type Ctx = {
  state: CoachEdState | null
  loadError: string | null
  isAdmin: boolean
  reload: () => Promise<void>
  patch: (next: Partial<CoachEdState>) => void
  reviewOf: (kind: 'condition' | 'lesson', id: string, authored: ReviewStatus) => ReviewStatus
  mediaStatusOf: (asset: MediaAsset) => MediaAsset['status']
}

const CoachEdCtx = createContext<Ctx | null>(null)

export function CoachEdProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CoachEdState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setState(await coachEdApi.state())
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load Coach education.')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const value = useMemo<Ctx>(
    () => ({
      state,
      loadError,
      isAdmin: state?.isAdmin === true,
      reload,
      patch: (next) => setState((cur) => (cur ? { ...cur, ...next } : cur)),
      reviewOf: (kind, id, authored) => (kind === 'condition' ? state?.conditions[id] : state?.lessons[id])?.status ?? authored,
      mediaStatusOf: (asset) => state?.media[asset.id]?.status ?? asset.status,
    }),
    [state, loadError, reload],
  )
  return <CoachEdCtx.Provider value={value}>{children}</CoachEdCtx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCoachEd(): Ctx {
  const v = useContext(CoachEdCtx)
  if (!v) throw new Error('useCoachEd needs CoachEdProvider')
  return v
}
