import type { ComparisonTable } from './types'

export const COMPARISONS: ComparisonTable[] = [
  {
    id: 'cmp-spondylo',
    title: 'The four "spondy" words',
    intro: 'Same root, different conditions. A coach cannot tell them apart by looking. Only a clinician can.',
    columns: [
      { id: 'lysis', label: 'Spondylolysis' },
      { id: 'listhesis', label: 'Spondylolisthesis' },
      { id: 'osis', label: 'Spondylosis' },
      { id: 'itis', label: 'Spondylitis' },
    ],
    rows: [
      {
        label: 'Meaning in one line',
        cells: {
          lysis: 'A crack or stress fracture in the pars interarticularis of a vertebra.',
          listhesis: 'A vertebra has slipped forward on the one below.',
          osis: 'Degenerative wear (arthritis) of the spine.',
          itis: 'Inflammation of the vertebrae or spinal joints. One type is ankylosing spondylitis.',
        },
        sourceIds: ['orthoinfo-spondy', 'hss-spondylosis', 'medlineplus-as'],
      },
      {
        label: 'What kind of problem',
        cells: {
          lysis: 'Bone stress or fracture.',
          listhesis: 'Alignment change, often after a pars fracture.',
          osis: 'Wear-and-tear change.',
          itis: 'Inflammatory disease.',
        },
        sourceIds: ['orthoinfo-spondy', 'hss-spondylosis', 'medlineplus-as'],
      },
      {
        label: 'Where',
        cells: {
          lysis: 'Most often the fifth lumbar vertebra, sometimes the fourth.',
          listhesis: 'Lower lumbar levels in the common young-athlete form.',
          osis: 'Often neck and low back.',
          itis: 'Spine and the joints between spine and pelvis in ankylosing spondylitis.',
        },
        sourceIds: ['orthoinfo-spondy', 'hss-spondylosis', 'medlineplus-as'],
      },
      {
        label: 'Typical age and setting',
        cells: {
          lysis: 'Children and adolescents, including gymnasts.',
          listhesis: 'Children and teens in a growth spurt after a pars fracture.',
          osis: 'Mainly with age.',
          itis: 'Varies. It is a medical disease and not an overuse injury.',
        },
        sourceIds: ['orthoinfo-spondy', 'hss-spondylosis', 'medlineplus-as'],
      },
      {
        label: 'Common symptoms',
        cells: {
          lysis: 'Low back pain, often worse with arching and activity, easing with rest.',
          listhesis: 'Back pain, stiffness, tight hamstrings. Leg tingling or weakness in higher-grade slips.',
          osis: 'Stiffness, back or neck pain, and sometimes nerve symptoms.',
          itis: 'Back pain and stiffness that can range from mild to severe.',
        },
        sourceIds: ['orthoinfo-spondy', 'hss-spondylosis', 'medlineplus-as'],
      },
      {
        label: 'Gymnastics relevance',
        cells: {
          lysis: 'High. Repeated arching is a classic set-up.',
          listhesis: 'Follow-up of an untreated or slow-healing pars fracture.',
          osis: 'Low for young gymnasts. Coaches may see it in adult athletes.',
          itis: 'Low. A reason to send persistent night or morning back pain to a physician.',
        },
        sourceIds: ['orthoinfo-spondy', 'gymnast-spondylolysis-1976', 'gym-spine-2009'],
      },
      {
        label: 'Who evaluates',
        cells: {
          lysis: 'Physician or sports medicine or spine specialist.',
          listhesis: 'Physician or orthopedic or spine specialist.',
          osis: 'Physician or spine clinician.',
          itis: 'Physician, often rheumatology.',
        },
        sourceIds: ['orthoinfo-spondy', 'hss-spondylosis', 'medlineplus-as'],
      },
      {
        label: 'Common mix-up',
        cells: {
          lysis: 'Called "spondylosis" by mistake.',
          listhesis: 'Mistaken for a "slipped disc", which is a different problem.',
          osis: 'Mistaken for a pars stress injury.',
          itis: 'Mistaken for an overuse injury.',
        },
        sourceIds: ['orthoinfo-spondy', 'hss-spondylosis'],
      },
    ],
    footnote:
      'Educational summary. It does not help a coach decide which condition an athlete has. Back pain that persists, comes with arching, wakes the athlete at night, or comes with leg numbness or weakness needs a clinician.',
  },
  {
    id: 'cmp-salter-harris',
    title: 'Salter-Harris growth plate fracture types (as summarized by AAOS)',
    intro: 'The Salter-Harris system is the most widely used way doctors classify growth plate fractures. Coaches do not classify them.',
    columns: [{ id: 'what', label: 'What the break does' }],
    rows: [
      { label: 'Type I', cells: { what: 'Breaks through the bone at the growth plate, separating the bone end from the shaft and completely disrupting the growth plate.' }, sourceIds: ['orthoinfo-growth-plate'] },
      { label: 'Type II', cells: { what: 'Breaks through part of the bone at the growth plate and cracks through the shaft as well. The most common type.' }, sourceIds: ['orthoinfo-growth-plate'] },
      { label: 'Type III', cells: { what: 'Crosses part of the growth plate and breaks off a piece of the bone end. More common in older children.' }, sourceIds: ['orthoinfo-growth-plate'] },
      { label: 'Type IV', cells: { what: 'Breaks through the shaft, the growth plate, and the end of the bone.' }, sourceIds: ['orthoinfo-growth-plate'] },
      { label: 'Type V', cells: { what: 'A crushing injury to the growth plate from a compression force. Rare.' }, sourceIds: ['orthoinfo-growth-plate'] },
    ],
    footnote: 'Some non-displaced growth plate fractures cannot be seen on X-rays, so the clinical exam is key.',
  },
  {
    id: 'cmp-ankle',
    title: 'Three ankle sprains side by side',
    intro: 'Where the athlete points to pain is a clue for the clinician. It is not a diagnosis for the coach.',
    columns: [
      { id: 'lateral', label: 'Lateral (outside)' },
      { id: 'high', label: 'High ankle (syndesmosis)' },
      { id: 'medial', label: 'Medial (deltoid)' },
    ],
    rows: [
      {
        label: 'Structure',
        cells: {
          lateral: 'ATFL and sometimes CFL on the outside of the ankle.',
          high: 'Ligaments binding the tibia and fibula above the ankle joint.',
          medial: 'Deltoid ligament on the inside of the ankle.',
        },
        sourceIds: ['ankle-cpg-2021', 'syndesmosis-2007'],
      },
      {
        label: 'Typical mechanism',
        cells: {
          lateral: 'Foot rolls inward.',
          high: 'Forceful outward rotation or twist.',
          medial: 'Outward roll or twist. Details are not given in the sources reviewed.',
        },
        sourceIds: ['ankle-guideline-2018', 'syndesmosis-2007'],
      },
      {
        label: 'How common',
        cells: {
          lateral: 'The most common ankle injury in sport.',
          high: 'Less common.',
          medial: 'Less common than lateral.',
        },
        sourceIds: ['ankle-guideline-2018', 'syndesmosis-2007'],
      },
      {
        label: 'Coach action',
        cells: {
          lateral: 'Stop, keep weight off, call parent, same-day evaluation if no weight bearing.',
          high: 'Same-day evaluation, because it can look like a lateral sprain.',
          medial: 'Same-day evaluation.',
        },
        sourceIds: ['ottawa-1994', 'ottawa-sr-2003'],
      },
    ],
    footnote: 'A fracture, including a growth plate fracture in a child, can look the same as a sprain.',
  },
  {
    id: 'cmp-recovery',
    title: 'Published recovery ranges used in this module',
    intro: 'Only ranges that a source actually gives are shown. Everything else says "not given". These are estimates for groups, not promises for one athlete.',
    columns: [
      { id: 'range', label: 'Range given by the source' },
      { id: 'meaning', label: 'What it does and does not mean' },
    ],
    rows: [
      {
        label: 'Concussion: symptoms settling',
        cells: {
          range: 'Most children feel better within 2 to 4 weeks. Some have symptoms for months or longer.',
          meaning: 'The usual time symptoms take to settle. It is not a return-to-play date. A healthcare provider clears return.',
        },
        sourceIds: ['cdc-basics', 'cdc-coach-sheet'],
      },
      {
        label: 'Wrist ganglion: after surgical excision',
        cells: {
          range: 'Most people return to normal activities in about 2 to 6 weeks.',
          meaning: 'Normal daily activity, not weight-bearing gymnastics. A clinician decides on weight bearing.',
        },
        sourceIds: ['orthoinfo-ganglion'],
      },
      {
        label: 'Growth plate fracture',
        cells: {
          range: 'A child bone heals quickly, but a growth plate fracture can still take several weeks to heal fully. Follow-up continues for at least a year, and longer for some.',
          meaning: 'Several weeks is a broad statement, not a return-to-impact date.',
        },
        sourceIds: ['orthoinfo-growth-plate'],
      },
      {
        label: 'Ankle sprain, ACL, meniscus, hamstring, pars stress injury, scaphoid, wrist growth plate stress injury',
        cells: {
          range: 'Not given',
          meaning: 'The sources reviewed describe criteria-based care and do not publish one safe number a coach can quote.',
        },
        sourceIds: ['ankle-cpg-2021', 'bern-2016'],
      },
    ],
    footnote: 'Healing of tissue and return to impact are different questions, and each injury card keeps them as separate fields.',
  },
  {
    id: 'cmp-ladder',
    title: 'Return-to-tumbling ladder (teaching framework)',
    intro: 'A ShapeLab framework. Use the clinician written steps when you have them. Each rung needs the clinician OK and no new symptoms.',
    columns: [
      { id: 'what', label: 'What it looks like' },
      { id: 'stop', label: 'Stop and step back if' },
    ],
    rows: [
      { label: '0. Cleared to start', cells: { what: 'The clinician has said the athlete can begin a return plan. Walking and daily life are pain-free.', stop: 'There is no written clearance.' } },
      { label: '1. Strength and mobility away from the floor', cells: { what: 'Clinician-approved conditioning and mobility. Upper-body or lower-body work that avoids the injured area.', stop: 'Pain or swelling at the injured area.' } },
      { label: '2. Low-impact skills', cells: { what: 'Low-level positions and drills at floor height: shapes, holds, balance, light locomotion.', stop: 'Pain, limp, or a change in movement.' } },
      { label: '3. Controlled landings', cells: { what: 'Small jumps to stable landings, then increased height or repetitions, with the coach watching mechanics.', stop: 'Pain after landing, a collapsing knee, or swelling next morning.' } },
      { label: '4. Basic tumbling progressions', cells: { what: 'Simple skills on soft surfaces and spotted if appropriate, low volume.', stop: 'Pain, fear that changes technique, or a new symptom.' } },
      { label: '5. Full skill return', cells: { what: 'Normal progressions and volume built back step by step, with the clinician check-in.', stop: 'Symptoms return when load goes up. Drop back one rung.' } },
    ],
    footnote: 'Teaching labels, not a standardized protocol. No standard length for each rung is given in the sources reviewed.',
  },
  {
    id: 'cmp-shoulder-pain',
    title: 'Shoulder pain labels',
    intro: 'The names overlap and change over time. A clinician decides which one fits.',
    columns: [
      { id: 'sps', label: 'Subacromial pain syndrome' },
      { id: 'rcrsp', label: 'Rotator cuff related pain' },
      { id: 'internal', label: 'Internal impingement' },
    ],
    rows: [
      {
        label: 'What the name describes',
        cells: {
          sps: 'Pain at the front or side of the shoulder with arm raising. Replaces the older term "subacromial impingement".',
          rcrsp: 'An umbrella term for pain thought to involve the rotator cuff, used because the cause is often multifactorial.',
          internal: 'Contact of the under-surface of the cuff on the back-upper rim of the socket with the arm up and rotated back.',
        },
        sourceIds: ['sps-guideline-2026', 'rcrsp-lewis-2016', 'internal-impingement-2009'],
      },
      {
        label: 'Typical athletes',
        cells: {
          sps: 'Anyone who loads overhead repeatedly.',
          rcrsp: 'Anyone who loads overhead repeatedly.',
          internal: 'Throwing and overhead athletes in the literature.',
        },
        sourceIds: ['sps-guideline-2014', 'internal-impingement-2009'],
      },
      {
        label: 'First-line management',
        cells: {
          sps: 'Exercise therapy and load management.',
          rcrsp: 'Exercise therapy and load management.',
          internal: 'Rest from the provoking position and rehabilitation.',
        },
        sourceIds: ['sps-guideline-2026', 'rcrsp-lewis-2016', 'internal-impingement-2009'],
      },
    ],
    footnote: 'Educational summary. It cannot be used to label an athlete.',
  },
  {
    id: 'cmp-hip-shape',
    title: 'Hip shape versus FAI syndrome',
    intro: 'Many hips have a cam or pincer shape without any symptoms.',
    columns: [
      { id: 'shape', label: 'Shape on imaging only' },
      { id: 'syndrome', label: 'FAI syndrome' },
    ],
    rows: [
      {
        label: 'Symptoms',
        cells: { shape: 'None.', syndrome: 'Hip or groin pain related to movement or position; sometimes clicking, catching, or stiffness.' },
        sourceIds: ['warwick-fai-2016'],
      },
      {
        label: 'Clinical signs',
        cells: { shape: 'Not required, may be absent.', syndrome: 'Positive findings on a clinician exam.' },
        sourceIds: ['warwick-fai-2016'],
      },
      {
        label: 'How common',
        cells: { shape: 'Cam shape was found in about a third of hips of people without pain in a systematic review, more often in athletes.', syndrome: 'Less common than the shape alone.' },
        sourceIds: ['fai-asymptomatic-2015'],
      },
      {
        label: 'What it means for training',
        cells: { shape: 'Nothing on its own. Do not change training because of a scan without a clinician plan.', syndrome: 'Follow the clinician plan for which hip positions to limit.' },
        sourceIds: ['warwick-fai-2016'],
      },
    ],
  },
  {
    id: 'cmp-wrist-pain',
    title: 'Back-of-wrist and wrist pain in gymnasts',
    intro: 'Several conditions cause wrist pain with weight bearing. They need different care, and only a clinician can tell them apart.',
    columns: [
      { id: 'dorsal', label: 'Dorsal impingement' },
      { id: 'gymwrist', label: 'Gymnast wrist' },
      { id: 'ganglion', label: 'Ganglion cyst' },
      { id: 'tfcc', label: 'TFCC injury' },
    ],
    rows: [
      {
        label: 'Main tissue',
        cells: {
          dorsal: 'Joint capsule and soft tissue at the back of the wrist.',
          gymwrist: 'Growth plate at the end of the radius in growing athletes.',
          ganglion: 'A fluid-filled sac from a joint or tendon sheath.',
          tfcc: 'Cartilage and ligament complex on the little-finger side.',
        },
        sourceIds: ['dorsal-wrist-2017', 'gymnast-wrist-webb-2008', 'ganglion-review-2014'],
      },
      {
        label: 'Where it hurts',
        cells: {
          dorsal: 'Back of the wrist at the end of loaded extension.',
          gymwrist: 'Thumb side of the wrist at the end of the forearm, with weight bearing.',
          ganglion: 'Often a visible lump on the back of the wrist; may or may not hurt.',
          tfcc: 'Little-finger side of the wrist, often with twisting.',
        },
        sourceIds: ['dorsal-wrist-2017', 'gymnast-wrist-2006', 'ganglion-review-2014', 'gymnast-wrist-webb-2008'],
      },
      {
        label: 'Coach action',
        cells: {
          dorsal: 'Reduce loaded extension, arrange a clinician visit.',
          gymwrist: 'Stop weight bearing on that wrist, arrange a clinician visit.',
          ganglion: 'Do not press or "pop" it. Arrange a clinician visit.',
          tfcc: 'Reduce loading, arrange a clinician visit.',
        },
        sourceIds: ['gymnast-wrist-webb-2008', 'orthoinfo-ganglion'],
      },
    ],
    footnote: 'TFCC full card is in preparation. This table cannot be used to name an injury.',
  },
  {
    id: 'cmp-foot-posture',
    title: 'Foot terms that get mixed up',
    intro: 'These words describe movement or shape. None of them is a diagnosis on its own.',
    columns: [
      { id: 'pronation', label: 'Pronation' },
      { id: 'eversion', label: 'Eversion' },
      { id: 'flexflat', label: 'Flexible flatfoot' },
      { id: 'rigidflat', label: 'Rigid flatfoot' },
    ],
    rows: [
      {
        label: 'What it is',
        cells: {
          pronation: 'A normal three-plane foot motion: eversion, abduction, and dorsiflexion combined, with the arch lowering.',
          eversion: 'Only the frontal-plane part: the sole tilts outward. One part of pronation.',
          flexflat: 'Arch flattens when standing but reappears on tiptoe or sitting.',
          rigidflat: 'Arch stays flat even off the floor or on tiptoe.',
        },
        sourceIds: ['neumann-kinesiology', 'orthoinfo-flatfoot', 'peds-pes-planus-2016'],
      },
      {
        label: 'Normal?',
        cells: {
          pronation: 'Yes. It absorbs shock and adapts the foot to the surface.',
          eversion: 'Yes, within normal range.',
          flexflat: 'Common in children and usually painless.',
          rigidflat: 'Less common and more likely to need evaluation.',
        },
        sourceIds: ['neumann-kinesiology', 'peds-pes-planus-2016', 'orthoinfo-flatfoot'],
      },
      {
        label: 'When to refer',
        cells: {
          pronation: 'Pain, asymmetry that is new, or a change in how the athlete moves.',
          eversion: 'Pain or after an injury.',
          flexflat: 'Pain, stiffness, or trouble with activity.',
          rigidflat: 'Always worth a clinician visit.',
        },
        sourceIds: ['peds-pes-planus-2016', 'orthoinfo-flatfoot'],
      },
    ],
  },
  {
    id: 'cmp-capacity-terms',
    title: 'Eight distinctions coaches should keep apart',
    intro: 'Each pair sounds similar and leads to different decisions.',
    columns: [
      { id: 'a', label: 'This' },
      { id: 'b', label: 'Is not the same as' },
    ],
    rows: [
      { label: 'Exposure and adaptation', cells: { a: 'Exposure: doing the position or load.', b: 'Adaptation: the tissue actually getting more capable over weeks, which needs recovery between doses.' }, sourceIds: ['tendon-adaptation-2015'] },
      { label: 'Underprepared and conditioned tissue', cells: { a: 'Underprepared: new to a load or returning after time off.', b: 'Conditioned: built up gradually to that load.' }, sourceIds: ['trampoline-growth-2021'] },
      { label: 'Passive flexibility and active control', cells: { a: 'Passive: range reached with help, gravity, or a partner.', b: 'Active: range the athlete can reach and hold with their own muscles.' }, sourceIds: ['neumann-kinesiology'] },
      { label: 'Partial and full-range strength', cells: { a: 'Strong through part of the range.', b: 'Strong through the whole range the sport demands.' } },
      { label: 'Exercise discomfort and concerning pain', cells: { a: 'Muscle effort, burning, or mild soreness that settles within a day or two.', b: 'Sharp, joint-line, worsening, or next-day pain; swelling; giving way; numbness.' } },
      { label: 'Healthy stress and excessive load', cells: { a: 'Load the athlete recovers from before the next session.', b: 'Load that leaves symptoms building week to week.' }, sourceIds: ['trampoline-growth-2021'] },
      { label: 'Appropriate progression and unnecessary risk', cells: { a: 'One dial changed, the current level done consistently.', b: 'Several dials changed at once, or progressing through symptoms.' } },
      { label: 'Training capacity and injury prevention', cells: { a: 'A measurable improvement in strength or endurance.', b: 'Fewer injuries, shown in studies. Rarely established.' }, sourceIds: ['nordic-sr-2019'] },
    ],
    footnote: 'Rows without a source are ShapeLab coaching definitions.',
  },
  {
    id: 'cmp-exposure-dials',
    title: 'Progressive exposure: one dial at a time',
    intro: 'Start at the easy end. Move one dial when the current level is consistent and symptoms are settled.',
    columns: [
      { id: 'easy', label: 'Easier' },
      { id: 'hard', label: 'Harder' },
      { id: 'example', label: 'Example' },
    ],
    rows: [
      { label: 'Range of motion', cells: { easy: 'Partial range', hard: 'Full sport range', example: 'Split squat to half depth, then rear knee to the floor.' } },
      { label: 'External load', cells: { easy: 'Bodyweight', hard: 'Added weight', example: 'Slant board squat, then holding a dumbbell.' }, sourceIds: ['pf-squat-load-2002'] },
      { label: 'Lever length', cells: { easy: 'Short lever', hard: 'Long lever', example: 'Back extension arms by sides, then arms overhead.' } },
      { label: 'Time under tension', cells: { easy: 'Short holds', hard: 'Long holds', example: 'Back extension holds building toward ShapeLab coaching targets.' } },
      { label: 'Eccentric demand', cells: { easy: 'Assisted lowering', hard: 'Full controlled lowering', example: 'Band-assisted Nordic, then full Nordic.' }, sourceIds: ['nordic-volume-2020'] },
      { label: 'Balance demand', cells: { easy: 'Two feet, supported', hard: 'One foot, unsupported', example: 'Poliquin step with a hand on the wall, then free.' } },
      { label: 'Impact demand', cells: { easy: 'No impact', hard: 'Repeated landings', example: 'Sled push before jump landings after time off.' } },
      { label: 'Speed', cells: { easy: 'Slow tempo', hard: 'Fast or reactive', example: 'Slow squats before rebound jumps.' } },
      { label: 'Repetition volume', cells: { easy: 'Few reps', hard: 'More reps or sets', example: 'Low-volume Nordic programmes gave similar gains to high volume.' }, sourceIds: ['nordic-volume-2020'] },
      { label: 'Task complexity', cells: { easy: 'Single joint, single plane', hard: 'Multi-joint, multi-plane, skill-like', example: 'Hollow hold, then hollow rocks, then hollow in a skill.' } },
    ],
  },
  {
    id: 'cmp-progression-paths',
    title: 'Example progression paths (healthy athletes)',
    intro: 'Teaching examples. Move forward only when the current step is consistent and symptoms are settled; step back if they are not.',
    columns: [
      { id: 'knee', label: 'Knee capacity' },
      { id: 'ham', label: 'Hamstring' },
      { id: 'trunk', label: 'Trunk extensors' },
    ],
    rows: [
      { label: 'Step 1', cells: { knee: 'Backward walking, sled pulls', ham: 'Glute bridges', trunk: 'Superman holds' } },
      { label: 'Step 2', cells: { knee: 'Poliquin steps, low height, hand support', ham: 'Band-assisted Nordic, short range', trunk: 'Back extension holds, short' } },
      { label: 'Step 3', cells: { knee: 'Slant board squats, partial depth', ham: 'Nordic, longer controlled range', trunk: 'Back extension holds toward ShapeLab targets' } },
      { label: 'Step 4', cells: { knee: 'Split squats with knee travel, full range', ham: 'Full Nordic, low weekly volume', trunk: 'Slow dynamic back extensions' } },
      { label: 'Step 5', cells: { knee: 'Sissy squats or loaded slant squats', ham: 'Slower or longer lowers', trunk: 'Jefferson curls only after the readiness steps and supervision' } },
    ],
    footnote: 'No universal time or pass mark per step. Clinician plans override this table after any injury.',
  },
]
