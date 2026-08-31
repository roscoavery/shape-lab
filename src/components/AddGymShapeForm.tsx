import { useState } from 'react'
import { SHAPES } from '../config/shapes'
import { saveGymLibraryShape } from '../lib/coachContentStore'
import { createId } from '../lib/storage'
import type { Athlete, CameraView, ShapeCategory } from '../types'

type Props = {
  signedIn: Athlete
  onSaved?: () => void
}

const SCORE_LIKE = [...SHAPES].sort((a, b) => a.name.localeCompare(b.name))

export function AddGymShapeForm({ signedIn, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [bodyPosition, setBodyPosition] = useState('')
  const [description, setDescription] = useState('')
  const [cameraView, setCameraView] = useState<CameraView>('any')
  const [category, setCategory] = useState<ShapeCategory>('hold')
  const [scoreShapeId, setScoreShapeId] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setFlash('Name the shape first.')
      return
    }
    const id = `gym_${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || createId('gym')}`
    saveGymLibraryShape({
      id,
      name: trimmed,
      description: description.trim(),
      bodyPosition: bodyPosition.trim(),
      cameraView,
      category,
      ...(scoreShapeId ? { scoreShapeId } : {}),
      createdById: signedIn.id,
      createdByName: signedIn.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setName('')
    setBodyPosition('')
    setDescription('')
    setScoreShapeId('')
    setFlash(`Added ${trimmed} to the gym shape library.`)
    onSaved?.()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
      >
        Add a shape to the library
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--accent)]/35 bg-[#102820] p-3">
      <p className="text-sm font-semibold">Add a shape to the gym library</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        It shows up in Learn and in homework assignment for everyone on this gym.
      </p>
      <div className="mt-2 grid gap-2">
        <input
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Shape name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          rows={2}
          placeholder="Body position — what the finished shape is"
          value={bodyPosition}
          onChange={(e) => setBodyPosition(e.target.value)}
        />
        <textarea
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          rows={2}
          placeholder="Notes (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
            value={cameraView}
            onChange={(e) => setCameraView(e.target.value as CameraView)}
          >
            <option value="any">Any facing</option>
            <option value="side">Side view</option>
            <option value="front">Front view</option>
          </select>
          <select
            className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as ShapeCategory)}
          >
            <option value="hold">Hold</option>
            <option value="static">Static</option>
            <option value="transition">Transition</option>
          </select>
        </div>
        <select
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
          value={scoreShapeId}
          onChange={(e) => setScoreShapeId(e.target.value)}
        >
          <option value="">Camera grades like… (optional)</option>
          {SCORE_LIKE.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f]"
          >
            Save to library
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-[var(--muted)] underline"
          >
            Cancel
          </button>
        </div>
        {flash && <p className="text-xs text-[var(--accent)]">{flash}</p>}
      </div>
    </div>
  )
}
