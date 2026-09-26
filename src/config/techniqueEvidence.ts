/**
 * Technique evidence — video proof from other high-level coaches and athletes.
 * Ryan's rule: "lead with the evidence." These videos sit next to the technique
 * in Learn so it's never just Coach Ryan's word against a disagreeing coach.
 * Add entries here; the SkillPathCards component renders them.
 *
 * Keys match ids in ryanSkillPath.ts (skill steps) and cue swap ids.
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

export const TECHNIQUE_EVIDENCE: Record<string, ProofVideo[]> = {
  // Skill path steps
  'back-tuck': [
    {
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/DHL_hfEuRYi/',
      watchFor: 'His whole take on the back tuck — the prerequisite standard for layouts.',
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
  ],
  'ro-bhs': [
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
      watchFor: 'Layout reference — the hollow shape held in flight.',
    },
    {
      who: 'Kyoko',
      url: 'https://www.instagram.com/p/Dba2VNTmvaX/',
      watchFor: 'Rebound to candle — the layout drill that builds the shape.',
    },
  ],
  full: [
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
      url: 'https://www.tiktok.com/@coachryanwilliams/video/7530711980978539790',
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
