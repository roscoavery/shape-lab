/**
 * HomeworkPanel — per-athlete homework library.
 *
 * Every athlete always has 4 automatic drills (hollow arms-down → arms-up
 * progression, superman, side plank, wall handstand) plus any items the
 * coach assigns or the athlete self-selects from the shape library.
 *
 * Running an item reuses the live camera scoring + hold timers from App
 * (same flow as the Coach tab); logging a session stores total hold,
 * quality hold and score so progress accumulates over the whole journey.
 */

import { useEffect, useMemo, useState } from 'react'
import { SHAPES, getShape } from '../config/shapes'
import { formatSeconds } from '../hooks/useHoldTimer'
import {
  HOLLOW_PROGRESS_TARGET_SECONDS,
  addHomeworkItem,
  addHomeworkLog,
  createId,
  ensureAutoHomework,
  loadHomeworkLogs,
  progressHollowHomework,
  removeHomeworkItem,
} from '../lib/storage'
import type {
  HomeworkItem,
  HomeworkLog,
  HomeworkSource,
  ScoreResult,
} from '../types'

type PlankSide = 'left' | 'right' | 'both'

type Props = {
  athleteId: string | null
  score: ScoreResult
  qualityThreshold: number
  /** Shape the camera is currently scoring (App state) */
  currentShapeId: string
  totalHoldSeconds: number
  qualityHoldSeconds: number
  onResetTimer: () => void
  /** Ask App to switch camera scoring to this shape */
  onRequestShape: (shapeId: string) => void
  /** Whether pose timing is accumulating (camera or demo active) */
  timingActive: boolean
}

function sourceBadge(source: HomeworkSource): { label: string; cls: string } {
  switch (source) {
    case 'auto':
      return { label: 'Auto', cls: 'bg-[var(--accent-dim)] text-white' }
    case 'coach':
      return { label: 'Coach', cls: 'bg-[#2c3a52] text-[var(--text)]' }
    case 'athlete':
      return { label: 'Athlete', cls: 'bg-[#233043] text-[var(--muted)]' }
  }
}

