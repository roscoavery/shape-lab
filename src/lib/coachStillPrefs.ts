/**
 * Which still is the main picture for a shape.
 * Stored on the server (data/main-stills.json) like crops and deletes,
 * so every browser and the public study link see the same pick.
 * localStorage is kept as a fast local cache.
 */

import { markedFetch } from './authSession'

const MAIN_KEY = 'shape-lab.mainCoachStill.v1'

export function loadMainCoachStills(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MAIN_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveLocal(picks: Record<string, string>) {
  try {
    localStorage.setItem(MAIN_KEY, JSON.stringify(picks))
  } catch {
    /* quota */
  }
}

/** Pull the server's picks and merge over the local cache. */
export async function pullMainStills(): Promise<Record<string, string>> {
  try {
    const res = await fetch('/api/main-stills')
    if (!res.ok) return loadMainCoachStills()
    const data = (await res.json()) as { picks?: unknown }
    const serverPicks: Record<string, string> =
      data && typeof data.picks === 'object' && data.picks
        ? (data.picks as Record<string, string>)
        : {}
    const local = loadMainCoachStills()
    const merged = { ...local, ...serverPicks }
    saveLocal(merged)
    // One-time migration: if the server is empty but this browser has picks,
    // push them up so every browser and the public link see them.
    if (Object.keys(serverPicks).length === 0 && Object.keys(local).length > 0) {
      void markedFetch('/api/main-stills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks: local }),
      }).catch(() => {})
    }
    return merged
  } catch {
    return loadMainCoachStills()
  }
}

export function setMainCoachStill(shapeId: string, stillId: string): Record<string, string> {
  const next = { ...loadMainCoachStills(), [shapeId]: stillId }
  saveLocal(next)
  // Push to the server so other browsers and the public link see it.
  void markedFetch('/api/main-stills', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ picks: next }),
  }).catch(() => {
    /* server sync is best-effort; the local pick still applies here */
  })
  return next
}
