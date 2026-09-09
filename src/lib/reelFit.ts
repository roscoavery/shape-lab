/**
 * Reference / reel fill: 9:16 portraits cover the screen. Square and
 * landscape stay contain so the full width stays visible (letterboxed).
 */

export function isPortraitReel(width: number, height: number): boolean {
  if (!(width > 0) || !(height > 0)) return false
  const ratio = height / width
  return ratio >= 1.55 && ratio <= 2.15
}

export function reelObjectFit(
  width: number,
  height: number,
): 'cover' | 'contain' {
  return isPortraitReel(width, height) ? 'cover' : 'contain'
}
