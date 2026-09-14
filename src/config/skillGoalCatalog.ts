/**
 * Athlete-facing skill hopes. Keep this short — the full skill pathway
 * (drills, pieces, power-down steps) is for coaches, not this picker.
 */

export type SkillGoalGroupId = 'standing' | 'running'

export type SkillGoalChoice = {
  id: string
  group: SkillGoalGroupId
  label: string
  /** Athlete types their own hope instead of picking a listed skill. */
  other?: boolean
  /**
   * Extra names to match against the coach skill pathway.
   * A hit links the hope to that pathway skill. A miss stays a custom
   * label and is listed on the skill-path desk — it is not added automatically.
   */
  matchNames?: string[]
}

export const SKILL_GOAL_GROUPS: { id: SkillGoalGroupId; title: string }[] = [
  { id: 'standing', title: 'Standing' },
  { id: 'running', title: 'Running' },
]

export const SKILL_GOAL_CHOICES: SkillGoalChoice[] = [
  { id: 'stand_back_bend', group: 'standing', label: 'Back bend', matchNames: ['backbend', 'back bend'] },
  { id: 'stand_bwo', group: 'standing', label: 'Back walkover', matchNames: ['back walk over'] },
  { id: 'stand_fwo', group: 'standing', label: 'Front walkover', matchNames: ['front walk over'] },
  {
    id: 'stand_bhs',
    group: 'standing',
    label: 'Back Handspring',
    matchNames: ['standing back handspring', 'standing BHS', 'back handspring', 'BHS'],
  },
  {
    id: 'stand_bhs_series',
    group: 'standing',
    label: 'Back handspring series',
    matchNames: ['standing back handspring series', 'standing BHS series'],
  },
  {
    id: 'stand_tuck',
    group: 'standing',
    label: 'Tuck',
    matchNames: ['standing back tuck', 'standing tuck', 'back tuck'],
  },
  {
    id: 'stand_full',
    group: 'standing',
    label: 'Full',
    matchNames: ['standing full', 'standing full twist'],
  },
  { id: 'stand_other', group: 'standing', label: 'Other', other: true },
  {
    id: 'run_strong_ro',
    group: 'running',
    label: 'Strong Round off',
    matchNames: ['strong round-off', 'round off', 'round-off', 'roundoff'],
  },
  {
    id: 'run_ro_bhs',
    group: 'running',
    label: 'Round off back handspring',
    matchNames: ['round-off back handspring', 'RO BHS', 'round off BHS'],
  },
  {
    id: 'run_fhs',
    group: 'running',
    label: 'Front handspring',
    matchNames: ['front handspring', 'FHS'],
  },
  {
    id: 'run_ro_series',
    group: 'running',
    label: 'Round off series (3 back handsprings)',
    matchNames: [
      'round-off back handspring series',
      'RO BHS series',
      'round off series',
      'round-off series',
    ],
  },
  {
    id: 'run_ro_hs_tuck',
    group: 'running',
    label: 'Ro hs tuck',
    matchNames: [
      'round-off handspring back tuck',
      'RO BHS tuck',
      'round off back handspring tuck',
      'ro bhs tuck',
    ],
  },
  {
    id: 'run_ro_hs_layout',
    group: 'running',
    label: 'Ro hs layout',
    matchNames: [
      'round-off handspring layout',
      'RO BHS layout',
      'round off back handspring layout',
      'ro bhs layout',
    ],
  },
  {
    id: 'run_ro_hs_full',
    group: 'running',
    label: 'Ro hs full',
    matchNames: [
      'round-off handspring full twisting layout',
      'RO BHS full',
      'round off back handspring full',
      'ro bhs full',
    ],
  },
  {
    id: 'run_ro_hs_double',
    group: 'running',
    label: 'Ro hs double full',
    matchNames: [
      'round-off handspring double full',
      'RO BHS double full',
      'ro bhs double full',
    ],
  },
  { id: 'run_arabian', group: 'running', label: 'Arabian', matchNames: ['arabian'] },
  { id: 'run_punch_front', group: 'running', label: 'Punch front', matchNames: ['punch front tuck'] },
  { id: 'run_other', group: 'running', label: 'Other', other: true },
]

export function skillGoalChoicesIn(group: SkillGoalGroupId): SkillGoalChoice[] {
  return SKILL_GOAL_CHOICES.filter((row) => row.group === group)
}

/** Collapse punctuation so “round-off” and “round off” compare equal. */
export function skillKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function labelsMatch(a: string, b: string): boolean {
  const left = skillKey(a)
  const right = skillKey(b)
  return Boolean(left) && left === right
}
