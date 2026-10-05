import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import {
  WEEKDAYS,
  classLabel,
  listLiveMeetings,
  loadMeetings,
  loadOfferings,
  type CoachClassOffering,
} from '../../lib/coachClasses'
import { createId } from '../../lib/storage'

type Props = {
  athletes: Athlete[]
  gymName: string
  onAthletesChange: (next: Athlete[]) => void
}

function todayWeekday(): string {
  return WEEKDAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] ?? 'Monday'
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Who is marked present in today's meetings for this offering. */
function presentIdsFor(offering: CoachClassOffering): Set<string> {
  const ids = new Set<string>()
  const key = todayKey()
  for (const meeting of [...listLiveMeetings(), ...loadMeetings()]) {
    if (meeting.offeringId !== offering.id) continue
    const at = meeting.startedAt || ''
    if (at && !at.startsWith(key)) continue
    for (const attendee of meeting.attendees) {
      if (attendee.athleteId) ids.add(attendee.athleteId)
    }
  }
  return ids
}

export function FrontDeskPanel({ athletes, gymName, onAthletesChange }: Props) {
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [tick, setTick] = useState(0)

  const offerings = useMemo(() => {
    void tick
    return loadOfferings().filter((o) => o.weekday === todayWeekday())
  }, [tick])

  const nameOf = (id: string) => athletes.find((a) => a.id === id)?.name ?? 'Unknown'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return athletes
    return athletes.filter((a) => a.name.toLowerCase().includes(q))
  }, [athletes, query])

  const addAthlete = () => {
    const firstName = first.trim()
    const lastName = last.trim()
    if (!firstName || !lastName) return
    const now = new Date().toISOString()
    const athlete: Athlete = {
      id: createId('ath'),
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      parentPhone: phone.trim() || undefined,
      role: 'athlete',
      profilePublic: false,
      gymName,
      // Created at this gym's front desk: associated from the start.
      classGyms: [gymName],
      createdAt: now,
    }
    onAthletesChange([...athletes, athlete])
    setFirst('')
    setLast('')
    setPhone('')
    setShowNew(false)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text)]">Today's classes</h2>
          <button
            type="button"
            onClick={() => setTick((n) => n + 1)}
            className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-xs text-[var(--muted)]"
          >
            Refresh
          </button>
        </div>
        {offerings.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No classes on the schedule today.</p>
        )}
        <div className="space-y-3">
          {offerings.map((offering) => {
            const present = presentIdsFor(offering)
            return (
              <div
                key={offering.id}
                className="rounded-xl border border-[var(--panel-border)] p-3"
              >
                <p className="text-sm font-semibold text-[var(--text)]">
                  {classLabel(offering)}
                </p>
                {offering.rosterIds.length === 0 ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">No roster yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {offering.rosterIds.map((id) => {
                      const here = present.has(id)
                      return (
                        <li
                          key={id}
                          className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-sm"
                        >
                          <span className="text-[var(--text)]">{nameOf(id)}</span>
                          <span
                            className={`text-xs font-semibold ${here ? 'text-[var(--good)]' : 'text-[var(--muted)]'}`}
                          >
                            {here ? 'Present' : 'Not marked'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[var(--text)]">
            Athletes <span className="text-xs font-normal text-[var(--muted)]">{athletes.length}</span>
          </h2>
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-[var(--on-accent)]"
          >
            {showNew ? 'Close' : '+ New athlete'}
          </button>
        </div>
        {showNew && (
          <div className="mb-3 grid gap-2 rounded-xl border border-[var(--panel-border)] p-3 sm:grid-cols-2">
            <input
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              placeholder="First name"
              className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
            />
            <input
              value={last}
              onChange={(e) => setLast(e.target.value)}
              placeholder="Last name"
              className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Parent phone (optional)"
              inputMode="tel"
              className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)] sm:col-span-2"
            />
            <button
              type="button"
              disabled={!first.trim() || !last.trim()}
              onClick={addAthlete}
              className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50 sm:col-span-2"
            >
              Create profile at {gymName}
            </button>
          </div>
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search athletes…"
          className="mb-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
        />
        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {filtered.map((athlete) => (
            <li
              key={athlete.id}
              className="rounded-lg bg-white/5 px-2.5 py-1.5 text-sm text-[var(--text)]"
            >
              {athlete.name}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="text-xs text-[var(--muted)]">No athletes match.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
