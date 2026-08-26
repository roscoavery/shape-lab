/**
 * ============================================================================
 * CURRICULUM TASKS — ordered athlete pathway (edit this file)
 * ============================================================================
 * Each athlete works through these tasks in order.
 * Hold times: first successful completions of a *standalone* shape use
 * beginnerSeconds (5s). After `masterAfterCompletions` successes, holds drop
 * to masteredSeconds (3s). Multi-shape sequences always use 3s holds so the
 * athlete can flow. Starting and landing lunges use a 3s open-shoulder
 * snapshot window after the lunge is recognized. Freestanding handstand is
 * grade-only (3 kick-up tries) — it does not gate the pathway.
 *
 * Standing arm-position drills and landing-lunge arm holds (low V, T, front
 * middle, high V) are parked out of Tasks for now. They live in Learn as
 * the Arm positions test and can be put back on the pathway later.
 *
 * passThrough: step counts if athlete briefly hits quality (no long hold required).
 * gradeOnly: scored in the analysis, not required to advance.
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
  /**
   * Score this shape in the task analysis, but do not require a quality
   * hold to advance. Used for freestanding handstand (too hard to gate).
   */
  gradeOnly?: boolean
  /** Kick-up attempts before moving on (grade-only steps). Default 3. */
  tries?: number
  /** Seconds to watch each kick-up try. Default 10. */
  trySeconds?: number
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
  /**
   * Stay in profile — do not require facing the camera.
   * Used for FTOS as the first step of a lunge/lever sequence.
   */
  profileOk?: boolean
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

/** Sequence steps — 3s every time, including the first pass. */
const SEQ_HOLD = {
  beginnerSeconds: 3,
  masteredSeconds: 3,
  speakCorrections: true,
} as const

/** Starting / landing lunge: 3s to open shoulders after the lunge is recognized. */
const LUNGE_WINDOW = {
  beginnerSeconds: 3,
  masteredSeconds: 3,
  speakCorrections: false,
} as const

/**
 * Freestanding handstand — grade whatever they hit, do not gate the pathway.
 * Three kick-up tries, then move on. Wall HS stays on homework.
 */
const HS_TRY = {
  beginnerSeconds: 0,
  masteredSeconds: 0,
  gradeOnly: true,
  tries: 3,
  trySeconds: 10,
  speakCorrections: false,
  note: '3 tries · best kick-up is graded · does not block moving on',
} as const

