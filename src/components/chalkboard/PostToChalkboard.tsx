import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { isCoachProfile } from '../../lib/profileRole'
import {
  boardsForClassType,
  boardsForOffering,
  ensureBoardForClassType,
  ensureBoardForOffering,
  postToChalkboard,
  subscribeChalkboards,
  type ChalkboardDraft,
  type ChalkboardScope,
  typeOfferingId,
} from '../../lib/chalkboard'
import {
  classLabel,
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
  const [typeKey, setTypeKey] = useState('')
  const [offeringId, setOfferingId] = useState('')
  const [scope, setScope] = useState<ChalkboardScope>('type')
  const [boardId, setBoardId] = useState('')
  const [pin, setPin] = useState(true)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => subscribeCoachClasses(() => setOfferings(loadOfferings())), [])
  useEffect(() => subscribeChalkboards(() => setOfferings(loadOfferings())), [])

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
    const live = getActiveMeeting()
    const liveOffering = live ? offerings.find((o) => o.id === live.offeringId) : null
    const first = liveOffering ?? offerings[0]
    if (!first) return
    setTypeKey((key) => key || classTypeKey(first.name))
    setOfferingId((id) => id || first.id)
    if (liveOffering) setScope('time')
  }, [offerings])

  if (!coach || !viewer) return null

  const selectedType = types.find((t) => t.key === typeKey)
  const boards =
    scope === 'type'
      ? boardsForClassType(selectedType?.name)
      : boardsForOffering(offeringId)
  const live = getActiveMeeting()

  const post = () => {
    if (!selectedType) {
      setNote('Add a class type first — Start class → Edit classes.')
      return
    }
    if (scope === 'time' && !offeringId) {
      setNote('Pick which class time this belongs on.')
      return
    }
    const targetId = scope === 'type' ? typeOfferingId(selectedType.name) : offeringId
    const board = boardId
      ? boards.find((b) => b.id === boardId)
      : scope === 'type'
        ? ensureBoardForClassType(selectedType.name, viewer.id)
        : ensureBoardForOffering(offeringId, viewer.id)
    const item = postToChalkboard({
      offeringId: targetId,
      boardId: board?.id,
      createdById: viewer.id,
      createdByName: viewer.name,
      pinned: pin,
      meetingId: live && scope === 'time' && live.offeringId === offeringId ? live.id : undefined,
      draft,
    })
    if (!item) {
      setNote('Could not post that to the chalkboard.')
      return
    }
    const hour = offerings.find((o) => o.id === offeringId)
    setNote(
      scope === 'type'
        ? `On every ${selectedType.name} chalkboard${pin ? ' — ready before class' : ''}.`
        : pin
          ? `Pinned on ${hour ? classLabel(hour) : selectedType.name} only.`
          : `Posted to ${hour ? classLabel(hour) : selectedType.name} only.`,
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
            {draft.title} · every {selectedType?.name || 'class'} time, or one hour only.
          </p>
          {offerings.length === 0 ? (
            <p className="text-xs text-[var(--bad)]">
              No class types yet. Add Connections, Elevate, or Reps w/ Logan under Start class.
            </p>
          ) : (
            <>
              <select
                value={typeKey}
                onChange={(e) => {
                  setTypeKey(e.target.value)
                  const nextTimes = offerings.filter((o) => classTypeKey(o.name) === e.target.value)
                  setOfferingId(nextTimes[0]?.id ?? '')
                  setBoardId('')
                }}
                className="h-10 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
              >
                {types.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScope('type')
                    setBoardId('')
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    scope === 'type'
                      ? 'bg-[var(--accent)] text-[#06281f]'
                      : 'border border-[var(--panel-border)] text-[var(--muted)]'
                  }`}
                >
                  All {selectedType?.name ?? 'class'} times
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScope('time')
                    setBoardId('')
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    scope === 'time'
                      ? 'bg-[var(--accent)] text-[#06281f]'
                      : 'border border-[var(--panel-border)] text-[var(--muted)]'
                  }`}
                >
                  One class time
                </button>
              </div>
              {scope === 'time' && (
                <select
                  value={offeringId}
                  onChange={(e) => {
                    setOfferingId(e.target.value)
                    setBoardId('')
                  }}
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
                Pin ahead of time — stays on the board even before class starts
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
