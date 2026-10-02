import { useMemo, useState, type ReactNode } from 'react'
import type { Athlete } from '../../types'
import {
  addGameToRoom,
  addRoom,
  deleteRoom,
  gameRooms,
  gamesInRoom,
  getGameNotes,
  listRooms,
  moveGameToRoom,
  removeGameFromRoom,
  renameRoom,
  saveGameNotes,
  unplacedGames,
  type ArcadeGameDef,
  type ArcadeRoom,
  type GameVerdict,
} from '../../lib/arcade'
import { StickItGame } from './StickItGame'
import { DistanceGame } from './DistanceGame'
import { TeamStickRaceGame } from './TeamStickRaceGame'
import { ContestStopwatch } from '../today/ContestStopwatch'
import { CueQuestGame } from './lab/CueQuestGame'
import { MemoryMatsGame } from './lab/MemoryMatsGame'
import { ShapePasswordGame } from './lab/ShapePasswordGame'
import { CoachesEyeGame } from './lab/CoachesEyeGame'
import { SequenceMemoryGame } from './lab/SequenceMemoryGame'
import { BuildASkillGame } from './lab/BuildASkillGame'
import { SpotDifferenceGame } from './lab/SpotDifferenceGame'
import { TwistDetectiveGame } from './lab/TwistDetectiveGame'
import { PhysicsPlaygroundGame } from './lab/PhysicsPlaygroundGame'
import { TeamPowerUpGame } from './lab/TeamPowerUpGame'

/**
 * Tumbling Arcade hub — rooms of games.
 * Main Room is for everyone; the Experimental Lab (and any custom rooms)
 * are coach-only. Coaches move games between rooms and leave testing notes.
 */

function GameLabels({ g }: { g: ArcadeGameDef }) {
  const labels: string[] = []
  if (g.contentStatus === 'draft') labels.push('Draft content')
  if (g.atHome) labels.push('At home')
  if (g.stationSuitable) labels.push('Station')
  if (g.inputModes?.includes('manual')) labels.push('Manual scoring')
  if (!labels.length) return null
  return (
    <span className="mt-2 flex flex-wrap gap-1.5">
      {labels.map((l) => (
        <span
          key={l}
          className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/60"
        >
          {l}
        </span>
      ))}
    </span>
  )
}

function NotesPanel({ gameId, onDone }: { gameId: string; onDone: () => void }) {
  const existing = getGameNotes(gameId)
  const [fun, setFun] = useState(existing.fun)
  const [usefulness, setUsefulness] = useState(existing.usefulness)
  const [verdict, setVerdict] = useState<GameVerdict>(existing.verdict)
  const [text, setText] = useState(existing.text)

  return (
    <div className="mt-3 rounded-xl bg-black/30 p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-white/60">Testing notes</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="text-xs text-white/60">
          Fun: {fun}/5
          <input
            type="range"
            min={1}
            max={5}
            value={fun}
            onChange={(e) => setFun(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-xs text-white/60">
          Usefulness: {usefulness}/5
          <input
            type="range"
            min={1}
            max={5}
            value={usefulness}
            onChange={(e) => setUsefulness(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(['undecided', 'keep', 'revise', 'archive'] as GameVerdict[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVerdict(v)}
            className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
              verdict === v ? 'bg-[var(--accent)] text-black' : 'bg-white/10 text-white/60'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What worked, what didn't, station readiness…"
        rows={2}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => {
            saveGameNotes(gameId, { fun, usefulness, verdict, text })
            onDone()
          }}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-black text-black"
        >
          Save notes
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function GameCard({
  g,
  coach,
  rooms,
  currentRoomId,
  onOpen,
  onChanged,
}: {
  g: ArcadeGameDef
  coach: boolean
  rooms: ArcadeRoom[]
  currentRoomId: string
  onOpen: () => void
  onChanged: () => void
}) {
  const [notesOpen, setNotesOpen] = useState(false)
  const notes = getGameNotes(g.id)
  const otherRooms = rooms.filter((r) => r.id !== 'main' && r.id !== 'lab')
  const inRooms = gameRooms(g.id)

  return (
    <div className="sl-card p-5">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Play now
        </span>
        <span className="mt-1 block text-lg font-black tracking-tight">{g.name}</span>
        <span className="mt-1 block text-sm text-[var(--muted)]">{g.tagline}</span>
      </button>
      <GameLabels g={g} />
      {coach && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          {inRooms.length > 1 &&
            inRooms.map((rid) => {
              const r = rooms.find((x) => x.id === rid)
              if (!r || rid === currentRoomId) return null
              return (
                <span
                  key={rid}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/60"
                >
                  {r.name}
                  <button
                    type="button"
                    aria-label={`Remove ${g.name} from ${r.name}`}
                    onClick={() => {
                      removeGameFromRoom(g.id, rid)
                      onChanged()
                    }}
                    className="font-bold text-white/40"
                  >
                    ✕
                  </button>
                </span>
              )
            })}
          <select
            aria-label={`Move ${g.name} to room`}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                moveGameToRoom(g.id, e.target.value)
                onChanged()
              }
              e.target.value = ''
            }}
            className="rounded-lg bg-white/10 px-2 py-1.5 text-xs font-semibold"
          >
            <option value="">Move to room…</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {otherRooms.length > 0 && (
            <select
              aria-label={`Also add ${g.name} to room`}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  addGameToRoom(g.id, e.target.value)
                  onChanged()
                }
                e.target.value = ''
              }}
              className="rounded-lg bg-white/10 px-2 py-1.5 text-xs font-semibold"
            >
              <option value="">Also in…</option>
              {otherRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            className="rounded-lg bg-white/10 px-2 py-1.5 text-xs font-semibold"
          >
            📝 Notes{notes.verdict !== 'undecided' ? ` · ${notes.verdict}` : ''}
          </button>
        </div>
      )}
      {notesOpen && <NotesPanel gameId={g.id} onDone={() => { setNotesOpen(false); onChanged() }} />}
    </div>
  )
}

function RoomManager({ rooms, onChanged }: { rooms: ArcadeRoom[]; onChanged: () => void }) {
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-white/60">Rooms</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {rooms.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            {renaming === r.id ? (
              <>
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    renameRoom(r.id, renameValue)
                    setRenaming(null)
                    onChanged()
                  }}
                  className="text-xs font-bold text-[var(--accent)]"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 truncate">
                  {r.name}
                  {r.builtin && <span className="ml-2 text-[10px] uppercase text-white/40">built-in</span>}
                </span>
                {!r.builtin && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRenaming(r.id)
                        setRenameValue(r.name)
                      }}
                      className="text-xs font-semibold text-white/50"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteRoom(r.id)
                        onChanged()
                      }}
                      className="text-xs font-semibold text-red-300/70"
                    >
                      Delete
                    </button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New room name…"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            if (!name.trim()) return
            addRoom(name.trim())
            setName('')
            onChanged()
          }}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"
        >
          Add room
        </button>
      </div>
    </div>
  )
}

