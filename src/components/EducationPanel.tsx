/**
 * Education — learn shapes & curriculum pathways without a camera.
 * For gymnasts and parents studying body positions before Tasks practice.
 */

import { useMemo, useState } from 'react'
import { CURRICULUM_TASKS, getTask } from '../config/curriculum'
import { getShape, SHAPES } from '../config/shapes'
import {
  criterionHowToHit,
  curriculumShapeIds,
  firstPathwayTaskIndex,
  formatCriterionTarget,
  howToHitShape,
  visibleCriteria,
} from '../lib/educationCopy'
import { pickReferencePhoto } from '../lib/storage'
import type { ReferencePhoto, ShapeDef } from '../types'
import { ViewCallout } from './ViewCallout'

type EduView =
  | { kind: 'home' }
  | { kind: 'shapes' }
  | { kind: 'shape'; shapeId: string }
  | { kind: 'pathways' }
  | { kind: 'task'; taskId: string }

type Props = {
  referencePhotos: ReferencePhoto[]
}

type ShapeFilter = 'all' | 'pathway' | 'other'

export function EducationPanel({ referencePhotos }: Props) {
  const [view, setView] = useState<EduView>({ kind: 'home' })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ShapeFilter>('all')
  const [refFailed, setRefFailed] = useState<Record<string, boolean>>({})

  const pathwayIds = useMemo(() => curriculumShapeIds(), [])

  const filteredShapes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SHAPES.filter((s) => {
      const inPathway = pathwayIds.has(s.id)
      if (filter === 'pathway' && !inPathway) return false
      if (filter === 'other' && inPathway) return false
      if (!q) return true
      const hay = `${s.name} ${s.description} ${s.category}`.toLowerCase()
      return hay.includes(q)
    }).sort((a, b) => {
      // Pathway shapes first (by curriculum order), then alphabetical
      const ai = firstPathwayTaskIndex(a.id)
      const bi = firstPathwayTaskIndex(b.id)
      if (ai != null && bi != null) return ai - bi
      if (ai != null) return -1
      if (bi != null) return 1
      return a.name.localeCompare(b.name)
    })
  }, [query, filter, pathwayIds])

  const goHome = () => setView({ kind: 'home' })
  const goShapes = () => setView({ kind: 'shapes' })
  const goPathways = () => setView({ kind: 'pathways' })
  const openShape = (shapeId: string) => setView({ kind: 'shape', shapeId })
  const openTask = (taskId: string) => setView({ kind: 'task', taskId })

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="mb-1 text-xs uppercase tracking-wider text-[var(--muted)]">
          Learn without a camera
        </p>
        <h2 className="text-xl font-semibold text-[var(--text)] sm:text-2xl">
          Education
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Study body positions and task pathways here first. When you are ready to
          practice with scoring, open the <strong className="text-[var(--text)]">Tasks</strong>{' '}
          tab and start the camera.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <NavChip
            active={view.kind === 'home'}
            onClick={goHome}
            label="Overview"
          />
          <NavChip
            active={view.kind === 'shapes' || view.kind === 'shape'}
            onClick={goShapes}
            label="Shape library"
          />
          <NavChip
            active={view.kind === 'pathways' || view.kind === 'task'}
            onClick={goPathways}
            label="Task pathways"
          />
        </div>
      </header>

      {view.kind === 'home' && (
        <HomeView
          pathwayCount={pathwayIds.size}
          shapeCount={SHAPES.length}
          taskCount={CURRICULUM_TASKS.length}
          onShapes={goShapes}
          onPathways={goPathways}
        />
      )}

      {view.kind === 'shapes' && (
        <ShapeLibrary
          shapes={filteredShapes}
          pathwayIds={pathwayIds}
          query={query}
          filter={filter}
          onQuery={setQuery}
          onFilter={setFilter}
          onOpen={openShape}
          referencePhotos={referencePhotos}
          refFailed={refFailed}
          onRefError={(id) => setRefFailed((m) => ({ ...m, [id]: true }))}
        />
      )}

      {view.kind === 'shape' && (
        <ShapeDetail
          shapeId={view.shapeId}
          pathwayIds={pathwayIds}
          referencePhotos={referencePhotos}
          refFailed={refFailed}
          onRefError={(id) => setRefFailed((m) => ({ ...m, [id]: true }))}
          onBack={goShapes}
          onOpenTask={openTask}
        />
      )}

      {view.kind === 'pathways' && (
        <PathwayList onOpen={openTask} onOpenShape={openShape} />
      )}

      {view.kind === 'task' && (
        <TaskDetail
          taskId={view.taskId}
          onBack={goPathways}
          onOpenShape={openShape}
          onOpenTask={openTask}
        />
      )}
    </div>
  )
}

function NavChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm ${
        active
          ? 'bg-[var(--accent-dim)] font-semibold text-white'
          : 'border border-[var(--panel-border)] text-[var(--muted)] hover:text-[var(--text)]'
      }`}
    >
      {label}
    </button>
  )
}

function HomeView({
  pathwayCount,
  shapeCount,
  taskCount,
  onShapes,
  onPathways,
}: {
  pathwayCount: number
  shapeCount: number
  taskCount: number
  onShapes: () => void
  onPathways: () => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={onShapes}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">Shape library</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Browse {shapeCount} shapes — cues, key criteria, quality threshold, and
          reference photos when available. {pathwayCount} are on the athlete pathway.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          Browse shapes →
        </span>
      </button>
      <button
        type="button"
        onClick={onPathways}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">Task pathways</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Walk the {taskCount}-task curriculum in order. See hold times (5s beginner /
          3s mastered), pass-through notes, and what unlocks next.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          View pathway →
        </span>
      </button>
    </div>
  )
}

function ShapeLibrary({
  shapes,
  pathwayIds,
  query,
  filter,
  onQuery,
  onFilter,
  onOpen,
  referencePhotos,
  refFailed,
  onRefError,
}: {
  shapes: ShapeDef[]
  pathwayIds: Set<string>
  query: string
  filter: ShapeFilter
  onQuery: (q: string) => void
  onFilter: (f: ShapeFilter) => void
  onOpen: (id: string) => void
  referencePhotos: ReferencePhoto[]
  refFailed: Record<string, boolean>
  onRefError: (id: string) => void
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--muted)]">
            Search shapes
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Name or description…"
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-[var(--text)]"
          />
        </label>
        <div className="flex gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] p-1">
          {(
            [
              ['all', 'All'],
              ['pathway', 'On pathway'],
              ['other', 'Extra'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onFilter(id)}
              className={`rounded-md px-2.5 py-1.5 text-xs ${
                filter === id
                  ? 'bg-[var(--accent-dim)] font-semibold text-white'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--muted)]">
        {shapes.length} shape{shapes.length === 1 ? '' : 's'}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {shapes.map((shape) => {
          const ref = pickReferencePhoto(referencePhotos, shape.id, null)
          const showThumb = ref && !refFailed[ref.id]
          const onPath = pathwayIds.has(shape.id)
          return (
            <li key={shape.id}>
              <button
                type="button"
                onClick={() => onOpen(shape.id)}
                className="flex h-full w-full gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3 text-left transition hover:border-[var(--accent-dim)]"
              >
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-[#0d1218]">
                  {showThumb ? (
                    <img
                      src={ref.dataUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={() => onRefError(ref.id)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-tight text-[var(--muted)]">
                      No photo
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--text)]">{shape.name}</span>
                    {onPath && (
                      <span className="rounded bg-[var(--accent-dim)]/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
                        Pathway
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                    {shape.description}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                    Quality ≥ {shape.qualityThreshold}
                  </p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {shapes.length === 0 && (
        <p className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          No shapes match that search.
        </p>
      )}
    </section>
  )
}

function ShapeDetail({
  shapeId,
  pathwayIds,
  referencePhotos,
  refFailed,
  onRefError,
  onBack,
  onOpenTask,
}: {
  shapeId: string
  pathwayIds: Set<string>
  referencePhotos: ReferencePhoto[]
  refFailed: Record<string, boolean>
  onRefError: (id: string) => void
  onBack: () => void
  onOpenTask: (taskId: string) => void
}) {
  const shape = getShape(shapeId)
  if (!shape) {
    return (
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-sm text-[var(--bad)]">Shape not found.</p>
        <button type="button" onClick={onBack} className="mt-3 text-sm text-[var(--accent)]">
          ← Back to library
        </button>
      </div>
    )
  }

  const ref = pickReferencePhoto(referencePhotos, shape.id, null)
  const showRef = ref && !refFailed[ref.id]
  const criteria = visibleCriteria(shape)
  const howTo = howToHitShape(shape)
  const onPath = pathwayIds.has(shape.id)
  const pathIdx = firstPathwayTaskIndex(shape.id)
  const pathTask = pathIdx != null ? CURRICULUM_TASKS[pathIdx] : null

  return (
    <article className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
      >
        ← Shape library
      </button>

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-[var(--text)]">{shape.name}</h3>
              {onPath && (
                <span className="rounded bg-[var(--accent-dim)]/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
                  On athlete pathway
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">{shape.description}</p>
            {shape.bodyPosition && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--text)]">{shape.bodyPosition}</p>
            )}
            <div className="mt-3">
              <ViewCallout shape={shape} />
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Category: {shape.category} · Quality threshold:{' '}
              <strong className="text-[var(--text)]">{shape.qualityThreshold}</strong>
            </p>
          </div>
        </div>

        {pathTask && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            First appears in{' '}
            <button
              type="button"
              onClick={() => onOpenTask(pathTask.id)}
              className="font-medium text-[var(--accent)] hover:underline"
            >
              {pathTask.name}
            </button>
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Reference photo
        </h4>
        {showRef ? (
          <img
            src={ref.dataUrl}
            alt={`${shape.name} reference`}
            className="max-h-80 w-full rounded-md object-contain bg-[#0d1218]"
            onError={() => onRefError(ref.id)}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--panel-border)] bg-[#121820] px-4 py-8 text-center text-sm text-[var(--muted)]">
            <p className="font-medium text-[var(--text)]">No reference photo yet</p>
            <p className="mt-2">
              A coach can upload one in the <strong className="text-[var(--text)]">Tasks</strong>{' '}
              tab (shared for this shape), or drop a file in{' '}
              <code className="text-[var(--accent)]">public/references/</code> named like{' '}
              <code className="text-[var(--accent)]">{shape.id}.jpg</code> or{' '}
              <code className="text-[var(--accent)]">{shape.id}.png</code>.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          How to hit this shape
        </h4>
        {howTo.length > 0 ? (
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--text)]">
            {howTo.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No tips yet — add <code className="text-[var(--accent)]">tips</code> or feedback
            strings in <code className="text-[var(--accent)]">shapes.ts</code>.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Key criteria
        </h4>
        <ul className="space-y-3">
          {criteria.map((c) => {
            const cues = criterionHowToHit(c)
            return (
              <li
                key={c.id}
                className="border-b border-[var(--panel-border)] pb-3 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-[var(--text)]">{c.label}</span>
                  <span className="text-xs text-[var(--muted)]">
                    weight {c.weight}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {formatCriterionTarget(c)}
                </p>
                {cues.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-sm text-[var(--text)]">
                    {cues.map((cue) => (
                      <li key={cue} className="before:mr-1.5 before:text-[var(--accent)] before:content-['→']">
                        {cue}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </article>
  )
}

function PathwayList({
  onOpen,
  onOpenShape,
}: {
  onOpen: (taskId: string) => void
  onOpenShape: (shapeId: string) => void
}) {
  return (
    <section className="space-y-3">
      <p className="text-sm text-[var(--muted)]">
        Tasks unlock in order. Complete a task once in <strong className="text-[var(--text)]">Tasks</strong>{' '}
        mode to open the next. Holds start at 5s and drop to 3s after mastery.
      </p>
      <ol className="space-y-3">
        {CURRICULUM_TASKS.map((task, i) => {
          const next = CURRICULUM_TASKS[i + 1]
          const prereq = task.requiresTaskId ? getTask(task.requiresTaskId) : null
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onOpen(task.id)}
                className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-left transition hover:border-[var(--accent-dim)]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-[var(--text)]">{task.name}</h3>
                  <span className="text-xs text-[var(--muted)]">
                    {task.steps.length} step{task.steps.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{task.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {task.steps.map((step, si) => {
                    const s = getShape(step.shapeId)
                    return (
                      <span
                        key={`${task.id}-${si}`}
                        className="rounded bg-[#0d1218] px-2 py-0.5 text-xs text-[var(--muted)]"
                      >
                        {s?.name ?? step.shapeId}
                        {step.passThrough ? ' · pass-through' : ''}
                      </span>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {prereq
                    ? `Unlocks after: ${prereq.name}`
                    : 'Always available (start here)'}
                  {next ? ` · Next: ${next.name}` : ' · End of pathway'}
                </p>
              </button>
              {/* Keep shape chips clickable without nesting buttons — secondary row */}
              <div className="mt-1 flex flex-wrap gap-2 pl-1">
                {task.steps.map((step, si) => {
                  const s = getShape(step.shapeId)
                  if (!s) return null
                  return (
                    <button
                      key={`link-${task.id}-${si}`}
                      type="button"
                      onClick={() => onOpenShape(step.shapeId)}
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      Learn {s.name}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function TaskDetail({
  taskId,
  onBack,
  onOpenShape,
  onOpenTask,
}: {
  taskId: string
  onBack: () => void
  onOpenShape: (shapeId: string) => void
  onOpenTask: (taskId: string) => void
}) {
  const task = getTask(taskId)
  if (!task) {
    return (
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-sm text-[var(--bad)]">Task not found.</p>
        <button type="button" onClick={onBack} className="mt-3 text-sm text-[var(--accent)]">
          ← Back to pathways
        </button>
      </div>
    )
  }

  const idx = CURRICULUM_TASKS.findIndex((t) => t.id === task.id)
  const prev = idx > 0 ? CURRICULUM_TASKS[idx - 1] : null
  const next = idx >= 0 && idx < CURRICULUM_TASKS.length - 1 ? CURRICULUM_TASKS[idx + 1] : null
  const prereq = task.requiresTaskId ? getTask(task.requiresTaskId) : null

  return (
    <article className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
      >
        ← Task pathways
      </button>

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="text-xl font-semibold text-[var(--text)]">{task.name}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{task.description}</p>
        <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
          <li>
            Unlock:{' '}
            {prereq ? (
              <>
                after completing{' '}
                <button
                  type="button"
                  onClick={() => onOpenTask(prereq.id)}
                  className="text-[var(--accent)] hover:underline"
                >
                  {prereq.name}
                </button>
              </>
            ) : (
              'available from the start'
            )}
          </li>
          <li>
            Mastery: after {task.masterAfterCompletions} successful finishes, holds drop
            from beginner (usually 5s) to mastered (usually 3s).
          </li>
          {next && (
            <li>
              What comes next:{' '}
              <button
                type="button"
                onClick={() => onOpenTask(next.id)}
                className="text-[var(--accent)] hover:underline"
              >
                {next.name}
              </button>
            </li>
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Step-by-step
        </h4>
        <ol className="space-y-4">
          {task.steps.map((step, i) => {
            const shape = getShape(step.shapeId)
            return (
              <li
                key={`${task.id}-step-${i}`}
                className="border-b border-[var(--panel-border)] pb-4 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-[var(--text)]">
                    {i + 1}. {shape?.name ?? step.shapeId}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    Hold {step.beginnerSeconds}s beginner / {step.masteredSeconds}s mastered
                    {step.passThrough ? ' · pass-through' : ''}
                  </span>
                </div>
                {shape && (
                  <p className="mt-1 text-sm text-[var(--muted)]">{shape.description}</p>
                )}
                {step.note && (
                  <p className="mt-2 rounded-md bg-[#121820] px-3 py-2 text-sm text-[var(--text)]">
                    {step.note}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                  {step.speakCorrections && (
                    <span>Voice corrections on during Tasks practice</span>
                  )}
                  {step.passThrough && (
                    <span>Brief quality hit counts — full hold optional</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenShape(step.shapeId)}
                  className="mt-2 text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Open shape education →
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        {prev && (
          <button
            type="button"
            onClick={() => onOpenTask(prev.id)}
            className="rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-[var(--muted)] hover:text-[var(--text)]"
          >
            ← {prev.name}
          </button>
        )}
        {next && (
          <button
            type="button"
            onClick={() => onOpenTask(next.id)}
            className="rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-[var(--muted)] hover:text-[var(--text)]"
          >
            {next.name} →
          </button>
        )}
      </div>
    </article>
  )
}
