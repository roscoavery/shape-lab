import { useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteName } from '../AthleteAvatar'
import { AthleteSearchField } from './AthleteSearchField'
import { logSessionReps, type LessonClockContext } from '../../lib/sessionClockLog'

type Phase = 'setup' | 'live' | 'done'

const EXERCISES = [
  { catalogId: 'pushup', label: 'Push-ups' },
  { catalogId: 'v_up', label: 'V-ups' },
] as const

/**
 * Class rep counter — the whole group does push-ups or v-ups together,
 * the coach taps the count, and it logs to everyone's homework as in class.
 */
export function ClassRepCounter({
  athletes,
  signedIn,
  className,
  meetingId,
  lesson,
  onLessonActivity,
}: {
  athletes: Athlete[]
  signedIn: Athlete | null
  className?: string
  meetingId?: string
  /** Lesson context: reps log as lesson work instead of class work. */
  lesson?: LessonClockContext
  /** Fired after lesson-mode logging so the host can refresh. */
  onLessonActivity?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [catalogId, setCatalogId] = useState<string>('pushup')
  const [picked, setPicked] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [reps, setReps] = useState(0)
  const [logged, setLogged] = useState(0)

  const byId = new Map(athletes.map((a) => [a.id, a]))
  const exercise = EXERCISES.find((e) => e.catalogId === catalogId) ?? EXERCISES[0]

  const addAthlete = (a: Athlete) => {
    if (!picked.includes(a.id)) setPicked((p) => [...p, a.id])
    setQuery('')
  }

  const start = () => {
    if (!picked.length) return
    setReps(0)
    setPhase('live')
  }

  const logAll = () => {
    if (reps <= 0) return
    const n = logSessionReps({
      athleteIds: picked,
      catalogId,
      reps,
      label: exercise.label,
      lesson,
      className,
      meetingId,
    })
    if (lesson && n > 0) onLessonActivity?.()
    setLogged(n)
    setPhase('done')
  }

  const reset = () => {
    setPicked([])
    setReps(0)
    setLogged(0)
    setPhase('setup')
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Rep counter
      </p>
      <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">
        {phase === 'setup' && 'Pick the exercise and the athletes'}
        {phase === 'live' && `${exercise.label} — tap +1 for every rep`}
        {phase === 'done' && `${exercise.label} — logged`}
      </h3>

      {phase === 'setup' && (
        <div className="mt-3 flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Exercise
            </p>
            <div className="flex flex-wrap gap-2">
              {EXERCISES.map((e) => (
                <button
                  key={e.catalogId}
                  type="button"
                  onClick={() => setCatalogId(e.catalogId)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    e.catalogId === catalogId
                      ? 'bg-[var(--accent)] text-black'
                      : 'bg-white/10 text-white/80'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Who's in ({picked.length})
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPicked(athletes.map((a) => a.id))}
                  className="text-xs font-semibold text-[var(--accent)]"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setPicked([])}
                  className="text-xs font-semibold text-white/50"
                >
                  Clear
                </button>
              </div>
            </div>
            <AthleteSearchField
              athletes={athletes}
              query={query}
              onQuery={setQuery}
              onPick={addAthlete}
              excludeIds={picked}
              placeholder="Search athletes…"
            />
            {picked.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {picked.map((id) => {
                  const a = byId.get(id)
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-xl bg-black/25 px-3 py-2"
                    >
                      <span className="flex-1 truncate text-sm font-medium">
                        {a ? <AthleteName athlete={a} /> : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPicked((p) => p.filter((x) => x !== id))}
                        className="text-sm font-bold text-white/40"
                        aria-label={`Remove ${a?.name ?? ''}`}
                      >
                        ✕
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <button
            type="button"
            disabled={!picked.length}
            onClick={start}
            className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black disabled:opacity-40"
          >
            Start counting — {picked.length} in
          </button>
          <p className="text-xs text-white/50">
            Everyone does the reps together. You tap the count, then it logs to
            each athlete's homework as {lesson ? 'in this lesson' : 'in class'}.
          </p>
        </div>
      )}

      {phase === 'live' && (
        <div className="mt-3 flex flex-col gap-4">
          <div className="text-center">
            <p className="font-mono text-7xl font-black tabular-nums text-[var(--text)]">{reps}</p>
            <p className="mt-1 text-xs text-white/50">
              {exercise.label} · {picked.length} athlete{picked.length === 1 ? '' : 's'} in
            </p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setReps((r) => Math.max(0, r - 1))}
              className="h-16 w-16 rounded-2xl border border-white/15 text-3xl font-black text-white/70"
              aria-label="One fewer rep"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setReps((r) => r + 1)}
              className="sl-names-glow h-24 w-24 !rounded-2xl bg-[var(--accent)] text-5xl font-black text-black active:scale-95"
              aria-label="One more rep"
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={reps <= 0}
            onClick={logAll}
            className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black disabled:opacity-40"
          >
            Log {reps} rep{reps === 1 ? '' : 's'} for everyone in
          </button>
          <button
            type="button"
            onClick={() => setPhase('setup')}
            className="text-sm font-semibold text-white/50"
          >
            Back — don't log
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="rounded-xl bg-black/25 p-4 text-center">
            <p className="font-mono text-4xl font-black tabular-nums text-[var(--accent)]">
              {reps}
              <span className="text-lg text-white/40"> reps</span>
            </p>
            <p className="mt-1 text-sm text-white/60">
              Logged for {logged} athlete{logged === 1 ? '' : 's'} as {lesson ? 'in this lesson' : 'in class'}
              {signedIn ? ` · counted by ${signedIn.name}` : ''}.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
          >
            Count another round
          </button>
        </div>
      )}
    </div>
  )
}
