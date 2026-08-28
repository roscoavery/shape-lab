import { createContext, useContext } from 'react'

export type IgCropDraft = {
  dataUrl: string
  shapeId: string
  label?: string
}

type IgStillCtx = {
  saveCrop: (draft: IgCropDraft) => void
}

export const IgStillContext = createContext<IgStillCtx | null>(null)

export function useIgStillSave(): IgStillCtx | null {
  return useContext(IgStillContext)
}
