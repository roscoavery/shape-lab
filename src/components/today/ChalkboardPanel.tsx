import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Athlete } from '../../types'
import { isCoachProfile } from '../../lib/profileRole'
import {
  activeBoardForClassType,
  activeBoardForOffering,
  boardsForClassType,
  boardsForOffering,
  createBoard,
  eraseChalkboardItem,
  itemsForOfferingHour,
  kindLabel,
  pinChalkboardItem,
  postToChalkboard,
  removeBoard,
  renameBoard,
  setActiveBoard,
  subscribeChalkboards,
  type ChalkboardBoard,
  type ChalkboardItem,
  type ChalkboardScope,
  typeOfferingId,
} from '../../lib/chalkboard'
import {
  classLabel,
  classTypeKey,
  getActiveMeeting,
  getOffering,
  loadOfferings,
  subscribeCoachClasses,
  type CoachClassOffering,
} from '../../lib/coachClasses'
import { listDrills } from '../../lib/coachContentStore'
import { listCollages } from '../../lib/collages'
import { GymClipPlayer } from '../GymClipPlayer'
import { CroppedStill } from '../CroppedStill'
import { PortraitVideoPlayer } from '../PortraitVideoPlayer'
import { CollageStage } from '../classes/CollageStage'
import { useGymLibrary } from '../../lib/gymLibrary'

type Size = 'compact' | 'more' | 'full'

type Props = {
  viewer: Athlete | null
  /** When set, always edit this class type (class session). */
  offeringId?: string | null
  /** Compact strip on Today; coaches can still prepare boards when class is not live. */
  onToday?: boolean
  /** Body only — Today dock supplies the title. */
  embed?: boolean
}

export function ChalkboardPanel({ viewer, offeringId = null, onToday = false, embed = false }: Props) {
  const coach = Boolean(viewer && isCoachProfile(viewer))
  const [tick, setTick] = useState(0)
  const [size, setSize] = useState<Size>(embed ? 'more' : 'compact')
  const [offerings, setOfferings] = useState(() => loadOfferings())
  const [pickOffering, setPickOffering] = useState(offeringId ?? '')
  const [newName, setNewName] = useState('')
  const [rename, setRename] = useState('')
  const [drillPick, setDrillPick] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<ChalkboardScope>('time')

  useEffect(() => subscribeChalkboards(() => setTick((n) => n + 1)), [])
  useEffect(() => subscribeCoachClasses(() => setOfferings(loadOfferings())), [])
  void tick

  const live = getActiveMeeting()
  const liveOffering = live ? getOffering(live.offeringId) : null
  const targetId = offeringId || pickOffering || live?.offeringId || offerings[0]?.id || ''
  const offering = offerings.find((o) => o.id === targetId) ?? liveOffering
  const board =
    editTarget === 'type'
      ? activeBoardForClassType(offering?.name)
      : activeBoardForOffering(targetId)
  const boards =
    editTarget === 'type'
      ? boardsForClassType(offering?.name)
      : boardsForOffering(targetId)
  const inSession = Boolean(live && live.offeringId === targetId)
  const tagged = itemsForOfferingHour(offering, inSession || !onToday)
  const visible = size === 'compact' ? tagged.slice(0, 2) : tagged

  if (!coach && !inSession) return null
  if (!offering && offerings.length === 0) {
    if (!coach) return null
    return (
      <section className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
        Add a class type (name and time) under Start class — then you can pin work on its chalkboard.
      </section>
    )
  }

  const body = (
    <ChalkboardBody
      viewer={viewer}
      coach={coach}
      offering={offering ?? null}
      offerings={offerings}
      board={board}
      boards={boards}
      items={visible}
      allCount={tagged.length}
      editTarget={editTarget}
      onEditTarget={setEditTarget}
      inSession={inSession}
      size={size}
      pickOffering={targetId}
      onPickOffering={(id) => setPickOffering(id)}
      newName={newName}
      onNewName={setNewName}
      rename={rename}
      onRename={setRename}
      drillPick={drillPick}
      onDrillPick={setDrillPick}
      notice={notice}
      onNotice={setNotice}
      hideOfferingSelect={Boolean(offeringId)}
    />
  )

  if (size === 'full') {
    return createPortal(
      <div className="fixed inset-0 z-[80] flex flex-col bg-[#07110e] text-[var(--text)]">
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Chalkboard
            </p>
            <p className="text-lg font-bold">{offering ? classLabel(offering) : 'Class'}</p>
          </div>
          <button
            type="button"
            onClick={() => setSize('more')}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
          >
            Show less
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">{body}</div>
      </div>,
      document.body,
    )
  }

  const sizeButtons = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setSize(size === 'compact' ? 'more' : 'compact')}
        className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold"
      >
        {size === 'compact' ? 'Show more' : 'Show less'}
      </button>
      <button
        type="button"
        onClick={() => setSize('full')}
        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[#06281f]"
      >
        Full screen
      </button>
    </div>
  )

  if (embed) {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm text-white/55">
            {offering ? offering.name : 'Chalkboard'}
            {inSession ? ' · live' : ''}
          </p>
          {sizeButtons}
        </div>
        {body}
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            {inSession ? 'Class chalkboard' : 'Prepare chalkboard'}
          </p>
          <h3 className="text-lg font-semibold">
            {offering ? offering.name : 'Chalkboard'}
            {inSession ? ' · live' : ''}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {inSession
              ? 'Shared pins for every class with this name, plus pins for this hour only.'
              : 'Pin work for every Connections time, or only this class time. It opens here when that class is running.'}
          </p>
        </div>
        {sizeButtons}
      </div>
      {body}
    </section>
  )
}

