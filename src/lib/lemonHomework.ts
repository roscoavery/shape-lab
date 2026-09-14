/** Homework numbers after the athlete says whether they kept up on lemons. */
export function lemonHomeworkFromCheck(input: {
  finished: boolean
  plannedSets: number
  plannedReps: number
  actualReps?: number
  nickname?: string
}): {
  chosenReps: number
  chosenSets?: number
  plannedReps: number
  plannedSets: number
  incomplete: boolean
  sourceLabel: string
} {
  const plannedSets = Math.min(5, Math.max(1, Math.floor(input.plannedSets) || 1))
  const plannedReps = Math.min(30, Math.max(1, Math.floor(input.plannedReps) || 1))
  const nickname = input.nickname?.trim() || 'Lemon squeezes'
  if (input.finished) {
    return {
      chosenReps: plannedReps,
      chosenSets: plannedSets > 1 ? plannedSets : undefined,
      plannedReps,
      plannedSets,
      incomplete: false,
      sourceLabel:
        plannedSets > 1 ? `${nickname} · ${plannedSets}×${plannedReps}` : `${nickname} · ${plannedReps}`,
    }
  }
  const actual = Math.max(0, Math.floor(Number(input.actualReps) || 0))
  return {
    chosenReps: actual,
    chosenSets: undefined,
    plannedReps,
    plannedSets,
    incomplete: true,
    sourceLabel: `${nickname} · attempt · ${actual} of ${plannedSets}×${plannedReps}`,
  }
}
