import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getShape } from '../config/shapes'
import {
  resolveShapeCopy,
  type ShapeCopyFields,
} from '../lib/shapeCopy'
import { pullShapeCopy, pushShapeCopy } from '../lib/shapeCopyStore'

type ShapeCopyCtx = {
  canEdit: boolean
  overlays: Record<string, ShapeCopyFields>
  copyFor: (shapeId: string) => ShapeCopyFields
  saveCopy: (shapeId: string, fields: ShapeCopyFields) => Promise<void>
}

const ShapeCopyContext = createContext<ShapeCopyCtx | null>(null)

export function ShapeCopyProvider({
  children,
  canEdit,
}: {
  children: ReactNode
  canEdit: boolean
}) {
  const [overlays, setOverlays] = useState<Record<string, ShapeCopyFields>>({})

  useEffect(() => {
    void pullShapeCopy().then(setOverlays)
  }, [])

  const copyFor = useCallback(
    (shapeId: string): ShapeCopyFields => {
      const shape = getShape(shapeId)
      if (!shape) return { athlete: '', app: '' }
      return resolveShapeCopy(shape, overlays[shapeId])
    },
    [overlays],
  )

  const saveCopy = useCallback(
    async (shapeId: string, fields: ShapeCopyFields) => {
      const next = {
        ...overlays,
        [shapeId]: {
          athlete: fields.athlete.trim(),
          app: fields.app.trim(),
        },
      }
      const saved = await pushShapeCopy(next)
      setOverlays(saved)
    },
    [overlays],
  )

  const value = useMemo(
    () => ({ canEdit, overlays, copyFor, saveCopy }),
    [canEdit, overlays, copyFor, saveCopy],
  )

  return (
    <ShapeCopyContext.Provider value={value}>{children}</ShapeCopyContext.Provider>
  )
}

export function useShapeCopy(): ShapeCopyCtx {
  const ctx = useContext(ShapeCopyContext)
  if (!ctx) {
    return {
      canEdit: false,
      overlays: {},
      copyFor: (shapeId) => {
        const shape = getShape(shapeId)
        return shape
          ? resolveShapeCopy(shape, undefined)
          : { athlete: '', app: '' }
      },
      saveCopy: async () => {},
    }
  }
  return ctx
}
