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
  /** Short label for map tiles, where the full name does not fit. */
  mapName?: string
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

function s(id: string, name: string, level: number, track: AcroTrack, mapName?: string): AcroSkill {
  return { id: `acro_${id}`, name, level, track, ...(mapName ? { mapName } : {}) }
}

/** Display name for map tiles: the abbreviated label when one is set. */
export function acroMapName(skill: AcroSkill): string {
  return skill.mapName ?? skill.name
}

export const ACRO_SKILLS: AcroSkill[] = [
  // Level 1
  s('back_bend', 'Back bend', 1, 'standing'),
  s('wall_handstand', 'Wall handstand', 1, 'other', 'Wall HS'),
  s('cartwheel', 'Cartwheel', 1, 'side'),
  s('tucked_headstand', 'Tucked headstand', 1, 'front', 'Tuck headstand'),
  // Level 2
  s('cartwheel_step_in', 'Cartwheel step in', 2, 'side', 'Cart step in'),
  s('one_arm_cartwheel_far', 'One arm cartwheel (far hand)', 2, 'side', '1-arm cart (far)'),
  s('one_arm_cartwheel_close', 'One arm cartwheel (close hand)', 2, 'side', '1-arm cart (close)'),
  s('front_limber', 'Front limber', 2, 'front'),
  s('stand_from_bridge', 'Stand from bridge', 2, 'standing'),
  s('back_bend_kick_over', 'Back bend kick over', 2, 'standing', 'Back bend KO'),
  s('headstand', 'Headstand', 2, 'front'),
  s('inside_out_bridge', 'Inside out bridge', 2, 'other', 'In-out bridge'),
  // Level 3
  s('back_walkover', 'Back walkover', 3, 'standing', 'Back WO'),
  s('front_walkover', 'Front walkover', 3, 'front', 'Front WO'),
  s('illusion', 'Illusion', 3, 'other'),
  s('blaster_scoot', 'Blaster scoot', 3, 'other'),
  s('dive_cartwheel', 'Dive cartwheel', 3, 'side', 'Dive cart'),
  s('prep_aerial', 'Prep aerial', 3, 'side'),
  s('elbow_stand', 'Elbow stand', 3, 'front'),
  // Level 4
  s('valdez_walkover', 'Valdez walkover', 4, 'other', 'Valdez WO'),
  s('kip_to_bridge', 'Kip to bridge', 4, 'other'),
  s('dive_front_walkover', 'Dive front walkover', 4, 'front', 'Dive front WO'),
  s('spider_cartwheel', 'Spider cartwheel', 4, 'side', 'Spider cart'),
  s('tricking_aerial', 'Tricking aerial', 4, 'side'),
  s('butterfly_kick', 'Butterfly kick', 4, 'side'),
  s('one_arm_front_walkover', 'One arm front walkover', 4, 'front', '1-arm front WO'),
  s('front_toss', 'Front toss', 4, 'front'),
  s('trampoline_back_handspring', 'Trampoline back handspring', 4, 'standing', 'Tramp BHS'),
  // Level 5
  s('headspring', 'Headspring', 5, 'front'),
  s('side_aerial', 'Side aerial', 5, 'side'),
  s('front_aerial', 'Front aerial', 5, 'front'),
  s('kip_up', 'Kip up', 5, 'other'),
  s('tumble_trak_back_handspring', 'Tumble trak back handspring', 5, 'standing', 'Tumble trak BHS'),
  s('airfloor_back_handspring', 'Airfloor back handspring', 5, 'standing', 'Airfloor BHS'),
  // Level 6
  s('back_handspring', 'Back handspring', 6, 'standing', 'BHS'),
  s('front_handspring', 'Front handspring', 6, 'front', 'Front HS'),
  s('standing_side_aerial', 'Standing side aerial', 6, 'side', 'Stand side aerial'),
  s('barrel_jump', 'Barrel jump', 6, 'other'),
  // Level 7
  s('helicopter_cartwheel', 'Helicopter cartwheel', 7, 'side', 'Helicopter cart'),
  s('aerial_twist', 'Aerial twist', 7, 'side'),
  s('butterfly_twist', 'Butterfly twist', 7, 'side'),
  s('raiz', 'Raiz', 7, 'other'),
  s('peter_pan', 'Peter Pan', 7, 'front'),
  s('f540', '540', 7, 'other'),
  s('standing_back_tuck', 'Standing back tuck', 7, 'standing', 'Stand back tuck'),
  s('standing_front_aerial', 'Standing front aerial', 7, 'side', 'Stand front aerial'),
  // Round off now lives on the side track (roundoff column removed per Ryan)
  s('round_off', 'Round off', 3, 'side'),
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
