import type { Assessment, MasteryLevel } from './types.ts'

/**
 * 13 assessments. `topicIds` pull from the question bank. `size` is capped at
 * the number of available questions when a fresh attempt is drawn. Every
 * assessment passes at ASSESSMENT_PASS_PERCENT and also requires every
 * critical safety question in the draw to be answered correctly.
 */
export const ASSESSMENTS: Assessment[] = [
  { id: 'injury_fundamentals', title: 'Injury fundamentals', blurb: 'Scope of practice, load, healing.', topicIds: ['scope', 'load', 'healing'], size: 10, requiresCriticalCorrect: true },
  { id: 'tissue_anatomy', title: 'Tissue and anatomy', blurb: 'Bone, cartilage, ligament, muscle, tendon.', topicIds: ['tissues', 'muscle-tendon'], size: 8, requiresCriticalCorrect: true },
  { id: 'injury_response', title: 'Injury response and emergencies', blurb: 'Emergency plan, red flags, and what to do first.', topicIds: ['emergency', 'spine-emergency'], size: 8, requiresCriticalCorrect: true },
  { id: 'concussion', title: 'Concussion', blurb: 'Recognize, remove, refer, return gradually.', topicIds: ['concussion'], size: 6, requiresCriticalCorrect: true },
  { id: 'ankle_foot', title: 'Ankle and foot', blurb: 'Sprains, high ankle, heel pain.', topicIds: ['ankle'], size: 5, requiresCriticalCorrect: true },
  { id: 'knee_leg', title: 'Knee and leg', blurb: 'ACL, meniscus, hamstring, tendon, growth-related pain.', topicIds: ['knee', 'muscle-tendon'], size: 8, requiresCriticalCorrect: true },
  { id: 'spine_pelvis', title: 'Spine and pelvis', blurb: 'Spondylo terms, back pain, and spine emergencies.', topicIds: ['spondylo', 'spine-emergency'], size: 10, requiresCriticalCorrect: true },
  { id: 'upper_limb', title: 'Wrist and upper limb', blurb: 'Gymnast wrist, ganglion cysts, scaphoid.', topicIds: ['wrist'], size: 6, requiresCriticalCorrect: true },
  { id: 'fracture_bone', title: 'Fractures and bone', blurb: 'Fracture types, growth plates, stress injuries.', topicIds: ['fractures', 'growth'], size: 8, requiresCriticalCorrect: true },
  { id: 'return_to_tumbling', title: 'Return to tumbling', blurb: 'Ranges, ladders, and clearance.', topicIds: ['recovery'], size: 5, requiresCriticalCorrect: true },
  { id: 'movement_science', title: 'Movement science', blurb: 'Planes, joint actions, and loading concepts.', topicIds: ['planes', 'joint-actions', 'loading'], size: 12, requiresCriticalCorrect: true },
  { id: 'flexibility_stretching', title: 'Flexibility and stretching', blurb: 'Methods, power, splits, hypermobility.', topicIds: ['stretch-methods', 'stretch-power', 'splits-hyper'], size: 12, requiresCriticalCorrect: true },
  {
    id: 'comprehensive',
    title: 'Comprehensive review',
    blurb: 'A mixed set across every module.',
    topicIds: [
      'scope', 'load', 'healing', 'tissues', 'muscle-tendon', 'emergency', 'spine-emergency', 'concussion', 'ankle', 'knee',
      'spondylo', 'wrist', 'fractures', 'growth', 'recovery', 'planes', 'joint-actions', 'loading', 'stretch-methods', 'stretch-power', 'splits-hyper',
    ],
    size: 30,
    requiresCriticalCorrect: true,
  },
]

export function assessmentById(id: string): Assessment | undefined {
  return ASSESSMENTS.find((a) => a.id === id)
}

/** Internal ShapeLab milestones. See MASTERY_DISCLAIMER. */
export const MASTERY_LEVELS: MasteryLevel[] = [
  { id: 'foundations', label: 'Foundations', requires: ['injury_fundamentals', 'injury_response', 'concussion'], blurb: 'Knows the coach role and the first response.' },
  { id: 'working', label: 'Working knowledge', requires: ['injury_fundamentals', 'injury_response', 'concussion', 'tissue_anatomy', 'ankle_foot', 'knee_leg', 'return_to_tumbling'], blurb: 'Adds tissue basics, common lower body injuries, and return talk.' },
  { id: 'proficient', label: 'Proficient', requires: ['injury_fundamentals', 'injury_response', 'concussion', 'tissue_anatomy', 'ankle_foot', 'knee_leg', 'return_to_tumbling', 'spine_pelvis', 'upper_limb', 'fracture_bone'], blurb: 'Adds spine, wrist, and bone injuries.' },
  { id: 'advanced', label: 'Advanced', requires: ['injury_fundamentals', 'injury_response', 'concussion', 'tissue_anatomy', 'ankle_foot', 'knee_leg', 'return_to_tumbling', 'spine_pelvis', 'upper_limb', 'fracture_bone', 'movement_science', 'flexibility_stretching', 'comprehensive'], blurb: 'Every assessment passed, including movement, stretching, and the comprehensive review.' },
]

export function masteryFor(passed: ReadonlySet<string>): MasteryLevel | null {
  let best: MasteryLevel | null = null
  for (const lvl of MASTERY_LEVELS) {
    if (lvl.requires.every((r) => passed.has(r))) best = lvl
  }
  return best
}
