/**
 * Unified skill registry seed — the single source of truth for skill identity.
 *
 * One record per skill. The old separate models (goal catalog, progression
 * seed, guide cards) were merged here during the 2026-09-26 skill-path merge.
 *
 * ID rules: skl_* ids are stable and reused from the progression seed where one
 * existed. guideId preserves every existing reference (technique evidence keys,
 * owner onboarding track items, class criteria, search deep-links). Cue swaps
 * live in src/config/skillCues.ts and are intentionally NOT part of this file.
 *
 * Guide prose (guideNeeds / canBend / ask / ryanNote) is Ryan's, copied verbatim
 * from the original guide — organized, never rewritten.
 */

export type UnifiedSkillTrack = 'running' | 'standing' | 'walking' | 'foundation'

export interface UnifiedSkill {
  /** Stable skl_* id. Reused from the progression seed where one existed. */
  id: string
  /** Guide card id (kebab-case), present only when a guide card exists. */
  guideId?: string
  /** SKILL_GOAL_CHOICES id, present only when an athlete-facing choice maps here. */
  catalogId?: string
  name: string
  /** Merged from seed aliases + catalog matchNames + catalog label. */
  aliases: string[]
  track: UnifiedSkillTrack
  /** Guide prose, Ryan's verbatim. Absent until a guide card exists. */
  guideNeeds?: string[]
  canBend?: string[]
  ask?: string
  ryanNote?: string
  /**
   * Interleaved video quotes and Ryan's commentary, in the order he laid them out.
   * Quotes render in one style (with source attribution), Ryan's words in another.
   */
  noteBlocks?: (
    | { kind: 'quote'; text: string; source: string }
    | { kind: 'ryan'; text: string }
  )[]
}

