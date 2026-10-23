import type { Condition } from '../types'
import { c, pol, range, unk, STD_DO_NOT } from '../author'

export const MUSCLE_TENDON: Condition[] = [
  {
    id: 'hamstring-strain',
    name: 'Hamstring strain',
    aliases: ['pulled hamstring', 'hamstring tear'],
    regions: ['muscle_tendon'],
    tissues: ['muscle', 'tendon'],
    tags: ['split', 'stretch', 'acute', 'back of thigh', 'sprint'],
    urgency: 'soon',
    completeness: 'complete',
    review: 'draft',
    related: ['achilles-tendinopathy', 'spondylolysis', 'growth-plate-fracture'],
    mediaIds: [],
    card: {
      summary: c(
        'A hamstring strain is a stretch or tear of the muscles on the back of the thigh. It usually happens during a fast, powerful, or extreme-stretch movement, and a severe one can be accompanied by a pop, bruising, or trouble walking.',
        'review',
        'hamstring-cpg-2010',
        'orthoinfo-hamstring',
      ),
      structures: [
        c('Biceps femoris, semitendinosus, and semimembranosus, crossing the hip and knee, with tendons attaching near the sit bone.', 'review', 'hamstring-cpg-2010'),
      ],
      mechanism: [
        c('Commonly reported during high-speed running and during movements with extreme hip flexion with the knee straight, such as high kicking or splits.', 'review', 'hamstring-cpg-2010'),
      ],
      gymContext: [
        c('Sprint approaches, leaps, and over-splits or forced straddle and pike stretches are plausible set-ups. Specific rates in gymnasts are not given in the sources reviewed here.', 'consensus', 'hamstring-cpg-2010'),
      ],
      riskFactors: [
        c('A previous hamstring strain is commonly reported as a risk factor. Strength imbalance and fatigue are discussed but their role is debated.', 'review', 'hamstring-cpg-2010'),
      ],
      signs: [
        c('Sudden pain in the back of the thigh, tenderness, sometimes a pop and bruising, and pain with stretching or contracting the muscle.', 'review', 'hamstring-cpg-2010', 'orthoinfo-hamstring'),
      ],
      redFlags: [
        c('A bony pull at the sit bone in a growing athlete (an avulsion fracture), inability to walk, severe bruising, numbness, or a deformed thigh needs prompt evaluation.', 'consensus', 'orthoinfo-hamstring', 'physeal-2006'),
      ],
      coachObservations: [pol('Note the skill, whether there was a pop, whether the athlete can walk without a limp, and any visible bruising later.')],
      immediateResponse: [pol('Stop the activity and avoid stretching the painful muscle. Tell the parent and arrange an evaluation if pain is more than mild or the athlete limps.')],
      whoEvaluates: [c('Physician, sports medicine clinician, or physical therapist.', 'review', 'hamstring-cpg-2010')],
      clinicianWorkup: [c('History and exam, with imaging used in selected cases, such as suspected avulsion or a high-grade tear.', 'review', 'hamstring-cpg-2010')],
      typicalManagement: [c('Short protection followed by progressive loading and strengthening. A clinician sets the program.', 'review', 'hamstring-cpg-2010')],
      tissueRecovery: range('Varies widely with the severity and location of the injury. A clinician sets timing.', ['hamstring-cpg-2010'], { uncertain: true }),
      returnToImpact: range('Criteria-based: pain-free strength and sprint progression cleared by a clinician.', ['hamstring-cpg-2010', 'bern-2016'], { uncertain: true }),
      returnToTumbling: [
        c('Return of speed and extreme-range loading is last in the progression. Tumbling approaches, leaps, and split positions are re-introduced in stages.', 'consensus', 'hamstring-cpg-2010'),
      ],
      prevention: [
        c('Strength and flexibility training, and a gradual build-up of high-speed and extreme-range work.', 'review', 'hamstring-cpg-2010'),
      ],
      mythsAndMistakes: [
        pol('Stretching a freshly injured hamstring hard to "loosen it up" can make it worse.'),
        unk('Whether any one stretching routine reduces the risk of a first hamstring strain in youth athletes is not settled by the sources reviewed here.'),
      ],
      doNot: [...STD_DO_NOT, pol('Do not push the athlete into a split to test the range.')],
      communication: [pol('Tell the family the skill, the time, and whether there was a pop. Ask the clinician for a written return plan.')],
      lookAlikes: [c('Back pain referred to the thigh, sit-bone growth plate injury, and nerve irritation.', 'review', 'hamstring-cpg-2010', 'orthoinfo-hamstring')],
      questionsForClinician: [pol('When can the athlete stretch again and when can they return to full-range splits and leaps?')],
    },
  },
  {
    id: 'achilles-tendinopathy',
    name: 'Achilles tendinopathy',
    aliases: ['Achilles tendinitis', 'midportion Achilles pain'],
    regions: ['muscle_tendon', 'ankle_foot'],
    tissues: ['tendon'],
    tags: ['overuse', 'heel cord', 'jumping', 'stiffness', 'morning'],
    urgency: 'soon',
    completeness: 'complete',
    review: 'draft',
    related: ['severs-disease', 'hamstring-strain'],
    mediaIds: [],
    card: {
      summary: c(
        'Achilles tendinopathy is pain and stiffness in the tendon at the back of the ankle from repeated load. It is usually an overuse problem that builds over weeks, but a sudden sharp pain or a pop needs urgent evaluation.',
        'guideline',
        'achilles-cpg-2024',
        'orthoinfo-achilles',
      ),
      structures: [c('Achilles tendon, joining the calf muscles to the heel bone.', 'guideline', 'achilles-cpg-2024')],
      mechanism: [c('Load builds faster than the tendon adapts, such as a sudden increase in jumping, running, or impact volume.', 'guideline', 'achilles-cpg-2024', 'orthoinfo-achilles')],
      gymContext: [c('Repeated rebounds, vault run-ups, and tumbling passes load the Achilles. Gymnast-specific rates are not given in the sources reviewed here.', 'consensus', 'achilles-cpg-2024')],
      riskFactors: [c('Rapid increase in training load, and in some people, calf strength and flexibility problems.', 'guideline', 'achilles-cpg-2024')],
      signs: [c('Pain and stiffness in the tendon, often worse in the morning and at the start of activity, with local tenderness and thickening.', 'guideline', 'achilles-cpg-2024', 'orthoinfo-achilles')],
      redFlags: [
        c('A sudden snap or pop, a sudden sharp pain, or inability to push off or stand on tiptoe can be a tendon rupture and needs same-day evaluation.', 'consensus', 'orthoinfo-achilles'),
      ],
      coachObservations: [pol('Note stiffness at warm-up, limping, and whether pain is at the heel or in the middle of the tendon.')],
      immediateResponse: [pol('Reduce the loads that provoke pain, tell the parent, and arrange an evaluation. A sudden pop or sharp pain is treated as urgent.')],
      whoEvaluates: [c('Physician, sports medicine clinician, or physical therapist.', 'guideline', 'achilles-cpg-2024')],
      clinicianWorkup: [c('History and exam; imaging when the picture is unclear.', 'guideline', 'achilles-cpg-2024')],
      typicalManagement: [c('Exercise-based loading programs are central to tendinopathy management in the guideline. A clinician sets the program.', 'guideline', 'achilles-cpg-2024')],
      tissueRecovery: range('Tendons adapt slowly, often over months. A clinician sets expectations.', ['achilles-cpg-2024'], { uncertain: true, note: 'The guideline describes progressive loading phases rather than one safe number.' }),
      returnToImpact: range('Criteria-based progression of load and impact.', ['achilles-cpg-2024'], { uncertain: true }),
      returnToTumbling: [pol('Impact volume is built in small steps with symptoms monitored the next morning.')],
      prevention: [c('Gradual changes in load and attention to calf strength and capacity.', 'guideline', 'achilles-cpg-2024')],
      mythsAndMistakes: [c('Complete long-term rest is not the usual goal. Tendon rehabilitation relies on well-dosed loading.', 'guideline', 'achilles-cpg-2024')],
      doNot: [...STD_DO_NOT],
      communication: [pol('Ask the family to share the clinician loading plan so the gym program fits it.')],
      lookAlikes: [c('Heel growth plate irritation (Sever disease) in younger athletes, partial tears, and heel bone problems.', 'consensus', 'orthoinfo-achilles', 'orthoinfo-sever')],
      questionsForClinician: [pol('Which impact is okay and how should I scale volume this week?')],
    },
  },
]
