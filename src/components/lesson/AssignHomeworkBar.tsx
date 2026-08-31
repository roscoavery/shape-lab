import { useEffect, useState } from 'react'
import { allLibraryShapes } from '../../config/shapes'
import { SEQUENCES } from '../../config/sequences'
import {
  customHomeworkShapeId,
  homeworkTitle,
  sequenceHomeworkShapeId,
} from '../../lib/homeworkLabel'
import { addHomeworkItem, createId, homeworkDedupeKey, ensureAutoHomework } from '../../lib/storage'
import { subscribeCoachContent } from '../../lib/coachContentStore'
import type { HomeworkSource } from '../../types'

type Props = {
  athleteId: string
  defaultShapeId?: string
  defaultNotes?: string
  defaultTyped?: string
  hideHeading?: boolean
}

export function AssignHomeworkBar({
  athleteId,
  defaultShapeId,
  defaultNotes,
  defaultTyped,
  hideHeading = false,
}: Props) {
  const [shapeId, setShapeId] = useState(defaultShapeId ?? '')
  const [sequenceId, setSequenceId] = useState('')
  const [typed, setTyped] = useState(defaultTyped ?? '')
  const [notes, setNotes] = useState(defaultNotes ?? '')
  const [seconds, setSeconds] = useState('')
  const [flash, setFlash] = useState<string | null>(null)
  const [libTick, setLibTick] = useState(0)

  useEffect(() => subscribeCoachContent(() => setLibTick((n) => n + 1)), [])
  const options = allLibraryShapes().slice().sort((a, b) => a.name.localeCompare(b.name))
  void libTick

  const assign = () => {
    const label = typed.trim()
    const seq = SEQUENCES.find((s) => s.id === sequenceId)
    if (!label && !shapeId && !seq) {
      setFlash('Pick a shape, a sequence, or type the drill name.')
      return
    }
    const nextShapeId = seq
      ? sequenceHomeworkShapeId(seq.id)
      : label
        ? customHomeworkShapeId(label)
        : shapeId
    const existing = ensureAutoHomework(athleteId)
    const probe = {
      athleteId,
      shapeId: nextShapeId,
      customLabel: seq ? seq.name : label || undefined,
      source: 'coach' as HomeworkSource,
      id: '',
      createdAt: '',
    }
    if (existing.some((h) => homeworkDedupeKey(h) === homeworkDedupeKey(probe))) {
      setFlash('That drill is already on their homework.')
      return
    }
    const target = Number(seconds)
    const seqNotes = seq
      ? `${seq.description}`
      : ''
    addHomeworkItem({
      id: createId('hw'),
      athleteId,
      shapeId: nextShapeId,
      ...(seq || label ? { customLabel: seq ? seq.name : label } : {}),
      source: 'coach',
      createdAt: new Date().toISOString(),
      ...(Number.isFinite(target) && target > 0 ? { targetSeconds: target } : {}),
      ...(notes.trim() || seqNotes ? { notes: notes.trim() || seqNotes } : {}),
    })
    setFlash(`Assigned ${homeworkTitle(probe)}. They will see it under Practice → Homework.`)
    setNotes('')
    setSeconds('')
    setTyped('')
    setSequenceId('')
  }

  return (
    <div className={hideHeading ? '' : 'rounded-lg bg-[#0d1218] px-3 py-2'}>
      {!hideHeading && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Assign homework
        </p>
      )}
      <div className={hideHeading ? 'flex flex-col gap-2' : 'mt-2 flex flex-col gap-2'}>
        <select
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          value={shapeId}
          onChange={(e) => {
            setShapeId(e.target.value)
            if (e.target.value) setSequenceId('')
          }}
        >
          <option value="">Pick a shape…</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          value={sequenceId}
          onChange={(e) => {
            setSequenceId(e.target.value)
            if (e.target.value) setShapeId('')
          }}
        >
          <option value="">Or assign a sequence…</option>
          {SEQUENCES.map((s) => (
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
