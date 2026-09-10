/**
 * Remember which reference URLs failed to resolve or play so the gym
 * library can keep working clips on top.
 */

import { clipLoopKey } from './socialUrls'

const KEY = 'shape-lab.clip-play.v1'
const listeners = new Set<() => void>()

type Row = { ok: boolean; at: number }
type Store = Record<string, Row>

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const data = JSON.parse(raw) as Store
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
  for (const fn of listeners) fn()
}

function keyFor(url: string): string {
  return clipLoopKey(url).toLowerCase()
}

export function markClipPlayable(url: string) {
  if (!url) return
  const store = read()
  const key = keyFor(url)
  if (store[key]?.ok) return
  store[key] = { ok: true, at: Date.now() }
  write(store)
}

export function markClipUnplayable(url: string) {
  if (!url) return
  const store = read()
  const key = keyFor(url)
  if (store[key] && !store[key].ok) return
  store[key] = { ok: false, at: Date.now() }
  write(store)
}

/** One failed resolve should not bury a clip forever — Instagram helpers flap. */
const UNPLAYABLE_TTL_MS = 2 * 60 * 1000

export function forgetClipPlayability(url: string) {
  if (!url) return
  const store = read()
  const key = keyFor(url)
  if (!store[key]) return
  delete store[key]
  write(store)
}

export function isClipUnplayable(url: string | null | undefined): boolean {
  if (!url) return false
  const row = read()[keyFor(url)]
  if (!row || row.ok) return false
  if (Date.now() - row.at > UNPLAYABLE_TTL_MS) return false
  return true
}

export function playableRank(url: string | null | undefined): number {
  return isClipUnplayable(url) ? 1 : 0
}

export function subscribeClipPlayability(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
