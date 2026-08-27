/**
 * Spoken walkthroughs for curriculum tasks.
 * The trainer plays `intro` when the step starts, then `beats` while the
 * athlete is in a quality hold (when remaining time first reaches `at`).
 * `outro` plays when the hold (or grade-only tries) finish.
 */

import { getShape } from './shapes'

export type HoldBeat = {
  /** Speak when remaining hold seconds first drop to this value. */
  at: number
  text: string
}

export type StepGuide = {
  intro: string
  beats?: HoldBeat[]
  outro?: string
}

export type TaskGuide = {
  steps: Partial<Record<string, StepGuide>>
}

const FIRST_SEQ: TaskGuide = {
  steps: {
    feet_together_open_shoulders: {
      intro:
        'Feet together, open shoulders. Stay in profile — you do not need to face the camera. Arms tight by the ears. Squeeze ribs in, squeeze butt in. Chin stays up. I will count 3, 2, 1.',
    },
    passe: {
      intro: 'Pull one leg to passé and hold. I will count 3, 2, 1 and snapshot your best.',
    },
    lunge_start: {
      intro:
        'Fall to a starting lunge. When I see the lunge, open your shoulders as far as you can. I will count 3, 2, 1 and snapshot your best open.',
    },
    lever: {
      intro: 'Lever. I will count 3, 2, 1.',
    },
    lunge_land: {
      intro:
        'Landing lunge — back heel flat. When I see the lunge, open your shoulders as far as you can. I will count 3, 2, 1 and snapshot your best open.',
      outro: 'And clean.',
    },
  },
}

const HS_SEQ: TaskGuide = {
  steps: {
    ...FIRST_SEQ.steps,
    handstand: {
      intro:
        'Kick up to the best handstand you can hit, and finish in a good landing lunge. Three tries.',
    },
  },
}

const HS_PRACTICE: TaskGuide = {
  steps: {
    handstand: {
      intro:
        'Kick up to the best handstand you can hit. Three tries. We will grade the line — you do not need a perfect handstand to move on.',
    },
  },
}

export const TASK_GUIDES: Record<string, TaskGuide> = {
  task_stand_clean: {
    steps: {
      stand_clean: {
        intro: 'Stand clean. Cheer ready. Feet together, arms down by your sides — fists or blades.',
      },
    },
  },
  task_lunge_start: {
    steps: {
      lunge_start: {
        intro:
          'Show me a starting lunge. Side view. Back heel up, back leg straight, back straight. When I see the lunge, open your shoulders as far as you can. I will count 3, 2, 1.',
      },
    },
  },
  task_lunge_land: {
    steps: {
      lunge_land: {
        intro:
          'Show me a landing lunge. Side view. Back heel flat, shorter stance. When I see the lunge, open your shoulders as far as you can. I will count 3, 2, 1.',
      },
    },
  },
  task_handstand: HS_PRACTICE,
  task_seq_ftos_lunge_lever_lunge_right: FIRST_SEQ,
  task_seq_ftos_lunge_lever_lunge_left: FIRST_SEQ,
  task_seq_ftos_passe_lunge_lever_hs_lunge_right: HS_SEQ,
  task_seq_ftos_passe_lunge_lever_hs_lunge_left: HS_SEQ,
  task_mountain_climber: {
    steps: {
      mountain_climber: {
        intro:
          'Mountain climber. Take a C and step one medium step forward. Both knees bent. Reach the arms forward and out from the middle. This is a pass-through — we never finish a skill here.',
      },
    },
  },
  task_seq_clean_mc_hs_lever_lunge: {
    steps: {
      mountain_climber: {
        intro:
          'Mountain climber. Two bent knees for power. Reach forward and out. Look at where the hands will go.',
      },
      handstand: {
        intro:
          'Kick up to the best handstand you can hit, then finish through the lever into a landing lunge. Three tries on the handstand.',
      },
    },
  },
}

export function getStepGuide(taskId: string, shapeId: string): StepGuide | undefined {
  return TASK_GUIDES[taskId]?.steps[shapeId]
}

/** Full spoken cue for a step — body position first, hold instruction last. */
export function stepIntroLine(
  taskId: string,
  shapeId: string,
  holdSeconds: number,
  prefix?: string,
): string {
  const guide = getStepGuide(taskId, shapeId)
  if (guide?.intro) return [prefix, guide.intro].filter(Boolean).join(' ')
  const shape = getShape(shapeId)
  const name = shape?.name ?? 'shape'
  const body = shape?.bodyPosition ?? shape?.description ?? ''
  const hold =
    holdSeconds <= 1.05
      ? 'Hit it and keep it for a beat.'
      : holdSeconds <= 3.05
        ? "I'll count 3, 2, 1 after you hit it."
        : `After you hit it, hold ${Number.isInteger(holdSeconds) ? holdSeconds : holdSeconds.toFixed(1)} seconds.`
  return [prefix, `Show me a ${name}.`, body, hold].filter(Boolean).join(' ')
}

export function isGuidedTask(taskId: string): boolean {
  return Boolean(TASK_GUIDES[taskId])
}
