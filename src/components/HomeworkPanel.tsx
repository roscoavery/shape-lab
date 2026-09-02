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

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { allLibraryShapes, getShape } from '../config/shapes'
import {
  catalogShapeId,
  getCatalogItem,
  needsWristPrep,
} from '../config/homeworkCatalog'
import { isPhoneBrowser } from '../lib/delayCameraPipeline'
import { isCoachProfile, profileRole } from '../lib/profileRole'
import { canSeePrivateCoaching, worksWithCoachIds } from '../lib/coachLink'
import { HomeworkLogReactions } from './homework/HomeworkLogReactions'
import { CoachPicker } from './CoachPicker'
import {
  addCoachExercise,
  addInjuryEntry,
  addPainJournalEntry,
  loadCoachExercises,
  loadInjuryLogs,
  loadPainJournal,
  removeCoachExercise,
} from '../lib/careStore'
import { FormStandardField } from './homework/FormStandardField'
import { TrainPicker } from './homework/TrainPicker'
import { WristPrepNotice } from './homework/WristPrepNotice'
import { RepSession } from './homework/RepSession'
import { CarePanel } from './homework/CarePanel'
import { AddHomeworkForm, type HomeworkPick } from './homework/AddHomeworkForm'
import { alreadyHasCatalog, catalogIdsForBackPain, shouldEncourageSlowReps } from '../lib/backCare'
import { buildHomeworkItem } from '../lib/homeworkAssign'
import { formatSeconds, useHoldTimer } from '../hooks/useHoldTimer'
import { useSpeechCoach } from '../hooks/useSpeechCoach'
import { CoachStillGallery, ReferenceStill } from './ReferenceStill'
import {
  DEFAULT_FORM_STANDARD,
  HOLLOW_PROGRESS_TARGET_SECONDS,
  addHomeworkItem,
  addHomeworkLog,
  removeHomeworkLog,
  createId,
  flowHistoryForSequence,
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
  getHomeworkDrill,
  flowIdForHomeworkItem,
  getHomeworkSequence,
  homeworkTitle,
  homeworkTrackMode,
  isCatalogHomework,
  isCustomHomework,
  isDrillHomework,
  isSequenceHomework,
} from '../lib/homeworkLabel'
import { getHomeworkFlow, overallFlowScore } from '../lib/homeworkFlow'
import { CollapsibleSection } from './CollapsibleSection'
import { AthleteName } from './AthleteAvatar'
import { ExpandableNotes } from './ExpandableNotes'
import { HoldProperTimes } from './HoldProperTimes'
import { PortraitVideoPlayer } from './PortraitVideoPlayer'
import { pickCoachStill } from '../lib/shippedRefs'
import { subscribeCoachContent } from '../lib/coachContentStore'
import type {
  Athlete,
  CoachExercise,
  HomeworkBreakdown,
  HomeworkItem,
  HomeworkLog,
  HomeworkSource,
  HomeworkTrackMode,
  InjuryEntry,
  Landmark,
  PainJournalEntry,
  ReferencePhoto,
  ScoreResult,
} from '../types'

type PlankSide = 'left' | 'right' | 'both'

type Props = {
  athleteId: string | null
  athlete?: Athlete | null
  /** Signed-in profile. Parents log onto their linked athlete. */
  viewer?: Athlete | null
  athletes?: Athlete[]
  onUpdateAthlete?: (patch: Partial<Athlete>) => void
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
  /** Practice camera + score, shown only while a train studio is open. */
  camSlot?: ReactNode
  onStudioChange?: (open: boolean) => void
  /** Sequence homework opens Practice → Class flows on that assigned task. */
  onOpenClassFlow?: (flowId: string) => void
  openPage?: 'train' | 'add' | 'care' | null
  onOpenPageConsumed?: () => void
}

