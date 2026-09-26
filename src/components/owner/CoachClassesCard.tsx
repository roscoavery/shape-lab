/**
 * Coach "My classes" — read-only list of classes assigned to this coach.
 * Shown on the coach Today view. Returns null when nothing is assigned.
 */
import { useEffect, useState } from 'react'
import {
  classLabel,
  hydrateCoachClasses,
  loadOfferingsForCoach,
  subscribeCoachClasses,
  type CoachClassOffering,
} from '../../lib/coachClasses'

type Props = { coachId: string }

export function CoachClassesCard({ coachId }: Props) {
  const [offerings, setOfferings] = useState<CoachClassOffering[]>([])

  useEffect(() => {
    const refresh = () => setOfferings(loadOfferingsForCoach(coachId))
    refresh()
    const unsub = subscribeCoachClasses(refresh)
    void hydrateCoachClasses().then(refresh)
    return unsub
  }, [coachId])

  if (offerings.length === 0) return null

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
      <h2 className="text-sm font-bold text-[var(--text)]">My classes</h2>
      <ul className="mt-2 space-y-1.5">
        {offerings.map((o) => (
          <li key={o.id} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-semibold text-[var(--text)]">{o.name}</span>
            <span className="shrink-0 text-xs text-[var(--muted)]">{classLabel(o)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
