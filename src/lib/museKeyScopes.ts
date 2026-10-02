/**
 * Muse Connect key presets — the scoped API keys that let someone's own
 * Muse talk to this gym remotely. One source of truth shared by the owner
 * key manager and the coach setup wizard.
 */

export const SCOPE_LABELS: Record<string, string> = {
  'library:read': 'Read the video library',
  'library:add': 'Add videos to the library',
  'progress:read': 'Read athlete progress',
  'philosophy:read': 'Read coaching philosophy',
  'coach-shapes:write': 'Add shapes to the coach library',
  'roster:write': 'Add athletes to the roster',
  'classes:write': 'Add classes to the schedule',
  'athlete-notes:write': 'Add notes on athletes',
  'stories:write': 'Post to gym, wins, and passes',
  'drills:write': 'Add drills to the drill library',
  'skill-maps:write': 'Build skill maps and paths',
  'chalkboards:read': 'Read chalkboards',
  'chalkboards:write': 'Manage chalkboards',
  'homework:write': 'Log hold times and homework results for athletes',
}

export const OWNER_SCOPES = [
  'library:read',
  'library:add',
  'progress:read',
  'philosophy:read',
  'chalkboards:read',
  'chalkboards:write',
]
export const PARENT_SCOPES = ['progress:read', 'philosophy:read']

/** Everything a coach's own Muse needs to file drills, references, and maps. */
export const COACH_SCOPES = [
  'library:read',
  'library:add',
  'progress:read',
  'philosophy:read',
  'coach-shapes:write',
  'roster:write',
  'classes:write',
  'athlete-notes:write',
  'stories:write',
  'drills:write',
  'skill-maps:write',
  'chalkboards:read',
  'chalkboards:write',
  'homework:write',
]

export type KeyPreset = 'owner' | 'parent' | 'coach'

export const PRESET_SCOPES: Record<KeyPreset, string[]> = {
  owner: OWNER_SCOPES,
  parent: PARENT_SCOPES,
  coach: COACH_SCOPES,
}

export const PRESET_BLURBS: Record<KeyPreset, string> = {
  owner: 'Owner: file library videos, read the library, read any athlete\u2019s progress, read coaching philosophy, manage chalkboards.',
  parent: 'Parent: read one athlete\u2019s progress and the coaching philosophy. Nothing else.',
  coach:
    'Coach: everything an owner key does, plus add coach shapes, athletes, classes, athlete notes, gym/wins/passes posts, drills, and skill maps. A coach key can only reach athletes its coach works with.',
}

export function scopeText(scopes: string[]): string {
  return scopes.map((s) => SCOPE_LABELS[s] ?? s).join(', ')
}
