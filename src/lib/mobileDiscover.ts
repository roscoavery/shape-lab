const KEY = 'shape-lab.mobileDiscover.v1'

export type DiscoverTarget =
  | 'scroll'
  | 'wins'
  | 'feed'
  | 'compare'
  | 'learn'
  | 'homework'
  | 'classflows'
  | 'spotting'
  | 'skillpath'
  | 'mysystem'

const VALID_TARGETS: DiscoverTarget[] = [
  'scroll',
  'wins',
  'feed',
  'compare',
  'learn',
  'homework',
  'classflows',
  'spotting',
  'skillpath',
  'mysystem',
]

export function stashDiscoverTarget(target: DiscoverTarget): void {
  try {
    sessionStorage.setItem(KEY, target)
  } catch {
    /* private mode */
  }
}

export function takeDiscoverTarget(): DiscoverTarget | null {
  try {
    const v = sessionStorage.getItem(KEY) as DiscoverTarget | null
    sessionStorage.removeItem(KEY)
    if (v && (VALID_TARGETS as string[]).includes(v)) return v
    return null
  } catch {
    return null
  }
}
