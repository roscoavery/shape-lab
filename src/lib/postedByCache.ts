/**
 * Instagram / TikTok handles resolved from /api/ig-resolve.
 * Most reel URLs have no username in the path, so we keep the handle
 * here and merge it onto gym-library clips.
 */

import { clipLoopKey, normalizeSocialHandle } from './socialUrls'

const KEY = 'shape-lab.posted-by.v1'
const listeners = new Set<() => void>()

type Store = Record<string, string>

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

export function postedByForUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return read()[keyFor(url)]
}

export function rememberPostedBy(url: string, handle: string | null | undefined): string | null {
  const clean = normalizeSocialHandle(handle)
  if (!url || !clean) return null
  const store = read()
  const key = keyFor(url)
  if (store[key] === clean) return clean
  store[key] = clean
  write(store)
  return clean
}

export function subscribePostedBy(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
