import type { Condition } from '../types'
import { c, pol, range, unk, STD_DO_NOT } from '../author'

const ANKLE_REDFLAGS = [
  c(
    'Cannot bear weight for about four steps right after the injury, or pain over the back edge or tip of the ankle bones, or the midfoot bones, are the signs the Ottawa ankle rules use to decide a clinician should consider an X-ray.',
    'guideline',
    'ottawa-1994',
    'ottawa-sr-2003',
  ),
  c('Visible deformity, an ankle that looks out of place, or numbness, color change, or a cold foot needs emergency care.', 'consensus', 'orthoinfo-fractures'),
  c('Pain high on the shin or calf, or pain when the foot is turned out, can point to a syndesmosis (high ankle) injury or a broken bone.', 'review', 'syndesmosis-2007'),
]

export const ANKLE_FOOT: Condition[] = [
  {
    id: 'ankle-sprain-lateral',
    name: 'Lateral ankle sprain',
    aliases: ['rolled ankle', 'inversion sprain', 'ATFL sprain'],
    regions: ['ankle_foot'],
    tissues: ['ligament'],
    tags: ['landing', 'acute', 'ligament', 'sprain', 'swelling'],
    urgency: 'same_day',
    completeness: 'complete',
    review: 'draft',
    related: ['ankle-sprain-high', 'ankle-sprain-medial', 'growth-plate-fracture'],
    mediaIds: [],
    card: {
      summary: c(
        'A lateral ankle sprain is a stretch or tear of the ligaments on the outside of the ankle, usually after the foot rolls inward. It is the most common ankle injury in sport, but a break can look the same, so an athlete who cannot walk on it needs a clinician.',
        'guideline',
        'ankle-guideline-2018',
        'nata-ankle-2013',
      ),
      structures: [
        c('Anterior talofibular ligament (ATFL) is most often involved. The calcaneofibular ligament (CFL) can also be involved in more severe sprains.', 'guideline', 'ankle-cpg-2021'),
        c('The growth plate at the end of the fibula can be injured by the same twist in a child, and can feel like a sprain.', 'review', 'physeal-2006', 'orthoinfo-growth-plate'),
      ],
      mechanism: [
        c('Typically a sudden inward roll of the foot, often from landing on an uneven surface, on another foot, or on the edge of a mat or a skill that lands short or off-balance.', 'guideline', 'ankle-guideline-2018', 'nata-ankle-2013'),
      ],
      gymContext: [
        c('Short landings, landing on the edge of a mat or between mats, a stuck landing that turns in, and dismount landings are the usual set-ups in gymnastics. Specific injury rates differ by sport, level, and study.', 'review', 'gym-injuries-2005', 'ncaa-gym-2015'),
      ],
      riskFactors: [
        c('A previous ankle sprain is repeatedly reported as a risk factor for another.', 'guideline', 'ankle-guideline-2018', 'ankle-cpg-2021'),
        unk('Whether growth stage, fatigue, or footwear change risk for young gymnasts is not settled in the sources reviewed here.'),
      ],
      signs: [
        c('Pain on the outside of the ankle, swelling, bruising, and difficulty or pain with weight bearing or walking.', 'guideline', 'ankle-cpg-2021', 'orthoinfo-ankle-sprain'),
      ],
      redFlags: ANKLE_REDFLAGS,
      coachObservations: [
        pol('Note, without touching or moving the ankle: can the athlete take a few steps, how much swelling is visible, is there deformity, and what time did it happen.'),
      ],
      immediateResponse: [
        pol('Stop the activity. Keep the athlete off the foot and sit them with the leg supported.'),
        c('Protect the ankle while arranging evaluation: supported rest and elevation are reasonable. Whether to use ice or compression is the clinician decision.', 'consensus', 'orthoinfo-ankle-sprain'),
        pol('Call the parent. If they cannot bear weight, if there is deformity, or if you are unsure, arrange same-day medical evaluation.'),
      ],
      whoEvaluates: [
        c('A physician, sports medicine clinician, or physical therapist can examine the ankle and decide whether imaging is needed.', 'guideline', 'ankle-guideline-2018', 'ankle-cpg-2021'),
      ],
      clinicianWorkup: [
        c('History and a physical exam, using rules such as the Ottawa ankle rules to decide whether an X-ray is needed. The Ottawa rules were built to help exclude fracture, not to grade ligament injury.', 'guideline', 'ottawa-1994', 'ottawa-sr-2003'),
      ],
      typicalManagement: [
        c('Guidelines favor a short period of protection followed by early, supported, progressive loading and exercise-based rehabilitation over prolonged immobilization for most sprains. A clinician decides what is right for an individual.', 'guideline', 'ankle-guideline-2018', 'ankle-cpg-2021', 'nata-ankle-2013'),
      ],
      tissueRecovery: range('Varies widely with the severity of the sprain. A clinician sets expectations for each athlete.', ['ankle-cpg-2021', 'nata-ankle-2013'], {
        uncertain: true,
        note: 'The sources describe grades and rehabilitation phases but do not give one safe number of weeks that a coach can quote.',
      }),
      returnToImpact: range('Set by a clinician after strength, balance, hop, and landing criteria are met, not by a number of days.', ['ankle-cpg-2021', 'bern-2016'], {
        uncertain: true,
        note: 'Return-to-sport guidance describes criteria-based decisions rather than fixed time frames.',
      }),
      returnToTumbling: [
        c('Return follows a staged plan: walking without pain, then jogging, then jumping and landing, then tumbling progressions from simple to complex. Each step is cleared by the clinician.', 'consensus', 'bern-2016', 'ankle-cpg-2021'),
        pol('Ask the clinician whether taping or a brace is advised for the return phase and who will check the athlete on the first landing day.'),
      ],
      prevention: [
        c('Balance and neuromuscular training and, after a sprain, a brace or tape during higher-risk activity are supported in the ankle guideline. Ask a clinician which fits the athlete.', 'guideline', 'ankle-guideline-2018', 'ankle-cpg-2021'),
      ],
      mythsAndMistakes: [
        c('"It is just a sprain" cannot be known from the outside. A sprain and a fracture, including a growth plate fracture in a child, can look alike.', 'consensus', 'orthoinfo-growth-plate', 'ottawa-sr-2003'),
        c('Complete rest for a long period is no longer the default. Early, guided loading is usually favored once a clinician has ruled out a fracture.', 'guideline', 'ankle-guideline-2018'),
      ],
      doNot: [
        ...STD_DO_NOT,
        pol('Do not stretch, twist, or "walk off" an ankle that has just been injured.'),
        pol('Do not tape an unevaluated injured ankle and send the athlete back to the floor.'),
      ],
      communication: [
        pol('Tell the parent what you saw and when, not what you think it is. Write the time, the skill, the surface, and what the athlete reported.'),
        pol('Ask the parent to tell you what the clinician said about activity so the plan is the same at the gym and at home.'),
      ],
      lookAlikes: [
        c('Fibula or growth plate fracture, high ankle (syndesmosis) sprain, midfoot or fifth metatarsal injury, and peroneal tendon injury can all present like a rolled ankle.', 'review', 'syndesmosis-2007', 'physeal-2006'),
      ],
      questionsForClinician: [
        pol('Is it safe to put weight on it at practice? Which activities are off limits and for how long will you reassess?'),
        pol('Do you recommend a brace or tape, and what should we watch for on return to landings?'),
      ],
    },
  },
  {
    id: 'ankle-sprain-high',
    name: 'High ankle (syndesmosis) sprain',
    aliases: ['syndesmotic sprain', 'syndesmosis injury'],
    regions: ['ankle_foot'],
    tissues: ['ligament'],
    tags: ['landing', 'acute', 'ligament', 'twist', 'tibia fibula'],
    urgency: 'same_day',
    completeness: 'complete',
    review: 'draft',
    related: ['ankle-sprain-lateral', 'ankle-sprain-medial'],
    mediaIds: [],
    card: {
      summary: c(
        'A high ankle sprain injures the ligaments that hold the two lower leg bones together just above the ankle joint. It often hurts higher up than a usual ankle sprain and can take longer to settle.',
        'review',
        'syndesmosis-2007',
      ),
      structures: [
        c('The syndesmosis is the group of ligaments binding the tibia and fibula at the ankle, including the anterior-inferior tibiofibular ligament.', 'review', 'syndesmosis-2007'),
      ],
      mechanism: [
        c('Often a forceful outward twist or rotation of the foot, or the foot pushed into extreme upward flex with the lower leg turning.', 'review', 'syndesmosis-2007'),
      ],
      gymContext: [
        unk('The sources reviewed do not give gymnastics-specific rates for this injury. Landings that twist the lower leg over a planted foot are a plausible set-up but not a documented rate.'),
      ],
      riskFactors: [
        unk('Risk factors in youth gymnasts are not established in the sources reviewed here.'),
      ],
      signs: [
        c('Pain above the ankle joint at the front or between the shin bones, pain when pushing off or rotating the foot, and difficulty with weight bearing.', 'review', 'syndesmosis-2007'),
      ],
      redFlags: ANKLE_REDFLAGS,
      coachObservations: [
        pol('Note where the athlete points when asked where it hurts. Pain above the ankle joint or in the lower shin is worth passing on to the clinician.'),
      ],
      immediateResponse: [
        pol('Stop the activity, keep the athlete off the foot, and arrange same-day evaluation because this injury can look like an ordinary sprain.'),
      ],
      whoEvaluates: [
        c('A physician or sports medicine clinician. Imaging is often part of the work-up for suspected syndesmosis injury.', 'review', 'syndesmosis-2007'),
      ],
      clinicianWorkup: [
        c('Physical exam tests for the syndesmosis and X-rays, sometimes with additional imaging, are used because instability can be missed.', 'review', 'syndesmosis-2007'),
      ],
      typicalManagement: [
        c('Management depends on whether the ankle is stable. Some are treated without surgery and others need surgery. A clinician decides.', 'review', 'syndesmosis-2007'),
      ],
      tissueRecovery: range('Often described as slower than a lateral sprain. A clinician sets timing.', ['syndesmosis-2007'], {
        uncertain: true,
        note: 'A specific week range is not given here because it depends on stability and treatment.',
      }),
      returnToImpact: range('Set by the clinician after stability and function are confirmed.', ['syndesmosis-2007', 'bern-2016'], { uncertain: true }),
      returnToTumbling: [
        c('Use the same staged, criteria-based return, with the clinician confirming that the ankle tolerates twisting and landing loads before tumbling.', 'consensus', 'bern-2016'),
      ],
      prevention: [
        unk('Evidence for specific prevention of this injury in gymnasts was not found in the sources reviewed here. General landing and balance training applies.'),
      ],
      mythsAndMistakes: [
        c('Assuming that any ankle injury is a lateral sprain misses injuries that need different care.', 'review', 'syndesmosis-2007'),
      ],
      doNot: [...STD_DO_NOT, pol('Do not rotate or squeeze the lower leg to "check" it.')],
      communication: [
        pol('Tell the parent the athlete hurt higher than the ankle and that you want a clinician to look at it today.'),
      ],
      lookAlikes: [c('Lateral ankle sprain, fibula fracture, and growth plate injury.', 'review', 'syndesmosis-2007', 'physeal-2006')],
      questionsForClinician: [
        pol('Is the ankle stable? Do I need to keep the athlete off impact entirely right now?'),
      ],
    },
  },
  {
    id: 'ankle-sprain-medial',
    name: 'Medial ankle (deltoid) sprain',
    aliases: ['deltoid ligament sprain', 'eversion sprain'],
    regions: ['ankle_foot'],
    tissues: ['ligament'],
    tags: ['landing', 'acute', 'ligament', 'sprain'],
    urgency: 'same_day',
    completeness: 'complete',
    review: 'draft',
    related: ['ankle-sprain-lateral', 'ankle-sprain-high'],
    mediaIds: [],
    card: {
      summary: unk(
        'A medial ankle sprain is an injury to the strong ligaments on the inner side of the ankle. It is much less common than an outside sprain, and it can be linked with other injuries, so it needs an evaluation.',
        'ankle-guideline-2018',
      ),
      structures: [c('Deltoid ligament complex on the inner ankle.', 'review', 'syndesmosis-2007')],
      mechanism: [unk('Typically an outward roll or twist of the foot. The sources reviewed do not give detailed mechanisms for youth gymnasts.')],
      gymContext: [unk('No gymnastics-specific data were found in the sources reviewed here.')],
      riskFactors: [unk('Not established in the sources reviewed here.')],
      signs: [c('Pain and swelling on the inner side of the ankle, with difficulty bearing weight.', 'consensus', 'orthoinfo-ankle-sprain')],
      redFlags: ANKLE_REDFLAGS,
      coachObservations: [pol('Note the side where the athlete points to pain, visible swelling, and whether they can bear weight.')],
      immediateResponse: [pol('Stop the activity, keep weight off, and arrange same-day evaluation.')],
      whoEvaluates: [c('Physician or sports medicine clinician, who will check for associated injuries.', 'review', 'syndesmosis-2007')],
      clinicianWorkup: [c('Exam and imaging as the clinician judges; Ottawa rules guide whether X-rays are needed.', 'guideline', 'ottawa-1994')],
      typicalManagement: [c('Directed by the clinician, often with protected, progressive loading as for other sprains.', 'guideline', 'ankle-cpg-2021')],
      tissueRecovery: range('Varies. A clinician sets timing.', ['ankle-cpg-2021'], { uncertain: true }),
      returnToImpact: range('Set by criteria the clinician confirms.', ['bern-2016'], { uncertain: true }),
      returnToTumbling: [c('Staged, criteria-based return with clinician clearance.', 'consensus', 'bern-2016')],
      prevention: [c('General balance and neuromuscular training for ankle injury prevention.', 'guideline', 'ankle-guideline-2018')],
      mythsAndMistakes: [pol('Not every ankle sprain is the common outside kind. Do not assume.')],
      doNot: [...STD_DO_NOT],
      communication: [pol('Report what you saw and when. Ask the parent to share the clinician plan.')],
      lookAlikes: [c('Lateral and high ankle sprains, fractures, and growth plate injury.', 'review', 'syndesmosis-2007')],
      questionsForClinician: [pol('Which activities are safe now and what is the earliest reassessment date?')],
    },
  },
  {
    id: 'severs-disease',
    name: "Sever's disease (calcaneal apophysitis)",
    aliases: ['heel growth plate pain', 'calcaneal apophysitis'],
    regions: ['ankle_foot'],
    tissues: ['growth_plate', 'tendon'],
    tags: ['heel', 'growth', 'overuse', 'jumping', 'youth'],
    urgency: 'soon',
    completeness: 'complete',
    review: 'draft',
    related: ['achilles-tendinopathy', 'osgood-schlatter'],
    mediaIds: [],
    card: {
      summary: c(
        "Sever's disease is heel pain in growing children from irritation at the growth area at the back of the heel bone. It is an overuse problem and is not an infection or a sign of a serious disease, but heel pain still needs a clinician to confirm it.",
        'review',
        'sever-lit-2008',
        'orthoinfo-sever',
      ),
      structures: [
        c('The calcaneal apophysis (growth area at the back of the heel bone), where the Achilles tendon attaches.', 'review', 'sever-lit-2008', 'orthoinfo-sever'),
      ],
      mechanism: [
        c('Repeated pulling and impact at the heel during growth, often with running and jumping.', 'review', 'sever-lit-2008', 'orthoinfo-sever'),
      ],
      gymContext: [
        c('Repetitive landings, running approaches, and vault and tumbling impacts load the heel in many growing gymnasts. Ask the clinician about local load.', 'consensus', 'orthoinfo-sever', 'physeal-2006'),
      ],
      riskFactors: [
        c('Typically seen during growth years in active children. A recent growth spurt and high activity volume are commonly noted.', 'review', 'sever-lit-2008', 'orthoinfo-sever'),
      ],
      signs: [
        c('Heel pain with activity that settles with rest, pain when squeezing the sides of the heel, and sometimes limping.', 'review', 'sever-lit-2008', 'sever-peds-2011'),
      ],
      redFlags: [
        c('Pain at night or at rest, a swollen, red, or warm heel, fever, or injury to the heel after a fall or hard landing needs a clinician soon, because other causes such as fracture or infection must be considered.', 'consensus', 'sever-peds-2011', 'orthoinfo-sever'),
      ],
      coachObservations: [
        pol('Note a limp, landing on the toes to avoid the heel, and whether pain is on one side or both. Ask the athlete where it hurts and do not squeeze the heel to test.'),
      ],
      immediateResponse: [
        pol('Reduce the impact that is causing pain and let the parent know so they can arrange an evaluation. Follow any clinician plan for what the athlete can do.'),
      ],
      whoEvaluates: [c('A physician, sports medicine clinician, or physical therapist.', 'consensus', 'orthoinfo-sever')],
      clinicianWorkup: [
        c('Usually diagnosed from history and exam. A study of children with a clinical diagnosis found X-rays often did not change management, but a clinician decides when imaging is needed.', 'review', 'sever-peds-2011'),
      ],
      typicalManagement: [
        c('Activity modification, heel support or cushioning, and stretching or strengthening plans directed by a clinician are the usual approach.', 'review', 'sever-lit-2008', 'orthoinfo-sever'),
      ],
      tissueRecovery: range('Commonly described as improving with reduced load over weeks to months, with pain that can return during growth.', ['orthoinfo-sever', 'sever-lit-2008'], {
        uncertain: true,
        note: 'The literature review notes weak evidence for treatments and timing, so any range is approximate.',
      }),
      returnToImpact: range('Often guided by pain level with load. The clinician decides.', ['orthoinfo-sever'], { uncertain: true }),
      returnToTumbling: [
        pol('Return to landing volume is gradual: fewer repetitions first, then build. Pain that returns means step back and tell the clinician.'),
      ],
      prevention: [
        c('Load management during growth spurts, appropriate footwear or heel cushioning, and calf flexibility work are commonly advised.', 'consensus', 'orthoinfo-sever', 'physeal-2006'),
      ],
      mythsAndMistakes: [
        c('Heel pain in a growing athlete is not always Sever disease. Waiting without an evaluation can miss other causes.', 'review', 'sever-peds-2011'),
      ],
      doNot: [...STD_DO_NOT],
      communication: [
        pol('Frame it as growth and load, not something the athlete did wrong. Share the plan for how many landings are okay this week.'),
      ],
      lookAlikes: [c('Achilles tendinopathy, heel stress fracture, plantar fascia irritation, and infection.', 'consensus', 'orthoinfo-sever', 'orthoinfo-stress-fx')],
      questionsForClinician: [pol('How many landings or runs a practice are okay while it settles? Do you advise heel cups or a stretching plan?')],
    },
  },
]
