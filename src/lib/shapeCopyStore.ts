import type { ShapeCopyFields } from './shapeCopy'

export type ShapeCopyFile = {
  kind: 'shape-lab-shape-copy'
  version: 1
  updatedAt: string
  shapes: Record<string, ShapeCopyFields>
}

export async function pullShapeCopy(): Promise<Record<string, ShapeCopyFields>> {
  try {
    const res = await fetch('/api/shape-copy')
    if (!res.ok) return {}
    const data = (await res.json()) as ShapeCopyFile
    if (!data || data.kind !== 'shape-lab-shape-copy' || typeof data.shapes !== 'object') {
      return {}
    }
    return data.shapes
  } catch {
    return {}
  }
}

export async function pushShapeCopy(
  shapes: Record<string, ShapeCopyFields>,
): Promise<Record<string, ShapeCopyFields>> {
  const res = await fetch('/api/shape-copy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'shape-lab-shape-copy',
      version: 1,
      updatedAt: new Date().toISOString(),
      shapes,
    }),
  })
  if (!res.ok) throw new Error('Could not save shape copy to the app.')
  const data = (await res.json()) as ShapeCopyFile
  return data.shapes ?? shapes
}
