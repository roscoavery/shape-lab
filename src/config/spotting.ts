/**
 * Spotting education system for coaches — content in Ryan's own words.
 * Two views read this file: "Methods" (spotting-method cards) and
 * "By skill" (skill cards, each showing its spotting methods).
 *
 * Videos are NOT stored here. Ryan adds IG demo URLs to the reference
 * library and tags them (see spotting-tags.md); the panel matches
 * `spotting-method:<method-id>` and `spot-skill:<skill-id>` keywords.
 * A method can also carry its own gym-hosted demoVideo (an mp4 in
 * public/videos), which renders inline in place of the placeholder.
 */

export type SpottingMethod = {
  /** Stable id — also the `spotting-method:<id>` tag. */
  id: string
  name: string
  description: string
  /** Verbal cues Ryan uses with this method. */
  cues?: string[]
  /** Step-by-step process, where Ryan has given one. */
  steps?: string[]
  /** Skill ids this method applies to. */
  appliesTo: string[]
  /** Extra applicability notes in Ryan's words (skills without a card). */
  appliesToNote?: string
  /** Things to watch out for with this method. */
  watchOuts?: string[]
  /** Credit line, where someone else originated the method. */
  credit?: string
  /** Local demo video (gym-hosted mp4) — replaces videoPlaceholder when set. */
  demoVideo?: { url: string; caption: string }
  /** Extra local demo videos (gym-hosted mp4s), e.g. multiple examples of one method. */
  demoVideos?: { url: string; caption: string }[]
  /** Shown when no tagged video exists yet. */
  videoPlaceholder?: string
}

export type SpottingSkill = {
  /** Stable id — also the `spot-skill:<id>` tag. */
  id: string
  name: string
  /** Extra context, e.g. which entries the skill covers. */
  sub?: string
  /** Method ids, in the order Ryan wants them shown. */
  methodIds: string[]
  /** Honest note where Ryan hasn't named the method yet — never invented. */
  methodNote?: string
  /** What the athlete should already be able to do before being spotted. */
  prerequisites?: string
}

