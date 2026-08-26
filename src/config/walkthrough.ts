/**
 * Spoken walkthroughs for curriculum tasks.
 * The trainer plays `intro` when the step starts, then `beats` while the
 * athlete is in a quality hold (when remaining time first reaches `at`).
 * `outro` plays when the hold (or grade-only tries) finish.
 */

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

const HS_SEQ: TaskGuide = {
  steps: {
    feet_together_open_shoulders: {
      intro:
        'Feet together, open shoulders. Arms tight by the ears. Squeeze ribs in, squeeze butt in. Chin stays up.',
    },
    passe: {
      intro: 'Pull one leg to passé and hold.',
      beats: [
        { at: 3, text: '3' },
        { at: 2, text: '2' },
      ],
    },
    lunge_start: {
      intro: 'Fall to lunge and hold.',
      beats: [
        { at: 5, text: '5' },
        { at: 4, text: '4' },
        { at: 3, text: '3' },
        { at: 2, text: '2' },
      ],
    },
    lever: {
      intro: 'Lever. Hold.',
      beats: [
        { at: 5, text: '5' },
        { at: 4, text: '4' },
        { at: 3, text: '3' },
        { at: 2, text: '2' },
      ],
    },
    handstand: {
      intro:
        'Kick up to the best handstand you can hit, and finish in a good landing lunge. Three tries.',
    },
    lunge_land: {
      intro: 'Landing lunge. Hold. Back foot flat.',
      beats: [
        { at: 5, text: 'Hold for 5. With your back foot flat.' },
        { at: 4, text: '4. Arms in open shoulders.' },
        { at: 3, text: '3. Chest stays tilted forward.' },
        { at: 2, text: '2. Chin stays up.' },
      ],
      outro: 'And clean.',
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
  task_handstand: HS_PRACTICE,
  task_seq_ftos_passe_lunge_lever_hs_lunge_right: HS_SEQ,
  task_seq_ftos_passe_lunge_lever_hs_lunge_left: HS_SEQ,
  task_seq_clean_mc_hs_lever_lunge: {
    steps: {
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

export function isGuidedTask(taskId: string): boolean {
  return Boolean(TASK_GUIDES[taskId])
}
