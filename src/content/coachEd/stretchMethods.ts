import type { StretchMethod } from './types'

export const STRETCH_METHODS: StretchMethod[] = [
  {
    id: 'sm-static',
    name: 'Static stretching',
    what: 'A muscle is lengthened to a point of tension or mild discomfort and held still.',
    evidenceNote:
      'A systematic review found short static stretches (under 30 seconds) did not harm maximal muscle performance, and decrements became likely at about 60 seconds or longer per stretch. Another review found a small average performance reduction after static stretching, larger for 60 seconds or more than for under 60 seconds, and no clear effect once dynamic activity followed.',
    gymUse: 'Useful for building range of motion after practice or in a dedicated flexibility session. Keep holds short before power work and follow with dynamic activity.',
    cautions: 'Not a diagnosis tool and not a way to treat a fresh strain. Do not push into sharp pain, and do not use a partner to force range.',
    sourceIds: ['kay-2012', 'behm-2016'],
    evidence: 'review',
  },
  {
    id: 'sm-dynamic',
    name: 'Dynamic stretching',
    what: 'Controlled, active movements that take joints through their range, such as leg swings and arm circles.',
    evidenceNote:
      'The same systematic review reported small to moderate performance improvements when dynamic stretching was done within minutes of physical activity, and recommended stretching within a warm-up that includes additional dynamic activity.',
    gymUse: 'Fits into a warm-up before tumbling. Build amplitude gradually.',
    cautions: 'Controlled is the point. Forceful, jerky swings into end range are not the same thing.',
    sourceIds: ['behm-2016'],
    evidence: 'review',
  },
  {
    id: 'sm-ballistic',
    name: 'Ballistic stretching',
    what: 'Bouncing or fast swinging into end range using momentum.',
    evidenceNote: 'The sources reviewed in this module do not support recommending it for young athletes. Evidence in children is not established.',
    gymUse: 'Not recommended as a flexibility method for young gymnasts in this module.',
    cautions: 'Momentum into end range is how some muscle strains happen. Hamstring strain reviews note high-speed and extreme-range movements as common set-ups.',
    sourceIds: ['hamstring-cpg-2010'],
    evidence: 'uncertain',
  },
  {
    id: 'sm-pnf',
    name: 'PNF stretching (contract-relax, hold-relax)',
    what: 'A stretch combined with a muscle contraction and relaxation, usually with a partner or prop.',
    evidenceNote:
      'A review reports PNF often produces the largest short-term range gains, with the greatest effect when the opposing muscle contracts to place the target muscle on stretch, followed by a brief low-intensity contraction of the target muscle. It reports that the traditional explanation (autogenic or reciprocal inhibition) is not supported by the literature, and the contemporary view is that PNF changes stretch perception or tolerance.',
    gymUse: 'Used in flexibility sessions for older, trained athletes with a coach who understands the technique. The contraction is light, not maximal.',
    cautions: 'Do not describe PNF as "relaxing the muscle with a reflex". Maximal contractions into end range raise strain risk. Use only with proper instruction and never to force range on a child.',
    sourceIds: ['pnf-2006', 'pnf-konrad-2015', 'behm-2016'],
    evidence: 'review',
  },
  {
    id: 'sm-reciprocal',
    name: 'Reciprocal inhibition: what it can and cannot explain',
    what: 'The idea that contracting one muscle (the agonist) switches off its opposite (the antagonist) by a spinal reflex, making stretching easier.',
    evidenceNote: 'The PNF review states the literature does not support reciprocal inhibition as the explanation for gains from PNF stretching. A better-supported view is that stretching changes how much stretch a person can tolerate.',
    gymUse: 'It is fine to cue "squeeze the front of the thigh as you stretch the hamstring" as a technique. Just do not teach the reflex as the reason.',
    cautions: 'Avoid explaining flexibility as "tight muscle needs to be released". The evidence points to sensation and tolerance as a large part of the change.',
    sourceIds: ['pnf-2006', 'weppler-2010'],
    evidence: 'review',
  },
  {
    id: 'sm-active',
    name: 'Active (or active-assisted) range training',
    what: 'The athlete moves into range using their own muscle strength, sometimes with light assistance, and holds it with control.',
    evidenceNote: 'Evidence specific to young gymnasts is limited in the sources reviewed. Active range and strength at end range are widely used in coaching and rehabilitation, but no source here quantifies the benefit.',
    gymUse: 'Pairs flexibility with strength and control, such as a held active split lift or a controlled pike lift.',
    cautions: 'Fatigue ruins control. Stop the set when the position degrades.',
    sourceIds: ['page-2012'],
    evidence: 'uncertain',
  },
]
