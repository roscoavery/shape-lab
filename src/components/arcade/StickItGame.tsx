import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteSearchField } from '../today/AthleteSearchField'
import {
  STICK_IT_LETTERS,
  STICK_IT_SKILLS,
  saveArcadeRecord,
  stickItActive,
  stickItCurrent,
  stickItIsOut,
  stickItLeaderboard,
  type StickItPlayer,
  type StickItSkillId,
} from '../../lib/arcade'
import { KindLeaderboard } from './KindLeaderboard'

type Phase = 'setup' | 'play' | 'done'

function Letters({ count }: { count: number }) {
  return (
    <div className="flex gap-1.5">
      {STICK_IT_LETTERS.map((L, i) => (
        <span
          key={L}
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg font-black ${
            i < count ? 'bg-red-500/80 text-white' : 'bg-white/10 text-white/30'
          }`}
        >
          {L}
        </span>
      ))}
    </div>
  )
}

export function StickItGame({ athletes, onExit }: { athletes: Athlete[]; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [skillId, setSkillId] = useState<StickItSkillId>('perfect-cartwheel')
  const [mode, setMode] = useState<'single' | 'handicap' | 'rotate'>('single')
  const [roundSkillId, setRoundSkillId] = useState<StickItSkillId>('perfect-cartwheel')
  const [players, setPlayers] = useState<StickItPlayer[]>([])
  const [query, setQuery] = useState('')
  const [guestName, setGuestName] = useState('')
  const [turn, setTurn] = useState(0)
  const [showBoard, setShowBoard] = useState(false)
  const [board, setBoard] = useState<ReturnType<typeof stickItLeaderboard>>([])

  const skill = STICK_IT_SKILLS.find((s) => s.id === skillId) ?? STICK_IT_SKILLS[0]

  const addAthlete = (a: Athlete) => {
    if (players.some((p) => p.id === a.id)) return
    setPlayers((ps) => [...ps, { id: a.id, name: a.name, athleteId: a.id, letters: 0 }])
    setQuery('')
  }

  const addGuest = () => {
    const name = guestName.trim()
    if (!name) return
    const id = `guest:${name.toLowerCase()}`
    if (players.some((p) => p.id === id)) return
    setPlayers((ps) => [...ps, { id, name, letters: 0 }])
    setGuestName('')
  }

  const removePlayer = (id: string) => setPlayers((ps) => ps.filter((p) => p.id !== id))

  const startGame = () => {
    if (players.length < 2) return
    setTurn(0)
    setPhase('play')
  }

  const active = useMemo(() => stickItActive(players), [players])
  const current = phase === 'play' ? stickItCurrent(players, turn) : null
  const winner = phase === 'done' ? active[0] ?? null : null

  const skillLabelFor = (p: StickItPlayer): string => {
    if (mode === 'handicap') {
      const s = STICK_IT_SKILLS.find((x) => x.id === (p.skillId ?? skillId))
      return s?.label ?? skill.label
    }
    if (mode === 'rotate') {
      const s = STICK_IT_SKILLS.find((x) => x.id === roundSkillId)
      return s?.label ?? skill.label
    }
    return skill.label
  }

  /** Quick-change the skill mid-game without leaving the play screen. */
  const currentSkillId = current
    ? mode === 'handicap'
      ? (current.skillId ?? skillId)
      : mode === 'rotate'
        ? roundSkillId
        : skillId
    : skillId
  const setCurrentSkill = (id: StickItSkillId) => {
    if (!current) return
    if (mode === 'handicap') {
      setPlayers((ps) => ps.map((x) => (x.id === current.id ? { ...x, skillId: id } : x)))
    } else if (mode === 'rotate') {
      setRoundSkillId(id)
    } else {
      setSkillId(id)
    }
  }

  const advance = (next: StickItPlayer[]) => {
    const stillActive = stickItActive(next)
    if (stillActive.length <= 1) {
      // Game over — record the win.
      const w = stillActive[0]
      if (w) {
        saveArcadeRecord({
          gameId: 'stick-it',
          skillLabel: mode === 'single' ? skill.label : mode === 'handicap' ? 'handicap' : 'rotating',
          playerNames: next.map((p) => p.name),
          winnerName: w.name,
          winnerAthleteId: w.athleteId,
        })
      }
      setPlayers(next)
      setBoard(stickItLeaderboard())
      setPhase('done')
    } else {
      setPlayers(next)
      setTurn((t) => t + 1)
    }
  }

  const stuckIt = () => {
    if (!current) return
    advance(players)
  }

  const missed = () => {
    if (!current) return
    const next = players.map((p) =>
      p.id === current.id ? { ...p, letters: Math.min(p.letters + 1, STICK_IT_LETTERS.length) } : p,
    )
    advance(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Tumbling arcade
          </p>
          <h2 className="text-xl font-black">Stick It</h2>
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
        <>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Skill mode
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['single', 'One skill', 'Everyone, all game'],
                  ['handicap', 'Handicap', 'Each player\'s own'],
                  ['rotate', 'Rotate', 'New skill each round'],
                ] as const
              ).map(([m, label, sub]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-xl border px-3 py-2.5 text-left ${
                    mode === m
                      ? 'border-[var(--accent)] bg-[var(--accent)]/15'
                      : 'border-white/10 bg-black/30'
                  }`}
                >
                  <span className="block text-sm font-bold">{label}</span>
                  <span className="block text-[10px] text-white/50">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {mode !== 'rotate' && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                {mode === 'handicap' ? 'Default skill' : 'The skill'}
              </p>
              <select
                value={skillId}
                onChange={(e) => setSkillId(e.target.value as StickItSkillId)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base font-semibold"
              >
                {STICK_IT_SKILLS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Who's playing ({players.length})
            </p>
            <AthleteSearchField
              athletes={athletes}
              query={query}
              onQuery={setQuery}
              onPick={addAthlete}
              excludeIds={players.map((p) => p.id)}
              placeholder="Type an athlete's name…"
              anyRole
            />
            <div className="mt-2 flex gap-2">
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                placeholder="Guest name (no profile needed)"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addGuest}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"
              >
                Add guest
              </button>
            </div>
            {players.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-xl bg-black/25 px-3 py-2"
                  >
                    <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                    {mode === 'handicap' && (
                      <select
                        value={p.skillId ?? skillId}
                        onChange={(e) =>
                          setPlayers((ps) =>
                            ps.map((x) =>
                              x.id === p.id ? { ...x, skillId: e.target.value as StickItSkillId } : x,
                            ),
                          )
                        }
                        className="max-w-[140px] truncate rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs"
                        aria-label={`${p.name}'s skill`}
                      >
                        {STICK_IT_SKILLS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {p.athleteId == null && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                        Guest
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePlayer(p.id)}
                      className="text-sm font-bold text-white/40"
                      aria-label={`Remove ${p.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            disabled={players.length < 2}
            onClick={() => {
              if (mode === 'rotate') setRoundSkillId(skillId)
              startGame()
            }}
            className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black disabled:opacity-40"
          >
            Start — {mode === 'rotate' ? 'rotating skills' : skill.label}
          </button>
          <p className="text-center text-xs text-white/45">
            Need at least 2 players. Take turns doing the skill — miss and you earn a letter.
          </p>
        </>
      )}

      {phase === 'play' && current && (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Up now</p>
            <p className="mt-1 text-3xl font-black">{current.name}</p>
            <div className="mx-auto mt-3 max-w-[260px]">
              <select
                value={currentSkillId}
                onChange={(e) => setCurrentSkill(e.target.value as StickItSkillId)}
                className="w-full rounded-xl border border-[var(--accent)]/40 bg-black/40 px-3 py-2.5 text-center text-base font-bold"
                aria-label={
                  mode === 'handicap'
                    ? `${current.name}'s skill — tap to change`
                    : 'Skill — tap to change'
                }
              >
                {STICK_IT_SKILLS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-white/40">
                {mode === 'handicap'
                  ? `tap to change ${current.name.split(' ')[0]}'s skill`
                  : mode === 'rotate'
                    ? 'tap to change this round\u2019s skill'
                    : 'tap to change the skill'}
              </p>
            </div>
            <div className="mt-3 flex justify-center">
              <Letters count={current.letters} />
            </div>
            {current.letters > 0 && (
              <p className="mt-2 text-xs text-white/50">
                {STICK_IT_LETTERS.length - current.letters}{' '}
                {STICK_IT_LETTERS.length - current.letters === 1 ? 'miss' : 'misses'} left
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={stuckIt}
              className="rounded-2xl bg-emerald-500 px-4 py-5 text-lg font-black text-black"
            >
              Stuck it ✓
            </button>
            <button
              type="button"
              onClick={missed}
              className="rounded-2xl bg-red-500/90 px-4 py-5 text-lg font-black text-white"
            >
              Missed — letter
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Still in ({active.length})
            </p>
            <ul className="flex flex-col gap-1.5">
              {players.map((p) => {
                const out = stickItIsOut(p)
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                      out ? 'bg-black/20 opacity-40' : 'bg-black/25'
                    } ${p.id === current.id ? 'ring-1 ring-[var(--accent)]' : ''}`}
                  >
                    <span className="flex-1 truncate text-sm font-medium">
                      {p.name}
                      {mode === 'handicap' && (
                        <span className="ml-2 text-xs text-white/40">{skillLabelFor(p)}</span>
                      )}
                      {out && <span className="ml-2 text-xs text-white/40">out</span>}
                    </span>
                    <Letters count={p.letters} />
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}

      {phase === 'done' && (
        <>
          <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-6 text-center">
            <p className="text-4xl">🏆</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Last one standing
            </p>
            <p className="mt-1 text-3xl font-black">{winner?.name ?? '—'}</p>
            <p className="mt-1 text-sm text-white/60">
              {mode === 'single' ? skill.label : mode === 'handicap' ? 'handicap game' : 'rotating skills'}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Stick It leaderboard
              </p>
              <button
                type="button"
                onClick={() => {
                  setBoard(stickItLeaderboard())
                  setShowBoard((s) => !s)
                }}
                className="text-xs font-semibold text-[var(--accent)]"
              >
                {showBoard ? 'Hide' : 'Show'}
              </button>
            </div>
            {showBoard && <KindLeaderboard entries={board} scoreLabel="wins" />}
          </div>

          <button
            type="button"
            onClick={() => {
              setPlayers((ps) => ps.map((p) => ({ ...p, letters: 0 })))
              setTurn(0)
              setPhase('setup')
            }}
            className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black"
          >
            Play again
          </button>
        </>
      )}
    </div>
  )
}
