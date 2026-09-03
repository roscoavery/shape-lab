import { useEffect, useMemo, useState } from 'react'
import { getShape } from '../../config/shapes'
import { SEQUENCES } from '../../config/sequences'
import { getCoachShape, listCoachShapes } from '../../lib/coachContentStore'
import { lessonScoreShapes, quickHoldShapes } from '../../lib/lessonShapes'
import { listTypedHolds, rememberTypedHold } from '../../lib/typedHolds'
import type { ClassExtraExercise, LessonNote, LessonSession } from '../../types'

export type SkillTopic = {
  kind: 'shape' | 'sequence' | 'custom' | 'coach'
  id?: string
  label: string
  scoreShapeId?: string
  /** Side plank — same left / right split as class clock. */
  side?: 'left' | 'right'
}

type Props = {
  value: SkillTopic
  onChange: (next: SkillTopic) => void
  allowSequence?: boolean
  label?: string
  /** Hold picker: four common holds up front. Notes keep the fuller list. */
  compactHolds?: boolean
  /** Typed skills stay on this coach — other coaches do not see them. */
  coachId?: string | null
  /** Extra holds pinned on this class or lesson — shown under the four core drills. */
  extraHolds?: ClassExtraExercise[]
}

const SHAPE_OPTIONS = lessonScoreShapes()
const QUICK_HOLDS = quickHoldShapes()

export function emptySkillTopic(): SkillTopic {
  return { kind: 'custom', label: '' }
}

