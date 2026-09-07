import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { getShape } from '../../config/shapes'
import { lessonScoreShapes } from '../../lib/lessonShapes'
import { DEFAULT_FORM_STANDARD, createId } from '../../lib/storage'
import { upsertLessonPlan } from '../../lib/lessonStore'
import { lessonBlockLabel } from '../../lib/lessonPlan'
import type { ClassExtraExercise, LessonBlock, LessonBlockKind, LessonPlan } from '../../types'
import { ClassExtraPicker } from '../today/ClassExtraPicker'
import { DragReorderHandle, rowIndexFromPoint } from '../DragReorderHandle'

type Props = {
  plan: LessonPlan
  athleteName: string
  onSaved: (plan: LessonPlan) => void
  onStart?: (plan: LessonPlan) => void
  onCancel?: () => void
}

const LESSON_SHAPES = lessonScoreShapes()
const HOLD_SHAPES = LESSON_SHAPES.filter((s) =>
  /hollow|superman|plank|handstand|lever|candlestick|pike|bridge|lunge|tuck/i.test(
    `${s.id} ${s.name}`,
  ),
).slice(0, 40)

const BLOCK_KINDS: { id: LessonBlockKind; label: string }[] = [
  { id: 'hold', label: 'Hold' },
  { id: 'drill', label: 'Drills / exercises' },
  { id: 'skill', label: 'Skills to work' },
  { id: 'compare', label: 'Compare' },
  { id: 'talk', label: 'Talk' },
]

