import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import { isCoachProfile } from '../../lib/profileRole'
import {
  boardPickerLabel,
  boardsForLibrary,
  createLibraryBoard,
  listAllBoards,
  removeBoard,
  subscribeChalkboards,
  type ChalkboardBoard,
} from '../../lib/chalkboard'
import { loadOfferings } from '../../lib/coachClasses'
import { publishTextPost } from '../../lib/feedPosts'
import { ChalkboardPanel } from './ChalkboardPanel'

type Props = {
  viewer: Athlete | null
  onOpenLibrary?: () => void
  embed?: boolean
}

export function TodayChalkboards({ viewer, onOpenLibrary, embed = false }: Props) {
  const coach = Boolean(viewer && isCoachProfile(viewer))
  const [tick, setTick] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => subscribeChalkboards(() => setTick((n) => n + 1)), [])
  void tick

  const library = boardsForLibrary()
  const others = listAllBoards().filter((b) => !library.some((row) => row.id === b.id))
  const offerings = loadOfferings()

  const makeBoard = () => {
    if (!viewer || !coach) return
    const name = newName.trim()
    if (!name) {
      setNote('Name the skill board first — e.g. Valeri or whip.')
      return
    }
    const board = createLibraryBoard({ name, createdById: viewer.id })
    setNewName('')
    setOpenId(board.id)
    setNote(`Created ${board.name}. Share reels onto it from any clip.`)
  }

  const shareBoard = async (board: ChalkboardBoard) => {
    if (!viewer || !coach) return
    const lines = board.items
      .slice(0, 8)
      .map((item) => item.title)
      .filter(Boolean)
    const caption = [`Chalkboard · ${board.name}`, lines.length ? lines.join(' · ') : 'Open Team → Collages to run this board.']
      .filter(Boolean)
      .join('\n')
    const posted = await publishTextPost({
      authorId: viewer.id,
      caption,
      taggedIds: [],
      channels: ['gym'],
    })
    setNote(posted ? `Posted “${board.name}” to the gym feed.` : 'Could not post that chalkboard.')
  }

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        {!embed ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Skill boards
            </p>
            <h3 className="text-lg font-semibold">Chalkboards</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Make a board for a skill, then open it in any class or lesson. Share reels onto it the same way you share a collage.
            </p>
          </div>
        ) : (
          <p className="text-sm text-white/55">
            Skill chalkboards live next to collages. Open one during class from the picker.
          </p>
        )}
        {onOpenLibrary && (
          <button
            type="button"
            onClick={onOpenLibrary}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--on-accent)]"
          >
            Open library
          </button>
        )}
      </div>

      {coach && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New skill chalkboard"
            className="h-10 min-w-[12rem] flex-1 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
          />
          <button
            type="button"
            onClick={makeBoard}
            className="rounded-lg bg-[var(--accent-dim)] px-3 text-xs font-semibold text-white"
          >
            Create
          </button>
        </div>
      )}
      {note && <p className="mt-2 text-xs text-[var(--accent)]">{note}</p>}

      {library.length === 0 && others.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          No chalkboards yet. Create a skill board, or post a reel to a class board from Share.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {library.map((board) => (
            <li
              key={board.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{board.name}</p>
                <p className="text-[11px] text-[var(--muted)]">
                  Skill · {board.items.length} pin{board.items.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOpenId(board.id)}
                  className="text-[11px] font-semibold text-[var(--accent)]"
                >
                  Open
                </button>
                {coach && (
                  <>
                    <button
                      type="button"
                      onClick={() => void shareBoard(board)}
                      className="text-[11px] font-semibold text-[var(--accent)]"
                    >
                      Post to feed
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete “${board.name}”?`)) removeBoard(board.id)
                      }}
                      className="text-[11px] font-semibold text-[var(--bad)]"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
          {others.slice(0, embed ? 4 : 12).map((board) => (
            <li
              key={board.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0d1218] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{board.name}</p>
                <p className="text-[11px] text-[var(--muted)]">{boardPickerLabel(board, offerings)}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(board.id)}
                className="text-[11px] font-semibold text-[var(--accent)]"
              >
                View
              </button>
            </li>
          ))}
        </ul>
      )}

      {openId && (
        <div className="mt-4">
          <ChalkboardPanel viewer={viewer} openBoardId={openId} embed />
        </div>
      )}
    </>
  )

  if (embed) return <div>{body}</div>
  return <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">{body}</section>
}
