import { useMemo, useState } from 'react'
import { FLOW_SEQUENCES } from '../../config/tasks2'
import { CORE_HOMEWORK_PICKS, getCatalogItem, stockCatalogFor } from '../../config/homeworkCatalog'
import { listPublicDrills } from '../../lib/coachContentStore'
import type { CoachExercise, HomeworkTrackMode, ShapeDef } from '../../types'

export type HomeworkPick =
  | { kind: 'catalog'; id: string; name: string }
  | { kind: 'core'; id: string; name: string }
  | { kind: 'coach'; id: string; name: string }
  | { kind: 'shape'; id: string; name: string }
  | { kind: 'flow'; id: string; name: string }
  | { kind: 'drill'; id: string; name: string }
  | { kind: 'typed'; name: string }

type Suggestion = HomeworkPick & { hint: string }

type Props = {
  libraryShapes: ShapeDef[]
  coachExercises: CoachExercise[]
  isCoach: boolean
  isParent?: boolean
  source: 'coach' | 'athlete' | 'parent'
  onSource: (source: 'coach' | 'athlete' | 'parent') => void
  notes: string
  onNotes: (notes: string) => void
  mode: HomeworkTrackMode | ''
  onMode: (mode: HomeworkTrackMode | '') => void
  target: string
  onTarget: (value: string) => void
  reps: string
  onReps: (value: string) => void
  newExName: string
  onNewExName: (value: string) => void
  newExMode: HomeworkTrackMode
  onNewExMode: (mode: HomeworkTrackMode) => void
  onSaveExercise: () => void
  onRemoveExercise: (id: string) => void
  onAdd: (pick: HomeworkPick) => void
  /** Class assign hides back-care stock and leads with core + study shapes. */
  stockAudience?: 'class' | 'all'
}

function kindLabel(kind: HomeworkPick['kind']): string {
  switch (kind) {
    case 'catalog':
      return 'Exercise'
    case 'core':
      return 'Core drill'
    case 'coach':
      return 'Yours'
    case 'shape':
      return 'Shape'
    case 'flow':
      return 'Class flow'
    case 'drill':
      return 'Drill'
    case 'typed':
      return 'New skill'
  }
}

