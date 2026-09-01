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
import { ViewCallout } from './ViewCallout'
import { ShapeGlossary } from './ShapeGlossary'
import { ShapeQuiz } from './ShapeQuiz'
import { HitFolder } from './HitFolder'
import { ReferenceFeed } from './learn/ReferenceFeed'
import { groupIgStillsByShape, igStillsForShape, listIgStills } from '../lib/igStills'
import { deleteReferencePhoto } from '../lib/storage'
import { removeIgStill, updateIgStill } from '../lib/igStillStore'
import { useShapeCopy } from './ShapeCopyContext'
import { ShapeCopyEditor } from './ShapeCopyEditor'
import { StillCropEditor } from './StillCropEditor'
import { CroppedStill } from './CroppedStill'
import { PhysicsLessons } from './learn/PhysicsLessons'
import { PhysicsQuiz } from './learn/PhysicsQuiz'
import { drillsForShape, subscribeCoachContent } from '../lib/coachContentStore'
import { isCoachProfile } from '../lib/profileRole'
import { AddGymShapeForm } from './AddGymShapeForm'
import { CollapsibleSection } from './CollapsibleSection'
import { ExpandableNotes, firstCue } from './ExpandableNotes'
import { PortraitVideoPlayer } from './PortraitVideoPlayer'
import { ShapeExplorer } from './learn/ShapeExplorer'
import type { Athlete, ReferencePhoto, ShapeDef, ShapeTestRecord } from '../types'
import type { QuizTaker } from './learn/QuizWho'

type EduView =
  | { kind: 'home' }
  | { kind: 'shapes' }
  | { kind: 'shape'; shapeId: string }
  | { kind: 'pathways' }
  | { kind: 'task'; taskId: string }
  | { kind: 'quiz'; pool?: 'pathway' | 'arm-positions' }
  | { kind: 'physicsQuiz' }
  | { kind: 'hits' }
  | { kind: 'glossary' }
  | { kind: 'ig' }
  | { kind: 'scroll' }
  | { kind: 'physics' }

export type LearnIntent = 'shapes' | 'quiz' | 'scroll'

type Props = {
  referencePhotos: ReferencePhoto[]
  athleteId: string | null
  athleteName?: string | null
  persistIgToApp?: boolean
  onReferencesChange: (photos: ReferencePhoto[]) => void
  signedIn?: Athlete | null
  athletes?: Athlete[]
  intent?: LearnIntent | null
  onIntentConsumed?: () => void
  presetQuizTaker?: { firstName: string; lastName: string; athleteId?: string } | null
  onQuizTaker?: (taker: { firstName: string; lastName: string; athleteId?: string }) => void
  onRecordQuiz?: (taker: QuizTaker, record: ShapeTestRecord) => void
}

type ShapeFilter = 'all' | 'pathway' | 'other'

