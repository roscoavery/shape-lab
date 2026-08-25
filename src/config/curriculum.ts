/**
 * ============================================================================
 * CURRICULUM TASKS — ordered athlete pathway (edit this file)
 * ============================================================================
 * Each athlete works through these tasks in order.
 * Hold times: first successful completions use beginnerSeconds (5s).
 * After `masterAfterCompletions` successes, holds drop to masteredSeconds (3s).
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
    steps: [
      {
        shapeId: 'stand_clean',
        beginnerSeconds: 5,
        masteredSeconds: 3,
        speakCorrections: true,
      },
    ],
  },
  {
    id: 'task_ftos',
    name: '2. Feet together, open shoulders',
    description:
      'Straight knees, open hips, open shoulders, straight elbows, hands reaching to the ceiling.',
    requiresTaskId: 'task_stand_clean',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'feet_together_open_shoulders',
        beginnerSeconds: 5,
        masteredSeconds: 3,
        speakCorrections: true,
      },
    ],
  },
  {
    id: 'task_passe',
    name: '3. Passé',
    description:
      'Keep feet-together open-shoulders lines, then pull one knee up into passé.',
    requiresTaskId: 'task_ftos',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'passe',
        beginnerSeconds: 5,
        masteredSeconds: 3,
        speakCorrections: true,
      },
    ],
  },
  {
    id: 'task_lunge_start',
    name: '4. Starting lunge',
    description:
      'Fall forward from passé into a lunge and hold long enough to fix it. Back heel stays UP.',
    requiresTaskId: 'task_passe',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'lunge_start',
        beginnerSeconds: 5,
        masteredSeconds: 3,
        speakCorrections: true,
        note: 'Back leg straight · chest tilts for one line foot→hands · shoulders open · chin up · arms by ears · heel up',
      },
    ],
  },
  {
    id: 'task_lever',
    name: '5. Lever',
    description:
      'Weight on the bent front foot. Chest tilts until parallel with the ground. Open shoulders. Straight line back foot → hands.',
    requiresTaskId: 'task_lunge_start',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'lever',
        beginnerSeconds: 5,
        masteredSeconds: 3,
        speakCorrections: true,
      },
    ],
  },
  {
    id: 'task_handstand',
    name: '6. Handstand',
    description: 'Match Handstand Lab quality — stacked, open shoulders, tight body line.',
    requiresTaskId: 'task_lever',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'handstand',
        beginnerSeconds: 5,
        masteredSeconds: 3,
        speakCorrections: true,
      },
    ],
  },
  {
    id: 'task_lunge_land',
    name: '7. Landing lunge',
    description:
      'Like the starting lunge, but back foot steps ~8 inches closer and the back heel is FLAT (no collapsed arch).',
    requiresTaskId: 'task_handstand',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'lunge_land',
        beginnerSeconds: 5,
        masteredSeconds: 3,
        speakCorrections: true,
        note: 'Heel flat · back leg straight · line from back foot to hands',
      },
    ],
  },
  {
    id: 'task_seq_ftos_passe_lunge_lever_lunge',
    name: '8. Sequence: FTOS → Passé → Lunge → Lever → Lunge',
    description: 'Link the setup shapes into one continuous sequence.',
    requiresTaskId: 'task_lunge_land',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'feet_together_open_shoulders', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      { shapeId: 'passe', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      { shapeId: 'lunge_start', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      { shapeId: 'lever', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      { shapeId: 'lunge_land', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
    ],
  },
  {
    id: 'task_seq_ftos_passe_lunge_lever_hs_lunge',
    name: '9. Sequence: FTOS → Passé → Lunge → Lever → Handstand → Lunge',
    description: 'Same pathway with handstand before the landing lunge.',
    requiresTaskId: 'task_seq_ftos_passe_lunge_lever_lunge',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'feet_together_open_shoulders', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      { shapeId: 'passe', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      { shapeId: 'lunge_start', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      { shapeId: 'lever', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      { shapeId: 'handstand', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      { shapeId: 'lunge_land', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
    ],
  },
  {
    id: 'task_c_shape',
    name: '10. C shape',
    description: 'Learn a clean C shape after the FTOS–HS pathway is solid.',
    requiresTaskId: 'task_seq_ftos_passe_lunge_lever_hs_lunge',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'c_shape', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
    ],
  },
  {
    id: 'task_mountain_climber',
    name: '11. Mountain climber',
    description:
      'Smaller step than a lunge. Upper body in a C shape. Back leg bends.',
    requiresTaskId: 'task_c_shape',
    masterAfterCompletions: 2,
    steps: [
      {
        shapeId: 'mountain_climber',
        beginnerSeconds: 5,
        masteredSeconds: 3,
        speakCorrections: true,
      },
    ],
  },
  {
    id: 'task_seq_clean_mc_hs_lever_lunge',
    name: '12. Sequence: Clean → Mountain climber → HS → Lever → Lunge',
    description:
      'Pass through the lever into the landing lunge — hit it and try to stop, but a full 3–5s lever hold is optional.',
    requiresTaskId: 'task_mountain_climber',
    masterAfterCompletions: 2,
    steps: [
      { shapeId: 'stand_clean', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      { shapeId: 'mountain_climber', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      { shapeId: 'handstand', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
      {
        shapeId: 'lever',
        beginnerSeconds: 1.2,
        masteredSeconds: 0.8,
        passThrough: true,
        speakCorrections: true,
        note: 'Pass through — hit lever and continue to landing lunge unless you can hold',
      },
      { shapeId: 'lunge_land', beginnerSeconds: 5, masteredSeconds: 3, speakCorrections: true },
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