export const SPOTTING_METHODS: SpottingMethod[] = [
  {
    id: 'safety-spot',
    name: 'Safety spot',
    description:
      "The safety spot is one of the most important ones for coaches to learn and understand because it focuses on staying under the athlete's torso rather than putting emphasis on supporting the rotation by driving the athlete's lower body upward. Super important on back tucks and layouts especially. The same side full spotting method generally ends with a safety spot.",
    appliesTo: ['back-tuck', 'back-layout'],
    demoVideos: [
      {
        url: '/videos/layout-safety-spot.mp4',
        caption:
          "Spotted layout — the spot is a safety spot. I put my left hand on the lower back tailbone area and my right hand on the athlete's right lat. My right fingers are pointing towards where the athlete came from and my right palm facing outward. As the athlete gets their toes up to about 10 or 11 o'clock, my right hand can sort of grip the ribs and I can add flip to what they have so they can hold their shape. If the athlete is smaller, you can do this with hands like how I did in the video. If the athlete is bigger you may put more of your left forearm across the low back almost with the elbow behind the athlete so you can get under their weight a bit more. Allows hands on for the entire flip.",
      },
      {
        url: '/videos/layout-safety-spot-full-grown.mp4',
        caption:
          'Safety spot on a layout — full-grown athlete example. Another spotted layout using the safety spot.',
      },
      {
        url: '/videos/layout-teach-next-step.mp4',
        caption:
          'Same athlete, same session — next step. She sets up and we pause in the hollow straight shape to make corrections before passing through. This allows the spotting to become the teaching method and the drilling method. For small athletes like this, using the hands: right hand on the upper back almost at the neck area, left hand can bump the thighs to assist the rotation or go straight to the lower back area to act as a base of support when pausing. With full-grown athletes, you will use arms instead of hands with the same placements for bases of support. Pause, check shape, then flip — as the athlete gets consistent with hitting the shape without technical mistakes by the moment you pause, you can begin to pass through rather than pause. On this one we pause for less time and then pass through. It becomes way harder to do this with full-grown athletes but it can be done. This method seamlessly allows for an easy safety spot when you start passing through.',
      },
    ],
    videoPlaceholder: 'Demo video coming. Tag a reference library item spotting-method:safety-spot and it will show up here.',
  },
  {
    id: 'opposite-side-spot',
    name: 'Opposite side spot',
    description:
      'The opposite side spot can be used for back halves, back fulls, arabians, back 1.5s, and double fulls (rarely).',
    appliesTo: ['back-half', 'back-full', 'back-1-5', 'double-full'],
    appliesToNote: 'Also usable for arabians.',
    watchOuts: [
      'Only do this one with a super soft landing surface — I am not assisting the landing.',
      'The athlete needs to be kind of close already.',
    ],
    demoVideo: {
      url: '/videos/opposite-side-spot-standing-full.mp4',
      caption:
        'Opposite side spot for a standing full. I use my right hand to grab around the front side of the right hip and my left hand to grip the inner thigh to roll the athlete over into a twist. Different than the opposite side spot where you twist their hips from a crossover safety spot grip. This should really only be done with a super soft landing surface since I am not assisting the landing and the athlete needs to be kind of close already. Can be used to ease out of the same side spotting or if they already have the air awareness for a full and just need a boost when they try it.',
    },
    demoVideos: [
      {
        url: '/videos/opposite-side-full-spot-ro-hs.mp4',
        caption:
          "Opposite side full spot from a round off handspring on spring floor (example 1 — more coming). Athlete requires minimal spotting already and we have already ensured consistency onto a mat. Keeps spotter out of the athlete's vision and prevents them from twisting straight into the spotter.",
      },
    ],
  },
  {
    id: 'twist-side-spot',
    name: 'Twist side spot',
    description:
      "The twist side spot can be used for fulls, arabians, and doubles. It doesn't work very well with back halves. Generally ends with a safety spot.",
    appliesTo: ['back-full', 'double-full'],
    appliesToNote: 'Also usable for arabians. Not recommended for back halves.',
    videoPlaceholder: 'Demo video coming. Tag a reference library item spotting-method:twist-side-spot and it will show up here.',
  },
  {
    id: 'bhs-deconstruction',
    name: 'Back handspring deconstruction method',
    description:
      'A deconstruction method for the back handspring. Credit to Coach Lain — he ties in verbal cues and a step by step process with motions.',
    appliesTo: ['back-handspring'],
    credit: 'Coach Lain',
    videoPlaceholder: 'Demo video coming. Tag a reference library item spotting-method:bhs-deconstruction and it will show up here.',
  },
  {
    id: 'bhs-traditional',
    name: 'Traditional back handspring spot',
    description: 'The traditional back handspring spotting method. Full details coming from Ryan.',
    appliesTo: ['back-handspring'],
    videoPlaceholder: 'Demo video coming. Tag a reference library item spotting-method:bhs-traditional and it will show up here.',
  },
  {
    id: 'late-spot-grips',
    name: 'Late spot grips',
    description: 'A couple different grips for the late spot. Grip details coming from Ryan.',
    appliesTo: ['back-handspring'],
    videoPlaceholder: 'Demo video coming. Tag a reference library item spotting-method:late-spot-grips and it will show up here.',
  },
  {
    id: 'shadow-spot',
    name: 'Shadow spot',
    description:
      'There is a shadow spot for every skill, and there may be multiple different ways to shadow spot for each skill to ensure safety and ease out of spotting gradually.',
    appliesTo: [
      'cartwheel',
      'round-off',
      'round-off-to-knees',
      'back-bend',
      'back-walkover',
      'front-limber',
      'front-walkover',
      'aerial',
      'front-aerial',
      'back-handspring',
      'round-off-series',
      'back-tuck',
      'back-layout',
      'back-half',
      'back-full',
      'back-1-5',
      'double-full',
      'front-handspring',
      'front-tuck',
      'double-back',
      'full-in',
    ],
    demoVideo: {
      url: '/videos/shadow-spot-ro-bhs-tuck.mp4',
      caption:
        'Shadow spot for a tuck out of a round off back handspring. My hands use the safety spot grip and can stay inches away from where she needs to be spotted while passing through the upside down phase of the flip. Really adds peace of mind for both the coach and athlete in case she bails or needs help while easing out of spotting. Drastically reduces the likelihood of accidents while going from spotting to independence.',
    },
    videoPlaceholder: 'Demo video coming. Tag a reference library item spotting-method:shadow-spot and it will show up here.',
  },
  {
    id: 'hands-on-shapes',
    name: 'Hands-on shape support',
    description:
      "Hands on support is often used with basic shapes to help the athlete hit the right position. Lunges, spotting levers and handstands, and assisting athletes on their bridge is sometimes required.",
    appliesTo: ['back-bend', 'back-walkover', 'front-limber', 'front-walkover'],
    appliesToNote: 'Also used for lunges, levers, handstands, and bridges.',
    demoVideo: {
      url: '/videos/spotted-back-extension-roll-averie.mp4',
      caption: 'Averie — spotted back extension roll.',
    },
    videoPlaceholder: 'Demo video coming. Tag a reference library item spotting-method:hands-on-shapes and it will show up here.',
  },
]

