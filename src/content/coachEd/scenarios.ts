import type { Scenario } from './types'

export const SCENARIOS: Scenario[] = [
  {
    id: 'sc-short-landing',
    title: 'Short landing, rolled ankle',
    setup:
      'An 11-year-old lands a standing tuck short and her ankle rolls inward. She sits down, holds the ankle, and says it really hurts. Her parent is not in the building. What is the safest next step?',
    choices: [
      {
        id: 'a',
        label: 'Have her stand up and walk a few steps to see whether it is just a sprain.',
        feedback:
          'Testing weight bearing on a possibly broken ankle can make it worse. A coach cannot rule out a break by watching a walk.',
      },
      {
        id: 'b',
        label: 'Stop the activity, keep her off the foot, support the leg, call her parent, and arrange same-day medical evaluation.',
        safest: true,
        feedback:
          'This is the safest path. A sprain and a fracture, including a growth plate fracture in a child, can look the same. A clinician decides about imaging.',
      },
      {
        id: 'c',
        label: 'Tape the ankle tightly and let her finish practice on the beam.',
        feedback: 'Taping an unevaluated, painful ankle and returning to apparatus risks a second injury and hides the problem.',
      },
      {
        id: 'd',
        label: 'Tell her it is just a sprain and ask her to stretch the ankle in all directions.',
        feedback: 'Stretching a freshly injured ankle can add damage. Do not name the injury.',
      },
    ],
    takeaway: 'You cannot rule out a fracture. Stop, protect, report, and arrange evaluation.',
    sourceIds: ['ottawa-1994', 'ottawa-sr-2003', 'orthoinfo-growth-plate', 'nata-ankle-2013'],
  },
  {
    id: 'sc-head-bump',
    title: 'Head hits the mat, says she is fine',
    setup:
      'A 9-year-old under-rotates a back handspring and her head bumps the mat. She sits up quickly and says she is fine. Ten minutes later she looks a little spaced out. It is almost the end of practice. What do you do?',
    choices: [
      {
        id: 'a',
        label: 'Let her finish easy skills because she said she is fine and did not pass out.',
        feedback: 'Loss of consciousness is not required for a concussion, and symptoms can be delayed. CDC guidance is to remove the athlete from activity.',
      },
      {
        id: 'b',
        label: 'Remove her from activity for the day, check for danger signs, call her parent, document what happened, and ask for evaluation by a healthcare provider.',
        safest: true,
        feedback:
          'This matches the CDC HEADS UP steps: stop play, remove the athlete, notify parents, and document. Return is only after a healthcare provider clears her.',
      },
      {
        id: 'c',
        label: 'Run your own memory and balance test and clear her if she passes.',
        feedback: 'Coaches should not try to judge the severity of an injury. Only a healthcare provider assesses and clears.',
      },
      {
        id: 'd',
        label: 'Text her mother to keep an eye on her and move on.',
        feedback: 'A text is not enough. The parent needs to know about the possible concussion, the danger signs to watch for, and that she needs to be checked.',
      },
    ],
    takeaway: 'When in doubt, sit them out. Do not judge severity and do not clear.',
    sourceIds: ['cdc-response', 'cdc-action-plan', 'cdc-coach-sheet', 'cdc-signs'],
    emergency: false,
  },
  {
    id: 'sc-fall-neck',
    title: 'Fall from beam, neck pain and tingling',
    setup:
      'A 12-year-old falls from the beam and lands on her upper back and head on the mat. She is awake but says her neck hurts and her fingers feel tingly. She wants to sit up. What is the safest response?',
    choices: [
      {
        id: 'a',
        label: 'Help her sit up and move her to the bench so she can rest.',
        feedback: 'Moving an athlete with a possible neck or spine injury can cause harm. Keep still.',
      },
      {
        id: 'b',
        label: 'Tell her not to move her head or neck, send someone to call 911 and get the AED, stay with her, and wait for trained responders.',
        safest: true,
        feedback:
          'Neck pain with tingling after a fall is treated as a possible spine injury. Keep her still, call 911, and monitor breathing until responders arrive.',
      },
      {
        id: 'c',
        label: 'Ask her to wiggle her fingers and toes and if she can, have her walk around slowly.',
        feedback: 'A coach cannot clear the spine by testing movement. Do not make her move.',
      },
      {
        id: 'd',
        label: 'Call her parent first and wait to see whether symptoms go away before calling 911.',
        feedback: 'Delaying emergency care is unsafe. Call 911 first, then the parent.',
      },
    ],
    takeaway: 'If a neck or spine injury is possible, keep still and call 911.',
    sourceIds: ['nata-cspine', 'aha-2020-bls'],
    emergency: true,
  },
  {
    id: 'sc-wrist-lump',
    title: 'Wrist lump and a competition next week',
    setup:
      'A 14-year-old gymnast shows you a small lump on the back of her wrist that has been getting bigger over a few weeks. It aches after handstands. She asks if she can wrap it tight and keep going. What do you do?',
    choices: [
      {
        id: 'a',
        label: 'Press on the lump firmly to see if it will go down, then keep training.',
        feedback: 'Do not press, pop, or hit a wrist lump. This can injure the hand and does not reliably remove it.',
      },
      {
        id: 'b',
        label: 'Tell her it is a ganglion cyst, and she can tape it and compete.',
        feedback: 'A coach cannot diagnose a lump. A wrist lump with ache after weight bearing needs a clinician. Wrapping is not a plan.',
      },
      {
        id: 'c',
        label: 'Reduce wrist weight bearing for now, tell her parent, and ask for a clinician to look at the lump and the wrist pain before more handstand and tumbling load.',
        safest: true,
        feedback:
          'Most wrist ganglions are harmless, but the lump and the ache could also be a growth plate stress injury or something else. A clinician decides, and it is fine to tell her it is probably common and still needs a check.',
      },
      {
        id: 'd',
        label: 'Ignore it unless it stops her from tumbling.',
        feedback: 'Waiting can turn an early overuse injury into a bigger one.',
      },
    ],
    takeaway: 'Report the lump and the pain, reduce loading, and let a clinician decide.',
    sourceIds: ['orthoinfo-ganglion', 'gymnast-wrist-2006', 'gymnast-wrist-webb-2008'],
  },
  {
    id: 'sc-back-pain',
    title: 'Back pain that keeps coming back',
    setup:
      'A 13-year-old tells you her lower back has hurt for three weeks, mostly when she does bridges and back handsprings. It eases at home. Her parent says it is probably just a gymnast back. What is the best response?',
    choices: [
      {
        id: 'a',
        label: 'Have her do a few extra bridges to see how it feels, then decide.',
        feedback: 'Repeated arching to provoke pain can worsen a possible stress injury. Do not test.',
      },
      {
        id: 'b',
        label: 'Tell the parent that it is just a muscle strain and will heal with a week of stretching.',
        feedback: 'A coach cannot say what it is. Persistent back pain with arching in a young gymnast can be a pars stress injury, which needs a clinician.',
      },
      {
        id: 'c',
        label: 'Pause the arching and landing work that provokes it, and ask the parent to arrange a medical evaluation for back pain that has lasted weeks and comes with arching.',
        safest: true,
        feedback:
          'Back pain that is persistent and provoked by arching in a young gymnast deserves a clinician. Pain that eases at home does not mean it is healed.',
      },
      {
        id: 'd',
        label: 'Keep her at full training and only change things if the pain gets worse.',
        feedback: 'Waiting for worse pain is how a stress injury progresses.',
      },
    ],
    takeaway: 'Back pain in a young gymnast with arching is a reason for a clinician visit, not for waiting.',
    sourceIds: ['orthoinfo-spondy', 'spondylolysis-review-2000', 'gym-spine-2009'],
  },
]
