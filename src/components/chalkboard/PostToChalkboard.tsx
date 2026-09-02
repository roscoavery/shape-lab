import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import { isCoachProfile } from '../../lib/profileRole'
import {
  boardsForOffering,
  ensureBoardForOffering,
  postToChalkboard,
  subscribeChalkboards,
  type ChalkboardDraft,
} from '../../lib/chalkboard'
import {
  classLabel,
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
  const [offeringId, setOfferingId] = useState('')
  const [boardId, setBoardId] = useState('')
  const [pin, setPin] = useState(true)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => subscribeCoachClasses(() => setOfferings(loadOfferings())), [])
  useEffect(() => subscribeChalkboards(() => setOfferings(loadOfferings())), [])

  useEffect(() => {
    const live = getActiveMeeting()
    const first = live?.offeringId || offerings[0]?.id || ''
    setOfferingId((id) => id || first)
  }, [offerings])

  if (!coach || !viewer) return null

  const boards = boardsForOffering(offeringId)
  const live = getActiveMeeting()

  const post = () => {
    if (!offeringId) {
      setNote('Add a class type first — Start class → Edit classes.')
      return
    }
    const board = boardId
      ? boards.find((b) => b.id === boardId)
      : ensureBoardForOffering(offeringId, viewer.id)
    const item = postToChalkboard({
      offeringId,
      boardId: board?.id,
      createdById: viewer.id,
      createdByName: viewer.name,
      pinned: pin,
      meetingId: live?.offeringId === offeringId ? live.id : undefined,
      draft,
    })
    if (!item) {
      setNote('Could not post that to the chalkboard.')
      return
    }
    const offering = offerings.find((o) => o.id === offeringId)
    setNote(
      pin
        ? `Pinned on ${offering?.name ?? 'that class'} — it is ready before class starts.`
        : `Posted to ${offering?.name ?? 'that class'}. It shows while that class is running.`,
    )
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
            {draft.title} · pick the class type this belongs on.
          </p>
          {offerings.length === 0 ? (
            <p className="text-xs text-[var(--bad)]">
              No class types yet. Add Connections, Elevate, or Reps w/ Logan under Start class.
            </p>
          ) : (
            <>
              <select
                value={offeringId}
                onChange={(e) => {
                  setOfferingId(e.target.value)
                  setBoardId('')
                }}
                className="h-10 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
              >
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {classLabel(o)}
                    {live?.offeringId === o.id ? ' · live now' : ''}
                  </option>
                ))}
              </select>
              {boards.length > 1 && (
                <select
                  value={boardId}
                  onChange={(e) => setBoardId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
                >
                  <option value="">Active chalkboard</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.active ? ' · showing in class' : ''}
                    </option>
                  ))}
                </select>
              )}
              <label className="flex items-center gap-2 text-xs text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={pin}
                  onChange={(e) => setPin(e.target.checked)}
                />
                Pin ahead of time — stays on this class even before it starts
              </label>
              <button
                type="button"
                onClick={post}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[#06281f]"
              >
                Put on chalkboard
              </button>
            </>
          )}
        </div>
      )}
      {note && <p className="mt-1 text-[11px] text-[var(--muted)]">{note}</p>}
    </div>
  )
}
