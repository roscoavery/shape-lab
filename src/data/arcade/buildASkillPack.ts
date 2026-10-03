/**
 * Build-a-Skill puzzles: ordering phases of real shapes/drills.
 * Draft content: teaches structure only.
 */
export type BuildASkillStep = {
  id: string
  label: string
  detail: string
}

export type BuildASkillPuzzle = {
  id: string
  title: string
  intro: string
  steps: BuildASkillStep[]
  /** Step ids in the correct order. */
  correctOrder: string[]
  explanation: string
}

export const BUILD_A_SKILL_PUZZLES: BuildASkillPuzzle[] = [
  {
    id: 'cartwheel-phases',
    title: 'Cartwheel phases',
    intro: 'Put the cartwheel back together in the order the body travels.',
    steps: [
      { id: 'cw1', label: 'Starting lunge with open shoulders', detail: 'Side view: back heel up, shoulders open, longer stance.' },
      { id: 'cw2', label: 'Lunge · T arms', detail: 'Hands reach down one at a time, T through the shoulders.' },
      { id: 'cw3', label: 'Handstand', detail: 'Straight line through the middle, arms covering the ears.' },
      { id: 'cw4', label: 'Landing lunge', detail: 'Back heel flat, open shoulders. Shorter than the start.' },
      { id: 'cw5', label: 'Stand clean', detail: 'Feet together, arms pinned. Stick the finish.' },
    ],
    correctOrder: ['cw1', 'cw2', 'cw3', 'cw4', 'cw5'],
    explanation:
      'A cartwheel is a lunge, turned sideways through a handstand, landed in a lunge. The entry and the landing are the same shape family. The middle is the handstand.',
  },
  {
    id: 'roundoff-phases',
    title: 'Round-off phases',
    intro: 'The round off is a cartwheel with a snap-down. Order it.',
    steps: [
      { id: 'ro1', label: 'Feet together, open shoulders', detail: 'Set tall before the hurdle. Cover the ears.' },
      { id: 'ro2', label: 'Lunge · arms front middle', detail: 'Hurdle step: side view, back heel flat, arms reaching forward.' },
      { id: 'ro3', label: 'Handstand', detail: 'Block through a straight line. This is where the power turns.' },
      { id: 'ro4', label: 'Landing lunge', detail: 'Snap down feet-first, open shoulders, ready to rebound.' },
      { id: 'ro5', label: 'Stand clean', detail: 'Feet together. The rebound starts here, not from a slouch.' },
    ],
    correctOrder: ['ro1', 'ro2', 'ro3', 'ro4', 'ro5'],
    explanation:
      'Hurdlers who skip the set rush the block. The round off only works when the handstand is a block, not a balance. Set, hurdle, block, snap, finish.',
  },
  {
    id: 'bhs-phases',
    title: 'Back handspring phases',
    intro: 'Order the shapes a back handspring passes through.',
    steps: [
      { id: 'bhs1', label: 'Stand clean', detail: 'Start still. Feet together, arms pinned.' },
      { id: 'bhs2', label: 'Feet together, open shoulders', detail: 'Arms up by the ears. This is the set.' },
      { id: 'bhs3', label: 'Tight arch', detail: 'Jump back over a tight arch. Arms pressing behind the ears.' },
      { id: 'bhs4', label: 'Handstand', detail: 'Block through the straight line, open shoulders.' },
      { id: 'bhs5', label: 'Landing lunge', detail: 'Snap the feet down under the hips, heel flat.' },
      { id: 'bhs6', label: 'Stand clean', detail: 'Finish the way you started. Feet together.' },
    ],
    correctOrder: ['bhs1', 'bhs2', 'bhs3', 'bhs4', 'bhs5', 'bhs6'],
    explanation:
      'The back handspring is a jump back through an arch into a handstand block, then a snap-down. Athletes who "throw their head back" are skipping the arch. The shape has to come before the hands land.',
  },
  {
    id: 'lunge-lever-return',
    title: 'Lunge, lever, return',
    intro: 'The most-used three seconds in tumbling. Order the flow.',
    steps: [
      { id: 'llr1', label: 'Feet together, open shoulders', detail: 'Tall start. Hips open, ribs in.' },
      { id: 'llr2', label: 'Starting lunge with open shoulders', detail: 'Longer stance, back heel up, back straight.' },
      { id: 'llr3', label: 'Lever', detail: 'Chest toward parallel, back leg lifts, slight front-knee bend.' },
      { id: 'llr4', label: 'Handstand', detail: 'Kick through the lever into the straight line.' },
      { id: 'llr5', label: 'Landing lunge', detail: 'Come down the way you went up. Heel flat.' },
      { id: 'llr6', label: 'Stand clean', detail: 'Feet together, done.' },
    ],
    correctOrder: ['llr1', 'llr2', 'llr3', 'llr4', 'llr5', 'llr6'],
    explanation:
      'The lever is the bridge between the lunge and the handstand. Skipping it, stepping straight into a handstand from a deep lunge, is where bent back knees and closed shoulders come from.',
  },
  {
    id: 'hollow-setup',
    title: 'Building a hollow',
    intro: 'The hollow has a build order. It is not "just lie there and lift."',
    steps: [
      { id: 'hs1', label: 'Pike (zombie arms)', detail: 'Sit tall in a pike. Arms by the ears, eyes through the hands.' },
      { id: 'hs2', label: 'Hollow (arms down)', detail: 'Inch back until the low back touches. Flatten it first, then lift the feet.' },
      { id: 'hs3', label: 'Hollow (arms up)', detail: 'Only after a proper minute with arms down. Same low back, arms by the ears.' },
    ],
    correctOrder: ['hs1', 'hs2', 'hs3'],
    explanation:
      'Arms-up hollow is earned, not assumed: a proper minute with arms down first. The low back touching the floor is the gate. Everything else is decoration.',
  },
  {
    id: 'controlled-landing',
    title: 'Controlled landing drill',
    intro: 'Stick it in a lunge before you ever stand out of it.',
    steps: [
      { id: 'cl1', label: 'Stand clean', detail: 'Feet together, set before the jump.' },
      { id: 'cl2', label: 'Tuck', detail: 'Jump, bend the knees, pull the feet in. Arms still reaching.' },
      { id: 'cl3', label: 'Landing lunge', detail: 'Open out and stick the lunge: back heel flat, shoulders open.' },
      { id: 'cl4', label: 'Stand clean', detail: 'Only after the lunge is still. Then feet together.' },
    ],
    correctOrder: ['cl1', 'cl2', 'cl3', 'cl4'],
    explanation:
      'Landings are learned in the lunge, not standing up. If the lunge wobbles, the skill is not finished. Standing out of it early teaches sloppy landings.',
  },
  {
    id: 'front-support-mad-cat',
    title: 'Front support to mad cat',
    intro: 'A warmup flow: brace, round, brace. The mad cat is the quadruped cousin of the C shape.',
    steps: [
      { id: 'fsm1', label: 'Front plank', detail: 'The front-support position: straight line head to heels, glutes squeezed.' },
      { id: 'fsm2', label: 'C shape', detail: 'Round it like a mad cat. Hips under, chest hollow, back rounded.' },
      { id: 'fsm3', label: 'Front plank', detail: 'Press back out to the straight line. Feel the switch.' },
    ],
    correctOrder: ['fsm1', 'fsm2', 'fsm3'],
    explanation:
      'Hollow and arch are a switch, not two separate ideas. Flowing between the plank and the rounded C teaches the body to find both on purpose. The same switch every handstand and snap-down needs.',
  },
  {
    id: 'handstand-entry-drill',
    title: 'Handstand entry drill',
    intro: 'A wall handstand starts from the floor, not from a kick and a prayer.',
    steps: [
      { id: 'hed1', label: 'Starting lunge with open shoulders', detail: 'Side view: long stance, back heel up, shoulders open.' },
      { id: 'hed2', label: 'Lever', detail: 'Tip forward through the lever. This aims the kick.' },
      { id: 'hed3', label: 'Wall handstand', detail: 'Stomach to the wall, ribs in, cover the ears, push tall.' },
      { id: 'hed4', label: 'Landing lunge', detail: 'Step down the way you came up. Heel flat, shoulders open.' },
      { id: 'hed5', label: 'Stand clean', detail: 'Feet together to finish the rep.' },
    ],
    correctOrder: ['hed1', 'hed2', 'hed3', 'hed4', 'hed5'],
    explanation:
      'The lever aims the kick; without it the kick is a guess. Lunge, lever, wall, land. The entry is a drill with steps, and rushed entries make banana handstands.',
  },
]
