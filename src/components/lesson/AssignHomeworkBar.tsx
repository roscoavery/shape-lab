import { useEffect, useState } from 'react'
import { allLibraryShapes } from '../../config/shapes'
import { FLOW_SEQUENCES } from '../../config/tasks2'
import { HOMEWORK_CATALOG, PULLUP_GRIPS, catalogShapeId, getCatalogItem } from '../../config/homeworkCatalog'
import {
  customHomeworkShapeId,
  drillHomeworkShapeId,
  homeworkTitle,
  sequenceHomeworkShapeId,
} from '../../lib/homeworkLabel'
import { addHomeworkItem, createId, homeworkDedupeKey, ensureAutoHomework } from '../../lib/storage'
import { loadCoachExercises } from '../../lib/careStore'
import { listPublicDrills, subscribeCoachContent } from '../../lib/coachContentStore'
import type { HomeworkSource, HomeworkTrackMode } from '../../types'

type Props = {
  athleteId: string
  coachId?: string
  defaultShapeId?: string
  defaultNotes?: string
  defaultTyped?: string
  hideHeading?: boolean
}

export function AssignHomeworkBar({
  athleteId,
  coachId,
  defaultShapeId,
  defaultNotes,
  defaultTyped,
  hideHeading = false,
}: Props) {
  const [shapeId, setShapeId] = useState(defaultShapeId ?? '')
  const [sequenceId, setSequenceId] = useState('')
  const [drillId, setDrillId] = useState('')
  const [catalogId, setCatalogId] = useState('')
  const [typed, setTyped] = useState(defaultTyped ?? '')
  const [notes, setNotes] = useState(defaultNotes ?? '')
  const [seconds, setSeconds] = useState('')
  const [reps, setReps] = useState('')
  const [mode, setMode] = useState<HomeworkTrackMode | ''>('')
  const [grip, setGrip] = useState('')
  const [flash, setFlash] = useState<string | null>(null)
  const [libTick, setLibTick] = useState(0)
  const coachExercises = loadCoachExercises(coachId)

  useEffect(() => subscribeCoachContent(() => setLibTick((n) => n + 1)), [])
  const options = allLibraryShapes().slice().sort((a, b) => a.name.localeCompare(b.name))
  void libTick

  const assign = () => {
    const label = typed.trim()
    const seq = FLOW_SEQUENCES.find((s) => s.id === sequenceId)
    const drill = listPublicDrills().find((d) => d.id === drillId)
    const cat = getCatalogItem(catalogId)
    const coachEx = catalogId.startsWith('cx:')
      ? coachExercises.find((e) => e.id === catalogId.slice(3))
      : undefined
    if (!label && !shapeId && !seq && !drill && !cat && !coachEx) {
      setFlash('Pick a shape, a sequence, a drill, a rep exercise, or type the name.')
      return
    }
    const nextShapeId = cat
      ? catalogShapeId(cat.id)
      : coachEx
        ? customHomeworkShapeId(coachEx.name)
      : drill
      ? drillHomeworkShapeId(drill.id)
      : seq
        ? sequenceHomeworkShapeId(seq.id)
        : label
          ? customHomeworkShapeId(label)
          : shapeId
    const existing = ensureAutoHomework(athleteId)
    const probe = {
      athleteId,
      shapeId: nextShapeId,
      customLabel: cat
        ? cat.name
        : coachEx
          ? coachEx.name
          : drill
            ? drill.title
            : seq
              ? seq.name
              : label || undefined,
      catalogId: cat?.id,
      coachExerciseId: coachEx?.id,
      source: 'coach' as HomeworkSource,
      id: '',
      createdAt: '',
    }
    if (existing.some((h) => homeworkDedupeKey(h) === homeworkDedupeKey(probe))) {
      setFlash('That drill is already on their homework.')
      return
    }
    const target = Number(seconds)
    const targetReps = Number(reps)
    const seqNotes = cat?.notes || coachEx?.notes || (drill ? drill.notes : seq ? `${seq.description}` : '')
    const trackMode: HomeworkTrackMode | undefined =
      mode || cat?.trackMode || coachEx?.trackMode || (label && !shapeId && !seq && !drill ? 'reps' : undefined)
    addHomeworkItem({
      id: createId('hw'),
      athleteId,
      shapeId: nextShapeId,
      ...(cat
        ? { catalogId: cat.id, customLabel: cat.name, allowWeight: cat.allowWeight }
        : coachEx
          ? { coachExerciseId: coachEx.id, customLabel: coachEx.name }
        : drill || seq || label
          ? { customLabel: drill ? drill.title : seq ? seq.name : label }
          : {}),
      source: 'coach',
      createdAt: new Date().toISOString(),
      ...(trackMode ? { trackMode } : {}),
      ...(grip ? { grip } : {}),
      ...(Number.isFinite(target) && target > 0 ? { targetSeconds: target } : {}),
      ...(Number.isFinite(targetReps) && targetReps > 0
        ? { targetReps }
        : cat?.targetReps
          ? { targetReps: cat.targetReps }
          : {}),
      ...(notes.trim() || seqNotes ? { notes: notes.trim() || seqNotes } : {}),
    })
    setFlash(`Assigned ${homeworkTitle(probe)}. They pick it under Practice → Homework → Train now.`)
    setNotes('')
    setSeconds('')
    setReps('')
    setTyped('')
    setSequenceId('')
    setDrillId('')
    setCatalogId('')
    setMode('')
    setGrip('')
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
          value={catalogId}
          onChange={(e) => {
            setCatalogId(e.target.value)
            if (e.target.value) {
              setShapeId('')
              setSequenceId('')
              setDrillId('')
              const cat = getCatalogItem(e.target.value)
              if (cat) {
                setMode(cat.trackMode)
                setReps(cat.targetReps ? String(cat.targetReps) : '')
                setSeconds(cat.targetSeconds ? String(cat.targetSeconds) : '')
              }
            }
          }}
        >
          <option value="">Assign a rep / hold exercise…</option>
          {HOMEWORK_CATALOG.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          {coachExercises.map((ex) => (
            <option key={ex.id} value={`cx:${ex.id}`}>
              {ex.name} (yours)
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          value={shapeId}
          onChange={(e) => {
            setShapeId(e.target.value)
            if (e.target.value) {
              setSequenceId('')
              setDrillId('')
            }
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
            if (e.target.value) {
              setShapeId('')
              setDrillId('')
            }
          }}
        >
          <option value="">Or assign a class flow…</option>
          {FLOW_SEQUENCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          value={drillId}
          onChange={(e) => {
            setDrillId(e.target.value)
            if (e.target.value) {
              setShapeId('')
              setSequenceId('')
            }
          }}
        >
          <option value="">Or assign a drill…</option>
          {listPublicDrills().map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <input
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          placeholder="Or type a skill / drill (round-off BHS, beam series…)"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
            placeholder="Target seconds (optional)"
            inputMode="numeric"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
            placeholder="Target reps (optional)"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </div>
        <select
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          value={mode}
          onChange={(e) => setMode((e.target.value || '') as HomeworkTrackMode | '')}
        >
          <option value="">Track: default for this drill</option>
          <option value="hold">Holds only</option>
          <option value="reps">Reps + quality reps</option>
          <option value="hold_or_reps">Holds and reps</option>
        </select>
        {(catalogId === 'pullup' || grip) && (
          <select
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
            value={grip}
            onChange={(e) => setGrip(e.target.value)}
          >
            <option value="">Pull-up grip…</option>
            {PULLUP_GRIPS.map((g) => (
              <option key={g.id} value={g.label}>
                {g.label}
              </option>
            ))}
          </select>
        )}
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
