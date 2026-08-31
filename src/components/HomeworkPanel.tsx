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

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { SEQUENCES } from '../config/sequences'
import { allLibraryShapes, getShape } from '../config/shapes'
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
  subscribeHomework,
  updateHomeworkItem,
} from '../lib/storage'
import { syncRosterWithServer } from '../lib/rosterSync'
import { homeworkLooksReady } from '../lib/homeworkPose'
import {
  customHomeworkShapeId,
  drillHomeworkShapeId,
  getHomeworkDrill,
  getHomeworkSequence,
  homeworkTitle,
  isCustomHomework,
  isDrillHomework,
  isSequenceHomework,
  sequenceHomeworkShapeId,
} from '../lib/homeworkLabel'
import { CollapsibleSection } from './CollapsibleSection'
import { HoldProperTimes } from './HoldProperTimes'
import { pickCoachStill } from '../lib/shippedRefs'
import { listPublicDrills, subscribeCoachContent } from '../lib/coachContentStore'
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

function lastHoldSeconds(
  logs: HomeworkLog[],
  side?: 'left' | 'right',
): number | null {
  const pool = side ? logs.filter((l) => l.side === side) : logs
  return pool[0]?.totalHoldSeconds ?? null
}

function bestHoldSeconds(logs: HomeworkLog[], side?: 'left' | 'right'): number {
  const pool = side ? logs.filter((l) => l.side === side) : logs
  return pool.reduce((best, log) => Math.max(best, log.totalHoldSeconds), 0)
}

function beatNote(seconds: number, last: number | null): string {
  if (last == null) return ' — first logged hold for this drill'
  if (seconds > last) return ` — beat last time (${formatSeconds(last)})`
  if (seconds === last) return ' — matched last time'
  return ` — last time was ${formatSeconds(last)}`
}

function TimeToBeatBanner({
  seconds,
  sideLabel,
}: {
  seconds: number | null
  sideLabel?: string
}) {
  if (seconds == null) {
    return (
      <p className="rounded-md bg-[#1a2218] px-2.5 py-2 text-xs text-[var(--muted)]">
        First hold on this drill — this time becomes the mark to beat.
      </p>
    )
  }
  return (
    <div className="rounded-md border border-[var(--warn)]/45 bg-[#2a2312] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--warn)]">
        Time to beat{sideLabel ? ` · ${sideLabel}` : ''}
      </p>
      <p className="text-2xl font-black tabular-nums leading-tight text-[var(--warn)]">
        {formatSeconds(seconds)}
      </p>
      <p className="text-[11px] text-[var(--muted)]">from last time</p>
    </div>
  )
}

function HomeworkProgressStrip({
  items,
  logsByItem,
}: {
  items: HomeworkItem[]
  logsByItem: Map<string, HomeworkLog[]>
}) {
  const trained = items.filter((item) => (logsByItem.get(item.id) ?? []).length > 0)
  const totalLogs = items.reduce(
    (count, item) => count + (logsByItem.get(item.id) ?? []).length,
    0,
  )
  let bestJump: { name: string; delta: number } | null = null
  for (const item of items) {
    const itemLogs = logsByItem.get(item.id) ?? []
    if (itemLogs.length < 2) continue
    const first = itemLogs[itemLogs.length - 1]?.totalHoldSeconds ?? 0
    const best = bestHoldSeconds(itemLogs)
    const delta = best - first
    if (delta > 0.4 && (!bestJump || delta > bestJump.delta)) {
      bestJump = { name: homeworkTitle(item), delta }
    }
  }
  const goalHits = items.filter((item) => {
    if (!item.targetSeconds) return false
    return bestHoldSeconds(logsByItem.get(item.id) ?? []) >= item.targetSeconds
  })

  const headline =
    trained.length === 0
      ? 'Your first logged hold starts the story. Tap Train and put time on the mat.'
      : bestJump
        ? `${bestJump.name} is up ${formatSeconds(bestJump.delta)} from your first hold. That is real progress.`
        : `${trained.length} drill${trained.length === 1 ? '' : 's'} with logged time. Keep stacking holds.`

  return (
    <div className="rounded-lg border border-[var(--good)]/40 bg-[#102820] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--good)]">
        Your progress
      </p>
      <p className="mt-1 text-sm font-medium leading-snug text-[var(--text)]">{headline}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {trained.length} of {items.length} drill{items.length === 1 ? '' : 's'} logged
        {totalLogs > 0 ? ` · ${totalLogs} hold${totalLogs === 1 ? '' : 's'}` : ''}
        {goalHits.length > 0
          ? ` · ${goalHits.length} at goal`
          : ''}
      </p>
    </div>
  )
}

