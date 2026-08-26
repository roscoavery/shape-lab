/**
 * ============================================================================
 * CURRICULUM TASKS — ordered athlete pathway (edit this file)
 * ============================================================================
 * Each athlete works through these tasks in order.
 * Hold times: first successful completions use beginnerSeconds (5s).
 * After `masterAfterCompletions` successes, holds drop to masteredSeconds (3s).
 * Freestanding handstand uses HS_HOLD (~1s) — no 5s hold. Wall HS is homework.
 *
 * passThrough: step counts if athlete briefly hits quality (no long hold required).
 * speakCorrections: app narrates live corrections while on that step.
 */

export type TaskStepDef = {
  shapeId: string
  /** Hold required the first times through (usually 5) */
  beginnerSeconds: number
  /** Hold required after the task is mastered (usually 3) */
  masteredSeconds: number
  /**
   * If true, athlete only needs a brief quality hit — no full hold.
   * Used for lever → landing lunge “pass through” on the MC sequence.
   */
  passThrough?: boolean
  /** Speak live corrections while holding this step (great for lunges). */
  speakCorrections?: boolean
  /** Optional coach note shown under the step */
  note?: string
  /**
   * Which leg is in front for this step.
   * left = left foot forward, right = right foot forward.
   * Omit to auto-detect the better matching stance.
   */
  stance?: 'left' | 'right'
}

export type TaskDef = {
  id: string
  name: string
  description: string
  /** Previous task id that should be completed first (null = always available) */
  requiresTaskId: string | null
  steps: TaskStepDef[]
  /** How many successful finishes before switching to mastered hold times */
  masterAfterCompletions: number
}

const HOLD = {
  beginnerSeconds: 5,
  masteredSeconds: 3,
  speakCorrections: true,
} as const

/** Freestanding handstand — just hit it; do not require a 5s hold (wall HS is homework). */
const HS_HOLD = {
  beginnerSeconds: 1,
  masteredSeconds: 0.8,
  speakCorrections: true,
} as const

/**
 * Full pathway Ryan described.
 * Shape ids must exist in shapes.ts.
 */
