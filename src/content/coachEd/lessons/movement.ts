import type { Lesson } from '../types'

export const MOVEMENT: Lesson[] = [
  {
    id: 'mov-planes',
    moduleId: 'movement',
    title: 'Planes and axes',
    kicker: 'Three planes, three axes: a shared language for describing a skill.',
    minutes: 4,
    review: 'draft',
    visualNeeded: ['Anatomical planes diagram from a verified open-license source'],
    blocks: [
      { kind: 'figure', slotId: 'media-body-planes' },
      { kind: 'terms', termKinds: ['plane_axis'] },
    ],
    gym: 'Name the plane before you correct the cue: "this is a sagittal-plane problem".',
  },
  {
    id: 'mov-actions',
    moduleId: 'movement',
    title: 'Joint actions',
    kicker: 'Flexion, extension, abduction, rotation: the verbs of the joints.',
    minutes: 7,
    review: 'draft',
    legacyId: 'movement-names',
    blocks: [
      {
        kind: 'callout',
        tone: 'note',
        text: 'This lesson sits beside the existing "Joint actions and cues" lesson in Coach study, which stays unchanged. Use that for cue wording and this one for exact definitions.',
      },
      { kind: 'terms', termKinds: ['joint_action'] },
    ],
    gym: 'Use the joint action word first, then the cue. "Hip extension: squeeze and stand tall".',
  },
  {
    id: 'mov-scap-pelvis',
    moduleId: 'movement',
    title: 'Scapula and pelvis',
    kicker: 'Two moving bases that decide what the shoulder and the lower back have to do.',
    minutes: 5,
    review: 'draft',
    blocks: [
      { kind: 'terms', termKinds: ['scapular', 'pelvic'] },
      {
        kind: 'callout',
        tone: 'note',
        text: 'Scapular and pelvic motion are described here so coaches can see them. Judging them as injuries or deficits is for a clinician.',
      },
    ],
  },
  {
    id: 'mov-chain',
    moduleId: 'movement',
    title: 'Kinetic chain and muscle contractions',
    kicker: 'Force travels through linked segments, and muscles can shorten, lengthen, or hold.',
    minutes: 5,
    review: 'draft',
    blocks: [{ kind: 'terms', termKinds: ['chain', 'contraction'] }],
  },
  {
    id: 'mov-loading',
    moduleId: 'movement',
    title: 'Loading concepts: compression, traction, axial load, shear, torsion',
    kicker: 'These are forces on tissue. They are not joint actions, and mixing them up leads to wrong cues.',
    minutes: 5,
    review: 'draft',
    blocks: [
      {
        kind: 'callout',
        tone: 'tip',
        text: 'A joint action is how a joint moves (flexion, extension). A load is the force on tissue (compression, tension). A skill has both: the joint action decides where the load goes.',
        evidence: 'consensus',
        sourceIds: ['neumann-kinesiology'],
      },
      { kind: 'terms', termKinds: ['loading'] },
      { kind: 'matching', matchingId: 'match-loading' },
    ],
  },
]
