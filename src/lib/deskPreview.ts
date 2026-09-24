/**
 * Admin-only: look at parent / athlete / gym-owner desks without extra logins.
 * Does not change the real account. Local to this browser.
 */

export type DeskPreview = 'home' | 'gymOwner' | 'parent' | 'athlete'

const KEY = 'shape-lab.deskPreview.v1'

export const DESK_PREVIEW_OPTIONS: { id: DeskPreview; label: string }[] = [
  { id: 'home', label: 'Gym' },
  { id: 'gymOwner', label: 'Gym owner' },
  { id: 'parent', label: 'Parent' },
  { id: 'athlete', label: 'Athlete' },
]

export function loadDeskPreview(): DeskPreview {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === 'gymOwner' || raw === 'parent' || raw === 'athlete' || raw === 'home') return raw
  } catch {
    /* private mode */
  }
  return 'home'
}

export function saveDeskPreview(next: DeskPreview) {
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* quota */
  }
}
