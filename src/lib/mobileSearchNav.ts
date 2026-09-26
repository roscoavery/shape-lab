/**
 * One-shot deep links from mobile universal search → tab panels.
 */

const KEY = 'shape-lab.mobileSearchJump.v1'

export type MobileSearchJump =
  | { kind: 'shape'; shapeId: string }
  | { kind: 'clip'; url: string; label?: string }
  | { kind: 'homework'; catalogId: string }
  | { kind: 'profile'; athleteId: string }
  | { kind: 'networkThread'; threadId: string }
  | { kind: 'skill'; skillId: string }
  | { kind: 'skillPath' }

export function stashMobileSearchJump(jump: MobileSearchJump): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(jump))
  } catch {
    /* private mode */
  }
}

function readJump(): MobileSearchJump | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MobileSearchJump
    if (!parsed || typeof parsed !== 'object' || !('kind' in parsed)) return null
    return parsed
  } catch {
    return null
  }
}

/** Read and remove only when the stored jump matches `kind`. */
export function takeMobileSearchJump(kind: MobileSearchJump['kind']): MobileSearchJump | null {
  const parsed = readJump()
  if (!parsed || parsed.kind !== kind) return null
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* private mode */
  }
  return parsed
}
