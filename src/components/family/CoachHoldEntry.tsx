import { useState } from 'react'
import { COACH_HOLD_CHOICES, saveCoachHold } from '../../lib/coachHoldLog'
import { isCoachProfile } from '../../lib/profileRole'
import type { Athlete } from '../../types'

type Props = {
  athlete: Athlete
  viewer: Athlete | null
  lessonId?: string
  classMeetingId?: string
  className?: string
}

export function CoachHoldEntry({ athlete, viewer, lessonId, classMeetingId, className }: Props) {
  const coach = isCoachProfile(viewer)
  const [shapeId, setShapeId] = useState(COACH_HOLD_CHOICES[0]!.id)
  const [custom, setCustom] = useState('')
  const [seconds, setSeconds] = useState('')
  const [when, setWhen] = useState<'today' | 'past'>('today')
  const [pastDate, setPastDate] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!coach || !viewer) return null

  const choice = COACH_HOLD_CHOICES.find((row) => row.id === shapeId)
  const shapeName = shapeId === 'custom' ? custom.trim() : choice?.label || 'Hold'

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Log result
      </p>
      <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">Hold time for {athlete.name}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Does not need their login. Use a previous date if this came from notes.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Hold
          </span>
          <select
            value={shapeId}
            onChange={(e) => setShapeId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          >
            {COACH_HOLD_CHOICES.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
            <option value="custom">Custom hold</option>
          </select>
        </label>
        {shapeId === 'custom' && (
          <label>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Name
            </span>
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            />
          </label>
        )}
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Seconds
          </span>
          <input
            inputMode="decimal"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            When
          </span>
          <select
            value={when}
            onChange={(e) => setWhen(e.target.value as 'today' | 'past')}
            className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          >
            <option value="today">Performed today</option>
            <option value="past">Choose previous date</option>
          </select>
        </label>
        {when === 'past' && (
          <label>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Date
            </span>
            <input
              type="date"
              value={pastDate}
              onChange={(e) => setPastDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            />
          </label>
        )}
      </div>
      <button
        type="button"
        disabled={busy || Number(seconds) < 0.2 || (shapeId === 'custom' && !custom.trim())}
        onClick={() => {
          setBusy(true)
          void saveCoachHold({
            athleteId: athlete.id,
            shapeId: shapeId === 'custom' ? `custom:${custom.trim().toLowerCase()}` : shapeId,
            shapeName,
            seconds: Number(seconds),
            performedAt: when === 'past' && pastDate ? pastDate : undefined,
            source: 'coach',
            coachId: viewer.id,
            coachName: viewer.name,
            lessonId,
            classMeetingId,
            className,
          }).then((log) => {
            setBusy(false)
            setSaved(log ? `Saved ${Math.round(log.totalHoldSeconds)}s ${shapeName}.` : 'Could not save that hold.')
            setSeconds('')
          })
        }}
        className="mt-3 h-11 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-[var(--on-accent)] disabled:opacity-40"
      >
        Save hold
      </button>
      {saved && <p className="mt-2 text-sm text-[var(--muted)]">{saved}</p>}
    </section>
  )
}