export function ArcadeHub({
  athletes,
  coach,
  onClose,
}: {
  athletes: Athlete[]
  coach: boolean
  onClose: () => void
}) {
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [roomId, setRoomId] = useState('main')
  const [refresh, setRefresh] = useState(0)
  const [managingRooms, setManagingRooms] = useState(false)

  const rooms = useMemo(() => listRooms(), [refresh])
  const visibleRooms = rooms.filter((r) => coach || r.id === 'main')
  const room = visibleRooms.find((r) => r.id === roomId) ?? visibleRooms[0]
  const games = useMemo(() => gamesInRoom(room?.id ?? 'main'), [room, refresh])
  const comingSoon = room?.id === 'main' ? unplacedGames() : []

  if (activeGame === 'stick-it') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <StickItGame athletes={athletes} onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  if (activeGame === 'distance') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <DistanceGame athletes={athletes} onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  if (activeGame === 'team-sticks') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <TeamStickRaceGame onExit={() => setActiveGame(null)} />
      </div>
    )
  }

  if (activeGame === 'hold-contest') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Tumbling arcade
            </p>
            <h2 className="text-xl font-black">Hold Contest</h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveGame(null)}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
          >
            All games
          </button>
        </div>
        <ContestStopwatch athletes={athletes} signedIn={null} />
      </div>
    )
  }

  const labGames: Record<string, () => ReactNode> = {
    'cue-quest': () => <CueQuestGame onExit={() => setActiveGame(null)} />,
    'memory-mats': () => <MemoryMatsGame onExit={() => setActiveGame(null)} />,
    'shape-password': () => <ShapePasswordGame onExit={() => setActiveGame(null)} />,
    'coachs-eye': () => <CoachesEyeGame onExit={() => setActiveGame(null)} />,
    'sequence-memory': () => <SequenceMemoryGame onExit={() => setActiveGame(null)} />,
    'build-a-skill': () => <BuildASkillGame onExit={() => setActiveGame(null)} />,
    'spot-difference': () => <SpotDifferenceGame onExit={() => setActiveGame(null)} />,
    'twist-detective': () => <TwistDetectiveGame onExit={() => setActiveGame(null)} />,
    'physics-playground': () => <PhysicsPlaygroundGame onExit={() => setActiveGame(null)} />,
    'team-power-up': () => <TeamPowerUpGame onExit={() => setActiveGame(null)} />,
  }
  if (activeGame && labGames[activeGame]) {
    return <div className="mx-auto w-full max-w-2xl px-4 py-6">{labGames[activeGame]()}</div>
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {coach ? 'Admin' : 'Games'}
          </p>
          <h2 className="text-2xl font-black">Tumbling Arcade</h2>
          <p className="mt-1 text-sm text-white/55">
            {room?.id === 'lab'
              ? 'Coach testing room — try games here before they go anywhere else.'
              : 'Class games with scoring built in. Pick a game to run it.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
        >
          Close
        </button>
      </div>

      {visibleRooms.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {visibleRooms.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoomId(r.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                room?.id === r.id ? 'bg-[var(--accent)] text-black' : 'bg-white/10 text-white/70'
              }`}
            >
              {r.id === 'lab' ? '🧪 ' : ''}
              {r.name}
            </button>
          ))}
          {coach && (
            <button
              type="button"
              onClick={() => setManagingRooms((m) => !m)}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/60"
            >
              {managingRooms ? 'Done' : 'Manage rooms'}
            </button>
          )}
        </div>
      )}

      {coach && managingRooms && (
        <RoomManager rooms={rooms} onChanged={() => setRefresh((n) => n + 1)} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {games.map((g) => (
          <GameCard
            key={g.id}
            g={g}
            coach={coach}
            rooms={rooms}
            currentRoomId={room?.id ?? 'main'}
            onOpen={() => setActiveGame(g.id)}
            onChanged={() => setRefresh((n) => n + 1)}
          />
        ))}
      </div>

      {comingSoon.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            Coming soon
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {comingSoon.map((g) => (
              <div key={g.id} className="sl-card p-5 opacity-50">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  Coming soon
                </span>
                <span className="mt-1 block text-lg font-black tracking-tight">{g.name}</span>
                <span className="mt-1 block text-sm text-[var(--muted)]">{g.tagline}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {room?.id === 'lab' && games.length === 0 && (
        <p className="text-sm text-white/50">
          No games in the lab right now — move one here to test it.
        </p>
      )}
    </div>
  )
}
