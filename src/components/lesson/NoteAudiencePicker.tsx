import { noteAudienceHint, type NoteAudience } from '../../lib/noteAudience'

type Props = {
  value: NoteAudience
  onChange: (next: NoteAudience) => void
}

export function NoteAudiencePicker({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Who can see this
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        {(
          [
            ['athlete', 'Athlete can see'],
            ['coach', 'Coach only'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`rounded-md px-2.5 py-1 text-xs ${
              value === id
                ? 'bg-[var(--accent-dim)] font-semibold text-white'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-[var(--muted)]">{noteAudienceHint(value)}</p>
    </div>
  )
}
