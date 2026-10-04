import { classLabel } from '../../lib/coachClasses'
import type { ClassMeeting, CoachClassOffering } from '../../lib/coachClasses'

/**
 * Live roll call for the front desk. When a class is running, the gym owner
 * (or any viewer who isn't the running coach) sees who's marked here,
 * updating live as the coach takes roll. No refresh needed.
 */
export function LiveClassRoll({
  meeting,
  offering,
}: {
  meeting: ClassMeeting
  offering: CoachClassOffering
}) {
  const attendees = [...meeting.attendees].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
  )

  return (
    <div className="mt-3 rounded-2xl border border-[var(--accent)] bg-[#102820] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Class is running
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--text)]">
        {classLabel(offering)}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {attendees.length} marked here
        {attendees.length === 1 ? '' : ''}
      </p>
      {attendees.length > 0 ? (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {attendees.map((a, i) => (
            <li
              key={a.athleteId ?? `${a.firstName}-${a.lastName}-${i}`}
              className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2"
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]"
                aria-hidden
              />
              <span className="text-sm font-medium text-[var(--text)]">
                {a.firstName} {a.lastName}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">
          No one marked here yet. Names appear as the coach takes roll.
        </p>
      )}
    </div>
  )
}
