/**
 * Photo collages Ryan drops into skill cards (PicPlayPost sequences with
 * the watermark removed). Shipped stills live under src/assets/references/
 * (bundled) with public/references/ as fallback — same pattern as shapes.
 */
export interface SkillPhoto {
  /** Filename under src/assets/references/ (and public/references/). */
  file: string
  /** Small caption shown under the photo. */
  label?: string
}

/** Skill id -> photos, in the order they should appear. */
export const SKILL_PHOTOS: Record<string, SkillPhoto[]> = {
  skl_handstand_fwd_roll: [{ file: 'handstand_fwd_roll.jpg' }],
  skl_layout: [{ file: 'back_layout_cues.jpg' }],
  skl_back_full: [{ file: 'back_layout_cues.jpg' }],
  skl_ro_bhs_tuck: [
    { file: 'back_tuck_cues.jpg', label: 'Cues' },
    { file: 'back_tuck_examples.jpg', label: 'Examples' },
  ],
  skl_standing_bhs: [
    { file: 'back_handspring_sequence.jpg' },
    { file: 'zombie_collage.jpg' },
    { file: 'bhs_arch_handstand.jpg' },
    {
      file: 'bhs_pike_frame.jpg',
      label:
        'She hits the pike shape and really decreases moment of inertia a lot by dropping arms and closing hips to get feet in front for the next handspring.',
    },
  ],
  skl_ro_bhs: [
    { file: 'back_handspring_sequence.jpg' },
    { file: 'zombie_collage.jpg' },
    { file: 'c_shape_collage.jpg' },
    { file: 'bhs_arch_handstand.jpg' },
    {
      file: 'bhs_pike_frame.jpg',
      label:
        'She hits the pike shape and really decreases moment of inertia a lot by dropping arms and closing hips to get feet in front for the next handspring.',
    },
  ],
  skl_strong_round_off: [{ file: 'zombie_collage.jpg' }],
  skl_ro_bhs_series: [
    { file: 'c_shape_collage.jpg' },
    { file: 'bhs_arch_handstand.jpg' },
    {
      file: 'bhs_pike_frame.jpg',
      label:
        'She hits the pike shape and really decreases moment of inertia a lot by dropping arms and closing hips to get feet in front for the next handspring.',
    },
  ],
  skl_cartwheel_handspring: [{ file: 'c_shape_collage.jpg' }],
  skl_standing_bhs_series: [
    { file: 'bhs_arch_handstand.jpg' },
    {
      file: 'bhs_pike_frame.jpg',
      label:
        'She hits the pike shape and really decreases moment of inertia a lot by dropping arms and closing hips to get feet in front for the next handspring.',
    },
  ],
}

export function skillPhotosFor(skillId: string): SkillPhoto[] {
  return SKILL_PHOTOS[skillId] ?? []
}
