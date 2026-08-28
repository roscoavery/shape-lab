import type { StillCropRect } from './stillCrop'

export type StillCropFile = {
  kind: 'shape-lab-still-crops'
  version: 1
  updatedAt: string
  crops: Record<string, StillCropRect>
}

export async function pullStillCrops(): Promise<Record<string, StillCropRect>> {
  try {
    const res = await fetch('/api/still-crops')
    if (!res.ok) return {}
    const data = (await res.json()) as StillCropFile
    if (!data || data.kind !== 'shape-lab-still-crops' || typeof data.crops !== 'object') {
      return {}
    }
    return data.crops
  } catch {
    return {}
  }
}

export async function pushStillCrops(
  crops: Record<string, StillCropRect>,
): Promise<Record<string, StillCropRect>> {
  const res = await fetch('/api/still-crops', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'shape-lab-still-crops',
      version: 1,
      updatedAt: new Date().toISOString(),
      crops,
    }),
  })
  if (!res.ok) throw new Error('Could not save still crops to the app.')
  const data = (await res.json()) as StillCropFile
  return data.crops ?? crops
}
