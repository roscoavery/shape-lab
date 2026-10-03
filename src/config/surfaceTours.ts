import type { TourStep } from '../components/homework/GlowTour'

/**
 * Short guided tours offered across surfaces — "show me how to use this."
 * Each is 3 tight steps: what it is, the key action, where to go next.
 * Copy is draft; Ryan approves every line before it ships to athletes.
 */

export const TODAY_COACH_TOUR: TourStep[] = [
  {
    target: 'tour-today-shortcuts',
    title: 'Today shortcuts',
    text: 'Everything you do on the floor lives here — start a lesson, open the class clock, run a flow. Tap the glowing card to continue.',
  },
  {
    target: 'today-recaps',
    title: 'Recaps',
    text: 'Class and lesson recaps land here. This is where the evening reminder sends you to log wins. Tap the glowing card to continue.',
  },
  {
    target: 'tour-today-banners',
    title: 'Reminders',
    text: 'Coach nudges appear here — log wins in the evening, plan lessons with no plan. You are set — tap Done.',
  },
]

export const SCROLL_TOUR: TourStep[] = [
  {
    target: 'tour-scroll-feed',
    title: 'Reference scroll',
    text: 'Swipe through proof and reference clips — finished skills, drills, and shapes. Tap the glowing card to continue.',
  },
  {
    target: 'tour-learn-home',
    title: 'Save and compare',
    text: 'Bookmark the clips you coach from, and open any clip in compare against your athlete. You are set — tap Done.',
  },
]

export const LEARN_TOUR: TourStep[] = [
  {
    target: 'tour-learn-home',
    title: 'Learn',
    text: 'Every skill, broken into shapes, drills, and prerequisites. Tap the glowing card to continue.',
  },
  {
    target: 'tour-learn-path',
    title: 'Skill path guide',
    text: 'Follow the progression chain — what to train before what, and why. Tap the glowing card to continue.',
  },
  {
    target: 'tour-learn-shapes',
    title: 'Shapes',
    text: 'The body positions every skill is built from. Quiz yourself here. You are set — tap Done.',
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