export const CURRICULUM_TASKS: TaskDef[] = [
  {
    id: 'task_stand_clean',
    name: '1. Stand clean',
    description: 'Stand tall and clean before anything else — feet together, posture set.',
    requiresTaskId: null,
    masterAfterCompletions: 2,
    steps: [{ shapeId: 'stand_clean', ...HOLD }],
  },
  {
    id: 'task_ftos',
    name: '2. Feet together, open shoulders',
    description:
      'Feet together, straight knees, open hips, ribs in, open shoulders, chin up and neutral, straight elbows, hands to the ceiling. Often the start before pulling a passé.',
    requiresTaskId: 'task_stand_clean',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'feet_together_open_shoulders',
        ...HOLD,
        note: 'FRONT or 3/4 · feet glued · ribs in · hands to the ceiling',
      },
    ],
  },
  {
    id: 'task_arm_positions',
    name: '3. Arm positions lesson',
    description:
      'Learn the five arm shapes standing: low V back, front middle, open shoulders, T, and high V with chest out. You will reuse these on lunges next.',
    requiresTaskId: 'task_ftos',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'arms_low_v_back', ...HOLD, note: 'Side view — arms reach slightly back' },
      { shapeId: 'arms_front_middle', ...HOLD, note: 'Side view — reach forward at middle height' },
      { shapeId: 'arms_open_shoulders', ...HOLD, note: 'Arms by ears, hands to the ceiling' },
      { shapeId: 'arms_t', ...HOLD, note: 'FACE the camera — both arms out to the sides' },
      { shapeId: 'arms_high_v_chest', ...HOLD, note: 'High V, chest out — not covering the ears' },
    ],
  },
  {
    id: 'task_passe',
    name: '4. Passé',
    description:
      'Keep the FTOS lines (feet together, open shoulders, ribs in, hands to the ceiling), then pull one knee up into passé. Either knee.',
    requiresTaskId: 'task_arm_positions',
    masterAfterCompletions: 2,
    steps: [{ shapeId: 'passe', ...HOLD }],
  },
  {
    id: 'task_lunge_start',
    name: '5. Starting lunge with open shoulders',
    description:
      'Fall forward from passé into this lunge. Back heel UP, back leg STRAIGHT, back STRAIGHT, shoulders OPEN. Longer stance than the landing lunge. Cartwheels often start here (or from a mountain climber). Side view.',
    requiresTaskId: 'task_passe',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'lunge_start',
        ...HOLD,
        note: 'SIDE VIEW · heel UP · straight back leg · straight back · open shoulders',
      },
    ],
  },
  {
    id: 'task_lunge_arm_holds',
    name: '6. Lunge holds · arm positions',
    description:
      'Drill all five arm shapes on a landing-lunge stance: back heel FLAT, feet closer than a starting lunge. Cycle low V back, front middle, open shoulders, T, high V chest out.',
    requiresTaskId: 'task_lunge_start',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'lunge_arms_low_v', ...HOLD, note: 'Side view · landing stance · heel FLAT · low V' },
      { shapeId: 'lunge_arms_front', ...HOLD, note: 'Side view · landing stance · heel FLAT · arms forward middle' },
      { shapeId: 'lunge_arms_open', ...HOLD, note: 'Side view · landing stance · heel FLAT · open shoulders' },
      { shapeId: 'lunge_arms_t', ...HOLD, note: 'FACE the camera for the T · landing stance · heel FLAT' },
      { shapeId: 'lunge_arms_high_v', ...HOLD, note: 'High V, chest out · landing stance · heel FLAT' },
    ],
  },
  {
    id: 'task_lever',
    name: '7. Lever',
    description:
      'Front knee slightly bent. Chest tilts until parallel with the ground. Back leg lifts so one straight line from back foot to hands sits parallel to the floor. Open shoulders. Side view.',
    requiresTaskId: 'task_lunge_arm_holds',
    masterAfterCompletions: 2,
    steps: [{ shapeId: 'lever', ...HOLD, note: 'SIDE VIEW · slight front-knee bend · chest parallel · line back foot→hands' }],
  },
  {
    id: 'task_handstand',
    name: '8. Handstand',
    description:
      'Fully straight line, ribs in, butt in. Straight elbows, open shoulders, straight knees, pointed toes. Cover the ears (looking toward the hands is fine). Hit it — no 5s hold. Side or 3/4 view.',
    requiresTaskId: 'task_lever',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'handstand',
        ...HS_HOLD,
        note: 'SIDE or 3/4 · hit it (no 5s hold) · ribs in · ears covered · push tall',
      },
    ],
  },
  {
    id: 'task_lunge_land',
    name: '9. Landing lunge',
    description:
      'Shorter stance than the starting lunge, back heel FLAT, one line from back heel to hands. Cartwheels finish here unless a zombie landing is specified. Side view.',
    requiresTaskId: 'task_handstand',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'lunge_land',
        ...HOLD,
        note: 'SIDE VIEW · heel FLAT · shorter than starting lunge · back leg straight',
      },
    ],
  },
  {
    id: 'task_seq_ftos_lunge_lever_lunge_right',
    name: '10. Sequence (RIGHT): FTOS → Lunge → Lever → Landing lunge',
    description: 'Right foot forward through the lunge and lever. Finish in a landing lunge (heel flat, closer stance).',
    requiresTaskId: 'task_lunge_land',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'feet_together_open_shoulders', ...HOLD },
      { shapeId: 'lunge_start', ...HOLD, stance: 'right', note: 'Right foot forward · SIDE VIEW · heel UP · open shoulders' },
      { shapeId: 'lever', ...HOLD, stance: 'right', note: 'Right support leg · SIDE VIEW' },
      { shapeId: 'lunge_land', ...HOLD, stance: 'right', note: 'Finish here · right foot forward · heel FLAT · closer stance' },
    ],
  },
  {
    id: 'task_seq_ftos_lunge_lever_lunge_left',
    name: '11. Sequence (LEFT): FTOS → Lunge → Lever → Landing lunge',
    description: 'Same sequence, left foot forward. Finish in a landing lunge.',
    requiresTaskId: 'task_seq_ftos_lunge_lever_lunge_right',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'feet_together_open_shoulders', ...HOLD },
      { shapeId: 'lunge_start', ...HOLD, stance: 'left', note: 'Left foot forward · SIDE VIEW · heel UP · open shoulders' },
      { shapeId: 'lever', ...HOLD, stance: 'left', note: 'Left support leg · SIDE VIEW' },
      { shapeId: 'lunge_land', ...HOLD, stance: 'left', note: 'Finish here · left foot forward · heel FLAT · closer stance' },
    ],
  },
  {
    id: 'task_seq_ftos_passe_lunge_lever_hs_lunge_right',
    name: '12. Sequence (RIGHT): FTOS → Passé → Lunge → Lever → HS → Lunge',
    description:
      'Fall from passé into the lunge, then lever, handstand, landing lunge. Right side. Every sequence of this type finishes in the landing lunge.',
    requiresTaskId: 'task_seq_ftos_lunge_lever_lunge_left',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'feet_together_open_shoulders', ...HOLD },
      { shapeId: 'passe', ...HOLD, stance: 'right', note: 'Right stance leg (left knee up)' },
      { shapeId: 'lunge_start', ...HOLD, stance: 'right', note: 'Fall to right-foot-forward lunge · heel UP · open shoulders' },
      { shapeId: 'lever', ...HOLD, stance: 'right' },
      { shapeId: 'handstand', ...HS_HOLD, note: 'SIDE VIEW — hit it, no 5s hold' },
      { shapeId: 'lunge_land', ...HOLD, stance: 'right', note: 'Finish here · heel FLAT · closer stance' },
    ],
  },
  {
    id: 'task_seq_ftos_passe_lunge_lever_hs_lunge_left',
    name: '13. Sequence (LEFT): FTOS → Passé → Lunge → Lever → HS → Lunge',
    description: 'Same full sequence on the left side. Finish in a landing lunge.',
    requiresTaskId: 'task_seq_ftos_passe_lunge_lever_hs_lunge_right',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'feet_together_open_shoulders', ...HOLD },
      { shapeId: 'passe', ...HOLD, stance: 'left', note: 'Left stance leg (right knee up)' },
      { shapeId: 'lunge_start', ...HOLD, stance: 'left', note: 'Fall to left-foot-forward lunge · heel UP · open shoulders' },
      { shapeId: 'lever', ...HOLD, stance: 'left' },
      { shapeId: 'handstand', ...HS_HOLD, note: 'SIDE VIEW — hit it, no 5s hold' },
      { shapeId: 'lunge_land', ...HOLD, stance: 'left', note: 'Finish here · heel FLAT · closer stance' },
    ],
  },
  {
    id: 'task_c_shape',
    name: '14. C shape',
    description:
      'Tumbling C: squat, hollow rounded torso, hips under, arms reaching forward. Used to connect into a back handspring and to teach the round-off back handspring. Same C idea as mountain climber. You can pull a passé from here before a cartwheel or round-off. Back extension rolls often start from this shape.',
    requiresTaskId: 'task_seq_ftos_passe_lunge_lever_hs_lunge_left',
    masterAfterCompletions: 2,
    steps: [{ shapeId: 'c_shape', ...HOLD, note: 'SIDE VIEW · squat C, not a standing side-bend' }],
  },
  {
    id: 'task_mountain_climber',
    name: '15. Mountain climber',
    description:
      'Not a lunge: smaller step, back knee BENDS, upper body in the tumbling C. Lunges keep the back leg straight, the back straight, and the shoulders open.',
    requiresTaskId: 'task_c_shape',
    masterAfterCompletions: 2,
    steps: [{ shapeId: 'mountain_climber', ...HOLD, note: 'SIDE VIEW · back knee BENDS · C upper body — not a lunge' }],
  },
  {
    id: 'task_seq_clean_mc_hs_lever_lunge',
    name: '16. Sequence: Clean → Mountain climber → HS → Lever → Lunge',
    description:
      'Pass through the lever into the landing lunge — hit it and try to stop, but a full 3–5s lever hold is optional.',
    requiresTaskId: 'task_mountain_climber',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'stand_clean', ...HOLD },
      { shapeId: 'mountain_climber', ...HOLD },
      { shapeId: 'handstand', ...HS_HOLD },
      {
        shapeId: 'lever',
        beginnerSeconds: 1.2,
        masteredSeconds: 0.8,
        passThrough: true,
        speakCorrections: true,
        note: 'Pass through — hit lever and continue to landing lunge unless you can hold',
      },
      { shapeId: 'lunge_land', ...HOLD },
    ],
  },
]

