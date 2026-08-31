import type { ShapeDef } from '../types'

let cache: ShapeDef[] = []

export function setGymShapeCache(rows: ShapeDef[]) {
  cache = rows
}

export function getGymShapeFromCache(id: string): ShapeDef | undefined {
  return cache.find((row) => row.id === id)
}

export function listGymShapeCache(): ShapeDef[] {
  return cache
}
