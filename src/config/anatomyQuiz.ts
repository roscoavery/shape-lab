import type { PhysicsQuizItem } from './physicsQuiz'

export const ANATOMY_QUIZ_BANK: PhysicsQuizItem[] = [
  {
    id: 'flex-ext',
    lessonId: 'movement-names',
    prompt: 'Flexion of a joint means:',
    choices: [
      { id: 'a', label: 'The angle of the joint decreases (it closes)' },
      { id: 'b', label: 'The angle of the joint increases (it opens)' },
      { id: 'c', label: 'The limb moves away from center' },
      { id: 'd', label: 'The joint is locked past straight' },
    ],
    answerId: 'a',
    explain:
      'Flexion closes the joint. Extension opens it. “Close the hips” on a hollow is hip flexion. “Open the hips” on a handstand is hip extension.',
  },
  {
    id: 'shoulder-overhead',
    lessonId: 'movement-names',
    prompt: 'Arms traveling toward the ears (high V, handstand line, Superman) is mostly:',
    choices: [
      { id: 'a', label: 'Shoulder extension' },
      { id: 'b', label: 'Shoulder flexion' },
      { id: 'c', label: 'Elbow flexion' },
      { id: 'd', label: 'Wrist flexion' },
    ],
    answerId: 'b',
    explain:
      'Shoulder flexion raises the arms toward the ears. Shoulder extension takes the arms down and behind the body. Overhead shapes are flexion, even when the chest is lifted.',
  },
  {
    id: 'lock-elbows',
    lessonId: 'movement-names',
    prompt: 'Why is “lock the elbows” a risky cue for some athletes?',
    choices: [
      { id: 'a', label: 'It makes the wrists flex' },
      { id: 'b', label: 'Athletes who hyperextend will take the joint past straight' },
      { id: 'c', label: 'It always creates a mental block' },
      { id: 'd', label: 'It prevents shoulder flexion' },
    ],
    answerId: 'b',
    explain:
      'Cue “finish the elbows” or “straighten.” A lock dump on a kid who already hyperextends sends the joint into a reverse curve.',
  },
  {
    id: 'ankle-short',
    lessonId: 'movement-names',
    prompt: 'A short landing often forces extra:',
    choices: [
      { id: 'a', label: 'Ankle plantarflexion' },
      { id: 'b', label: 'Ankle dorsiflexion' },
      { id: 'c', label: 'Shoulder extension' },
      { id: 'd', label: 'Hip abduction' },
    ],
    answerId: 'b',
    explain:
      'Dorsiflexion is toes toward the shin. When the feet arrive before the hips finish rotating, the ankle has to fold. That is a common ankle-injury story.',
  },
  {
    id: 'hypermobile',
    lessonId: 'struggle-hypermobile',
    prompt: 'Visible hypermobility (elbows or knees that fold past straight) means:',
    choices: [
      { id: 'a', label: 'Automatic talent, so stretch the end range for line' },
      { id: 'b', label: 'The athlete must create the stop with muscle in a mid range they can control' },
      { id: 'c', label: 'The joint is safer than a stiff joint under tumbling load' },
      { id: 'd', label: 'You should cue “lock” so they find the end' },
    ],
    answerId: 'b',
    explain:
      'Extra range is not automatically talent. Tumbling force still has to go somewhere. Load the mid range. Do not stretch that end range for a prettier picture.',
  },
  {
    id: 'strain-vs-sprain',
    lessonId: 'tissues-grades',
    prompt: 'Which pairing is correct?',
    choices: [
      { id: 'a', label: 'Strain is ligament. Sprain is muscle.' },
      { id: 'b', label: 'Strain is muscle. Sprain is ligament.' },
      { id: 'c', label: 'Strain is tendon. Sprain is bone.' },
      { id: 'd', label: 'Both words mean the same tissue' },
    ],
    answerId: 'b',
    explain:
      'Muscle strain. Ligament sprain. Tendon complaints are a third story (often tendinopathy, not a hot “itis”).',
  },
  {
    id: 'tendon-plan',
    lessonId: 'tissues-grades',
    prompt: 'An angry tendon that aches at the start of work, eases, then complains after is best treated first by:',
    choices: [
      { id: 'a', label: 'Stretching it hard as the whole plan' },
      { id: 'b', label: 'Resting from the insult, then loading the tendon slowly' },
      { id: 'c', label: 'Icing and returning to standing tucks' },
      { id: 'd', label: 'Cueing “walk it off”' },
    ],
    answerId: 'b',
    explain:
      'Tendinopathy likes that warm-up ache that returns after. Stretching an angry tendon as the whole plan is the wrong first move.',
  },
  {
    id: 'wrist-block',
    lessonId: 'injury-prevention',
    prompt: 'On every block, the wrists live in:',
    choices: [
      { id: 'a', label: 'Flexion' },
      { id: 'b', label: 'Extension' },
      { id: 'c', label: 'Neutral rest' },
      { id: 'd', label: 'Pronation only' },
    ],
    answerId: 'b',
    explain:
      'The handstand and tumbling block live in wrist extension, also called wrist dorsiflexion. Prepare the wrists and the shoulders so the force is not dumped into a short arm.',
  },
  {
    id: 'wrist-also-dorsi',
    lessonId: 'movement-names',
    prompt: 'Wrist extension on a block can also be named:',
    choices: [
      { id: 'a', label: 'Wrist dorsiflexion' },
      { id: 'b', label: 'Ankle plantarflexion' },
      { id: 'c', label: 'Hip abduction' },
      { id: 'd', label: 'Shoulder extension' },
    ],
    answerId: 'a',
    explain:
      'Same action, two names: wrist extension and wrist dorsiflexion. Pointing the toes is plantarflexion, a different joint.',
  },
  {
    id: 'point-toes',
    lessonId: 'movement-names',
    prompt: 'Pointing the toes is:',
    choices: [
      { id: 'a', label: 'Ankle dorsiflexion' },
      { id: 'b', label: 'Ankle plantarflexion' },
      { id: 'c', label: 'Wrist flexion' },
      { id: 'd', label: 'Knee extension past straight' },
    ],
    answerId: 'b',
    explain: 'Plantarflexion points the foot. Dorsiflexion pulls the toes toward the shin.',
  },
  {
    id: 'ice-rice',
    lessonId: 'injury-prevention',
    prompt: 'The current coaching takeaway on ice after a jam is:',
    choices: [
      { id: 'a', label: 'Ice heals tissue faster, so ice and return to the same skill' },
      { id: 'b', label: 'Calm the person, stop the thing that hurts, and treat short landings as a technique problem' },
      { id: 'c', label: 'RICE is still the complete plan for every sore ankle' },
      { id: 'd', label: 'Ice replaces a brace and a landing shape' },
    ],
    answerId: 'b',
    explain:
      'Mirkin later said he was wrong about ice for healing. First aid is still calm, stop, and get a real look when it is more than sore. Fix the short landing.',
  },
  {
    id: 'leave-floor',
    lessonId: 'tissues-grades',
    prompt: 'Which signs leave the gym floor for a professional look?',
    choices: [
      { id: 'a', label: 'Mild warmth after a new drill' },
      { id: 'b', label: 'Rapid swelling, deformity, numbness, or a joint that looks out of place' },
      { id: 'c', label: 'A grade 1 muscle that is a little sore but they can still move' },
      { id: 'd', label: 'Butterflies before a new skill' },
    ],
    answerId: 'b',
    explain:
      'Can they walk or do the motion at all? Rapid swelling, deformity, numbness, or a joint that looks wrong gets a professional look. We are not diagnosing on the floor.',
  },
]
