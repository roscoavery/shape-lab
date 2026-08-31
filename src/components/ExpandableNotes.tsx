import { useState } from 'react'

type Props = {
  text: string
  /** Closed preview uses this many lines of the first cue. */
  previewLines?: 1 | 2
}

export function cueLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function firstCue(text: string): string {
  return cueLines(text)[0] ?? ''
}

export function ExpandableNotes({ text, previewLines = 2 }: Props) {
  const [open, setOpen] = useState(false)
  const lines = cueLines(text)
  if (lines.length === 0) return null

  const short = lines.length === 1 && lines[0].length < 92
  if (short) {
    return <p className="text-sm leading-snug text-[var(--muted)]">{lines[0]}</p>
  }

  return (
    <div>
      {open ? (
        lines.length > 1 ? (
          <ul className="space-y-1.5 text-sm leading-snug text-[var(--text)]">
            {lines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-snug text-[var(--muted)]">{lines[0]}</p>
        )
      ) : (
        <p
          className={`text-sm leading-snug text-[var(--muted)] ${
            previewLines === 1 ? 'line-clamp-1' : 'line-clamp-2'
          }`}
        >
          {lines[0]}
        </p>
      )}
      <button
        type="button"
        className="mt-1 text-xs font-semibold text-[var(--accent)]"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Less' : 'More'}
      </button>
    </div>
  )
}