/** Passé hold in the spoken lunge–lever–handstand walkthrough (3…2). */
const PASSE_HOLD = {
  beginnerSeconds: 3,
  masteredSeconds: 3,
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
    description: 'Stand in the frame with feet together and arms down. Once we see that, we move on.',
    requiresTaskId: null,
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'stand_clean',
        beginnerSeconds: 0.45,
        masteredSeconds: 0.45,
        speakCorrections: false,
        profileOk: true,
        note: 'Feet together, arms down — once we see you, we move on',
      },
    ],
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
    id: 'task_passe',
    name: '3. Passé',
    description:
      'Keep the FTOS lines (feet together, open shoulders, ribs in, hands to the ceiling), then pull one knee up into passé. Either knee.',
    requiresTaskId: 'task_ftos',
    masterAfterCompletions: 2,
    steps: [{ shapeId: 'passe', ...HOLD }],
  },
  {
    id: 'task_lunge_start',
    name: '4. Starting lunge with open shoulders',
    description:
      'Fall forward from passé into this lunge. Back heel UP, back leg STRAIGHT, back STRAIGHT, shoulders OPEN. Longer stance than the landing lunge. Cartwheels often start here (or from a mountain climber). Side view.',
    requiresTaskId: 'task_passe',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'lunge_start',
        ...LUNGE_WINDOW,
        note: 'SIDE VIEW · find the lunge, then open shoulders and count 3-2-1',
      },
    ],
  },
  {
    id: 'task_lever',
    name: '5. Lever',
    description:
      'Front knee slightly bent. Chest tilts until parallel with the ground. Back leg lifts so one straight line from back foot to hands sits parallel to the floor. Open shoulders. Side view.',
    requiresTaskId: 'task_lunge_start',
    masterAfterCompletions: 2,
    steps: [{ shapeId: 'lever', ...HOLD, note: 'SIDE VIEW · slight front-knee bend · chest parallel · line back foot→hands' }],
  },
  {
    id: 'task_handstand',
    name: '6. Handstand (practice)',
    description:
      'Kick up to the best handstand you can. Three tries. We grade the line you hit — ribs in, butt in, ears covered — but you do not need a perfect handstand to move on. Wall handstand stays on Homework.',
    requiresTaskId: 'task_lever',
    masterAfterCompletions: 1,
    steps: [
      {
        shapeId: 'handstand',
        ...HS_TRY,
        note: 'SIDE or 3/4 · 3 kick-up tries · graded, not required',
      },
    ],
  },
  {
    id: 'task_lunge_land',
    name: '7. Landing lunge',
    description:
      'Shorter stance than the starting lunge, back heel FLAT, one line from back heel to hands. Usual cartwheels finish here. Cartwheel step-ins (round-off prep) finish in a zombie. Side view.',
    requiresTaskId: 'task_handstand',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'lunge_land',
        ...LUNGE_WINDOW,
        note: 'SIDE VIEW · find the lunge, then open shoulders and count 3-2-1',
      },
    ],
  },
  {
    id: 'task_seq_ftos_lunge_lever_lunge_right',
    name: '8. Sequence (RIGHT): FTOS → Passé → Starting lunge → Lever → Landing lunge',
    description:
      'Right side: feet together open shoulders, pull passé, fall to a starting lunge, lever, finish in a landing lunge (heel flat, closer stance).',
    requiresTaskId: 'task_lunge_land',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'feet_together_open_shoulders',
        ...SEQ_HOLD,
        profileOk: true,
        note: 'Stay in profile — do not turn to face the camera · arms by ears · ribs in',
      },
      { shapeId: 'passe', ...PASSE_HOLD, stance: 'right', note: 'Pull one leg to passé · hold 3' },
      { shapeId: 'lunge_start', ...LUNGE_WINDOW, stance: 'right', note: 'Fall to starting lunge · right foot forward · open and count 3-2-1' },
      { shapeId: 'lever', ...SEQ_HOLD, stance: 'right', note: 'Right support leg · SIDE VIEW' },
      { shapeId: 'lunge_land', ...LUNGE_WINDOW, stance: 'right', note: 'Finish here · right foot forward · find the lunge, then open and count 3-2-1' },
    ],
  },
  {
    id: 'task_seq_ftos_lunge_lever_lunge_left',
    name: '9. Sequence (LEFT): FTOS → Passé → Starting lunge → Lever → Landing lunge',
    description: 'Same sequence, left side. FTOS, passé, starting lunge, lever, landing lunge.',
    requiresTaskId: 'task_seq_ftos_lunge_lever_lunge_right',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'feet_together_open_shoulders',
        ...SEQ_HOLD,
        profileOk: true,
        note: 'Stay in profile — do not turn to face the camera · arms by ears · ribs in',
      },
      { shapeId: 'passe', ...PASSE_HOLD, stance: 'left', note: 'Pull one leg to passé · hold 3' },
      { shapeId: 'lunge_start', ...LUNGE_WINDOW, stance: 'left', note: 'Fall to starting lunge · left foot forward · open and count 3-2-1' },
      { shapeId: 'lever', ...SEQ_HOLD, stance: 'left', note: 'Left support leg · SIDE VIEW' },
      { shapeId: 'lunge_land', ...LUNGE_WINDOW, stance: 'left', note: 'Finish here · left foot forward · find the lunge, then open and count 3-2-1' },
    ],
  },
  {
    id: 'task_seq_ftos_passe_lunge_lever_hs_lunge_right',
    name: '10. Sequence (RIGHT): FTOS → Passé → Lunge → Lever → HS → Lunge',
    description:
      'Spoken walkthrough: FTOS, passé, starting lunge, lever, then kick up to the best handstand you can (3 tries) and finish in a landing lunge. Required to move on: FTOS, starting lunge, lever, landing lunge. Handstand is graded in the analysis, not a gate. Right side.',
    requiresTaskId: 'task_seq_ftos_lunge_lever_lunge_left',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'feet_together_open_shoulders',
        ...SEQ_HOLD,
        profileOk: true,
        note: 'Stay in profile · arms tight by the ears · ribs in · butt in · chin up',
      },
      { shapeId: 'passe', ...PASSE_HOLD, stance: 'right', note: 'Pull one leg to passé · hold 3' },
      { shapeId: 'lunge_start', ...LUNGE_WINDOW, stance: 'right', note: 'Fall to lunge · then open shoulders and count 3-2-1' },
      { shapeId: 'lever', ...SEQ_HOLD, stance: 'right', note: 'Lever hold 3' },
      { shapeId: 'handstand', ...HS_TRY, note: 'Best kick-up of 3 · not required to pass' },
      { shapeId: 'lunge_land', ...LUNGE_WINDOW, stance: 'right', note: 'Finish here · then open shoulders and count 3-2-1' },
    ],
  },
  {
    id: 'task_seq_ftos_passe_lunge_lever_hs_lunge_left',
    name: '11. Sequence (LEFT): FTOS → Passé → Lunge → Lever → HS → Lunge',
    description:
      'Same spoken walkthrough on the left side. Required: FTOS, starting lunge, lever, landing lunge. Handstand is 3 graded tries, not a gate.',
    requiresTaskId: 'task_seq_ftos_passe_lunge_lever_hs_lunge_right',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'feet_together_open_shoulders',
        ...SEQ_HOLD,
        profileOk: true,
        note: 'Stay in profile · arms tight by the ears · ribs in · butt in · chin up',
      },
      { shapeId: 'passe', ...PASSE_HOLD, stance: 'left', note: 'Pull one leg to passé · hold 3' },
      { shapeId: 'lunge_start', ...LUNGE_WINDOW, stance: 'left', note: 'Fall to lunge · then open shoulders and count 3-2-1' },
      { shapeId: 'lever', ...SEQ_HOLD, stance: 'left', note: 'Lever hold 3' },
      { shapeId: 'handstand', ...HS_TRY, note: 'Best kick-up of 3 · not required to pass' },
      { shapeId: 'lunge_land', ...LUNGE_WINDOW, stance: 'left', note: 'Finish here · then open shoulders and count 3-2-1' },
    ],
  },
  {
    id: 'task_c_shape',
    name: '12. C shape',
    description:
      'Tumbling C: squat, hollow rounded torso, hips under, arms reaching forward. Used to connect into a back handspring and to teach the round-off back handspring. Same C idea as mountain climber. You can pull a passé from here before a cartwheel or round-off. Back extension rolls often start from this shape.',
    requiresTaskId: 'task_seq_ftos_passe_lunge_lever_hs_lunge_left',
    masterAfterCompletions: 2,
    steps: [{ shapeId: 'c_shape', ...HOLD, note: 'SIDE VIEW · squat C, not a standing side-bend' }],
  },
  {
    id: 'task_mountain_climber',
    name: '13. Mountain climber',
    description:
      'C plus one medium step — or a lunge with the back knee bent and a C upper body. Two bent knees for power. Reach from the middle out. Pass-through for handstands, cartwheels, round-offs, and aerials. We never finish a skill here.',
    requiresTaskId: 'task_c_shape',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'mountain_climber',
        ...HOLD,
        note: 'SIDE VIEW · C + medium step · both knees bent · reach from the middle out',
      },
    ],
  },
  {
    id: 'task_seq_clean_mc_hs_lever_lunge',
    name: '14. Sequence: Clean → Mountain climber → HS → Lever → Lunge',
    description:
      'Pass through mountain climber (look at where the hands will go), kick up, then pass through the lever into the landing lunge. Never finish in the mountain climber. A full 3–5s lever hold is optional.',
    requiresTaskId: 'task_mountain_climber',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'stand_clean', ...SEQ_HOLD },
      {
        shapeId: 'mountain_climber',
        ...SEQ_HOLD,
        note: 'Pass through · look at where the hands will go',
      },
      { shapeId: 'handstand', ...HS_TRY, note: '3 kick-up tries · graded, not required' },
      {
        shapeId: 'lever',
        beginnerSeconds: 1.2,
        masteredSeconds: 0.8,
        passThrough: true,
        speakCorrections: true,
        note: 'Pass through — hit lever and continue to landing lunge unless you can hold',
      },
      { shapeId: 'lunge_land', ...LUNGE_WINDOW },
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
  skippedTaskIds: string[] = [],
): TaskLockStatus {
  const completions = completionsByTask[task.id] ?? 0
  if (completions >= task.masterAfterCompletions) return 'mastered'
  if (task.requiresTaskId == null) return 'unlocked'
  const prereqId = task.requiresTaskId
  const prereqDone =
    (completionsByTask[prereqId] ?? 0) >= 1 || skippedTaskIds.includes(prereqId)
  return prereqDone ? 'unlocked' : 'locked'
}

export function isTaskUnlocked(
  task: TaskDef,
  completionsByTask: Record<string, number>,
  skippedTaskIds: string[] = [],
): boolean {
  return taskStatus(task, completionsByTask, skippedTaskIds) !== 'locked'
}

/** First unlocked incomplete task (skipped tasks are not re-suggested). */
export function suggestCurrentTaskId(
  completionsByTask: Record<string, number>,
  skippedTaskIds: string[] = [],
): string {
  for (const task of CURRICULUM_TASKS) {
    const status = taskStatus(task, completionsByTask, skippedTaskIds)
    if (status === 'unlocked' && !skippedTaskIds.includes(task.id)) return task.id
    if (status === 'unlocked' && (completionsByTask[task.id] ?? 0) > 0) return task.id
  }
  return CURRICULUM_TASKS[CURRICULUM_TASKS.length - 1]?.id ?? ''
}
