/**
 * HomeworkPanel — per-athlete homework library.
 *
 * Every athlete always has 4 automatic drills (hollow arms-down → arms-up
 * progression, superman, side plank, wall handstand) plus any items the
 * coach assigns or the athlete self-selects from the shape library.
 *
 * Two ways to log a session:
 *  - CAMERA (primary, encouraged): live scoring with two timers — total hold
 *    vs "proper" hold (score at/above the form standard). Clock starts when
 *    you actually hit the shape. Voice stays quiet (about every 20s, only on
 *    a real miss). Breakdowns still save for later review.
 *  - MANUAL (secondary): type a hold time with an editable date — flagged
 *    with method: 'manual' and shown with a badge (no proper-hold data).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { SHAPES, getShape } from '../config/shapes'
import { formatSeconds, useHoldTimer } from '../hooks/useHoldTimer'
import { useSpeechCoach } from '../hooks/useSpeechCoach'
import { CoachStillGallery, ReferenceStill } from './ReferenceStill'
import {
  DEFAULT_FORM_STANDARD,
  HOLLOW_PROGRESS_TARGET_SECONDS,
  addHomeworkItem,
  addHomeworkLog,
  createId,
  dedupeHomeworkItems,
  ensureAutoHomework,
  formStandardFor,
  homeworkDedupeKey,
  loadHomeworkLogs,
  logProperHoldSeconds,
  progressHollowHomework,
  removeHomeworkItem,
  updateHomeworkItem,
} from '../lib/storage'
import { homeworkLooksReady } from '../lib/homeworkPose'
import {
  customHomeworkShapeId,
  homeworkTitle,
  isCustomHomework,
} from '../lib/homeworkLabel'
import { pickCoachStill } from '../lib/shippedRefs'
import type {
  HomeworkBreakdown,
  HomeworkItem,
  HomeworkLog,
  HomeworkSource,
  Landmark,
  ReferencePhoto,
  ScoreResult,
} from '../types'

type PlankSide = 'left' | 'right' | 'both'

type Props = {
  athleteId: string | null
  score: ScoreResult
  /** Shape the camera is currently scoring (App state) */
  currentShapeId: string
  /** Ask App to switch camera scoring to this shape */
  onRequestShape: (
    shapeId: string,
    stance?: 'left' | 'right' | 'auto',
    opts?: { profileOk?: boolean },
  ) => void
  /** Whether pose timing is accumulating (camera or demo active) */
  timingActive: boolean
  /** Speak form tips during camera sessions */
  voiceEnabled: boolean
  referencePhotos: ReferencePhoto[]
  landmarks?: Landmark[] | null
  onEnsureCamera?: () => void | Promise<void>
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

