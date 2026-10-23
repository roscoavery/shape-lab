import type { Claim, Evidence, RecoveryRange } from './types'

/** Short authoring helpers so content files stay readable. */
export function c(text: string, evidence: Evidence, ...sourceIds: string[]): Claim {
  return { text, evidence, sourceIds }
}

/** ShapeLab coaching conduct rule. Not a medical claim. */
export function pol(text: string): Claim {
  return { text, evidence: 'policy', sourceIds: [] }
}

export function unk(text: string, ...sourceIds: string[]): Claim {
  return { text, evidence: 'uncertain', sourceIds }
}

export function range(
  text: string,
  sourceIds: string[],
  opts: { min?: number; max?: number; uncertain?: boolean; note?: string } = {},
): RecoveryRange {
  return {
    text,
    sourceIds,
    minWeeks: opts.min,
    maxWeeks: opts.max,
    uncertain: opts.uncertain ?? false,
    note: opts.note,
  }
}

/** Shared, source-free conduct lines every card can reuse. */
export const STD_DO_NOT: Claim[] = [
  pol('Do not diagnose the injury or tell the athlete or parent what it "is".'),
  pol('Do not test, stress, or "try out" the injured area to see if it is okay.'),
  pol('Do not tell an athlete to push through pain that is sharp, getting worse, or changing how they move.'),
  pol('Do not clear an athlete to return. That decision belongs to a qualified clinician.'),
]
