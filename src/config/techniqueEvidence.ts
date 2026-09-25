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
}

export const TECHNIQUE_EVIDENCE: Record<string, ProofVideo[]> = {
  // Skill path steps
  'round-off': [
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
      who: 'Reference',
      url: 'https://www.instagram.com/reel/DZncc7BxFWY/',
      watchFor: 'Passe round off to zombie — the landing shape, not lightning bolt.',
    },
  ],
  'ro-bhs': [
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
      who: 'Coach Ryan Williams',
      url: 'https://www.instagram.com/reel/Cejgj-XvIGK/',
      watchFor: 'Layout plus arm drop — the same late-twist process Ryan teaches.',
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
