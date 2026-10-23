/**
 * Homework catalog id to the Coach Ed lesson that teaches it. Kept tiny and
 * separate from exercises.ts so the homework screen does not pull the
 * education content into the main bundle. The validator checks it matches.
 */
export const CATALOG_SCIENCE_LESSON: Record<string, string> = {
  poliquin_step: 'trn-knees-over-toes',
  split_squat: 'trn-knees-over-toes',
  slantboard_squat: 'trn-knees-over-toes',
  sissy_squat: 'trn-knees-over-toes',
  back_extension: 'trn-exercise-evidence',
  nordic_hamstring: 'trn-exercise-evidence',
  sled_push: 'trn-exercise-evidence',
  sled_pull: 'trn-exercise-evidence',
  backward_walk: 'trn-exercise-evidence',
}

export function scienceLessonFor(catalogId: string): string | undefined {
  return CATALOG_SCIENCE_LESSON[catalogId]
}