export function EducationPanel({
  referencePhotos,
  athleteId,
  athleteName,
  persistIgToApp = false,
  onReferencesChange,
  signedIn = null,
  athletes = [],
  intent = null,
  onIntentConsumed,
  presetQuizTaker = null,
  onQuizTaker,
  onRecordQuiz,
}: Props) {
  const [view, setView] = useState<EduView>({ kind: 'shapes' })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ShapeFilter>('all')
  const [hits, setHits] = useState<TaskCapture[]>([])
  const [catalogTick, setCatalogTick] = useState(0)
  const [exploreId, setExploreId] = useState<string | null>(null)
  const { copyFor } = useShapeCopy()
  const canAddGymShape = Boolean(signedIn && isCoachProfile(signedIn))

  useEffect(() => subscribeCoachContent(() => setCatalogTick((n) => n + 1)), [])

  useEffect(() => {
    if (!intent) return
    if (intent === 'shapes') setView({ kind: 'shapes' })
    if (intent === 'quiz') setView({ kind: 'quiz', pool: 'pathway' })
    if (intent === 'scroll') setView({ kind: 'scroll' })
    onIntentConsumed?.()
  }, [intent, onIntentConsumed])

  useEffect(() => {
    if (!athleteId) {
      setHits([])
      return
    }
    void listCaptures(athleteId).then(setHits).catch(() => setHits([]))
  }, [athleteId, view.kind])

  const pathwayIds = useMemo(() => curriculumShapeIds(), [])
  const catalog = useMemo(() => learnLibraryShapes(), [catalogTick])

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
        const athlete = copyFor(s.id).athlete
        const hay = `${s.name} ${athlete} ${s.description} ${s.category} ${aliases}`.toLowerCase()
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
  }, [query, filter, pathwayIds, catalog, copyFor])

  const goHome = () => setView({ kind: 'home' })
  const goShapes = () => {
    setQuery('')
    setFilter('all')
    setView({ kind: 'shapes' })
  }
  const goPathways = () => setView({ kind: 'pathways' })
  const openShape = (shapeId: string) => setView({ kind: 'shape', shapeId })
  const openTask = (taskId: string) => setView({ kind: 'task', taskId })

  return (
    <div className={`mx-auto space-y-4 ${view.kind === 'scroll' ? 'max-w-xl' : 'max-w-4xl'}`}>
      <header className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">Learn</h2>
        <div className="mt-3 flex flex-wrap gap-1 rounded-xl bg-[#0d1218] p-1">
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
            active={view.kind === 'physics'}
            onClick={() => setView({ kind: 'physics' })}
            label="Tumbling physics"
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
            active={view.kind === 'physicsQuiz'}
            onClick={() => setView({ kind: 'physicsQuiz' })}
            label="Physics test"
          />
          <NavChip
            active={view.kind === 'scroll'}
            onClick={() => setView({ kind: 'scroll' })}
            label="Reference scroll"
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
          onScroll={() => setView({ kind: 'scroll' })}
          onPhysics={() => setView({ kind: 'physics' })}
          onPhysicsQuiz={() => setView({ kind: 'physicsQuiz' })}
          igCount={listIgStills(referencePhotos).length}
          referencePhotos={referencePhotos}
          shapes={catalog}
        />
      )}

      {view.kind === 'shapes' && (
        <>
          {canAddGymShape && signedIn && (
            <AddGymShapeForm signedIn={signedIn} />
          )}
          <ShapeLibrary
            shapes={filteredShapes}
            pathwayIds={pathwayIds}
            query={query}
            filter={filter}
            onQuery={setQuery}
            onFilter={setFilter}
            onOpen={openShape}
            onExplore={(id) => setExploreId(id)}
            referencePhotos={referencePhotos}
          />
        </>
      )}

      {view.kind === 'shape' && (
        <ShapeDetail
          shapeId={view.shapeId}
          orderedShapeIds={filteredShapes.map((shape) => shape.id)}
          pathwayIds={pathwayIds}
          referencePhotos={referencePhotos}
          onBack={goShapes}
          onOpenTask={openTask}
          onOpenShape={openShape}
          onExplore={() => setExploreId(view.shapeId)}
        />
      )}

      {view.kind === 'pathways' && (
        <PathwayList onOpen={openTask} onOpenShape={openShape} />
      )}

      {view.kind === 'physics' && (
        <PhysicsLessons onTakeTest={() => setView({ kind: 'physicsQuiz' })} />
      )}

      {view.kind === 'task' && (
        <TaskDetail
          taskId={view.taskId}
          onBack={goPathways}
          onOpenShape={openShape}
          onOpenTask={openTask}
        />
      )}

      {exploreId && filteredShapes.length > 0 && (
        <ShapeExplorer
          shapes={filteredShapes}
          startId={exploreId}
          photos={referencePhotos}
          onClose={() => setExploreId(null)}
        />
      )}

      {view.kind === 'scroll' && <ReferenceFeed athlete={signedIn} />}

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
          athletes={athletes}
          presetTaker={presetQuizTaker}
          onTakerReady={onQuizTaker}
          onGrade={onRecordQuiz}
        />
      )}

      {view.kind === 'physicsQuiz' && <PhysicsQuiz onExit={goHome} />}

      {view.kind === 'ig' && (
        <IgShapesLibrary
          referencePhotos={referencePhotos}
          onReferencesChange={onReferencesChange}
          persistIgToApp={persistIgToApp}
        />
      )}

      {view.kind === 'hits' && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          {!athleteId ? (
            <p className="text-sm text-[var(--muted)]">
              Unlock a profile first — their hit photos show up here, grouped by shape.
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
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        active
          ? 'bg-[var(--panel)] font-semibold text-[var(--text)]'
          : 'text-[var(--muted)] hover:text-[var(--text)]'
      }`}
    >
      {label}
    </button>
  )
}

function ShapeSideArrow({
  side,
  shapeId,
  onOpen,
}: {
  side: 'left' | 'right'
  shapeId: string | null
  onOpen: (shapeId: string) => void
}) {
  const name = shapeId ? getShape(shapeId)?.name ?? shapeId : null
  return (
    <button
      type="button"
      disabled={!shapeId}
      onClick={() => shapeId && onOpen(shapeId)}
      aria-label={side === 'left' ? 'Previous shape' : 'Next shape'}
      title={
        name
          ? `${side === 'left' ? 'Previous' : 'Next'}: ${name}`
          : side === 'left'
            ? 'Previous shape'
            : 'Next shape'
      }
      className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/70 text-xl text-white shadow-lg disabled:opacity-30 ${
        side === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      {side === 'left' ? '←' : '→'}
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
  onScroll,
  onPhysics,
  onPhysicsQuiz,
  igCount,
  referencePhotos,
  shapes,
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
  onScroll: () => void
  onPhysics: () => void
  onPhysicsQuiz: () => void
  igCount: number
  referencePhotos: ReferencePhoto[]
  shapes: ShapeDef[]
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={onShapes}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">Shape library</h3>
        <div className="mt-3 grid grid-cols-3 gap-1">
          {shapes.slice(0, 6).map((shape) => (
            <div
              key={shape.id}
              className="aspect-square overflow-hidden rounded-md bg-[#0d1218]"
            >
              <ReferenceStill
                shapeId={shape.id}
                photos={referencePhotos}
                alt={shape.name}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
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
        onClick={onPhysics}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">Tumbling physics</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Inertia, angular momentum, moment of inertia — and why arms come in
          after a round-off so the feet can get in front for the handspring.
          Layouts expose a weak set because a long body has more I to turn.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          Open physics →
        </span>
      </button>
      <button
        type="button"
        onClick={onPhysicsQuiz}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">Physics in tumbling test</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Twelve questions from the physics notes: inertia, angular momentum,
          moment of inertia, speeding and slowing rotation, the round-off arm
          drop, and why layouts expose a weak set. When you finish, you see the
          score and every miss with the right answer and why.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          Take the physics test →
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
          Pick pictures (name what you see), descriptions (name what is being
          described), or both together. Written notes do not say the shape’s name.
          Landing lunge and Lunge · open shoulders are the same position — the test
          treats them as one. When you finish, you see your score and every miss
          with the correct name.
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
          landing lunge. Finish the hands as if they just pushed through an object
          (wide fingers, thumbs slightly down, pinkies slightly up). These are not a
          Tasks gate right now; study them here. Score and misses show when you
          finish, same as the shape test.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          Test arm positions →
        </span>
      </button>
      <button
        type="button"
        onClick={onScroll}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">Reference scroll</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Doom-scroll the gym Instagram library from Compare. Set A/B loop points on
          each clip — Classes and Compare keep those same points.
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-[var(--accent)]">
          Open scroll →
        </span>
      </button>
      <button
        type="button"
        onClick={onIg}
        className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-left transition hover:border-[var(--accent-dim)]"
      >
        <h3 className="text-lg font-semibold text-[var(--text)]">IG shapes library</h3>
        {listIgStills(referencePhotos).length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-1">
            {listIgStills(referencePhotos).slice(0, 6).map((still) => (
              <div
                key={still.id}
                className="aspect-square overflow-hidden rounded-md bg-[#0d1218]"
              >
                <CroppedStill
                  src={still.dataUrl}
                  stillId={still.id}
                  alt={still.label ?? 'IG shape'}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-sm text-[var(--muted)]">
          Crops from Compare. Screenshot a looping Instagram clip or replay — press one
          corner, drag to the opposite corner — and the still lands here. Select Ryan
          before you save if you want it in the app on every link. {igCount} saved.
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
  onExplore,
  referencePhotos,
}: {
  shapes: ShapeDef[]
  pathwayIds: Set<string>
  query: string
  filter: ShapeFilter
  onQuery: (q: string) => void
  onFilter: (f: ShapeFilter) => void
  onOpen: (id: string) => void
  onExplore: (id: string) => void
  referencePhotos: ReferencePhoto[]
}) {
  const { copyFor } = useShapeCopy()
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--muted)]">
          {shapes.length} shape{shapes.length === 1 ? '' : 's'} as pictures. Tap a
          still for notes, or open full screen to swipe, tap through, or play a slideshow.
        </p>
        {shapes.length > 0 && (
          <button
            type="button"
            onClick={() => onExplore(shapes[0]!.id)}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#06281f]"
          >
            Explore full screen
          </button>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {shapes.map((shape) => {
          const onPath = pathwayIds.has(shape.id)
          return (
            <li key={shape.id}>
              <button
                type="button"
                onClick={() => onOpen(shape.id)}
                className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] text-left transition hover:border-[var(--accent-dim)]"
              >
                <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[#0d1218]">
                  <ReferenceStill
                    shapeId={shape.id}
                    photos={referencePhotos}
                    alt={shape.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 px-2.5 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--text)]">{shape.name}</span>
                    {shape.id.startsWith('gym_') && (
                      <span className="rounded bg-[#2c3a52] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text)]">
                        Gym
                      </span>
                    )}
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
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-[var(--muted)]">
                    {copyFor(shape.id).athlete}
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

function ShapeLinkedDrills({ shapeId }: { shapeId: string }) {
  const [tick, setTick] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  useEffect(() => subscribeCoachContent(() => setTick((n) => n + 1)), [])
  const drills = drillsForShape(shapeId)
  void tick
  if (drills.length === 0) return null
  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3">
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Drills
      </h4>
      <ul className="grid gap-1.5">
        {drills.map((d) => {
          const open = openId === d.id
          return (
            <li key={d.id} className="rounded-lg bg-[#121820] p-2">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : d.id)}
                className="flex w-full items-center gap-2.5 text-left"
              >
                {d.src ? (
                  <PortraitVideoPlayer src={d.src} title={d.title} size="thumb" />
                ) : (
                  <span className="flex h-[4.75rem] w-[2.7rem] shrink-0 items-center justify-center rounded-md bg-[#0d1218] text-[10px] text-[var(--muted)]">
                    —
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{d.title}</span>
                  {d.notes && (
                    <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                      {firstCue(d.notes)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs font-semibold text-[var(--muted)]">
                  {open ? 'Hide' : d.src ? 'Watch' : 'Show'}
                </span>
              </button>
              {open && (
                <div className="mt-2 grid gap-2">
                  {d.src && <PortraitVideoPlayer src={d.src} title={d.title} size="embed" />}
                  {d.notes && <ExpandableNotes text={d.notes} previewLines={1} />}
                  {!d.src && (
                    <p className="text-xs text-[var(--muted)]">No clip on this drill yet.</p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ShapeDetail({
  shapeId,
  orderedShapeIds,
  pathwayIds,
  referencePhotos,
  onBack,
  onOpenTask,
  onOpenShape,
  onExplore,
}: {
  shapeId: string
  orderedShapeIds: string[]
  pathwayIds: Set<string>
  referencePhotos: ReferencePhoto[]
  onBack: () => void
  onOpenTask: (taskId: string) => void
  onOpenShape: (shapeId: string) => void
  onExplore: () => void
}) {
  const { copyFor, canEdit } = useShapeCopy()
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
  const athleteCopy = copyFor(shape.id).athlete
  const appCopy = copyFor(shape.id).app
  const shapeIndex = orderedShapeIds.indexOf(shape.id)
  const previousShapeId =
    shapeIndex >= 0 && orderedShapeIds.length > 1
      ? orderedShapeIds[(shapeIndex - 1 + orderedShapeIds.length) % orderedShapeIds.length]
      : null
  const nextShapeId =
    shapeIndex >= 0 && orderedShapeIds.length > 1
      ? orderedShapeIds[(shapeIndex + 1) % orderedShapeIds.length]
      : null

  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
      >
        ← Shape library
      </button>
        <button
          type="button"
          onClick={onExplore}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#06281f]"
        >
          Full screen
        </button>
      </div>

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
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
            {athleteCopy && (
              <div className="mt-3">
                <ExpandableNotes text={athleteCopy} previewLines={2} />
              </div>
            )}
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

      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3">
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Coach still
        </h4>
        <div className="relative">
          <ShapeSideArrow
            side="left"
            shapeId={previousShapeId}
            onOpen={onOpenShape}
          />
          <div className="px-12 sm:px-14">
            <CoachStillGallery
              shapeId={shape.id}
              photos={referencePhotos}
              alt={`${shape.name} reference`}
              emptyLabel="No coach still for this shape yet"
              imgClass="min-h-48 max-h-80 w-full object-contain"
              allowCrop={canEdit}
            />
          </div>
          <ShapeSideArrow
            side="right"
            shapeId={nextShapeId}
            onOpen={onOpenShape}
          />
        </div>
      </div>

      <ShapeLinkedDrills shapeId={shape.id} />

      {igForShape.length > 0 && (
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            IG shapes
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {igForShape.map((still) =>
              canEdit ? (
                <StillCropEditor
                  key={still.id}
                  photo={still}
                  alt={still.label ?? shape.name}
                  imgClass="min-h-48 max-h-64 w-full object-contain"
                />
              ) : (
                <div
                  key={still.id}
                  className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-[#0d1218]"
                >
                  <CroppedStill
                    src={still.dataUrl}
                    stillId={still.id}
                    alt={still.label ?? shape.name}
                    className="h-full w-full object-contain"
                  />
                </div>
              ),
            )}
          </div>
        </div>
      )}

      <ShapeCopyEditor shapeId={shape.id} shapeName={shape.name} />

      {canEdit && (
        <CollapsibleSection title="What the app knows" hint="Scoring notes — hide this from the floor">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">
            {appCopy}
          </p>
          <div className="mt-3">
            <ViewCallout shape={shape} />
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="How to hit this shape"
        hint={howTo.length > 0 ? `${howTo.length} cues` : 'Use the still'}
      >
        {howTo.length > 0 ? (
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--text)]">
            {howTo.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Hit the shape the way it looks in the coach still.
          </p>
        )}
      </CollapsibleSection>

      {canEdit && (
      <CollapsibleSection title="Scoring criteria" hint="App weights — coaches only">
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
      </CollapsibleSection>
      )}
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
  const { copyFor } = useShapeCopy()
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
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {copyFor(shape.id).athlete}
                  </p>
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
  persistIgToApp,
}: {
  referencePhotos: ReferencePhoto[]
  onReferencesChange: (photos: ReferencePhoto[]) => void
  persistIgToApp: boolean
}) {
  const groups = groupIgStillsByShape(referencePhotos)
  const total = groups.reduce((n, g) => n + g.stills.length, 0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const remove = async (still: ReferencePhoto) => {
    if (still.persistedToApp && !persistIgToApp) return
    await removeIgStill(still.id, {
      fromApp: persistIgToApp && Boolean(still.persistedToApp),
    })
    await deleteReferencePhoto(still.id)
    onReferencesChange(referencePhotos.filter((p) => p.id !== still.id))
  }

  const beginEdit = (still: ReferencePhoto) => {
    setEditingId(still.id)
    setDraftLabel(still.label ?? '')
    setDraftNotes(still.notes ?? '')
    setEditError(null)
  }

  const saveDescription = async (still: ReferencePhoto) => {
    setSaving(true)
    setEditError(null)
    try {
      const saved = await updateIgStill(
        still.id,
        { label: draftLabel, notes: draftNotes },
        { persistToApp: Boolean(still.persistedToApp) },
      )
      onReferencesChange(
        referencePhotos.map((photo) => (photo.id === still.id ? { ...photo, ...saved } : photo)),
      )
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save that description.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="text-lg font-semibold text-[var(--text)]">IG shapes library</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {total === 0
            ? 'None saved yet. Open Compare, pause the clip, tap Screenshot.'
            : `${total} still${total === 1 ? '' : 's'} in ${groups.length} shape${groups.length === 1 ? '' : 's'}.`}
        </p>
        <div className="mt-3">
          <CollapsibleSection
            title="Where these stills come from"
            hint="Cropped from Compare — they don’t replace coach stills"
            defaultOpen={false}
            inset
          >
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              These stills are cropped from Compare — looping Instagram clips, uploaded
              reference video, or athlete replay. They do not replace the coach stills in
              Shape library. On Tasks, Homework, or Coach, pick any of these (or any coach
              still) as a ghost overlay on the camera. Stills saved while the{' '}
              <strong className="text-[var(--text)]">Ryan</strong> profile is selected are
              stored on this gym computer, so a new browser or phone link still has them.
              Other profiles keep crops on this device only.
            </p>
          </CollapsibleSection>
        </div>
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
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-[#0d1218]">
                  <CroppedStill
                    src={still.dataUrl}
                    stillId={still.id}
                    alt={still.label ?? group.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <p className="min-w-0 truncate text-[11px] text-[var(--muted)]">
                    {still.label || group.name}
                    {still.persistedToApp ? ' · In the app' : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => void remove(still)}
                    disabled={Boolean(still.persistedToApp && !persistIgToApp)}
                    className="shrink-0 text-[11px] text-[var(--bad)] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      still.persistedToApp && !persistIgToApp
                        ? 'Select Ryan to remove an app still from every link'
                        : 'Delete'
                    }
                  >
                    Delete
                  </button>
                </div>
                {still.notes && editingId !== still.id && (
                  <p className="whitespace-pre-wrap border-t border-[var(--panel-border)] px-2 py-2 text-xs leading-relaxed text-[var(--text)]">
                    {still.notes}
                  </p>
                )}
                {persistIgToApp && editingId !== still.id && (
                  <button
                    type="button"
                    onClick={() => beginEdit(still)}
                    className="mx-2 mb-2 text-xs text-[var(--accent)] underline"
                  >
                    Edit name and description
                  </button>
                )}
                {persistIgToApp && editingId === still.id && (
                  <div className="border-t border-[var(--panel-border)] p-2">
                    <input
                      value={draftLabel}
                      onChange={(event) => setDraftLabel(event.target.value)}
                      placeholder="Shape name or short label"
                      className="w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 py-1.5 text-sm"
                    />
                    <textarea
                      value={draftNotes}
                      onChange={(event) => setDraftNotes(event.target.value)}
                      placeholder="Describe this shape"
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 py-1.5 text-sm"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveDescription(still)}
                        className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        {saving ? 'Saving…' : 'Save description'}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                    {editError && <p className="mt-2 text-xs text-[var(--bad)]">{editError}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
