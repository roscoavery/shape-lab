import type { Urgency } from '../../content/coachEd/types'

export function urgencyClass(u: Urgency): string {
  switch (u) {
    case 'emergency':
      return 'border-red-400/50 bg-red-500/15 text-red-200'
    case 'same_day':
      return 'border-orange-400/50 bg-orange-500/10 text-orange-200'
    case 'soon':
      return 'border-amber-400/40 bg-amber-400/10 text-amber-100'
    default:
      return 'border-white/15 bg-white/5 text-[var(--muted)]'
  }
}