export function AddHomeworkForm({
  libraryShapes,
  coachExercises,
  isCoach,
  isParent = false,
  source,
  onSource,
  notes,
  onNotes,
  mode,
  onMode,
  target,
  onTarget,
  reps,
  onReps,
  newExName,
  onNewExName,
  newExMode,
  onNewExMode,
  onSaveExercise,
  onRemoveExercise,
  onAdd,
  stockAudience = 'all',
}: Props) {
  const [query, setQuery] = useState('')

  const catalog = stockCatalogFor(stockAudience)
  const flows = FLOW_SEQUENCES
  const drills = listPublicDrills()

  const all: Suggestion[] = useMemo(() => {
    const rows: Suggestion[] = [
      ...(stockAudience === 'class'
        ? CORE_HOMEWORK_PICKS.map((c) => ({
            kind: 'core' as const,
            id: c.autoKey,
            name: c.name,
            hint: c.hint,
          }))
        : []),
      ...catalog.map((c) => ({
        kind: 'catalog' as const,
        id: c.id,
        name: c.name,
        hint: c.notes,
      })),
      ...coachExercises.map((ex) => ({
        kind: 'coach' as const,
        id: ex.id,
        name: ex.name,
        hint: `Your exercise · ${ex.trackMode.replace(/_/g, ' ')}`,
      })),
      ...libraryShapes.map((s) => ({
        kind: 'shape' as const,
        id: s.id,
        name: s.name,
        hint: 'Camera hold from the shape library',
      })),
      ...flows.map((s) => ({
        kind: 'flow' as const,
        id: s.id,
        name: s.name,
        hint: 'Opens this class flow',
      })),
      ...drills.map((d) => ({
        kind: 'drill' as const,
        id: d.id,
        name: d.title,
        hint: 'Public drill',
      })),
    ]
    return rows
  }, [catalog, coachExercises, libraryShapes, flows, drills, stockAudience])

  const q = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!q) return all.slice(0, 8)
    return all
      .filter((row) => {
        const hay = `${row.name} ${row.hint}`.toLowerCase()
        return hay.includes(q) || q.split(/\s+/).every((part) => hay.includes(part))
      })
      .slice(0, 8)
  }, [all, q])

  const exact = matches.find((row) => row.name.toLowerCase() === q)
  const canTypeCustom = q.length >= 2 && !exact

  const applyMatch = (row: Suggestion) => {
    const cat = row.kind === 'catalog' ? getCatalogItem(row.id) : undefined
    if (cat) {
      onMode(cat.trackMode)
      onReps(cat.targetReps ? String(cat.targetReps) : '')
      onTarget(cat.targetSeconds ? String(cat.targetSeconds) : target)
    }
    setQuery(row.name)
    if (row.kind === 'typed') onAdd({ kind: 'typed', name: row.name })
    else onAdd({ kind: row.kind, id: row.id, name: row.name })
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Your library
        </p>
        <h3 className="mt-1 text-2xl font-semibold text-[var(--text)]">Add homework</h3>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
          Type a skill. If it already exists, tap it — you do not have to hunt
          the list. Or add a new name if this one is yours.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Search or type a skill
        </span>
        <input
          autoFocus
          className="mt-2 h-14 w-full rounded-2xl border border-[var(--panel-border)] bg-[#0d1218] px-4 text-lg text-[var(--text)] outline-none ring-[var(--accent)] focus:ring-2"
          placeholder="Candlestick, hollow, study shapes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            if (matches[0]) applyMatch(matches[0])
            else if (canTypeCustom) onAdd({ kind: 'typed', name: query.trim() })
          }}
        />
      </label>

      {q && matches.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {exact ? 'This one is already in the library' : 'Tap to add'}
          </p>
          {matches.map((row) => (
            <button
              key={`${row.kind}:${row.kind === 'typed' ? row.name : row.id}`}
              type="button"
              onClick={() => applyMatch(row)}
              className="flex w-full items-start justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[#121820] px-4 py-3 text-left hover:border-[var(--accent)]/50"
            >
              <span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {kindLabel(row.kind)}
                </span>
                <span className="mt-0.5 block text-base font-semibold text-[var(--text)]">
                  {row.name}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{row.hint}</span>
              </span>
              <span className="shrink-0 self-center rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[#06281f]">
                Add
              </span>
            </button>
          ))}
        </div>
      )}

      {canTypeCustom && (
        <button
          type="button"
          onClick={() => onAdd({ kind: 'typed', name: query.trim() })}
          className="rounded-2xl border border-dashed border-[var(--accent)]/40 bg-[#102820] px-4 py-3 text-left"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            New skill
          </span>
          <span className="mt-0.5 block text-base font-semibold text-[var(--text)]">
            Add “{query.trim()}”
          </span>
          <span className="mt-0.5 block text-xs text-[var(--muted)]">
            Logs as reps unless you change tracking below.
          </span>
        </button>
      )}

      {!q && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {stockAudience === 'class'
              ? 'Candlestick, core drills, study shapes'
              : 'Start with a stock exercise'}
          </p>
          {stockAudience === 'class' && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {CORE_HOMEWORK_PICKS.map((c) => (
                <button
                  key={c.autoKey}
                  type="button"
                  onClick={() => onAdd({ kind: 'core', id: c.autoKey, name: c.name })}
                  className="rounded-2xl border border-[var(--panel-border)] bg-[#121820] px-4 py-3 text-left hover:border-[var(--accent)]/50"
                >
                  <span className="block font-semibold text-[var(--text)]">{c.name}</span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">{c.hint}</span>
                </button>
              ))}
            </div>
          )}
          <div className={`${stockAudience === 'class' ? 'mt-2' : 'mt-2'} grid gap-2 sm:grid-cols-2`}>
            {catalog.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  applyMatch({ kind: 'catalog', id: c.id, name: c.name, hint: c.notes })
                }
                className="rounded-2xl border border-[var(--panel-border)] bg-[#121820] px-4 py-3 text-left hover:border-[var(--accent)]/50"
              >
                <span className="block font-semibold text-[var(--text)]">{c.name}</span>
                <span className="mt-1 block text-xs text-[var(--muted)]">{c.notes}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-[var(--muted)]">
          Hold goal (seconds)
          <input
            type="number"
            min={0}
            className="mt-1 h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            value={target}
            onChange={(e) => onTarget(e.target.value)}
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          Rep goal
          <input
            type="number"
            min={0}
            className="mt-1 h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            value={reps}
            onChange={(e) => onReps(e.target.value)}
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          How to log
          <select
            className="mt-1 h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            value={mode}
            onChange={(e) => onMode((e.target.value || '') as HomeworkTrackMode | '')}
          >
            <option value="">Default for this drill</option>
            <option value="hold">Holds</option>
            <option value="reps">Reps</option>
            <option value="hold_or_reps">Holds and reps</option>
          </select>
        </label>
        <label className="text-xs text-[var(--muted)]">
          Who is adding this
          <select
            className="mt-1 h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            value={source}
            onChange={(e) => {
              const v = e.target.value
              onSource(v === 'parent' ? 'parent' : v === 'athlete' ? 'athlete' : 'coach')
            }}
          >
            <option value="athlete">Athlete picks</option>
            <option value="coach">Coach assigns</option>
            {(isParent || source === 'parent') && <option value="parent">Parent logs</option>}
          </select>
        </label>
      </div>

      <label className="text-xs text-[var(--muted)]">
        Optional note
        <input
          className="mt-1 h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
          placeholder="3 sets before bed"
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
        />
      </label>

      {isCoach && (
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1218] p-4">
          <p className="text-sm font-semibold text-[var(--text)]">Save an exercise you reuse</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Name it once. Then it shows up when you type.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
              placeholder="Exercise name"
              value={newExName}
              onChange={(e) => onNewExName(e.target.value)}
            />
            <select
              className="rounded-xl border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-xs"
              value={newExMode}
              onChange={(e) => onNewExMode(e.target.value as HomeworkTrackMode)}
            >
              <option value="reps">Reps</option>
              <option value="hold">Holds</option>
              <option value="hold_or_reps">Holds and reps</option>
            </select>
            <button
              type="button"
              onClick={onSaveExercise}
              className="rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[#06281f]"
            >
              Save exercise
            </button>
          </div>
          {coachExercises.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {coachExercises.map((ex) => (
                <li key={ex.id} className="flex items-center justify-between gap-2">
                  <span>
                    {ex.name} · {ex.trackMode.replace(/_/g, ' ')}
                  </span>
                  <button
                    type="button"
                    className="text-[var(--bad)] underline"
                    onClick={() => onRemoveExercise(ex.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