export function SkillPicker({
  value,
  onChange,
  allowSequence = true,
  label = 'What did you work on',
  compactHolds = false,
  coachId = null,
  extraHolds = [],
}: Props) {
  const coachShapes = listCoachShapes()
  const [typedTick, setTypedTick] = useState(0)
  const mine = listTypedHolds(coachId)
  void typedTick

  const keepTyped = (label: string) => {
    rememberTypedHold(coachId, label)
    setTypedTick((n) => n + 1)
  }
  const [mode, setMode] = useState<'shape' | 'sequence' | 'custom' | 'coach'>(
    value.kind === 'sequence'
      ? 'sequence'
      : value.kind === 'coach'
        ? 'coach'
        : value.kind === 'shape'
          ? 'shape'
          : 'custom',
  )

  useEffect(() => {
    setMode(
      value.kind === 'sequence'
        ? 'sequence'
        : value.kind === 'coach'
          ? 'coach'
          : value.kind === 'shape'
            ? 'shape'
            : 'custom',
    )
  }, [value.kind, value.id, value.label])

  const shapeValue = value.kind === 'shape' ? (value.id ?? '') : ''
  const seqValue = value.kind === 'sequence' ? (value.id ?? '') : ''
  const coachValue = value.kind === 'coach' ? (value.id ?? '') : ''

  const modes = useMemo(() => {
    const list: { id: 'shape' | 'sequence' | 'custom' | 'coach'; label: string }[] = [
      { id: 'shape', label: 'Shape' },
    ]
    if (allowSequence) list.push({ id: 'sequence', label: 'Sequence' })
    if (coachShapes.length > 0) list.push({ id: 'coach', label: 'Coach shape' })
    list.push({ id: 'custom', label: 'Type it' })
    return list
  }, [allowSequence, coachShapes.length])

  if (compactHolds) {
    return (
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {QUICK_HOLDS.map((q) => {
            if (q.id === 'side_plank') {
              return (
                <div
                  key={q.id}
                  className="grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[#121820]"
                >
                  {(['left', 'right'] as const).map((s) => {
                    const on =
                      value.kind === 'shape' && value.id === 'side_plank' && value.side === s
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        aria-label={s === 'left' ? 'Left side plank' : 'Right side plank'}
                        onClick={() =>
                          onChange({
                            kind: 'shape',
                            id: q.id,
                            label: `Side plank · ${s}`,
                            scoreShapeId: q.id,
                            side: s,
                          })
                        }
                        className={`whitespace-nowrap px-1.5 py-2.5 text-xs font-semibold sm:px-3 sm:text-sm ${
                          s === 'right' ? 'border-l border-[var(--panel-border)]' : ''
                        } ${
                          on
                            ? 'bg-[var(--accent)] text-[#06281f]'
                            : 'text-[var(--text)]'
                        }`}
                      >
                        {s === 'left' ? 'Left plank' : 'Right plank'}
                      </button>
                    )
                  })}
                </div>
              )
            }
            const on = value.kind === 'shape' && value.id === q.id
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onChange({ kind: 'shape', id: q.id, label: q.label, scoreShapeId: q.id })}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  on
                    ? 'bg-[var(--accent)] text-[#06281f]'
                    : 'border border-[var(--panel-border)] bg-[#121820] text-[var(--text)]'
                }`}
              >
                {q.label}
              </button>
            )
          })}
        </div>
        {extraHolds.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Also on this lesson
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {extraHolds.map((ex) => {
                const on =
                  (ex.kind === 'shape' && value.kind === 'shape' && value.id === ex.refId) ||
                  (value.kind === 'custom' && value.label === ex.label)
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() =>
                      onChange(
                        ex.kind === 'shape' && ex.refId
                          ? { kind: 'shape', id: ex.refId, label: ex.label, scoreShapeId: ex.refId }
                          : { kind: 'custom', label: ex.label },
                      )
                    }
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      on
                        ? 'bg-[var(--accent)] text-[#06281f]'
                        : 'border border-[var(--panel-border)] bg-[#121820] text-[var(--text)]'
                    }`}
                  >
                    {ex.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <input
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Or type another skill name — saved for you only"
          value={value.kind === 'custom' ? value.label : ''}
          onChange={(e) => onChange({ kind: 'custom', label: e.target.value })}
          onBlur={(e) => keepTyped(e.target.value)}
        />
        {mine.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mine.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onChange({ kind: 'custom', label: name })}
                className={`rounded-md px-2 py-1 text-xs ${
                  value.kind === 'custom' && value.label === name
                    ? 'bg-[var(--accent-dim)] font-semibold text-white'
                    : 'bg-[#121820] text-[var(--muted)]'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id)
              if (m.id === 'custom') onChange({ kind: 'custom', label: value.kind === 'custom' ? value.label : '' })
            }}
            className={`rounded-md px-2.5 py-1 text-xs ${
              mode === m.id
                ? 'bg-[var(--accent-dim)] font-semibold text-white'
                : 'bg-[#121820] text-[var(--muted)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'shape' && (
        <select
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          value={shapeValue}
          onChange={(e) => {
            const id = e.target.value
            const s = SHAPE_OPTIONS.find((x) => x.id === id)
            onChange({ kind: 'shape', id, label: s?.name ?? id })
          }}
        >
          <option value="">Select a shape…</option>
          {SHAPE_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      {mode === 'sequence' && allowSequence && (
        <select
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          value={seqValue}
          onChange={(e) => {
            const id = e.target.value
            const s = SEQUENCES.find((x) => x.id === id)
            onChange({ kind: 'sequence', id, label: s?.name ?? id })
          }}
        >
          <option value="">Select a sequence…</option>
          {SEQUENCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      {mode === 'coach' && coachShapes.length > 0 && (
        <select
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          value={coachValue}
          onChange={(e) => {
            const id = e.target.value
            const s = coachShapes.find((x) => x.id === id)
            onChange({
              kind: 'coach',
              id,
              label: s ? `${s.name} (${s.coachName})` : id,
              scoreShapeId: s?.scoreShapeId,
            })
          }}
        >
          <option value="">Select a coach shape…</option>
          {coachShapes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.coachName}
            </option>
          ))}
        </select>
      )}
      {mode === 'custom' && (
        <input
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Type the shape, skill, or sequence"
          value={value.kind === 'custom' ? value.label : ''}
          onChange={(e) => onChange({ kind: 'custom', label: e.target.value })}
          onBlur={(e) => keepTyped(e.target.value)}
        />
      )}
      {mine.length > 0 && mode === 'custom' && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mine.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onChange({ kind: 'custom', label: name })}
              className={`rounded-md px-2 py-1 text-xs ${
                value.kind === 'custom' && value.label === name
                  ? 'bg-[var(--accent-dim)] font-semibold text-white'
                  : 'bg-[#121820] text-[var(--muted)]'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function topicKey(topic: { topicKind?: string; topicId?: string; topicLabel?: string }): string {
  if (topic.topicKind === 'custom') {
    const label = (topic.topicLabel ?? '').trim().toLowerCase()
    return label ? `label:${label}` : 'general'
  }
  if (topic.topicId) return `${topic.topicKind ?? 'id'}:${topic.topicId}`
  const label = (topic.topicLabel ?? '').trim().toLowerCase()
  return label ? `label:${label}` : 'general'
}

export function holdTopicKey(hold: { shapeId: string; shapeName: string; topicKind?: string }): string {
  if (hold.topicKind === 'custom' || hold.shapeId.startsWith('custom:')) {
    return topicKey({ topicKind: 'custom', topicLabel: hold.shapeName })
  }
  if (hold.topicKind === 'sequence' || SEQUENCES.some((s) => s.id === hold.shapeId)) {
    return topicKey({ topicKind: 'sequence', topicId: hold.shapeId, topicLabel: hold.shapeName })
  }
  if (hold.topicKind === 'coach' || getCoachShape(hold.shapeId)) {
    return topicKey({ topicKind: 'coach', topicId: hold.shapeId, topicLabel: hold.shapeName })
  }
  if (hold.topicKind === 'shape' || getShape(hold.shapeId)) {
    return topicKey({ topicKind: 'shape', topicId: hold.shapeId, topicLabel: hold.shapeName })
  }
  return topicKey({ topicLabel: hold.shapeName })
}

export function groupLessonWork(session: LessonSession): {
  key: string
  label: string
  notes: LessonNote[]
  holds: LessonSession['holds']
}[] {
  const map = new Map<
    string,
    { key: string; label: string; notes: LessonNote[]; holds: LessonSession['holds'] }
  >()
  const bump = (key: string, label: string) => {
    const row = map.get(key) ?? { key, label, notes: [], holds: [] }
    map.set(key, row)
    return row
  }
  for (const n of session.notes) {
    bump(topicKey(n), n.topicLabel?.trim() || 'General').notes.push(n)
  }
  for (const h of session.holds) {
    bump(holdTopicKey(h), h.shapeName).holds.push(h)
  }
  return [...map.values()]
}
