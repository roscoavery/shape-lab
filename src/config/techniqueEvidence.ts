/**
 * Technique evidence — reference videos from other high-level coaches and athletes.
 * Ryan's rule: "lead with the evidence." These videos sit next to the technique
 * in Learn so it's never just Coach Ryan's word against a disagreeing coach.
 * Add entries here; the SkillPathCards component renders them.
 *
 * Keys match guide ids in the unified skill registry (src/lib/skillRegistry.ts)
 * and cue swap ids.
 */

export interface ProofVideo {
  /** Who's in it — the authority the viewer recognizes. */
  who: string
  url: string
  /** What to watch for, in one line. */
  watchFor?: string
  /** Optional A/B loop points in seconds — only this segment plays. */
  startAt?: number
  endAt?: number
  /** IG handle of the original poster, without @. Shown as a creator tag on the card. */
  creator?: string
  /** Seed-level pin: pinned videos render above everything else in a bigger player. */
  pinned?: boolean
}

/**
 * One featured reference per skill card: rendered bigger at the top of the
 * card's video area (e.g. Ryan's spring layout analysis on the layout card).
 * Keys match TECHNIQUE_EVIDENCE keys. The featured video is excluded from
 * the strip below it so it doesn't appear twice.
 */
export const FEATURED_PROOF: Record<string, ProofVideo> = {
  'round-off': {
    who: 'Back Handspring Academy',
    url: 'https://youtu.be/EOyrf5QEoko?si=4-gVLIjPI0qPLm1i',
    watchFor: 'Coach-approved round off education for athletes, parents, and coaches, the video behind the quotes below.',
  },
  'ro-bhs': {
    who: 'Back Handspring Academy',
    url: 'https://youtu.be/EOyrf5QEoko?si=4-gVLIjPI0qPLm1i',
    watchFor: 'Coach-approved round off back handspring education for athletes, parents, and coaches, the video behind the quotes below.',
  },
  layout: {
    who: 'Coach Ryan Williams',
    url: 'https://www.instagram.com/reel/DMgAlHrvRWw/',
    watchFor: 'His layout analysis on spring floor.',
  },
  full: {
    who: 'Coach Ryan Williams',
    url: 'https://www.instagram.com/reel/DMgAlHrvRWw/',
    watchFor: 'His layout analysis on spring floor, match this layout and the full process goes smooth.',
  },
  'front-15': {
    who: 'Coach Ryan Williams',
    url: '/videos/rudi-tramp-ryan.mp4',
    watchFor: 'Front rudi (1.5 twist) on tramp.',
  },
}

/**
 * Evidence keys for guideless skills (no guideId, so no guide card).
 * The "guide coming" modal renders the ProofStrip for these keys, so the
 * video still shows in what Ryan calls the skill's card.
 */
export const GUIDELESS_EVIDENCE_KEY: Record<string, string> = {
  skl_arabian: 'arabian',
  skl_handstand_fwd_roll: 'handstand-fwd-roll',
  skl_front_aerial: 'front-aerial',
  skl_kick_full: 'kick-full',
  skl_double_full: 'double-full',
  skl_front_layout: 'front-layout',
  skl_back_25: 'back-25',
  skl_kick_2: 'kick-double',
  skl_back_extension_roll: 'back-extension-roll',
  skl_backward_roll: 'backward-roll',
  skl_standing_bhs_series: 'standing-bhs-series',
  skl_back_1_5: 'back-15',
  skl_back_quad: 'back-quad',
  skl_cartwheel_step_in: 'cartwheel-step-in',
  skl_front_full: 'front-full',
  skl_front_15: 'front-15',
  skl_whips: 'whips',
}

/**
 * Evidence key for any registry skill: guideId for guided skills, the
 * guideless override when present, else the skill id itself. Admin-added
 * videos for guideless skills persist under this key and render in the
 * skill's "guide coming" card.
 */
export function evidenceKeyForSkill(skill: { id: string; guideId?: string | null }): string {
  if (skill.guideId) return skill.guideId
  return GUIDELESS_EVIDENCE_KEY[skill.id] ?? skill.id
}

