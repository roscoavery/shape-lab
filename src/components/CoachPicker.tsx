import type { Athlete } from '../types'
import { isCoachProfile } from '../lib/profileRole'
import { AthleteName } from './AthleteAvatar'

type Props = {
  athletes: Athlete[]
  selected: string[]
  onChange: (ids: string[]) => void
  /** Skip this profile in the list (the athlete themselves). */
  excludeId?: string
  /** When set, the athlete can hide coach names on their public profile. */
  showOnProfile?: boolean
  onShowOnProfile?: (show: boolean) => void
}

export function CoachPicker({
  athletes,
  selected,
  onChange,
  excludeId,
  showOnProfile = true,
  onShowOnProfile,
}: Props) {
  const coaches = athletes.filter((a) => isCoachProfile(a) && a.id !== excludeId)
  return (
    <div className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2">
      <p className="text-xs font-semibold text-[var(--text)]">Who do you work with?</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
        Pick every coach you train with. They will see your homework logs,
        sequences, class nights, and lessons. Wins, posts, and stories stay
        visible to everyone on this gym.
      </p>
      {coaches.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--muted)]">No coach profiles on this gym yet.</p>
      ) : (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
          {coaches.map((a) => {
            const on = selected.includes(a.id)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() =>
                    onChange(on ? selected.filter((id) => id !== a.id) : [...selected, a.id])
                  }
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                    on ? 'bg-[var(--accent)] text-[#06281f]' : 'text-[var(--muted)]'
                  }`}
                >
                  <AthleteName athlete={a} />
                  <span className="text-[11px]">{on ? 'Your coach' : 'Select'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {onShowOnProfile && (
        <label className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-[var(--muted)]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={showOnProfile}
            onChange={(e) => onShowOnProfile(e.target.checked)}
          />
          <span>
            Show these coaches on my profile. Uncheck to keep that private —
            they still see homework you log.
          </span>
        </label>
      )}
    </div>
  )
}
