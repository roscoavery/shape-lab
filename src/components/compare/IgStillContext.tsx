import { createContext, useContext } from 'react'

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
