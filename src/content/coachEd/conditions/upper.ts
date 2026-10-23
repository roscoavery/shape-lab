import type { Condition } from '../types'
import { c, pol, range, unk, STD_DO_NOT } from '../author'

const WRIST_RED = [
  c('Deformity, numbness, a pale or cold hand, or inability to move the fingers after a fall needs emergency care.', 'consensus', 'orthoinfo-fractures'),
  c('Pain at the base of the thumb in the "snuffbox" after a fall on the hand, or any wrist pain that continues after a fall, needs a clinician, because a scaphoid fracture can look like a sprain and may not show on early X-rays.', 'review', 'scaphoid-predictors-2012', 'orthoinfo-scaphoid'),
  c('Wrist pain that persists in a growing gymnast, especially on weight bearing, needs evaluation for a growth plate stress injury.', 'review', 'gymnast-wrist-2006', 'gymnast-wrist-webb-2008'),
]

export const UPPER: Condition[] = [
  {
    id: 'gymnast-wrist',
    name: "Gymnast's wrist (distal radius growth plate stress injury)",
    aliases: ['gymnast wrist', 'distal radial physeal stress syndrome', 'wrist growth plate overuse'],
    regions: ['upper_limb', 'bone'],
    tissues: ['growth_plate', 'bone'],
    tags: ['wrist', 'weight bearing', 'handstand', 'overuse', 'growth', 'vault', 'cartwheel', 'back handspring'],
    urgency: 'soon',
    completeness: 'complete',
    review: 'draft',
    related: ['ganglion-cyst', 'scaphoid-fracture', 'growth-plate-fracture', 'stress-fracture'],
    mediaIds: [],
    card: {
      summary: c(
        "Gymnast's wrist is wrist pain from repeated weight-bearing on the hands. In growing gymnasts it can mean stress on the growth plate at the end of the forearm bone (distal radius). It is an overuse injury and it needs a clinician, not just rest and wrist wraps.",
        'review',
        'gymnast-wrist-2006',
        'gymnast-wrist-webb-2008',
        'wrist-overuse-sr-2015',
      ),
      structures: [
        c('Distal radial growth plate (physis), the end of the radius near the wrist; also the ulnar side of the wrist and the small wrist bones.', 'review', 'gymnast-wrist-webb-2008', 'gymnast-wrist-2006'),
      ],
      mechanism: [
        c('Repetitive axial compression, hyperextension, and twisting of the wrist during weight bearing, as in handsprings, vault, handstands, and floor skills.', 'review', 'gymnast-wrist-webb-2008', 'wrist-overuse-sr-2015'),
      ],
      gymContext: [
        c('Wrist pain is common in gymnasts and is reported across levels. A systematic review of young athletes identifies gymnastics as having a high rate of wrist overuse injury.', 'review', 'wrist-overuse-sr-2015', 'gym-injuries-2005'),
      ],
      riskFactors: [
        c('Training volume, age and growth stage, and level. A relationship between positive ulnar variance and wrist pain in young gymnasts has been studied with mixed results.', 'review', 'gymnast-wrist-2006', 'wrist-overuse-sr-2015'),
      ],
      signs: [
        c('Wrist pain with weight bearing, swelling, tenderness over the growth plate, and decreased wrist extension range.', 'review', 'gymnast-wrist-webb-2008', 'gymnast-wrist-2006'),
      ],
      redFlags: WRIST_RED,
      coachObservations: [
        pol('Note which skills and surfaces bring on pain, whether the wrist swells, and if the athlete avoids weight bearing. Do not bend the wrist back to see where it hurts.'),
      ],
      immediateResponse: [
        pol('Stop weight bearing on the painful wrist. Tell the parent and request evaluation by a clinician familiar with young gymnasts.'),
        pol('Wrist wraps and braces do not replace an evaluation and are not a green light to keep tumbling.'),
      ],
      whoEvaluates: [c('Physician or sports medicine clinician; a pediatric orthopedic or hand specialist if needed.', 'review', 'gymnast-wrist-webb-2008')],
      clinicianWorkup: [
        c('History, exam, and X-rays. Imaging may show widening or irregularity of the growth plate. Other imaging is used when needed.', 'review', 'gymnast-wrist-2006', 'gymnast-wrist-webb-2008'),
      ],
      typicalManagement: [
        c('Relative rest from weight bearing and gradual return are the main steps. A clinician guides activity and may use a splint.', 'review', 'gymnast-wrist-webb-2008'),
      ],
      tissueRecovery: range('Typically weeks to months of reduced loading, depending on severity. Timing is set by the clinician.', ['gymnast-wrist-webb-2008'], {
        uncertain: true,
        note: 'The review describes a gradual course and does not give one safe number of weeks.',
      }),
      returnToImpact: range('Criteria-based: pain-free weight bearing and function, then gradual loading.', ['gymnast-wrist-webb-2008'], { uncertain: true }),
      returnToTumbling: [
        pol('Return to weight bearing is gradual: floor-level loading and short holds first, then handstands and ballistic skills last. Pain that returns means step back.'),
      ],
      prevention: [
        c('Load management, gradual build-up, and attention to early wrist pain are the usual themes. The evidence for any single preventive device is limited.', 'review', 'wrist-overuse-sr-2015', 'gymnast-wrist-webb-2008'),
      ],
      mythsAndMistakes: [
        pol('Wrist pain is not "normal for gymnasts" and does not need to be tolerated.'),
        unk('Whether wrist guards or tape prevent growth plate injury has not been shown in the sources reviewed here.'),
      ],
      doNot: [...STD_DO_NOT],
      communication: [pol('Tell the family the wrist pain is common in gymnastics and that you want a clinician to look at it, so pain does not turn into a longer problem.')],
      lookAlikes: [c('Wrist sprain, scaphoid fracture, ganglion cyst, ulnar-sided wrist injuries, and growth plate fracture.', 'review', 'gymnast-wrist-webb-2008', 'orthoinfo-wrist-sprain')],
      questionsForClinician: [pol('Is the growth plate involved? How many weeks off weight bearing and what is the return plan?')],
    },
  },
  {
    id: 'ganglion-cyst',
    name: 'Ganglion cyst (wrist and hand)',
    aliases: ['wrist bump', 'dorsal wrist ganglion', 'Bible bump'],
    regions: ['upper_limb'],
    tissues: ['bursa_cyst', 'joint_capsule', 'tendon'],
    tags: ['wrist', 'lump', 'bump', 'cyst', 'weight bearing', 'handstand'],
    urgency: 'soon',
    completeness: 'complete',
    review: 'draft',
    related: ['gymnast-wrist', 'scaphoid-fracture'],
    mediaIds: [],
    card: {
      summary: c(
        'A ganglion cyst is a fluid-filled lump that arises from a joint or tendon sheath, most often on the back of the wrist. It is not cancer and is usually harmless, but any lump needs a clinician to confirm what it is.',
        'guideline',
        'orthoinfo-ganglion',
        'ganglion-review-2014',
      ),
      structures: [
        c('Arises from tissue around a joint such as the joint lining, ligaments, or a tendon sheath, like a balloon on a stalk with thick, slippery fluid inside.', 'guideline', 'orthoinfo-ganglion'),
      ],
      mechanism: [
        c('The exact cause is unknown. It is linked with joints that are stressed or have arthritis.', 'guideline', 'orthoinfo-ganglion', 'ganglion-review-2014'),
      ],
      gymContext: [
        c('Described as common among gymnasts, who repeatedly stress the wrist. The size can grow with activity and shrink with rest.', 'guideline', 'orthoinfo-ganglion'),
      ],
      riskFactors: [
        c('More common in people aged 15 to 40, in joints with arthritis, and in women.', 'guideline', 'orthoinfo-ganglion'),
      ],
      signs: [
        c('A visible lump, usually painless; pain, tingling, or weakness if it presses on a nerve; a small hidden (occult) ganglion can cause wrist pain with no visible lump.', 'guideline', 'orthoinfo-ganglion'),
      ],
      redFlags: [
        c('A lump that grows fast, is hard or fixed, is red and hot, or comes with fever needs a clinician soon, because other causes such as infection or a tumor must be considered.', 'consensus', 'orthoinfo-ganglion'),
        c('Numbness, tingling, or weakness in the hand needs evaluation.', 'guideline', 'orthoinfo-ganglion'),
        ...WRIST_RED.slice(0, 1),
      ],
      coachObservations: [
        pol('Note when the lump first appeared, whether it changes with training, and whether the athlete has pain or finger numbness. Do not press on or hit the lump.'),
      ],
      immediateResponse: [pol('Tell the parent and suggest a clinician look at any new wrist lump or wrist pain. Reduce the loads that cause pain.')],
      whoEvaluates: [c('Physician, hand specialist, or sports medicine clinician.', 'guideline', 'orthoinfo-ganglion')],
      clinicianWorkup: [
        c('Usually diagnosed from a physical exam. Ultrasound or MRI may be used for a hidden ganglion or to separate it from a solid mass. X-rays check for other problems.', 'guideline', 'orthoinfo-ganglion'),
      ],
      typicalManagement: [
        c('Observation is common because more than half go away on their own. A splint, needle aspiration, or surgery may be offered if the cyst is painful or limits activity, but cysts often return after aspiration or surgery.', 'guideline', 'orthoinfo-ganglion', 'ganglion-sr-2015'),
      ],
      tissueRecovery: range('Many resolve on their own without a set timeline; after surgery most people return to normal activities in about 2 to 6 weeks.', ['orthoinfo-ganglion'], {
        min: 2,
        max: 6,
        note: 'The 2 to 6 week figure is for return to normal daily activities after surgical excision, not for return to weight-bearing gymnastics.',
      }),
      returnToImpact: range('Return to weight-bearing on the wrist is set by the treating clinician. This is separate from the 2 to 6 weeks above.', ['orthoinfo-ganglion'], { uncertain: true }),
      returnToTumbling: [
        pol('Handstands, handsprings, and vault load the wrist heavily. The clinician should say when weight bearing is okay, and loading is built back gradually.'),
      ],
      prevention: [unk('No proven way to prevent ganglion cysts was identified in the sources reviewed here.')],
      mythsAndMistakes: [
        c('Hitting the cyst with a heavy object (the "Bible bump" remedy) can injure the hand and is unlikely to remove it.', 'guideline', 'orthoinfo-ganglion'),
        c('Cysts can come back after aspiration or surgery, so recurrence does not mean the treatment was done wrong.', 'guideline', 'orthoinfo-ganglion', 'ganglion-sr-2015'),
      ],
      doNot: [...STD_DO_NOT, pol('Do not press, pop, drain, or hit a wrist lump.')],
      communication: [pol('Reassure that most are harmless, and still ask for a clinician to confirm. Record the date it appeared and when it changes.')],
      lookAlikes: [c('Solid tumors, infection, a bony bump, tendon sheath swelling, scaphoid injury, and growth plate stress injury.', 'guideline', 'orthoinfo-ganglion')],
      questionsForClinician: [pol('Is this a ganglion? Is it safe to keep weight bearing? Do you recommend observation, a splint, or something else?')],
    },
  },
]
