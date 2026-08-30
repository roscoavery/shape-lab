import { useMemo, useState } from 'react'
import { getShape } from '../../config/shapes'
import { lessonScoreShapes } from '../../lib/lessonShapes'
import { DEFAULT_FORM_STANDARD, createId } from '../../lib/storage'
import { upsertLessonPlan } from '../../lib/lessonStore'
import type { LessonBlock, LessonBlockKind, LessonPlan } from '../../types'

type Props = {
  plan: LessonPlan
  athleteName: string
  onSaved: (plan: LessonPlan) => void
  onCancel?: () => void
}

const LESSON_SHAPES = lessonScoreShapes()
const HOLD_SHAPES = LESSON_SHAPES.filter((s) =>
  /hollow|superman|plank|handstand|lever|candlestick|pike|bridge|lunge|tuck/i.test(
    `${s.id} ${s.name}`,
  ),
).slice(0, 40)

export function LessonPlanEditor({ plan, athleteName, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(plan.title)
  const [blocks, setBlocks] = useState<LessonBlock[]>(plan.blocks)
  const [kind, setKind] = useState<LessonBlockKind>('hold')
  const [blockTitle, setBlockTitle] = useState('')
  const [shapeId, setShapeId] = useState(HOLD_SHAPES[0]?.id ?? 'hollow_arms_down')
  const [seconds, setSeconds] = useState(20)
  const [talk, setTalk] = useState('')

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
          shapeId,
          targetSeconds: seconds,
          formStandard: DEFAULT_FORM_STANDARD,
        },
      ])
      setBlockTitle('')
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
    if (!text) return
    setBlocks((prev) => [
      ...prev,
      { id: createId('blk'), kind: 'talk', title: blockTitle.trim() || 'Talk through', notes: text },
    ])
    setBlockTitle('')
    setTalk('')
  }

  const save = () => {
    const next = upsertLessonPlan({
      ...plan,
      title: title.trim() || `Lesson for ${athleteName}`,
      blocks,
    })
    onSaved(next)
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <h3 className="text-lg font-semibold">Lesson plan for {athleteName}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Add holds, Compare clips, and talk-throughs. This plan shows up when you start
        the lesson.
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
              className="flex items-start justify-between gap-2 rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2"
            >
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                  {i + 1}. {b.kind}
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
          {(['hold', 'compare', 'talk'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-md px-2.5 py-1 text-xs ${
                kind === k
                  ? 'bg-[var(--accent-dim)] font-semibold text-white'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {k === 'hold' ? 'Hold' : k === 'compare' ? 'Compare' : 'Talk'}
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
        {kind !== 'hold' && (
          <textarea
            value={talk}
            onChange={(e) => setTalk(e.target.value)}
            rows={2}
            placeholder={kind === 'compare' ? 'What to look at on Compare' : 'Cue or reminder'}
            className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          />
        )}
        <button
          type="button"
          onClick={addBlock}
          className="mt-2 rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-sm font-semibold text-white"
        >
          Add to plan
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f]"
        >
          Save plan
        </button>
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
