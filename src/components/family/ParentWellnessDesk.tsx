import { useEffect, useMemo, useState } from 'react'
import {
  emptyParentWellness,
  loadParentWellness,
  saveParentWellness,
  WELLNESS_EXERCISES,
  WELLNESS_NOTICE,
  type ParentWellnessProfile,
  type WellnessExerciseId,
} from '../../lib/parentWellness'
import { createId } from '../../lib/storage'

type Props = {
  accountId: string
}

export function ParentWellnessDesk({ accountId }: Props) {
  const [profile, setProfile] = useState<ParentWellnessProfile>(() => emptyParentWellness(accountId))
  const [error, setError] = useState<string | null>(null)
  const [pain, setPain] = useState('3')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [exerciseId, setExerciseId] = useState<WellnessExerciseId>('glute_bridge')
  const [journal, setJournal] = useState('')

  useEffect(() => {
    void loadParentWellness()
      .then((row) => {
        if (row) setProfile(row)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load wellness.'))
  }, [accountId])

  const streak = useMemo(() => {
    const days = new Set(profile.exercises.filter((row) => row.completed).map((row) => row.date.slice(0, 10)))
    return days.size
  }, [profile.exercises])

  const persist = (next: ParentWellnessProfile) => {
    setProfile(next)
    void saveParentWellness(next).catch((err) =>
      setError(err instanceof Error ? err.message : 'Could not save wellness.'),
    )
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          My Wellness
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Your notes</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Separate from My Athletes. Coaches who work with your child do not see this journal.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">{WELLNESS_NOTICE}</p>
        <p className="mt-3 text-sm">Exercise days logged: {streak}</p>
      </section>

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="font-semibold">Your goals</h3>
        <textarea
          value={profile.currentGoals ?? ''}
          onChange={(e) => persist({ ...profile, currentGoals: e.target.value, updatedAt: new Date().toISOString() })}
          placeholder="What you want from this work"
          className="mt-3 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          rows={2}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <textarea
            value={profile.mobilityGoals ?? ''}
            onChange={(e) => persist({ ...profile, mobilityGoals: e.target.value, updatedAt: new Date().toISOString() })}
            placeholder="Mobility"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            rows={2}
          />
          <textarea
            value={profile.strengthGoals ?? ''}
            onChange={(e) => persist({ ...profile, strengthGoals: e.target.value, updatedAt: new Date().toISOString() })}
            placeholder="Strength"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            rows={2}
          />
        </div>
        <input
          value={profile.painAreas ?? ''}
          onChange={(e) => persist({ ...profile, painAreas: e.target.value, updatedAt: new Date().toISOString() })}
          placeholder="Current pain areas (your notes)"
          className="mt-3 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        />
      </section>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="font-semibold">Pain journal</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label>
            <span className="text-[11px] uppercase text-[var(--muted)]">0–10</span>
            <input
              value={pain}
              onChange={(e) => setPain(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-[11px] uppercase text-[var(--muted)]">Where</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
            />
          </label>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What you felt, what you did"
          className="mt-3 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          rows={3}
        />
        <button
          type="button"
          onClick={() => {
            persist({
              ...profile,
              updatedAt: new Date().toISOString(),
              painEntries: [
                {
                  id: createId('pain'),
                  date: new Date().toISOString(),
                  painLevel: Math.min(10, Math.max(0, Number(pain) || 0)),
                  location: location.trim() || undefined,
                  notes: notes.trim() || undefined,
                },
                ...profile.painEntries,
              ].slice(0, 200),
            })
            setNotes('')
          }}
          className="mt-3 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--on-accent)]"
        >
          Save pain note
        </button>
        <ul className="mt-4 space-y-2 text-sm">
          {profile.painEntries.slice(0, 8).map((row) => (
            <li key={row.id} className="text-[var(--muted)]">
              {row.date.slice(0, 10)} · {row.painLevel}/10 {row.location ? `· ${row.location}` : ''}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="font-semibold">Guided exercises</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {WELLNESS_EXERCISES.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setExerciseId(row.id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                exerciseId === row.id ? 'bg-[var(--accent-dim)] text-white' : 'bg-white/5 text-[var(--muted)]'
              }`}
            >
              {row.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            const label = WELLNESS_EXERCISES.find((row) => row.id === exerciseId)?.label || 'Exercise'
            persist({
              ...profile,
              updatedAt: new Date().toISOString(),
              exercises: [
                {
                  id: createId('ex'),
                  date: new Date().toISOString(),
                  exerciseId,
                  label,
                  completed: true,
                },
                ...profile.exercises,
              ].slice(0, 400),
            })
          }}
          className="mt-3 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--on-accent)]"
        >
          Log completed
        </button>
      </section>

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="font-semibold">Journal</h3>
        <textarea
          value={journal}
          onChange={(e) => setJournal(e.target.value)}
          className="mt-3 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          rows={4}
        />
        <button
          type="button"
          onClick={() => {
            if (!journal.trim()) return
            persist({
              ...profile,
              updatedAt: new Date().toISOString(),
              journal: [
                { id: createId('jnl'), date: new Date().toISOString(), body: journal.trim() },
                ...profile.journal,
              ].slice(0, 200),
            })
            setJournal('')
          }}
          className="mt-3 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--on-accent)]"
        >
          Save journal
        </button>
      </section>
    </div>
  )
}
