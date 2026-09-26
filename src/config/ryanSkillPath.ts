/**
 * Ryan's skill path — top-down draft from his interview answers (2026-09-25).
 * Organized, not rewritten. He corrects this; nothing here is final until he says so.
 *
 * Three tracks: running tumbling, standing tumbling, and walking tumbling
 * (cartwheels, walkovers, cart skills) in the middle.
 *
 * The connecting principle, in his words: "working down gradually from more
 * power to less is a way of progressing a skill to a more difficult form
 * from running to standing." Cart fulls build standing fulls. Cart tucks
 * build standing tucks.
 *
 * Shape: each step names the skill, what it NEEDS (rules he never breaks),
 * what can BEND (strategic exceptions), and the ASK line (what an athlete
 * should ask their coach to work on, and why).
 */

export type SkillTrack = 'running' | 'standing' | 'walking' | 'foundation'

export interface SkillPathStep {
  id: string
  skill: string
  track: SkillTrack
  needs: string[]
  canBend: string[]
  ask: string
  ryanNote?: string
}

export const RYAN_SKILL_PATH: SkillPathStep[] = [
  {
    id: 'double-back',
    track: 'running',
    skill: 'Double back',
    needs: [
      'A back tuck high enough that their back reaches shoulder/head height (a building block, not a listed skill)',
      'The test: over-rotate that tuck to their back on a shoulder-level mat. Shoulder level alone is not always enough.',
    ],
    canBend: [
      'A back 1.5 and a front 1.5 help. At least a front 1.5 goes a super long way.',
    ],
    ask: 'Ask your coach whether your back tuck is high enough to over-rotate to your back on something at shoulder level. If not, the double is not next.',
    ryanNote:
      'Increase rotation speed with a cowboy tuck, knees apart. When first trying it, do not trust your instinct. Over-rotating is way better than under-rotating. On the first attempts you will think you know where you are and want to let out and land. Your instinct is probably wrong. If you let out early you will under-rotate and could neck it. Stay in it and try to over-flip the first one even when you think you have done two flips.',
  },
  {
    id: 'triple-full',
    track: 'running',
    skill: 'Triple full',
    needs: [
      'A high double full with plenty of time to open and land',
      'Finish the second twist not long after the halfway point of the flip',
      'A deeper blocking angle than a double: more twist per flip needs more height per flip',
    ],
    canBend: ['Back 2.5 and front 2.5 help build toward it.'],
    ask: 'Ask your coach whether your double full finishes the second twist early with time to let out and slow the twist before landing. If the double is rushed, the triple is not next.',
    ryanNote:
      'You cannot set and wait on the takeoff for a triple full like you can for a single or some doubles. Do not stand up and reach for the sky then twist. The twist arm will be moving down while the rebound is pushing up. Adding a twist to the beginning of a double was easier than adding a third twist to the end of one.',
  },
  {
    id: 'double-full',
    track: 'running',
    skill: 'Double full',
    needs: [
      'A high and straight full with time to open and land',
      'A front rudi (1.5 twist)',
    ],
    canBend: [],
    ask: 'Ask your coach whether your single full is straight with time to spare at the end. The double needs that time.',
  },
  {
    id: 'full',
    track: 'running',
    skill: 'Full twisting layout',
    needs: [
      'A strong layout first. Non-negotiable.',
      'Layout standards before twisting: solid blocking angle to convert travel to height; shape deadline at 3 o’clock (first quarter of flip); set with head in; enough rotation to keep hips open all the way through (no piking)',
      'Twist timing: commonly taught 11 to 1, but 10 to 12 may be better — the half turn spots the ground so the athlete does not feel lost, while still maximizing the set and staying hollow to land',
      'Front halves (barani) and back halves can both help build toward a full',
    ],
    canBend: ['Ryan sometimes bends the strong-layout rule if it is close or the athlete already has the skill, but it messes with what he is trying to build.'],
    ask: 'Ask your coach about your twist timing and whether your layout is strong enough to twist out of. A full on a shaky layout teaches a shaky full.',
    ryanNote:
      'Teach it in this order: layout to belly, half to back, full to belly, then full to feet. Opposite side spotting can preserve the set and bridge the gap between a spotted half and a spotted full. Twist mechanics live in the physics section. His arm-drop method: master a consistent 3/4 layout to belly (5 good reps, pit pillow if you have one), then add the arm drop late — drop the right arm, squeeze the left against the ear, stay rigid and do not think about twisting. Move the drop a little earlier and deeper, then both arms, working the twist into 11 to 1. Then add the handspring or round off and take the layout all the way to the feet.',
  },
  {
    id: 'back-half',
    track: 'running',
    skill: 'Back layout with half to feet',
    needs: [
      'A front layout',
      'A back half to back',
    ],
    canBend: [],
    ask: 'Ask your coach whether your front layout and back half to back are solid enough to take the half to your feet.',
  },
  {
    id: 'barani',
    track: 'running',
    skill: 'Front barani (front layout half)',
    needs: [
      'Late twisting progressions — never train it off how a round off feels',
      'A front pike helps more than a front layout (more cat twist, more twist speed)',
    ],
    canBend: [],
    ask: 'Ask your coach to teach your barani with late twisting, not like a round off with no hands. How it is trained decides your whole front twisting future.',
    ryanNote: 'This is not a no-handed round off. Train it like one and you twist the wrong way for front twisting and build the wrong mechanics for everything after. The chain: barani leads to front full, front full helps back 1.5 and leads to rudi, rudi helps back dubs. Full entrance plus wrapping for a rudi gives a double. Double entrance plus wrapping for a front 2.5 (Randi) gives a triple full.',
  },
  {
    id: 'layout',
    track: 'running',
    skill: 'Layout',
    needs: [
      'Proper hollow hold with arms up, at least 20 seconds (Ryan wants a minute before expecting it on spring floor)',
      'A super high tuck with enough flip to open and land with arms up',
    ],
    canBend: ['Some athletes get tucked or piked fulls without a great layout, but they usually stall trying to move past tucks into real layout territory.'],
    ask: 'Ask your coach to test your hollow hold with arms up. If you cannot hold it still, you cannot hold it flipping.',
    ryanNote: 'I dont think ive seen anyone hit a good layout that cant do a proper hollow hold with arms up for at least 20 seconds.',
  },
  {
    id: 'back-tuck',
    track: 'running',
    skill: 'Round off back handspring back tuck',
    needs: [
      'A strong round off series first',
      'A good tuck on trampoline from a passe fall round off, and/or a standalone tuck from bounces with arms up',
    ],
    canBend: [
      'Some athletes get the tuck without a strong series, because the feet-behind problem on their series actually helps the tuck set. They generally stall moving into layouts afterward.',
      'Ryan has seen plenty of back tucks from athletes who cannot do a backward roll.',
    ],
    ask: 'Ask your coach whether your series meets the standard: feet in front three times, accelerating without getting shorter on the second and third handspring, power staying long and fast, and a strong hollow rebound out of one, two, or three. If you have that plus a good tramp tuck, you can get this skill.',
  },
  {
    id: 'ro-bhs-series',
    track: 'running',
    skill: 'Round off back handspring series',
    needs: ['A strong round off before touching it', 'Build it as round off 2, then round off 3 — a strong 2 leads to a strong 3'],
    canBend: [
      'Athletes can show a useful round off while the cartwheel is still rough. Ryan has watched athletes build a decent series while still spending five minutes on cartwheels at the start of the lesson.',
    ],
    ask: 'Ask your coach what your round off series is missing. Feet in front, acceleration, or the hollow rebound shape, name the piece.',
  },
  {
    id: 'ro-bhs',
    track: 'running',
    skill: 'Round off back handspring',
    needs: ['A strong round off'],
    canBend: [
      'Round off back handsprings can come before a standing handspring is independent. More power makes it easier to hold the right shapes, then you work down to less power. Most of Ryan\u2019s athletes get a nice running handspring on floor while the standing one still lives on trampoline, and the standing one ends up stronger for it.',
    ],
    ask: 'Ask your coach whether your round off is strong enough to connect. That is the only gate here.',
    ryanNote: 'We get round off handsprings from a passe fall and the standing handsprings get stronger. During approximation and acquisition, teach a strong round off back handspring zombie shape falling down to a pike hollow arch shape — the athlete learns to carry momentum backwards into a connection drill before acquiring the round off back handspring. A strong round off is required for this to work. Plenty of athletes can flip by themselves but lack the shaping and round off to build a handspring that becomes a series. Training it right from the start drastically increases what they can get later. Cheer tryouts rush this: athletes chase the handspring without a mental grasp of how it works or the physical feeling of the shapes it was designed around.',
  },
  {
    id: 'round-off',
    track: 'running',
    skill: 'Round off',
    needs: [
      'Strong cartwheel step-in to zombie shape or C shape',
      'Strong round off from a passe fall — tumbling should build power, not use it',
      'Strong lunge lever handstand, cartwheels, and cartwheel step-in zombie mastery before training it on hard surfaces',
      'Strong hollow and handstand shapes',
    ],
    canBend: [],
    ask: 'Ask your coach to watch your eyes and arms out of the round off. Eyes down and arms carrying back beat arms up and eyes up for everything that connects after it.',
    ryanNote: 'One of the hardest skills to explain and one of the most commonly trained wrong because it is so complex. It is the biggest bottleneck between foundational tumbling and higher skills — train it intentionally, on a soft surface early, without skipping the prerequisites. It takes a moment of standing on one arm to really flow right. Teach arms horizontal out of round offs and back handsprings to carry momentum backwards until the series is strong. Then teach the block: feet slightly behind on a soft mat, eyes forward, stack and redirect up. Round off into a lightning bolt shape builds habits Ryan has to rework; zombie is the landing shape.',
  },
  {
    id: 'standing-full',
    track: 'standing',
    skill: 'Standing full',
    needs: [
      'A strong standing tuck first',
      'Cart fulls help build toward this — more power first, then work down to less',
    ],
    canBend: [],
    ask: 'Ask your coach whether your standing tuck and cart full are solid enough to start twisting from standing.',
    ryanNote: 'Top of the standing track. Working down from more power to less is how a skill progresses to a more difficult form from running to standing.',
  },
  {
    id: 'standing-tuck',
    track: 'standing',
    skill: 'Standing back tuck',
    needs: ['A tuck shape that opens to a landing with arms up'],
    canBend: ['The best standing tucks come from properly trained running tucks. Athletes who learned the standing tuck first are the ones who tend to get stuck moving to layouts.'],
    ask: 'Ask your coach if your running tuck is solid before pouring time into the standing one.',
  },
  {
    id: 'standing-bhs',
    track: 'standing',
    skill: 'Standing back handspring',
    needs: ['Open hips and a real hollow, not a bent one'],
    canBend: ['Often arrives after the running handspring, not before. That is normal in Ryan\u2019s gym.'],
    ask: 'Ask your coach whether your running handspring shapes are clean. The standing one gets built from those reps.',
  },
  {
    id: 'back-walkover',
    track: 'standing',
    skill: 'Back walkover',
    needs: ['A back bend. Never without it.'],
    canBend: [],
    ask: 'Ask your coach to check your back bend first. No bend, no walkover, no debate.',
  },
  {
    id: 'cart-full',
    track: 'walking',
    skill: 'Cart full',
    needs: ['A solid cartwheel and a layout you can twist out of'],
    canBend: [],
    ask: 'Ask your coach whether your cartwheel is clean enough to add a full. Cart fulls are the bridge to standing fulls.',
    ryanNote: 'Walking tumbling lives between running and standing. Cart fulls help with standing fulls — more power first, then work down to less.',
  },
  {
    id: 'cart-dub',
    track: 'walking',
    skill: 'Cart double full',
    needs: ['A strong cart full first'],
    canBend: [],
    ask: 'Ask your coach if your cart full has the height and control for a second twist.',
  },
  {
    id: 'cart-tuck',
    track: 'walking',
    skill: 'Cart tuck',
    needs: ['A solid cartwheel'],
    canBend: [],
    ask: 'Ask your coach whether your cartwheel is clean enough to tuck out of. Cart tucks are the bridge to standing tucks.',
    ryanNote: 'Cart tucks help with standing tucks — more power first, then work down to less.',
  },
  {
    id: 'cartwheel-handspring',
    track: 'walking',
    skill: 'Cartwheel handspring',
    needs: ['A solid cartwheel and a handspring you can land clean'],
    canBend: [],
    ask: 'Ask your coach to watch your cartwheel entry. The handspring only works if the cartwheel sets it up.',
    ryanNote: 'Same idea as a standing handspring tuck or handspring full — the walking version builds the standing one.',
  },
  {
    id: 'front-walkover',
    track: 'walking',
    skill: 'Front walkover',
    needs: ['A bridge and the shoulder flexibility to go over clean'],
    canBend: [],
    ask: 'Ask your coach to check your bridge first, same as the back walkover.',
    ryanNote: 'Front and back walkovers and cartwheels are walking tumbling — the middle ground between running and standing.',
  },
  {
    id: 'basics',
    track: 'foundation',
    skill: 'Foundations',
    needs: [
      'Meet the athlete where they are: growth spurts, surgeries, and comebacks all scale further down than average',
      'Straight arm handstand forward rolls (builds tolerance for unnatural corrections, teaches the hips to stay open when hollow is needed)',
      'Handstand to candle with open hips (translates to arch-to-hollow in handsprings and layout sets)',
      'Handstands and handstand shoulder taps — the building blocks for cartwheels',
      'Hollow holds, handstands on the wall, cartwheels, trampoline air awareness where available',
    ],
    canBend: ['Some kids have trampolined all their life and some have never been on one. The starting point moves. The scaling in the app exists for this.'],
    ask: 'Ask your coach which basic is the weak link under your current skill. Basics done right are what make higher skills learnable.',
    ryanNote: 'Some basics go a super long way with creating habits and mental resilience for higher level tumbling. That is something many athletes and coaches do not understand.',
  },
]

