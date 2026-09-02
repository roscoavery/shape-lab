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
import { stillCropLookupIds } from '../lib/shippedRefs'
import { SHIPPED_STILL_CROPS, mergeStillCrops } from '../lib/shippedStillCrops'
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
  const [crops, setCrops] = useState<Record<string, StillCropRect>>(() => ({
    ...SHIPPED_STILL_CROPS,
  }))

  useEffect(() => {
    void pullStillCrops().then((next) => {
      setCrops(mergeStillCrops(SHIPPED_STILL_CROPS, next))
    })
  }, [])

  const cropFor = useCallback(
    (stillId: string | null | undefined): StillCropRect | null => {
      for (const id of stillCropLookupIds(stillId)) {
        const c = crops[id]
        if (c && !isFullStillCrop(c)) return c
      }
      return null
    },
    [crops],
  )

  const saveCrop = useCallback(
    async (stillId: string, crop: StillCropRect | null) => {
      const next = mergeStillCrops(SHIPPED_STILL_CROPS, crops)
      if (!crop || isFullStillCrop(crop)) delete next[stillId]
      else next[stillId] = clampStillCrop(crop)
      const saved = await pushStillCrops(next)
      setCrops(mergeStillCrops(SHIPPED_STILL_CROPS, saved))
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
      crops: { ...SHIPPED_STILL_CROPS },
      cropFor: (stillId) => {
        for (const id of stillCropLookupIds(stillId)) {
          const c = SHIPPED_STILL_CROPS[id]
          if (c && !isFullStillCrop(c)) return c
        }
        return null
      },
      saveCrop: async () => {},
    }
  }
  return ctx
}
