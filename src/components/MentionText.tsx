import type { Athlete } from '../types'
import { splitMentions } from '../lib/profileHandle'
import { useViewProfile } from './ProfilePeekContext'

type Props = {
  text: string
  athletes: Athlete[]
  className?: string
}

export function MentionText({ text, athletes, className }: Props) {
  const view = useViewProfile()
  const parts = splitMentions(text, athletes)
  if (parts.length === 0) return <span className={className}>{text}</span>
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.kind === 'text' ? (
          <span key={i}>{part.value}</span>
        ) : part.athlete ? (
          <button
            key={i}
            type="button"
            onClick={() => view(part.athlete!.id)}
            className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
          >
            {part.value}
          </button>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </span>
  )
}
