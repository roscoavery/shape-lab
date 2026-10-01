import type { Athlete } from '../types'
import { childAthletes } from './parentLink'
import { profileRole } from './profileRole'

/**
 * Family beta — athlete view through a parent login.
 *
 * The authenticated account never changes: the server still sees the parent's
 * session. Athlete view is a client-side UX mode that renders one linked
 * child's athlete experience. The athlete id is always validated against the
 * parent's actual linked athletes — never trusted from the browser alone.
 */

/** The linked athlete the parent is currently viewing as, or null. */
export function resolveAthleteViewAthlete(
  parent: Athlete | null | undefined,
  athleteViewId: string | null | undefined,
  athletes: Athlete[],
): Athlete | null {
  if (!parent || !athleteViewId) return null
  if (profileRole(parent) !== 'parent') return null
  return childAthletes(parent, athletes).find((k) => k.id === athleteViewId) ?? null
}

/** Whether this parent may enter athlete view for this athlete id. */
export function canEnterAthleteView(
  parent: Athlete | null | undefined,
  athleteId: string | null | undefined,
  athletes: Athlete[],
): boolean {
  return resolveAthleteViewAthlete(parent, athleteId, athletes) !== null
}
