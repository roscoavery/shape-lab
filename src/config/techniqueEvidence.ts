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
  watchFor: string
  /** Optional A/B loop points in seconds — only this segment plays. */
  startAt?: number
  endAt?: number
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
    watchFor: 'Coach-approved round off education for athletes, parents, and coaches — the video behind the quotes below.',
  },
  'ro-bhs': {
    who: 'Back Handspring Academy',
    url: 'https://youtu.be/EOyrf5QEoko?si=4-gVLIjPI0qPLm1i',
    watchFor: 'Coach-approved round off back handspring education for athletes, parents, and coaches — the video behind the quotes below.',
  },
  layout: {
    who: 'Coach Ryan Williams',
    url: 'https://www.instagram.com/reel/DMgAlHrvRWw/',
    watchFor: 'His layout analysis on spring floor.',
  },
  full: {
    who: 'Coach Ryan Williams',
    url: 'https://www.instagram.com/reel/DMgAlHrvRWw/',
    watchFor: 'His layout analysis on spring floor — match this layout and the full process goes smooth.',
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
}

export const TECHNIQUE_EVIDENCE: Record<string, ProofVideo[]> = {
  'handstand-fwd-roll': [
    {
      who: 'Reference',
      url: '/videos/handstand-fwd-roll-panel-mat.mp4',
      watchFor: 'Handstand forward roll to a panel mat.',
    },
  ],
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
  ],
  'double-full': [
    {
      who: 'Building block',
      url: '/videos/rudi-back-double-full.mp4',
      watchFor:
        'Rudi (front 1.5). Helps so much with air awareness on back double fulls — uses a pike set for a mix of cat and tilt twist.',
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
      who: 'Darnell — Camp TumbleSmart',
      url: '/videos/darnell-back-25-triple-full.mp4',
      watchFor: 'Back 2.5 through to triple full.',
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
      watchFor: 'Standing full — emphasis on standing all the way up on the take off.',
    },
  ],
  'back-extension-roll': [
    {
      who: 'Drill',
      url: '/videos/back-roll-push-up-wedge.mp4',
      watchFor:
        'Back roll to push up (front support) down a wedge with straight arms. Start in a c shape with bent knees, hands turned in, arms behind the ears, elbows locked. Prerequisite for back extension roll — starts the athlete on landing in a front support from a backwards skill before handspring shaping drills from a handstand.',
    },
  ],
  'backward-roll': [
    {
      who: 'Drill',
      url: '/videos/backward-roll-tucked-candle.mp4',
      watchFor:
        'Tucked candle with pizza hands — roll back to hands to a tucked candle, press off hands to get back to feet like the end of a fwd roll. Do not go over on flat ground if you do not feel completely in control of this already.',
    },
  ],
  'standing-bhs-series': [
    {
      who: 'Charlie',
      url: '/videos/charlie-standing-bhs-series.mp4',
      watchFor: 'Standing 2 on tramp — noodle between the feet to focus on feet together.',
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
        'Whip 1.5 on spring — keeping the back 1.5 relatively long since you carry forward momentum out of it. Back 1.5 lands blind so you cannot pike down on an under-rotated flip, which is why so many athletes skip the 1.5 and go straight to doubles. Helps to have the air awareness from a front full. Any time you step out of a skill like this, it has to over-rotate, especially if you do not travel much.',
    },
  ],
  'back-quad': [
    {
      who: 'Tumbling Dee — Camp TumbleSmart',
      url: '/videos/dee-back-quad.mp4',
      watchFor: 'Back quad on tramp.',
    },
  ],
  'angle-bhs': [],
  // Skill path steps
  'back-tuck': [
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/DHL_hfEuRYi/',
      watchFor: 'His whole take on the back tuck — the prerequisite standard for layouts.',
    },
    {
      who: 'Drill',
      url: '/videos/ryan-round-off-rebound-mat.mp4',
      watchFor: 'Round off into a rebound onto a raised soft mat.',
    },
  ],
  'round-off': [
    {
      who: 'Elliot Helms (Cirque du Soleil)',
      url: 'https://www.instagram.com/reel/DdP7FbPRfrS/',
      watchFor: 'Cartwheel step-in — the round off prerequisite Ryan points every athlete to.',
    },
    {
      who: 'Elliot Helms (Cirque du Soleil)',
      url: 'https://www.instagram.com/reel/DdU7SFiv_E2/',
      watchFor: 'Round off progression.',
    },
    {
      who: 'Elliot Helms',
      url: 'https://www.instagram.com/reel/DX5usxfpoZ-/',
      watchFor: 'Round off sweep through to hollow — arms carry, eyes down.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-roundoff-eyes-forward-blocking-angle.mp4',
      watchFor: 'How he teaches the eyes-forward blocking angle with open shoulders after a round off.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DV6NNgJEWkV/',
      watchFor: 'Round off reference — the finish shape Ryan teaches.',
    },
    {
      who: '@hangtimetnt',
      url: 'https://www.instagram.com/reel/DZncc7BxFWY/',
      watchFor: 'Passe fall round off to zombie — the hangtime reference. The landing shape, not lightning bolt.',
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
      watchFor: 'Round off deconstruction — the pieces inside the skill.',
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
      watchFor: 'Cartwheel step in zombie — connections class at TumbleSmart.',
    },
    {
      who: 'Drill',
      url: '/videos/round-off-zombie.mp4',
      watchFor: 'Round off to zombie shape — connections class at TumbleSmart.',
    },
  ],
  'ro-bhs': [
    {
      who: 'Drill',
      url: '/videos/ro-bhs-rebound-pike.mp4',
      watchFor: 'Round off rebound backwards to pike/hollow shape — hitting feet in front angle.',
    },
    {
      who: 'Drill',
      url: '/videos/ro-bhs-hollow-fall.mp4',
      watchFor: 'Round off closing arms down and falling to back in a hollow shape — carries momentum backwards out of the round off.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/DZNL4ZRGlyA/',
      watchFor: 'Round off rebound to flat back — essential for a good handspring.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/DXrVfNqk2B3/',
      watchFor: 'Grab block and throw it back — the connection drill.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/Dba2VNTmvaX/',
      watchFor: 'Round off handspring rebound to candle.',
    },
    {
      who: 'Elliot Helms',
      url: 'https://www.instagram.com/reel/DbM2xD2JTFG/',
      watchFor: 'Handspring rebound punch tuck — the rebound recycles momentum.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DUkhQbRiDVY/',
      watchFor: 'Connections and handspring shaping.',
    },
  ],
  'ro-bhs-series': [
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DbpyloMstn8/',
      watchFor: 'Round off series — what a strong series looks like.',
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
  ],
  layout: [
    {
      who: 'Elliot Helms (Cirque du Soleil)',
      url: 'https://www.instagram.com/reel/Dcmu9aWpQ2A/',
      watchFor: 'Back layout reference — the hollow shape held in flight.',
    },
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/DKZ21GGu4l_/',
      watchFor: 'His layout reference on trampoline — the shape he points athletes to.',
    },
    {
      who: 'gymneotv',
      url: 'https://www.instagram.com/reel/DCpDQYuN4Ni/',
      watchFor: 'Back layout reference — the stretched hollow in flight.',
    },
    {
      who: 'Valeriy',
      url: 'https://www.instagram.com/reel/DaZrfVbojJb/',
      watchFor: 'Front layout reference — same hollow shape, forward takeoff.',
    },
    {
      who: 'coachwithpatience',
      url: 'https://www.instagram.com/reel/DcmFoBNxPTd/',
      watchFor: 'Round off handspring into layout — the connection that sets up the full.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/DaiLLlAGi42/',
      watchFor: 'Layout drill — building the shape before the skill.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/Dba2VNTmvaX/',
      watchFor: 'Rebound to candle — the layout drill that builds the shape.',
    },
  ],
  full: [
    {
      who: 'Step 1 — Lay to belly',
      url: '/videos/arm-drop-progression/step1-lay-to-belly.mp4',
      watchFor: 'The first step. Layout to belly — learn the shape before any twist.',
    },
    {
      who: 'Step 2 — Half to back',
      url: '/videos/arm-drop-progression/step2-half-to-back.mp4',
      watchFor: 'Twist arm drops to shoulder level when upside down. Wait until about to land on the belly, then drop and squeeze. Twist arm drops, non-twist arm squeezes into the head.',
    },
    {
      who: 'Step 3 — Full to belly',
      url: '/videos/arm-drop-progression/step3-full-to-belly-arm-drop.mp4',
      watchFor: 'Athlete drops one arm down and keeps the other squeezing into the ear. She opens the twist arm back up as she finishes to untilt herself.',
    },
    {
      who: 'Step 4 — Sequential arm drop',
      url: '/videos/arm-drop-progression/step4-sequential-arm-drop.mp4',
      watchFor: 'Both arms drop in sequence. The second arm drop gives the second half turn, then both arms open back up to untilt.',
    },
    {
      who: 'Why it works — twisting physics',
      url: '/videos/arm-drop-progression/yeadon-twisting-simulation.mp4',
      watchFor: 'Computer simulation of the whole twisting process. The physics behind the arm drop.',
    },
    {
      who: 'Emory (athlete)',
      url: '/videos/arm-drop-progression/emory-full.mp4',
      watchFor: 'Finished full — the end of the progression.',
    },
    {
      who: 'Addy (athlete)',
      url: '/videos/arm-drop-progression/addy-full.mp4',
      watchFor: 'Finished full — the end of the progression.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/Cejgj-XvIGK/',
      watchFor: 'Layout plus arm drop — the same late-twist process.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DX-Djomu04L/',
      watchFor: 'Athletes waiting to twist before 1 o’clock — late twist in action.',
    },
    {
      who: 'David Morris (Olympic medallist)',
      url: 'https://youtu.be/v4ar1ZmLps',
      watchFor: 'How to do a GOOD backfull — the tutorial Ryan has taught from for years.',
    },
    {
      who: 'FIG Academy (Hardy Fink, Fred Yeadon)',
      url: 'https://youtu.be/_fNX-5XGKog',
      watchFor: 'Understanding twisting during saltos — the physics behind the arm drop.',
    },
    {
      who: 'Tumble Doc & Tumbling Dee',
      url: 'https://youtube.com/shorts/6Jf85Laetg0',
      watchFor: 'Twist timing deep dive from Camp Tumble Smart — proper technique feeling unnatural even for advanced athletes.',
    },
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/DMgAlHrvRWw/',
      watchFor: 'His layout analysis on spring floor — match this layout and the full process goes smooth.',
    },
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/coachryanwilliams/reel/DKZ21GGu4l_/',
      watchFor: 'The same layout analysis on trampoline track — match this layout and the full process goes smooth.',
    },
    {
      who: 'Ari (athlete)',
      url: 'https://www.instagram.com/reel/DKcgyPLO9Hz/',
      watchFor: "Ari's full — the finished product of the arm-drop process.",
    },
    {
      who: 'Taylor (athlete)',
      url: 'https://www.instagram.com/reel/DJ4nzBlPZgo/',
      watchFor: "Taylor's full — the finished product of the arm-drop process.",
    },
    {
      who: 'Qynn (athlete)',
      url: 'https://www.instagram.com/reel/DKKowaRveYb/',
      watchFor: "Qynn's full — the finished product of the arm-drop process.",
    },
    {
      who: 'Preslee (athlete)',
      url: 'https://www.instagram.com/reel/C_TbJcaPALz/',
      watchFor: "Preslee's full twisting layout.",
    },
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/C9m_0vDOooA/',
      watchFor: 'Opposite-side spotting on Preslee — preserving the set through the twist.',
    },
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/C9aXPgMP7Lk/',
      watchFor: 'Opposite-side spotting on Rylie — preserving the set through the twist.',
    },
  ],
  basics: [
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/DbBLac8GjS6/',
      watchFor: 'Hollow arch front support shape drill — basics that carry upward.',
    },
  ],
  'standing-bhs': [
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DYsu8CdB93m/',
      watchFor: 'Long handspring reference — the full stretch of the skill.',
    },
    {
      who: 'Elliot Helms',
      url: 'https://www.instagram.com/reel/DbM2xD2JTFG/',
      watchFor: 'Handspring rebound into punch tuck — the snap and lift.',
    },
    {
      who: 'Valeriy',
      url: 'https://www.instagram.com/reel/DYRkyrpoB-k/',
      watchFor: 'Handspring shaping — the positions inside the skill.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DM97Ag4KC-_/',
      watchFor: 'Handspring deconstruction — the pieces inside the skill.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-standing-bhs-zombie.mp4',
      watchFor: 'Standing back handspring finishing in a zombie shape.',
    },
  ],
  'standing-tuck': [
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/DHL_hfEuRYi/',
      watchFor: 'His tuck reference — the shape every tuck starts from.',
    },
    {
      who: 'Coach Ryan Williams',
      url: '/videos/ryan-standing-tuck.mp4',
      watchFor:
        'Fully open shoulder tight arch shape for the set to maximize height — requires more jump height and end range abdominal strength to still tuck quickly. Some coaches teach a slightly closed shoulder angle, staying more hollow while the hips set, to maximize speed into the tuck.',
    },
    {
      who: 'Elliot Helms',
      url: 'https://www.instagram.com/reel/DbM2xD2JTFG/',
      watchFor: 'Rebound punch tuck — the tuck pulled out of a handspring snap.',
    },
  ],
  'back-half': [
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DcZBL5zkryD/',
      watchFor: 'Layout step half turn — the half-twist shape inside a back half.',
    },
  ],
  'double-back': [
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DJHqG7xIrpQ/',
      watchFor: 'Round off handspring prep for double flips — the setup work.',
    },
  ],
  'triple-full': [
    {
      who: 'Porter — Camp TumbleSmart',
      url: '/videos/porter-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Porter — Camp TumbleSmart',
      url: '/videos/porter-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: freeze frames on both rebounds, slow motion through the arabian and the triple.',
    },
    {
      who: 'Ayden Gerlach — Camp TumbleSmart',
      url: '/videos/ayden-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Ayden Gerlach — Camp TumbleSmart',
      url: '/videos/ayden-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: later twist — squared to the wall out of the round off before the twist starts. Freeze frames on both rebounds, slow motion through the arabian and the triple.',
    },
    {
      who: 'Asa Ware — Camp TumbleSmart',
      url: '/videos/asa-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Asa Ware — Camp TumbleSmart',
      url: '/videos/asa-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: twists right but round offs left — same pass, different way of doing it. Freeze frames on both rebounds, slow motion through the arabian and the triple.',
    },
    {
      who: 'Darnell — Camp TumbleSmart',
      url: '/videos/darnell-back-25-triple-full.mp4',
      watchFor: 'Back 2.5 through to triple full.',
    },
  ],
  'arabian': [
    {
      who: 'Reference',
      url: '/videos/arabian-reference.mp4',
      watchFor: 'Taught more as a back half tucked using opposite side spot.',
    },
    {
      who: 'Porter — Camp TumbleSmart',
      url: '/videos/porter-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Porter — Camp TumbleSmart',
      url: '/videos/porter-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: freeze frames on both rebounds, slow motion through the arabian and the triple.',
    },
    {
      who: 'Ayden Gerlach — Camp TumbleSmart',
      url: '/videos/ayden-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Ayden Gerlach — Camp TumbleSmart',
      url: '/videos/ayden-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: later twist — squared to the wall out of the round off before the twist starts. Freeze frames on both rebounds, slow motion through the arabian and the triple.',
    },
    {
      who: 'Asa Ware — Camp TumbleSmart',
      url: '/videos/asa-arabian-triple.mp4',
      watchFor: 'Arabian through to triple.',
    },
    {
      who: 'Asa Ware — Camp TumbleSmart',
      url: '/videos/asa-arabian-triple-analysis.mp4',
      watchFor: 'Analysis: twists right but round offs left — same pass, different way of doing it. Freeze frames on both rebounds, slow motion through the arabian and the triple.',
    },
  ],
  'back-walkover': [
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DalCqRAo8ig/',
      watchFor: 'Back walkover to handstand step-out — the line through the skill.',
    },
  ],
  'cartwheel-handspring': [
    {
      who: 'Roman',
      url: 'https://www.instagram.com/reel/DblQlGDxaOU/',
      watchFor: 'Cartwheel hand placement drill — where the hands go.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DJ_7qLMRLrq/',
      watchFor: 'Cartwheel step-in through pike to arch — the shape path.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DYSxclHPl1r/',
      watchFor: 'Cartwheel drill — the lateral line.',
    },
  ],
  // Cue swaps
  'eyes-up': [
    {
      who: 'Elliot Helms',
      url: 'https://www.instagram.com/reel/DYF6T0NSSES/',
      watchFor: 'Handspring close-arms rebound to hollow — arms down in front, eyes down.',
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
      watchFor: 'Passe round off to tight zombie — small rebound, right shapes.',
    },
    {
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DIR0sozuPgV/',
      watchFor: 'Tramp handspring to zombie.',
    },
  ],
}