export const UNIFIED_SKILL_SEED: UnifiedSkill[] = [
  {
    "id": "skl_ro_bhs_tuck",
    "guideId": "back-tuck",
    "catalogId": "run_ro_hs_tuck",
    "name": "Round-off handspring back tuck",
    "aliases": [
      "RO BHS tuck",
      "round off back handspring tuck",
      "ro hs tuck",
      "round-off handspring back tuck",
      "back tuck"
    ],
    "track": "running",
    "guideNeeds": [
      "A strong round off series first",
      "A good tuck on trampoline from a passe fall round off, and/or a standalone tuck from bounces with arms up"
    ],
    "canBend": [
      "Some athletes get the tuck without a strong series, because the feet-behind problem on their series actually helps the tuck set. They generally stall moving into layouts afterward.",
      "Ryan has seen plenty of back tucks from athletes who cannot do a backward roll."
    ],
    "ask": "Ask your coach whether your series meets the standard: feet in front three times, accelerating without getting shorter on the second and third handspring, power staying long and fast, and a strong hollow rebound out of one, two, or three. If you have that plus a good tramp tuck, you can get this skill."
  },
  {
    "id": "skl_ro_bhs_full",
    "catalogId": "run_ro_hs_full",
    "name": "Back full (round off entry)",
    "aliases": [
      "RO BHS full",
      "round off back handspring full"
    ],
    "track": "running"
  },
  {
    "id": "skl_standing_tuck",
    "guideId": "standing-tuck",
    "catalogId": "stand_tuck",
    "name": "Standing back tuck",
    "aliases": [
      "standing tuck",
      "tuck",
      "standing back tuck"
    ],
    "track": "standing",
    "guideNeeds": [
      "A trampoline back tuck or a running tuck"
    ],
    "canBend": [
      "Work down from more power to less: trampoline or running tuck, then cartwheel tucks, then the standing tuck. Athletes who learned the standing tuck first are the ones who tend to get stuck moving to layouts."
    ],
    "ask": "Ask your coach if your running tuck is solid before pouring time into the standing one."
  },
  {
    "id": "skl_standing_full",
    "guideId": "standing-full",
    "catalogId": "stand_full",
    "name": "Standing full",
    "aliases": [
      "standing full twist",
      "full",
      "standing full"
    ],
    "track": "standing",
    "guideNeeds": [
      "A strong standing tuck first",
      "An open tuck shape",
      "A back tuck up to a knee-high surface",
      "Cart fulls help build toward this — more power first, then work down to less"
    ],
    "canBend": [],
    "ask": "Ask your coach whether your standing tuck and cart full are solid enough to start twisting from standing.",
    "ryanNote": "Top of the standing track. Working down from more power to less is how a skill progresses to a more difficult form from running to standing."
  },
  {
    "id": "skl_jumps_to_full",
    "name": "Jumps to full",
    "aliases": [
      "jump to full"
    ],
    "track": "standing"
  },
  {
    "id": "skl_standing_straight_leg_full",
    "name": "Standing straight leg full",
    "aliases": [],
    "track": "standing"
  },
  {
    "id": "skl_layout",
    "guideId": "layout",
    "catalogId": "run_ro_hs_layout",
    "name": "Back layout",
    "aliases": [
      "lay",
      "straight layout",
      "round-off handspring layout",
      "RO BHS layout",
      "round off back handspring layout",
      "Ro hs layout"
    ],
    "track": "running",
    "guideNeeds": [
      "Proper hollow hold with arms up, at least 20 seconds (Ryan wants a minute before expecting it on spring floor)",
      "A super high tuck with enough flip to open and land with arms up"
    ],
    "canBend": [
      "Some athletes get tucked or piked fulls without a great layout, but they usually stall trying to move past tucks into real layout territory."
    ],
    "ask": "Ask your coach to test your hollow hold with arms up. If you cannot hold it still, you cannot hold it flipping.",
    "ryanNote": "I dont think ive seen anyone hit a good layout that cant do a proper hollow hold with arms up for at least 20 seconds."
  },
  {
    "id": "skl_ro_bhs_series",
    "guideId": "ro-bhs-series",
    "catalogId": "run_ro_series",
    "name": "Round-off back handspring series",
    "aliases": [
      "RO BHS series",
      "round off series",
      "round off series (3 back handsprings)",
      "round-off back handspring series"
    ],
    "track": "running",
    "guideNeeds": [
      "A strong round off before touching it",
      "Build it as round off 2, then round off 3 — a strong 2 leads to a strong 3"
    ],
    "canBend": [
      "Athletes can show a useful round off while the cartwheel is still rough. Ryan has watched athletes build a decent series while still spending five minutes on cartwheels at the start of the lesson."
    ],
    "ask": "Ask your coach what your round off series is missing. Feet in front, acceleration, or the hollow rebound shape, name the piece."
  },
  {
    "id": "skl_ro_bhs",
    "guideId": "ro-bhs",
    "catalogId": "run_ro_bhs",
    "name": "Round-off back handspring",
    "aliases": [
      "RO BHS",
      "round off back handspring",
      "round off BHS"
    ],
    "track": "running",
    "guideNeeds": [
      "A strong round off"
    ],
    "canBend": [
      "Many of Ryan's athletes get a nice round off handspring on the mats or floor while the standing handspring is still being refined on the trampoline."
    ],
    "ask": "Ask your coach whether your round off is strong enough to connect. That is the only gate here.",
    "ryanNote": "We get round off handsprings from a passe fall and the standing handsprings get stronger. During approximation and acquisition, teach a strong round off back handspring zombie shape falling down to a pike hollow arch shape — the athlete learns to carry momentum backwards into a connection drill before acquiring the round off back handspring. A strong round off is required for this to work. Plenty of athletes can flip by themselves but lack the shaping and round off to build a handspring that becomes a series. Training it right from the start drastically increases what they can get later. Cheer tryouts rush this: athletes chase the handspring without a mental grasp of how it works or the physical feeling of the shapes it was designed around.",
    "noteBlocks": [
      {
        "kind": "quote",
        "text": "Gymnasts that have already learned the round off back handspring must continue polishing every single detail of these 2 combined skills which are the basic building blocks of backwards tumbling.",
        "source": "Back Handspring Academy"
      },
      {
        "kind": "quote",
        "text": "The goal is to tumble with fast rebounds, not with slower half squat jumps.",
        "source": "Back Handspring Academy"
      },
      {
        "kind": "ryan",
        "text": "Strong round off from a passe fall. This skill should build speed and power, not just use it. Same for the back handspring. We do not want the back handspring to spend the power from the round off. It should carry that power through and add more."
      },
      {
        "kind": "quote",
        "text": "This softer setup may protect their wrists or bodies in case of any mistakes due to their lack of complete skill mastery.",
        "source": "Back Handspring Academy"
      },
      {
        "kind": "quote",
        "text": "When gymnasts show more consistency, they can progressively move more of their training onto regular floor exercise surfaces where they can continue adding incremental steps on speed and rebounding connection... so the softer and slower early patterns of tumbling do not become a long-term habit.",
        "source": "Back Handspring Academy"
      },
      {
        "kind": "quote",
        "text": "The coach must catch mistakes early to offer instructional feedback to the gymnast and implement ways to solve the problem before it becomes a bad habit.",
        "source": "Back Handspring Academy"
      },
    ]
  },
  {
    "id": "skl_standing_bhs",
    "guideId": "standing-bhs",
    "catalogId": "stand_bhs",
    "name": "Standing back handspring",
    "aliases": [
      "standing BHS",
      "back handspring",
      "BHS",
      "standing back handspring"
    ],
    "track": "standing",
    "guideNeeds": [
      "Open hips and a real hollow, not a bent one"
    ],
    "canBend": [
      "Often arrives after the running handspring, not before. That is normal in Ryan’s gym."
    ],
    "ask": "Ask your coach whether your running handspring shapes are clean. The standing one gets built from those reps."
  },
  {
    "id": "skl_angle_back_handspring",
    "guideId": "angle-bhs",
    "name": "Angle back handspring",
    "aliases": [
      "angle bhs",
      "angle handspring"
    ],
    "track": "standing",
    "guideNeeds": [
      "A back handspring with solid shapes",
      "A strong bounce and jump from the feet"
    ],
    "canBend": [],
    "ask": "Ask your coach whether your back handspring shapes are clean enough to drop the arm swing.",
    "ryanNote": "Removes the arm swing and uses nothing but timing the upwards force from the bounce into the right shapes from the right angle. Teaches positive angle for feet in front to accelerate backwards on connections. Allows the athlete to train correct shapes in the skill much more easily since power is not an issue with these."
  },
  {
    "id": "skl_standing_layout",
    "name": "Standing layout",
    "aliases": [
      "standing lay"
    ],
    "track": "standing"
  },
  {
    "id": "skl_standing_double",
    "name": "Standing double",
    "aliases": [
      "standing double back"
    ],
    "track": "standing"
  },
  {
    "id": "skl_ro_bhs_rebound",
    "name": "Round-off handspring that can rebound",
    "aliases": [
      "RO HS rebound"
    ],
    "track": "running"
  },
  {
    "id": "skl_tramp_tuck_from_hs",
    "name": "Back tuck on tramp from a handspring or round-off",
    "aliases": [
      "tramp tuck from BHS"
    ],
    "track": "running"
  },
  {
    "id": "skl_tramp_bounce_tuck",
    "name": "Standalone back tuck from bounces on tramp",
    "aliases": [
      "bounce tuck"
    ],
    "track": "running"
  },
  {
    "id": "skl_tramp_full",
    "name": "Full on trampoline",
    "aliases": [
      "tramp full"
    ],
    "track": "running"
  },
  {
    "id": "skl_standing_open_tuck",
    "name": "Standing open tuck",
    "aliases": [
      "open tuck"
    ],
    "track": "standing"
  },
  {
    "id": "skl_standing_tuck_up_8",
    "name": "Standing tuck up panel mat (8\")",
    "aliases": [
      "tuck up 8 inch mat",
      "standing tuck up 8"
    ],
    "track": "standing"
  },
  {
    "id": "skl_standing_tuck_up_16",
    "name": "Tuck up knee high surface",
    "aliases": [
      "standing tuck up knee high",
      "tuck up 16 inch"
    ],
    "track": "standing"
  },
  {
    "id": "skl_tuck_up_raised",
    "name": "Back tuck up a knee-high raised surface",
    "aliases": [
      "tuck up a box"
    ],
    "track": "standing"
  },
  {
    "id": "skl_back_walkover",
    "guideId": "back-walkover",
    "catalogId": "stand_bwo",
    "name": "Back walkover",
    "aliases": [
      "back walk over"
    ],
    "track": "walking",
    "guideNeeds": [
      "A back bend. Never without it."
    ],
    "canBend": [],
    "ask": "Ask your coach to check your back bend first. No bend, no walkover, no debate."
  },
  {
    "id": "skl_front_walkover",
    "guideId": "front-walkover",
    "catalogId": "stand_fwo",
    "name": "Front walkover",
    "aliases": [
      "front walk over"
    ],
    "track": "walking",
    "guideNeeds": [
      "A bridge and the shoulder flexibility to go over clean"
    ],
    "canBend": [],
    "ask": "Ask your coach to check your bridge first, same as the back walkover.",
    "ryanNote": "Front and back walkovers and cartwheels are walking tumbling — the middle ground between running and standing."
  },
  {
    "id": "skl_strong_round_off",
    "guideId": "round-off",
    "catalogId": "run_strong_ro",
    "name": "Round off",
    "aliases": [
      "strong round-off",
      "round off",
      "roundoff"
    ],
    "track": "running",
    "ryanNote": "What is a strong round off?\n\nWe use the reference videos on this card to set a clear objective. Check the examples first. That is the target.\n\nA strong round off means blocking through a surface with enough power to jump off your hands adequately. You should come off the block high enough to keep your momentum carrying backwards, and land with minimal bend in your legs.\n\nThis is the hard part. Getting your feet all the way in front for a handspring connection takes real power. Even finishing a round off by itself takes holding one clean shape from your hands to your feet, without your body breaking apart anywhere in between. That is exactly why round offs get so many reps in back handspring classes.\n\nThe second half of the round off is the second half of the back handspring. Same shapes, same block, same finish.\n\nThe video below is coach-approved education for athletes, parents, and coaches. These are the same conclusions and principles I coach from.\n\nMountain climber, lunge, lever, hollow and zombie shapes are building blocks.\n\nZombie is the landing shape for the round off. It sets the athlete up for less segmentation in the hips and knees through the second half, and the arm drop helps the feet get in front for the connection. Some coaches teach the landing as a lightning bolt instead and build connections that way. Coach Ryan taught it that way himself for several years before switching.\n\nA note on the snap down drill in the video: it is done off a raised surface, and it is shown with more advanced gymnasts. It is not recommended for athletes in the approximation or early acquisition phase.\n\nTraining round off back handsprings on soft surfaces while the back handspring is still being acquired protects athletes in so many ways. It greatly reduces the chance of an athlete being traumatized by a mistake in the early phases and developing a fear that lasts long after the mistake itself is fixed. Rushing the skill can create a long-term roadblock, like a mental barrier or an injury. Be patient and trust the process.\n\nThis is one of those places where what we prioritize in training can change the trajectory of an athlete’s long-term success. Cheer tryouts often push athletes to skip the part where we build their long-term tumbling success during back handspring and round off back handspring training. That shortcut risks injuries, getting stuck, or fear that comes from never understanding what the skill physically requires to work as designed.\n\nMost of the success or failure in harder tumbling combinations comes down to how the round off back handspring is executed.",
    "guideNeeds": [
      "Strong cartwheel step-in to zombie shape or C shape",
      "Strong round off from a passe fall — round offs, handsprings, and whips should build power rather than spend it",
      "Strong lunge lever handstand, cartwheels, and cartwheel step-in zombie mastery before training it on hard surfaces",
      "Strong hollow and handstand shapes"
    ],
    "canBend": [],
    "ask": "Ask your coach to watch your eyes and arms out of the round off. Eyes down, then eyes forward with arms carrying back for everything that connects after it. The shape you hit the ground with matters more than where your eyes are, although visual cues can be extremely helpful.",
    "noteBlocks": [
      {
        "kind": "quote",
        "text": "Gymnasts that have already learned the round off back handspring must continue polishing every single detail of these 2 combined skills which are the basic building blocks of backwards tumbling.",
        "source": "Back Handspring Academy"
      },
      {
        "kind": "quote",
        "text": "The goal is to tumble with fast rebounds, not with slower half squat jumps.",
        "source": "Back Handspring Academy"
      },
      {
        "kind": "quote",
        "text": "This softer setup may protect their wrists or bodies in case of any mistakes due to their lack of complete skill mastery.",
        "source": "Back Handspring Academy"
      },
      {
        "kind": "quote",
        "text": "When gymnasts show more consistency, they can progressively move more of their training onto regular floor exercise surfaces where they can continue adding incremental steps on speed and rebounding connection... so the softer and slower early patterns of tumbling do not become a long-term habit.",
        "source": "Back Handspring Academy"
      },
      {
        "kind": "quote",
        "text": "The coach must catch mistakes early to offer instructional feedback to the gymnast and implement ways to solve the problem before it becomes a bad habit.",
        "source": "Back Handspring Academy"
      },
    ]
  },
  {
    "id": "skl_double_full",
    "guideId": "double-full",
    "catalogId": "run_ro_hs_double",
    "name": "Back double full",
    "aliases": [
      "double full",
      "round-off handspring double full",
      "RO BHS double full",
      "Ro hs double full",
      "back double full",
      "back 2",
      "back dub"
    ],
    "track": "running",
    "guideNeeds": [
      "A high and straight full with time to open and land",
      "A front rudi (1.5 twist)"
    ],
    "canBend": [
      "A back 1.5 and a front 1.5 help. At least a front 1.5 goes a super long way."
    ],
    "ask": "Ask your coach whether your single full is straight with time to spare at the end. The double needs that time."
  },
  {
    "id": "skl_front_handspring",
    "catalogId": "run_fhs",
    "name": "Front handspring",
    "aliases": [
      "front handspring",
      "FHS"
    ],
    "track": "running"
  },
  {
    "id": "skl_arabian",
    "catalogId": "run_arabian",
    "name": "Arabian",
    "aliases": [
      "arabian"
    ],
    "track": "running"
  },
  {
    "id": "skl_back_bend",
    "catalogId": "stand_back_bend",
    "name": "Back bend",
    "aliases": [
      "backbend",
      "back bend"
    ],
    "track": "foundation"
  },
  {
    "id": "skl_backbend_kick_over",
    "name": "Backbend kick over",
    "aliases": [
      "back bend kick over"
    ],
    "track": "standing"
  },
  {
    "id": "skl_front_limber",
    "name": "Front limber",
    "aliases": [
      "handstand fall to bridge",
      "front limber"
    ],
    "track": "standing"
  },
  {
    "id": "skl_round_off_to_knees",
    "name": "Round off to knees",
    "aliases": [],
    "track": "running"
  },
  {
    "id": "skl_fhs_front_tuck",
    "name": "Front handspring front tuck",
    "aliases": [
      "front handspring front",
      "fhs front"
    ],
    "track": "running"
  },
  {
    "id": "skl_standing_bhs_series",
    "catalogId": "stand_bhs_series",
    "name": "Back handspring series",
    "aliases": [
      "standing back handspring series",
      "standing BHS series"
    ],
    "track": "standing"
  },
  {
    "id": "skl_double_back",
    "guideId": "double-back",
    "name": "Double back",
    "aliases": [],
    "track": "running",
    "guideNeeds": [
      "A back tuck high enough that their back reaches shoulder/head height (a building block, not a listed skill)",
      "The test: over-rotate that tuck to their back on a shoulder-level mat. Shoulder level alone is not always enough."
    ],
    "canBend": [],
    "ask": "Ask your coach whether your back tuck is high enough to over-rotate to your back on something at shoulder level. If not, the double is not next.",
    "ryanNote": "Increase rotation speed with a cowboy tuck, knees apart. When first trying it, do not trust your instinct. Over-rotating is way better than under-rotating. On the first attempts you will think you know where you are and want to let out and land. Your instinct is probably wrong. If you let out early you will under-rotate and could neck it. Stay in it and try to over-flip the first one even when you think you have done two flips."
  },
  {
    "id": "skl_triple_full",
    "guideId": "triple-full",
    "name": "Triple full",
    "aliases": [
      "back triple full",
      "back triple",
      "back 3"
    ],
    "track": "running",
    "guideNeeds": [
      "A high double full with plenty of time to open and land",
      "Finish the second twist not long after the halfway point of the flip",
      "A deeper blocking angle than a double: more twist per flip needs more height per flip"
    ],
    "canBend": [
      "Back 2.5 and front 2.5 help build toward it."
    ],
    "ask": "Ask your coach whether your double full finishes the second twist early with time to let out and slow the twist before landing. If the double is rushed, the triple is not next.",
    "ryanNote": "You cannot set and wait on the takeoff for a triple full like you can for a single or some doubles. Do not stand up and reach for the sky then twist. The twist arm will be moving down while the rebound is pushing up. Adding a twist to the beginning of a double was easier than adding a third twist to the end of one."
  },
  {
    "id": "skl_full_twisting_triple_back",
    "name": "Full twisting triple back",
    "aliases": [
      "triple back full"
    ],
    "track": "running"
  },
  {
    "id": "skl_back_half",
    "guideId": "back-half",
    "name": "Back layout with half to feet",
    "aliases": [],
    "track": "running",
    "guideNeeds": [
      "A front layout",
      "A back half to back",
      "A solid back layout"
    ],
    "canBend": [],
    "ask": "Ask your coach whether your front layout and back half to back are solid enough to take the half to your feet."
  },
  {
    "id": "skl_barani",
    "guideId": "barani",
    "name": "Front half",
    "aliases": [
      "barani",
      "front barani"
    ],
    "track": "running",
    "guideNeeds": [
      "Late twisting progressions — never train it off how a round off feels",
      "A front pike helps more than a front layout (more cat twist, more twist speed)"
    ],
    "canBend": [],
    "ask": "Ask your coach to teach your barani with late twisting, not like a round off with no hands. How it is trained decides your whole front twisting future.",
    "ryanNote": "This is not a no-handed round off. Train it like one and you twist the wrong way for front twisting and build the wrong mechanics for everything after. The chain: barani leads to front full, front full helps back 1.5 and leads to rudi, rudi helps back dubs. Full entrance plus wrapping for a rudi gives a double. Double entrance plus wrapping for a front 2.5 (Randi) gives a triple full."
  },
  {
    "id": "skl_cart_double_full",
    "guideId": "cart-dub",
    "name": "Cart double full",
    "aliases": [],
    "track": "walking",
    "guideNeeds": [
      "A strong cart full first"
    ],
    "canBend": [],
    "ask": "Ask your coach if your cart full has the height and control for a second twist."
  },
  {
    "id": "skl_cart_full",
    "guideId": "cart-full",
    "name": "Cart full",
    "aliases": [],
    "track": "walking",
    "guideNeeds": [
      "A solid cartwheel and a layout you can twist out of"
    ],
    "canBend": [],
    "ask": "Ask your coach whether your cartwheel is clean enough to add a full. Cart fulls are the bridge to standing fulls.",
    "ryanNote": "Walking tumbling lives between running and standing. Cart fulls help with standing fulls — more power first, then work down to less."
  },
  {
    "id": "skl_cart_tuck",
    "guideId": "cart-tuck",
    "name": "Cart tuck",
    "aliases": [],
    "track": "walking",
    "guideNeeds": [
      "A solid cartwheel"
    ],
    "canBend": [],
    "ask": "Ask your coach whether your cartwheel is clean enough to tuck out of. Cart tucks are the bridge to standing tucks.",
    "ryanNote": "Cart tucks help with standing tucks — more power first, then work down to less."
  },
  {
    "id": "skl_cartwheel_handspring",
    "guideId": "cartwheel-handspring",
    "name": "Cartwheel handspring",
    "aliases": [],
    "track": "walking",
    "guideNeeds": [
      "A solid cartwheel and a handspring you can land clean"
    ],
    "canBend": [],
    "ask": "Ask your coach to watch your cartwheel entry. The handspring only works if the cartwheel sets it up.",
    "ryanNote": "Same idea as a standing handspring tuck or handspring full — the walking version builds the standing one."
  },
  {
    "id": "skl_foundations",
    "guideId": "basics",
    "name": "Foundations",
    "aliases": [],
    "track": "foundation",
    "guideNeeds": [
      "Meet the athlete where they are: growth spurts, surgeries, and comebacks all scale further down than average",
      "Straight arm handstand forward rolls (builds tolerance for unnatural corrections, teaches the hips to stay open when hollow is needed)",
      "Handstand to candle with open hips (translates to arch-to-hollow in handsprings and layout sets)",
      "Handstands and handstand shoulder taps — the building blocks for cartwheels",
      "Hollow holds, handstands on the wall, cartwheels, trampoline air awareness where available"
    ],
    "canBend": [
      "Some kids have trampolined all their life and some have never been on one. The starting point moves. The scaling in the app exists for this."
    ],
    "ask": "Ask your coach which basic is the weak link under your current skill. Basics done right are what make higher skills learnable.",
    "ryanNote": "Some basics go a super long way with creating habits and mental resilience for higher level tumbling. That is something many athletes and coaches do not understand."
  },
  {
    "id": "skl_front_tuck",
    "name": "Front tuck",
    "catalogId": "run_punch_front",
    "aliases": [
      "front tuck",
      "punch front",
      "punch front tuck"
    ],
    "track": "running"
  },
  {
    "id": "skl_front_layout",
    "name": "Front layout",
    "aliases": [
      "front layout"
    ],
    "track": "running"
  },
  {
    "id": "skl_front_pike",
    "name": "Front pike",
    "aliases": [
      "front pike"
    ],
    "track": "running"
  },
  {
    "id": "skl_side_aerial",
    "name": "Side aerial",
    "aliases": [
      "side aerial",
      "aerial"
    ],
    "track": "running"
  },
  {
    "id": "skl_front_aerial",
    "name": "Front aerial",
    "aliases": [
      "front aerial"
    ],
    "track": "running"
  },
  {
    "id": "skl_back_aerial",
    "name": "Back aerial",
    "aliases": [
      "back aerial"
    ],
    "track": "running"
  },
  {
    "id": "skl_cartwheel",
    "name": "Cartwheel",
    "aliases": [
      "cartwheel",
      "strong cartwheel"
    ],
    "track": "running"
  },
  {
    "id": "skl_one_arm_cartwheel",
    "name": "One-arm cartwheel",
    "aliases": [
      "one arm cartwheel"
    ],
    "track": "running"
  },
  {
    "id": "skl_dive_cartwheel",
    "name": "Dive cartwheel",
    "aliases": [
      "dive cartwheel"
    ],
    "track": "running"
  },
  {
    "id": "skl_bhs_step_out",
    "name": "Back handspring step out",
    "aliases": [
      "back handspring step out",
      "bhs step out",
      "step-out back handspring"
    ],
    "track": "running"
  },
  {
    "id": "skl_back_1_5",
    "name": "Back 1.5",
    "aliases": [
      "back 1.5",
      "back one and a half"
    ],
    "track": "running"
  },
  {
    "id": "skl_front_full",
    "name": "Front full",
    "aliases": [],
    "track": "running"
  },
  {
    "id": "skl_back_full",
    "guideId": "full",
    "name": "Back full",
    "aliases": [
      "back full twisting layout",
      "ro hs full",
      "round off handspring full",
      "round-off handspring full twisting layout"
    ],
    "track": "running",
    "guideNeeds": [
      "A strong layout first. Non-negotiable.",
      "Layout standards before twisting: solid blocking angle to convert travel to height; shape deadline at 3 o’clock (first quarter of flip); set with head in; enough rotation to keep hips open all the way through (no piking)",
      "Twist timing: commonly taught 11 to 1, but 10 to 12 may be better — the half turn spots the ground so the athlete does not feel lost, while still maximizing the set and staying hollow to land",
      "Front halves (barani) and back halves can both help build toward a full"
    ],
    "canBend": [
      "Ryan sometimes bends the strong-layout rule if it is close or the athlete already has the skill, but it messes with what he is trying to build."
    ],
    "ask": "Ask your coach about your twist timing and whether your layout is strong enough to twist out of. A full on a shaky layout teaches a shaky full.",
    "ryanNote": "Teach it in this order: layout to belly, half to back, full to belly, then full to feet. Opposite side spotting can preserve the set and bridge the gap between a spotted half and a spotted full. Twist mechanics live in the physics section. The arm-drop method he uses: master a consistent 3/4 layout to belly (5 good reps, pit pillow if you have one), then add the arm drop late — drop the right arm, squeeze the left against the ear, stay rigid and do not think about twisting. Move the drop a little earlier and deeper, then both arms, working the twist into 11 to 1. Then add the handspring or round off and take the layout all the way to the feet."
  },
  {
    "id": "skl_cartwheel_open_tuck",
    "name": "Cartwheel open tuck",
    "aliases": [],
    "track": "running"
  },
  {
    "id": "skl_whips",
    "name": "Whips",
    "aliases": [
      "whip"
    ],
    "track": "running"
  },
  {
    "id": "skl_front_15",
    "name": "Front 1.5 (Rudi)",
    "aliases": [
      "rudi",
      "front rudi"
    ],
    "track": "running"
  },
  {
    "id": "skl_front_2",
    "name": "Front double full",
    "aliases": [
      "front 2",
      "front dub"
    ],
    "track": "running"
  },
  {
    "id": "skl_kick_full",
    "name": "Kick full",
    "aliases": [],
    "track": "running"
  },
  {
    "id": "skl_kick_15",
    "name": "Kick 1.5",
    "aliases": [
      "kick one and a half"
    ],
    "track": "running"
  },
  {
    "id": "skl_kick_2",
    "name": "Kick double full",
    "aliases": [
      "kick dub",
      "kick double"
    ],
    "track": "running"
  },
  {
    "id": "skl_back_25",
    "name": "Back 2.5",
    "aliases": [],
    "track": "running"
  },
  {
    "id": "skl_front_25",
    "name": "Front 2.5 (Randi)",
    "aliases": [
      "randi",
      "front randi"
    ],
    "track": "running"
  },
  {
    "id": "skl_front_triple",
    "name": "Front triple full",
    "aliases": [
      "front triple",
      "front 3"
    ],
    "track": "running"
  },
  {
    "id": "skl_front_35",
    "name": "Front 3.5 (Adolph)",
    "aliases": [
      "adolph",
      "front adolph"
    ],
    "track": "running"
  },
  {
    "id": "skl_back_35",
    "name": "Back 3.5",
    "aliases": [],
    "track": "running"
  },
  {
    "id": "skl_back_quad",
    "name": "Back quad",
    "aliases": [
      "quad"
    ],
    "track": "running"
  },
  {
    "id": "skl_full_in",
    "name": "Full in",
    "aliases": [],
    "track": "running"
  },
  {
    "id": "skl_full_full",
    "name": "Full full",
    "aliases": [],
    "track": "running"
  },
  {
    "id": "skl_double_layout",
    "name": "Double layout",
    "aliases": [],
    "track": "running"
  },
  {
    "id": "skl_miller",
    "name": "Miller",
    "aliases": [],
    "track": "running"
  },
  {
    "id": "skl_killer",
    "name": "Killer",
    "aliases": [],
    "track": "running"
  },
  {
    "id": "skl_cartwheel_step_in",
    "name": "Cartwheel step in",
    "aliases": [
      "cartwheel step-in"
    ],
    "track": "walking"
  },
  {
    "id": "skl_handstand",
    "name": "Handstand",
    "aliases": [],
    "track": "foundation"
  },
  {
    "id": "skl_bounders",
    "name": "Bounders",
    "aliases": [
      "bounder",
      "flyspring",
      "fly spring",
      "bounder step out"
    ],
    "track": "running"
  },
  {
    "id": "skl_cart_hs_step_out",
    "name": "Cartwheel 2 back handsprings",
    "aliases": [
      "cartwheel hs step out",
      "cart handspring step out",
      "cartwheel back handspring back handspring"
    ],
    "track": "running"
  },
  {
    "id": "skl_front_hs_step_out",
    "name": "Front HS step out",
    "aliases": [
      "front handspring step out"
    ],
    "track": "running"
  },
  {
    "id": "skl_standing_two_to_tuck",
    "name": "Standing two to tuck",
    "aliases": [],
    "track": "standing"
  },
  {
    "id": "skl_standing_one_to_tuck",
    "name": "Standing one to tuck",
    "aliases": [
      "standing 1 to tuck",
      "standing handspring tuck"
    ],
    "track": "standing"
  },
  {
    "id": "skl_backward_roll",
    "name": "Backward roll",
    "aliases": [],
    "track": "foundation"
  },
  {
    "id": "skl_back_roll_push_up",
    "name": "Back roll to push up",
    "aliases": [],
    "track": "foundation"
  },
  {
    "id": "skl_back_extension_roll",
    "name": "Back extension roll",
    "aliases": [],
    "track": "foundation"
  },
  {
    "id": "skl_forward_roll",
    "name": "Forward roll",
    "aliases": [
      "fwd roll"
    ],
    "track": "foundation"
  },
  {
    "id": "skl_handstand_fwd_roll",
    "name": "Handstand forward roll",
    "aliases": [],
    "track": "foundation"
  },
  {
    "id": "skl_dive_roll",
    "name": "Dive roll",
    "aliases": [],
    "track": "foundation"
  },
  {
    "id": "skl_360_dive_roll",
    "name": "360 dive roll",
    "aliases": [],
    "track": "foundation"
  },
  {
    "id": "skl_straddle_fwd_roll",
    "name": "Straddle forward roll",
    "aliases": [],
    "track": "foundation"
  },
  {
    "id": "skl_straddle_bwd_roll",
    "name": "Straddle backward roll",
    "aliases": [],
    "track": "foundation"
  },
  {
    "id": "skl_front_pike_roll",
    "name": "Front pike roll",
    "aliases": [],
    "track": "foundation"
  },
  {
    "id": "skl_back_pike_roll",
    "name": "Back pike roll",
    "aliases": [],
    "track": "foundation"
  }
]
