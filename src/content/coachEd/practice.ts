import type { FlashcardDeck, MatchingSet } from './types'

export const DECKS: FlashcardDeck[] = [
  {
    id: 'deck-tissues',
    title: 'Tissue basics',
    cards: [
      { id: 't1', front: 'Sprain or strain: which is the ligament?', back: 'A sprain is a ligament injury. A strain is a muscle or tendon injury.', sourceIds: ['orthoinfo-sprains'] },
      { id: 't2', front: 'What connects muscle to bone?', back: 'Tendon.', sourceIds: ['moore-anatomy'] },
      { id: 't3', front: 'What connects bone to bone and stabilizes a joint?', back: 'Ligament.', sourceIds: ['moore-anatomy'] },
      { id: 't4', front: 'Why are growth plates vulnerable?', back: 'They are the last part of a child bone to harden, so they are weaker than the nearby bone and tendon.', sourceIds: ['orthoinfo-growth-plate'] },
      { id: 't5', front: 'Can a coach rule out a fracture by checking if an athlete can move the joint?', back: 'No. A fracture can be present even if the athlete can move the joint, and a clinician must decide.', sourceIds: ['orthoinfo-fractures', 'orthoinfo-growth-plate'] },
    ],
  },
  {
    id: 'deck-response',
    title: 'Injury Response',
    cards: [
      { id: 'r1', front: 'Name the four steps of the CDC HEADS UP concussion action plan for coaches.', back: 'Stop play, remove the athlete, notify the parents, document the injury.', sourceIds: ['cdc-action-plan'] },
      { id: 'r2', front: 'Who decides when an athlete can return to play after a possible concussion?', back: 'A healthcare provider. It is a medical decision.', sourceIds: ['cdc-response'] },
      { id: 'r3', front: 'Name three concussion danger signs.', back: 'For example: repeated vomiting, a headache that gets worse, one pupil larger than the other, seizures, slurred speech, unusual confusion or agitation, or increasing drowsiness.', sourceIds: ['cdc-signs'] },
      { id: 'r4', front: 'What do you do if you suspect a neck injury?', back: 'Keep the athlete still, call 911, and wait for trained responders. Do not move them unless the scene is unsafe or CPR is needed.', sourceIds: ['nata-cspine'] },
      { id: 'r5', front: 'If an athlete is unresponsive and not breathing normally?', back: 'Call 911, start chest compressions, and use an AED as soon as it is available.', sourceIds: ['aha-2020-bls'] },
    ],
  },
  {
    id: 'deck-stretch',
    title: 'Stretching facts',
    cards: [
      { id: 's1', front: 'Short static holds before tumbling: harmful to performance?', back: 'A systematic review found holds under about 30 to 60 seconds did not harm maximal performance, and larger decrements appeared at about 60 seconds or longer. Follow with dynamic work.', sourceIds: ['kay-2012', 'behm-2016'] },
      { id: 's2', front: 'Does the evidence show stretching prevents sports injuries?', back: 'Not clearly. A systematic review found not enough evidence to endorse or discontinue routine stretching for injury prevention.', sourceIds: ['thacker-2004'] },
      { id: 's3', front: 'What does the PNF review say about reciprocal inhibition?', back: 'The literature does not support it as the explanation. A contemporary view is that PNF changes stretch perception or tolerance.', sourceIds: ['pnf-2006'] },
      { id: 's4', front: 'Why can range increase after a few weeks of stretching?', back: 'A review found most short-term increases are explained by modified sensation (stretch tolerance) rather than a lasting length change.', sourceIds: ['weppler-2010'] },
    ],
  },
]

export const MATCHING: MatchingSet[] = [
  {
    id: 'match-spondylo',
    title: 'Match the word to the meaning',
    prompt: 'Match each word to what it means.',
    pairs: [
      { id: 'm1', left: 'Spondylolysis', right: 'A crack or stress fracture in the pars of a vertebra' },
      { id: 'm2', left: 'Spondylolisthesis', right: 'A vertebra slipped forward on the one below' },
      { id: 'm3', left: 'Spondylosis', right: 'Degenerative wear (arthritis) of the spine' },
      { id: 'm4', left: 'Spondylitis', right: 'Inflammation of the spine, for example ankylosing spondylitis' },
    ],
  },
  {
    id: 'match-loading',
    title: 'Joint action or load?',
    prompt: 'Match each term to its category.',
    pairs: [
      { id: 'l1', left: 'Flexion', right: 'Joint action' },
      { id: 'l2', left: 'Compression', right: 'Load on tissue' },
      { id: 'l3', left: 'Scapular protraction', right: 'Scapular motion' },
      { id: 'l4', left: 'Shear', right: 'Load on tissue' },
      { id: 'l5', left: 'Dorsiflexion', right: 'Joint action' },
    ],
  },
]
