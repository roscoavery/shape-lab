/**
 * Still selection for the public pages, mirroring the study link
 * (PublicLibraryPage) exactly: shipped stills minus Ryan's deletions, plus
 * his coach/IG uploads, with his picked main still first. The intake link
 * used to read the raw shipped file list, so a deleted shipped still kept
 * showing and a picked upload never did.
 *
 * The shipped file list is passed in by the caller: shippedRefs cannot be
 * imported under tsx (import.meta.glob), and this logic must stay unit
 * tested. Callers in the Vite bundle pass shippedFileList(shapeId).
 */

export type PublicStillEntry = { shapeId: string; stillId: string; file: string }

export type PublicStillData = {
  mainStills: Record<string, string>
  removedStillIds: string[]
  removedCoachStillIds: string[]
  coachStills: PublicStillEntry[]
  igStills: PublicStillEntry[]
}

export type PublicStillPair = { stillId: string; url: string }

function shippedStillId(shapeId: string, fileIndex: number): string {
  return `default_${shapeId}_${fileIndex}`
}

/** Ordered, displayable stills for one shape on a public page. Empty when every still for the shape is deleted. */
export function publicShapeStillPairs(
  shapeId: string,
  shippedFiles: string[],
  data: PublicStillData,
): PublicStillPair[] {
  const removedStillIds = new Set(data.removedStillIds)
  const removedCoachStillIds = new Set(data.removedCoachStillIds)
  const isRemoved = (stillId: string, fileName: string) =>
    removedStillIds.has(stillId) ||
    removedCoachStillIds.has(stillId) ||
    removedCoachStillIds.has(fileName)

  const pairs: PublicStillPair[] = []
  shippedFiles.forEach((file, i) => {
    const stillId = shippedStillId(shapeId, i)
    if (isRemoved(stillId, file)) return
    pairs.push({ stillId, url: `/references/${file}` })
  })
  for (const c of [...data.coachStills, ...data.igStills]) {
    if (c.shapeId !== shapeId) continue
    if (removedStillIds.has(c.stillId) || removedCoachStillIds.has(c.stillId)) continue
    pairs.push({ stillId: c.stillId, url: `/references/${c.file}` })
  }
  const mainId = data.mainStills[shapeId]
  if (mainId) {
    const idx = pairs.findIndex((p) => p.stillId === mainId)
    if (idx > 0) {
      const [main] = pairs.splice(idx, 1)
      pairs.unshift(main!)
    }
  }
  return pairs
}

/** First displayable still for a shape, or null when none survives deletion. */
export function publicShapeStillUrl(
  shapeId: string,
  shippedFiles: string[],
  data: PublicStillData,
): string | null {
  return publicShapeStillPairs(shapeId, shippedFiles, data)[0]?.url ?? null
}
