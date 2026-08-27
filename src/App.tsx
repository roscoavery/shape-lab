/**
 * Shape Lab — main application shell
 *
 * Tabs: Tasks | Tasks 2 | Homework | Learn | Compare | Coach | Athletes | About
 * Shape standards: src/config/shapes.ts
 * Curriculum: src/config/curriculum.ts
 * Tasks 2 scripts: src/config/tasks2.ts
 * Sequences: src/config/sequences.ts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AthletePanel } from './components/AthletePanel'
import { CameraStage } from './components/CameraStage'
import { CoachInbox } from './components/CoachInbox'
import { CompareErrorBoundary } from './components/compare/CompareErrorBoundary'
import { ComparePanel } from './components/compare/ComparePanel'
import { EducationPanel } from './components/EducationPanel'
import { HomeworkPanel } from './components/HomeworkPanel'
import { ProgressHistory } from './components/ProgressHistory'
import { ScorePanel } from './components/ScorePanel'
import { SequencePanel } from './components/SequencePanel'
import { ShapeSelector } from './components/ShapeSelector'
import { TaskTrainer } from './components/TaskTrainer'
import { Tasks2Panel } from './components/Tasks2Panel'
import { TasksWorkspace, type TaskLiveUi } from './components/TasksWorkspace'
import { SHAPES } from './config/shapes'
import { useHoldTimer } from './hooks/useHoldTimer'
import { usePoseCamera } from './hooks/usePoseCamera'
import { scoreShape } from './lib/scoring'
import {
  sampleGoodHandstand,
  sampleNeedsWorkHandstand,
} from './lib/samplePoses'
import {
  addAttempt,
  createId,
  ensureAutoHomework,
  loadActiveAthleteId,
  loadAthletes,
  loadAttempts,
  loadReferencePhotos,
  loadSettings,
  loadTab,
  loadTaskProgress,
  saveActiveAthleteId,
  saveAthletes,
  saveSettings,
  saveTab,
  type AppTab,
} from './lib/storage'
import type {
  AppSettings,
  Athlete,
  AthleteTaskProgress,
  AttemptRecord,
  Landmark,
  ReferencePhoto,
  ShapeDef,
} from './types'

export default function App() {
  const camera = usePoseCamera()
  const [tab, setTab] = useState<AppTab>(() => loadTab())
  const [compareOpened, setCompareOpened] = useState(() => loadTab() === 'compare')
  const [shape, setShape] = useState<ShapeDef>(SHAPES[0])
  const [athletes, setAthletes] = useState<Athlete[]>(() => loadAthletes())
  const [activeAthleteId, setActiveAthleteId] = useState<string | null>(() =>
    loadActiveAthleteId(),
  )
  const [attempts, setAttempts] = useState<AttemptRecord[]>(() => loadAttempts())
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [saveFlash, setSaveFlash] = useState<string | null>(null)
  const [demoLandmarks, setDemoLandmarks] = useState<Landmark[] | null>(null)
  const [taskProgress, setTaskProgress] = useState<AthleteTaskProgress | null>(null)
  const [scoreStance, setScoreStance] = useState<'left' | 'right' | 'auto'>('auto')
  const [scoreProfileOk, setScoreProfileOk] = useState(false)
  const [referencePhotos, setReferencePhotos] = useState<ReferencePhoto[]>(() =>
    loadReferencePhotos(),
  )
  const [hitPreviewUrl, setHitPreviewUrl] = useState<string | null>(null)
  const [taskLiveUi, setTaskLiveUi] = useState<TaskLiveUi | null>(null)
  const [flowCue, setFlowCue] = useState<string | null>(null)
  const [flowPreview, setFlowPreview] = useState<{ shapeId: string; label: string }[] | null>(
    null,
  )
  const skipNextRef = useRef<(() => void) | null>(null)

  const qualityThreshold =
    settings.qualityThresholdOverride ?? shape.qualityThreshold

  const activeLandmarks = camera.running ? camera.landmarks : demoLandmarks

  const score = useMemo(
    () =>
      scoreShape(activeLandmarks, shape, qualityThreshold, {
        stance: scoreStance,
        profileOk: scoreProfileOk,
      }),
    [activeLandmarks, shape, qualityThreshold, scoreStance, scoreProfileOk],
  )

  const timingActive = camera.running || demoLandmarks !== null
  const hold = useHoldTimer(
    timingActive,
    score.holdReady ? Math.max(score.overall, qualityThreshold) : score.overall,
    score.holdReady ? qualityThreshold : 101,
  )

  useEffect(() => {
    saveAthletes(athletes)
    // Every athlete always has the 4 automatic homework drills
    for (const a of athletes) ensureAutoHomework(a.id)
  }, [athletes])

  useEffect(() => {
    saveActiveAthleteId(activeAthleteId)
  }, [activeAthleteId])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    saveTab(tab)
    if (tab === 'compare') setCompareOpened(true)
  }, [tab])

  useEffect(
    () => () => {
      if (hitPreviewUrl) URL.revokeObjectURL(hitPreviewUrl)
    },
    [hitPreviewUrl],
  )

  const cameraTab = tab === 'tasks' || tab === 'tasks2' || tab === 'homework' || tab === 'coach'
  useEffect(() => {
    if (!cameraTab && camera.running) camera.stop()
  }, [cameraTab, camera.running, camera.stop])

  const goTab = (id: AppTab) => {
    setTab(id)
    if (id === 'compare') setCompareOpened(true)
  }

  useEffect(() => {
    if (!activeAthleteId) {
      setTaskProgress(null)
      return
    }
    setTaskProgress(loadTaskProgress(activeAthleteId))
  }, [activeAthleteId])

  useEffect(() => {
    hold.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape.id])

  const onSelectShape = useCallback((s: ShapeDef) => {
    setShape(s)
    setScoreStance('auto')
    setScoreProfileOk(false)
  }, [])

  const onJumpToShape = useCallback(
    (shapeId: string, stance?: 'left' | 'right' | 'auto', opts?: { profileOk?: boolean }) => {
      const s = SHAPES.find((x) => x.id === shapeId)
      if (s) setShape(s)
      setScoreStance(stance ?? 'auto')
      setScoreProfileOk(Boolean(opts?.profileOk))
    },
    [],
  )

  const saveAttempt = () => {
    if (!activeAthleteId) {
      setSaveFlash('Select or create an athlete first.')
      return
    }
    const record: AttemptRecord = {
      id: createId('att'),
      athleteId: activeAthleteId,
      shapeId: shape.id,
      shapeName: shape.name,
      overall: score.overall,
      criteria: score.criteria.map((c) => ({
        id: c.id,
        label: c.label,
        score: c.score,
      })),
      totalHoldSeconds: Number(hold.totalHoldSeconds.toFixed(2)),
      qualityHoldSeconds: Number(hold.qualityHoldSeconds.toFixed(2)),
      mainCorrection: score.mainCorrection,
      savedAt: new Date().toISOString(),
    }
    addAttempt(record)
    setAttempts((prev) => [record, ...prev].slice(0, 500))
    setSaveFlash(`Saved ${shape.name} — score ${score.overall}`)
    setTimeout(() => setSaveFlash(null), 2500)
  }

  const cameraControls = (
    <div className="flex flex-wrap items-center gap-2">
      {!camera.running ? (
        <button
          type="button"
          onClick={() => {
            setDemoLandmarks(null)
            void camera.start()
          }}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[#06281f]"
        >
          Start camera
        </button>
      ) : (
        <button
          type="button"
          onClick={camera.stop}
          className="rounded-lg border border-[var(--panel-border)] px-4 py-2"
        >
          Stop camera
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          camera.stop()
          setDemoLandmarks(sampleGoodHandstand())
          setShape(SHAPES[0])
        }}
        className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm hover:bg-[#243040]"
        title="Inject a synthetic good handstand to test scoring without a camera"
      >
        Demo: good HS
      </button>
      <button
        type="button"
        onClick={() => {
          camera.stop()
          setDemoLandmarks(sampleNeedsWorkHandstand())
          setShape(SHAPES[0])
        }}
        className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm hover:bg-[#243040]"
        title="Inject a broken handstand to see corrections"
      >
        Demo: needs work
      </button>
      {demoLandmarks && !camera.running && (
        <button
          type="button"
          onClick={() => setDemoLandmarks(null)}
          className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--muted)]"
        >
          Clear demo
        </button>
      )}
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={settings.mirrorVideo}
          onChange={(e) =>
            setSettings((s) => ({ ...s, mirrorVideo: e.target.checked }))
          }
        />
        Mirror
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={settings.showAngles}
          onChange={(e) =>
            setSettings((s) => ({ ...s, showAngles: e.target.checked }))
          }
        />
        Show joint angles
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={settings.voiceEnabled}
          onChange={(e) =>
            setSettings((s) => ({ ...s, voiceEnabled: e.target.checked }))
          }
        />
        Voice
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        Quality threshold
        <input
          type="number"
          min={0}
          max={100}
          className="w-16 rounded border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1"
          value={qualityThreshold}
          onChange={(e) => {
            const v = Number(e.target.value)
            setSettings((s) => ({
              ...s,
              qualityThresholdOverride: Number.isFinite(v) ? v : null,
            }))
          }}
        />
      </label>
      <span className="text-xs text-[var(--muted)]">{camera.fps} fps</span>
    </div>
  )

  return (
    <div className="mx-auto min-h-screen max-w-[90rem] px-3 py-4 sm:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Shape Lab
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Free browser gymnastics coaching prototype · MediaPipe Pose
          </p>
        </div>
        <nav className="relative z-20 flex max-w-full shrink-0 gap-1 overflow-x-auto rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] p-1">
          {(
            [
              ['tasks', 'Tasks'],
              ['tasks2', 'Tasks 2'],
              ['homework', 'Homework'],
              ['learn', 'Learn'],
              ['compare', 'Compare'],
              ['coach', 'Coach'],
              ['history', 'Athletes'],
              ['about', 'About'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? 'page' : undefined}
              onPointerDown={(e) => {
                if (e.button !== 0) return
                goTab(id)
              }}
              onClick={() => goTab(id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${
                tab === id
                  ? 'bg-[var(--accent-dim)] font-semibold text-white'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'tasks' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.85fr)]">
          <TasksWorkspace
            shape={shape}
            score={score}
            qualityThreshold={qualityThreshold}
            referencePhotos={referencePhotos}
            videoRef={camera.videoRef}
            canvasRef={camera.canvasRef}
            landmarks={activeLandmarks}
            mirror={settings.mirrorVideo}
            showAngles={settings.showAngles}
            cameraRunning={camera.running}
            demoMode={!camera.running && demoLandmarks !== null}
            stream={camera.stream}
            cameraControls={cameraControls}
            cameraError={camera.error}
            hitPreviewUrl={hitPreviewUrl}
            liveUi={taskLiveUi}
            onSkipNextTask={() => skipNextRef.current?.()}
          />

          <div className="panel-scroll flex max-h-[calc(100vh-6rem)] flex-col gap-3 overflow-y-auto">
            <AthletePanel
              athletes={athletes}
              activeId={activeAthleteId}
              onChangeAthletes={setAthletes}
              onSelect={setActiveAthleteId}
            />
            <TaskTrainer
              athleteId={activeAthleteId}
              progress={taskProgress}
              onProgressChange={setTaskProgress}
              overallScore={score.overall}
              qualityThreshold={qualityThreshold}
              mainCorrection={score.mainCorrection}
              score={score}
              scoredShapeId={shape.id}
              onRequestShape={onJumpToShape}
              referencePhotos={referencePhotos}
              onReferencesChange={setReferencePhotos}
              voiceEnabled={settings.voiceEnabled}
              onVoiceEnabledChange={(on) =>
                setSettings((s) => ({ ...s, voiceEnabled: on }))
              }
              timingActive={timingActive}
              videoRef={camera.videoRef}
              canvasRef={camera.canvasRef}
              cameraRunning={camera.running}
              onEnsureCamera={() => {
                if (!camera.running) void camera.start()
              }}
              onHitPreview={(blob) => {
                setHitPreviewUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev)
                  return URL.createObjectURL(blob)
                })
              }}
              onLiveUi={setTaskLiveUi}
              skipNextRef={skipNextRef}
            />
          </div>
        </div>
      )}

      {tab === 'tasks2' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.85fr)]">
          <TasksWorkspace
            shape={shape}
            score={score}
            qualityThreshold={qualityThreshold}
            referencePhotos={referencePhotos}
            videoRef={camera.videoRef}
            canvasRef={camera.canvasRef}
            landmarks={activeLandmarks}
            mirror={settings.mirrorVideo}
            showAngles={settings.showAngles}
            cameraRunning={camera.running}
            demoMode={!camera.running && demoLandmarks !== null}
            stream={camera.stream}
            cameraControls={cameraControls}
            cameraError={camera.error}
            hitPreviewUrl={hitPreviewUrl}
            liveUi={null}
            flowMode
            cueLine={flowCue}
            previewItems={flowPreview}
          />

          <div className="panel-scroll flex max-h-[calc(100vh-6rem)] flex-col gap-3 overflow-y-auto">
            <AthletePanel
              athletes={athletes}
              activeId={activeAthleteId}
              onChangeAthletes={setAthletes}
              onSelect={setActiveAthleteId}
            />
            <Tasks2Panel
              athleteId={activeAthleteId}
              athlete={athletes.find((a) => a.id === activeAthleteId) ?? null}
              score={score}
              scoredShapeId={shape.id}
              onRequestShape={onJumpToShape}
              referencePhotos={referencePhotos}
              voiceEnabled={settings.voiceEnabled}
              canvasRef={camera.canvasRef}
              cameraRunning={camera.running}
              stream={camera.stream}
              onEnsureCamera={() => {
                if (!camera.running) void camera.start()
              }}
              onCue={setFlowCue}
              onPreviewItems={setFlowPreview}
              onHitPreview={(blob) => {
                setHitPreviewUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev)
                  return URL.createObjectURL(blob)
                })
              }}
            />
          </div>
        </div>
      )}

      {tab === 'homework' && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-3">
            <CameraStage
              videoRef={camera.videoRef}
              canvasRef={camera.canvasRef}
              landmarks={activeLandmarks}
              mirror={settings.mirrorVideo}
              showAngles={settings.showAngles}
              running={camera.running}
              demoMode={!camera.running && demoLandmarks !== null}
              shape={shape}
              score={score}
            />
            {cameraControls}
            {camera.error && (
              <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
                {camera.error}
              </p>
            )}
            <ScorePanel
              shape={shape}
              score={score}
              qualityThreshold={qualityThreshold}
              totalHoldSeconds={hold.totalHoldSeconds}
              qualityHoldSeconds={hold.qualityHoldSeconds}
              onResetTimer={hold.reset}
              onSave={saveAttempt}
              canSave={Boolean(activeAthleteId)}
            />
          </div>

          <div className="panel-scroll flex max-h-[calc(100vh-6rem)] flex-col gap-3 overflow-y-auto">
            <AthletePanel
              athletes={athletes}
              activeId={activeAthleteId}
              onChangeAthletes={setAthletes}
              onSelect={setActiveAthleteId}
            />
            <HomeworkPanel
              athleteId={activeAthleteId}
              score={score}
              currentShapeId={shape.id}
              onRequestShape={onJumpToShape}
              timingActive={timingActive}
              voiceEnabled={settings.voiceEnabled}
              referencePhotos={referencePhotos}
            />
          </div>
        </div>
      )}

      {tab === 'learn' && (
        <EducationPanel
          referencePhotos={referencePhotos}
          athleteId={activeAthleteId}
          athleteName={athletes.find((a) => a.id === activeAthleteId)?.name ?? null}
          onReferencesChange={setReferencePhotos}
        />
      )}

      {(compareOpened || tab === 'compare') && (
        <div className={tab === 'compare' ? '' : 'hidden'} hidden={tab !== 'compare'}>
          <CompareErrorBoundary>
            <ComparePanel />
          </CompareErrorBoundary>
        </div>
      )}

      {tab === 'coach' && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-3">
            <CameraStage
              videoRef={camera.videoRef}
              canvasRef={camera.canvasRef}
              landmarks={activeLandmarks}
              mirror={settings.mirrorVideo}
              showAngles={settings.showAngles}
              running={camera.running}
              demoMode={!camera.running && demoLandmarks !== null}
              shape={shape}
              score={score}
            />
            {cameraControls}
            {camera.error && (
              <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
                {camera.error}
              </p>
            )}
            {saveFlash && (
              <p className="rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
                {saveFlash}
              </p>
            )}
          </div>

          <div className="panel-scroll flex max-h-[calc(100vh-6rem)] flex-col gap-3 overflow-y-auto">
            <ShapeSelector selectedId={shape.id} onSelect={onSelectShape} />
            <ScorePanel
              shape={shape}
              score={score}
              qualityThreshold={qualityThreshold}
              totalHoldSeconds={hold.totalHoldSeconds}
              qualityHoldSeconds={hold.qualityHoldSeconds}
              onResetTimer={hold.reset}
              onSave={saveAttempt}
              canSave={Boolean(activeAthleteId)}
            />
            <AthletePanel
              athletes={athletes}
              activeId={activeAthleteId}
              onChangeAthletes={setAthletes}
              onSelect={setActiveAthleteId}
            />
            <SequencePanel
              currentShapeId={shape.id}
              overallScore={score.overall}
              onJumpToShape={onJumpToShape}
            />
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="mx-auto grid max-w-3xl gap-4">
          <AthletePanel
            athletes={athletes}
            activeId={activeAthleteId}
            onChangeAthletes={setAthletes}
            onSelect={setActiveAthleteId}
          />
          <ProgressHistory attempts={attempts} athleteId={activeAthleteId} />
          <CoachInbox athletes={athletes} />
        </div>
      )}

      {tab === 'about' && (
        <div className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed text-[var(--muted)]">
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
            <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">What this is</h2>
            <p>
              Shape Lab is a free, local-first prototype for gymnastics shape coaching. It uses
              MediaPipe Pose in your browser — no paid APIs, no account required. Attempts,
              athlete profiles, curriculum progress, and reference photos stay on this device via
              localStorage.
            </p>
          </section>
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
            <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">
              Learn without a camera
            </h2>
            <p className="mb-2">
              Open the <strong className="text-[var(--text)]">Learn</strong> tab to study shapes
              (cues, criteria, reference photos) and the full task pathway before practicing.
              Take a <strong className="text-[var(--text)]">Shape test</strong>, review{' '}
              <strong className="text-[var(--text)]">My shapes</strong>, and keep one coach photo
              per position in the <strong className="text-[var(--text)]">Glossary</strong> (plus an
              Extra folder for shapes you will not practice on camera).
            </p>
          </section>
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
            <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">
              Tasks 2 — class flow
            </h2>
            <p className="mb-2">
              <strong className="text-[var(--text)]">Tasks 2</strong> is the same shapes, run
              the way class runs: we name the sequence (LG LV HS LG), show the stills, then call
              the shapes at class pace. Grades do not stop you. After you clean, you get a
              fullscreen replay of the run, a snapshot of each shape with a score, and a few
              written cues to think about next time. Go again, or take the next sequence. Progress
              over time lets you download the video and analysis, share a Story caption + clip to
              Instagram, or mark the run for Ryan on this device.
            </p>
          </section>
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
            <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">
              Athlete Tasks pathway
            </h2>
            <p className="mb-2">
              Open the <strong className="text-[var(--text)]">Tasks</strong> tab, pick an athlete,
              and work through the ordered curriculum. Standalone holds start at 5s and drop to 3s after
              mastery. Sequences always use 3s holds, and FTOS in those sequences does not require
              facing the camera. Freestanding handstand is <strong className="text-[var(--text)]">three kick-up tries</strong> —
              we grade the best line in a written analysis, and it does not block moving on (wall
              handstand stays on Homework). Required to pass the lunge–lever sequences:{' '}
              <strong className="text-[var(--text)]">FTOS, starting lunge, lever, landing lunge</strong>.
              After each task you can read corrections. Voice talks you through the
              passé–lunge–lever–handstand walkthrough when you get there. Coach stills are labeled
              with the shape we are asking — a lever still for lever, a mountain climber still for
              mountain climber.
            </p>
          </section>
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
            <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">
              How coaches edit scoring
            </h2>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Open <code className="text-[var(--accent)]">src/config/shapes.ts</code>
              </li>
              <li>Find the shape (Handstand is the full reference example).</li>
              <li>
                Adjust <code>target</code> / <code>tolerance</code> / <code>weight</code> / feedback
                strings.
              </li>
              <li>
                Curriculum order:{' '}
                <code className="text-[var(--accent)]">src/config/curriculum.ts</code>
              </li>
              <li>
                Sequences: edit <code className="text-[var(--accent)]">src/config/sequences.ts</code>
              </li>
            </ol>
          </section>
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
            <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">Roadmap hooks</h2>
            <p className="mb-2">Architecture is ready to grow into:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Cartwheel head/gaze and hand placement grading</li>
              <li>Roundoff body segmentation</li>
              <li>Handstand forward roll &amp; back extension roll grading</li>
              <li>V-ups and more dynamic skills</li>
              <li>Drills mastered library &amp; skill progression roadmaps</li>
              <li>Richer education media (video demos, drill libraries)</li>
              <li>Folders &amp; groups for athletes</li>
              <li>Progress sharing with parents or athletes</li>
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
