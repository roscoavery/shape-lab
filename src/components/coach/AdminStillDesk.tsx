import { useMemo, useState } from 'react'
import { getShape } from '../../config/shapes'
import { learnLibraryShapes } from '../../lib/educationCopy'
import {
  applyStillFromFile,
  hideCoachStill,
  listAssignableCoachStills,
  reassignCoachStill,
  UNMATCHED_STILL_SHAPE,
} from '../../lib/coachStillStore'
import { isUsablePhotoSrc } from '../../lib/shippedRefs'
import type { ReferencePhoto, ShapeDef } from '../../types'
import { CroppedStill } from '../CroppedStill'

type Props = {
  photos: ReferencePhoto[]
  onPhotosChange: (photos: ReferencePhoto[]) => void
}

const DRAG_TYPE = 'application/x-shapelab-still'

export function AdminStillDesk({ photos, onPhotosChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [flash, setFlash] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const shapes = useMemo(() => learnLibraryShapes().sort((a, b) => a.name.localeCompare(b.name)), [])
  const stills = useMemo(() => listAssignableCoachStills(photos), [photos])
  const unmatched = stills.filter((p) => p.shapeId === UNMATCHED_STILL_SHAPE || !p.shapeId)
  const selected = stills.find((p) => p.id === selectedId) ?? null

  const say = (msg: string) => {
    setFlash(msg)
    window.setTimeout(() => setFlash(null), 4000)
  }

  const assign = async (photo: ReferencePhoto, shapeId: string) => {
    setBusy(true)
    try {
      const remote = await reassignCoachStill(photo, shapeId)
      const kept = remote.photo ?? { ...photo, shapeId }
      onPhotosChange([kept, ...photos.filter((p) => p.id !== kept.id)])
      setSelectedId(null)
      const name =
        shapeId === UNMATCHED_STILL_SHAPE ? 'unmatched' : getShape(shapeId)?.name ?? shapeId
      say(remote.ok ? `Moved to ${name}.` : remote.error ?? 'Gym file did not keep that move.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    setBusy(true)
    try {
      const remote = await hideCoachStill(id)
      onPhotosChange(photos.filter((p) => p.id !== id))
      if (selectedId === id) setSelectedId(null)
      say(remote.ok ? 'Deleted from this gym.' : remote.error ?? 'Could not delete that still.')
    } finally {
      setBusy(false)
    }
  }

  const parkAll = async () => {
    if (!window.confirm('Move every extra still into Unmatched so you can drag them onto names again?')) {
      return
    }
    setBusy(true)
    try {
      let next = photos
      for (const photo of stills.filter((p) => p.shapeId !== UNMATCHED_STILL_SHAPE)) {
        const remote = await reassignCoachStill(photo, UNMATCHED_STILL_SHAPE)
        const kept = remote.photo ?? { ...photo, shapeId: UNMATCHED_STILL_SHAPE }
        next = [kept, ...next.filter((p) => p.id !== kept.id)]
      }
      onPhotosChange(next)
      say('All extras are in Unmatched. Tap a photo, then tap the shape name.')
    } finally {
      setBusy(false)
    }
  }

  const dropOnShape = async (shapeId: string, data: DataTransfer) => {
    const stillId = data.getData(DRAG_TYPE)
    if (stillId) {
      const photo = stills.find((p) => p.id === stillId)
      if (photo) await assign(photo, shapeId)
      return
    }
    const file = data.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const remote = await applyStillFromFile({ shapeId, file, photos })
      if (remote.photo) onPhotosChange([remote.photo, ...photos.filter((p) => p.id !== remote.photo!.id)])
      say(remote.ok ? 'Saved on that shape.' : remote.error ?? 'Gym did not keep that still.')
    } finally {
      setBusy(false)
    }
  }

  const q = query.trim().toLowerCase()
  const visibleShapes = q
    ? shapes.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    : shapes

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--panel)] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">
          Gym admin
        </p>
        <h2 className="mt-1 text-2xl font-black text-[var(--text)]">Match stills</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Tap a photo, then tap the shape name it belongs to. On a computer you can
          also drag the photo onto the name. Delete removes it from every device.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || stills.length === 0}
            onClick={() => void parkAll()}
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
          >
            Move all extras to Unmatched
          </button>
        </div>
        {flash && <p className="mt-2 text-sm text-[var(--accent)]">{flash}</p>}
        {selected && (
          <p className="mt-2 text-sm text-[var(--text)]">
            Selected — tap a shape name below to put it there.
          </p>
        )}
      </div>

      <UnmatchedTray
        photos={unmatched}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onDelete={(id) => void remove(id)}
        onDrop={(data) => void dropOnShape(UNMATCHED_STILL_SHAPE, data)}
      />

      <label className="block text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--muted)]">
          Find a shape
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Mad cat, L handstand…"
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-[var(--text)]"
        />
      </label>

      <ul className="grid gap-2">
        {visibleShapes.map((shape) => (
          <ShapeMatchRow
            key={shape.id}
            shape={shape}
            stills={stills.filter((p) => p.shapeId === shape.id)}
            selected={Boolean(selected)}
            selectedId={selectedId}
            onSelectPhoto={setSelectedId}
            onPick={() => {
              if (selected) void assign(selected, shape.id)
            }}
            onDelete={(id) => void remove(id)}
            onUnmatch={(photo) => void assign(photo, UNMATCHED_STILL_SHAPE)}
            onDrop={(data) => void dropOnShape(shape.id, data)}
          />
        ))}
      </ul>
    </section>
  )
}

