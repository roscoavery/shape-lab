/**
 * Education — learn shapes & curriculum pathways without a camera.
 * For gymnasts and parents studying body positions before Tasks practice.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { customShapeId, groupIgStillsByShape, igStillDisplayName, igStillsForShape, listIgStills } from '../lib/igStills'
import { HScrollRow } from './HScrollRow'
import { deleteReferencePhoto } from '../lib/storage'
import { removeIgStill, updateIgStill } from '../lib/igStillStore'
import { useShapeCopy } from './ShapeCopyContext'
import { ShapeCopyEditor } from './ShapeCopyEditor'
import { StillCropEditor } from './StillCropEditor'
import { CroppedStill } from './CroppedStill'
import { MediaLightbox } from './MediaLightbox'
import { PhysicsLessons } from './learn/PhysicsLessons'
import { PanelErrorBoundary } from './PanelErrorBoundary'
import { PhysicsQuiz } from './learn/PhysicsQuiz'
import { AnatomyQuiz } from './learn/AnatomyQuiz'
import { ProgressionQuiz } from './learn/ProgressionQuiz'
import { MovementsQuiz } from './learn/MovementsQuiz'
import { ShapeBodyQuiz } from './learn/ShapeBodyQuiz'
import type { AnatomyTrack, PhysicsTrack, ProgressionTrack } from '../lib/studyQuiz'
import { ANATOMY_LESSONS } from '../config/coachAnatomy'
import { PROGRESSION_LESSONS } from '../config/tumblingProgression'
import { ATHLETE_PROGRESSION_LESSONS } from '../config/athleteProgression'
import { drillsForShape, subscribeCoachContent } from '../lib/coachContentStore'
import { isCoachProfile } from '../lib/profileRole'
import { AddGymShapeForm } from './AddGymShapeForm'
import { CollapsibleSection } from './CollapsibleSection'
import { ExpandableNotes, firstCue } from './ExpandableNotes'
import { PortraitVideoPlayer } from './PortraitVideoPlayer'
import { ShapeExplorer } from './learn/ShapeExplorer'
import { ShareReference } from './share/ShareReference'
import { shapeStillDraft } from '../lib/shareReference'
import type { Athlete, ReferencePhoto, ShapeDef, ShapeTestRecord } from '../types'
import type { QuizTaker } from './learn/QuizWho'

type EduView =
  | { kind: 'home' }
  | { kind: 'shapes' }
  | { kind: 'shape'; shapeId: string }
  | { kind: 'pathways' }
  | { kind: 'task'; taskId: string }
  | { kind: 'quiz'; pool?: 'pathway' | 'arm-positions' }
  | { kind: 'shapeBody' }
  | { kind: 'movementsQuiz' }
  | { kind: 'physicsQuiz'; track?: PhysicsTrack }
  | { kind: 'anatomyQuiz'; track?: AnatomyTrack }
  | { kind: 'progressionQuiz'; track?: ProgressionTrack }
  | { kind: 'hits' }
  | { kind: 'glossary' }
  | { kind: 'ig' }
  | { kind: 'scroll' }
  | { kind: 'physics' }
  | { kind: 'anatomy' }
  | { kind: 'progression' }
  | { kind: 'athleteProgress' }
  | { kind: 'coachStudy' }

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
  preferredQuizIds?: string[]
  onQuizTaker?: (taker: { firstName: string; lastName: string; athleteId?: string }) => void
  onRecordQuiz?: (taker: QuizTaker, record: ShapeTestRecord) => void
  onAthleteChange?: (next: Athlete) => void
  onParkQuiz?: () => void
  /** Videos tab only needs the reference scroll. */
  surface?: 'learn' | 'videos'
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
  preferredQuizIds = [],
  onQuizTaker,
  onRecordQuiz,
  onAthleteChange,
  onParkQuiz,
  surface = 'learn',
}: Props) {
  const [view, setView] = useState<EduView>({ kind: surface === 'videos' ? 'scroll' : 'home' })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ShapeFilter>('all')
  const [hits, setHits] = useState<TaskCapture[]>([])
  const [catalogTick, setCatalogTick] = useState(0)
  const [exploreId, setExploreId] = useState<string | null>(null)
  const { copyFor } = useShapeCopy()
  const canAddGymShape = Boolean(signedIn && isCoachProfile(signedIn))
  const coach = Boolean(signedIn && isCoachProfile(signedIn))

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
      {surface === 'videos' ? (
        <header className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Videos
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">Reference scroll</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Same gym Instagram library as Compare. Also lives under Learn.
          </p>
        </header>
      ) : (
        <header className="learn-masthead">
          <div className="relative z-[1] flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#4cc9f0]">
                Shape Lab
              </p>
              <h2 className="learn-serif mt-1 text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
                Learn
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                Pictures first. Names after. Study the body the way a gym sees it.
              </p>
            </div>
            <NavChip active={view.kind === 'home'} onClick={goHome} label="Home" />
          </div>
          {view.kind !== 'home' && (
          <div className="relative z-[1] mt-5 space-y-3">
            <ChipRow label="Shapes">
              <NavChip
                active={view.kind === 'shapes' || view.kind === 'shape'}
                onClick={goShapes}
                label="Shape library"
              />
              <NavChip active={view.kind === 'ig'} onClick={() => setView({ kind: 'ig' })} label="IG shapes" />
              <NavChip active={view.kind === 'hits'} onClick={() => setView({ kind: 'hits' })} label="My shapes" />
              <NavChip
                active={view.kind === 'quiz' && view.pool !== 'arm-positions'}
                onClick={() => setView({ kind: 'quiz', pool: 'pathway' })}
                label="Shape test"
              />
              <NavChip
                active={view.kind === 'shapeBody'}
                onClick={() => setView({ kind: 'shapeBody' })}
                label="Shape test 2"
              />
            </ChipRow>
            <ChipRow label="Watch">
              <NavChip
                active={view.kind === 'scroll'}
                onClick={() => setView({ kind: 'scroll' })}
                label="Reference scroll"
              />
              <NavChip
                active={view.kind === 'athleteProgress'}
                onClick={() => setView({ kind: 'athleteProgress' })}
                label="How skills grow"
              />
            </ChipRow>
            {coach && (
              <ChipRow label="Coaches">
                <NavChip
                  active={
                    view.kind === 'coachStudy' ||
                    view.kind === 'physics' ||
                    view.kind === 'anatomy' ||
                    view.kind === 'progression' ||
                    view.kind === 'physicsQuiz' ||
                    view.kind === 'anatomyQuiz' ||
                    view.kind === 'progressionQuiz' ||
                    view.kind === 'movementsQuiz'
                  }
                  onClick={() => setView({ kind: 'coachStudy' })}
                  label="Coach study"
                />
              </ChipRow>
            )}
            <details className="rounded-xl bg-[#0d1218]/80 px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">
                Extra (pathways, glossary, movements)
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
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
                  active={view.kind === 'quiz' && view.pool === 'arm-positions'}
                  onClick={() => setView({ kind: 'quiz', pool: 'arm-positions' })}
                  label="Arm positions"
                />
                <NavChip
                  active={view.kind === 'movementsQuiz'}
                  onClick={() => setView({ kind: 'movementsQuiz' })}
                  label="Movements"
                />
              </div>
            </details>
          </div>
          )}
        </header>
      )}

      {view.kind === 'home' && surface === 'learn' && (
        <HomeView
          shapeCount={catalog.length}
          onShapes={goShapes}
          onQuiz={() => setView({ kind: 'quiz', pool: 'pathway' })}
          onShapeBody={() => setView({ kind: 'shapeBody' })}
          onMovements={() => setView({ kind: 'movementsQuiz' })}
          onHits={() => setView({ kind: 'hits' })}
          onIg={() => setView({ kind: 'ig' })}
          onScroll={() => setView({ kind: 'scroll' })}
          onAthleteProgress={() => setView({ kind: 'athleteProgress' })}
          onCoachStudy={coach ? () => setView({ kind: 'coachStudy' }) : undefined}
          onPathways={goPathways}
          onGlossary={() => setView({ kind: 'glossary' })}
          onArmQuiz={() => setView({ kind: 'quiz', pool: 'arm-positions' })}
          igCount={listIgStills(referencePhotos).length}
          referencePhotos={referencePhotos}
          shapes={catalog}
          coach={coach}
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
            signedIn={signedIn}
          />
        </>
      )}

      {view.kind === 'shape' && (
        <ShapeDetail
          shapeId={view.shapeId}
          orderedShapeIds={filteredShapes.map((shape) => shape.id)}
          pathwayIds={pathwayIds}
          referencePhotos={referencePhotos}
          onReferencesChange={onReferencesChange}
          onBack={goShapes}
          onOpenTask={openTask}
          onOpenShape={openShape}
          onExplore={() => setExploreId(view.shapeId)}
          signedIn={signedIn}
        />
      )}

      {view.kind === 'pathways' && (
        <PathwayList onOpen={openTask} onOpenShape={openShape} />
      )}

      {view.kind === 'coachStudy' && (
        <PanelErrorBoundary label="Coach study">
          <CoachStudyRoom
            onPhysics={() => setView({ kind: 'physics' })}
            onAnatomy={() => setView({ kind: 'anatomy' })}
            onProgression={() => setView({ kind: 'progression' })}
            onPhysicsQuiz={(track) => setView({ kind: 'physicsQuiz', track })}
            onAnatomyQuiz={(track) => setView({ kind: 'anatomyQuiz', track })}
            onProgressionQuiz={(track) => setView({ kind: 'progressionQuiz', track })}
            onMovements={() => setView({ kind: 'movementsQuiz' })}
          />
        </PanelErrorBoundary>
      )}

      {view.kind === 'athleteProgress' && (
        <PanelErrorBoundary label="How skills grow">
          <PhysicsLessons
            lessons={ATHLETE_PROGRESSION_LESSONS}
            heading="How skills grow"
          />
        </PanelErrorBoundary>
      )}

      {view.kind === 'physics' && (
        <PanelErrorBoundary label="Tumbling physics">
          <PhysicsLessons onTakeTest={() => setView({ kind: 'physicsQuiz' })} />
        </PanelErrorBoundary>
      )}

      {view.kind === 'anatomy' && (
        <PanelErrorBoundary label="Anatomy">
          <PhysicsLessons
            lessons={ANATOMY_LESSONS}
            heading="Anatomy for coaches"
            onTakeTest={() => setView({ kind: 'anatomyQuiz' })}
            testLabel="Anatomy test →"
          />
        </PanelErrorBoundary>
      )}

      {view.kind === 'progression' && (
        <PanelErrorBoundary label="Progression">
          <PhysicsLessons
            lessons={PROGRESSION_LESSONS}
            heading="Progression and blocks"
            onTakeTest={() => setView({ kind: 'progressionQuiz' })}
            testLabel="Progressions test →"
          />
        </PanelErrorBoundary>
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

      {view.kind === 'scroll' && <ReferenceFeed athlete={signedIn} athletes={athletes} />}

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
          preferredAthleteIds={preferredQuizIds}
          onTakerReady={onQuizTaker}
          onGrade={onRecordQuiz}
          onAthleteChange={onAthleteChange}
          onPark={() => {
            goHome()
            onParkQuiz?.()
          }}
        />
      )}

      {view.kind === 'shapeBody' && (
        <PanelErrorBoundary label="Shape test 2">
          <ShapeBodyQuiz onExit={goHome} />
        </PanelErrorBoundary>
      )}

      {view.kind === 'movementsQuiz' && (
        <PanelErrorBoundary label="Movements">
          <MovementsQuiz onExit={coach ? () => setView({ kind: 'coachStudy' }) : goHome} />
        </PanelErrorBoundary>
      )}

      {view.kind === 'physicsQuiz' && (
        <PanelErrorBoundary label="Physics test">
          <PhysicsQuiz track={view.track} onExit={() => setView({ kind: 'coachStudy' })} />
        </PanelErrorBoundary>
      )}

      {view.kind === 'anatomyQuiz' && (
        <PanelErrorBoundary label="Anatomy test">
          <AnatomyQuiz track={view.track} onExit={() => setView({ kind: 'coachStudy' })} />
        </PanelErrorBoundary>
      )}

      {view.kind === 'progressionQuiz' && (
        <PanelErrorBoundary label="Progressions test">
          <ProgressionQuiz track={view.track} onExit={() => setView({ kind: 'coachStudy' })} />
        </PanelErrorBoundary>
      )}

      {view.kind === 'ig' && (
        <IgShapesLibrary
          referencePhotos={referencePhotos}
          onReferencesChange={onReferencesChange}
          persistIgToApp={persistIgToApp}
          signedIn={signedIn}
        />
      )}

      {view.kind === 'hits' && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          {!athleteId ? (
            <p className="text-sm text-[var(--muted)]">
              Unlock a profile first — their hit photos show up here, grouped by shape.
            </p>
          ) : (
            <HitFolder
              captures={hits}
              athleteName={athleteName}
              onChange={() => {
                void listCaptures(athleteId).then(setHits).catch(() => setHits([]))
              }}
            />
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
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        active
          ? 'bg-[var(--accent)] font-semibold text-[#06281f]'
          : 'bg-[#121820] text-[var(--muted)] hover:text-[var(--text)]'
      }`}
    >
      {label}
    </button>
  )
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function CoachStudyRoom({
  onPhysics,
  onAnatomy,
  onProgression,
  onPhysicsQuiz,
  onAnatomyQuiz,
  onProgressionQuiz,
  onMovements,
}: {
  onPhysics: () => void
  onAnatomy: () => void
  onProgression: () => void
  onPhysicsQuiz: (track?: PhysicsTrack) => void
  onAnatomyQuiz: (track?: AnatomyTrack) => void
  onProgressionQuiz: (track?: ProgressionTrack) => void
  onMovements: () => void
}) {
  return (
    <div className="space-y-5">
      <section className="learn-coach px-5 py-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f5c542]">
          Coach study
        </p>
        <h3 className="learn-serif mt-2 text-3xl font-semibold tracking-tight">A room for coaches</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#e8d9a8]/80">
          Physics, anatomy, and progressions live here so the athlete Learn tab stays
          about shapes. Each test draws a new mix — joints, tissues, or deeper cases —
          so the same Q&A does not come back every time.
        </p>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        <StudyCard
          title="Tumbling physics"
          body="Inertia, angular momentum, moment of inertia, the block, surfaces, and twist. Read it like a chapter."
          action="Open physics"
          onClick={onPhysics}
        />
        <StudyCard
          title="Anatomy"
          body="Joint actions, extra range you can see, muscle versus ligament versus tendon, and gym prevention."
          action="Open anatomy"
          onClick={onAnatomy}
        />
        <StudyCard
          title="Progression"
          body="Introduction, approximation, acquisition, mastery. Normal fear and the three kinds of stuck."
          action="Open progression"
          onClick={onProgression}
        />
      </div>
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[#121820] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4cc9f0]">
          Exam hall
        </p>
        <h3 className="learn-serif mt-1 text-2xl font-semibold">Harder mixes</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pick a section. Questions shuffle. Wrist extension is also wrist dorsiflexion.
          Pointing toes is plantarflexion.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <StudyCard title="Movements" body="Joint actions: wrists, ankles, hips, and the words that get mixed on the floor." action="Take test" onClick={onMovements} />
          <StudyCard title="Physics · mix" body="The whole chapter, a new set each time." action="Take test" onClick={() => onPhysicsQuiz('all')} />
          <StudyCard title="Physics · core" body="Inertia, angular momentum, moment of inertia only." action="Take test" onClick={() => onPhysicsQuiz('core')} />
          <StudyCard title="Anatomy · joints" body="Flexion, extension, and the joint you can see." action="Take test" onClick={() => onAnatomyQuiz('joints')} />
          <StudyCard title="Anatomy · tissues" body="Muscle, ligament, tendon, and the grade." action="Take test" onClick={() => onAnatomyQuiz('tissues')} />
          <StudyCard title="Anatomy · prevention" body="What you load, and what you do not stretch for line." action="Take test" onClick={() => onAnatomyQuiz('prevention')} />
          <StudyCard title="Progressions · levels" body="Introduction through mastery." action="Take test" onClick={() => onProgressionQuiz('levels')} />
          <StudyCard title="Progressions · blocks" body="Fear, mental, physical, emotional." action="Take test" onClick={() => onProgressionQuiz('blocks')} />
          <StudyCard title="Progressions · deeper" body="Harder cases that are not the same four questions." action="Take test" onClick={() => onProgressionQuiz('deep')} />
        </div>
      </section>
      <section className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[#121820] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Coming next
        </p>
        <h3 className="learn-serif mt-1 text-2xl font-semibold">Spotting</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          A spotting study path will sit here with the other coach chapters. Not on the
          athlete Learn tab.
        </p>
      </section>
    </div>
  )
}

function StudyCard({
  title,
  body,
  action,
  onClick,
}: {
  title: string
  body: string
  action: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="learn-tile p-4 transition hover:border-[#4cc9f0]/40"
    >
      <h3 className="learn-serif text-xl font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
      <span className="mt-3 inline-block text-sm font-medium text-[#4cc9f0]">{action} →</span>
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
  shapeCount,
  onShapes,
  onQuiz,
  onShapeBody,
  onMovements,
  onHits,
  onIg,
  onScroll,
  onAthleteProgress,
  onCoachStudy,
  onPathways,
  onGlossary,
  onArmQuiz,
  igCount,
  referencePhotos,
  shapes,
  coach,
}: {
  shapeCount: number
  onShapes: () => void
  onQuiz: () => void
  onShapeBody: () => void
  onMovements: () => void
  onHits: () => void
  onIg: () => void
  onScroll: () => void
  onAthleteProgress: () => void
  onCoachStudy?: () => void
  onPathways: () => void
  onGlossary: () => void
  onArmQuiz: () => void
  igCount: number
  referencePhotos: ReferencePhoto[]
  shapes: ShapeDef[]
  coach: boolean
}) {
  const mosaic = shapes.slice(0, 6)
  const igPreview = listIgStills(referencePhotos).slice(0, 4)
  return (
    <div className="space-y-5">
      <button type="button" onClick={onShapes} className="learn-hero">
        <div className="learn-hero-grid">
          {mosaic.map((shape) => (
            <div key={shape.id} className="min-h-full overflow-hidden bg-[#0d1218]">
              <ReferenceStill
                shapeId={shape.id}
                photos={referencePhotos}
                alt=""
                className="h-full min-h-[21rem] w-full object-cover sm:min-h-[26rem]"
              />
            </div>
          ))}
        </div>
        <div className="learn-hero-veil" />
        <div className="relative z-[1] flex min-h-[21rem] flex-col justify-end px-5 pb-6 pt-16 sm:min-h-[26rem] sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#4cc9f0]">
            Shape library
          </p>
          <h3 className="learn-serif mt-2 text-4xl font-semibold leading-[0.95] tracking-tight text-white sm:text-5xl">
            Study the body
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
            {shapeCount} positions with coach stills. Hollow, lunge, and the
            shapes that look alike until you know where the hips sit.
          </p>
          <span className="mt-5 inline-flex w-fit rounded-full bg-[#2dd4a8] px-4 py-2 text-sm font-bold text-[#06281f]">
            Open the library
          </span>
        </div>
      </button>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          Tests
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={onQuiz} className="learn-exam-mint">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">Pictures</p>
            <h3 className="learn-serif mt-1 text-2xl font-semibold">Shape test</h3>
            <p className="mt-2 text-sm font-medium opacity-80">
              Name the still. Starting lunge, landing lunge, and mountain climber sit together.
            </p>
          </button>
          <button type="button" onClick={onShapeBody} className="learn-exam-sky">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">Body</p>
            <h3 className="learn-serif mt-1 text-2xl font-semibold">Shape test 2</h3>
            <p className="mt-2 text-sm font-medium opacity-80">
              More specific. Where the hips, knees, and hands actually are.
            </p>
          </button>
          <button type="button" onClick={onMovements} className="learn-exam-ink">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4cc9f0]">Joints</p>
            <h3 className="learn-serif mt-1 text-2xl font-semibold">Movements</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Wrist extension is also dorsiflexion. Pointing toes is plantarflexion.
            </p>
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onScroll} className="learn-tile">
          <div className="h-28 overflow-hidden bg-[#0d1218]">
            {mosaic[0] ? (
              <ReferenceStill
                shapeId={mosaic[0].id}
                photos={referencePhotos}
                alt=""
                className="h-full w-full object-cover opacity-80"
              />
            ) : null}
          </div>
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4cc9f0]">Watch</p>
            <h3 className="learn-serif mt-1 text-2xl font-semibold">Reference scroll</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              The gym Instagram library. Also under Videos.
            </p>
          </div>
        </button>
        <button type="button" onClick={onAthleteProgress} className="learn-tile">
          <div className="flex h-28 items-end bg-[#102820] px-4 pb-3">
            <p className="learn-serif text-3xl font-semibold text-[#2dd4a8]">I · II · III · IV</p>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#2dd4a8]">Athlete</p>
            <h3 className="learn-serif mt-1 text-2xl font-semibold">How skills grow</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Four stages, written for the person on the floor. Nerves, stuck skills, a heavy room.
            </p>
          </div>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onIg} className="learn-tile p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            From Compare
          </p>
          <h3 className="learn-serif mt-1 text-2xl font-semibold">IG shapes</h3>
          {igPreview.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-1">
              {igPreview.map((still) => (
                <div key={still.id} className="aspect-square overflow-hidden rounded-md bg-[#0d1218]">
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
          <p className="mt-2 text-sm text-[var(--muted)]">{igCount} crops saved from the gym feed.</p>
        </button>
        <button type="button" onClick={onHits} className="learn-tile p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Your folder
          </p>
          <h3 className="learn-serif mt-1 text-2xl font-semibold">My shapes</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Hit photos and clips, filed by shape — the ones you actually made.
          </p>
        </button>
      </div>

      {coach && onCoachStudy && (
        <button type="button" onClick={onCoachStudy} className="learn-coach px-5 py-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f5c542]">
            Coaches only
          </p>
          <h3 className="learn-serif mt-2 text-3xl font-semibold tracking-tight">Coach study</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#e8d9a8]/80">
            Physics, anatomy, progressions, and harder sectioned tests. Spotting lands here later.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-[#f5c542] px-4 py-2 text-sm font-bold text-[#3b2203]">
            Open the study room
          </span>
        </button>
      )}

      <details className="rounded-2xl border border-[var(--panel-border)] bg-[#121820] px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
          More notes
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
          Extra tools that are useful and easy to confuse with the main library.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onArmQuiz} className="rounded-full bg-[#0d1218] px-3 py-1.5 text-xs font-semibold text-[var(--text)]">
            Arm positions test
          </button>
          <button type="button" onClick={onGlossary} className="rounded-full bg-[#0d1218] px-3 py-1.5 text-xs font-semibold text-[var(--text)]">
            Glossary
          </button>
          <button type="button" onClick={onPathways} className="rounded-full bg-[#0d1218] px-3 py-1.5 text-xs font-semibold text-[var(--text)]">
            Task pathways
          </button>
        </div>
      </details>
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
  signedIn = null,
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
  signedIn?: Athlete | null
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
              <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel)]">
              <button
                type="button"
                onClick={() => onOpen(shape.id)}
                className="flex w-full flex-1 flex-col text-left transition hover:border-[var(--accent-dim)]"
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
                    <span className="learn-serif text-lg font-semibold text-[var(--text)]">{shape.name}</span>
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
              <div className="px-2 pb-2">
                <ShareReference
                  viewer={signedIn}
                  variant="compact"
                  draft={shapeStillDraft(shape.id, referencePhotos, shape.name)}
                />
              </div>
              </div>
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

function ShapeLinkedDrills({ shapeId, signedIn }: { shapeId: string; signedIn?: Athlete | null }) {
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
                  {signedIn && (
                    <ShareReference
                      viewer={signedIn}
                      variant="compact"
                      draft={{
                        kind: 'drill',
                        title: d.title || 'Drill',
                        url: d.src || undefined,
                        drillId: d.id,
                        shapeId,
                      }}
                    />
                  )}
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
  onReferencesChange,
  onBack,
  onOpenTask,
  onOpenShape,
  onExplore,
  signedIn = null,
}: {
  shapeId: string
  orderedShapeIds: string[]
  pathwayIds: Set<string>
  referencePhotos: ReferencePhoto[]
  onReferencesChange: (photos: ReferencePhoto[]) => void
  onBack: () => void
  onOpenTask: (taskId: string) => void
  onOpenShape: (shapeId: string) => void
  onExplore: () => void
  signedIn?: Athlete | null
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
              canEdit={canEdit}
              onPhotosChange={onReferencesChange}
            />
          </div>
          <ShapeSideArrow
            side="right"
            shapeId={nextShapeId}
            onOpen={onOpenShape}
          />
        </div>
        {signedIn && (
          <div className="mt-3">
            <ShareReference
              viewer={signedIn}
              draft={shapeStillDraft(shape.id, referencePhotos, shape.name)}
            />
          </div>
        )}
      </div>

      <ShapeLinkedDrills shapeId={shape.id} signedIn={signedIn} />

      {igForShape.length > 0 && (
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            IG shapes
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {igForShape.map((still) => (
              <div key={still.id} className="space-y-2">
                {canEdit ? (
                  <StillCropEditor
                    photo={still}
                    alt={still.label ?? shape.name}
                    imgClass="min-h-48 max-h-64 w-full object-contain"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-[#0d1218]">
                    <CroppedStill
                      src={still.dataUrl}
                      stillId={still.id}
                      alt={still.label ?? shape.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                {signedIn && (
                  <ShareReference
                    viewer={signedIn}
                    variant="compact"
                    draft={{
                      kind: 'ig-still',
                      title: still.label || shape.name,
                      stillId: still.id,
                      shapeId: shape.id,
                      photoSrc: still.dataUrl,
                    }}
                  />
                )}
              </div>
            ))}
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
  signedIn = null,
}: {
  referencePhotos: ReferencePhoto[]
  onReferencesChange: (photos: ReferencePhoto[]) => void
  persistIgToApp: boolean
  signedIn?: Athlete | null
}) {
  const groups = groupIgStillsByShape(referencePhotos)
  const total = groups.reduce((n, g) => n + g.stills.length, 0)
  const listedShapes = useMemo(() => learnLibraryShapes(), [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [draftShapeId, setDraftShapeId] = useState('')
  const [draftCustomName, setDraftCustomName] = useState('')
  const [draftShowInLibrary, setDraftShowInLibrary] = useState(false)
  const [shapeQuery, setShapeQuery] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewStill, setViewStill] = useState<ReferencePhoto | null>(null)

  const remove = async (still: ReferencePhoto) => {
    if (still.persistedToApp && !persistIgToApp) return
    await removeIgStill(still.id, {
      fromApp: persistIgToApp && Boolean(still.persistedToApp),
    })
    await deleteReferencePhoto(still.id)
    onReferencesChange(referencePhotos.filter((p) => p.id !== still.id))
  }

  const beginEdit = (still: ReferencePhoto) => {
    const custom = still.shapeId.startsWith('custom_')
    setEditingId(still.id)
    setDraftLabel(still.label ?? '')
    setDraftNotes(still.notes ?? '')
    setDraftShapeId(custom ? '' : still.shapeId)
    setDraftCustomName(
      custom ? still.customName?.trim() || igStillDisplayName(still) : still.customName ?? '',
    )
    setDraftShowInLibrary(Boolean(still.showInShapeLibrary))
    setShapeQuery('')
    setEditError(null)
  }

  const saveDescription = async (still: ReferencePhoto) => {
    const custom = draftCustomName.trim()
    const listed = draftShapeId
    if (!custom && !listed) {
      setEditError('Pick a listed shape, or type a custom name if it is not in the list.')
      return
    }
    const shapeKey = custom && !listed ? customShapeId(custom) : listed
    setSaving(true)
    setEditError(null)
    try {
      const saved = await updateIgStill(
        still.id,
        {
          shapeId: shapeKey,
          customName: custom && !listed ? custom : custom || undefined,
          label: draftLabel,
          notes: draftNotes,
          showInShapeLibrary: draftShowInLibrary,
        },
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
            ? 'None saved yet. Screenshot a clip (Shot on Compare, Learn scroll, or a reel) — it lands here and on every gym link.'
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
              These stills are cropped from Compare, Learn scroll, and reels. Every
              Screenshot / Shot saves here and onto the gym computer. Ryan can move a
              crop to another shape, rewrite its name and notes, or pin it into the
              main Shape library as a coach still.
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
                <button
                  type="button"
                  onClick={() => setViewStill(still)}
                  className="flex aspect-[4/3] w-full items-center justify-center bg-[#0d1218]"
                  aria-label={`Open ${still.label || group.name} full screen`}
                >
                  <CroppedStill
                    src={still.dataUrl}
                    stillId={still.id}
                    alt={still.label ?? group.name}
                    className="h-full w-full object-contain"
                  />
                </button>
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <p className="min-w-0 truncate text-[11px] text-[var(--muted)]">
                    {still.label || group.name}
                    {still.persistedToApp ? ' · In the app' : ''}
                    {still.showInShapeLibrary ? ' · Shape library' : ''}
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
                {signedIn && (
                  <div className="px-2 pb-2">
                    <ShareReference
                      viewer={signedIn}
                      variant="compact"
                      draft={{
                        kind: 'ig-still',
                        title: still.label || group.name,
                        stillId: still.id,
                        shapeId: still.shapeId,
                        photoSrc: still.dataUrl,
                      }}
                    />
                  </div>
                )}
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
                    Edit shape, name, and library
                  </button>
                )}
                {persistIgToApp && editingId === still.id && (
                  <div className="border-t border-[var(--panel-border)] p-2">
                    <p className="text-[11px] text-[var(--muted)]">
                      Move this crop to another listed shape, or type a custom name.
                    </p>
                    <input
                      type="search"
                      value={shapeQuery}
                      onChange={(event) => setShapeQuery(event.target.value)}
                      placeholder="Search listed shapes…"
                      className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 py-1.5 text-sm"
                    />
                    <HScrollRow label="Listed shapes" className="mt-1.5">
                      {listedShapes
                        .filter((shape) => {
                          const q = shapeQuery.trim().toLowerCase()
                          if (!q) return true
                          return `${shape.name} ${shape.id}`.toLowerCase().includes(q)
                        })
                        .map((shape) => {
                          const on = !draftCustomName.trim() && draftShapeId === shape.id
                          return (
                            <button
                              key={shape.id}
                              type="button"
                              role="option"
                              aria-selected={on}
                              onClick={() => {
                                setDraftShapeId(shape.id)
                                setDraftCustomName('')
                                setEditError(null)
                              }}
                              className={`max-w-[9rem] shrink-0 snap-start truncate rounded-md px-2 py-1.5 text-left text-[11px] font-semibold ${
                                on
                                  ? 'bg-[var(--accent)] text-[#06281f]'
                                  : 'border border-[var(--panel-border)] bg-[#121820] text-[var(--text)]'
                              }`}
                            >
                              {shape.name}
                            </button>
                          )
                        })}
                    </HScrollRow>
                    <input
                      value={draftCustomName}
                      onChange={(event) => {
                        setDraftCustomName(event.target.value)
                        if (event.target.value.trim()) setDraftShapeId('')
                      }}
                      placeholder="Custom name if it is not listed"
                      className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 py-1.5 text-sm"
                    />
                    <input
                      value={draftLabel}
                      onChange={(event) => setDraftLabel(event.target.value)}
                      placeholder="Short label (optional)"
                      className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 py-1.5 text-sm"
                    />
                    <textarea
                      value={draftNotes}
                      onChange={(event) => setDraftNotes(event.target.value)}
                      placeholder="Describe this shape"
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-2 py-1.5 text-sm"
                    />
                    <label className="mt-2 flex items-start gap-2 text-xs text-[var(--text)]">
                      <input
                        type="checkbox"
                        checked={draftShowInLibrary}
                        onChange={(event) => setDraftShowInLibrary(event.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        Show in the main Shape library for this shape, so it can be the coach still.
                      </span>
                    </label>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveDescription(still)}
                        className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        {saving ? 'Saving…' : 'Save changes'}
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
      {viewStill && (
        <MediaLightbox
          src={viewStill.dataUrl}
          kind="image"
          alt={viewStill.label || viewStill.customName || 'IG shape'}
          onClose={() => setViewStill(null)}
        />
      )}
    </section>
  )
}
