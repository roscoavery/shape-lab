export type NoteAudience = 'athlete' | 'coach'

export function noteAudience(note: { audience?: NoteAudience } | null | undefined): NoteAudience {
  return note?.audience === 'coach' ? 'coach' : 'athlete'
}

export function noteVisibleToAthlete(note: { audience?: NoteAudience } | null | undefined): boolean {
  return noteAudience(note) === 'athlete'
}

export function noteAudienceLabel(note: { audience?: NoteAudience } | null | undefined): string {
  return noteAudience(note) === 'coach' ? 'Coach only' : 'Athlete can see'
}

export function noteAudienceHint(audience: NoteAudience): string {
  return audience === 'coach'
    ? 'Only coaches see this — it stays off the athlete recap.'
    : 'They will see this on their lesson recap.'
}