function UnmatchedTray({
  photos,
  selectedId,
  onSelect,
  onDelete,
  onDrop,
}: {
  photos: ReferencePhoto[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onDrop: (data: DataTransfer) => void
}) {
  const [over, setOver] = useState(false)
  return (
    <div
      className={`rounded-xl border p-3 ${
        over ? 'border-[var(--accent)] bg-[#102820]' : 'border-dashed border-[var(--panel-border)] bg-[var(--panel)]'
      }`}
      onDragOver={(e) => {
        if (canAcceptDrop(e.dataTransfer)) {
          e.preventDefault()
          setOver(true)
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onDrop(e.dataTransfer)
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        Unmatched ({photos.length})
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Photos sitting here do not show on a Learn card.
      </p>
      {photos.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Nothing waiting. Tap a still below to park it here.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <StillTile
              key={p.id}
              photo={p}
              selected={selectedId === p.id}
              onSelect={() => onSelect(p.id)}
              onDelete={() => onDelete(p.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ShapeMatchRow({
  shape,
  stills,
  selected,
  selectedId,
  onSelectPhoto,
  onPick,
  onDelete,
  onUnmatch,
  onDrop,
}: {
  shape: ShapeDef
  stills: ReferencePhoto[]
  selected: boolean
  selectedId: string | null
  onSelectPhoto: (id: string) => void
  onPick: () => void
  onDelete: (id: string) => void
  onUnmatch: (photo: ReferencePhoto) => void
  onDrop: (data: DataTransfer) => void
}) {
  const [over, setOver] = useState(false)
  return (
    <li>
      <div
        className={`rounded-xl border p-3 ${
          over
            ? 'border-[var(--accent)] bg-[#102820]'
            : selected
              ? 'border-[var(--accent)]/50 bg-[var(--panel)]'
              : 'border-[var(--panel-border)] bg-[var(--panel)]'
        }`}
        onDragOver={(e) => {
          if (canAcceptDrop(e.dataTransfer)) {
            e.preventDefault()
            setOver(true)
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          onDrop(e.dataTransfer)
        }}
      >
        <button type="button" onClick={onPick} className="flex w-full items-center justify-between gap-2 text-left">
          <span>
            <span className="block font-semibold text-[var(--text)]">{shape.name}</span>
            {shape.id.startsWith('gym_') && (
              <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Gym</span>
            )}
          </span>
          <span className="text-xs text-[var(--muted)]">
            {stills.length === 0 ? 'Empty — tap to place' : `${stills.length} still${stills.length === 1 ? '' : 's'}`}
          </span>
        </button>
        {stills.length > 0 && (
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {stills.map((p) => (
              <StillTile
                key={p.id}
                photo={p}
                selected={selectedId === p.id}
                onSelect={() => onSelectPhoto(p.id)}
                onDelete={() => onDelete(p.id)}
                onUnmatch={() => onUnmatch(p)}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

function StillTile({
  photo,
  selected,
  onSelect,
  onDelete,
  onUnmatch,
}: {
  photo: ReferencePhoto
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onUnmatch?: () => void
}) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, photo.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`overflow-hidden rounded-lg bg-[#0d1218] ${
        selected ? 'ring-2 ring-[var(--accent)]' : ''
      }`}
    >
      <button type="button" onClick={onSelect} className="block w-full">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden">
          {isUsablePhotoSrc(photo.dataUrl) ? (
            <CroppedStill
              src={photo.dataUrl}
              stillId={photo.id}
              alt={photo.label || 'Coach still'}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="px-1 text-[10px] text-[var(--muted)]">No pixels</span>
          )}
        </div>
      </button>
      <div className="flex flex-wrap gap-1 px-1.5 py-1">
        {onUnmatch && (
          <button type="button" onClick={onUnmatch} className="text-[10px] font-semibold text-[var(--muted)] underline">
            Unmatch
          </button>
        )}
        <button type="button" onClick={onDelete} className="text-[10px] font-semibold text-[var(--bad)] underline">
          Delete
        </button>
      </div>
    </li>
  )
}

function canAcceptDrop(data: DataTransfer): boolean {
  return data.types.includes(DRAG_TYPE) || data.types.includes('Files')
}
