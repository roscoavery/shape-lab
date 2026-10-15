/**
 * Acro skill map: a separate skill progression for acro/tumbling clinics.
 *
 * Ryan's 7 levels, arranged by track (standing, front, side, other).
 * Levels are vertical layers: level 1 at the bottom, level 7 at the top.
 * Used for: quick-add skill selection at clinics, the acro map view,
 * and per-athlete working-towards paths.
 */

export type AcroTrack = 'standing' | 'front' | 'side' | 'other'

export type AcroSkill = {
  id: string
  name: string
  level: number // 1-7, Ryan's levels
  track: AcroTrack
}

export const ACRO_TRACKS: AcroTrack[] = ['standing', 'front', 'side', 'other']

export const ACRO_TRACK_LABELS: Record<AcroTrack, string> = {
  standing: 'Standing',
  front: 'Front',
  side: 'Side',
  other: 'Other',
}

function s(id: string, name: string, level: number, track: AcroTrack): AcroSkill {
  return { id: `acro_${id}`, name, level, track }
}

export const ACRO_SKILLS: AcroSkill[] = [
  // Level 1
  s('back_bend', 'Back bend', 1, 'standing'),
  s('wall_handstand', 'Wall handstand', 1, 'other'),
  s('cartwheel', 'Cartwheel', 1, 'side'),
  s('tucked_headstand', 'Tucked headstand', 1, 'front'),
  // Level 2
  s('cartwheel_step_in', 'Cartwheel step in', 2, 'side'),
  s('one_arm_cartwheel_close', 'One arm cartwheel (close hand)', 2, 'side'),
  s('one_arm_cartwheel_far', 'One arm cartwheel (far hand)', 2, 'side'),
  s('front_limber', 'Front limber', 2, 'front'),
  s('stand_from_bridge', 'Stand from bridge', 2, 'standing'),
  s('back_bend_kick_over', 'Back bend kick over', 2, 'standing'),
  s('headstand', 'Headstand', 2, 'front'),
  s('inside_out_bridge', 'Inside out bridge', 2, 'other'),
  // Level 3
  s('back_walkover', 'Back walkover', 3, 'standing'),
  s('front_walkover', 'Front walkover', 3, 'front'),
  s('illusion', 'Illusion', 3, 'other'),
  s('blaster_scoot', 'Blaster scoot', 3, 'other'),
  s('dive_cartwheel', 'Dive cartwheel', 3, 'side'),
  s('prep_aerial', 'Prep aerial', 3, 'side'),
  s('elbow_stand', 'Elbow stand', 3, 'front'),
  // Level 4
  s('valdez_walkover', 'Valdez walkover', 4, 'other'),
  s('kip_to_bridge', 'Kip to bridge', 4, 'other'),
  s('dive_front_walkover', 'Dive front walkover', 4, 'front'),
  s('spider_cartwheel', 'Spider cartwheel', 4, 'side'),
  s('butterfly_kick', 'Butterfly kick', 4, 'side'),
  s('one_arm_front_walkover', 'One arm front walkover', 4, 'front'),
  s('front_toss', 'Front toss', 4, 'front'),
  // Level 5
  s('headspring', 'Headspring', 5, 'front'),
  s('side_aerial', 'Side aerial', 5, 'side'),
  s('front_aerial', 'Front aerial', 5, 'front'),
  s('kip_up', 'Kip up', 5, 'other'),
  // Level 6
  s('back_handspring', 'Back handspring', 6, 'standing'),
  s('front_handspring', 'Front handspring', 6, 'front'),
  s('standing_side_aerial', 'Standing side aerial', 6, 'side'),
  // Level 7
  s('helicopter_cartwheel', 'Helicopter cartwheel', 7, 'side'),
  s('aerial_twist', 'Aerial twist', 7, 'side'),
  s('butterfly_twist', 'Butterfly twist', 7, 'side'),
  s('raiz', 'Raiz', 7, 'other'),
  s('peter_pan', 'Peter Pan', 7, 'front'),
  s('f540', '540', 7, 'other'),
  s('standing_back_tuck', 'Standing back tuck', 7, 'standing'),
  s('standing_front_aerial', 'Standing front aerial', 7, 'side'),
  // Round off now lives on the side track (roundoff column removed per Ryan)
  s('round_off', 'Round off', 2, 'side'),
]

export function getAcroSkill(id: string): AcroSkill | undefined {
  return ACRO_SKILLS.find((sk) => sk.id === id)
}

export function acroSkillsByLevel(): { level: number; skills: AcroSkill[] }[] {
  const out: { level: number; skills: AcroSkill[] }[] = []
  for (let l = 1; l <= 7; l++) {
    out.push({ level: l, skills: ACRO_SKILLS.filter((sk) => sk.level === l) })
  }
  return out
}

export function acroSkillsByTrack(): { track: AcroTrack; skills: AcroSkill[] }[] {
  return ACRO_TRACKS.map((track) => ({
    track,
    skills: ACRO_SKILLS.filter((sk) => sk.track === track).sort((a, b) => a.level - b.level),
  }))
}

/**
 * Convert an acro skill to a minimal UnifiedSkill for opening in the
 * skill card modal. Used when the acro skill name doesn't match a
 * main-map skill. The card will show "guide coming" but includes
 * PathTab (with wiggle toggles), HarderVersions, and reference videos.
 */
export function acroSkillToUnified(skill: AcroSkill): import('../config/unifiedSkillSeed').UnifiedSkill {
  const trackMap: Record<AcroTrack, import('../config/unifiedSkillSeed').UnifiedSkillTrack> = {
    standing: 'standing',
    front: 'walking',
    side: 'walking',
    other: 'foundation',
  }
  return {
    id: skill.id,
    name: skill.name,
    aliases: [],
    track: trackMap[skill.track],
  }
}
