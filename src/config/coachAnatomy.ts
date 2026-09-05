/**
 * Coach-facing anatomy and injury-prevention notes.
 * Gym language. Not a diagnosis, not a medical course.
 */

import type { PhysicsLesson } from './tumblingPhysics'

export type CoachLesson = PhysicsLesson

export const ANATOMY_LESSONS: CoachLesson[] = [
  {
    id: 'movement-names',
    section: 'Joints and cues',
    title: 'Movement names and cues',
    kicker: 'Say the joint action so the cue matches the body, not a vibe.',
    body: [
      'Flexion closes a joint. Extension opens it. Coaches already cue this without the words: “close the hips” on a hollow is hip flexion; “open the hips” on a handstand is hip extension. Shoulder flexion is arms traveling toward overhead (the high V / handstand line). Shoulder extension is arms traveling behind the body (Superman, the arch). If you cue “arms by the ears” you are asking for shoulder flexion plus the scapulae to let that happen.',
      'Elbows and knees: flexion is bend, extension is straight. “Lock the elbows” is elbow extension. “Soft knees” is a little flexion. Wrist: flexion is palm toward the forearm, extension is the opposite (the handstand block lives here). Ulnar and radial deviation are the small side-to-side wrist motions. Ankle: plantarflexion is pointed toes / the push of a punch. Dorsiflexion is toes toward the shin — the landing and the hurdle. Forced extra dorsiflexion on a short landing is where a lot of ankles get hurt.',
      'Hips also abduct (leg away), adduct (leg in), and rotate (turn out / turn in). “Heels together, toes out” is external rotation. A straddle is abduction plus some flexion. Spine: flexion (round), extension (arch), sidebend, and rotation. “Ribs in” is often asking them not to dump into lumbar extension. “Chin to chest” on a long bridge is cervical flexion on top of thoracic extension — two different spinal actions at once.',
      'Pair the cue with the action. “Reach long” on a layout is hip and shoulder extension with a long spine. “Get tight” is flexion at hips and knees plus arms in. “Block” is shoulder flexion and wrist extension into the floor. When a cue fails, ask which joint you actually meant.',
    ],
    gym: 'Pick one joint when they are lost. “Open the hips” is clearer than “look longer” if the pike is the miss.',
  },
  {
    id: 'struggle-hypermobile',
    section: 'Joints and cues',
    title: 'What they struggle with — and hypermobility you can see',
    kicker: 'Some misses are strength. Some are too much motion in the wrong place.',
    body: [
      'Common struggles: not enough shoulder flexion to get arms by the ears without the ribs flaring; not enough hip extension to stay long in a handstand or Superman; not enough ankle plantarflexion for a punch; not enough controlled spinal flexion for a hollow (they hinge at the low back instead). Those are usually strength, timing, or a shape they have not owned yet.',
      'Hypermobility is extra motion you can see. Elbows that hyperextend into a reverse curve. Knees that snap backward in a stand or a handstand. Wrists that fold into a deep extension on every block. Low backs that dump into a huge arch as soon as the arms go up. Ribs that flare and stay flared. That extra range is not automatically talent. It is a joint that is not being stopped by the usual end-feel, so the athlete has to create the stop with muscle.',
      'Why it predicts vulnerability: the force of tumbling still has to go somewhere. If the elbow or knee does not have a bony or ligamentous “enough,” the load goes into the joint surfaces and the tissues that were already loose. You will see the same kids with pretty lines and cranky wrists, or a gorgeous bridge and a sore low back. Do not stretch those end-ranges for fun. Load them in the mid-range they can control.',
      'Movements that often start the injury story: deep forced wrist extension on a short arm block; forced ankle dorsiflexion on a short landing; lumbar extension plus rotation under speed (whips, layouts that pike-twist); a split leap or switch with a groin that was not ready; a hollow or V-up they yank from the hip flexors instead of the trunk.',
    ],
    gym: 'If elbows or knees hyperextend, cue “soft lock” and strong mid-range, not more stretch. Film the wrist on blocks and the ankle on short landings.',
  },
  {
    id: 'tissues-grades',
    section: 'Tissues and prevention',
    title: 'Muscle, tendon, ligament — names and grades',
    kicker: 'The tissue tells you the name. The grade tells you how loud it is.',
    body: [
      'Muscle contracts and creates the motion. A muscle strain is the muscle (or the muscle-tendon junction) getting overstretched or overloaded. Grade 1: sore, they can still move, maybe a little weak. Grade 2: a real tear of some fibers, swelling, a limp or a hole in the strength, they protect it. Grade 3: a complete tear — they cannot use that action, sometimes a gap you can feel. Hamstrings, groins, hip flexors, and abs show up as strains in this gym.',
      'Tendon connects muscle to bone and stores/returns spring. Tendinopathy is the overuse name (the old “tendinitis” word is often wrong — a lot of it is not a hot infection of the tendon). It likes to ache at the start of work, ease, then complain after. Wrist extensors, Achilles, and patellar tendon are common. Rest from the insult, then load the tendon slowly. Do not stretch an angry tendon as the whole plan.',
      'Ligament connects bone to bone and stops the joint from going somewhere it should not. A sprain is a ligament injury. Grade 1: stretched, sore, still mostly stable. Grade 2: partial tear, swelling, some give when you test it. Grade 3: complete tear, the joint feels loose or “gone.” Ankle inversion sprains are the ones you will see most. This is not a strain. Do not cue “walk it off” on a grade 2–3 ankle.',
      'Severity you can judge without pretending to be a doctor: can they walk / bear weight / do the motion at all? Is there rapid swelling, deformity, numbness, or a joint that looks out of place? Those last ones leave the gym floor and get a professional look. Everything else is still “we are not diagnosing — we are deciding whether today is a training day.”',
    ],
    gym: 'Strain = muscle. Sprain = ligament. Tendon complaints like a warm-up ache that returns after. When in doubt, stop the tumbling that loads that tissue and write it down.',
  },
  {
    id: 'injury-prevention',
    section: 'Tissues and prevention',
    title: 'Injury prevention in the gym',
    kicker: 'Most of what we prevent is wrists, ankles, and backs — plus the strains we rush.',
    body: [
      'Wrists: they live in extension on every block. Prepare them with open-shoulder strength, wrist-friendly shapes (fist or wedge if the wrist is already loud), and progressions that do not dump all the force into a short arm. Ankles: short landings force extra dorsiflexion. You see this on standing tucks, early aerials, and under-rotated fulls — the feet get there before the hips are done rotating, so the ankle has to fold. Teach them to land with hips under, not in front of a jammed shin. An ankle brace can be a good seatbelt in early acquisition of those skills. It is not a forever plan, and it does not replace the landing shape.',
      'Backs: lumbar extension plus speed is the usual story. Open-shoulder training that does not require a dumped low back; hollow and Superman that they actually own; layouts that have enough flip so they do not pike-crunch the spine at the end. Groin and adductor strains like sudden splits, switches, and straddle jumps they have not loaded. Abs and hip flexors complain when we jump straight to high-volume V-ups and lemon squeezes with no trunk work. Hamstrings: fast punch and snap without a warm posterior chain. Prevention is strength and timing, not a longer static stretch as the whole warm-up.',
      'Conditioning belongs in prevention. Open-shoulder work so the block is a shoulder, not a bent elbow and a jammed wrist. Calf and soleus strength so a landing can plantarflex and then accept dorsiflexion on purpose. Hip and trunk work so hollow, arch, and a punch sit are options, not hopes. Prepare for tumbling with the shapes of tumbling — inch-back hollows, Superman, calf raises, wrist rocks — before the first standing tuck of the day.',
      'Ice and RICE: Gabe Mirkin coined RICE (rest, ice, compression, elevation) in 1978. Years later he said he was wrong about ice for healing — ice can delay the inflammatory signals the tissue uses to repair. The method spread anyway. Acute first aid is still calm the person, stop the thing that hurts, and get a real look when it is more than sore. Do not “ice it and come back to standing tucks.” Short landings and forced dorsiflexion are a technique and a progression problem. Slow the skill down, raise the landing, or put a brace on during early acquisition — do not just ice the ankle you keep re-jamming.',
    ],
    gym: 'Standing tuck, new aerial, under-rotated full: watch the ankle. If the landing is short, fix rotation and hip stack before you add more reps. Brace is allowed for that window.',
  },
]
