import { useState } from 'react'
import { getShape } from '../../config/shapes'
import {
  catalogChoicesForExtras,
  CORE_DRILL_SHAPE_IDS,
  extraAlreadyPinned,
  extraTrackLabel,
  makeClassExtra,
  SUGGESTED_CLASS_EXTRAS,
} from '../../lib/classExercises'
import { lessonScoreShapes } from '../../lib/lessonShapes'
import type { ClassExtraExercise } from '../../types'

type Props = {
  extras: ClassExtraExercise[]
  onChange: (next: ClassExtraExercise[]) => void
  /** Dark class-station chrome vs Learn/lesson panel. */
  tone?: 'class' | 'panel'
}

export function ClassExtraPicker({ extras, onChange, tone = 'class' }: Props) {
  const [customName, setCustomName] = useState('')
  const [customMode, setCustomMode] = useState<'hold' | 'reps'>('reps')
  const [shapeId, setShapeId] = useState('hollow_arms_up')
  const shapes = lessonScoreShapes().filter((s) => !CORE_DRILL_SHAPE_IDS.has(s.id))
  const catalog = catalogChoicesForExtras()

  const box =
    tone === 'class'
      ? 'rounded-xl border border-white/10 bg-black/20 p-3'
      : 'rounded-xl border border-[var(--panel-border)] bg-[#0d1218] p-3'
  const chipOn =
    tone === 'class'
      ? 'bg-[var(--accent)] text-[#06281f]'
      : 'bg-[var(--accent)] text-[#06281f]'
  const chipOff =
    tone === 'class' ? 'bg-white/8 text-white/80' : 'bg-[#121820] text-[var(--text)]'
  const input =
    tone === 'class'
      ? 'h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm'
      : 'h-11 rounded-xl border border-[var(--panel-border)] bg-[#121820] px-3 text-sm'

  const add = (draft: Omit<ClassExtraExercise, 'id'>) => {
    const next = makeClassExtra(draft)
    if (!next || extraAlreadyPinned(extras, next)) return
    onChange([...extras, next])
  }

  const remove = (id: string) => onChange(extras.filter((ex) => ex.id !== id))

  return (
    <div className={box}>
      <p
        className={
          tone === 'class'
            ? 'text-[10px] font-semibold uppercase tracking-wider text-white/45'
            : 'text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]'
        }
      >
        Also show on the clock
      </p>
      <p
        className={
          tone === 'class'
            ? 'mt-1 text-xs text-white/55'
            : 'mt-1 text-xs text-[var(--muted)]'
        }
      >
        Core drills stay Hollow, Superman, side plank, and wall handstand. Pin
        anything else this class actually times or counts — hollow arms up,
        push-ups, or a name you type.
      </p>

      {extras.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {extras.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm"
            >
              <span>
                <span className="font-semibold">{ex.label}</span>
                <span className="ml-2 text-xs opacity-60">{extraTrackLabel(ex.trackMode)}</span>
              </span>
              <button
                type="button"
                className="text-xs text-[var(--bad)] underline"
                onClick={() => remove(ex.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider opacity-50">
        Suggested
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {SUGGESTED_CLASS_EXTRAS.map((s) => {
          const on = extraAlreadyPinned(extras, s)
          return (
            <button
              key={`${s.kind}-${s.refId}-${s.trackMode}`}
              type="button"
              disabled={on}
              onClick={() => add(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                on ? chipOn : chipOff
              }`}
            >
              {s.label}
              <span className="ml-1 opacity-70">{extraTrackLabel(s.trackMode)}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block text-xs opacity-70">
          Catalog exercise
          <select
            className={`mt-1 w-full ${input}`}
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value
              const cat = catalog.find((c) => c.id === id)
              if (!cat) return
              add({
                kind: 'catalog',
                refId: cat.id,
                label: cat.name,
                trackMode: cat.trackMode,
              })
              e.target.value = ''
            }}
          >
            <option value="">Add from catalog…</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {extraTrackLabel(c.trackMode)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs opacity-70">
          Shape hold
          <div className="mt-1 flex gap-1.5">
            <select
              className={`min-w-0 flex-1 ${input}`}
              value={shapeId}
              onChange={(e) => setShapeId(e.target.value)}
            >
              {shapes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                add({
                  kind: 'shape',
                  refId: shapeId,
                  label: getShape(shapeId)?.name ?? shapeId,
                  trackMode: 'hold',
                })
              }
              className="shrink-0 rounded-xl bg-white/10 px-3 text-xs font-semibold"
            >
              Add hold
            </button>
          </div>
        </label>
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          className={`min-w-0 flex-1 ${input}`}
          placeholder="Custom — bear crawls, 10 push-ups…"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />
        <div className="flex gap-1.5">
          {(['hold', 'reps'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setCustomMode(mode)}
              className={`rounded-xl px-3 text-xs font-semibold ${
                customMode === mode ? chipOn : chipOff
              }`}
            >
              {mode === 'hold' ? 'Hold time' : 'Reps'}
            </button>
          ))}
          <button
            type="button"
            disabled={!customName.trim()}
            onClick={() => {
              add({
                kind: 'custom',
                label: customName.trim(),
                trackMode: customMode,
              })
              setCustomName('')
            }}
            className="rounded-xl bg-[var(--accent)] px-3 text-xs font-bold text-[#06281f] disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
