export type GestureBurstKind = 'hi5' | 'fist'

const listeners = new Set<(kind: GestureBurstKind) => void>()

export function playGestureBurst(kind: GestureBurstKind) {
  for (const cb of listeners) cb(kind)
}

export function subscribeGestureBurst(cb: (kind: GestureBurstKind) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
