import { useEffect, useRef, useState } from 'react'
import { STICK_RACE_SKILLS } from '../../lib/arcade'

type Phase = 'setup' | 'live' | 'done'
type Team = { id: string; name: string; sticks: number }

const ROUND_SECONDS = 60

const makeTeam = (n: number): Team => ({
  id: `team_${Date.now().toString(36)}_${n}_${Math.random().toString(36).slice(2, 6)}`,
  name: `Team ${n}`,
  sticks: 0,
})

/**
 * Team stick race — which team sticks the most of one skill in a minute.
 * One person tallies per team: big +1 button, easy undo for mis-taps.
 */
export function TeamStickRaceGame({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [skillId, setSkillId] = useState(STICK_RACE_SKILLS[0].id)
  const [teams, setTeams] = useState<Team[]>([makeTeam(1), makeTeam(2)])
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS)
  const endRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const skill = STICK_RACE_SKILLS.find((s) => s.id === skillId) ?? STICK_RACE_SKILLS[0]

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    },
    []
  )

  const start = () => {
    if (teams.length < 2) return
    setTeams((ts) => ts.map((t) => ({ ...t, sticks: 0 })))
    setSecondsLeft(ROUND_SECONDS)
    endRef.current = Date.now() + ROUND_SECONDS * 1000
    setPhase('live')
    timerRef.current = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left <= 0) {
        if (timerRef.current) window.clearInterval(timerRef.current)
        timerRef.current = null
        setPhase('done')
      }
    }, 200)
  }

  const endEarly = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    setPhase('done')
  }

  const tally = (id: string) =>
    setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, sticks: t.sticks + 1 } : t)))

  const undo = (id: string) =>
    setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, sticks: Math.max(0, t.sticks - 1) } : t)))

  const rename = (id: string, name: string) =>
    setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)))

  const addTeam = () => {
    if (teams.length >= 4) return
    setTeams((ts) => [...ts, makeTeam(ts.length + 1)])
  }

  const removeTeam = (id: string) => {
    if (teams.length <= 2) return
    setTeams((ts) => ts.filter((t) => t.id !== id))
  }

  const reset = () => {
    setTeams((ts) => ts.map((t) => ({ ...t, sticks: 0 })))
    setSecondsLeft(ROUND_SECONDS)
    setPhase('setup')
  }

  const ranked = [...teams].sort((a, b) => b.sticks - a.sticks)
  const top = ranked.length > 0 ? ranked[0].sticks : 0

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Team stick race
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">
            {phase === 'setup' && 'Pick the skill and the teams'}
            {phase === 'live' && `${skill.label} — one minute, most sticks wins`}
            {phase === 'done' && `${skill.label} — results`}
          </h3>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
        >
          All games
        </button>
      </div>

      {phase === 'setup' && (
        <div className="mt-3 flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              The skill
            </p>
            <select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base font-semibold"
            >
              {STICK_RACE_SKILLS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Teams ({teams.length})
              </p>
              {teams.length < 4 && (
                <button
                  type="button"
                  onClick={addTeam}
                  className="text-xs font-semibold text-[var(--accent)]"
                >
                  + Add team
                </button>
              )}
            </div>
            <ul className="flex flex-col gap-2">
              {teams.map((t, i) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span className="w-6 text-center text-sm font-black text-white/40">{i + 1}</span>
                  <input
                    value={t.name}
                    onChange={(e) => rename(t.id, e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold"
                  />
                  {teams.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeTeam(t.id)}
                      className="text-sm font-bold text-white/40"
                      aria-label={`Remove ${t.name}`}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            disabled={teams.length < 2}
            onClick={start}
            className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black disabled:opacity-40"
          >
            Start — 1 minute on the clock
          </button>
          <p className="text-xs text-white/50">
            One person tallies per team. Tap +1 every time someone sticks the {skill.label.toLowerCase()}.
          </p>
        </div>
      )}

      {phase === 'live' && (
        <div className="mt-3 flex flex-col gap-4">
          <div className="text-center">
            <p
              className={`font-mono text-6xl font-black tabular-nums ${
                secondsLeft <= 10 ? 'text-red-400' : 'text-[var(--text)]'
              }`}
            >
              {secondsLeft}
            </p>
            <p className="mt-1 text-xs text-white/50">seconds left — {skill.label}</p>
          </div>
          <div className={`grid gap-3 ${teams.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {teams.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/25 p-3"
              >
                <p className="truncate text-center text-sm font-bold text-white/80">{t.name}</p>
                <p className="text-center font-mono text-5xl font-black tabular-nums">{t.sticks}</p>
                <button
                  type="button"
                  onClick={() => tally(t.id)}
                  className="rounded-2xl bg-[var(--accent)] px-4 py-4 text-xl font-black text-black active:scale-95"
                >
                  +1 stick
                </button>
                <button
                  type="button"
                  onClick={() => undo(t.id)}
                  disabled={t.sticks === 0}
                  className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/60 disabled:opacity-30"
                >
                  ↩ Undo last stick
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={endEarly}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/70"
          >
            End early
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="mt-3 flex flex-col gap-3">
          <ol className="flex flex-col gap-1.5">
            {ranked.map((t, i) => (
              <li
                key={t.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                  i === 0 && t.sticks === top && top > 0
                    ? 'bg-[var(--accent)]/20 ring-1 ring-[var(--accent)]'
                    : 'bg-black/25'
                }`}
              >
                <span className="w-6 text-center text-lg font-black text-[var(--accent)]">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-bold">{t.name}</span>
                {i === 0 && t.sticks === top && top > 0 && <span>🏆</span>}
                <span className="font-mono text-xl font-black tabular-nums">
                  {t.sticks} {t.sticks === 1 ? 'stick' : 'sticks'}
                </span>
              </li>
            ))}
          </ol>
          {top === 0 && <p className="text-sm text-white/50">No sticks this round — run it back.</p>}
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
          >
            Run it back
          </button>
        </div>
      )}
    </div>
  )
}
