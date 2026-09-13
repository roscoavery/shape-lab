import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { isCoachProfile } from '../../lib/profileRole'
import {
  boardPickerLabel,
  createBoard,
  createLibraryBoard,
  listAllBoards,
  postToChalkboard,
  subscribeChalkboards,
  type ChalkboardBoard,
  type ChalkboardDraft,
  typeOfferingId,
} from '../../lib/chalkboard'
import {
  classTypeKey,
  getActiveMeeting,
  loadOfferings,
  subscribeCoachClasses,
  type CoachClassOffering,
} from '../../lib/coachClasses'

type Props = {
  viewer: Athlete | null | undefined
  draft: ChalkboardDraft
  compact?: boolean
  /** Skip the toggle — show the class picker (used inside Share). */
  embedded?: boolean
}

export function PostToChalkboard({ viewer, draft, compact = false, embedded = false }: Props) {
  const coach = Boolean(viewer && isCoachProfile(viewer))
  const [open, setOpen] = useState(false)
  const [offerings, setOfferings] = useState<CoachClassOffering[]>(() => loadOfferings())
  const [tick, setTick] = useState(0)
  const [boardId, setBoardId] = useState('')
  const [newName, setNewName] = useState('')
  const [newWhere, setNewWhere] = useState<'library' | 'type' | 'time'>('library')
  const [typeKey, setTypeKey] = useState('')
  const [offeringId, setOfferingId] = useState('')
  const [pin, setPin] = useState(true)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => subscribeCoachClasses(() => setOfferings(loadOfferings())), [])
  useEffect(() => subscribeChalkboards(() => setTick((n) => n + 1)), [])

  const allBoards = useMemo(() => {
    void tick
    return listAllBoards()
  }, [tick])

  const types = useMemo(() => {
    const seen = new Map<string, string>()
    for (const o of offerings) {
      const key = classTypeKey(o.name)
      if (!seen.has(key)) seen.set(key, o.name)
    }
    return [...seen.entries()].map(([key, name]) => ({ key, name }))
  }, [offerings])

  const times = useMemo(
    () => offerings.filter((o) => classTypeKey(o.name) === typeKey),
    [offerings, typeKey],
  )

  useEffect(() => {
    const live = getActiveMeeting(viewer?.id)
    const liveOffering = live ? offerings.find((o) => o.id === live.offeringId) : null
    const first = liveOffering ?? offerings[0]
    if (!first) return
    setTypeKey((key) => key || classTypeKey(first.name))
    setOfferingId((id) => id || first.id)
  }, [offerings, viewer?.id])

  if (!coach || !viewer) return null

  const selectedType = types.find((t) => t.key === typeKey)
  const live = getActiveMeeting(viewer.id)

  const resolveTarget = (): { board: ChalkboardBoard; offeringId: string } | null => {
    if (boardId) {
      const board = allBoards.find((b) => b.id === boardId)
      return board ? { board, offeringId: board.offeringId } : null
    }
    const name = newName.trim()
    if (name) {
      if (newWhere === 'library') {
        const board = createLibraryBoard({ name, createdById: viewer.id, shapeId: draft.shapeId })
        return { board, offeringId: board.offeringId }
      }
      if (newWhere === 'type' && selectedType) {
        const board = createBoard({
          offeringId: typeOfferingId(selectedType.name),
          name,
          createdById: viewer.id,
          scope: 'type',
          classTypeKey: selectedType.key,
          makeActive: false,
        })
        return { board, offeringId: board.offeringId }
      }
      if (newWhere === 'time' && offeringId) {
        const board = createBoard({
          offeringId,
          name,
          createdById: viewer.id,
          scope: 'time',
          makeActive: false,
        })
        return { board, offeringId: board.offeringId }
      }
    }
    return null
  }

  const post = () => {
    const target = resolveTarget()
    if (!target) {
      setNote('Pick a chalkboard, or type a name to make a new skill board.')
      return
    }
    const item = postToChalkboard({
      offeringId: target.offeringId,
      boardId: target.board.id,
      createdById: viewer.id,
      createdByName: viewer.name,
      pinned: pin,
      meetingId: live && live.offeringId === target.offeringId ? live.id : undefined,
      draft,
    })
    if (!item) {
      setNote('Could not post that to the chalkboard.')
      return
    }
    setNote(`On ${boardPickerLabel(target.board, offerings)}${pin ? ' — pinned' : ''}.`)
    setNewName('')
    setBoardId(target.board.id)
    setOpen(false)
  }

  const formOpen = embedded || open

  return (
    <div className={compact ? '' : 'space-y-1'}>
      {!embedded && (
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v)
            setNote(null)
          }}
          className={
            compact
              ? 'rounded-md border border-[var(--panel-border)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)]'
              : 'rounded-lg border border-[var(--accent)]/40 bg-[#102820] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]'
          }
        >
          {open ? 'Cancel chalkboard' : 'Post to chalkboard'}
        </button>
      )}
      {formOpen && (
        <div className="mt-2 space-y-2 rounded-xl border border-[var(--panel-border)] bg-[#0d1218] p-3">
          <p className="text-[11px] text-[var(--muted)]">
            {draft.title} · any existing chalkboard, or make a new skill board right here.
          </p>
          {allBoards.length > 0 && (
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Existing chalkboard
              </span>
              <select
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
              >
                <option value="">Choose a board…</option>
                {allBoards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {boardPickerLabel(b, offerings)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="space-y-2 rounded-lg border border-white/10 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Or create a new chalkboard
            </p>
            <input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                if (e.target.value.trim()) setBoardId('')
              }}
              placeholder="Name — e.g. Valeri, whip, handstand hold"
              className="h-10 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['library', 'Skill library'],
                  ['type', 'Every class time'],
                  ['time', 'One class time'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setNewWhere(id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    newWhere === id
                      ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                      : 'border border-[var(--panel-border)] text-[var(--muted)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {newWhere !== 'library' && offerings.length === 0 && (
              <p className="text-xs text-[var(--bad)]">
                No class types yet. Add one under Start class, or keep this as a skill board.
              </p>
            )}
            {newWhere !== 'library' && offerings.length > 0 && (
              <select
                value={typeKey}
                onChange={(e) => {
                  setTypeKey(e.target.value)
                  const nextTimes = offerings.filter((o) => classTypeKey(o.name) === e.target.value)
                  setOfferingId(nextTimes[0]?.id ?? '')
                }}
                className="h-10 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
              >
                {types.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            {newWhere === 'time' && (
              <select
                value={offeringId}
                onChange={(e) => setOfferingId(e.target.value)}
                className="h-10 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
              >
                {times.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.weekday} {o.time}
                    {live?.offeringId === o.id ? ' · live now' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--text)]">
            <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} />
            Pin — stays on the board even before class starts
          </label>
          <button
            type="button"
            onClick={post}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--on-accent)]"
          >
            Put on chalkboard
          </button>
        </div>
      )}
      {note && <p className="mt-1 text-[11px] text-[var(--muted)]">{note}</p>}
    </div>
  )
}
