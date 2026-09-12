/**
 * Coach study notes for joints, tissue, and gym prevention.
 * Textbook structure. Not a diagnosis and not a medical course.
 */

import type { PhysicsLesson } from './tumblingPhysics'

export type CoachLesson = PhysicsLesson

export const ANATOMY_LESSONS: CoachLesson[] = [
  {
    id: 'movement-names',
    section: 'Joints and actions',
    title: 'Joint actions and cues',
    kicker: 'Name the joint action so the cue matches the body.',
    body: [
      'Flexion decreases the angle of a joint. Extension increases it. Coaches already cue this without the vocabulary. “Close the hips” on a hollow is hip flexion. “Open the hips” on a handstand is hip extension.',
      'Shoulder flexion raises the arms toward the ears. High V, handstand line, Superman, and the arch all use shoulder flexion, even when the chest is lifted. Shoulder extension takes the arms down and behind the body. “Arms by the ears” is shoulder flexion plus scapulae that allow that range.',
      'Elbow and knee flexion is a bend. Extension is a straight line. Cue “finish the elbows” or “straighten the elbows.” Do not cue “lock.” Athletes who already hyperextend will take a lock past straight into a reverse curve. Soft knees are a little flexion.',
      'Wrist flexion points the palm toward the forearm. Wrist extension is the opposite: the back of the hand moves toward the forearm. Coaches also call that wrist dorsiflexion. The handstand block lives there. Ulnar and radial deviation are the small side to side wrist motions.',
      'Ankle plantarflexion is a pointed foot and the push of a punch. Ankle dorsiflexion draws the toes toward the shin. That is the landing and the hurdle. The word dorsiflexion is shared with the wrist, but the joint is different. Forced extra ankle dorsiflexion on a short landing is where many ankles get hurt.',
      'Hips also abduct (leg away), adduct (leg in), and rotate (turn out or turn in). “Heels together, toes out” is external rotation. A straddle is abduction plus some flexion.',
      'The spine can flex (round), extend (arch), side-bend, and rotate. “Ribs in” often means do not dump into lumbar extension. “Chin to chest” on a long bridge is cervical flexion on top of thoracic extension. Those are two spinal actions at once.',
      'Pair the cue with the action. “Reach long” on a layout is hip extension and shoulder flexion with a long spine. “Get tight” is flexion at hips and knees plus arms in. “Block” is shoulder flexion and wrist extension into the floor. When a cue fails, ask which joint you meant.',
    ],
    gym: 'Pick one joint when they are lost. “Open the hips” is clearer than “look longer” if the pike is the miss.',
  },
  {
    id: 'struggle-hypermobile',
    section: 'Joints and actions',
    title: 'Limited range and extra range',
    kicker: 'Some misses are missing strength. Some are too much motion in the wrong place.',
    body: [
      'Common limits: not enough shoulder flexion to get arms by the ears without the ribs flaring; not enough hip extension to stay long in a handstand or Superman; not enough ankle plantarflexion for a punch; not enough controlled spinal flexion for a hollow, so they hinge at the low back instead. Those are usually strength, timing, or a shape they have not owned yet.',
      'Hypermobility is extra motion you can see. Elbows that fold into a reverse curve. Knees that snap backward in a stand or a handstand. Wrists that fold into a deep extension on every block. Low backs that dump into a huge arch as soon as the arms go up. Ribs that flare and stay flared.',
      'Extra range is not automatically talent. The joint is not being stopped by the usual end feel, so the athlete has to create the stop with muscle. Tumbling force still has to go somewhere. If the elbow or knee does not have a bony or ligamentous “enough,” the load goes into the joint surfaces and the tissues that were already loose.',
      'You will see the same athletes with pretty lines and cranky wrists, or a gorgeous bridge and a sore low back. Do not stretch those end ranges for a prettier picture. Load them in the mid range they can control.',
      'Positions that often start the injury story: deep forced wrist extension on a short arm block; forced ankle dorsiflexion on a short landing; lumbar extension plus rotation under speed; a split or switch with a groin that was not ready; a hollow or V-up yanked from the hip flexors instead of the trunk.',
    ],
    gym: 'If elbows or knees hyperextend, cue a strong mid-range stop. Do not stretch that end range for line. Film the wrist on blocks and the ankle on short landings.',
  },
  {
    id: 'tissues-grades',
    section: 'Tissues and prevention',
    title: 'Muscle, tendon, and ligament',
    kicker: 'The tissue tells you the name. The grade tells you how loud it is.',
    body: [
      'Muscle contracts and creates motion. A muscle strain is the muscle or the muscle-tendon junction getting overstretched or overloaded. Grade 1: sore, they can still move, maybe a little weak. Grade 2: a real tear of some fibers, swelling, a limp or a hole in the strength, they protect it. Grade 3: a complete tear. They cannot use that action. Sometimes there is a gap you can feel. Hamstrings, groins, hip flexors, and abs show up as strains in this gym.',
      'Tendon connects muscle to bone and stores spring. Tendinopathy is the overuse name. The older word “tendinitis” is often wrong, because a lot of it is not a hot infection of the tendon. It likes to ache at the start of work, ease, then complain after. Wrist extensors, Achilles, and patellar tendon are common. Rest from the insult, then load the tendon slowly. Do not stretch an angry tendon as the whole plan.',
      'Ligament connects bone to bone and stops the joint from going somewhere it should not. A sprain is a ligament injury. Grade 1: stretched, sore, still mostly stable. Grade 2: partial tear, swelling, some give when you test it. Grade 3: complete tear. The joint feels loose or gone. Ankle inversion sprains are the ones you will see most. This is not a strain. Do not cue “walk it off” on a grade 2 or 3 ankle.',
      'Severity you can judge without pretending to be a doctor: can they walk, bear weight, or do the motion at all? Is there rapid swelling, deformity, numbness, or a joint that looks out of place? Those last ones leave the gym floor and get a professional look. Everything else is still a training-day decision, not a diagnosis.',
    ],
    gym: 'Strain is muscle. Sprain is ligament. Tendon complaints like a warm-up ache that returns after. When in doubt, stop the tumbling that loads that tissue and write it down.',
  },
  {
    id: 'injury-prevention',
    section: 'Tissues and prevention',
    title: 'Prevention in the gym',
    kicker: 'Most of what we prevent is wrists, ankles, and backs, plus the strains we rush.',
    body: [
      'Wrists live in extension on every block. Prepare them with open-shoulder strength, wrist-friendly shapes (fist or wedge if the wrist is already loud), and progressions that do not dump all the force into a short arm.',
      'Ankles: short landings force extra dorsiflexion. You see this on standing tucks, early aerials, and under-rotated fulls. The feet get there before the hips are done rotating, so the ankle has to fold. Teach them to land with hips under, not in front of a jammed shin. An ankle brace can be a seatbelt in early acquisition. It is not a forever plan, and it does not replace the landing shape.',
      'Backs: lumbar extension plus speed is the usual story. Open-shoulder training that does not require a dumped low back; hollow and Superman that they actually own; layouts that have enough flip so they do not pike-crunch the spine at the end.',
      'Groin and adductor strains like sudden splits, switches, and straddle jumps they have not loaded. Abs and hip flexors complain when we jump straight to high-volume V-ups with no trunk work. Hamstrings complain after a fast punch and snap with no warm posterior chain. Prevention is strength and timing, not a longer static stretch as the whole warm-up.',
      'Conditioning belongs in prevention. Open-shoulder work so the block is a shoulder, not a bent elbow and a jammed wrist. Calf and soleus strength so a landing can plantarflex and then accept dorsiflexion on purpose. Hip and trunk work so hollow, arch, and a punch sit are options. Prepare with the shapes of tumbling before the first standing tuck of the day.',
      'Ice and RICE: Gabe Mirkin coined RICE (rest, ice, compression, elevation) in 1978. Years later he said he was wrong about ice for healing. Ice can delay the inflammatory signals the tissue uses to repair. Acute first aid is still calm the person, stop the thing that hurts, and get a real look when it is more than sore. Do not ice an ankle and return to standing tucks. Short landings are a technique and a progression problem.',
    ],
    gym: 'Standing tuck, new aerial, under-rotated full: watch the ankle. If the landing is short, fix rotation and hip stack before you add more reps. A brace is allowed for that window.',
  },
]
