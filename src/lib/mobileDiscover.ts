const KEY = 'shape-lab.mobileDiscover.v1'

export type DiscoverTarget = 'all' | 'scroll' | 'wins' | 'feed' | 'compare' | 'learn'

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
    if (v === 'all' || v === 'scroll' || v === 'wins' || v === 'feed' || v === 'compare' || v === 'learn') return v
    return null
  } catch {
    return null
  }
}