/** Tiny quality-hold trend over the last sessions (chronological). */
function Sparkline({ values, target }: { values: number[]; target?: number }) {
  if (values.length < 2) return null
  const w = 120
  const h = 26
  const max = Math.max(...values, target ?? 0, 1)
  const pts = values
    .map(
      (v, i) =>
        `${((i / (values.length - 1)) * (w - 2) + 1).toFixed(1)},${(
          h -
          1 -
          (v / max) * (h - 2)
        ).toFixed(1)}`,
    )
    .join(' ')
  const targetY = target ? h - 1 - (Math.min(target, max) / max) * (h - 2) : null
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0"
      aria-label="Quality hold trend"
    >
      {targetY !== null && (
        <line
          x1="0"
          x2={w}
          y1={targetY}
          y2={targetY}
          stroke="var(--warn)"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.6"
        />
      )}
      <polyline
        points={pts}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function HomeworkPanel({
  athleteId,
  score,
  qualityThreshold,
  currentShapeId,
  totalHoldSeconds,
  qualityHoldSeconds,
  onResetTimer,
  onRequestShape,
  timingActive,
}: Props) {
  const [items, setItems] = useState<HomeworkItem[]>([])
  const [logs, setLogs] = useState<HomeworkLog[]>([])
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [plankSide, setPlankSide] = useState<PlankSide>('left')
  const [flash, setFlash] = useState<string | null>(null)
  const [addShapeId, setAddShapeId] = useState(SHAPES[0]?.id ?? '')
  const [addSource, setAddSource] = useState<'coach' | 'athlete'>('coach')
  const [addTarget, setAddTarget] = useState('20')
  const [addNotes, setAddNotes] = useState('')

  // Load (and auto-seed) homework whenever the athlete changes
  useEffect(() => {
    if (!athleteId) {
      setItems([])
      setLogs([])
      setActiveItemId(null)
      return
    }
    setItems(ensureAutoHomework(athleteId))
    setLogs(loadHomeworkLogs(athleteId))
    setActiveItemId(null)
  }, [athleteId])

  const logsByItem = useMemo(() => {
    const map = new Map<string, HomeworkLog[]>()
    for (const l of logs) {
      const list = map.get(l.homeworkId) ?? []
      list.push(l) // logs are newest-first
      map.set(l.homeworkId, list)
    }
    return map
  }, [logs])

  const activeItem = items.find((i) => i.id === activeItemId) ?? null
  const activeShape = activeItem ? getShape(activeItem.shapeId) : undefined

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2500)
  }

  const startItem = (item: HomeworkItem) => {
    setActiveItemId(item.id)
    onRequestShape(item.shapeId)
    onResetTimer()
  }

  const stopItem = () => {
    setActiveItemId(null)
  }

  const logSession = () => {
    if (!athleteId || !activeItem) return
    if (totalHoldSeconds < 0.5) {
      showFlash('Nothing to log yet — hold the shape first.')
      return
    }
    const isPlank = activeItem.shapeId === 'side_plank'
    const log: HomeworkLog = {
      id: createId('hwlog'),
      athleteId,
      homeworkId: activeItem.id,
      shapeId: activeItem.shapeId,
      date: new Date().toISOString(),
      totalHoldSeconds: Number(totalHoldSeconds.toFixed(2)),
      qualityHoldSeconds: Number(qualityHoldSeconds.toFixed(2)),
      score: score.overall,
      ...(isPlank && plankSide !== 'both' ? { side: plankSide } : {}),
    }
    addHomeworkLog(log)
    setLogs((prev) => [log, ...prev])
    onResetTimer()
    const shapeName = getShape(activeItem.shapeId)?.name ?? activeItem.shapeId
    showFlash(
      `Logged ${shapeName} — Q ${formatSeconds(log.qualityHoldSeconds)}`,
    )
  }

  const levelUpHollow = (item: HomeworkItem) => {
    const updated = progressHollowHomework(item.id)
    if (!updated) return
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    if (activeItemId === updated.id) onRequestShape(updated.shapeId)
    showFlash('Leveled up — Hollow is now trained with arms up!')
  }

  const addItem = () => {
    if (!athleteId || !addShapeId) return
    const target = Number(addTarget)
    const item: HomeworkItem = {
      id: createId('hw'),
      athleteId,
      shapeId: addShapeId,
      source: addSource,
      ...(Number.isFinite(target) && target > 0
        ? { targetSeconds: target }
        : {}),
      ...(addNotes.trim() ? { notes: addNotes.trim() } : {}),
      createdAt: new Date().toISOString(),
    }
    setItems(addHomeworkItem(item))
    setAddNotes('')
    const shapeName = getShape(addShapeId)?.name ?? addShapeId
    showFlash(
      `${addSource === 'coach' ? 'Coach added' : 'Athlete picked'}: ${shapeName}`,
    )
  }

  const removeItem = (item: HomeworkItem) => {
    if (item.source === 'auto') return
    removeHomeworkItem(item.id)
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    if (activeItemId === item.id) setActiveItemId(null)
  }

  if (!athleteId) {
    return (
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
        Select or create an athlete to see their homework — every athlete
        automatically gets the 4 core drills (hollow, superman, side plank,
        wall handstand).
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          Homework
        </p>
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Drill library &amp; lifetime progress
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          4 automatic drills for every athlete, plus coach-assigned and
          athlete-picked shapes. Run a drill with the camera, then log the
          session to build history.
        </p>
      </div>

      {/* Active session */}
      {activeItem && activeShape && (
        <div className="rounded-lg border border-[var(--accent)]/40 bg-[#102820] p-3">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-[var(--text)]">
              Training: {activeShape.name}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {currentShapeId === activeShape.id
                ? timingActive
                  ? 'Camera scoring live'
                  : 'Start the camera (or a demo) to time the hold'
                : 'Switching camera to this shape…'}
            </p>
          </div>
          <div className="mb-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[10px] uppercase text-[var(--muted)]">Score</p>
              <p className="text-lg font-semibold tabular-nums">
                {score.overall}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--muted)]">
                Total hold
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {formatSeconds(totalHoldSeconds)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--muted)]">
                Quality (≥{qualityThreshold})
              </p>
              <p className="text-lg font-semibold tabular-nums text-[var(--accent)]">
                {formatSeconds(qualityHoldSeconds)}
              </p>
            </div>
          </div>
          {activeItem.targetSeconds ? (
            <div className="mb-2">
              <div className="h-1.5 overflow-hidden rounded bg-[#0d1218]">
                <div
                  className="h-full rounded bg-[var(--accent)] transition-[width] duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (qualityHoldSeconds / activeItem.targetSeconds) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Target: {activeItem.targetSeconds}s quality hold
              </p>
            </div>
          ) : null}
          {score.mainCorrection && (
            <p className="mb-2 text-sm">
              <span className="text-[var(--muted)]">Cue: </span>
              <span className="font-medium text-[var(--text)]">
                {score.mainCorrection}
              </span>
            </p>
          )}
          {activeItem.shapeId === 'side_plank' && (
            <div className="mb-2 flex items-center gap-1 text-xs">
              <span className="mr-1 text-[var(--muted)]">Side:</span>
              {(['left', 'right', 'both'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPlankSide(s)}
                  className={`rounded px-2 py-1 capitalize ${
                    plankSide === s
                      ? 'bg-[var(--accent-dim)] font-semibold text-white'
                      : 'border border-[var(--panel-border)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={logSession}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
            >
              Log session
            </button>
            <button
              type="button"
              onClick={onResetTimer}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
            >
              Reset timer
            </button>
            <button
              type="button"
              onClick={stopItem}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--muted)]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Homework items */}
      <div className="space-y-2">
        {items.map((item) => {
          const shape = getShape(item.shapeId)
          const itemLogs = logsByItem.get(item.id) ?? []
          const bestQuality = itemLogs.reduce(
            (b, l) => Math.max(b, l.qualityHoldSeconds),
            0,
          )
          const badge = sourceBadge(item.source)
          const isHollowAuto = item.source === 'auto' && item.autoKey === 'hollow'
          const hollowStage1 = isHollowAuto && item.shapeId === 'hollow_arms_down'
          const readyToLevelUp =
            hollowStage1 && bestQuality >= HOLLOW_PROGRESS_TARGET_SECONDS
          const isPlank = item.shapeId === 'side_plank'
          const bestLeft = isPlank
            ? itemLogs
                .filter((l) => l.side === 'left')
                .reduce((b, l) => Math.max(b, l.qualityHoldSeconds), 0)
            : 0
          const bestRight = isPlank
            ? itemLogs
                .filter((l) => l.side === 'right')
                .reduce((b, l) => Math.max(b, l.qualityHoldSeconds), 0)
            : 0
          const trendValues = [...itemLogs]
            .slice(0, 10)
            .reverse()
            .map((l) => l.qualityHoldSeconds)
          return (
            <div
              key={item.id}
              className={`rounded-lg border p-3 ${
                activeItemId === item.id
                  ? 'border-[var(--accent)]/50 bg-[#121f1a]'
                  : 'border-[var(--panel-border)] bg-[#121820]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                  <span className="truncate font-medium text-[var(--text)]">
                    {shape?.name ?? item.shapeId}
                  </span>
                  {item.targetSeconds ? (
                    <span className="text-[11px] text-[var(--muted)]">
                      goal {item.targetSeconds}s
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startItem(item)}
                    className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Train
                  </button>
                  {item.source !== 'auto' && (
                    <button
                      type="button"
                      onClick={() => removeItem(item)}
                      className="text-xs text-[var(--bad)] underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Hollow progression state */}
              {isHollowAuto && (
                <div className="mt-2">
                  {hollowStage1 ? (
                    <>
                      <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                        <span>
                          Stage 1 of 2 — arms down · best quality hold{' '}
                          <span className="text-[var(--text)]">
                            {formatSeconds(bestQuality)}
                          </span>{' '}
                          / {HOLLOW_PROGRESS_TARGET_SECONDS}s to level up
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded bg-[#0d1218]">
                        <div
                          className="h-full rounded bg-[var(--warn)]"
                          style={{
                            width: `${Math.min(
                              100,
                              (bestQuality / HOLLOW_PROGRESS_TARGET_SECONDS) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                      {readyToLevelUp && (
                        <div className="mt-2 rounded-lg border border-[var(--warn)]/60 bg-[#2a2312] p-2">
                          <p className="text-sm font-semibold text-[var(--warn)]">
                            🎉 Level up: train Hollow with arms up!
                          </p>
                          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                            Best quality hold hit{' '}
                            {HOLLOW_PROGRESS_TARGET_SECONDS}s with arms down.
                            Switch this drill to the arms-up hollow (arms by
                            ears) — history is kept.
                          </p>
                          <button
                            type="button"
                            onClick={() => levelUpHollow(item)}
                            className="mt-1.5 rounded-lg bg-[var(--warn)] px-3 py-1.5 text-xs font-semibold text-[#241a05]"
                          >
                            Switch to arms up
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-[var(--good)]">
                      ✓ Stage 2 of 2 — arms up (leveled up
                      {item.progressedAt
                        ? ` ${new Date(item.progressedAt).toLocaleDateString()}`
                        : ''}
                      )
                    </p>
                  )}
                </div>
              )}

              {item.notes && (
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {item.notes}
                </p>
              )}

              {/* Progress over time */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--panel-border)] pt-2 text-xs text-[var(--muted)]">
                <div>
                  <span className="text-[10px] uppercase">Best quality </span>
                  <span className="font-semibold text-[var(--accent)]">
                    {formatSeconds(bestQuality)}
                  </span>
                  {isPlank && (bestLeft > 0 || bestRight > 0) && (
                    <span className="ml-2">
                      L {formatSeconds(bestLeft)} · R {formatSeconds(bestRight)}
                    </span>
                  )}
                  <span className="ml-2 text-[10px] uppercase">
                    {itemLogs.length} session{itemLogs.length === 1 ? '' : 's'}
                  </span>
                </div>
                <Sparkline values={trendValues} target={item.targetSeconds} />
              </div>
              {itemLogs.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {itemLogs.slice(0, 5).map((l) => (
                    <li
                      key={l.id}
                      className="flex justify-between gap-2 text-[11px] text-[var(--muted)]"
                    >
                      <span>
                        {new Date(l.date).toLocaleString()}
                        {l.side ? ` · ${l.side === 'left' ? 'L' : 'R'}` : ''}
                      </span>
                      <span className="text-[var(--text)]">
                        {l.score} · Q {formatSeconds(l.qualityHoldSeconds)} /{' '}
                        {formatSeconds(l.totalHoldSeconds)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {/* Add homework */}
      <div className="rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
        <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">
          Add homework
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5"
            value={addShapeId}
            onChange={(e) => setAddShapeId(e.target.value)}
          >
            {SHAPES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-[var(--muted)]">
            goal
            <input
              type="number"
              min={0}
              className="w-14 rounded border border-[var(--panel-border)] bg-[#0d1218] px-1.5 py-1"
              value={addTarget}
              onChange={(e) => setAddTarget(e.target.value)}
            />
            s
          </label>
          <select
            className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-xs"
            value={addSource}
            onChange={(e) =>
              setAddSource(e.target.value === 'athlete' ? 'athlete' : 'coach')
            }
            title="Who is adding this drill"
          >
            <option value="coach">Coach assigns</option>
            <option value="athlete">Athlete picks</option>
          </select>
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Add
          </button>
        </div>
        <input
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-xs"
          placeholder="Optional note (e.g. 3 sets before bed)"
          value={addNotes}
          onChange={(e) => setAddNotes(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addItem()
          }}
        />
      </div>

      {flash && (
        <p className="rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          {flash}
        </p>
      )}
    </div>
  )
}