export const CURRICULUM_BY_ID: Record<string, TaskDef> = Object.fromEntries(
  CURRICULUM_TASKS.map((t) => [t.id, t]),
)

export function getTask(id: string): TaskDef | undefined {
  return CURRICULUM_BY_ID[id]
}

/** Hold seconds for a step given how many times this task has been completed. */
export function holdSecondsForStep(
  task: TaskDef,
  step: TaskStepDef,
  completions: number,
): number {
  const mastered = completions >= task.masterAfterCompletions
  return mastered ? step.masteredSeconds : step.beginnerSeconds
}

export type TaskLockStatus = 'locked' | 'unlocked' | 'mastered'

/** Completions map: taskId → number of successful finishes. */
export function taskStatus(
  task: TaskDef,
  completionsByTask: Record<string, number>,
): TaskLockStatus {
  const completions = completionsByTask[task.id] ?? 0
  if (completions >= task.masterAfterCompletions) return 'mastered'
  if (task.requiresTaskId == null) return 'unlocked'
  const prereqDone = (completionsByTask[task.requiresTaskId] ?? 0) >= 1
  return prereqDone ? 'unlocked' : 'locked'
}

export function isTaskUnlocked(
  task: TaskDef,
  completionsByTask: Record<string, number>,
): boolean {
  return taskStatus(task, completionsByTask) !== 'locked'
}

/** First unlocked incomplete task, or last mastered if all done. */
export function suggestCurrentTaskId(
  completionsByTask: Record<string, number>,
): string {
  for (const task of CURRICULUM_TASKS) {
    const status = taskStatus(task, completionsByTask)
    if (status === 'unlocked') return task.id
  }
  return CURRICULUM_TASKS[CURRICULUM_TASKS.length - 1]?.id ?? ''
}
