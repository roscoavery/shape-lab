import type { Condition } from '../types'

export type ConditionFile =
  | 'muscleTendon'
  | 'ankleFoot'
  | 'knee'
  | 'spinePelvis'
  | 'upper'
  | 'bone'
  | 'neuro'
  | 'impingement'
  | 'inPreparation'

export const CONDITION_FILES: ConditionFile[] = [
  'muscleTendon',
  'ankleFoot',
  'knee',
  'spinePelvis',
  'upper',
  'bone',
  'neuro',
  'impingement',
  'inPreparation',
]

/** Each region file is its own chunk so the library stays out of the main bundle. */
export const CONDITION_LOADERS: Record<ConditionFile, () => Promise<Condition[]>> = {
  muscleTendon: () => import('./muscleTendon').then((m) => m.MUSCLE_TENDON),
  ankleFoot: () => import('./ankleFoot').then((m) => m.ANKLE_FOOT),
  knee: () => import('./knee').then((m) => m.KNEE),
  spinePelvis: () => import('./spinePelvis').then((m) => m.SPINE_PELVIS),
  upper: () => import('./upper').then((m) => m.UPPER),
  bone: () => import('./bone').then((m) => m.BONE),
  neuro: () => import('./neuro').then((m) => m.NEURO),
  impingement: () => import('./impingement').then((m) => m.IMPINGEMENT),
  inPreparation: () => import('./inPreparation').then((m) => m.IN_PREPARATION),
}
