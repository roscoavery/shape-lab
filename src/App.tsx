/**
 * Shape Lab — main application shell
 *
 * Tabs: Coach (live scoring) | Athletes & History | About / roadmap
 * Shape standards live in src/config/shapes.ts
 * Sequences live in src/config/sequences.ts
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AthletePanel } from './components/AthletePanel'
import { CameraStage } from './components/CameraStage'
import { ProgressHistory } from './components/ProgressHistory'
import { ScorePanel } from './components/ScorePanel'
import { SequencePanel } from './components/SequencePanel'
import { ShapeSelector } from './components/ShapeSelector'
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
  loadActiveAthleteId,
  loadAthletes,
  loadAttempts,
  loadSettings,
  saveActiveAthleteId,
  saveAthletes,
  saveSettings,
} from './lib/storage'
import type { AppSettings, Athlete, AttemptRecord, Landmark, ShapeDef } from './types'

type Tab = 'coach' | 'history' | 'about'

export default function App() {
  const camera = usePoseCamera()
  const [tab, setTab] = useState<Tab>('coach')
  const [shape, setShape] = useState<ShapeDef>(SHAPES[0])
  const [athletes, setAthletes] = useState<Athlete[]>(() => loadAthletes())
  const [activeAthleteId, setActiveAthleteId] = useState<string | null>(() =>
    loadActiveAthleteId(),
  )
  const [attempts, setAttempts] = useState<AttemptRecord[]>(() => loadAttempts())
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [saveFlash, setSaveFlash] = useState<string | null>(null)
  const [demoLandmarks, setDemoLandmarks] = useState<Landmark[] | null>(null)

  const qualityThreshold =
    settings.qualityThresholdOverride ?? shape.qualityThreshold

  // Live camera wins over demo poses when the camera is running
  const activeLandmarks = camera.running ? camera.landmarks : demoLandmarks

  const score = useMemo(
    () => scoreShape(activeLandmarks, shape, qualityThreshold),
    [activeLandmarks, shape, qualityThreshold],
  )

  const timingActive = camera.running || demoLandmarks !== null
  const hold = useHoldTimer(timingActive, score.overall, qualityThreshold)

  useEffect(() => {
    saveAthletes(athletes)
  }, [athletes])

  useEffect(() => {
    saveActiveAthleteId(activeAthleteId)
  }, [activeAthleteId])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Reset hold timers when shape changes
  useEffect(() => {
    hold.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape.id])

  const onSelectShape = useCallback((s: ShapeDef) => {
    setShape(s)
  }, [])

  const onJumpToShape = useCallback((shapeId: string) => {
    const s = SHAPES.find((x) => x.id === shapeId)
    if (s) setShape(s)
  }, [])

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

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-3 py-4 sm:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Shape Lab
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Free browser gymnastics coaching prototype · MediaPipe Pose
          </p>
        </div>
        <nav className="flex gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] p-1">
          {(
            [
              ['coach', 'Coach'],
              ['history', 'Athletes'],
              ['about', 'About'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-3 py-1.5 text-sm ${
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
            />

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
        </div>
      )}

      {tab === 'about' && (
        <div className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed text-[var(--muted)]">
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
            <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">What this is</h2>
            <p>
              Shape Lab is a free, local-first prototype for gymnastics shape coaching. It uses
              MediaPipe Pose in your browser — no paid APIs, no account required. Attempts and
              athlete profiles stay on this device via localStorage.
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
                Add new shapes by copying a block — the selector picks them up automatically.
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
              <li>Educational pages per shape / drill / skill</li>
              <li>Folders &amp; groups for athletes</li>
              <li>Progress sharing with parents or athletes</li>
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