export const TECHNIQUE_EVIDENCE: Record<string, ProofVideo[]> = {
  'handstand-fwd-roll': [
    {
      who: 'Reference',
      url: '/videos/handstand-fwd-roll-panel-mat.mp4',
      watchFor: 'Handstand forward roll to a panel mat.',
    },
    {
      who: 'TumbleSmart athlete',
      url: '/videos/straight-arm-handstand-fwd-roll.mov',
      watchFor: 'Straight arm handstand forward roll.',
    },
    {
      who: 'TumbleSmart athlete',
      url: '/videos/stunt-style-handstand-fwd-roll.mp4',
      watchFor: 'Nice stunt style handstand forward roll. Bent arms.',
    },
  ],
  'skl_360_dive_roll': [],
  'front-aerial': [
    {
      who: 'Reference',
      url: '/videos/front-aerial-reference.mp4',
      watchFor: 'Front aerial on floor.',
    },
    {
      who: 'Drill',
      url: '/videos/front-aerial-drill.mp4',
      watchFor: 'Front aerial onto stacked mats.',
    },
    {
      who: 'Reference',
      url: '/videos/front-aerial-landing.mp4',
      watchFor: 'Front aerial on floor, holding the landing position.',
    },
  ],
  skl_front_25: [
    {
      who: 'Reference',
      url: '/videos/randi-front-25-reference.mp4',
      watchFor: 'Front 2.5 (Randi) on tumble track.',
    },
    {
      who: 'Reference',
      url: '/videos/randi-front-25-reference-angle2.mp4',
      watchFor: 'Front 2.5 (Randi) on tumble track, another angle.',
    },
  ],
  skl_fhs_front_tuck: [
    {
      who: 'Kyoko Negishi',
      url: 'https://www.instagram.com/p/DfCkMe2mopA/',
      creator: 'kyoko_negishi',
      watchFor: 'Watch for the tight arch before the connection.',
    },
  ],
  skl_front_handspring: [
    {
      who: 'Coach Jade',
      url: 'https://www.instagram.com/reel/DezLasTIqFy/',
      creator: 'coach__jade',
    },
  ],
  skl_side_aerial: [
    {
      who: 'Sadie (athlete)',
      url: '/videos/sadie-standing-side-aerial.mov',
      watchFor: 'Standing side aerial reference.',
    },
  ],
  'kick-full': [
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-kick-full-tumbletrak.mp4',
      watchFor: 'Kick full on tumble track.',
    },
    {
      who: 'Reference',
      url: '/videos/kick-full-spring.mp4',
      watchFor: 'Big kick full on spring.',
    },
    {
      who: 'RileyAnne',
      url: '/videos/rileyanne-kick-full.mp4',
      watchFor: 'Kick full on the tumble track.',
    },
    {
      who: 'Camp TumbleSmart 2024',
      url: '/videos/switch-kick-full-camp-2024.mp4',
      watchFor: 'Switch kick full.',
    },
    {
      who: 'Drill',
      url: '/videos/gainer-quarter-drill-twisting.mp4',
      watchFor: 'Gainer 1/4 drill for twisting.',
    },
  ],
  'double-full': [
    {
      who: 'Building block',
      url: '/videos/rudi-back-double-full.mp4',
      watchFor:
        'Rudi (front 1.5). Helps so much with air awareness on back double fulls, uses a pike set for a mix of cat and tilt twist.',
    },
    {
      who: 'Elliot Helms (@cirque_coach_elliot)',
      url: 'https://www.instagram.com/p/Dd4eoR9SYYf/',
      watchFor: 'Front half (barani) into a full full straight on double mini trampoline.',
    },
    {
      who: 'Owen Germsheid',
      url: 'https://www.instagram.com/p/Ddy9wabxnxj/',
      watchFor: 'Standing handspring double full.',
    },
  ],
  'skl_full_full': [
    {
      who: 'TumbleSmart athlete',
      url: '/videos/full-full-coach-elliott.mov',
      watchFor: 'S/o coach elliott for the coaching on this one.',
    },
  ],
  skl_standing_double: [
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/C-jBIzcRNLc/',
      watchFor: 'The feet apart for standing dub take off helps generate torque against floor for contact twist.',
    },
    {
      who: 'TumbleSmart athlete',
      url: '/videos/standing-dub-feet-apart-torque.mp4',
      watchFor: 'The feet apart for standing dub take off helps generate torque against floor for contact twist.',
    },
  ],
  'front-layout': [
    {
      who: 'Kyler',
      url: '/videos/kyler-front-layout.mp4',
      watchFor: 'Front layout onto stacked mats.',
    },
  ],
  'back-25': [
    {
      who: 'Darnell, Camp TumbleSmart',
      url: '/videos/darnell-back-25-triple-full.mp4',
      watchFor: 'Back 2.5 through to triple full.',
    },
    {
      who: 'Tracy California, Gymnastics Progressions',
      url: 'https://www.instagram.com/reel/DdmF9Abx9un/',
      watchFor: 'Back triple.',
    },
  ],
  skl_kick_15: [
    {
      who: 'Coach Ryan Williams',
      url: '/videos/kick-1-5-to-dub-ryan.mp4',
      watchFor: 'Kick 1.5 through to double back, Camp TumbleSmart 2024.',
    },
  ],
  'kick-double': [
    {
      who: 'Reference',
      url: '/videos/kick-double-tramp.mp4',
      watchFor: 'Kick double on tramp, front angle.',
    },
  ],
  'standing-full': [
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-standing-full.mp4',
      watchFor: 'Standing full, emphasis on standing all the way up on the take off.',
    },
    {
      who: 'TumbleSmart athlete',
      url: '/videos/standing-tuck-knee-high-surface.mp4',
      watchFor: 'Standing tuck up to a knee-high surface.',
    },
    {
      who: 'TumbleSmart athlete',
      url: '/videos/standing-full-arabian-triple.mp4',
      watchFor: 'Standing full through to arabian through to triple full.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-standing-full-ring-challenge.mp4',
      watchFor: 'Fun standing full stay in the ring challenge.',
    },
    {
      who: 'MJ Elite Gymnastics',
      url: 'https://www.instagram.com/reel/DexW0WQAVIY/',
      watchFor: 'Standing tuck up to a knee-high surface.',
    },
  ],
  'back-extension-roll': [
    {
      who: 'Drill',
      url: '/videos/back-roll-push-up-wedge.mp4',
      watchFor:
        'Back roll to push up (front support) down a wedge with straight arms. Start in a c shape with bent knees, hands turned in, arms behind the ears, elbows locked. Prerequisite for back extension roll, starts the athlete on landing in a front support from a backwards skill before handspring shaping drills from a handstand.',
    },
  ],
  'backward-roll': [
    {
      who: 'Drill',
      url: '/videos/backward-roll-tucked-candle.mp4',
      watchFor:
        'Tucked candle with pizza hands, roll back to hands to a tucked candle, press off hands to get back to feet like the end of a fwd roll. Do not go over on flat ground if you do not feel completely in control of this already.',
    },
  ],
  'standing-bhs-series': [
    {
      who: 'Charlie',
      url: '/videos/charlie-standing-bhs-series.mp4',
      watchFor: 'Standing 2 on tramp, noodle between the feet to focus on feet together.',
    },
    {
      who: 'Hangtime TNT Gymnastics',
      url: 'https://www.instagram.com/reel/Dehbg_fxb78/',
      watchFor: 'Back handspring zombie fall to hollow.',
    },
  ],
  'cart-full': [
    {
      who: 'RileyAnne',
      url: '/videos/rileyanne-cart-full.mp4',
      watchFor: 'Cart full through to full. She learned to tumble out of fulls from cartwheel fulls before running fulls.',
    },
  ],
  'back-15': [
    {
      who: 'Reference',
      url: '/videos/whip-15-spring.mp4',
      watchFor:
        'Whip 1.5 on spring, keeping the back 1.5 relatively long since you carry forward momentum out of it. Back 1.5 lands blind so you cannot pike down on an under-rotated flip, which is why so many athletes skip the 1.5 and go straight to doubles. Helps to have the air awareness from a front full. Any time you step out of a skill like this, it has to over-rotate, especially if you do not travel much.',
    },
  ],
  'back-quad': [
    {
      who: 'Tumbling Dee, Camp TumbleSmart',
      url: '/videos/dee-back-quad.mp4',
      watchFor: 'Back quad on tramp.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/C-jBIzcRNLc/',
      watchFor: 'The feet apart for standing dub take off helps generate torque against floor for contact twist.',
    },
  ],
  'angle-bhs': [
    {
      who: 'Coach B',
      url: 'https://www.instagram.com/reel/DfAnrv8N9ss/',
      watchFor: 'Bounce backhandspring, the shapes, angles, and timing of the round off back handspring connection.',
      creator: 'coachwithpatience',
    },
  ],
  // Skill path steps
  'back-tuck': [
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/DHL_hfEuRYi/',
      watchFor: 'His whole take on the back tuck, the prerequisite standard for layouts.',
    },
    {
      who: 'Drill',
      url: '/videos/ryan-round-off-rebound-mat.mp4',
      watchFor: 'Round off into a rebound onto a raised soft mat.',
    },
    {
      who: 'Averie',
      url: '/videos/averie-ro-hs-tuck-airfloor.mp4',
      watchFor: 'Round off handspring tuck on airfloor.',
    },
    {
      who: 'Drill',
      url: '/videos/back-tuck-wedge-drill-assisted.mp4',
      watchFor:
        'Back tuck wedge drill (1 of 2, assisted pause). The athlete sets up and pulls a tuck shape, then rolls back down a wedge to a mad cat position. On this one Ryan helps the athlete stop in the tuck shape before rolling back. You can gradually have the athlete create more and more rotation before hitting the mat: they go from landing on their butt then rolling in the early stages, to landing on their low back, then eventually setting and landing on their back and shoulders to ease proper head position into the flip.',
    },
    {
      who: 'Drill',
      url: '/videos/back-tuck-wedge-drill-solo.mp4',
      watchFor:
        'Back tuck wedge drill (2 of 2, solo, faster). Same drill, this time she does it faster by herself.',
    },
    {
      who: 'Drill',
      url: '/videos/ryan-blocking-angle-drill-eyes-on-wall-soft-surface.mp4',
      watchFor:
        'Eyes forward open shoulders on a soft mat, pause to evaluate the position of how they will hit the floor for a rebound into a blocking skill.',
    },
    {
      who: 'TumbleSmart athlete',
      url: '/videos/ro-bhs-tuck-tramp.mp4',
      watchFor: 'Round off back handspring tuck on tramp.',
    },
    {
      who: 'Oasis athlete',
      url: '/videos/ro-back-tuck-oasis.mp4',
      watchFor: 'Nice round off back tuck.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-ro-hs-tuck-spring-floor.mp4',
      watchFor: 'Nice spring floor round off handspring tuck reference from the sensei.',
    },
    {
      who: 'TumbleSmart athlete',
      url: '/videos/ro-hs-tuck-tramp-deconstructed.mp4',
      watchFor: 'Round off tuck on tramp, deconstructed spotting method: set, shape, flip.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/back-tuck-tramp-quick-process.mp4',
      watchFor: 'Fairly quick and easy trampoline back tuck process.',
    },
  ],
  'barani': [
    {
      who: 'Coach Ryan Williams',
      url: '/videos/barani-half-turn-front-full-progression.mp4',
      watchFor: 'Barani that lands and hits a half turn after landing, front full progression.',
    },
    {
      who: 'Elliot Helms (@cirque_coach_elliot)',
      url: 'https://www.instagram.com/p/Dd4eoR9SYYf/',
      watchFor:
        'This barani is like a big front layout with a half turn rather than a front pike. No cat twist, only tilt method.',
    },
  ],
  'front-full': [
    {
      who: 'Coach Ryan Williams',
      url: '/videos/barani-half-turn-front-full-progression.mp4',
      watchFor: 'Barani that lands and hits a half turn after landing, front full progression.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/front-full-finished.mp4',
      watchFor: 'The front full that comes after.',
    },
  ],
  'front-15': [
    {
      who: 'Coach Ryan Williams',
      url: '/videos/barani-half-turn-front-full-progression.mp4',
      watchFor: 'Barani that lands and hits a half turn after landing, front full progression.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/front-full-finished.mp4',
      watchFor: 'The front full that comes after.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/front-full-half-turn-rudi-progression.mp4',
      watchFor: 'Front full that lands and hits a half turn after landing, front rudi progression.',
    },
  ],
  'round-off': [
    {
      who: 'Elliot Helms (Cirque du Soleil)',
      url: 'https://www.instagram.com/reel/DdP7FbPRfrS/',
      watchFor: 'Cartwheel step-in, the round off prerequisite Ryan points every athlete to.',
    },
    {
      who: 'Elliot Helms (Cirque du Soleil)',
      url: 'https://www.instagram.com/reel/DdU7SFiv_E2/',
      watchFor: 'Round off progression.',
    },
    {
      who: 'Elliot Helms',
      url: 'https://www.instagram.com/reel/DX5usxfpoZ-/',
      watchFor: 'Round off sweep through to hollow, arms carry, eyes down.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-cartwheel-stepin-zombie.mp4',
      watchFor: 'Cartwheel step-in to zombie, how he teaches it.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-roundoff-eyes-forward-blocking-angle.mp4',
      watchFor: 'How he teaches the eyes-forward blocking angle with open shoulders out of a round off back handspring.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DV6NNgJEWkV/',
      watchFor: 'Round off reference, the finish shape Ryan teaches.',
    },
    {
      who: '@hangtimetnt',
      url: 'https://www.instagram.com/reel/DZncc7BxFWY/',
      watchFor: 'Passe fall round off to zombie, the hangtime reference. The landing shape, not lightning bolt.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DXUO3W0ji9x/',
      watchFor: 'Round off drills.',
    },
    {
      who: 'Coach Dan',
      url: 'https://www.instagram.com/reel/DH2ksuzIJ-3/',
      watchFor: 'Drills for round offs and handsprings.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/DIOjOH4TagD/',
      watchFor: 'Round off deconstruction, the pieces inside the skill.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DbTk2FQTXCw/',
      watchFor: 'Round off drills.',
    },
    {
      who: 'Roman',
      url: 'https://www.instagram.com/reel/DblQlGDxaOU/',
      watchFor: 'Cartwheel hand placement drill.',
    },
    {
      who: 'Drill',
      url: '/videos/cartwheel-step-in-zombie.mp4',
      watchFor: 'Cartwheel step in zombie, connections class at TumbleSmart.',
    },
    {
      who: 'Drill',
      url: '/videos/round-off-zombie.mp4',
      watchFor: 'Round off to zombie shape, connections class at TumbleSmart.',
    },
    {
      who: 'Coach B',
      url: 'https://www.instagram.com/reel/De96ijGB_Ju/',
      watchFor: 'Snap to hollow on the round off, the key to a good round off back handspring connection.',
      creator: 'coachwithpatience',
    },
  ],
  'ro-bhs': [
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-roundoff-eyes-forward-blocking-angle.mp4',
      watchFor: 'How he teaches the eyes-forward blocking angle with open shoulders out of a round off back handspring.',
    },
    {
      who: 'Drill',
      url: '/videos/ro-bhs-rebound-pike.mp4',
      watchFor: 'Round off rebound backwards to pike/hollow shape, hitting feet in front angle.',
    },
    {
      who: 'Drill',
      url: '/videos/ro-bhs-hollow-fall.mp4',
      watchFor: 'Round off closing arms down and falling to back in a hollow shape, carries momentum backwards out of the round off.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/DZNL4ZRGlyA/',
      watchFor: 'Round off rebound to flat back, essential for a good handspring.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/DXrVfNqk2B3/',
      watchFor: 'Grab block and throw it back, the connection drill.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/Dba2VNTmvaX/',
      watchFor: 'Round off handspring rebound to candle.',
    },
    {
      who: 'Elliot Helms',
      url: 'https://www.instagram.com/reel/DbM2xD2JTFG/',
      watchFor: 'Handspring rebound punch tuck, the rebound recycles momentum.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DUkhQbRiDVY/',
      watchFor: 'Connections and handspring shaping.',
    },
    {
      who: 'Drill',
      url: '/videos/ro-bhs-carpet-foam-transition.mp4',
      watchFor:
        'Adding carpet bonded foam over the mats can be a great way of gradually transitioning back handsprings from softer mat setups to harder surfaces.',
    },
    {
      who: 'Coach B',
      url: 'https://www.instagram.com/reel/DfAnrv8N9ss/',
      watchFor: 'Bounce backhandspring, the shapes, angles, and timing of the round off back handspring connection.',
      creator: 'coachwithpatience',
    },
  ],
  'ro-bhs-series': [
    {
      who: 'Hangtime TNT Gymnastics',
      url: 'https://www.instagram.com/reel/Dehbg_fxb78/',
      watchFor: 'Back handspring zombie fall to hollow.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-roundoff-eyes-forward-blocking-angle.mp4',
      watchFor: 'How he teaches the eyes-forward blocking angle with open shoulders out of a round off back handspring.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DbpyloMstn8/',
      watchFor: 'Round off series, what a strong series looks like.',
    },
    {
      who: 'lifegymnastics',
      url: 'https://www.instagram.com/reel/DS11zngAWb7/',
      watchFor: 'Handspring series on track.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DYEj-LloNIO/',
      watchFor: 'Round off to zombie, then the handspring connection.',
    },
    {
      who: 'Drill',
      url: '/videos/ryan-blocking-angle-drill-eyes-on-wall-soft-surface.mp4',
      watchFor:
        'After an athlete gets a series, we start looking forward and finishing with open shoulder angle. Eyes forward open shoulders on a soft mat, pause to evaluate the position of how they will hit the floor for a rebound into a blocking skill.',
    },
    {
      who: 'Drill',
      url: '/videos/ro-bhs-carpet-foam-transition.mp4',
      watchFor:
        'Adding carpet bonded foam over the mats can be a great way of gradually transitioning back handsprings from softer mat setups to harder surfaces.',
    },
  ],
  layout: [
    {
      who: 'Elliot Helms (Cirque du Soleil)',
      url: 'https://www.instagram.com/reel/Dcmu9aWpQ2A/',
      watchFor: 'Back layout reference, the hollow shape held in flight.',
    },
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/DKZ21GGu4l_/',
      watchFor: 'His layout reference on trampoline, the shape he points athletes to.',
    },
    {
      who: 'gymneotv',
      url: 'https://www.instagram.com/reel/DCpDQYuN4Ni/',
      watchFor: 'Back layout reference, the stretched hollow in flight.',
    },
    {
      who: 'Valeriy',
      url: 'https://www.instagram.com/reel/DaZrfVbojJb/',
      watchFor: 'Front layout reference, same hollow shape, forward takeoff.',
    },
    {
      who: 'coachwithpatience',
      url: 'https://www.instagram.com/reel/DcmFoBNxPTd/',
      watchFor: 'Round off handspring into layout, the connection that sets up the full.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/DaiLLlAGi42/',
      watchFor: 'Layout drill, building the shape before the skill.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/Dba2VNTmvaX/',
      watchFor: 'Rebound to candle, the layout drill that builds the shape.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/back-layout-blocking-drill.mp4',
      watchFor: 'A drill to teach blocking with feet behind and creating rotation from the block while the upper body lifts directly where she wants to set her center of mass to land.',
    },
    {
      who: 'Drill',
      url: '/videos/ryan-blocking-angle-drill-eyes-on-wall-soft-surface.mp4',
      watchFor:
        'Eyes forward open shoulders on a soft mat, pause to evaluate the position of how they will hit the floor for a rebound into a blocking skill.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/layout-safety-spot-hands.mp4',
      watchFor:
        "Safety spot reference using hands instead of arms. The left hand pushing low back forward while right hand pulls ribs backwards. We did a lot of pausing with toes at 10-11 o'clock before this could pass through smoothly.",
    },
    {
      who: 'Maggie (athlete)',
      url: '/videos/maggie-layout-tumble-track.mp4',
      watchFor: 'Awesome layout on tumble track.',
    },
    {
      who: 'Kyler (athlete)',
      url: '/videos/kyler-layout-tumble-track.mp4',
      watchFor: 'Nice layout on tumble track.',
    },
  ],
  full: [
    {
      who: 'Step 1, Lay to belly',
      url: '/videos/arm-drop-progression/step1-lay-to-belly.mp4',
      watchFor: 'The first step. Layout to belly, learn the shape before any twist.',
    },
    {
      who: 'Step 2, Half to back',
      url: '/videos/arm-drop-progression/step2-half-to-back.mp4',
      watchFor: 'Twist arm drops to shoulder level when upside down. Wait until about to land on the belly, then drop and squeeze. Twist arm drops, non-twist arm squeezes into the head.',
    },
    {
      who: 'Step 3, Full to belly',
      url: '/videos/arm-drop-progression/step3-full-to-belly-arm-drop.mp4',
      watchFor: 'Athlete drops one arm down and keeps the other squeezing into the ear. She opens the twist arm back up as she finishes to untilt herself.',
    },
    {
      who: 'Step 4, Sequential arm drop',
      url: '/videos/arm-drop-progression/step4-sequential-arm-drop.mp4',
      watchFor: 'Both arms drop in sequence. The second arm drop gives the second half turn, then both arms open back up to untilt.',
    },
    {
      who: 'Why it works, twisting physics',
      url: '/videos/arm-drop-progression/yeadon-twisting-simulation.mp4',
      watchFor: 'Computer simulation of the whole twisting process. The physics behind the arm drop.',
    },
    {
      who: 'Emory (athlete)',
      url: '/videos/arm-drop-progression/emory-full.mp4',
      watchFor: 'Finished full, the end of the progression.',
    },
    {
      who: 'Addy (athlete)',
      url: '/videos/arm-drop-progression/addy-full.mp4',
      watchFor: 'Finished full, the end of the progression.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/Cejgj-XvIGK/',
      watchFor: 'Layout plus arm drop, the same late-twist process.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DX-Djomu04L/',
      watchFor: 'Athletes waiting to twist before 1 o’clock, late twist in action.',
    },
    {
      who: 'David Morris (Olympic medallist)',
      url: 'https://youtu.be/v4ar1ZmLps',
      watchFor: 'How to do a GOOD backfull, the tutorial Ryan has taught from for years.',
    },
    {
      who: 'FIG Academy (Hardy Fink, Fred Yeadon)',
      url: 'https://youtu.be/_fNX-5XGKog',
      watchFor: 'Understanding twisting during saltos, the physics behind the arm drop.',
    },
    {
      who: 'Tumble Doc & Tumbling Dee',
      url: 'https://youtube.com/shorts/6Jf85Laetg0',
      watchFor: 'Twist timing deep dive from Camp Tumble Smart, proper technique feeling unnatural even for advanced athletes.',
    },
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/DMgAlHrvRWw/',
      watchFor: 'His layout analysis on spring floor, match this layout and the full process goes smooth.',
    },
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/coachryanwilliams/reel/DKZ21GGu4l_/',
      watchFor: 'The same layout analysis on trampoline track, match this layout and the full process goes smooth.',
    },
    {
      who: 'Ari (athlete)',
      url: '/videos/ari-full-spring-floor.mp4',
      watchFor: "Ari's full, the finished product of the arm-drop process.",
    },
    {
      who: 'Taylor (athlete)',
      url: 'https://www.instagram.com/reel/DJ4nzBlPZgo/',
      watchFor: "Taylor's full, the finished product of the arm-drop process.",
    },
    {
      who: 'Qynn (athlete)',
      url: 'https://www.instagram.com/reel/DKKowaRveYb/',
      watchFor: "Qynn's full, the finished product of the arm-drop process.",
    },
    {
      who: 'Preslee (athlete)',
      url: 'https://www.instagram.com/reel/C_TbJcaPALz/',
      watchFor: "Preslee's full twisting layout.",
    },
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/C9m_0vDOooA/',
      watchFor: 'Opposite-side spotting on Preslee, preserving the set through the twist.',
    },
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/C9aXPgMP7Lk/',
      watchFor: 'Opposite-side spotting on Rylie, preserving the set through the twist.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/standing-full-reference.mp4',
      watchFor: 'Standing full reference.',
    },
    {
      who: 'Drill',
      url: '/videos/gainer-quarter-drill-twisting.mp4',
      watchFor: 'Gainer 1/4 drill for twisting.',
    },
    {
      who: 'TumbleSmart athlete',
      url: '/videos/back-full-spring-floor.mp4',
      watchFor: 'Back full on spring floor.',
    },
    {
      who: 'Rylie (athlete)',
      url: '/videos/ro-hs-full-spring-floor.mp4',
      watchFor: 'Decent round off handspring full on spring floors preserves set with some asymmetry on take off.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-full-kick-full-style.mp4',
      watchFor: 'This kind of full can translate to kick fulls really easily.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-back-full-tumble-track.mp4',
      watchFor:
        'Back full reference from Ryan on the tumble track. There is a subtle quarter turn that happens on the way up with arms up. Both arms drop through the twist plane at the top to wrap into full twist.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-back-full-arm-drop.mp4',
      watchFor:
        'Same takeoff as a layout with enough contact twist to hit a quarter turn on the way up. At the quarter turn at the highest point, both arms drop through the twist plane and wrap in with straight arms. Not pure tilt twist mechanics. Head stays in, shaping stays the same as a layout.',
    },
  ],
  basics: [
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/DbBLac8GjS6/',
      watchFor: 'Hollow arch front support shape drill, basics that carry upward.',
    },
  ],
  'standing-bhs': [
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DYsu8CdB93m/',
      watchFor: 'Long handspring reference, the full stretch of the skill.',
    },
    {
      who: 'Elliot Helms',
      url: 'https://www.instagram.com/reel/DbM2xD2JTFG/',
      watchFor: 'Handspring rebound into punch tuck, the snap and lift.',
    },
    {
      who: 'Valeriy',
      url: 'https://www.instagram.com/reel/DYRkyrpoB-k/',
      watchFor: 'Handspring shaping, the positions inside the skill.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DM97Ag4KC-_/',
      watchFor: 'Handspring deconstruction, the pieces inside the skill.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-standing-bhs-zombie.mp4',
      watchFor: 'Standing back handspring finishing in a zombie shape.',
    },
    {
      who: 'Hangtime TNT Gymnastics',
      url: 'https://www.instagram.com/reel/Dehbg_fxb78/',
      watchFor: 'Back handspring zombie fall to hollow.',
    },
    {
      who: 'Coach B',
      url: 'https://www.instagram.com/reel/DfAnrv8N9ss/',
      watchFor: 'Bounce backhandspring, the shapes, angles, and timing of the round off back handspring connection.',
      creator: 'coachwithpatience',
    },
  ],
  'standing-tuck': [
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/DHL_hfEuRYi/',
      watchFor: 'His tuck reference, the shape every tuck starts from.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-standing-tuck.mp4',
      watchFor:
        'Fully open shoulder tight arch shape for the set to maximize height, requires more jump height and end range abdominal strength to still tuck quickly. Some coaches teach a slightly closed shoulder angle, staying more hollow while the hips set, to maximize speed into the tuck.',
    },
    {
      who: 'Elliot Helms',
      url: 'https://www.instagram.com/reel/DbM2xD2JTFG/',
      watchFor: 'Rebound punch tuck, the tuck pulled out of a handspring snap.',
    },
    {
      who: 'TumbleSmart athlete',
      url: '/videos/standing-tuck-knee-high-surface.mp4',
      watchFor: 'Standing tuck up to a knee-high surface.',
    },
    {
      who: 'MJ Elite Gymnastics',
      url: 'https://www.instagram.com/reel/DexW0WQAVIY/',
      watchFor: 'Standing tuck up to a knee-high surface.',
    },
  ],
  'back-half': [
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DcZBL5zkryD/',
      watchFor: 'Layout step half turn, the half-twist shape inside a back half.',
    },
  ],
  'double-back': [
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DJHqG7xIrpQ/',
      watchFor: 'Round off handspring prep for double flips, the setup work.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/double-back-ryan.mp4',
      watchFor: 'Double back reference from Ryan.',
    },
  ],
  'triple-full': [
    {
      who: 'Porter, Camp TumbleSmart',
      url: '/videos/porter-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Porter, Camp TumbleSmart',
      url: '/videos/porter-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: freeze frames on both rebounds, slow motion through the arabian and the triple.',
    },
    {
      who: 'Ayden Gerlach, Camp TumbleSmart',
      url: '/videos/ayden-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Ayden Gerlach, Camp TumbleSmart',
      url: '/videos/ayden-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: later twist, squared to the wall out of the round off before the twist starts. Freeze frames on both rebounds, slow motion through the arabian and the triple.',
    },
    {
      who: 'Asa Ware, Camp TumbleSmart',
      url: '/videos/asa-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Asa Ware, Camp TumbleSmart',
      url: '/videos/asa-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: twists right but round offs left, same pass, different way of doing it. Slow motion through the arabian and the triple.',
    },
    {
      who: 'Darnell, Camp TumbleSmart',
      url: '/videos/darnell-back-25-triple-full.mp4',
      watchFor: 'Back 2.5 through to triple full.',
    },
    {
      who: 'TumbleSmart athlete',
      url: '/videos/standing-full-arabian-triple.mp4',
      watchFor: 'Standing full through to arabian through to triple full.',
    },
  ],
  'arabian': [
    {
      who: 'Reference',
      url: '/videos/arabian-reference.mp4',
      watchFor: 'Taught more as a back half tucked using opposite side spot.',
    },
    {
      who: 'Porter, Camp TumbleSmart',
      url: '/videos/porter-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Porter, Camp TumbleSmart',
      url: '/videos/porter-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: freeze frames on both rebounds, slow motion through the arabian and the triple.',
    },
    {
      who: 'Ayden Gerlach, Camp TumbleSmart',
      url: '/videos/ayden-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Ayden Gerlach, Camp TumbleSmart',
      url: '/videos/ayden-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: later twist, squared to the wall out of the round off before the twist starts. Freeze frames on both rebounds, slow motion through the arabian and the triple.',
    },
    {
      who: 'Asa Ware, Camp TumbleSmart',
      url: '/videos/asa-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Asa Ware, Camp TumbleSmart',
      url: '/videos/asa-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: twists right but round offs left, same pass, different way of doing it. Slow motion through the arabian and the triple.',
    },
    {
      who: 'TumbleSmart athlete',
      url: '/videos/standing-full-arabian-triple.mp4',
      watchFor: 'Standing full through to arabian through to triple full.',
    },
  ],
  'front-walkover': [
    {
      who: 'Coach Ryan Williams',
      url: '/videos/front-walkover-reference.mp4',
      watchFor: 'Front walkover reference.',
    },
  ],
  'back-walkover': [
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DalCqRAo8ig/',
      watchFor: 'Back walkover to handstand step-out, the line through the skill.',
    },
  ],
  'cartwheel-step-in': [
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-cartwheel-stepin-zombie.mp4',
      watchFor: 'Cartwheel step-in to zombie, how he teaches it.',
    },
    {
      who: 'Elliot Helms (Cirque du Soleil)',
      url: 'https://www.instagram.com/reel/DdP7FbPRfrS/',
      watchFor: 'Cartwheel step-in, the round off prerequisite Ryan points every athlete to.',
    },
  ],
  'cartwheel-handspring': [
    {
      who: 'Roman',
      url: 'https://www.instagram.com/reel/DblQlGDxaOU/',
      watchFor: 'Cartwheel hand placement drill, where the hands go.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DJ_7qLMRLrq/',
      watchFor: 'Cartwheel step-in through pike to arch, the shape path.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DYSxclHPl1r/',
      watchFor: 'Cartwheel drill, the lateral line.',
    },
  ],
  // Cue swaps
  'eyes-up': [
    {
      who: 'Elliot Helms',
      url: 'https://www.instagram.com/reel/DYF6T0NSSES/',
      watchFor: 'Handspring close-arms rebound to hollow, arms down in front, eyes down.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/DZNL4ZRGlyA/',
      watchFor: 'Arms-down connection drill with band.',
    },
  ],
  'big-rebound': [
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DZncc7BxFWY/',
      watchFor: 'Passe round off to tight zombie, small rebound, right shapes.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DIR0sozuPgV/',
      watchFor: 'Tramp handspring to zombie.',
    },
  ],
  // Acro map reference videos (Ryan's acro collection)
  'acro_butterfly_kick': [
    {
      who: 'Ryan Owen',
      url: 'https://www.instagram.com/reel/DYkdE01Aysv/',
      watchFor: 'Butterfly kick with full twist breakdown.',
      creator: 'ryannn_oxd',
    },
  ],
  'acro_front_aerial': [
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/DYryPMOGi0P/?img_index=2',
      watchFor: 'Front aerial reference.',
      creator: 'kyoko_negishi',
    },
    {
      who: 'Aurora Kulp',
      url: 'https://www.instagram.com/reel/DccUEDcMK_Q/',
      watchFor: 'Front aerial drills for landing leg strength and technique.',
      creator: 'acrobaticswithaurora',
    },
  ],
  'acro_peter_pan': [
    {
      who: 'Acro with Maddi',
      url: 'https://www.instagram.com/reel/DYtI57Ghqip/',
      watchFor: 'Peter Pan tutorial with prerequisites and progressions.',
      creator: 'acrowithmaddi',
    },
  ],
  'acro_f540': [
    {
      who: 'ZERA',
      url: 'https://www.instagram.com/reel/DYucVdngZbk/',
      watchFor: '540 kick demonstration.',
      creator: 'depth.of.expression',
    },
    {
      who: 'Storm',
      url: 'https://www.instagram.com/reel/DdFcbVRAIaL/',
      watchFor: 'Reverse 540 kick demonstration, clean landings.',
      creator: 'stormlanzoni',
    },
    {
      who: 'Acrobatic Arts',
      url: 'https://www.instagram.com/reel/DHvuaZuJeHL/',
      watchFor: 'Viral 540 jump, step-by-step breakdown.',
      creator: 'acrobaticarts',
    },
    {
      who: 'CTRL Acrobatics',
      url: 'https://www.instagram.com/reel/DEiifN8Bmo6/',
      watchFor: '540 trick reel with Sydney So.',
      creator: 'ctrlacrobatics',
    },
    {
      who: 'AJ',
      url: 'https://www.instagram.com/reel/DDQsdsSMDBS/',
      watchFor: 'Small 540 jump tutorial, six numbered steps.',
      creator: 'the.ashley.jade',
    },
    {
      who: 'joey vice',
      url: 'https://www.instagram.com/reel/ClrJsY9puGW/',
      watchFor: '540 jump in acro dance routine.',
      creator: 'joeythedancer',
      pinned: true,
    },
    {
      who: 'Coach Adam',
      url: 'https://www.instagram.com/p/DRpRLWKDuf5/?img_index=4',
      watchFor: '540 trick tutorial, step-by-step carousel.',
      creator: 'adamcdevenport',
      pinned: true,
    },
  ],
  'acro_twisted_aerial': [
    {
      who: 'CTRL Acrobatics',
      url: 'https://www.instagram.com/reel/Da_eUvkzF03/',
      watchFor: 'Twisted aerial in fast and slow motion.',
      creator: 'ctrlacrobatics',
    },
  ],
  'acro_elbow_stand': [
    {
      who: 'Rosie',
      url: 'https://www.instagram.com/reel/DcM-X3dgPU4/',
      watchFor: 'Wall-assisted forearm stand progression.',
      creator: 'rosiemovess',
    },
  ],
  'acro_tucked_headstand': [
    {
      who: 'Miss Nancy Stretch',
      url: 'https://www.instagram.com/reel/CpLVlqgAXeJ/',
      watchFor: 'Headstand and acro flexibility reference.',
      creator: 'missnancystretch',
    },
  ],
  'acro_back_reverse_tinsica': [
    {
      who: 'Centre Pointe Performing Arts',
      url: 'https://www.instagram.com/reel/DeVe3AMMsLi/',
      watchFor: 'Back walkover and tinsica training.',
      creator: 'centrepointeperformingarts',
    },
    {
      who: 'Laura Gamell',
      url: 'https://www.instagram.com/reel/DdjuO_doNPt/',
      watchFor: 'Back walkover variation tutorial, step by step.',
      creator: 'lauragamell',
    },
  ],
  'acro_raiz': [
    {
      who: 'Derek Piquette',
      url: 'https://www.instagram.com/reel/CY1x89bFfXC/',
      watchFor: 'Raiz progressions with Acrobatic Arts.',
      creator: 'derekpiquette',
    },
  ],
  'acro_wall_handstand': [
    {
      who: 'Aurora Kulp',
      url: 'https://www.instagram.com/reel/DUlS1JjDG0P/',
      watchFor: 'Hand-balancing tutorial, kicking up to wall.',
      creator: 'acrobaticswithaurora',
    },
  ],
  'acro_spider_cartwheel': [
    {
      who: 'Miss Jayde',
      url: 'https://www.instagram.com/reel/DJJrhPbArHq/',
      watchFor: 'Inside-out hand-dot drill for hand rotation and landing precision.',
      creator: 'missjaydeacro',
    },
    {
      who: 'Miss Jayde',
      url: 'https://www.instagram.com/reel/DeEhrJwx5T8/',
      watchFor: 'Rolling tinsica drills on stacked mats and against a wall.',
      creator: 'missjaydeacro',
    },
  ],
  'acro_illusion': [
    {
      who: 'Acrobatic Arts',
      url: 'https://www.instagram.com/p/B1l50APh3og/',
      watchFor: 'Illusion flowing into back walkover, technique tips.',
      creator: 'acrobaticarts',
    },
  ],
  'acro_back_walkover': [
    {
      who: 'Acrobatic Arts',
      url: 'https://www.instagram.com/p/B1l50APh3og/',
      watchFor: 'Illusion flowing into back walkover, technique tips.',
      creator: 'acrobaticarts',
    },
  ],
  'acro_kip_up': [
    {
      who: 'Zita Demarest',
      url: 'https://www.instagram.com/reel/DeKEFx7sMnr/',
      watchFor: 'Kick up variations, rolls and handstand transitions.',
      creator: 'zitademarest',
    },
  ],
  'acro_helicopter_cartwheel': [
    {
      who: 'Acrobatic Arts',
      url: 'https://www.instagram.com/reel/CjsckEOAKou/',
      watchFor: 'Cartwheel with helicopter motion, transitions.',
      creator: 'acrobaticarts',
    },
    {
      who: 'Acrobatic Arts',
      url: 'https://www.instagram.com/reel/Cu9ngq7vKws/',
      watchFor: 'Heli spotting edition, with inside-out bridge and one-handed cartwheel.',
      creator: 'acrobaticarts',
    },
    {
      who: 'Miss Mayra',
      url: 'https://www.instagram.com/reel/CW1YG7SBr_X/',
      watchFor: 'Leg swing drill for helicopter cartwheel, keeping the swing leg low.',
      creator: 'gatonegro_acro',
    },
  ],
  'acro_side_aerial': [
    {
      who: 'Seed Dance Studios',
      url: 'https://www.instagram.com/reel/DTsqA1HjGtv/',
      watchFor: 'Aerial cartwheel drills: kneeling back kicks, explosive back kicks, compact cartwheel.',
      creator: 'seed_dance_studios',
    },
  ],
  'acro_headspring': [
    {
      who: 'Mac Gymnastics Club Midoribashi',
      url: 'https://www.instagram.com/reel/DUvHCtiD0Y-/',
      watchFor: 'Headspring practice clip.',
      creator: 'macmidoribashi',
    },
    {
      who: 'Aurora Kulp',
      url: 'https://www.instagram.com/reel/DTasfhiDHJ6/',
      watchFor: 'Headspring tutorial: headstand, knees on elbows, push into hands.',
      creator: 'acrobaticswithaurora',
    },
    {
      who: 'Kids P.E. Gymnastics',
      url: 'https://www.instagram.com/reel/DUGFLx-k1mD/',
      watchFor: 'Headspring tutorial, hip positioning through bridge to jump.',
      creator: 'kids_p.e',
    },
    {
      who: 'Daniel Sundell',
      url: 'https://www.instagram.com/reel/DZJlhmytZ6Q/',
      watchFor: 'Headspring as precursor to front handspring, explosivity drills.',
      creator: 'coach_dan_gymnastics',
    },
    {
      who: 'Pat Redfern',
      url: 'https://www.instagram.com/reel/CoWweTtBNrQ/',
      watchFor: 'Headspring progression, hair line placement for neck safety.',
      creator: 'coachredders',
    },
    {
      who: 'Savchuk Ivan',
      url: 'https://www.instagram.com/reel/DDFK1DyNLyn/',
      watchFor: 'Front headspring drills, steps 1 to 5.',
      creator: 'ivan.savchuk',
    },
    {
      who: 'Yuto Iyogi',
      url: 'https://www.instagram.com/p/Cow1mElBixm/',
      watchFor: 'Headspring training carousel.',
      creator: 'iyogi_gym_life',
    },
    {
      who: 'Daniel Sundell',
      url: 'https://www.instagram.com/reel/CqE4KgzIXKA/',
      watchFor: 'Headspring builds explosivity, teaches heel drive for front handspring.',
      creator: 'coach_dan_gymnastics',
    },
    {
      who: 'Miss Caro',
      url: 'https://www.instagram.com/reel/ClW32jOO9a-/',
      watchFor: 'Handstand to squat, point of power sequence.',
      creator: 'misscarodealva',
    },
  ],
  'whips': [
    {
      who: 'Elliot Helms',
      url: 'https://www.instagram.com/reel/DehsJBiPEwX/',
      watchFor: 'Kaden Brown whip series. Notice how much he gets his feet in front on each punch.',
      creator: 'cirque_coach_elliot',
    },
  ],
}
