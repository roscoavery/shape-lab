import type { Athlete } from '../../types'

type Props = {
  athlete: Athlete
  siblings: Athlete[]
  parentName: string
  onBackToParent: () => void
  onSwitchAthlete: (id: string) => void
}

/**
 * Slim bar shown while a parent is in athlete view. Subtle about whose
 * profile is in use, obvious about how to get back to the parent experience.
 */
export function AthleteViewBar({ athlete, siblings, parentName, onBackToParent, onSwitchAthlete }: Props) {
  return (
    <div className="sticky top-0 z-40 mb-3 flex items-center justify-between gap-2 rounded-xl border border-[var(--accent)]/30 bg-[#0d1a16]/95 px-3 py-2 backdrop-blur">
      <p className="min-w-0 truncate text-sm text-[var(--muted)]">
        Using <strong className="text-[var(--text)]">{athlete.firstName || athlete.name}'s</strong> profile
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {siblings.length > 1 && (
          <label className="text-xs text-[var(--muted)]">
            <span className="sr-only">Switch athlete</span>
            <select
              value={athlete.id}
              onChange={(e) => onSwitchAthlete(e.target.value)}
              className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm text-[var(--text)]"
            >
              {siblings.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.firstName || k.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={onBackToParent}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--on-accent)]"
        >
          Back to {parentName || 'Parent'}
        </button>
      </div>
    </div>
  )
}
