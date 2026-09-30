import { useState } from 'react'
import type { Athlete } from '../../types'
import type { AppTab } from '../../lib/storage'
import {
  backCheckinDue,
  daysSinceBackCare,
  ensureBackExtensionHomework,
  saveBackCheckin,
  type BackStatus,
} from '../../lib/backCheckin'

type Props = {
  athlete: Athlete
  onTrain: (tab: AppTab) => void
}

const STATUS_LABEL: { id: BackStatus; label: string }[] = [
  { id: 'good', label: 'Good' },
  { id: 'okay', label: 'Okay' },
  { id: 'rough', label: 'Rough' },
]

function DoneButton({ onDone }: { onDone: () => void }) {
  return (
    <button
      type="button"
      onClick={onDone}
      className="mt-3 rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm font-semibold text-[var(--muted)]"
    >
      Done
    </button>
  )
}

/**
 * Ryan-only Today card. Asks how his back is doing every few days — one tap
 * answers and the question disappears. A Good answer shows his maintenance
 * reminder; stale back-extension logging nudges him to log a hold.
 */
export function BackCheckin({ athlete, onTrain }: Props) {
  const [answered, setAnswered] = useState<BackStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const due = answered === null && backCheckinDue()
  const backCareDays = daysSinceBackCare(athlete.id)
  const staleBackCare = backCareDays === null || backCareDays >= 3
  if (!due && answered === null && !staleBackCare) return null

  const answer = (status: BackStatus) => {
    saveBackCheckin(status)
    setAnswered(status)
  }
  const logHold = () => {
    ensureBackExtensionHomework(athlete.id)
    onTrain('homework')
  }
  const staleLine =
    backCareDays === null
      ? 'No back-extension work logged yet.'
      : `Last back-extension work ${backCareDays} day${backCareDays === 1 ? '' : 's'} ago.`

  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        Back check
      </p>

      {answered === null && due && (
        <>
          <p className="mt-2 text-sm font-semibold text-[var(--text)]">
            How&apos;s your back doing?
          </p>
          {staleBackCare && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {staleLine} Log a hold when you get a chance.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {STATUS_LABEL.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => answer(s.id)}
                className="flex-1 rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2.5 text-sm font-semibold text-[var(--text)]"
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      {answered === null && !due && staleBackCare && (
        <>
          <p className="mt-2 text-sm text-[var(--text)]">
            {staleLine} Log a hold when you get a chance.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={logHold}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[#06281f]"
            >
              Log a hold
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm font-semibold text-[var(--muted)]"
            >
              Later
            </button>
          </div>
        </>
      )}

      {answered === 'good' && (
        <>
          <p className="mt-2 text-sm font-semibold text-[var(--text)]">
            Good. Keep it that way.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            It&apos;s a lot easier to maintain a healthy back than to go from the
            ground up after an injury from lack of maintenance. Log a hold when
            you get a chance.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={logHold}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[#06281f]"
            >
              Log a hold
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm font-semibold text-[var(--muted)]"
            >
              Done
            </button>
          </div>
        </>
      )}

      {answered === 'okay' && (
        <>
          <p className="mt-2 text-sm text-[var(--text)]">Noted. Easy does it today.</p>
          <DoneButton onDone={() => setDismissed(true)} />
        </>
      )}

      {answered === 'rough' && (
        <>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
            Noted. Easy iso holds only, no hero sets — stop if anything sharp
            shows up.
          </p>
          <DoneButton onDone={() => setDismissed(true)} />
        </>
      )}
    </section>
  )
}
