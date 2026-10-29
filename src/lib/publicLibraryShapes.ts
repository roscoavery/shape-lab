import { firstPathwayTaskIndex, learnLibraryShapes } from './educationCopy'
import { shippedFileList } from './shippedRefs'

function stillIdFor(shapeId: string, fileIndex: number): string {
  return `default_${shapeId}_${fileIndex}`
}

/** Shapes kept out of the athlete study view. */
// Arm positions, scaffolding, and unmatched are separate from the shape library.
export const STUDY_EXCLUDE = new Set([
  'arms_down',
  'arms_forward',
  'arms_vertical',
  'zombie_arms',
  'bridge', // rainbow bridge + long bridge already cover it, and this one has no still
  // Arm position shapes (from ARM_POSITION_SHAPE_IDS in educationCopy.ts)
  'arms_low_v_back',
  'arms_front_middle',
  'arms_open_shoulders',
  'arms_t',
  'arms_high_v_chest',
  'lunge_arms_low_v',
  'lunge_arms_front',
  'lunge_arms_open',
  'lunge_arms_t',
  'lunge_arms_high_v',
  // Scaffold shapes (from SCAFFOLD_SHAPE_IDS in educationCopy.ts)
  'lunge',
  'tucked_handstand',
  'piked_handstand',
  'l_handstand',
  // Unmatched coach stills (not assigned to a shape)
  'unmatched',
])

export type PublicLibraryShape = {
  id: string
  name: string
  urls: string[]
  stillIds: string[]
}

export type PublicLibraryStillData = {
  removedStillIds: string[] | Set<string>
  removedCoachStillIds: string[] | Set<string>
  mainStills: Record<string, string>
  coachStills: { shapeId: string; stillId: string; file: string }[]
  igStills: { shapeId: string; stillId: string; file: string }[]
  gymShapes: { id: string; name: string }[]
}

/**
 * The shape list for the public study library and shape test, in exact
 * in-app order, with Ryan's picks and deletions applied. Shared by the
 * study page and the shape test so both always show the same shapes.
 */
export function buildPublicLibraryShapes(data: PublicLibraryStillData): PublicLibraryShape[] {
  const removedStillIds = new Set(data.removedStillIds)
  const removedCoachStillIds = new Set(data.removedCoachStillIds)
  const mainStills = data.mainStills
  const coachStills = data.coachStills
  const igStills = data.igStills
  const gymShapes = data.gymShapes

  // Group coach and IG stills by shape.
  const extraByShape = new Map<string, { shapeId: string; stillId: string; file: string }[]>()
  for (const c of [...coachStills, ...igStills]) {
    const list = extraByShape.get(c.shapeId) ?? []
    list.push(c)
    extraByShape.set(c.shapeId, list)
  }

  const isRemoved = (stillId: string, fileName: string) =>
    removedStillIds.has(stillId) || removedCoachStillIds.has(stillId) || removedCoachStillIds.has(fileName)

  // Build the shape list in in-app order.
  const result: { id: string; name: string; urls: string[]; stillIds: string[] }[] = []

  // 1. Main shapes in learnLibraryShapes() order (exact in-app order).
  // This already excludes arm positions, scaffold, etc.
  const inAppOrder = learnLibraryShapes()
  for (const s of inAppOrder) {
    if (STUDY_EXCLUDE.has(s.id)) continue
    const files = shippedFileList(s.id)
    const pairs = files
      .map((f, i) => ({ stillId: stillIdFor(s.id, i), url: `/references/${f}`, file: f }))
      .filter((p) => !isRemoved(p.stillId, p.file))
    // Add coach-uploaded stills (now served as static files from /references/).
    for (const c of extraByShape.get(s.id) ?? []) {
      if (!removedStillIds.has(c.stillId) && !removedCoachStillIds.has(c.stillId)) {
        pairs.push({
          stillId: c.stillId,
          url: `/references/${c.file}`,
          file: c.file,
        })
      }
    }
    if (pairs.length === 0) continue
    // Main-still first.
    const mainId = mainStills[s.id]
    if (mainId) {
      const idx = pairs.findIndex((p) => p.stillId === mainId)
      if (idx > 0) {
        const [main] = pairs.splice(idx, 1)
        pairs.unshift(main!)
      }
    }
    result.push({ id: s.id, name: s.name, urls: pairs.map((p) => p.url), stillIds: pairs.map((p) => p.stillId) })
  }

  // 2. Gym shapes with stills, in gymLibrary order.
  for (const g of gymShapes) {
    if (STUDY_EXCLUDE.has(g.id)) continue
    const pairs: { stillId: string; url: string; file: string }[] = []
    // Gym shapes have no shipped files, only coach-uploaded (now in /references/).
    for (const c of extraByShape.get(g.id) ?? []) {
      if (!removedStillIds.has(c.stillId) && !removedCoachStillIds.has(c.stillId)) {
        pairs.push({
          stillId: c.stillId,
          url: `/references/${c.file}`,
          file: c.file,
        })
      }
    }
    if (pairs.length === 0) continue
    const mainId = mainStills[g.id]
    if (mainId) {
      const idx = pairs.findIndex((p) => p.stillId === mainId)
      if (idx > 0) {
        const [main] = pairs.splice(idx, 1)
        pairs.unshift(main!)
      }
    }
    result.push({ id: g.id, name: g.name, urls: pairs.map((p) => p.url), stillIds: pairs.map((p) => p.stillId) })
  }

  // Order: match the in-app Shape Library exactly.
  // The app sorts by firstPathwayTaskIndex (pathway shapes first by curriculum
  // order, then alphabetical). Apply the same sort here.
  // Gym shapes (no pathway index) go after, in their existing order.
  const sorted = [...result].sort((a, b) => {
    const ai = firstPathwayTaskIndex(a.id)
    const bi = firstPathwayTaskIndex(b.id)
    if (ai != null && bi != null) return ai - bi
    if (ai != null) return -1
    if (bi != null) return 1
    return 0 // keep original relative order for non-pathway shapes
  })
  return sorted
}
