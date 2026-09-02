import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { addIgStill } from '../../lib/igStillStore'
import { createId } from '../../lib/storage'
import type { ReferencePhoto } from '../../types'

export type IgCropDraft = {
  dataUrl: string
  shapeId: string
  label?: string
  customName?: string
}

type IgStillCtx = {
  saveCrop: (draft: IgCropDraft) => void
  persistToApp: boolean
}

export const IgStillContext = createContext<IgStillCtx | null>(null)

export function useIgStillSave(): IgStillCtx | null {
  return useContext(IgStillContext)
}

/** Gym-wide IG stills. Screenshots persist to the app unless persistToApp is false. */
export function IgStillProvider({
  children,
  persistToApp = true,
  onSave,
}: {
  children: ReactNode
  persistToApp?: boolean
  onSave?: (draft: IgCropDraft) => void
}) {
  const saveCrop = useCallback(
    (draft: IgCropDraft) => {
      if (onSave) {
        onSave(draft)
        return
      }
      const photo: ReferencePhoto = {
        id: createId('ig'),
        shapeId: draft.shapeId,
        athleteId: null,
        dataUrl: draft.dataUrl,
        customName: draft.customName,
        label: draft.label,
        createdAt: new Date().toISOString(),
        library: 'ig',
        persistedToApp: persistToApp,
      }
      void addIgStill(photo, { persistToApp })
    },
    [onSave, persistToApp],
  )
  return (
    <IgStillContext.Provider value={{ saveCrop, persistToApp }}>
      {children}
    </IgStillContext.Provider>
  )
}