export interface CueSwap {
  id: string
  insteadOf: string
  sayThis: string
  why: string
}

export const RYAN_CUE_SWAPS: CueSwap[] = [
  {
    id: 'snap-down',
    insteadOf: '\u201cSnap down\u201d',
    sayThis: 'Teach the rebound shape directly, not a handstand snapdown',
    why: 'Handstand snapdowns for lower level athletes are where bad rebound habits start: body segmentation, bending and jumping, breaking shapes. Done correctly by higher level athletes working blocking skills they can be genuinely useful. Teach good habits and be patient with approximation at the same time.',
  },
  {
    id: 'drive-toes',
    insteadOf: '\u201cDrive your toes!\u201d',
    sayThis: 'Hips up too',
    why: 'Driving toes alone leads to piking. The hips have to come up with them.',
  },
  {
    id: 'dont-be-scared',
    insteadOf: '\u201cDon\u2019t be scared\u201d',
    sayThis: 'Name what is actually happening and shrink the step',
    why: 'It usually doesnt help when athletes are struggling with fear. Fear needs a smaller agreed step, not a command.',
  },
  {
    id: 'chin-in',
    insteadOf: '\u201cGet your chin in\u201d (handsprings)',
    sayThis: '\u201cCover the ears and look through your hands\u201d',
    why: 'It puts the head where it needs to be without collapsing the chest.',
  },
  {
    id: 'chin-to-chest',
    insteadOf: '\u201cChin to chest\u201d',
    sayThis: 'Neutral head, chin slightly down, rounded thoracic spine',
    why: 'Ryan has never done a tumbling skill with his chin on his chest and cannot imagine a back handspring that way. The chin cue is independent from what the thoracic spine does; the rounded upper back is the actual shape.',
  },
  {
    id: 'big-rebound',
    insteadOf: '\u201cBig rebound\u201d out of round offs',
    sayThis: '\u201cTight zombie at the end\u201d \u2014 arms in front, armpits past the toes, stand into the springs',
    why: 'A smaller rebound with the right shapes beats a big one with bent hips and knees. The rebound recycles momentum; bend-and-jump defeats the purpose.',
  },
  {
    id: 'eyes-up',
    insteadOf: 'Eyes up, arms up rebound',
    sayThis: 'Eyes down, arms down in front, chest comes up',
    why: 'Newton\u2019s third law, angular momentum, moment of inertia. Looking at the ground with arms going down in front brings the chest up. Arms-up-eyes-up on a beginner round off makes no sense: the next skill connects backwards, not upwards.',
  },
  {
    id: 'sit',
    insteadOf: '\u201cSit\u201d (handsprings)',
    sayThis: '\u201cBend\u201d',
    why: 'Nobody is putting their weight onto an object to sit on. Bend describes what the body actually does.',
  },
  {
    id: 'lean',
    insteadOf: '\u201cLean\u201d',
    sayThis: '\u201cFall\u201d',
    why: 'Lean means putting weight on another object. There is no object. Fall is the honest word.',
  },
  {
    id: 'throw-it',
    insteadOf: '\u201cThrow it\u201d',
    sayThis: '\u201cExecute it\u201d / \u201cperform it\u201d / \u201cdo it\u201d',
    why: 'Throw encourages recklessly throwing the body at the skill. Execute asks for the skill on purpose.',
  },
]