function todayInputValue(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Tiny proper-hold trend over the last camera sessions (chronological). */
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
      aria-label="Proper hold trend"
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

/** Both hollow stills on the homework card — arms-up is labeled as gated. */
function HollowPairRefs({
  photos,
  unlockedUp,
}: {
  photos: ReferencePhoto[]
  unlockedUp: boolean
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <figure>
        <div className="max-h-36 overflow-hidden rounded-md bg-[#0d1218]">
          <ReferenceStill
            shapeId="hollow_arms_down"
            photos={photos}
            alt="Hollow arms down"
            className="max-h-36 w-full object-contain"
          />
        </div>
        <figcaption className="mt-1 text-[11px] leading-snug text-[var(--text)]">
          Arms down — do this first. Lower back flat, then feet lift.
        </figcaption>
      </figure>
      <figure className={unlockedUp ? '' : 'opacity-75'}>
        <div className="max-h-36 overflow-hidden rounded-md bg-[#0d1218]">
          <ReferenceStill
            shapeId="hollow_arms_up"
            photos={photos}
            alt="Hollow arms up"
            className="max-h-36 w-full object-contain"
          />
        </div>
        <figcaption className="mt-1 text-[11px] leading-snug text-[var(--warn)]">
          {unlockedUp
            ? 'Arms up — unlocked after a proper 1-minute arms-down hold.'
            : 'Arms up — do not use until you can hold arms-down properly for 1 minute.'}
        </figcaption>
      </figure>
    </div>
  )
}

export function HomeworkPanel({
  athleteId,
  score,
  currentShapeId,
  onRequestShape,
  timingActive,
  voiceEnabled,
  referencePhotos,
  landmarks = null,
  onEnsureCamera,
}: Props) {
  const [items, setItems] = useState<HomeworkItem[]>([])
  const [logs, setLogs] = useState<HomeworkLog[]>([])
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [plankSide, setPlankSide] = useState<PlankSide>('left')
  const [flash, setFlash] = useState<string | null>(null)
  const [addShapeId, setAddShapeId] = useState(SHAPES[0]?.id ?? '')
  const [addTyped, setAddTyped] = useState('')
  const [addSource, setAddSource] = useState<'coach' | 'athlete'>('coach')
  const [addTarget, setAddTarget] = useState('20')
  const [addNotes, setAddNotes] = useState('')
  // Manual logging (secondary flow)
  const [manualItemId, setManualItemId] = useState<string | null>(null)
  const [manualSeconds, setManualSeconds] = useState('')
  const [manualDate, setManualDate] = useState(todayInputValue())
  const [manualSide, setManualSide] = useState<PlankSide>('left')
  // Live breakdown count for the session box
  const [breakdownCount, setBreakdownCount] = useState(0)
  const [watchRunning, setWatchRunning] = useState(false)
  const [watchMs, setWatchMs] = useState(0)
  const [watchOffer, setWatchOffer] = useState<number | null>(null)
  const watchStartRef = useRef<number | null>(null)
  const watchAccRef = useRef(0)

  const breakdownsRef = useRef<HomeworkBreakdown[]>([])
  const wasProperRef = useRef(false)
  const lastEncourageAtRef = useRef(0)

  useEffect(() => {
    if (!watchRunning) return
    const id = window.setInterval(() => {
      const start = watchStartRef.current ?? performance.now()
      setWatchMs(watchAccRef.current + (performance.now() - start))
    }, 80)
    return () => window.clearInterval(id)
  }, [watchRunning])

  // Load (and auto-seed) homework whenever the athlete changes
  useEffect(() => {
    if (!athleteId) {
      setItems([])
      setLogs([])
      setActiveItemId(null)
      setManualItemId(null)
      return
    }
    setItems(ensureAutoHomework(athleteId))
    setLogs(loadHomeworkLogs(athleteId))
    setActiveItemId(null)
    setManualItemId(null)
  }, [athleteId])

  const visibleItems = useMemo(() => dedupeHomeworkItems(items), [items])

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
  const standard = activeItem ? formStandardFor(activeItem) : DEFAULT_FORM_STANDARD

  // Session timers: total vs proper (≥ form standard), independent of the
  // global quality threshold used elsewhere in the app.
  const sessionTiming =
    timingActive && activeItem !== null && currentShapeId === activeItem.shapeId
  const inShape =
    Boolean(activeItem) &&
    homeworkLooksReady(activeItem!.shapeId, landmarks, score.overall)
  const hold = useHoldTimer(
    sessionTiming && inShape,
    inShape ? Math.max(score.overall, 10) : 0,
    standard,
  )
  const properHoldSeconds = hold.qualityHoldSeconds

  const { speak, reset: resetSpeech, supported: speechSupported } =
    useSpeechCoach(voiceEnabled && activeItem !== null)

  // Verbal tips + breakdown capture while holding
  useEffect(() => {
    if (!sessionTiming) return
    if (score.holdReady || score.overall >= standard) {
      wasProperRef.current = true
      return
    }
    if (!inShape) return
    if (wasProperRef.current && hold.totalHoldSeconds > 0.5) {
      wasProperRef.current = false
      const visible = score.criteria.filter((c) => !c.id.startsWith('_'))
      const worst = visible.reduce(
        (w, c) => (c.score < w.score ? c : w),
        visible[0],
      )
      if (worst && breakdownsRef.current.length < 30) {
        breakdownsRef.current.push({
          atSeconds: Number(hold.totalHoldSeconds.toFixed(1)),
          criterionId: worst.id,
          criterionLabel: worst.label,
          feedback: worst.feedback ?? score.mainCorrection,
        })
        setBreakdownCount(breakdownsRef.current.length)
      }
    }
    if (!inShape) return
    if (hold.totalHoldSeconds < 4) return
    const now = Date.now()
    if (now - lastEncourageAtRef.current < 20000) return
    if (score.overall >= 48) return
    const cue = score.mainCorrection
    if (!cue || cue.toLowerCase().includes('excellent')) return
    lastEncourageAtRef.current = now
    speak(cue)
  }, [sessionTiming, score, standard, hold.totalHoldSeconds, speak, inShape])

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 2500)
  }

  const resetSession = () => {
    hold.reset()
    breakdownsRef.current = []
    wasProperRef.current = false
    lastEncourageAtRef.current = 0
    setBreakdownCount(0)
  }

  const startItem = (item: HomeworkItem) => {
    setActiveItemId(item.id)
    setManualItemId(null)
    onRequestShape(item.shapeId, 'auto', { profileOk: true })
    resetSession()
    resetSpeech()
    void onEnsureCamera?.()
  }

  const stopItem = () => {
    setActiveItemId(null)
    resetSpeech()
  }

  const logSession = () => {
    if (!athleteId || !activeItem) return
    if (hold.totalHoldSeconds < 0.5) {
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
      method: 'camera',
      totalHoldSeconds: Number(hold.totalHoldSeconds.toFixed(2)),
      properHoldSeconds: Number(properHoldSeconds.toFixed(2)),
      formStandard: standard,
      breakdowns: [...breakdownsRef.current],
      score: score.overall,
      ...(isPlank && plankSide !== 'both' ? { side: plankSide } : {}),
    }
    addHomeworkLog(log)
    setLogs((prev) => [log, ...prev])
    resetSession()
    const shapeName = homeworkTitle(activeItem)
    showFlash(
      `Logged ${shapeName} — proper ${formatSeconds(log.properHoldSeconds ?? 0)}`,
    )
  }

  const openManual = (item: HomeworkItem) => {
    setManualItemId((prev) => (prev === item.id ? null : item.id))
    setManualSeconds('')
    setManualDate(todayInputValue())
    setManualSide('left')
  }

  const startWatch = () => {
    watchStartRef.current = performance.now()
    setWatchRunning(true)
    setWatchOffer(null)
  }

  const stopWatch = () => {
    const start = watchStartRef.current
    if (start != null) watchAccRef.current += performance.now() - start
    watchStartRef.current = null
    setWatchRunning(false)
    const secs = watchAccRef.current / 1000
    setWatchMs(watchAccRef.current)
    setWatchOffer(secs)
    setManualSeconds(String(Math.round(secs * 10) / 10))
    if (!manualItemId && visibleItems[0]) setManualItemId(visibleItems[0].id)
  }

  const resetWatch = () => {
    watchStartRef.current = watchRunning ? performance.now() : null
    watchAccRef.current = 0
    setWatchMs(0)
    setWatchOffer(null)
  }

  const logWatchTime = () => {
    const item = visibleItems.find((i) => i.id === manualItemId) ?? visibleItems[0]
    if (!item) {
      showFlash('Select a drill to log this time on.')
      return
    }
    if (watchOffer == null || watchOffer <= 0) {
      showFlash('Start and stop the stopwatch first.')
      return
    }
    const secs = Number(manualSeconds)
    if (!Number.isFinite(secs) || secs <= 0) {
      showFlash('Enter the hold time in seconds.')
      return
    }
    logManual(item, secs)
    resetWatch()
    setWatchOffer(null)
  }

  const logManual = (item: HomeworkItem, secondsOverride?: number) => {
    if (!athleteId) return
    const secs = secondsOverride ?? Number(manualSeconds)
    if (!Number.isFinite(secs) || secs <= 0) {
      showFlash('Enter the hold time in seconds.')
      return
    }
    // Noon local time avoids the date shifting across timezones
    const when = new Date(`${manualDate}T12:00:00`)
    const isPlank = item.shapeId === 'side_plank'
    const log: HomeworkLog = {
      id: createId('hwlog'),
      athleteId,
      homeworkId: item.id,
      shapeId: item.shapeId,
      date: Number.isNaN(when.getTime())
        ? new Date().toISOString()
        : when.toISOString(),
      method: 'manual',
      totalHoldSeconds: Number(secs.toFixed(2)),
      score: 0,
      ...(isPlank && manualSide !== 'both' ? { side: manualSide } : {}),
    }
    addHomeworkLog(log)
    setLogs((prev) =>
      [log, ...prev].sort((a, b) => b.date.localeCompare(a.date)),
    )
    setManualItemId(null)
    const shapeName = homeworkTitle(item)
    showFlash(`Manually logged ${shapeName} — ${formatSeconds(secs)}`)
  }

  const changeStandard = (item: HomeworkItem, value: string) => {
    const v = Number(value)
    if (!Number.isFinite(v)) return
    const clamped = Math.min(100, Math.max(0, Math.round(v)))
    const updated = updateHomeworkItem(item.id, { formStandard: clamped })
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    }
  }

  const levelUpHollow = (item: HomeworkItem) => {
    const updated = progressHollowHomework(item.id)
    if (!updated) return
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    if (activeItemId === updated.id) onRequestShape(updated.shapeId)
    showFlash('Leveled up — Hollow is now trained with arms up!')
  }

  const addItem = () => {
    if (!athleteId) return
    const typed = addTyped.trim()
    if (!typed && !addShapeId) return
    const nextShapeId = typed ? customHomeworkShapeId(typed) : addShapeId
    const probe = {
      athleteId,
      shapeId: nextShapeId,
      customLabel: typed || undefined,
      source: addSource,
      id: '',
      createdAt: '',
    }
    if (visibleItems.some((h) => homeworkDedupeKey(h) === homeworkDedupeKey(probe))) {
      showFlash('That drill is already on this homework list.')
      return
    }
    const target = Number(addTarget)
    const defaultNotes =
      nextShapeId === 'rainbow_bridge'
        ? 'Feet flat, pointed straight, feet apart, bent knees, hips up high. Spread the arch until the shoulders are open. Push-ups, back bends, hops, and rocks from this bridge.'
        : nextShapeId === 'side_plank'
          ? 'Be a pencil. Forearm on the mat, elbow under the shoulder, one foot stacked on the other. Top hand on the hip or up. Head in line — no dangling head, no ribs flaring, no closed hips. Straight knees if you can; or bend them and put weight on the bottom knee. Both sides. Work toward a minute.'
        : nextShapeId === 'long_bridge'
          ? 'Only after rainbow-bridge shoulders are open. Straight legs together, heels flat, pushing through the toes, arms in close by the ears, chin to chest. Come down and rock it out.'
          : nextShapeId === 'seated_pike'
            ? 'Toes pointed, straight knees, torso upright and rounded hollow, shoulders shrug, arms covering the ears, eyes through the hands. Hands push through — wide fingers, thumbs slightly down, pinkies slightly up. Snap-open drill: pike → hollow arms down → arch (supine).'
            : nextShapeId === 'zombie'
              ? 'Standing hollow, arms in front, ears covered. Hands push through — wide fingers, thumbs slightly down, pinkies slightly up. Same finish as the seated pike with zombie arms.'
            : nextShapeId === 'pike_open_shoulders'
              ? 'Arms up by the ears, shoulders open. Legs together, knees straight, toes pointed. Pike–tuck–hollow–arch; rock back to candlestick; pike–tuck for arms behind the ears on a back tuck.'
              : nextShapeId === 'tuck_open_shoulders'
                ? 'From an open-shoulder pike: bend the knees, pull the feet in. Flex the feet, keep reaching arms behind the ears, slightly rounded hollow back. Pike–tuck–hollow–arch; lemon squeezes (hollow ↔ tuck). The torso rounds more on a back tuck or a tucked candle.'
          : ''
    const notes = addNotes.trim() || defaultNotes
    const item: HomeworkItem = {
      id: createId('hw'),
      athleteId,
      shapeId: nextShapeId,
      ...(typed ? { customLabel: typed } : {}),
      source: addSource,
      ...(Number.isFinite(target) && target > 0
        ? { targetSeconds: target }
        : {}),
      ...(notes ? { notes } : {}),
      createdAt: new Date().toISOString(),
    }
    setItems(addHomeworkItem(item))
    setAddNotes('')
    setAddTyped('')
    const shapeName = homeworkTitle(item)
    showFlash(
      `${addSource === 'coach' ? 'Coach added' : 'Athlete picked'}: ${shapeName}`,
    )
  }

  const removeItem = (item: HomeworkItem) => {
    if (item.source === 'auto') return
    removeHomeworkItem(item.id)
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    if (activeItemId === item.id) setActiveItemId(null)
    if (manualItemId === item.id) setManualItemId(null)
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
          Camera train starts the timer when you actually hit the shape. Voice stays
          quiet until a real miss. Or use the stopwatch and log that time (or type one).
        </p>
      </div>

      <div className="rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Stopwatch
        </p>
        <p className="mt-1 text-3xl font-black tabular-nums text-[var(--text)]">
          {formatSeconds(watchMs / 1000)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {!watchRunning ? (
            <button
              type="button"
              onClick={startWatch}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
            >
              Start
            </button>
          ) : (
            <button
              type="button"
              onClick={stopWatch}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={resetWatch}
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
          >
            Reset
          </button>
        </div>
        {watchOffer != null && watchOffer > 0 && (
          <div className="mt-3 space-y-2 border-t border-[var(--panel-border)] pt-2">
            <p className="text-sm text-[var(--text)]">
              Stopped at {formatSeconds(watchOffer)}. Log that time, or type a different one.
            </p>
            <select
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
              value={manualItemId ?? visibleItems[0]?.id ?? ''}
              onChange={(e) => setManualItemId(e.target.value)}
            >
              {visibleItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {homeworkTitle(i)}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0.1}
                step={0.1}
                className="w-28 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm tabular-nums"
                value={manualSeconds}
                onChange={(e) => setManualSeconds(e.target.value)}
                aria-label="Seconds to log"
              />
              <span className="text-xs text-[var(--muted)]">seconds</span>
              <button
                type="button"
                onClick={logWatchTime}
                className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-sm font-semibold text-white"
              >
                Log time
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active camera session */}
      {activeItem && activeShape && (
        <div className="rounded-lg border border-[var(--accent)]/40 bg-[#102820] p-3">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-[var(--text)]">
              Training: {activeShape.name}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {currentShapeId === activeShape.id
                ? sessionTiming
                  ? inShape
                    ? 'In the shape — clock is running'
                    : 'Camera on — clock starts when you hit the shape'
                  : 'Allow the camera if Safari asks'
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
                {formatSeconds(hold.totalHoldSeconds)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--muted)]">
                Proper hold (≥{standard})
              </p>
              <p className="text-lg font-semibold tabular-nums text-[var(--accent)]">
                {formatSeconds(properHoldSeconds)}
              </p>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
            <label className="flex items-center gap-1">
              Form standard
              <input
                type="number"
                min={0}
                max={100}
                className="w-14 rounded border border-[var(--panel-border)] bg-[#0d1218] px-1.5 py-0.5"
                value={standard}
                onChange={(e) => changeStandard(activeItem, e.target.value)}
                title="Score required to count proper-hold time (default 85)"
              />
            </label>
            <span>
              {breakdownCount === 0
                ? 'No form breaks yet'
                : `${breakdownCount} form break${breakdownCount === 1 ? '' : 's'} this session`}
            </span>
            {voiceEnabled && !speechSupported && (
              <span className="text-[var(--warn)]">voice unavailable</span>
            )}
            {!voiceEnabled && (
              <span>Voice tips off — enable “Voice” in the camera bar</span>
            )}
          </div>
          {activeItem.targetSeconds ? (
            <div className="mb-2">
              <div className="h-1.5 overflow-hidden rounded bg-[#0d1218]">
                <div
                  className="h-full rounded bg-[var(--accent)] transition-[width] duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (properHoldSeconds / activeItem.targetSeconds) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Target: {activeItem.targetSeconds}s proper hold
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
          {activeItem.source === 'auto' && activeItem.autoKey === 'hollow' ? (
            <HollowPairRefs
              photos={referencePhotos}
              unlockedUp={activeItem.shapeId === 'hollow_arms_up'}
            />
          ) : (
            <div className="mb-2 overflow-hidden rounded-md border border-[var(--panel-border)] bg-[#0d1218]">
              <CoachStillGallery
                shapeId={activeItem.shapeId}
                photos={referencePhotos}
                alt={activeShape.name}
                emptyLabel={`No coach still for ${activeShape.name} yet`}
                imgClass="max-h-48 w-full object-contain"
              />
              {activeShape.bodyPosition && (
                <p className="px-2 py-1.5 text-[11px] leading-snug text-[var(--text)]">
                  {activeShape.bodyPosition}
                </p>
              )}
            </div>
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
              onClick={resetSession}
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
        {visibleItems.map((item) => {
          const shape = getShape(item.shapeId)
          const itemLogs = logsByItem.get(item.id) ?? []
          const properValues = itemLogs
            .map((l) => logProperHoldSeconds(l))
            .filter((v): v is number => v !== null)
          const bestProper = properValues.reduce((b, v) => Math.max(b, v), 0)
          const badge = sourceBadge(item.source)
          const isHollowAuto = item.source === 'auto' && item.autoKey === 'hollow'
          const hollowStage1 = isHollowAuto && item.shapeId === 'hollow_arms_down'
          const readyToLevelUp =
            hollowStage1 && bestProper >= HOLLOW_PROGRESS_TARGET_SECONDS
          const isPlank = item.shapeId === 'side_plank'
          const bestSide = (side: 'left' | 'right') =>
            itemLogs
              .filter((l) => l.side === side)
              .map((l) => logProperHoldSeconds(l))
              .filter((v): v is number => v !== null)
              .reduce((b, v) => Math.max(b, v), 0)
          const bestLeft = isPlank ? bestSide('left') : 0
          const bestRight = isPlank ? bestSide('right') : 0
          const trendValues = itemLogs
            .filter((l) => logProperHoldSeconds(l) !== null)
            .slice(0, 10)
            .reverse()
            .map((l) => logProperHoldSeconds(l) ?? 0)
          const manualOpen = manualItemId === item.id
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
                    {homeworkTitle(item)}
                  </span>
                  {item.targetSeconds ? (
                    <span className="text-[11px] text-[var(--muted)]">
                      goal {item.targetSeconds}s
                    </span>
                  ) : null}
                  <span
                    className="text-[11px] text-[var(--muted)]"
                    title="Form standard for proper-hold time"
                  >
                    form ≥{formStandardFor(item)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!isCustomHomework(item) && <button
                    type="button"
                    onClick={() => startItem(item)}
                    className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-semibold text-white"
                    title="Camera session with live form scoring (recommended)"
                  >
                    Train
                  </button>}
                  <button
                    type="button"
                    onClick={() => openManual(item)}
                    className="rounded-lg border border-[var(--panel-border)] px-2 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    title="No camera? Type a hold time instead"
                  >
                    Log manually
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

              {!isHollowAuto && pickCoachStill(referencePhotos, item.shapeId) && (
                <div className="mt-2 overflow-hidden rounded-md bg-[#0d1218]">
                  <CoachStillGallery
                    shapeId={item.shapeId}
                    photos={referencePhotos}
                    alt={shape?.name ?? item.shapeId}
                    imgClass="max-h-24 w-full object-contain"
                  />
                </div>
              )}

              {/* Manual log form (secondary flow) */}
              {manualOpen && (
                <div className="mt-2 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] p-2">
                  <p className="mb-1.5 text-[11px] text-[var(--muted)]">
                    Manual entry — no form check, only total time. Use the
                    camera when you can for proper-hold tracking.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <label className="flex items-center gap-1 text-[var(--muted)]">
                      held
                      <input
                        type="number"
                        min={0}
                        step="1"
                        autoFocus
                        className="w-16 rounded border border-[var(--panel-border)] bg-[#121820] px-1.5 py-1"
                        placeholder="sec"
                        value={manualSeconds}
                        onChange={(e) => setManualSeconds(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') logManual(item)
                        }}
                      />
                      s
                    </label>
                    <label className="flex items-center gap-1 text-[var(--muted)]">
                      on
                      <input
                        type="date"
                        className="rounded border border-[var(--panel-border)] bg-[#121820] px-1.5 py-1"
                        value={manualDate}
                        max={todayInputValue()}
                        onChange={(e) => setManualDate(e.target.value)}
                      />
                    </label>
                    {isPlank && (
                      <select
                        className="rounded border border-[var(--panel-border)] bg-[#121820] px-1.5 py-1"
                        value={manualSide}
                        onChange={(e) =>
                          setManualSide(e.target.value as PlankSide)
                        }
                      >
                        <option value="left">left</option>
                        <option value="right">right</option>
                        <option value="both">both</option>
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => logManual(item)}
                      className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 font-semibold text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualItemId(null)}
                      className="text-[var(--muted)] underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Hollow progression state */}
              {isHollowAuto && (
                <div className="mt-2">
                  <HollowPairRefs photos={referencePhotos} unlockedUp={!hollowStage1} />
                  {hollowStage1 ? (
                    <>
                      <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                        <span>
                          Stage 1 of 2 — arms down · best proper hold{' '}
                          <span className="text-[var(--text)]">
                            {formatSeconds(bestProper)}
                          </span>{' '}
                          / {HOLLOW_PROGRESS_TARGET_SECONDS}s to level up
                          (camera-verified)
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded bg-[#0d1218]">
                        <div
                          className="h-full rounded bg-[var(--warn)]"
                          style={{
                            width: `${Math.min(
                              100,
                              (bestProper / HOLLOW_PROGRESS_TARGET_SECONDS) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                      {readyToLevelUp && (
                        <div className="mt-2 rounded-lg border border-[var(--warn)]/60 bg-[#2a2312] p-2">
                          <p className="text-sm font-semibold text-[var(--warn)]">
                            🎉 Level up: Hollow (arms up)
                          </p>
                          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                            Best proper hold hit{' '}
                            {HOLLOW_PROGRESS_TARGET_SECONDS}s with arms down.
                            Switch this drill to Hollow (arms up). Do not skip
                            the arms-down minute. History is kept.
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

              {/* Progress over time (proper hold) */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--panel-border)] pt-2 text-xs text-[var(--muted)]">
                <div>
                  <span className="text-[10px] uppercase">Best proper </span>
                  <span className="font-semibold text-[var(--accent)]">
                    {formatSeconds(bestProper)}
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
                  {itemLogs.slice(0, 5).map((l) => {
                    const proper = logProperHoldSeconds(l)
                    const isManual = l.method === 'manual'
                    return (
                      <li key={l.id} className="text-[11px] text-[var(--muted)]">
                        <div className="flex justify-between gap-2">
                          <span>
                            {new Date(l.date).toLocaleString()}
                            {l.side ? ` · ${l.side === 'left' ? 'L' : 'R'}` : ''}
                            {isManual && (
                              <span className="ml-1.5 rounded bg-[#2c3a52] px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--text)]">
                                manual
                              </span>
                            )}
                          </span>
                          <span className="text-[var(--text)]">
                            {isManual
                              ? `${formatSeconds(l.totalHoldSeconds)} total`
                              : `${l.score} · P ${formatSeconds(proper ?? 0)} / ${formatSeconds(l.totalHoldSeconds)}`}
                          </span>
                        </div>
                        {l.breakdowns && l.breakdowns.length > 0 && (
                          <details className="ml-2">
                            <summary className="cursor-pointer text-[10px] text-[var(--warn)]">
                              {l.breakdowns.length} form break
                              {l.breakdowns.length === 1 ? '' : 's'}
                            </summary>
                            <ul className="ml-2 mt-0.5 space-y-px">
                              {l.breakdowns.map((b, i) => (
                                <li key={i} className="text-[10px]">
                                  <span className="tabular-nums text-[var(--text)]">
                                    {formatSeconds(b.atSeconds)}
                                  </span>{' '}
                                  — {b.criterionLabel}
                                  {b.feedback ? `: ${b.feedback}` : ''}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </li>
                    )
                  })}
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
            <option value="">Pick a shape…</option>
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
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
          placeholder="Or type a skill / drill instead of picking a shape"
          value={addTyped}
          onChange={(e) => setAddTyped(e.target.value)}
        />
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
