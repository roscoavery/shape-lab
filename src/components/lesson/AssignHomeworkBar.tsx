import { useState } from 'react'
import { SHAPES } from '../../config/shapes'
import { customHomeworkShapeId, homeworkTitle } from '../../lib/homeworkLabel'
import { addHomeworkItem, createId, homeworkDedupeKey, ensureAutoHomework } from '../../lib/storage'
import type { HomeworkSource } from '../../types'

const OPTIONS = [...SHAPES].sort((a, b) => a.name.localeCompare(b.name))

type Props = {
  athleteId: string
  defaultShapeId?: string
  defaultNotes?: string
  defaultTyped?: string
}

export function AssignHomeworkBar({ athleteId, defaultShapeId, defaultNotes, defaultTyped }: Props) {
  const [shapeId, setShapeId] = useState(defaultShapeId ?? '')
  const [typed, setTyped] = useState(defaultTyped ?? '')
  const [notes, setNotes] = useState(defaultNotes ?? '')
  const [seconds, setSeconds] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  const assign = () => {
    const label = typed.trim()
    if (!label && !shapeId) {
      setFlash('Pick a shape or type the drill name.')
      return
    }
    const nextShapeId = label ? customHomeworkShapeId(label) : shapeId
    const existing = ensureAutoHomework(athleteId)
    const probe = {
      athleteId,
      shapeId: nextShapeId,
      customLabel: label || undefined,
      source: 'coach' as HomeworkSource,
      id: '',
      createdAt: '',
    }
    if (existing.some((h) => homeworkDedupeKey(h) === homeworkDedupeKey(probe))) {
      setFlash('That drill is already on their homework.')
      return
    }
    const target = Number(seconds)
    addHomeworkItem({
      id: createId('hw'),
      athleteId,
      shapeId: nextShapeId,
      ...(label ? { customLabel: label } : {}),
      source: 'coach',
      createdAt: new Date().toISOString(),
      ...(Number.isFinite(target) && target > 0 ? { targetSeconds: target } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    })
    setFlash(`Assigned ${homeworkTitle(probe)}. They will see it under Practice → Homework.`)
    setNotes('')
    setSeconds('')
    setTyped('')
  }

  return (
    <div className="rounded-lg bg-[#0d1218] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Assign homework
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <select
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          value={shapeId}
          onChange={(e) => setShapeId(e.target.value)}
        >
          <option value="">Pick a shape…</option>
          {OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          placeholder="Or type a skill / drill (round-off BHS, beam series…)"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          placeholder="Target seconds (optional)"
          inputMode="numeric"
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          rows={2}
          placeholder="What should they work on?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          type="button"
          onClick={assign}
          className="self-start rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-sm font-semibold text-white"
        >
          Assign
        </button>
        {flash && <p className="text-xs text-[var(--accent)]">{flash}</p>}
      </div>
    </div>
  )
}
