/**
 * Coach-facing onboarding checklist. Read-only list of the coach's assigned
 * tracks; the coach checks items off. Shown on the coach Today view.
 * Returns null when the coach has no active assignments.
 */
import { useEffect, useState } from 'react'
import {
  assignmentProgress,
  loadAssignmentsForCoach,
  loadOnboardingTracks,
  subscribeOwnerData,
  toggleOnboardingItem,
  type OnboardingAssignment,
  type OnboardingTrack,
} from '../../lib/ownerData'

type Props = { coachId: string }

export function CoachOnboardingCard({ coachId }: Props) {
  const [assignments, setAssignments] = useState<OnboardingAssignment[]>([])
  const [tracks, setTracks] = useState<OnboardingTrack[]>([])

  useEffect(() => {
    const refresh = () => {
      setAssignments(loadAssignmentsForCoach(coachId))
      setTracks(loadOnboardingTracks())
    }
    refresh()
    return subscribeOwnerData(refresh)
  }, [coachId])

  const active = assignments.filter((a) => !a.signedOff)
  if (active.length === 0) return null

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
      <h2 className="text-sm font-bold text-[var(--text)]">Coach onboarding</h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        Work through your track — check items off as you finish them.
      </p>
      <div className="mt-3 space-y-3">
        {active.map((a) => {
          const track = tracks.find((t) => t.id === a.trackId)
          if (!track) return null
          const { done, total } = assignmentProgress(a, track)
          return (
            <div key={a.id}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--text)]">{track.name}</p>
                <p className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                  {done}/{total}
                </p>
              </div>
              <ul className="mt-1.5 space-y-1">
                {track.items.map((item) => {
                  const checked = a.completedItemIds.includes(item.id)
                  const body =
                    item.kind === 'skill_step' && item.refId ? (
                      <span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                          Skill path ·{' '}
                        </span>
                        {item.label}
                      </span>
                    ) : item.kind === 'evidence' && item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--accent)] underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span>{item.label}</span>
                    )
                  return (
                    <li key={item.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-white/5 ${
                          checked ? 'text-[var(--muted)] line-through' : 'text-[var(--text)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleOnboardingItem(a.id, item.id, e.target.checked)}
                          className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                        />
                        <span className="min-w-0">{body}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