function HoldTimesBoard({
  logs,
  isPlank,
}: {
  logs: HomeworkLog[]
  isPlank: boolean
}) {
  const last = lastHoldSeconds(logs)
  const best = bestHoldSeconds(logs)
  const bestLeft = isPlank ? bestHoldSeconds(logs, 'left') : 0
  const bestRight = isPlank ? bestHoldSeconds(logs, 'right') : 0
  const lastLeft = isPlank ? lastHoldSeconds(logs, 'left') : null
  const lastRight = isPlank ? lastHoldSeconds(logs, 'right') : null

  return (
    <div className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[#0d1614] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Your hold times
      </p>
      {logs.length === 0 ? (
        <p className="mt-1 text-sm text-[var(--muted)]">
          Nothing logged yet. After you log a hold, it shows here with a time to
          beat for next time.
        </p>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                Time to beat
              </p>
              <p className="text-2xl font-black tabular-nums text-[var(--warn)]">
                {formatSeconds(last ?? 0)}
              </p>
              <p className="text-[11px] text-[var(--muted)]">Last session</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                Best
              </p>
              <p className="text-2xl font-black tabular-nums text-[var(--accent)]">
                {formatSeconds(best)}
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                {logs.length} session{logs.length === 1 ? '' : 's'}
              </p>
            </div>
            {isPlank && (
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  Left · Right
                </p>
                <p className="text-sm font-semibold tabular-nums text-[var(--text)]">
                  Best {formatSeconds(bestLeft)} · {formatSeconds(bestRight)}
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  Beat {lastLeft != null ? formatSeconds(lastLeft) : '—'} ·{' '}
                  {lastRight != null ? formatSeconds(lastRight) : '—'}
                </p>
              </div>
            )}
          </div>
          <ul className="mt-3 divide-y divide-[var(--panel-border)] border-t border-[var(--panel-border)]">
            {logs.slice(0, 8).map((log) => {
              const proper = logProperHoldSeconds(log)
              const isManual = log.method === 'manual'
              return (
                <li key={log.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                  <span className="text-[12px] text-[var(--muted)]">
                    {new Date(log.date).toLocaleString()}
                    {log.side ? ` · ${log.side === 'left' ? 'L' : 'R'}` : ''}
                    {log.loggedFrom === 'lesson' && (
                      <span className="ml-1.5 rounded bg-[#1a2a22] px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                        {log.coachName
                          ? `lesson with ${log.coachName}`
                          : 'lesson'}
                      </span>
                    )}
                    {isManual && (
                      <span className="ml-1.5 rounded bg-[#2c3a52] px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--text)]">
                        stopwatch
                      </span>
                    )}
                  </span>
                  <HoldProperTimes
                    total={log.totalHoldSeconds}
                    proper={!isManual ? proper : null}
                  />
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
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

function DrillHomeworkCard({ item }: { item: HomeworkItem }) {
  const drill = getHomeworkDrill(item)
  if (!drill) return null
  return (
    <div className="mt-2 rounded-md bg-[#0d1218] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Drill
      </p>
      {drill.shapeId && (
        <p className="mt-0.5 text-[11px] text-[var(--muted)]">
          Train scores {getShape(drill.shapeId)?.name ?? drill.shapeId}.
        </p>
      )}
      {drill.src && (
        <video className="mt-2 max-h-48 w-full rounded-md" src={drill.src} controls playsInline />
      )}
    </div>
  )
}

function SequenceHomeworkSteps({ item }: { item: HomeworkItem }) {
  const seq = getHomeworkSequence(item)
  if (!seq) return null
  const trainShape = seq.steps.find((step) => getShape(step.shapeId))
  return (
    <div className="mt-2 rounded-md bg-[#0d1218] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Sequence steps
      </p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[11px] text-[var(--text)]">
        {seq.steps.map((step, i) => (
          <li key={`${step.shapeId}-${i}`}>
            {getShape(step.shapeId)?.name ?? step.shapeId}
            {step.holdSeconds ? (
              <span className="text-[var(--muted)]"> · {step.holdSeconds}s</span>
            ) : null}
          </li>
        ))}
      </ol>
      {trainShape && (
        <p className="mt-1.5 text-[11px] text-[var(--muted)]">
          Train scores the first camera-ready step:{' '}
          {getShape(trainShape.shapeId)?.name ?? trainShape.shapeId}.
        </p>
      )}
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
  const [addShapeId, setAddShapeId] = useState('')
  const [addSequenceId, setAddSequenceId] = useState('')
  const [addDrillId, setAddDrillId] = useState('')
  const [libTick, setLibTick] = useState(0)
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
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
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

  // Load (and auto-seed) homework whenever the athlete changes, and again
  // when a coach assigns a drill or the gym roster syncs in.
  useEffect(() => {
    if (!athleteId) {
      setItems([])
      setLogs([])
      setActiveItemId(null)
      setManualItemId(null)
      return
    }
    const reload = () => {
      setItems(ensureAutoHomework(athleteId))
      setLogs(loadHomeworkLogs(athleteId))
    }
    reload()
    void syncRosterWithServer().then(reload)
    const unsub = subscribeHomework(reload)
    const onApplied = () => reload()
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void syncRosterWithServer().then(reload)
      }
    }
    window.addEventListener('shape-lab-roster-applied', onApplied)
    document.addEventListener('visibilitychange', onVisible)
    const unsubLib = subscribeCoachContent(() => setLibTick((n) => n + 1))
    return () => {
      unsub()
      unsubLib()
      window.removeEventListener('shape-lab-roster-applied', onApplied)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [athleteId])

  const libraryShapes = useMemo(
    () => allLibraryShapes().slice().sort((a, b) => a.name.localeCompare(b.name)),
    [libTick],
  )
  const visibleItems = useMemo(() => dedupeHomeworkItems(items), [items])
  const fromCoach = useMemo(
    () => visibleItems.filter((item) => item.source === 'coach'),
    [visibleItems],
  )
  const otherDrills = useMemo(
    () => visibleItems.filter((item) => item.source !== 'coach'),
    [visibleItems],
  )

  const watchLogItem =
    visibleItems.find((item) => item.id === manualItemId) ?? visibleItems[0] ?? null

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
  const activeSequence = activeItem ? getHomeworkSequence(activeItem) : undefined
  const activeDrill = activeItem ? getHomeworkDrill(activeItem) : undefined
  const activeCameraShapeId =
    activeSequence?.steps.find((step) => getShape(step.shapeId))?.shapeId ??
    (activeDrill?.shapeId && getShape(activeDrill.shapeId) ? activeDrill.shapeId : undefined) ??
    activeItem?.shapeId ??
    ''
  const activeShape = activeCameraShapeId ? getShape(activeCameraShapeId) : undefined
  const standard = activeItem ? formStandardFor(activeItem) : DEFAULT_FORM_STANDARD

  // Session timers: total vs proper (≥ form standard), independent of the
  // global quality threshold used elsewhere in the app.
  const sessionTiming =
    timingActive &&
    activeItem !== null &&
    Boolean(activeCameraShapeId) &&
    currentShapeId === activeCameraShapeId
  const inShape =
    Boolean(activeItem) &&
    homeworkLooksReady(activeCameraShapeId || activeItem!.shapeId, landmarks, score.overall)
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

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startItem = (item: HomeworkItem) => {
    setOpenIds((prev) => new Set(prev).add(item.id))
    setActiveItemId(item.id)
    setManualItemId(null)
    const seq = getHomeworkSequence(item)
    const drill = getHomeworkDrill(item)
    const cameraId =
      seq?.steps.find((step) => getShape(step.shapeId))?.shapeId ??
      (drill?.shapeId && getShape(drill.shapeId) ? drill.shapeId : undefined) ??
      item.shapeId
    onRequestShape(cameraId, 'auto', { profileOk: true })
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
    const prior = lastHoldSeconds(
      (logsByItem.get(activeItem.id) ?? []).filter((row) => row.id !== log.id),
      isPlank && plankSide !== 'both' ? plankSide : undefined,
    )
    showFlash(
      `Logged ${shapeName} — ${formatSeconds(log.totalHoldSeconds)}${beatNote(log.totalHoldSeconds, prior)}`,
    )
  }

  const openManual = (item: HomeworkItem) => {
    setOpenIds((prev) => new Set(prev).add(item.id))
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
    const prior = lastHoldSeconds(
      (logsByItem.get(item.id) ?? []).filter((row) => row.id !== log.id),
      isPlank && manualSide !== 'both' ? manualSide : undefined,
    )
    const shapeName = homeworkTitle(item)
    showFlash(`Logged ${shapeName} — ${formatSeconds(secs)}${beatNote(secs, prior)}`)
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
    const seq = SEQUENCES.find((s) => s.id === addSequenceId)
    const drill = listPublicDrills().find((d) => d.id === addDrillId)
    if (!typed && !addShapeId && !seq && !drill) return
    const nextShapeId = drill
      ? drillHomeworkShapeId(drill.id)
      : seq
        ? sequenceHomeworkShapeId(seq.id)
        : typed
          ? customHomeworkShapeId(typed)
          : addShapeId
    const probe = {
      athleteId,
      shapeId: nextShapeId,
      customLabel: drill ? drill.title : seq ? seq.name : typed || undefined,
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
                : nextShapeId === 'tucked_candle'
                  ? 'Same tuck, rolled back so the weight is on the shoulders and arms — like a candlestick, but tucked. Arms behind the ears, round back, hips over, middle of the thighs in front of the eyes. Space between chin and chest is fine. Shins toward the wall keeps heels off the butt; tighter knees speed rotation — work both. Rolls and back-tuck drills.'
                  : nextShapeId === 'candlestick'
                    ? 'Do not pause. FTOS, bend to C, sit and fall to tuck, roll back and arch for the candle. Toes stay above you — not past the face. If a coach lifts the feet on an arch, that is a good candle.'
          : ''
    const notes =
      addNotes.trim() ||
      (drill ? drill.notes : seq ? seq.description : defaultNotes)
    const item: HomeworkItem = {
      id: createId('hw'),
      athleteId,
      shapeId: nextShapeId,
      ...(drill
        ? { customLabel: drill.title }
        : seq
          ? { customLabel: seq.name }
          : typed
            ? { customLabel: typed }
            : {}),
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
    setAddSequenceId('')
    setAddDrillId('')
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
          Track your hold time and measure your progress!
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Camera train starts the timer when you actually hit the shape. Voice stays
          quiet until a real miss. Or use the stopwatch and log that time (or type one).
        </p>
        <p className="mt-2 rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm leading-snug text-[var(--text)]">
          Tap <strong>Train</strong> on a drill, allow the camera, and point it at
          yourself. The clock starts when you hit the shape. Hold is the whole time;
          proper is only the seconds at form standard.
        </p>
      </div>

      <HomeworkProgressStrip items={visibleItems} logsByItem={logsByItem} />

      <div className="rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Stopwatch
        </p>
        <p className="mt-1 text-3xl font-black tabular-nums text-[var(--text)]">
          {formatSeconds(watchMs / 1000)}
        </p>
        {watchLogItem && (
          <div className="mt-2">
            <TimeToBeatBanner
              seconds={lastHoldSeconds(logsByItem.get(watchLogItem.id) ?? [])}
              sideLabel={homeworkTitle(watchLogItem)}
            />
          </div>
        )}
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
          <div className="mb-2">
            <TimeToBeatBanner
              seconds={lastHoldSeconds(
                logsByItem.get(activeItem.id) ?? [],
                activeItem.shapeId === 'side_plank' && plankSide !== 'both'
                  ? plankSide
                  : undefined,
              )}
              sideLabel={
                activeItem.shapeId === 'side_plank' && plankSide !== 'both'
                  ? plankSide
                  : undefined
              }
            />
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
            </div>
          )}
          {(activeShape.bodyPosition || score.criteria.length > 0) && (
            <div className="mb-2">
              <CollapsibleSection
                inset
                title="What we grade"
                hint="Body position and form criteria"
              >
                {activeShape.bodyPosition && (
                  <p className="text-sm leading-relaxed">{activeShape.bodyPosition}</p>
                )}
                {score.criteria.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {score.criteria
                      .filter((c) => !c.id.startsWith('_'))
                      .map((c) => (
                        <li
                          key={c.id}
                          className="flex items-baseline justify-between gap-2 text-sm"
                        >
                          <span>{c.label}</span>
                          <span className="tabular-nums font-semibold">{c.score}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </CollapsibleSection>
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

      {/* Homework items — coach assignments first so the athlete sees them */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {fromCoach.length > 0 ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                From your coach
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Assigned for you. Open a drill only when you want the details.
              </p>
            </>
          ) : (
            <p className="text-xs text-[var(--muted)]">
              Open a drill only when you want the details.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpenIds(new Set(visibleItems.map((item) => item.id)))}
            className="text-xs text-[var(--muted)] underline"
          >
            Open all
          </button>
          <button
            type="button"
            onClick={() => setOpenIds(new Set())}
            className="text-xs text-[var(--muted)] underline"
          >
            Close all
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {(fromCoach.length > 0 ? [...fromCoach, ...otherDrills] : visibleItems).map((item) => {
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
          const lastBeat = lastHoldSeconds(itemLogs)
          const trendValues = itemLogs
            .filter((l) => logProperHoldSeconds(l) !== null)
            .slice(0, 10)
            .reverse()
            .map((l) => logProperHoldSeconds(l) ?? 0)
          const manualOpen = manualItemId === item.id
          const detailsOpen =
            openIds.has(item.id) || activeItemId === item.id || manualOpen
          const best = bestHoldSeconds(itemLogs)
          return (
            <Fragment key={item.id}>
            {fromCoach.length > 0 && item.id === otherDrills[0]?.id && (
              <p className="pt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Core drills
              </p>
            )}
            <div
              className={`rounded-lg border p-2.5 ${
                activeItemId === item.id
                  ? 'border-[var(--accent)]/50 bg-[#121f1a]'
                  : 'border-[var(--panel-border)] bg-[#121820]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={detailsOpen}
                  onClick={() => toggleOpen(item.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                  <span className="truncate font-medium text-[var(--text)]">
                    {homeworkTitle(item)}
                  </span>
                  {isSequenceHomework(item) && (
                    <span className="rounded bg-[#2c3a52] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text)]">
                      sequence
                    </span>
                  )}
                  {isDrillHomework(item) && (
                    <span className="rounded bg-[#2c3a52] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text)]">
                      drill
                    </span>
                  )}
                  {best > 0 && (
                    <span className="hidden text-[11px] tabular-nums text-[var(--accent)] sm:inline">
                      best {formatSeconds(best)}
                    </span>
                  )}
                  {lastBeat != null && (
                    <span className="rounded bg-[#2a2312] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--warn)]">
                      beat {formatSeconds(lastBeat)}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-xs font-semibold text-[var(--muted)]">
                    {detailsOpen ? 'Hide' : 'Show'}
                  </span>
                </button>
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
                    Log
                  </button>
                </div>
              </div>

              {detailsOpen && (
              <>
              <HoldTimesBoard logs={itemLogs} isPlank={isPlank} />
              {trendValues.length >= 2 && (
                <div className="mt-1 flex justify-end">
                  <Sparkline values={trendValues} target={item.targetSeconds} />
                </div>
              )}

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
                  <div className="mb-2">
                    <TimeToBeatBanner
                      seconds={lastBeat}
                      sideLabel={
                        isPlank && manualSide !== 'both' ? manualSide : undefined
                      }
                    />
                  </div>
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

              {isSequenceHomework(item) && (
                <SequenceHomeworkSteps item={item} />
              )}
              {isDrillHomework(item) && <DrillHomeworkCard item={item} />}
              {item.notes && (
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {item.notes}
                </p>
              )}
              {item.source !== 'auto' && (
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  className="mt-2 text-xs text-[var(--bad)] underline"
                >
                  Remove
                </button>
              )}
              </>
              )}
            </div>
            </Fragment>
          )
        })}
      </div>

      <CollapsibleSection inset title="Add homework" hint="Coach or athlete can add another drill">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5"
            value={addShapeId}
            onChange={(e) => {
              setAddShapeId(e.target.value)
              if (e.target.value) {
                setAddSequenceId('')
                setAddDrillId('')
              }
            }}
          >
            <option value="">Pick a shape…</option>
            {libraryShapes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5"
            value={addSequenceId}
            onChange={(e) => {
              setAddSequenceId(e.target.value)
              if (e.target.value) {
                setAddShapeId('')
                setAddDrillId('')
              }
            }}
          >
            <option value="">Or a sequence…</option>
            {SEQUENCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5"
            value={addDrillId}
            onChange={(e) => {
              setAddDrillId(e.target.value)
              if (e.target.value) {
                setAddShapeId('')
                setAddSequenceId('')
              }
            }}
          >
            <option value="">Or a drill…</option>
            {listPublicDrills().map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
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
      </CollapsibleSection>

      {flash && (
        <p className="rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          {flash}
        </p>
      )}
    </div>
  )
}
