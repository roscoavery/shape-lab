import type { TourStep } from '../components/homework/GlowTour'

/**
 * Short guided tours offered across surfaces — "show me how to use this."
 * Each is 3 tight steps: what it is, the key action, where to go next.
 * Copy is draft; Ryan approves every line before it ships to athletes.
 */

export const TODAY_COACH_TOUR: TourStep[] = [
  {
    target: 'tour-today-banners',
    title: 'Coach reminders',
    text: 'Nudges live here — log wins in the evening after classes, plan lessons that have no plan. Dismiss one and it stays gone for the day. Tap the glowing card to continue.',
  },
  {
    target: 'tour-today-start',
    title: 'Start the session',
    text: 'Lesson is who you are with — one athlete or several. Class is the roster. Pick one and the homework goes to the right athletes. Tap the glowing card to continue.',
  },
  {
    target: 'tour-today-clock-floor',
    title: 'Floor hold clock',
    text: 'Search a name, pick the hold, start the clock — right there on the floor, no camera grade. Tap the glowing card to continue.',
  },
  {
    target: 'tour-today-clock',
    title: 'Class clock',
    text: 'Time it, log it. Holds and stopwatch for the whole class, kept simple. Tap the glowing card to continue.',
  },
  {
    target: 'tour-today-chalk',
    title: 'Chalkboard',
    text: 'Pin the clips and drills tonight runs on. One board per class type, kept current. Tap the glowing card to continue.',
  },
  {
    target: 'tour-today-collage',
    title: 'Class collages',
    text: 'Your drill boards — play them on the floor, save them, keep editing later. Tap the glowing card to continue.',
  },
  {
    target: 'tour-today-shortcuts',
    title: 'Shortcuts',
    text: 'Everything else one tap away — station, flows, names quiz, skill paths. Tap the glowing card to continue.',
  },
  {
    target: 'today-recaps',
    title: 'Recaps',
    text: 'Class and lesson recaps land here at the bottom. This is where the evening reminder sends you to log the wins. You are set — tap Done.',
  },
]

export const SCROLL_TOUR: TourStep[] = [
  {
    target: 'tour-scroll-search',
    title: 'Search the libraries',
    text: 'Type a skill — it pulls clips from the main reference library and your own reference library together. Tap the glowing card to continue.',
  },
  {
    target: 'tour-scroll-fullscreen',
    title: 'Open the player',
    text: 'Tap the fullscreen button on any clip to open the full player. Tap the glowing button now — it opens the player and the tour keeps going.',
    tapThrough: true,
  },
  {
    target: 'tour-player-video',
    title: 'Tap to show controls',
    text: 'Tap the video once to show the controls, tap again to hide them and watch clean. Tap the glowing card to continue.',
  },
  {
    target: 'tour-player-scrub',
    title: 'Scrub the details',
    text: 'Drag the scrub bar to move frame by frame. Tap and hold the video, then drag, to scrub from where you are holding — good for freezing on the exact shape. Tap the glowing card to continue.',
  },
  {
    target: 'tour-player-markup',
    title: 'Line, draw, arrow',
    text: 'Draw on the frozen frame — lines, freehand, arrows — to show an athlete exactly what you mean. Tap the glowing card to continue.',
  },
  {
    target: 'tour-player-shot',
    title: 'Screenshot stills',
    text: 'Grab a still of any shape while you scroll — it goes to your shape stills for the library. Tap the glowing card to continue.',
  },
  {
    target: 'tour-player-share',
    title: 'Share',
    text: 'Send the clip, save it to a collection, or add it to a collage from here. Tap the glowing card to continue.',
  },
  {
    target: 'tour-player-ab',
    title: 'A/B loop',
    text: 'Set A where the piece starts and B where it ends — it loops just that part until you clear it. Tap the glowing card to continue.',
  },
  {
    target: 'tour-player-speed',
    title: 'Slow motion',
    text: 'Drop the speed to slow-mo to study the mechanics, back to full speed to feel the rhythm. You are set — tap Done.',
  },
]

export const LEARN_TOUR: TourStep[] = [
  {
    target: 'tour-learn-home',
    title: 'Learn',
    text: 'Every skill, broken into shapes, drills, and prerequisites. Tap the glowing card to continue.',
  },
  {
    target: 'tour-learn-path-entry',
    title: 'Skill path guide',
    text: 'The skill path, top down — what each skill needs underneath it, what can bend, and what to ask your coach. Tap the glowing card to continue.',
  },
  {
    target: 'tour-learn-shapes-entry',
    title: 'Shape library',
    text: 'Every position with coach stills. Hollow, lunge, and the shapes that look alike until you know where the hips sit. You are set — tap Done.',
  },
]

export const PROFILE_TOUR: TourStep[] = [
  {
    target: 'tour-profile-header',
    title: 'My profile',
    text: 'This is you — role, gym, and what you can see. Tap the glowing card to continue.',
  },
  {
    target: 'tour-profile-edit',
    title: 'Edit name, photo and answers',
    text: 'Fix a misspelled name or update a photo here. Admins can fix any profile. Tap the glowing card to continue.',
  },
  {
    target: 'tour-profile-coach',
    title: 'Coach link',
    text: 'Connect with your coaches so they can see your training. You are set — tap Done.',
  },
]

export const CLASSES_TOUR: TourStep[] = [
  {
    target: 'tour-classes-collages',
    title: 'Collages',
    text: 'Build drill boards from clips — play them on the floor during class. Tap the glowing card to continue.',
  },
  {
    target: 'tour-classes-chalkboards',
    title: 'Chalkboards',
    text: 'Pin clips and drills to a board you can open in any class. Tap the glowing card to continue.',
  },
  {
    target: 'tour-classes-library',
    title: 'Library',
    text: 'Your full drill and clip library lives here. You are set — tap Done.',
  },
]

export const SYSTEM_TOUR: TourStep[] = [
  {
    target: 'tour-system-builder',
    title: 'My system',
    text: 'Build your progression system here — skills, drills, and references in your order. Tap the glowing card to continue.',
  },
  {
    target: 'tour-system-skills',
    title: 'Skills',
    text: 'Add the skills you teach, with the shapes and prerequisites that unlock them. Tap the glowing card to continue.',
  },
  {
    target: 'tour-system-share',
    title: 'Adopt and share',
    text: 'Copy any card as a starting point — later edits never ripple. Athletes who follow you can browse your library. You are set — tap Done.',
  },
]

export const FLOWS_TOUR: TourStep[] = [
  {
    target: 'tour-flows-who',
    title: "Who's doing this flow",
    text: 'Pick the athlete — or run as guest so nothing logs to your profile. Tap the glowing card to continue.',
  },
  {
    target: 'tour-flows-run',
    title: 'Pick a flow',
    text: 'Choose the class flow, then start the sequence and work the beats. Holds log to the picked athlete. Tap the glowing card to continue.',
  },
  {
    target: 'tour-flows',
    title: 'Done',
    text: 'Finish the flow to log the run. You are set — tap Done.',
  },
]