function ChalkboardBody({
  viewer,
  coach,
  offering,
  offerings,
  board,
  boards,
  items,
  allCount,
  inSession,
  size,
  pickOffering,
  onPickOffering,
  newName,
  onNewName,
  rename,
  onRename,
  drillPick,
  onDrillPick,
  notice,
  onNotice,
  hideOfferingSelect,
  editTarget,
  onEditTarget,
}: {
  viewer: Athlete | null
  coach: boolean
  offering: CoachClassOffering | null
  offerings: CoachClassOffering[]
  board: ChalkboardBoard | null
  boards: ChalkboardBoard[]
  items: { item: ChalkboardItem; source: ChalkboardScope }[]
  allCount: number
  inSession: boolean
  size: Size
  pickOffering: string
  onPickOffering: (id: string) => void
  newName: string
  onNewName: (v: string) => void
  rename: string
  onRename: (v: string) => void
  drillPick: string[]
  onDrillPick: (ids: string[]) => void
  notice: string | null
  onNotice: (v: string | null) => void
  hideOfferingSelect: boolean
  editTarget: ChalkboardScope
  onEditTarget: (scope: ChalkboardScope) => void
}) {
  const drills = listDrills()
  const compact = size === 'compact'

  return (
    <div className={compact ? 'mt-3 space-y-3' : 'mt-4 space-y-4'}>
      {coach && !hideOfferingSelect && offerings.length > 0 && (
        <select
          value={pickOffering}
          onChange={(e) => onPickOffering(e.target.value)}
          className="h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 text-sm"
        >
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>
              {classLabel(o)}
            </option>
          ))}
        </select>
      )}

      {coach && offering && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEditTarget('type')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              editTarget === 'type'
                ? 'bg-[var(--accent)] text-[#06281f]'
                : 'border border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            All {offering.name} times
          </button>
          <button
            type="button"
            onClick={() => onEditTarget('time')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              editTarget === 'time'
                ? 'bg-[var(--accent)] text-[#06281f]'
                : 'border border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            This hour only · {offering.weekday} {offering.time}
          </button>
        </div>
      )}

      {coach && offering && viewer && size !== 'compact' && (
        <div className="space-y-2 rounded-xl bg-[#0d1218] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {editTarget === 'type'
              ? `Chalkboard on every ${offering.name} class`
              : `Chalkboard for ${offering.weekday} ${offering.time} only`}
          </p>
          <div className="flex flex-wrap gap-2">
            {boards.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setActiveBoard(b.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  b.active
                    ? 'bg-[var(--accent)] text-[#06281f]'
                    : 'border border-[var(--panel-border)] text-[var(--muted)]'
                }`}
              >
                {b.name}
                {b.active ? ' · live board' : ''}
              </button>
            ))}
          </div>
          {board && (
            <div className="flex flex-wrap gap-2">
              <input
                value={rename}
                onChange={(e) => onRename(e.target.value)}
                placeholder={board.name}
                className="h-10 min-w-[10rem] flex-1 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (rename.trim()) renameBoard(board.id, rename.trim())
                  onRename('')
                }}
                className="rounded-lg border border-[var(--panel-border)] px-3 text-xs font-semibold"
              >
                Rename
              </button>
              {boards.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBoard(board.id)}
                  className="rounded-lg px-3 text-xs font-semibold text-[var(--bad)]"
                >
                  Delete board
                </button>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              value={newName}
              onChange={(e) => onNewName(e.target.value)}
              placeholder={
                editTarget === 'type'
                  ? `New board for every ${offering.name} time`
                  : 'New board for this hour only'
              }
              className="h-10 min-w-[12rem] flex-1 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                const name = newName.trim()
                if (!name) return
                createBoard({
                  offeringId:
                    editTarget === 'type' ? typeOfferingId(offering.name) : offering.id,
                  name,
                  createdById: viewer.id,
                  makeActive: true,
                  scope: editTarget,
                  classTypeKey: classTypeKey(offering.name),
                })
                onNewName('')
              }}
              className="rounded-lg bg-[var(--accent-dim)] px-3 text-xs font-semibold text-white"
            >
              Create chalkboard
            </button>
          </div>
          {drills.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Pin a drill list for this class
              </p>
              <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto">
                {drills.map((d) => {
                  const on = drillPick.includes(d.id)
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() =>
                          onDrillPick(on ? drillPick.filter((id) => id !== d.id) : [...drillPick, d.id])
                        }
                        className={`w-full rounded-md px-2 py-1 text-left text-xs ${
                          on ? 'bg-[var(--accent)] text-[#06281f]' : 'bg-[#121820] text-[var(--muted)]'
                        }`}
                      >
                        {d.title || 'Untitled drill'}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                disabled={drillPick.length === 0}
                onClick={() => {
                  postToChalkboard({
                    offeringId:
                      editTarget === 'type' ? typeOfferingId(offering.name) : offering.id,
                    boardId: board?.id,
                    createdById: viewer.id,
                    createdByName: viewer.name,
                    pinned: true,
                    meetingId: inSession ? getActiveMeeting()?.id : undefined,
                    draft: {
                      kind: 'drill-list',
                      title:
                        editTarget === 'type'
                          ? `Drills · every ${offering.name}`
                          : `Drills · ${offering.name} ${offering.weekday}`,
                      drillIds: drillPick,
                    },
                  })
                  onDrillPick([])
                  onNotice(
                    editTarget === 'type'
                      ? `Pinned on every ${offering.name} chalkboard.`
                      : 'Pinned on this hour only.',
                  )
                }}
                className="mt-2 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[#06281f] disabled:opacity-40"
              >
                Pin selected drills
              </button>
            </div>
          )}
        </div>
      )}

      {notice && <p className="text-xs text-[var(--accent)]">{notice}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          {inSession
            ? 'Nothing on the board yet. Post a clip, still, drill, or collage from anywhere in the app.'
            : 'Pin a reference from Compare, Learn, drills, or collages — for every class with this name, or only this hour.'}
        </p>
      ) : (
        <ul className="grid gap-3">
          {items.map(({ item, source }) => (
            <li key={item.id}>
              <ChalkboardCard
                item={item}
                coach={coach}
                compact={compact}
                sourceLabel={
                  source === 'type'
                    ? `Every ${offering?.name ?? 'class'} time`
                    : 'This hour only'
                }
              />
            </li>
          ))}
        </ul>
      )}

      {compact && allCount > items.length && (
        <p className="text-xs text-[var(--muted)]">{allCount - items.length} more on the board</p>
      )}
    </div>
  )
}

function ChalkboardCard({
  item,
  coach,
  compact,
  sourceLabel,
}: {
  item: ChalkboardItem
  coach: boolean
  compact: boolean
  sourceLabel?: string
}) {
  const { nameForUrl } = useGymLibrary()
  const [collage, setCollage] = useState<Awaited<ReturnType<typeof listCollages>>[number] | null>(null)
  const [full, setFull] = useState(false)
  const drills = item.kind === 'drill-list' || item.kind === 'drill' ? listDrills() : []

  useEffect(() => {
    if (item.kind !== 'collage' || !item.collageId) return
    void listCollages().then((list) => setCollage(list.find((c) => c.id === item.collageId) ?? null))
  }, [item.kind, item.collageId])

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[#0d1218]">
      <div className="flex items-start justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.title}</p>
          <p className="text-[11px] text-[var(--muted)]">
            {sourceLabel ? `${sourceLabel} · ` : ''}
            {kindLabel(item.kind)}
            {item.pinned ? ' · pinned' : ''}
            {item.createdByName ? ` · ${item.createdByName}` : ''}
          </p>
        </div>
        {coach && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => pinChalkboardItem(item.id, !item.pinned)}
              className="text-[11px] font-semibold text-[var(--accent)]"
            >
              {item.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              type="button"
              onClick={() => eraseChalkboardItem(item.id)}
              className="text-[11px] font-semibold text-[var(--bad)]"
            >
              Erase
            </button>
          </div>
        )}
      </div>
      {!compact && (item.kind === 'clip' || item.kind === 'loop') && item.url && (
        <div className="aspect-[9/16] max-h-80 w-full bg-black">
          <GymClipPlayer
            url={item.url}
            persistUrl={item.url}
            loopA={item.loopA}
            loopB={item.loopB}
            compact
            fill
          />
        </div>
      )}
      {!compact && (item.kind === 'still' || item.kind === 'ig-still') && item.photoSrc && (
        <div className="flex max-h-72 items-center justify-center bg-black">
          <CroppedStill
            src={item.photoSrc}
            stillId={item.stillId}
            alt={item.title}
            className="max-h-72 w-full object-contain"
          />
        </div>
      )}
      {!compact && item.kind === 'drill' && item.drillId && (
        <DrillPreview drillId={item.drillId} />
      )}
      {!compact && item.kind === 'drill-list' && (
        <ul className="space-y-1 px-3 pb-3">
          {(item.drillIds ?? []).map((id) => {
            const d = drills.find((x) => x.id === id)
            return (
              <li key={id} className="text-sm text-[var(--text)]">
                {d?.title || id}
              </li>
            )
          })}
        </ul>
      )}
      {!compact && item.kind === 'collage' && collage && (
        <div className="px-2 pb-2">
          <CollageStage
            collage={collage}
            nameForUrl={nameForUrl}
            fullscreen={full}
            onFullscreen={setFull}
            onClose={() => setFull(false)}
            canEdit={false}
          />
        </div>
      )}
      {compact && (
        <p className="px-3 pb-2 text-xs text-[var(--muted)]">
          {item.kind === 'loop' && item.loopA != null && item.loopB != null
            ? `Loop ${item.loopA.toFixed(1)}s–${item.loopB.toFixed(1)}s`
            : kindLabel(item.kind)}
        </p>
      )}
    </article>
  )
}

function DrillPreview({ drillId }: { drillId: string }) {
  const drill = useMemo(() => listDrills().find((d) => d.id === drillId), [drillId])
  if (!drill?.src) {
    return <p className="px-3 pb-3 text-xs text-[var(--muted)]">{drill?.title || 'Drill'}</p>
  }
  return (
    <div className="px-3 pb-3">
      <PortraitVideoPlayer src={drill.src} title={drill.title} size="thumb" />
    </div>
  )
}
