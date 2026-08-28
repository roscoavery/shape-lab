/**
 * Education — learn shapes & curriculum pathways without a camera.
 * For gymnasts and parents studying body positions before Tasks practice.
 */

import { useEffect, useMemo, useState } from 'react'
import { CURRICULUM_TASKS, getTask } from '../config/curriculum'
import { getShape } from '../config/shapes'
import {
  criterionHowToHit,
  curriculumShapeIds,
  firstPathwayTaskIndex,
  formatCriterionTarget,
  howToHitShape,
  learnLibraryShapes,
  otherSamePositionIds,
  visibleCriteria,
} from '../lib/educationCopy'
import { CoachStillGallery, ReferenceStill } from './ReferenceStill'
import { listCaptures, type TaskCapture } from '../lib/captureStore'
import type { ReferencePhoto, ShapeDef } from '../types'
import { ViewCallout } from './ViewCallout'
import { ShapeGlossary } from './ShapeGlossary'
import { ShapeQuiz } from './ShapeQuiz'
import { HitFolder } from './HitFolder'
import { groupIgStillsByShape, igStillsForShape, listIgStills } from '../lib/igStills'
import { deleteReferencePhoto } from '../lib/storage'
import { removeIgStill } from '../lib/igStillStore'

type EduView =
  | { kind: 'home' }
  | { kind: 'shapes' }
  | { kind: 'shape'; shapeId: string }
  | { kind: 'pathways' }
  | { kind: 'task'; taskId: string }
  | { kind: 'quiz'; pool?: 'pathway' | 'arm-positions' }
  | { kind: 'hits' }
  | { kind: 'glossary' }
  | { kind: 'ig' }

type Props = {
  referencePhotos: ReferencePhoto[]
  athleteId: string | null
  athleteName?: string | null
  onReferencesChange: (photos: ReferencePhoto[]) => void
}

type ShapeFilter = 'all' | 'pathway' | 'other'

