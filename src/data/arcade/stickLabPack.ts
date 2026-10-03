/**
 * Stick Lab drill pack: low-impact landing drills only.
 * No flips, no height. Everything here is DRAFT content.
 */

export type StickLabDrill = {
  id: string
  name: string
  /** 1–2 lines on the safe setup: mat, space, coach watching. */
  setup: string
}

export const STICK_LAB_DRILLS: StickLabDrill[] = [
  {
    id: 'step-down-stick',
    name: 'Step-down stick',
    setup:
      'Step off the edge of a panel mat onto a landing mat. Land on two feet and freeze. Clear space around the mat, coach or partner watching.',
  },
  {
    id: 'hop-and-hold',
    name: 'Hop-and-hold',
    setup:
      'Small hop straight up in place on a mat. Land two feet together and freeze like the floor is sticky. No travel, no turning.',
  },
  {
    id: 'lunge-landing',
    name: 'Lunge landing',
    setup:
      'Step forward into a landing lunge: front knee over the ankle, back knee soft, and freeze. Switch legs each attempt. Flat floor or mat.',
  },
]
