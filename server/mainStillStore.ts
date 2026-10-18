/**
 * Which still is the main picture for each shape.
 * Ryan picks this in Learn; every browser and the public study link use it.
 * Stored on the server (data/main-stills.json) like crops and deletes —
 * not in per-browser localStorage.
 */

import { readJson, writeJson } from './persist.ts'

const FILE = 'data/main-stills.json'

export type MainStillFile = {
  kind: 'shape-lab-main-stills'
  version: 1
  updatedAt: string
  picks: Record<string, string>
}

const EMPTY: MainStillFile = {
  kind: 'shape-lab-main-stills',
  version: 1,
  updatedAt: '',
  picks: {},
}

export async function readMainStillFile(): Promise<MainStillFile> {
  try {
    const data = await readJson(FILE, EMPTY)
    if (data && typeof (data as any).picks === 'object') {
      const picks: Record<string, string> = {}
      for (const [k, v] of Object.entries((data as any).picks)) {
        if (typeof k === 'string' && typeof v === 'string' && v) picks[k] = v
      }
      return { kind: 'shape-lab-main-stills', version: 1, updatedAt: (data as any).updatedAt ?? '', picks }
    }
  } catch {
    // fall through
  }
  return EMPTY
}

export async function writeMainStillFile(picks: Record<string, string>): Promise<MainStillFile> {
  const file: MainStillFile = {
    kind: 'shape-lab-main-stills',
    version: 1,
    updatedAt: new Date().toISOString(),
    picks,
  }
  await writeJson(FILE, file)
  return file
}
