/**
 * Pack collage tiles so video frames share an edge instead of sitting in
 * letterboxed cells with black gutters between them.
 */

export const DEFAULT_CLIP_ASPECT = 9 / 16

export type GridSize = { cols: number; rows: number }

export type PackedGrid = {
  width: number
  height: number
  cellWidth: number
  cellHeight: number
}

export type PackedRect = { x: number; y: number; w: number; h: number }

export function medianAspect(aspects: number[]): number {
  const nums = aspects.filter((a) => a > 0.05 && a < 20)
  if (!nums.length) return DEFAULT_CLIP_ASPECT
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Prefer the orientation most clips share so those tiles fill their cells. */
export function collageCellAspect(aspects: number[]): number {
  const ok = aspects.filter((a) => a > 0.05 && a < 20)
  if (!ok.length) return DEFAULT_CLIP_ASPECT
  const portrait = ok.filter((a) => a <= 1)
  const landscape = ok.filter((a) => a > 1)
  const group =
    portrait.length >= landscape.length
      ? portrait.length
        ? portrait
        : ok
      : landscape
  return medianAspect(group)
}

export function packedGridSize(
  grid: GridSize,
  cellAspect: number,
  maxWidth: number,
  maxHeight: number,
): PackedGrid {
  const cols = Math.max(1, grid.cols)
  const rows = Math.max(1, grid.rows)
  const aspect = Math.max(0.05, cellAspect)
  const gridAspect = (cols * aspect) / rows
  let width = maxWidth
  let height = width / gridAspect
  if (height > maxHeight) {
    height = maxHeight
    width = height * gridAspect
  }
  return {
    width,
    height,
    cellWidth: width / cols,
    cellHeight: height / rows,
  }
}

/**
 * Pick the cols x rows arrangement that puts the most video pixels on the
 * given area. A fixed portrait/landscape rule can leave half the screen
 * black (e.g. six portrait clips in 2x3 on a portrait iPad pack into a narrow
 * column, while 3x2 nearly fills it).
 */
export function bestGridFit(
  count: number,
  cellAspect: number,
  maxWidth: number,
  maxHeight: number,
): GridSize {
  const n = Math.max(1, Math.round(count))
  const viewAspect = maxWidth / Math.max(1, maxHeight)
  let best: GridSize = { cols: 1, rows: n }
  let bestScore = -1
  let bestAspectDiff = Infinity
  for (let cols = 1; cols <= n; cols += 1) {
    const rows = Math.ceil(n / cols)
    const packed = packedGridSize({ cols, rows }, cellAspect, maxWidth, maxHeight)
    // Video pixels on screen; empty cells don't count.
    const score = n * packed.cellWidth * packed.cellHeight
    const gridAspect = (cols * Math.max(0.05, cellAspect)) / rows
    const aspectDiff = Math.abs(gridAspect - viewAspect)
    if (score > bestScore + 1 || (Math.abs(score - bestScore) <= 1 && aspectDiff < bestAspectDiff)) {
      bestScore = score
      bestAspectDiff = aspectDiff
      best = { cols, rows }
    }
  }
  return best
}

export function packedCellRects(
  count: number,
  grid: GridSize,
  cellAspect: number,
  canvasWidth: number,
  canvasHeight: number,
): PackedRect[] {
  const packed = packedGridSize(grid, cellAspect, canvasWidth, canvasHeight)
  const ox = (canvasWidth - packed.width) / 2
  const oy = (canvasHeight - packed.height) / 2
  const spanLast = count === 5 && grid.cols === 2
  const out: PackedRect[] = []
  for (let i = 0; i < count; i += 1) {
    if (spanLast && i === count - 1) {
      const row = Math.floor(i / grid.cols)
      out.push({
        x: ox,
        y: oy + row * packed.cellHeight,
        w: packed.width,
        h: packed.cellHeight,
      })
    } else {
      out.push({
        x: ox + (i % grid.cols) * packed.cellWidth,
        y: oy + Math.floor(i / grid.cols) * packed.cellHeight,
        w: packed.cellWidth,
        h: packed.cellHeight,
      })
    }
  }
  return out
}
