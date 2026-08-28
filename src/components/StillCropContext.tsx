import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clampStillCrop,
  isFullStillCrop,
  type StillCropRect,
} from '../lib/stillCrop'
import { pullStillCrops, pushStillCrops } from '../lib/stillCropStore'

type StillCropCtx = {
  canEdit: boolean
  crops: Record<string, StillCropRect>
  cropFor: (stillId: string | null | undefined) => StillCropRect | null
  saveCrop: (stillId: string, crop: StillCropRect | null) => Promise<void>
}

const StillCropContext = createContext<StillCropCtx | null>(null)

export function StillCropProvider({
  children,
  canEdit,
}: {
  children: ReactNode
  canEdit: boolean
}) {
  const [crops, setCrops] = useState<Record<string, StillCropRect>>({})

  useEffect(() => {
    void pullStillCrops().then(setCrops)
  }, [])

  const cropFor = useCallback(
    (stillId: string | null | undefined): StillCropRect | null => {
      if (!stillId) return null
      const c = crops[stillId]
      return c && !isFullStillCrop(c) ? c : null
    },
    [crops],
  )

  const saveCrop = useCallback(
    async (stillId: string, crop: StillCropRect | null) => {
      const next = { ...crops }
      if (!crop || isFullStillCrop(crop)) delete next[stillId]
      else next[stillId] = clampStillCrop(crop)
      const saved = await pushStillCrops(next)
      setCrops(saved)
    },
    [crops],
  )

  const value = useMemo(
    () => ({ canEdit, crops, cropFor, saveCrop }),
    [canEdit, crops, cropFor, saveCrop],
  )

  return (
    <StillCropContext.Provider value={value}>{children}</StillCropContext.Provider>
  )
}

export function useStillCrop(): StillCropCtx {
  const ctx = useContext(StillCropContext)
  if (!ctx) {
    return {
      canEdit: false,
      crops: {},
      cropFor: () => null,
      saveCrop: async () => {},
    }
  }
  return ctx
}