function sourceBadge(source: HomeworkSource): { label: string; cls: string } {
  switch (source) {
    case 'auto':
      return { label: 'Auto', cls: 'bg-[var(--accent-dim)] text-white' }
    case 'coach':
      return { label: 'Coach', cls: 'bg-[#2c3a52] text-[var(--text)]' }
    case 'athlete':
      return { label: 'Athlete', cls: 'bg-[#233043] text-[var(--muted)]' }
    case 'parent':
      return { label: 'Parent', cls: 'bg-[#3a2c1a] text-[#f0d9a8]' }
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
  onRemove,
  athlete,
  viewer,
  athletes,
  onLogsChange,
}: {
  logs: HomeworkLog[]
  isPlank: boolean
  onRemove?: (id: string) => void
  athlete?: Athlete | null
  viewer?: Athlete | null
  athletes?: Athlete[]
  onLogsChange?: () => void
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
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
                <li key={log.id} className="py-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[12px] text-[var(--muted)]">
                    {new Date(log.date).toLocaleString()}
                    {log.side ? ` · ${log.side === 'left' ? 'L' : 'R'}` : ''}
                    {log.reps
                      ? ` · ${log.reps} rep${log.reps === 1 ? '' : 's'}${
                          log.qualityReps != null ? ` (${log.qualityReps} quality)` : ''
                        }`
                      : ''}
                    {log.loggedFrom === 'lesson' && (
                      <span className="ml-1.5 rounded bg-[#1a2a22] px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                        {log.coachName
                          ? `lesson with ${log.coachName}`
                          : 'lesson'}
                      </span>
                    )}
                    {log.loggedFrom === 'class' && (
                      <span className="ml-1.5 rounded bg-[#1a2a22] px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                        {log.sourceLabel ?? 'in class'}
                      </span>
                    )}
                    {log.kind === 'journal' && log.journal && (
                      <span className="ml-1.5 text-[var(--text)]">{log.journal}</span>
                    )}
                    {isManual && (
                      <span className="ml-1.5 rounded bg-[#2c3a52] px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--text)]">
                        logged
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <HoldProperTimes
                      total={log.totalHoldSeconds}
                      proper={!isManual ? proper : null}
                    />
                    {onRemove &&
                      (confirmId === log.id ? (
                        <span className="flex gap-1">
                          <button
                            type="button"
                            className="rounded bg-[var(--bad)] px-2 py-0.5 text-[10px] font-semibold text-white"
                            onClick={() => {
                              onRemove(log.id)
                              setConfirmId(null)
                            }}
                          >
                            Are you sure?
                          </button>
                          <button
                            type="button"
                            className="text-[10px] text-[var(--muted)] underline"
                            onClick={() => setConfirmId(null)}
                          >
                            Keep
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-[10px] text-[var(--muted)] underline"
                          onClick={() => setConfirmId(log.id)}
                        >
                          Remove
                        </button>
                      ))}
                  </span>
                  </div>
                  <HomeworkLogReactions
                    log={log}
                    athletes={athletes ?? []}
                    viewer={viewer ?? null}
                    canReact={Boolean(
                      viewer &&
                        athlete &&
                        isCoachProfile(viewer) &&
                        canSeePrivateCoaching(viewer, athlete),
                    )}
                    onChanged={onLogsChange}
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
        <div className="mt-2">
          <PortraitVideoPlayer src={drill.src} title={drill.title} size="embed" />
        </div>
      )}
    </div>
  )
}

