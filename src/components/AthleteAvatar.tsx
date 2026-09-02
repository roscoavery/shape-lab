import { handstandContest } from '../lib/intakeQuestions'

type AvatarAthlete = {
  name: string
  photoDataUrl?: string
  handstandFloor?: string
  handstandWall?: string
}

const SIZE = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
} as const

export function athleteInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function AthleteAvatar({
  athlete,
  size = 'sm',
  className = '',
}: {
  athlete: AvatarAthlete | null | undefined
  size?: keyof typeof SIZE
  className?: string
}) {
  const box = SIZE[size]
  const name = athlete?.name?.trim() || '?'
  if (athlete?.photoDataUrl) {
    return (
      <img
        src={athlete.photoDataUrl}
        alt=""
        className={`${box} shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-full bg-[#1a2430] font-bold text-[var(--text)] ${className}`}
    >
      {athleteInitials(name)}
    </span>
  )
}

export function AthleteName({
  athlete,
  size = 'sm',
  className = '',
  nameClassName = '',
}: {
  athlete: AvatarAthlete | null | undefined
  size?: keyof typeof SIZE
  className?: string
  nameClassName?: string
}) {
  const contest = athlete ? handstandContest(athlete) : false
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <AthleteAvatar athlete={athlete} size={size} />
      <span className={`truncate ${nameClassName}`}>
        {athlete?.name?.trim() || 'Untitled'}
        {contest ? ' 🤸' : ''}
      </span>
    </span>
  )
}
