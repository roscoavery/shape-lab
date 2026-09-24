import {
  DESK_PREVIEW_OPTIONS,
  type DeskPreview,
} from '../lib/deskPreview'

type Props = {
  value: DeskPreview
  onChange: (next: DeskPreview) => void
  compact?: boolean
}

export function DeskPreviewPicker({ value, onChange, compact = false }: Props) {
  return (
    <div>
      {!compact && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Look as
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
            Stay on this gym login. Switch the desk so you can build parent, athlete, and gym-owner
            screens without extra accounts.
          </p>
        </>
      )}
      <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-3'}`}>
        {DESK_PREVIEW_OPTIONS.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onChange(row.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              value === row.id
                ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                : 'border border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            {row.label}
          </button>
        ))}
      </div>
    </div>
  )
}