function SequenceHomeworkSteps({
  item,
  times,
  lastScore,
}: {
  item: HomeworkItem
  times: number
  lastScore: number | null
}) {
  const flow = getHomeworkFlow(item)
  const seq = getHomeworkSequence(item)
  if (!flow && !seq) return null
  return (
    <div className="mt-2 rounded-md bg-[#0d1218] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Class flow
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--text)]">
        {flow?.description ?? seq?.description}
      </p>
      {flow ? (
        <p className="mt-1.5 text-[11px] text-[var(--muted)]">
          {flow.previewShapes.map((s) => s.label).join(' → ')}
          {flow.setupSpeak ? ` · ${flow.setupSpeak}` : ''}
        </p>
      ) : (
        <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[11px] text-[var(--text)]">
          {seq!.steps.map((step, i) => (
            <li key={`${step.shapeId}-${i}`}>
              {getShape(step.shapeId)?.name ?? step.shapeId}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-[12px] font-semibold tabular-nums text-[var(--accent)]">
        {times} run{times === 1 ? '' : 's'}
        {lastScore != null ? ` · last score ${lastScore}` : ''}
      </p>
    </div>
  )
}

function HwOverlay({
  eyebrow,
  title,
  onDone,
  children,
  wide = false,
}: {
  eyebrow: string
  title: string
  onDone: () => void
  children: ReactNode
  wide?: boolean
}) {
  return createPortal(
    <div className="fixed inset-0 z-[240] flex h-[100dvh] w-screen flex-col bg-[#0b0f14]">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 pb-2 pt-[max(0.7rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full bg-white/12 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
        >
          Done
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6ee7f0]/85">
            {eyebrow}
          </p>
          <p className="truncate text-sm text-white/65">{title}</p>
        </div>
      </header>
      <div className={`min-h-0 flex-1 ${wide ? 'overflow-hidden px-3 py-3' : 'overflow-y-auto px-3 py-3'}`}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function HomeworkPanel({
  athleteId,
  athlete = null,
  viewer = null,
  athletes = [],
  onUpdateAthlete,
  score,
  currentShapeId,
  onRequestShape,
  timingActive,
  voiceEnabled,
  referencePhotos,
  landmarks = null,
  onEnsureCamera,
  camSlot = null,
  onStudioChange,
  onOpenClassFlow,
  openPage = null,
  onOpenPageConsumed,
}: Props) {
  const [items, setItems] = useState<HomeworkItem[]>([])
  const [logs, setLogs] = useState<HomeworkLog[]>([])
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [plankSide, setPlankSide] = useState<PlankSide>('left')
  const [flash, setFlash] = useState<string | null>(null)
  const [libTick, setLibTick] = useState(0)
  const [addSource, setAddSource] = useState<'coach' | 'athlete' | 'parent'>('athlete')
  const [addTarget, setAddTarget] = useState('20')
  const [addReps, setAddReps] = useState('')
  const [addMode, setAddMode] = useState<HomeworkTrackMode | ''>('')
  const [addGrip, setAddGrip] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [pendingWrist, setPendingWrist] = useState<HomeworkItem | null>(null)
  const [injuryLogs, setInjuryLogs] = useState<InjuryEntry[]>([])
  const [painJournal, setPainJournal] = useState<PainJournalEntry[]>([])
  const [coachExercises, setCoachExercises] = useState<CoachExercise[]>([])
  const [newExName, setNewExName] = useState('')
  const [newExMode, setNewExMode] = useState<HomeworkTrackMode>('reps')
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
  const [hwPage, setHwPage] = useState<
    'home' | 'pick' | 'watch' | 'add' | 'train' | 'wrist' | 'reps' | 'care'
  >('home')
  const watchStartRef = useRef<number | null>(null)
  const logLockRef = useRef(false)
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
      setInjuryLogs(loadInjuryLogs(athleteId))
      setPainJournal(loadPainJournal(athleteId))
      setCoachExercises(loadCoachExercises(athlete?.id))
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
  }, [athleteId, athlete?.id])

  const signedIn = viewer ?? athlete
  const parentLogging =
    profileRole(viewer) === 'parent' && Boolean(athlete) && viewer?.id !== athlete?.id

  useEffect(() => {
    if (isCoachProfile(signedIn)) setAddSource('coach')
    else if (profileRole(signedIn) === 'parent') setAddSource('parent')
    else setAddSource('athlete')
  }, [signedIn?.id])

  useEffect(() => {
    const open = hwPage !== 'home' || Boolean(activeItemId)
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (activeItemId) stopItem()
      else setHwPage('home')
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
    // stopItem is stable enough for Escape
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hwPage, activeItemId])

  useEffect(() => {
    if (!openPage) return
    setHwPage(openPage)
    onOpenPageConsumed?.()
  }, [openPage, onOpenPageConsumed])

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
  const showAssignedBanner =
    fromCoach.length > 0 && !isCoachProfile(athlete) && athlete?.role !== 'parent'
  const coreItems = useMemo(
    () => visibleItems.filter((item) => item.source === 'auto'),
    [visibleItems],
  )
  const strengthItems = useMemo(
    () =>
      visibleItems.filter(
        (item) =>
          isCatalogHomework(item) ||
          homeworkTrackMode(item) === 'reps' ||
          homeworkTrackMode(item) === 'hold_or_reps',
      ),
    [visibleItems],
  )
  const otherTrainItems = useMemo(
    () =>
      visibleItems.filter(
        (item) =>
          item.source !== 'auto' &&
          item.source !== 'coach' &&
          !isCatalogHomework(item),
      ),
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
    (currentShapeId === activeCameraShapeId || isPhoneBrowser())
  const inShape =
    Boolean(activeItem) &&
    homeworkLooksReady(activeCameraShapeId || activeItem!.shapeId, landmarks, score.overall)
  // Phone cameras score lower; once the pose is in the shape, start proper-hold time.
  const holdScore = !inShape
    ? 0
    : isPhoneBrowser()
      ? Math.max(score.overall, standard)
      : Math.max(score.overall, 10)
  const hold = useHoldTimer(sessionTiming && inShape, holdScore, standard)
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
    window.setTimeout(() => setFlash(null), 5000)
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

  const startItem = (item: HomeworkItem, opts?: { skipWrist?: boolean }) => {
    if (!opts?.skipWrist && needsWristPrep(item.shapeId, item.catalogId)) {
      setPendingWrist(item)
      setHwPage('wrist')
      return
    }
    setPendingWrist(null)
    const mode = homeworkTrackMode(item)
    if (mode === 'journal') {
      setOpenIds((prev) => new Set(prev).add(item.id))
      showFlash('Class skills log on this card. Add a new one from Today → Class clock.')
      return
    }
    const hasCameraShape = Boolean(getShape(item.shapeId)) && !isCatalogHomework(item)
    if (mode === 'reps' || (mode === 'hold_or_reps' && !hasCameraShape) || isCustomHomework(item)) {
      setActiveItemId(item.id)
      setManualItemId(null)
      setHwPage('reps')
      onStudioChange?.(false)
      return
    }
    const flowId = flowIdForHomeworkItem(item)
    if (flowId && onOpenClassFlow) {
      onOpenClassFlow(flowId)
      return
    }
    setOpenIds((prev) => new Set(prev).add(item.id))
    setActiveItemId(item.id)
    setManualItemId(null)
    setHwPage('home')
    onStudioChange?.(true)
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
    onStudioChange?.(false)
    setHwPage('home')
  }

  const logSession = () => {
    if (!athleteId || !activeItem) return
    if (logLockRef.current) return
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
    logLockRef.current = true
    addHomeworkLog(log)
    setLogs((prev) => [log, ...prev])
    resetSession()
    window.setTimeout(() => {
      logLockRef.current = false
    }, 1500)
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
    if (logLockRef.current) return
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
    logLockRef.current = true
    addHomeworkLog(log)
    setLogs((prev) =>
      [log, ...prev].sort((a, b) => b.date.localeCompare(a.date)),
    )
    setManualItemId(null)
    window.setTimeout(() => {
      logLockRef.current = false
    }, 1500)
    const prior = lastHoldSeconds(
      (logsByItem.get(item.id) ?? []).filter((row) => row.id !== log.id),
      isPlank && manualSide !== 'both' ? manualSide : undefined,
    )
    const shapeName = homeworkTitle(item)
    showFlash(`Logged ${shapeName} — ${formatSeconds(secs)}${beatNote(secs, prior)}`)
  }

  const changeStandard = (item: HomeworkItem, value: string | number) => {
    const v = Number(value)
    if (!Number.isFinite(v)) return
    const clamped = Math.min(100, Math.max(0, Math.round(v)))
    const updated = updateHomeworkItem(item.id, { formStandard: clamped })
    if (updated) {
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    }
  }

  const applyBackCare = (painLevel: number, bodyPart?: string) => {
    if (bodyPart && !/back/i.test(bodyPart)) return
    const names: string[] = []
    for (const id of catalogIdsForBackPain(painLevel)) {
      const before = items.some((i) => i.catalogId === id)
      const item = addCatalogItem(id, 'athlete')
      if (item && !before) names.push(item.customLabel ?? id)
    }
    if (names.length) {
      showFlash(`Added to homework: ${names.join(' and ')}`)
    }
  }

  const addFromPick = (pick: HomeworkPick) => {
    if (!athleteId) return
    const item = buildHomeworkItem(athleteId, {
      pick,
      source: addSource,
      notes: addNotes,
      mode: addMode,
      targetSeconds: Number(addTarget) || undefined,
      targetReps: Number(addReps) || undefined,
      grip: addGrip || undefined,
      coachExercises,
    })
    if (!item) return
    if (visibleItems.some((h) => homeworkDedupeKey(h) === homeworkDedupeKey(item))) {
      showFlash('That drill is already on this homework list.')
      return
    }
    setItems(addHomeworkItem(item))
    setAddNotes('')
    setAddMode('')
    setAddReps('')
    setAddGrip('')
    showFlash(
      `${
        addSource === 'coach' ? 'Coach added' : addSource === 'parent' ? 'Parent added' : 'Athlete picked'
      }: ${homeworkTitle(item)}`,
    )
  }

  const addCatalogItem = (catalogId: string, source: HomeworkSource = 'athlete') => {
    if (!athleteId) return
    const cat = getCatalogItem(catalogId)
    if (!cat) return
    const existing = items.find((i) => i.catalogId === catalogId)
    if (existing || alreadyHasCatalog(items, catalogId)) {
      showFlash(`${cat.name} is already on the list`)
      return existing
    }
    const item: HomeworkItem = {
      id: createId('hw'),
      athleteId,
      shapeId: catalogShapeId(cat.id),
      catalogId: cat.id,
      customLabel: cat.name,
      source,
      trackMode: cat.trackMode,
      targetReps: cat.targetReps,
      targetSeconds: cat.targetSeconds,
      allowWeight: cat.allowWeight,
      notes: cat.notes,
      createdAt: new Date().toISOString(),
    }
    setItems(addHomeworkItem(item))
    showFlash(`Added ${cat.name}`)
    return item
  }

  const logRepSet = (
    item: HomeworkItem,
    input: {
      reps: number
      qualityReps: number
      holdSeconds?: number
      grip?: string
      weightLb?: number
      painLevel?: number
      journal?: string
      trackMode: HomeworkTrackMode
    },
  ) => {
    if (!athleteId) return
    if (logLockRef.current) return
    const log: HomeworkLog = {
      id: createId('hwlog'),
      athleteId,
      homeworkId: item.id,
      shapeId: item.shapeId,
      date: new Date().toISOString(),
      method: 'manual',
      kind:
        input.holdSeconds && input.reps
          ? 'set'
          : input.holdSeconds && !input.reps
            ? 'hold'
            : 'reps',
      totalHoldSeconds: input.holdSeconds ?? 0,
      reps: input.reps || undefined,
      qualityReps: input.qualityReps || undefined,
      grip: input.grip,
      weightLb: input.weightLb,
      painLevel: input.painLevel,
      journal: input.journal,
      trackMode: input.trackMode,
      score: 0,
    }
    logLockRef.current = true
    addHomeworkLog(log)
    setLogs((prev) => [log, ...prev])
    window.setTimeout(() => {
      logLockRef.current = false
    }, 1500)
    if (input.journal || input.painLevel != null) {
      addPainJournalEntry({
        id: createId('pj'),
        athleteId,
        date: log.date,
        painLevel: input.painLevel ?? 0,
        exerciseId: item.catalogId,
        exerciseName: homeworkTitle(item),
        holdSeconds: input.holdSeconds,
        reps: input.reps,
        weightLb: input.weightLb,
        felt: input.journal,
      })
      setPainJournal(loadPainJournal(athleteId))
    }
    const bits = [
      input.holdSeconds ? `${input.holdSeconds}s hold` : null,
      input.reps ? `${input.reps} reps` : null,
    ].filter(Boolean)
    showFlash(`Logged ${homeworkTitle(item)} — ${bits.join(' + ')}`)
  }

  const levelUpHollow = (item: HomeworkItem) => {
    const updated = progressHollowHomework(item.id)
    if (!updated) return
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    if (activeItemId === updated.id) onRequestShape(updated.shapeId)
    showFlash('Leveled up — Hollow is now trained with arms up!')
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

  const orderedDrills = fromCoach.length > 0 ? [...fromCoach, ...otherDrills] : visibleItems

  return (
    <div className="flex flex-col gap-3">
      {flash && (
        <p
          role="status"
          className="sticky top-0 z-20 rounded-lg border border-[var(--accent)] bg-[#102820] px-3 py-3 text-sm font-semibold text-[var(--accent)] shadow-lg"
        >
          {flash}
        </p>
      )}
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          Homework
        </p>
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Train a drill, then log the hold
        </h2>
        {athlete && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            {parentLogging && viewer ? (
              <>
                Logging homework for <AthleteName athlete={athlete} size="xs" /> as
                parent ({viewer.name.split(' ')[0]})
              </>
            ) : (
              <>
                Signed in as <AthleteName athlete={athlete} size="xs" />
              </>
            )}
          </p>
        )}
        {athlete &&
          profileRole(athlete) === 'athlete' &&
          !parentLogging &&
          worksWithCoachIds(athlete).length === 0 &&
          onUpdateAthlete && (
            <div className="mt-3">
              <CoachPicker
                athletes={athletes}
                selected={worksWithCoachIds(athlete)}
                excludeId={athlete.id}
                onChange={(worksWithCoachIds) => onUpdateAthlete({ worksWithCoachIds })}
              />
            </div>
          )}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setHwPage('train')}
          className="group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#5cf0c8] via-[#2dd4a8] to-[#147a62] px-5 py-6 text-center shadow-[0_16px_40px_rgba(45,212,168,0.32)] sm:py-8"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#06281f]/70">
            Homework · Choose
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-[#06281f] sm:text-3xl">
            Train now
          </span>
          <span className="mt-2 max-w-lg text-sm font-medium text-[#06281f]/80">
            What do you want to train? Core drills, assigned work, or a rep set.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setHwPage('pick')}
          className="group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#6ee7f0] via-[#22b8c9] to-[#0d4f5c] px-5 py-6 text-center shadow-[0_16px_40px_rgba(34,184,201,0.28)] sm:py-8"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#04262c]/70">
            Homework · Library
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-[#04262c] sm:text-3xl">
            Pick a drill
          </span>
          <span className="mt-2 max-w-lg text-sm font-medium text-[#04262c]/80">
            {visibleItems.length} drill{visibleItems.length === 1 ? '' : 's'} — tap one to train full screen.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setHwPage('watch')}
          className="group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#3ae0c0] via-[#1fb896] to-[#0e5c4c] px-5 py-5 text-center shadow-[0_10px_28px_rgba(45,212,168,0.22)] sm:py-6"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#06281f]/70">
            No camera
          </span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-[#06281f] sm:text-3xl">
            Stopwatch
          </span>
          <span className="mt-2 max-w-lg text-sm font-medium text-[#06281f]/80">
            Time a hold, then log it to a drill.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setHwPage('add')}
          className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-5 py-4 text-center"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Your library
          </span>
          <span className="mt-1 block text-lg font-bold text-[var(--text)]">Add homework</span>
          <span className="mt-1 block text-sm text-[var(--muted)]">
            Shape, class flow, rep exercise, or a skill you type.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setHwPage('care')}
          className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-5 py-4 text-center"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--warn)]">
            Care
          </span>
          <span className="mt-1 block text-lg font-bold text-[var(--text)]">
            {athlete?.injuryActive || athlete?.hasBackPain
              ? 'Injury and back care'
              : "I'm dealing with an injury"}
          </span>
          <span className="mt-1 block text-sm text-[var(--muted)]">
            Log pain, remember what the doctor said, and train what you can handle today.
          </span>
        </button>
      </div>

      <HomeworkProgressStrip items={visibleItems} logsByItem={logsByItem} />

      {hwPage === 'train' && (
        <HwOverlay
          eyebrow="Homework · Train"
          title="What do you want to train?"
          onDone={() => setHwPage('home')}
        >
          <TrainPicker
            assigned={showAssignedBanner ? fromCoach : []}
            core={coreItems}
            strength={strengthItems}
            other={[
              ...(!showAssignedBanner ? fromCoach : []),
              ...otherTrainItems.filter((item) => !strengthItems.some((s) => s.id === item.id)),
            ]}
            onPick={(item) => startItem(item)}
            onAddHomework={() => setHwPage('add')}
          />
        </HwOverlay>
      )}

      {hwPage === 'wrist' && pendingWrist && (
        <HwOverlay
          eyebrow="Homework · Wrists"
          title="Prepare first"
          onDone={() => {
            setPendingWrist(null)
            setHwPage('train')
          }}
        >
          <WristPrepNotice
            drillName={homeworkTitle(pendingWrist)}
            onContinue={() => startItem(pendingWrist, { skipWrist: true })}
            onBack={() => {
              setPendingWrist(null)
              setHwPage('train')
            }}
          />
        </HwOverlay>
      )}

      {hwPage === 'reps' && activeItem && (
        <HwOverlay
          eyebrow="Homework · Reps"
          title={homeworkTitle(activeItem)}
          onDone={stopItem}
        >
          <RepSession
            item={activeItem}
            logs={logsByItem.get(activeItem.id) ?? []}
            onLog={(input) => logRepSet(activeItem, input)}
            onDone={stopItem}
          />
        </HwOverlay>
      )}

      {hwPage === 'care' && (
        <HwOverlay
          eyebrow="Homework · Care"
          title="Healing is a trail"
          onDone={() => setHwPage('home')}
        >
          <CarePanel
            athlete={athlete}
            injuryLogs={injuryLogs}
            painJournal={painJournal}
            backItems={visibleItems.filter(
              (item) => item.catalogId === 'glute_bridge' || item.catalogId === 'back_extension',
            )}
            onFlagInjury={(active) => onUpdateAthlete?.({ injuryActive: active })}
            onSaveInjury={(entry) => {
              if (!athleteId) return
              addInjuryEntry({
                id: createId('inj'),
                athleteId,
                date: new Date().toISOString(),
                ...entry,
              })
              setInjuryLogs(loadInjuryLogs(athleteId))
              onUpdateAthlete?.({
                injuryActive: true,
                ...( /back/i.test(entry.bodyPart) ? { hasBackPain: true } : {}),
              })
              applyBackCare(entry.painLevel, entry.bodyPart)
            }}
            onSaveJournal={(entry) => {
              if (!athleteId) return
              addPainJournalEntry({
                id: createId('pj'),
                athleteId,
                date: new Date().toISOString(),
                ...entry,
              })
              setPainJournal(loadPainJournal(athleteId))
              applyBackCare(entry.painLevel, 'low back')
            }}
            onTrain={(item) => startItem(item)}
            onAddBackCare={(catalogId) => {
              addCatalogItem(catalogId, 'athlete')
            }}
            onStartSession={() => setHwPage('train')}
            encourageSlowReps={shouldEncourageSlowReps(
              logs.filter((l) => {
                const item = items.find((i) => i.id === l.homeworkId)
                return item?.catalogId === 'back_extension'
              }),
            )}
          />
        </HwOverlay>
      )}

      {hwPage === 'watch' && (
        <HwOverlay
          eyebrow="Homework · Stopwatch"
          title="Time a hold, then log it"
          onDone={() => setHwPage('home')}
        >

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
        </HwOverlay>
      )}

      {activeItem && activeShape && (
        <HwOverlay
          eyebrow="Homework · Train"
          title={activeShape.name}
          onDone={stopItem}
          wide
        >
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden lg:flex-row">
            {camSlot ? (
              <div className="min-h-0 flex-1 overflow-y-auto">{camSlot}</div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto">
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
          <div className="mb-2 flex flex-col gap-2 text-xs text-[var(--muted)]">
            <FormStandardField
              value={standard}
              onCommit={(next) => changeStandard(activeItem, next)}
            />
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
            </div>
          </div>
        </HwOverlay>
      )}

      {hwPage === 'pick' && (
        <HwOverlay
          eyebrow="Homework · Library"
          title="Tap a drill to train full screen"
          onDone={() => setHwPage('home')}
        >
      {/* Homework items — coach assignments first so the athlete sees them */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {showAssignedBanner ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                From your coach
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Assigned for you. Open a drill only when you want the details.
                Remove one and it stays off this list.
              </p>
            </>
          ) : (
            <p className="text-xs text-[var(--muted)]">
              Core drills stay on every profile. Remove anything extra and it will not come back.
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
        {orderedDrills.map((item) => {
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
            {showAssignedBanner && item.id === otherDrills[0]?.id && (
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
                      class flow
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
                  <button
                    type="button"
                    onClick={() => startItem(item)}
                    className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-semibold text-white"
                    title={
                      isSequenceHomework(item)
                        ? 'Open this sequence in Class flow'
                        : homeworkTrackMode(item) !== 'hold'
                          ? 'Log reps or a hold'
                          : 'Camera session with live form scoring (recommended)'
                    }
                  >
                    {isSequenceHomework(item)
                      ? 'Class flow'
                      : homeworkTrackMode(item) !== 'hold'
                        ? 'Log'
                        : 'Train'}
                  </button>
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
              <HoldTimesBoard
                logs={itemLogs}
                isPlank={isPlank}
                athlete={athlete}
                viewer={viewer}
                athletes={athletes}
                onLogsChange={() => setLogs(loadHomeworkLogs(athleteId ?? undefined))}
                onRemove={(id) => {
                  removeHomeworkLog(id)
                  setLogs((prev) => prev.filter((row) => row.id !== id))
                  showFlash('Removed that logged set.')
                }}
              />
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
                <SequenceHomeworkSteps
                  item={item}
                  times={(() => {
                    const flowId = flowIdForHomeworkItem(item)
                    const flowRuns =
                      athleteId && flowId ? flowHistoryForSequence(athleteId, flowId) : []
                    const seqLogs = itemLogs.filter((l) => l.kind === 'sequence')
                    return Math.max(seqLogs.length, flowRuns.length, itemLogs.length)
                  })()}
                  lastScore={(() => {
                    const seqLog = itemLogs.find((l) => l.kind === 'sequence' && l.score > 0)
                    if (seqLog) return seqLog.score
                    const flowId = flowIdForHomeworkItem(item)
                    const latest =
                      athleteId && flowId
                        ? flowHistoryForSequence(athleteId, flowId)[0]
                        : undefined
                    return latest ? overallFlowScore(latest) : null
                  })()}
                />
              )}
              {isDrillHomework(item) && <DrillHomeworkCard item={item} />}
              {item.notes && (
                <div className="mt-1">
                  <ExpandableNotes text={item.notes} previewLines={1} />
                </div>
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
            {item.source === 'auto' && item.id === coreItems[coreItems.length - 1]?.id && (
              <button
                type="button"
                onClick={() => setHwPage('add')}
                className="w-full rounded-xl border border-dashed border-[var(--accent)]/40 bg-[#102820] px-3 py-3 text-left text-sm font-semibold text-[var(--accent)]"
              >
                Want something else? Add homework — other exercises
              </button>
            )}
            </Fragment>
          )
        })}
      </div>
        </HwOverlay>
      )}

      {hwPage === 'add' && (
        <HwOverlay
          eyebrow="Homework · Add"
          title="Make your own library"
          onDone={() => setHwPage('home')}
        >
          <AddHomeworkForm
            libraryShapes={libraryShapes}
            coachExercises={coachExercises}
            isCoach={isCoachProfile(signedIn)}
            isParent={profileRole(signedIn) === 'parent'}
            source={addSource}
            onSource={setAddSource}
            notes={addNotes}
            onNotes={setAddNotes}
            mode={addMode}
            onMode={setAddMode}
            target={addTarget}
            onTarget={setAddTarget}
            reps={addReps}
            onReps={setAddReps}
            newExName={newExName}
            onNewExName={setNewExName}
            newExMode={newExMode}
            onNewExMode={setNewExMode}
            onSaveExercise={() => {
              if (!athlete?.id || !newExName.trim()) return
              addCoachExercise({
                coachId: athlete.id,
                name: newExName.trim(),
                trackMode: newExMode,
              })
              setCoachExercises(loadCoachExercises(athlete.id))
              setNewExName('')
              showFlash('Exercise added to your assign list.')
            }}
            onRemoveExercise={(id) => {
              removeCoachExercise(id)
              setCoachExercises(loadCoachExercises(athlete?.id))
            }}
            onAdd={addFromPick}
          />
        </HwOverlay>
      )}

    </div>
  )
}
