/**
 * One-time seed: merge bundled skill-card videos into data/skill-card-videos.json.
 * Idempotent — skips URLs already present, so re-running is a no-op.
 * Runs once at server boot (called from apiHandler module init).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

type ProofVideo = { who: string; url: string; watchFor: string }

export async function ensureSkillCardVideoSeeds(): Promise<void> {
  let seeds: Record<string, ProofVideo[]>
  try {
    const raw = await readFile(join(ROOT, 'server', 'seed', 'skill-card-video-seeds.json'), 'utf8')
    seeds = JSON.parse(raw) as Record<string, ProofVideo[]>
  } catch {
    return
  }
  const storePath = join(ROOT, 'data', 'skill-card-videos.json')
  let store: Record<string, ProofVideo[]> = {}
  try {
    store = JSON.parse(await readFile(storePath, 'utf8')) as Record<string, ProofVideo[]>
  } catch {
    /* missing or corrupt — start fresh */
  }
  let changed = false
  for (const [key, seedVideos] of Object.entries(seeds)) {
    const list = Array.isArray(store[key]) ? store[key] : []
    const urls = new Set(list.map((v) => v.url))
    for (const sv of seedVideos) {
      if (!sv?.url || urls.has(sv.url)) continue
      list.push({ who: sv.who || 'Reference', url: sv.url, watchFor: sv.watchFor || '' })
      urls.add(sv.url)
      changed = true
    }
    if (list.length > 0) store[key] = list
  }
  if (changed) {
    await writeFile(storePath, JSON.stringify(store, null, 2))
  }
}