export const SPOTTING_SKILLS: SpottingSkill[] = [
  { id: 'cartwheel', name: 'Cartwheel', methodIds: ['shadow-spot'], methodNote: 'Spotting method coming.' },
  { id: 'round-off', name: 'Round off', methodIds: ['shadow-spot'], methodNote: 'Spotting method coming.' },
  { id: 'round-off-to-knees', name: 'Round off to knees', methodIds: ['shadow-spot'], methodNote: 'Spotting method coming.' },
  {
    id: 'back-bend',
    name: 'Back bend',
    methodIds: ['hands-on-shapes', 'shadow-spot'],
  },
  {
    id: 'back-walkover',
    name: 'Back walkover',
    methodIds: ['hands-on-shapes', 'shadow-spot'],
  },
  {
    id: 'front-limber',
    name: 'Front limber',
    methodIds: ['hands-on-shapes', 'shadow-spot'],
  },
  {
    id: 'front-walkover',
    name: 'Front walkover',
    methodIds: ['hands-on-shapes', 'shadow-spot'],
  },
  { id: 'aerial', name: 'Aerial', methodIds: ['shadow-spot'], methodNote: 'Spotting method coming.' },
  { id: 'front-aerial', name: 'Front aerial', methodIds: ['shadow-spot'], methodNote: 'Spotting method coming.' },
  {
    id: 'back-handspring',
    name: 'Back handspring',
    sub: 'Standing and from round off',
    methodIds: ['bhs-deconstruction', 'bhs-traditional', 'late-spot-grips', 'shadow-spot'],
  },
  { id: 'round-off-series', name: 'Round off series', methodIds: ['shadow-spot'], methodNote: 'Spotting method coming.' },
  {
    id: 'back-tuck',
    name: 'Back tuck',
    sub: 'Standing, round off, back handspring',
    methodIds: ['safety-spot', 'shadow-spot'],
  },
  {
    id: 'back-layout',
    name: 'Back layouts',
    methodIds: ['safety-spot', 'shadow-spot'],
  },
  {
    id: 'back-half',
    name: 'Back halves',
    methodIds: ['opposite-side-spot', 'shadow-spot'],
  },
  {
    id: 'back-full',
    name: 'Back fulls',
    methodIds: ['twist-side-spot', 'opposite-side-spot', 'shadow-spot'],
  },
  {
    id: 'back-1-5',
    name: 'Back 1.5s',
    sub: 'Lighter spotting',
    methodIds: ['opposite-side-spot', 'shadow-spot'],
  },
  {
    id: 'double-full',
    name: 'Double fulls',
    sub: 'Opposite side rarely used',
    methodIds: ['twist-side-spot', 'opposite-side-spot', 'shadow-spot'],
  },
  { id: 'front-handspring', name: 'Front handsprings', methodIds: ['shadow-spot'], methodNote: 'Spotting method coming.' },
  { id: 'front-tuck', name: 'Front tucks', methodIds: ['shadow-spot'], methodNote: 'Spotting method coming.' },
  { id: 'double-back', name: 'Double backs', methodIds: ['shadow-spot'], methodNote: 'Spotting method coming.' },
  { id: 'full-in', name: 'Full ins', methodIds: ['shadow-spot'], methodNote: 'Spotting method coming.' },
]

/** General spotting rules — Ryan's words, always visible in the Spotting section. */
export const SPOTTING_RULES: string[] = [
  "Prioritize protecting the athlete's head and neck over everything else when deciding what method to use.",
  'We want to stay ahead of the athlete in the direction they are traveling so we can support them best.',
  'Spotting sometimes can be used to teach a skill with heavy spotting, but may also be a means of safety and support for executing something the athlete has trained with drills and other progressions that do not involve spotting.',
  'Some skills ideally are not trained in ways that ever require heavy spotting.',
]

/** Touch and comfort — Ryan's words. */
export const SPOTTING_TOUCH_ETHICS: string[] = [
  "As spotters, we should always avoid touching athletes in private areas when possible. Safety over everything, but always look for intentional ways to avoid spots that could be uncomfortable for the athlete because of where the coach puts their hands. That is basic human decency and a form of respect for the athlete's comfort.",
  "Some spotting methods may require contact with the buttocks area and sometimes the inner thigh. As coaches, we just have to do what we have to do to help the athlete with the skill they are doing, but not touch athletes' butts when we can avoid it.",
  'There are some methods where it can really help to teach the right technique, but we just have to be mindful. Spotting the butt and ribs can help a ton with the shape change section of the second half of a back handspring and can be extremely useful for athlete progress.',
  "Sometimes when spotting back handsprings, a coach's hand may accidentally get under an athlete's waistband. It is good to openly apologize to the athlete and communicate that you didn't mean to do that, so it doesn't create any weirdness or uncertainty.",
  "Sometimes an athlete stops when they're supposed to connect a round off handspring and you accidentally touch their butt out of the round off. That's usually an obvious accident and can usually be ignored unless the coach feels obligated to apologize or communicate the accident.",
  "Athletes may not like being spotted on skills, and the coach may have to find ways of working a skill with minimal to no spotting, only using spotting where it is absolutely required.",
]

export function getSpottingMethod(id: string): SpottingMethod | undefined {
  return SPOTTING_METHODS.find((m) => m.id === id)
}

export function getSpottingSkill(id: string): SpottingSkill | undefined {
  return SPOTTING_SKILLS.find((s) => s.id === id)
}