export function LessonPlanEditor({ plan, athleteName, onSaved, onStart, onCancel }: Props) {
  const [title, setTitle] = useState(plan.title)
  const [blocks, setBlocks] = useState<LessonBlock[]>(plan.blocks)
  const [kind, setKind] = useState<LessonBlockKind>('hold')
  const [blockTitle, setBlockTitle] = useState('')
  const [shapeId, setShapeId] = useState(HOLD_SHAPES[0]?.id ?? 'hollow_arms_down')
  const [seconds, setSeconds] = useState(20)
  const [talk, setTalk] = useState('')
  const [extras, setExtras] = useState<ClassExtraExercise[]>(plan.extraExercises ?? [])
  const [dragId, setDragId] = useState<string | null>(null)
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks

  const shapeOptions = useMemo(() => {
    const ids = new Set(HOLD_SHAPES.map((s) => s.id))
    const extra = LESSON_SHAPES.filter((s) => !ids.has(s.id)).slice(0, 80)
    return [...HOLD_SHAPES, ...extra]
  }, [])

  const addBlock = () => {
    if (kind === 'hold') {
      const shape = getShape(shapeId)
      setBlocks((prev) => [
        ...prev,
        {
          id: createId('blk'),
          kind: 'hold',
          title: blockTitle.trim() || shape?.name || 'Hold',
          notes: talk.trim() || undefined,
          shapeId,
          targetSeconds: seconds,
          formStandard: DEFAULT_FORM_STANDARD,
        },
      ])
      setBlockTitle('')
      setTalk('')
      return
    }
    if (kind === 'compare') {
      setBlocks((prev) => [
        ...prev,
        {
          id: createId('blk'),
          kind: 'compare',
          title: blockTitle.trim() || 'Compare',
          notes: talk.trim() || undefined,
        },
      ])
      setBlockTitle('')
      setTalk('')
      return
    }
    const text = talk.trim() || blockTitle.trim()
    if (!text && (kind === 'talk' || kind === 'drill' || kind === 'skill')) return
    const fallback =
      kind === 'drill' ? 'Drill / exercise' : kind === 'skill' ? 'Skill to work' : 'Talk through'
    setBlocks((prev) => [
      ...prev,
      {
        id: createId('blk'),
        kind,
        title: blockTitle.trim() || fallback,
        notes: talk.trim() || text || undefined,
      },
    ])
    setBlockTitle('')
    setTalk('')
  }

  const beginDrag = (id: string, e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragId(id)
  }

  const moveDrag = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragId) return
    const live = blocksRef.current
    const list = e.currentTarget.closest('ol')
    const to = rowIndexFromPoint(list, e.clientY, live.length)
    const from = live.findIndex((b) => b.id === dragId)
    if (from < 0 || from === to) return
    const next = [...live]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    setBlocks(next)
  }

  const save = () => {
    const next = upsertLessonPlan({
      ...plan,
      title: title.trim() || `Lesson for ${athleteName}`,
      blocks,
      extraExercises: extras,
    })
    onSaved(next)
    return next
  }

  const notesPlaceholder =
    kind === 'hold'
      ? 'Cue for this hold'
      : kind === 'compare'
        ? 'What to look at on Compare'
        : kind === 'drill'
          ? 'How to run the drill'
          : kind === 'skill'
            ? 'What to work and how it should look'
            : 'Cue or reminder'

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <h3 className="text-lg font-semibold">Lesson plan for {athleteName}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Add holds, drills / exercises, skills to work, Compare clips, and talk-throughs.
        Drag the grip to reorder. Save the plan, then start — those notes sit at the
        top of the live lesson.
      </p>
      <label className="mt-3 block text-xs uppercase tracking-wider text-[var(--muted)]">
        Plan name
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
        />
      </label>

      {blocks.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">No blocks yet. Add one below.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {blocks.map((b, i) => (
            <li
              key={b.id}
              data-reorder-row={b.id}
              className={`flex items-start gap-1 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 py-2 ${
                dragId === b.id ? 'scale-[1.01] ring-1 ring-white/25' : ''
              }`}
            >
              <DragReorderHandle
                label={b.title}
                className="text-[var(--muted)]"
                onPointerDown={(e) => beginDrag(b.id, e)}
                onPointerMove={moveDrag}
                onPointerUp={() => setDragId(null)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                  {i + 1}. {lessonBlockLabel(b.kind)}
                  {b.targetSeconds ? ` · ${b.targetSeconds}s` : ''}
                </p>
                <p className="text-sm font-medium">{b.title}</p>
                {b.notes && <p className="text-xs text-[var(--muted)]">{b.notes}</p>}
              </div>
              <button
                type="button"
                className="text-xs text-[var(--muted)] hover:text-[var(--bad)]"
                onClick={() => setBlocks((prev) => prev.filter((x) => x.id !== b.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] p-3">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Add a block</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BLOCK_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={`rounded-md px-2.5 py-1 text-xs ${
                kind === k.id
                  ? 'bg-[var(--accent-dim)] font-semibold text-white'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <input
          value={blockTitle}
          onChange={(e) => setBlockTitle(e.target.value)}
          placeholder={kind === 'talk' ? 'Optional title' : 'Block name'}
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
        />
        {kind === 'hold' && (
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              value={shapeId}
              onChange={(e) => setShapeId(e.target.value)}
              className="min-w-[10rem] flex-1 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
            >
              {shapeOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              Target
              <input
                type="number"
                min={5}
                max={180}
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value) || 20)}
                className="w-16 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 py-2 text-sm text-[var(--text)]"
              />
              s
            </label>
          </div>
        )}
        <textarea
          value={talk}
          onChange={(e) => setTalk(e.target.value)}
          rows={2}
          placeholder={notesPlaceholder}
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addBlock}
          className="mt-2 rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-sm font-semibold text-white"
        >
          Add to plan
        </button>
      </div>

      <div className="mt-4">
        <ClassExtraPicker extras={extras} onChange={setExtras} tone="panel" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f]"
        >
          Save plan
        </button>
        {onStart && (
          <button
            type="button"
            onClick={() => onStart(save())}
            className="rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm font-semibold text-white"
          >
            Save & start lesson
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--panel-border)] px-4 py-2 text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  )
}