export function EducationPanel({
  referencePhotos,
  athleteId,
  athleteName,
  onReferencesChange,
}: Props) {
  const [view, setView] = useState<EduView>({ kind: 'home' })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ShapeFilter>('all')
  const [hits, setHits] = useState<TaskCapture[]>([])

  useEffect(() => {
    if (!athleteId) {
      setHits([])
      return
    }
    void listCaptures(athleteId).then(setHits).catch(() => setHits([]))
  }, [athleteId, view.kind])

  const pathwayIds = useMemo(() => curriculumShapeIds(), [])
  const catalog = useMemo(() => learnLibraryShapes(), [])

  const filteredShapes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog
      .filter((s) => {
        const inPathway = pathwayIds.has(s.id)
        if (filter === 'pathway' && !inPathway) return false
        if (filter === 'other' && inPathway) return false
        if (!q) return true
        const aliases = otherSamePositionIds(s.id)
          .map((id) => getShape(id)?.name ?? '')
          .join(' ')
        const hay = `${s.name} ${s.description} ${s.category} ${aliases}`.toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => {
        // Pathway shapes first (by curriculum order), then alphabetical
        const ai = firstPathwayTaskIndex(a.id)
        const bi = firstPathwayTaskIndex(b.id)
        if (ai != null && bi != null) return ai - bi
        if (ai != null) return -1
        if (bi != null) return 1
        return a.name.localeCompare(b.name)
      })
  }, [query, filter, pathwayIds, catalog])

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
          <NavChip
            active={view.kind === 'glossary'}
            onClick={() => setView({ kind: 'glossary' })}
            label="Glossary"
          />
          <NavChip
            active={view.kind === 'quiz' && view.pool !== 'arm-positions'}
            onClick={() => setView({ kind: 'quiz', pool: 'pathway' })}
            label="Shape test"
          />
          <NavChip
            active={view.kind === 'quiz' && view.pool === 'arm-positions'}
            onClick={() => setView({ kind: 'quiz', pool: 'arm-positions' })}
            label="Arm positions"
          />
          <NavChip
            active={view.kind === 'ig'}
            onClick={() => setView({ kind: 'ig' })}
            label="IG shapes"
          />
          <NavChip
            active={view.kind === 'hits'}
            onClick={() => setView({ kind: 'hits' })}
            label="My shapes"
          />
        </div>
      </header>

      {view.kind === 'home' && (
        <HomeView
          pathwayCount={pathwayIds.size}
          shapeCount={catalog.length}
          taskCount={CURRICULUM_TASKS.length}
          onShapes={goShapes}
          onPathways={goPathways}
          onQuiz={() => setView({ kind: 'quiz', pool: 'pathway' })}
          onArmQuiz={() => setView({ kind: 'quiz', pool: 'arm-positions' })}
          onHits={() => setView({ kind: 'hits' })}
          onGlossary={() => setView({ kind: 'glossary' })}
          onIg={() => setView({ kind: 'ig' })}
          igCount={listIgStills(referencePhotos).length}
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
        />
      )}

      {view.kind === 'shape' && (
        <ShapeDetail
          shapeId={view.shapeId}
          pathwayIds={pathwayIds}
          referencePhotos={referencePhotos}
          onBack={goShapes}
          onOpenTask={openTask}
          onOpenShape={openShape}
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

      {view.kind === 'glossary' && (
        <ShapeGlossary
          referencePhotos={referencePhotos}
          onReferencesChange={onReferencesChange}
        />
      )}

      {view.kind === 'quiz' && (
        <ShapeQuiz
          referencePhotos={referencePhotos}
          pool={view.pool === 'arm-positions' ? 'arm-positions' : 'pathway'}
          onExit={goHome}
        />
      )}

      {view.kind === 'ig' && (
        <IgShapesLibrary
          referencePhotos={referencePhotos}
          onReferencesChange={onReferencesChange}
        />
      )}

      {view.kind === 'hits' && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          {!athleteId ? (
            <p className="text-sm text-[var(--muted)]">
              Select an athlete on the Tasks tab first — their hit photos show up here, grouped by
              shape.
            </p>
          ) : (
            <HitFolder captures={hits} athleteName={athleteName} />
          )}
        </section>
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
  onQuiz,
  onArmQuiz,
  onHits,
  onGlossary,
  onIg,
  igCount,
}: {
  pathwayCount: number
  shapeCount: number
  taskCount: number
  onShapes: () => void
  onPathways: () => void
  onQuiz: () => void
  onArmQuiz: () => void
  onHits: () => void
  onGlossary: () => void
  onIg: () => void
  igCount: number
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
          Browse {shapeCount} positions with the coach stills you shared, plus
          homework. {pathwayCount} are on the athlete pathway. Arm drills live in
          the Arm positions test, not as empty library cards.
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
          Walk the {taskCount}-task curriculum in order. See hold times (5s on
          standalone first hits, 3s in sequences), pass-through notes, and what unlocks next.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          View pathway →
        </span>
      </button>
      <button
        type="button"
        onClick={onGlossary}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">Shape glossary</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          One coach photo per practiced shape, plus an Extra folder for positions you
          want athletes to learn but will not score with the camera. Add notes when you
          upload.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          Open glossary →
        </span>
      </button>
      <button
        type="button"
        onClick={onQuiz}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">Shape test</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Multiple choice: name the position from a body-position description, or identify
          the shape in a reference photo. Landing lunge and Lunge · open shoulders are the
          same position — the test treats them as one.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          Take the test →
        </span>
      </button>
      <button
        type="button"
        onClick={onArmQuiz}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">Arm positions test</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Low V, front middle, open shoulders, T, and high V — standing and on a
          landing lunge. These are not a Tasks gate right now; study them here.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          Test arm positions →
        </span>
      </button>
      <button
        type="button"
        onClick={onIg}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">IG shapes library</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Crops from Compare. Screenshot a looping Instagram clip or replay — press one
          corner, drag to the opposite corner — and the still lands here. {igCount} saved.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          Open IG shapes →
        </span>
      </button>
      <button
        type="button"
        onClick={onHits}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">My shapes</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          The athlete&apos;s own hit photos, filed by shape — a personal reference folder
          built automatically in Tasks.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          Open folder →
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
}: {
  shapes: ShapeDef[]
  pathwayIds: Set<string>
  query: string
  filter: ShapeFilter
  onQuery: (q: string) => void
  onFilter: (f: ShapeFilter) => void
  onOpen: (id: string) => void
  referencePhotos: ReferencePhoto[]
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
              ['other', 'Homework & extras'],
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
        {shapes.length} shape{shapes.length === 1 ? '' : 's'}. Empty thumbnails are
        homework without a still yet — every picture you sent is in this list.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {shapes.map((shape) => {
          const onPath = pathwayIds.has(shape.id)
          return (
            <li key={shape.id}>
              <button
                type="button"
                onClick={() => onOpen(shape.id)}
                className="flex h-full w-full gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3 text-left transition hover:border-[var(--accent-dim)]"
              >
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-[#0d1218]">
                  <ReferenceStill
                    shapeId={shape.id}
                    photos={referencePhotos}
                    alt=""
                    className="h-full w-full object-cover"
                  />
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
                  {otherSamePositionIds(shape.id).length > 0 && (
                    <p className="mt-0.5 text-[10px] font-medium text-[var(--accent)]">
                      Same position as {otherSamePositionIds(shape.id).map((id) => getShape(id)?.name ?? id).join(', ')}
                    </p>
                  )}
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
  onBack,
  onOpenTask,
  onOpenShape,
}: {
  shapeId: string
  pathwayIds: Set<string>
  referencePhotos: ReferencePhoto[]
  onBack: () => void
  onOpenTask: (taskId: string) => void
  onOpenShape: (shapeId: string) => void
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

  const criteria = visibleCriteria(shape)
  const howTo = howToHitShape(shape)
  const onPath = pathwayIds.has(shape.id)
  const pathIdx = firstPathwayTaskIndex(shape.id)
  const pathTask = pathIdx != null ? CURRICULUM_TASKS[pathIdx] : null
  const igForShape = igStillsForShape(referencePhotos, shape.id)

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
            {otherSamePositionIds(shape.id).length > 0 && (
              <p className="mt-2 text-sm text-[var(--accent)]">
                Same body position as{' '}
                {otherSamePositionIds(shape.id).map((id, i, arr) => {
                  const other = getShape(id)
                  return (
                    <span key={id}>
                      <button
                        type="button"
                        onClick={() => onOpenShape(id)}
                        className="font-medium underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent)]"
                      >
                        {other?.name ?? id}
                      </button>
                      {i < arr.length - 1 ? ', ' : ''}
                    </span>
                  )
                })}
                . They share this still.
              </p>
            )}
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
          Coach still
        </h4>
        <CoachStillGallery
          shapeId={shape.id}
          photos={referencePhotos}
          alt={`${shape.name} reference`}
          emptyLabel="No coach still for this shape yet"
          imgClass="max-h-80 w-full object-contain"
        />
      </div>

      {igForShape.length > 0 && (
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            IG shapes
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {igForShape.map((still) => (
              <img
                key={still.id}
                src={still.dataUrl}
                alt={still.label ?? shape.name}
                className="max-h-48 w-full rounded-md bg-[#0d1218] object-contain"
              />
            ))}
          </div>
        </div>
      )}

      {shape.coachNotes && (
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            How we use this shape
          </h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
            {shape.coachNotes}
          </p>
        </div>
      )}

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
        mode to open the next. Standalone holds start at 5s and drop to 3s after mastery.
        Sequences always use 3s holds. Sequence FTOS can stay in profile.
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

function IgShapesLibrary({
  referencePhotos,
  onReferencesChange,
}: {
  referencePhotos: ReferencePhoto[]
  onReferencesChange: (photos: ReferencePhoto[]) => void
}) {
  const groups = groupIgStillsByShape(referencePhotos)
  const total = groups.reduce((n, g) => n + g.stills.length, 0)

  const remove = async (id: string) => {
    await removeIgStill(id)
    await deleteReferencePhoto(id)
    onReferencesChange(referencePhotos.filter((p) => p.id !== id))
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="text-lg font-semibold text-[var(--text)]">IG shapes library</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          These stills are cropped from Compare — looping Instagram clips, uploaded
          reference video, or athlete replay. They do not replace the coach stills in
          Shape library. On Tasks, Homework, or Coach, pick any of these (or any coach
          still) as a ghost overlay on the camera.
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {total === 0
            ? 'None saved yet. Open Compare, pause the clip, tap Screenshot, press one corner of the shape, and drag to the opposite corner.'
            : `${total} still${total === 1 ? '' : 's'} in ${groups.length} shape${groups.length === 1 ? '' : 's'}.`}
        </p>
      </div>

      {groups.map((group) => (
        <div
          key={group.shapeId}
          className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4"
        >
          <h4 className="mb-3 text-sm font-semibold text-[var(--text)]">{group.name}</h4>
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {group.stills.map((still) => (
              <li
                key={still.id}
                className="overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[#0d1218]"
              >
                <img
                  src={still.dataUrl}
                  alt={still.label ?? group.name}
                  className="max-h-48 w-full object-contain"
                />
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <p className="min-w-0 truncate text-[11px] text-[var(--muted)]">
                    {still.label || group.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => void remove(still.id)}
                    className="shrink-0 text-[11px] text-[var(--bad)] hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
