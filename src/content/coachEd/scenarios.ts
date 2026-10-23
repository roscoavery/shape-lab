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
  {
    id: 'sc-compartment',
    title: 'Shin pain that keeps getting worse',
    setup:
      'A 15-year-old took a hard knock to the shin on the beam an hour ago. The lower leg is now very tight and swollen, the pain is much worse than you would expect, and she says her foot feels tingly. A teammate has brought an ice pack. What do you do?',
    emergency: true,
    choices: [
      {
        id: 'a',
        label: 'Ice and elevate the leg for 20 minutes, then check again.',
        feedback: 'Ice is not treatment for suspected compartment syndrome and waiting delays the care that protects the leg.',
      },
      {
        id: 'b',
        label: 'Call 911 (or your local emergency number) now. Keep her still, do not wrap the leg tightly, and stay with her.',
        safest: true,
        feedback:
          'Severe, worsening pain out of proportion to the injury, a tight swollen limb, and tingling can mean compartment syndrome, where pressure cuts off blood flow. It is a surgical emergency.',
      },
      {
        id: 'c',
        label: 'Wrap it firmly with compression to bring the swelling down.',
        feedback: 'Tight compression can raise pressure further. This needs emergency care, not a wrap.',
      },
      {
        id: 'd',
        label: 'Have her walk it off and see a doctor next week if it is still sore.',
        feedback: 'Delay can cause permanent muscle and nerve damage.',
      },
    ],
    takeaway: 'When circulation might be compromised, emergency care comes first. Ice never replaces or delays it.',
    sourceIds: ['medlineplus-compartment', 'compartment-2015'],
  },
  {
    id: 'sc-ice-question',
    title: '"Should she ice it?"',
    setup:
      'An athlete rolled her ankle slightly on a warm-up jump. She can walk normally, there is no deformity, and the pain is mild. Her parent asks whether to ice it every hour for the next three days. What is the most evidence-informed answer?',
    choices: [
      {
        id: 'a',
        label: '"Short periods of cooling can help with pain in the first hours. There is no good evidence that icing for days speeds healing. If it is still painful, swollen, or she cannot walk normally, have it checked."',
        safest: true,
        feedback:
          'This matches current reviews: cooling can reduce pain early, human evidence that it improves healing is lacking, and prolonged icing is not supported.',
      },
      {
        id: 'b',
        label: '"Ice is proven to speed healing, so the more the better."',
        feedback: 'No human evidence shows ice speeds tissue healing, and long cold exposure can harm skin and nerves.',
      },
      {
        id: 'c',
        label: '"Never use ice, it always delays healing."',
        feedback: 'That overstates the evidence. Concerns about delayed healing come mainly from animal studies, and short-term cooling for pain is reasonable.',
      },
      {
        id: 'd',
        label: '"Keep her completely still for two weeks."',
        feedback: 'Prolonged complete rest is usually not needed for a mild soft tissue injury and can slow recovery. A clinician decides if protection is needed.',
      },
    ],
    takeaway: 'Separate short-term pain relief from long-term healing, and do not overstate either side.',
    sourceIds: ['cryo-critical-2024', 'ice-sr-2004', 'peace-love-2020'],
  },
  {
    id: 'sc-progress-step',
    title: 'Ready for a higher step?',
    setup:
      'A 12-year-old has done Poliquin steps at the lowest height for three weeks. Her left knee tracks well. On the right, the knee drifts inward on the last two reps of each set, and she says the front of that knee is "a little achy" the next morning. Her teammates have moved up a height. What is the best call?',
    choices: [
      {
        id: 'a',
        label: 'Move her up with the group so she does not fall behind.',
        feedback: 'Progressing while control fades and next-day symptoms appear adds load before the knee is ready.',
      },
      {
        id: 'b',
        label: 'Keep the current height, cut the set so every rep is clean, note the next-morning ache, and tell the parent if it continues.',
        safest: true,
        feedback: 'Control fading at the end of a set plus next-day symptoms are reasons to hold or step back, not to progress. Persisting pain needs a clinician.',
      },
      {
        id: 'c',
        label: 'Add a weight so the right leg gets stronger faster.',
        feedback: 'Adding load raises knee joint stress further. Change one dial at a time, and only when the current level is consistent.',
      },
      {
        id: 'd',
        label: 'Stop all leg training for a month.',
        feedback: 'Complete rest is not needed for mild, settling symptoms, but persistent pain needs a clinician.',
      },
    ],
    takeaway: 'Progress when the current level is consistent, controlled, and symptom-settled. Not because a calendar or a teammate says so.',
    sourceIds: ['pf-squat-load-2002', 'trampoline-growth-2021'],
  },
  {
    id: 'sc-jefferson-request',
    title: 'Can she do Jefferson curls?',
    setup:
      'A 14-year-old with low back pain on back walkovers saw an online video of Jefferson curls "fixing" back pain and wants to start them. She has not seen a clinician about the pain. What do you do?',
    choices: [
      {
        id: 'a',
        label: 'Start her with a light dumbbell so her back gets used to flexion.',
        feedback: 'Loaded flexion is not appropriate for back pain that has not been evaluated, especially in a young tumbler where a pars stress injury is possible.',
      },
      {
        id: 'b',
        label: 'Explain that Jefferson curls are not used for unevaluated back pain, pause the provoking skills, and ask the parent to arrange a clinician visit.',
        safest: true,
        feedback: 'Back pain with arching in a young gymnast needs a clinician first. Jefferson curls are an advanced exercise that needs medical clearance where back symptoms exist.',
      },
      {
        id: 'c',
        label: 'Let her do bodyweight Jefferson curls because they have no weight.',
        feedback: 'The issue is the unevaluated symptom, not only the load.',
      },
      {
        id: 'd',
        label: 'Tell her the curls will prevent a disc injury.',
        feedback: 'No evidence shows Jefferson curls prevent disc injuries or spinal fractures.',
      },
    ],
    takeaway: 'An exercise is never a substitute for evaluating pain, and ShapeLab does not prescribe rehabilitation.',
    sourceIds: ['orthoinfo-spondy', 'spondylolysis-review-2011'],
  },
  {
    id: 'sc-growth-spurt',
    title: 'Growth spurt and a new program',
    setup:
      'A 13-year-old has grown quickly this season and has new heel and knee soreness after practice. You want to add Nordic curls, sled pushes, and slant board squats all in the same week to "build her up". What is the best plan?',
    choices: [
      {
        id: 'a',
        label: 'Add all three now at full volume, since stronger is safer.',
        feedback: 'Adding several new loads at once during rapid growth with new symptoms stacks risk. Strength gains do not guarantee fewer injuries.',
      },
      {
        id: 'b',
        label: 'Tell the parent about the new soreness, keep total load steady, and introduce one new exercise at low volume only if the soreness is settling and the clinician has no concerns.',
        safest: true,
        feedback: 'Injury risk in trampoline gymnasts peaked around the growth spurt and rose with higher weekly load. One change at a time lets you see the response.',
      },
      {
        id: 'c',
        label: 'Ignore the soreness, growing pains are normal.',
        feedback: 'Heel and knee pain during growth can be Sever or Osgood-Schlatter, which need a clinician.',
      },
      {
        id: 'd',
        label: 'Replace tumbling with Jefferson curls.',
        feedback: 'Not relevant to heel and knee symptoms, and an advanced exercise.',
      },
    ],
    takeaway: 'Growth, recent symptoms, and total load all shape whether to add anything new.',
    sourceIds: ['trampoline-growth-2021', 'sever-peds-2011', 'osgood-2007'],
  },
]
