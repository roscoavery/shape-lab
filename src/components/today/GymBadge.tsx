import { homeGym, otherGymLabel } from '../../lib/gymScope'
import type { Athlete } from '../../types'

type Props = {
  athlete: Athlete
  viewerGym: string
  className?: string
}

/** Shown when this profile’s home gym is not the viewer’s gym. */
export function GymBadge({ athlete, viewerGym, className = '' }: Props) {
  const other = otherGymLabel(athlete, viewerGym)
  if (!other) return null
  return (
    <span
      className={`inline-block rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] ${className}`}
    >
      {other}
    </span>
  )
}

export function gymHint(athlete: Athlete, viewerGym: string): string {
  const other = otherGymLabel(athlete, viewerGym)
  if (!other) return homeGym(athlete)
  return `Different gym · ${other}`
}
