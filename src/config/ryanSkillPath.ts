/**
 * Ryan's skill path — top-down draft from his interview answers (2026-09-25).
 * Organized, not rewritten. He corrects this; nothing here is final until he says so.
 *
 * Shape: each step names the skill, what it NEEDS (rules he never breaks),
 * what can BEND (strategic exceptions), and the ASK line (what an athlete
 * should ask their coach to work on, and why).
 */

export interface SkillPathStep {
  id: string
  skill: string
  needs: string[]
  canBend: string[]
  ask: string
  ryanNote?: string
}

export const RYAN_SKILL_PATH: SkillPathStep[] = [
  {
    id: 'double-back',
    skill: 'Double back',
    needs: ['A layout you can trust with your eyes closed', 'Enough height that the second flip never feels rushed'],
    canBend: [],
    ask: 'Ask your coach whether your single layout has the height and shape control a double needs. If the single is low, the double is not next.',
    ryanNote: 'Top of the path. Highest level skill Ryan teaches toward.',
  },
  {
    id: 'triple-full',
    skill: 'Triple full',
    needs: ['A full that finishes with time to spare', 'Twist that starts late and stays tight (11 to 1 o\u2019clock)'],
    canBend: [],
    ask: 'Ask your coach if your double full is finishing early with shape to spare. Triples come from twist efficiency, not from trying harder.',
    ryanNote: 'Top of the path alongside double backs.',
  },
  {
    id: 'full',
    skill: 'Full twisting layout',
    needs: ['A strong layout first'],
    canBend: ['Ryan sometimes bends this if the layout is close or the athlete already has the skill, but it messes with what he is trying to build.'],
    ask: 'Ask your coach whether your layout is strong enough to twist out of. A full on a shaky layout teaches a shaky full.',
  },
  {
    id: 'layout',
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
    skill: 'Round off back handspring series',
    needs: ['A strong round off before touching it'],
    canBend: [
      'Athletes can show a useful round off while the cartwheel is still rough. Ryan has watched athletes build a decent series while still spending five minutes on cartwheels at the start of the lesson.',
    ],
    ask: 'Ask your coach what your round off series is missing. Feet in front, acceleration, or the hollow rebound shape, name the piece.',
  },
  {
    id: 'ro-bhs',
    skill: 'Round off back handspring',
    needs: ['A strong round off'],
    canBend: [
      'Round off back handsprings can come before a standing handspring is independent. More power makes it easier to hold the right shapes, then you work down to less power. Most of Ryan\u2019s athletes get a nice running handspring on floor while the standing one still lives on trampoline, and the standing one ends up stronger for it.',
    ],
    ask: 'Ask your coach whether your round off is strong enough to connect. That is the only gate here.',
    ryanNote: 'We get round off handsprings from a passe fall and the standing handsprings get stronger.',
  },
  {
    id: 'round-off',
    skill: 'Round off',
    needs: ['Cartwheel work stays in the lesson', 'Eyes down, arms horizontal out of it'],
    canBend: [],
    ask: 'Ask your coach to watch your eyes and arms out of the round off. Eyes down and arms carrying back beat arms up and eyes up for everything that connects after it.',
    ryanNote: 'Teach arms horizontal out of round offs and back handsprings to carry momentum backwards until the series is strong. Then teach the block: feet slightly behind on a soft mat, eyes forward, stack and redirect up. Round off into a lightning bolt shape builds habits Ryan has to rework; zombie is the landing shape.',
  },
  {
    id: 'standing-bhs',
    skill: 'Standing back handspring',
    needs: ['Open hips and a real hollow, not a bent one'],
    canBend: ['Often arrives after the running handspring, not before. That is normal in Ryan\u2019s gym.'],
    ask: 'Ask your coach whether your running handspring shapes are clean. The standing one gets built from those reps.',
  },
  {
    id: 'standing-tuck',
    skill: 'Standing back tuck',
    needs: ['A tuck shape that opens to a landing with arms up'],
    canBend: ['The best standing tucks come from properly trained running tucks. Athletes who learned the standing tuck first are the ones who tend to get stuck moving to layouts.'],
    ask: 'Ask your coach if your running tuck is solid before pouring time into the standing one.',
  },
  {
    id: 'back-walkover',
    skill: 'Back walkover',
    needs: ['A back bend. Never without it.'],
    canBend: [],
    ask: 'Ask your coach to check your back bend first. No bend, no walkover, no debate.',
  },
  {
    id: 'basics',
    skill: 'Foundations',
    needs: [
      'Meet the athlete where they are: growth spurts, surgeries, and comebacks all scale further down than average',
      'Straight arm handstand forward rolls (builds tolerance for unnatural corrections, teaches the hips to stay open when hollow is needed)',
      'Handstand to candle with open hips (translates to arch-to-hollow in handsprings and layout sets)',
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
