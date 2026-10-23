import type { Condition } from '../types'
import { c, pol, range, unk, STD_DO_NOT } from '../author'

export const NEURO: Condition[] = [
  {
    id: 'concussion',
    name: 'Concussion',
    aliases: ['mild traumatic brain injury', 'mTBI', 'head injury'],
    regions: ['neuro'],
    tissues: ['brain'],
    tags: ['head', 'headache', 'dizzy', 'fall', 'danger signs', 'HEADS UP', 'removal from play'],
    urgency: 'emergency',
    completeness: 'complete',
    review: 'draft',
    related: ['suspected-spine-injury'],
    mediaIds: [],
    card: {
      summary: c(
        'A concussion is a type of brain injury caused by a bump, blow, or jolt to the head, or a hit to the body that makes the head and brain move rapidly. Symptoms may not show up right away, a coach cannot judge how serious it is, and the athlete stops the activity and sees a healthcare provider.',
        'guideline',
        'cdc-basics',
        'cdc-response',
      ),
      structures: [c('The brain. A concussion is a functional injury and usually does not show on routine imaging.', 'consensus', 'amsterdam-2022')],
      mechanism: [
        c('A bump, blow, or jolt to the head, or a hit to the body, that causes the head and brain to move rapidly back and forth.', 'guideline', 'cdc-basics'),
      ],
      gymContext: [
        c('Falls from beam, bars, vault, and floor, falling short on a skill, and hitting the head on a mat, equipment, or floor. A fall does not need to look dramatic to cause a concussion.', 'consensus', 'cdc-response', 'amsterdam-2022'),
      ],
      riskFactors: [
        c('A history of previous concussions and more severe symptoms right after the injury are associated with a longer recovery.', 'guideline', 'cdc-basics'),
      ],
      signs: [
        c('What a coach may see (school-age): appears dazed, stunned, or confused; sudden trouble remembering or concentrating; answers more slowly; seems clumsy or unsteady; vomits right after the injury; slowed reactions; mood or behavior changes.', 'guideline', 'cdc-signs'),
        c('What the athlete may report: headache, dizziness or balance problems, nausea, bothered by light or noise, vision problems, feeling foggy, tired, or "not right".', 'guideline', 'cdc-signs'),
        c('Signs and symptoms may not show up right away and can take hours or days to be noticed.', 'guideline', 'cdc-signs'),
      ],
      redFlags: [
        c('Call 911 or go to the emergency department after a bump, blow, or jolt to the head if there are: convulsions or seizures; not able to recognize people or places; repeated nausea or vomiting; unusual behavior, increased confusion, restlessness, or agitation; loss of consciousness with increasing drowsiness, inability to wake up, or inability to stay awake; slurred speech, weakness, numbness, or decreased coordination; a headache that gets worse and does not go away; one pupil larger than the other, or double vision.', 'guideline', 'cdc-signs'),
        pol('Any loss of consciousness, neck pain, or inability to move or feel arms or legs is treated as a possible neck or spine injury: do not move the athlete and call 911.'),
      ],
      coachObservations: [
        c('Record what you can safely observe: the cause of the injury and the force of the hit, any loss of consciousness and for how long, memory loss right after the injury, any seizures, and number of previous concussions if known.', 'guideline', 'cdc-coach-sheet'),
        c('Note the time of injury, who was involved, signs you saw, symptoms reported, the surface, and the athlete reaction. Give a copy of the notes to the parents.', 'guideline', 'cdc-action-plan'),
      ],
      immediateResponse: [
        c('Stop play or activity immediately when you have any concern about a possible concussion.', 'guideline', 'cdc-action-plan'),
        c('Remove the athlete and do not return them that day, even if they do not look hurt. When in doubt, sit them out.', 'guideline', 'cdc-action-plan', 'cdc-response'),
        c('Check for danger signs. An athlete with danger signs goes to the emergency department right away.', 'guideline', 'cdc-response'),
        c('Notify the parents and tell them symptoms can take hours to appear.', 'guideline', 'cdc-action-plan'),
        c('Document what happened.', 'guideline', 'cdc-action-plan'),
      ],
      whoEvaluates: [
        c('Only a healthcare provider should assess an athlete for a possible concussion. Return to sports is a medical decision made by a healthcare provider.', 'guideline', 'cdc-response', 'cdc-coach-sheet'),
      ],
      clinicianWorkup: [
        c('A clinician evaluates symptoms, thinking, balance, and neurological function, and decides if emergency imaging is needed.', 'consensus', 'amsterdam-2022', 'cdc-mtbi-peds'),
      ],
      typicalManagement: [
        c('A clinician guides a short period of relative rest followed by a gradual return to school and activity. Return to school and sport are stepwise and supervised.', 'consensus', 'amsterdam-2022', 'cdc-coach-sheet'),
      ],
      tissueRecovery: range('CDC reports most children with a concussion feel better within 2 to 4 weeks. Some have symptoms for months or longer.', ['cdc-basics'], {
        min: 2,
        max: 4,
        note: 'This is the usual time for symptoms to settle, not a safe return-to-play date. Each athlete is cleared by a healthcare provider.',
      }),
      returnToImpact: range('Not a time period. The athlete stays out the day of injury and until cleared by a healthcare provider, then returns through graded steps.', ['cdc-response', 'cdc-coach-sheet'], {
        uncertain: true,
        note: 'The six-step return to play is symptom-guided and is not to be done in one day; it can take days, weeks, or months.',
      }),
      returnToTumbling: [
        c('Return to play follows the clinician plan, in gradual steps over days, weeks, or months. The athlete moves to the next step only if they have no new symptoms at the current step.', 'guideline', 'cdc-coach-sheet'),
        pol('Skills with head-first risk or falling risk return last, only after written clearance.'),
      ],
      prevention: [
        c('Concussions cannot be fully prevented. Spotting and mats, skill progressions, and removal from play after any suspected injury reduce harm. Athletes who keep playing with symptoms are more likely to have another concussion.', 'guideline', 'cdc-coach-sheet'),
      ],
      mythsAndMistakes: [
        pol('"She did not pass out, so it is not a concussion" is false. Loss of consciousness is not required for a concussion.'),
        c('A repeat concussion before the brain has healed can be very serious.', 'guideline', 'cdc-coach-sheet'),
      ],
      doNot: [
        c('Do not try to judge how serious the injury is yourself.', 'guideline', 'cdc-response', 'cdc-coach-sheet'),
        ...STD_DO_NOT,
        pol('Do not let the athlete "shake it off" or return the same day.'),
        pol('Do not rely on a quiz, a symptom checklist, or a phone app to clear an athlete.'),
      ],
      communication: [
        c('Tell parents about the possible concussion, give them the HEADS UP fact sheet, and ask for written instructions from the healthcare provider on return to play.', 'guideline', 'cdc-coach-sheet'),
        c('An athlete may feel frustrated, sad, angry, or lonely; keep them connected with teammates, for example cheering at practices.', 'guideline', 'cdc-coach-sheet'),
      ],
      lookAlikes: [
        c('More serious brain injury and neck injury. It can be hard to tell the difference between a possible concussion and a more life-threatening brain injury.', 'guideline', 'cdc-signs'),
      ],
      questionsForClinician: [
        pol('When can school and light activity restart? What written steps should we follow for return to practice and then tumbling?'),
      ],
    },
  },
  {
    id: 'suspected-spine-injury',
    name: 'Suspected neck or spine injury',
    aliases: ['possible cervical spine injury', 'neck injury after a fall'],
    regions: ['neuro', 'spine_pelvis'],
    tissues: ['spinal_cord', 'bone', 'nerve'],
    tags: ['emergency', 'neck', 'fall', 'numbness', 'do not move', '911'],
    urgency: 'emergency',
    completeness: 'complete',
    review: 'draft',
    related: ['concussion', 'spondylolysis'],
    mediaIds: [],
    card: {
      summary: c(
        'After a fall or hard landing on the head, neck, or back, a spine injury cannot be ruled out by looking. The safe response is to keep the athlete still, call 911, and wait for trained responders.',
        'guideline',
        'nata-cspine',
      ),
      structures: [c('Cervical spine (neck) and spinal cord, and the rest of the spine.', 'guideline', 'nata-cspine')],
      mechanism: [c('A fall, a landing on the head or neck, or a high-force impact. Head injury and neck injury can occur together.', 'guideline', 'nata-cspine')],
      gymContext: [c('Falls from height, under-rotated flips that land on the head or neck, and vault or trampoline accidents are the situations that call for this response.', 'consensus', 'gym-spine-2009', 'nata-cspine')],
      riskFactors: [unk('Not described in a coach-actionable way in the sources reviewed here.')],
      signs: [c('Neck pain or tenderness, pain on moving the neck, numbness, tingling or weakness in arms or legs, loss of consciousness, or an altered mental state.', 'guideline', 'nata-cspine')],
      redFlags: [
        c('Any of the signs above after a fall or high-force impact is treated as a possible spine injury until a medical team says otherwise.', 'guideline', 'nata-cspine'),
      ],
      coachObservations: [pol('Look and listen only. Note the mechanism, whether the athlete is awake and responding, and whether they report numbness or cannot move a limb.')],
      immediateResponse: [
        pol('Call 911 and send for the AED. Do not move the athlete unless the scene is unsafe or they stop breathing and CPR is needed.'),
        pol('Tell the athlete not to move their head or neck. Stay with them and keep them calm and warm.'),
        c('If the athlete is not breathing normally, start CPR and use an AED according to current life support guidelines.', 'guideline', 'aha-2020-bls'),
      ],
      whoEvaluates: [c('Emergency medical services and an emergency department. Trained responders decide how to move the athlete.', 'guideline', 'nata-cspine')],
      clinicianWorkup: [c('Emergency imaging and neurological examination are done by the medical team.', 'guideline', 'nata-cspine')],
      typicalManagement: [c('Spinal motion restriction and transport by trained responders.', 'guideline', 'nata-cspine')],
      tissueRecovery: range('Not estimated. The outcome depends on the injury and is determined by the medical team.', ['nata-cspine'], { uncertain: true }),
      returnToImpact: range('Not estimated.', ['nata-cspine'], { uncertain: true }),
      returnToTumbling: [pol('Only after full medical evaluation and written clearance.')],
      prevention: [pol('Spotting, progressions, appropriate equipment and matting, and a posted emergency action plan reduce risk. This card does not claim a specific percentage reduction.')],
      mythsAndMistakes: [pol('"She can wiggle her toes, so she is fine" is not a safe test. Do not move an athlete because they say they feel okay.')],
      doNot: [...STD_DO_NOT, pol('Do not have the athlete sit up, stand, or walk. Do not remove protective equipment unless trained to do so.')],
      communication: [pol('Call the parent after 911. Give the dispatcher the address, the athlete age, and what happened.')],
      lookAlikes: [c('Concussion, neck muscle strain, and bruising can look the same as a serious injury at first.', 'guideline', 'nata-cspine')],
      questionsForClinician: [pol('What did the evaluation find? What activity is allowed and what is the written clearance process?')],
    },
  },
]
