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
]
