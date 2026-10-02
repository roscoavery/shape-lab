/**
 * Physics Playground pack — 6 draft scenarios about the physics behind
 * tucks, layouts, and takeoffs. Every number is an ILLUSTRATIVE model,
 * stated in plain language on screen. Nothing here predicts any
 * athlete's real capability.
 */

export type PhysicsVariable = {
  label: string
  min: number
  max: number
  step: number
  unit: string
  start: number
}

export type PhysicsDemo =
  | { kind: 'spinner' }
  | { kind: 'pair' }
  | { kind: 'arc' }

export type PhysicsCompute = (v: number) => {
  /** Headline number shown above the demo. */
  headline: string
  /** Supporting line shown under the headline. */
  sub: string
  /** One full animation cycle, ms. 0 = no motion (static figure). */
  durationMs: number
  /** 0–100, relative arc height for the projectile demo. Ignored otherwise. */
  arcHeight?: number
}

export type PhysicsScenario = {
  id: string
  title: string
  /** Plain-language model limits, shown before the question. */
  assumptions: string
  question: string
  options: string[]
  answer: number
  variable: PhysicsVariable
  demo: PhysicsDemo
  compute: PhysicsCompute
  explain: string
}

const G = 9.81

export const PHYSICS_SCENARIOS: PhysicsScenario[] = [
  {
    id: 'pp-tuck',
    title: 'Tighter tuck, faster spin',
    assumptions:
      'Illustrative model: once you are airborne, angular momentum stays fixed. Tucking only redistributes it — it cannot create spin from nothing.',
    question: 'At a fixed angular momentum, a tighter tuck makes the flip…',
    options: ['Faster', 'Slower', 'The same speed'],
    answer: 0,
    variable: { label: 'How tight the tuck (as % of layout radius)', min: 40, max: 100, step: 5, unit: '%', start: 70 },
    demo: { kind: 'spinner' },
    compute: (v) => {
      const k = v / 100
      const omega = 0.9 / (k * k)
      return {
        headline: `${omega.toFixed(1)} flips / second`,
        sub: `L fixed · spin rate grows as 1 ÷ radius² · tuck at ${v}%`,
        durationMs: Math.min(1200, Math.max(220, 1000 / omega)),
      }
    },
    explain:
      'L = I × ω. Tucking pulls mass closer to the spin axis, so I shrinks — and ω must grow to keep L the same. A layout is a big, slow wheel; a tight tuck is a small, fast one.',
  },
  {
    id: 'pp-arms',
    title: 'Arms up vs arms wide',
    assumptions:
      'Same illustrative model: fixed angular momentum, arms move mass closer to or farther from the spin axis.',
    question: 'Same jump, same takeoff — arms wide open vs arms tight by the ears. The wide-armed flip is…',
    options: ['Faster', 'Slower', 'The same speed'],
    answer: 1,
    variable: { label: 'Arm spread', min: 0, max: 100, step: 5, unit: '% wide', start: 25 },
    demo: { kind: 'spinner' },
    compute: (v) => {
      const mult = 1 + 0.6 * (v / 100)
      const omega = 1.2 / mult
      return {
        headline: `${omega.toFixed(2)} flips / second`,
        sub: `Arms ${v}% wide raises spin inertia ×${mult.toFixed(2)} — spin drops`,
        durationMs: Math.min(1200, Math.max(260, 1000 / omega)),
      }
    },
    explain:
      'Wide arms put mass far from the axis, so I grows and ω falls. Arms tight by the ears keep I small and the spin quick — that is why athletes whip the arms in to speed up.',
  },
  {
    id: 'pp-time',
    title: 'Same rate, same time',
    assumptions:
      'This one holds rotation RATE fixed — the opposite of the first two. It shows what shape does and does not do to time.',
    question:
      'Two athletes rotate at exactly the same rate — one tucked, one laid out. Who finishes one full flip first?',
    options: ['The tucked athlete', 'The laid-out athlete', 'They tie'],
    answer: 2,
    variable: { label: 'Rotation rate', min: 0.5, max: 2, step: 0.1, unit: 'flips/s', start: 1.2 },
    demo: { kind: 'pair' },
    compute: (v) => {
      const t = 1 / v
      return {
        headline: `${t.toFixed(2)} s per flip`,
        sub: `Tuck and layout — identical, because rate is held fixed`,
        durationMs: Math.min(2500, Math.max(400, t * 1000)),
      }
    },
    explain:
      'Time for one flip = 1 ÷ rate, no matter the shape. Shape matters because it sets how much rate you can squeeze from the same angular momentum — a tighter shape earns more flips per second, so it needs less air time.',
  },
  {
    id: 'pp-flight',
    title: 'Jump higher, stay up longer?',
    assumptions:
      'Simple ballistic model: no air resistance, takeoff and landing at the same height. Takeoff speed is fixed here — only the height varies.',
    question: 'Doubling your jump height does what to flight time?',
    options: ['Doubles it', 'Adds about 41% more', 'Barely changes it'],
    answer: 1,
    variable: { label: 'Jump height', min: 10, max: 80, step: 5, unit: 'cm', start: 40 },
    demo: { kind: 'arc' },
    compute: (v) => {
      const h = v / 100
      const t = 2 * Math.sqrt((2 * h) / G)
      return {
        headline: `${t.toFixed(2)} s in the air`,
        sub: `At 1.5 flips/s that fits ${(1.5 * t).toFixed(1)} flips · flight time grows with √height`,
        durationMs: t * 1000,
        arcHeight: Math.round(((v - 10) / 70) * 80 + 10),
      }
    },
    explain:
      'Flight time grows with the square root of height, not height itself. Doubling height multiplies time by √2 ≈ 1.41 — about 41% more air, not twice.',
  },
  {
    id: 'pp-impulse',
    title: 'What it takes to go higher',
    assumptions:
      'The simplest jump model: peak height h = v² ÷ 2g, where v is takeoff speed. Real legs are messier — this is the relationship, not a training target.',
    question: 'To double your jump height, you must…',
    options: ['Double takeoff speed', 'Raise takeoff speed ~41%', 'Push for twice as long'],
    answer: 1,
    variable: { label: 'Takeoff speed', min: 2, max: 6, step: 0.1, unit: 'm/s', start: 4 },
    demo: { kind: 'arc' },
    compute: (v) => {
      const h = (v * v) / (2 * G)
      const t = 2 * Math.sqrt((2 * h) / G)
      return {
        headline: `${h.toFixed(2)} m peak height`,
        sub: `v = ${v.toFixed(1)} m/s · height grows with v²`,
        durationMs: t * 1000,
        arcHeight: Math.round(((v - 2) / 4) * 80 + 10),
      }
    },
    explain:
      'Height grows with speed squared: doubling height needs only √2 ≈ 1.41× the takeoff speed. Small gains in the push-off buy real height — that is why the block and the jump matter so much.',
  },
  {
    id: 'pp-torque',
    title: 'What makes rotation at all',
    assumptions:
      'Rotation must be created by an outside force before or at takeoff — an off-center push. In the air you can only redistribute what you already have.',
    question: 'Which of these can CREATE rotation out of nothing?',
    options: ['Tucking tight in the air', 'Pushing off-center at takeoff', 'Pulling the arms in mid-flip'],
    answer: 1,
    variable: { label: 'Push-off offset from your center', min: 0, max: 40, step: 2, unit: 'cm', start: 16 },
    demo: { kind: 'spinner' },
    compute: (v) => {
      const omega = 0.06 * v
      return {
        headline: v === 0 ? '0 flips / second' : `${omega.toFixed(2)} flips / second created`,
        sub:
          v === 0
            ? 'Dead-center push: no torque, no rotation — tucking now multiplies zero'
            : `Off-center push of ${v} cm creates the spin · tucking only speeds up what exists`,
        durationMs: v === 0 ? 0 : Math.min(1400, Math.max(300, 1000 / omega)),
      }
    },
    explain:
      'An off-center push (external torque) manufactures angular momentum. Tucking and arm pulls are internal — they speed up spin you already own. Zero rotation at takeoff means zero to multiply, no matter how tight the tuck.',
  },
]
