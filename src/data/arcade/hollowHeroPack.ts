/**
 * Hollow Hero presets: short bouts with real rests.
 * Bounds: bouts 2–4, seconds 3–8. No endurance-to-failure mode exists.
 * Everything here is DRAFT content.
 */

export type HollowHeroPreset = {
  id: string
  name: string
  bouts: number
  seconds: number
  restSeconds: number
}

export const HOLLOW_HERO_PRESETS: HollowHeroPreset[] = [
  { id: 'gentle', name: 'Gentle', bouts: 3, seconds: 3, restSeconds: 10 },
  { id: 'standard', name: 'Standard', bouts: 3, seconds: 5, restSeconds: 10 },
  { id: 'steady', name: 'Steady', bouts: 4, seconds: 5, restSeconds: 15 },
]
