/**
 * Owner classes — create classes (name, day, time) and assign coach
 * profiles to them. Built on the existing class offerings store
 * (coachClasses.ts), so assigned classes flow into the coach's Today view.
 */
import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { profileRole } from '../../lib/profileRole'
import {
  WEEKDAYS,
  classLabel,
  loadOfferings,
  offeringCoachIds,
  removeOffering,
  saveOffering,
  subscribeCoachClasses,
  type CoachClassOffering,
  type Weekday,
} from '../../lib/coachClasses'

type Props = { athletes: Athlete[]; ownerId: string }

const inputCls =
  'w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]'

export function OwnerClasses({ athletes, ownerId }: Props) {
  const [offerings, setOfferings] = useState<CoachClassOffering[]>([])
  const [name, setName] = useState('')
  const [weekday, setWeekday] = useState<Weekday>('Monday')
  const [time, setTime] = useState('')
  const [coachIds, setCoachIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => setOfferings(loadOfferings())
    refresh()
    return subscribeCoachClasses(refresh)
  }, [])

  const coaches = useMemo(() => athletes.filter((a) => profileRole(a) === 'coach'), [athletes])
  const nameOf = (id: string) => athletes.find((a) => a.id === id)?.name ?? 'Coach'

  const reset = () => {
    setName('')
    setWeekday('Monday')
    setTime('')
    setCoachIds([])
    setEditingId(null)
  }

  const startEdit = (o: CoachClassOffering) => {
    setEditingId(o.id)
    setName(o.name)
    setWeekday(o.weekday)
    setTime(o.time)
    setCoachIds(offeringCoachIds(o))
  }

  const canSave = name.trim().length > 0 && time.trim().length > 0 && coachIds.length > 0

  const save = () => {
    if (!canSave) return
    saveOffering({
      id: editingId ?? undefined,
      coachId: coachIds[0] ?? ownerId,
      coachIds,
      leadCoachId: coachIds[0],
      name: name.trim(),
      weekday,
      time: time.trim(),
    })
    reset()
  }

  const toggleCoach = (id: string) =>
    setCoachIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
        <h3 className="text-sm font-bold text-[var(--text)]">{editingId ? 'Edit class' : 'New class'}</h3>
        <div className="mt-3 space-y-2.5">
          <input
            className={inputCls}
            placeholder="Class name — e.g. Advanced tumbling"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={weekday} onChange={(e) => setWeekday(e.target.value as Weekday)}>
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <input
              className={inputCls}
              placeholder="Time — e.g. 5:00 PM"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Assigned coaches
            </p>
            {coaches.length === 0 && (
              <p className="text-xs text-[var(--muted)]">No coach profiles yet.</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {coaches.map((c) => {
                const on = coachIds.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCoach(c.id)}
                    aria-pressed={on}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      on
                        ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                        : 'bg-white/5 text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={!canSave}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--on-accent)] disabled:opacity-40"
              onClick={save}
            >
              {editingId ? 'Save changes' : 'Add class'}
            </button>
            {editingId && (
              <button
                type="button"
                className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm font-medium text-[var(--muted)]"
                onClick={reset}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {offerings.map((o) => (
        <div key={o.id} className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[var(--text)]">{o.name}</h3>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{classLabel(o)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {offeringCoachIds(o).map(nameOf).join(', ') || 'No coaches assigned'}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--accent)]"
                onClick={() => startEdit(o)}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--muted)] hover:text-red-400"
                onClick={() => {
                  if (window.confirm(`Delete class "${o.name}"?`)) removeOffering(o.id)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      {offerings.length === 0 && (
        <p className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4 text-sm text-[var(--muted)]">
          No classes yet. Add one and assign coaches — it shows up on their Today view under "My classes".
        </p>
      )}
    </div>
  )
}
