import { useEffect, useMemo, useRef, useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteAvatar, AthleteName } from '../AthleteAvatar'
import {
  classLabel,
  getActiveMeeting,
  getOffering,
  resolveAttendeeAthletes,
  subscribeCoachClasses,
} from '../../lib/coachClasses'
import {
  CLASS_HOLD_DRILLS,
  logClassExtraForAthletes,
  logClassHoldForAthletes,
  logClassRepsForAthletes,
  logClassSkillForAthlete,
} from '../../lib/classSessionLog'
import type { ClassExtraExercise } from '../../types'
import { makeClassExtra } from '../../lib/classExercises'
import { publishFeedPostResult, publishTextPostResult } from '../../lib/feedPosts'
import { coachShareLabel } from '../../lib/coachShare'
import { formatSeconds } from '../../hooks/useHoldTimer'
import { videoFileAccept } from '../../lib/saveMedia'
import { athleteMatchesQuery } from '../../lib/gymScope'
import { isAthleteProfile } from '../../lib/profileRole'
import { InfoHint } from '../ui/InfoHint'
import { IconMark } from '../ui/IconAction'

type Mode = 'hold' | 'vups' | 'skill' | 'other' | `extra:${string}`

type HoldId = (typeof CLASS_HOLD_DRILLS)[number]['id']

type Props = {
  athletes: Athlete[]
  signedIn: Athlete | null
  coach?: boolean
  variant?: 'card' | 'overlay'
  onClose?: () => void
  /** Body only — Today dock supplies the title. */
  embed?: boolean
}

function formatWatch(ms: number): string {
  const total = Math.max(0, ms) / 1000
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

export function ClassStopwatch({
  athletes,
  signedIn,
  coach,
  variant = 'card',
  onClose,
  embed = false,
}: Props) {
  const [, setClassTick] = useState(0)
  useEffect(() => subscribeCoachClasses(() => setClassTick((n) => n + 1)), [])
  const meeting = getActiveMeeting(signedIn?.id)
  const offering = meeting ? getOffering(meeting.offeringId) : null
  const className = offering ? classLabel(offering) : undefined
  const classOpen = Boolean(meeting)
  const present = useMemo(
    () => (meeting ? resolveAttendeeAthletes(meeting, athletes) : []),
    [meeting, athletes],
  )
  /** Open class: present roster only. No class: empty until the coach searches. */
  const pool = classOpen ? present : []

  const extras = offering?.extraExercises ?? []
  const extraHolds = extras.filter((ex) => ex.trackMode === 'hold')
  const extraReps = extras.filter((ex) => ex.trackMode === 'reps')
  const [mode, setMode] = useState<Mode>('hold')
  const [holdId, setHoldId] = useState<HoldId>('hollow')
  const [extraHoldId, setExtraHoldId] = useState<string | null>(null)
  const [side, setSide] = useState<'left' | 'right'>('left')
  const [selected, setSelected] = useState<string[]>(() => pool.map((a) => a.id))
  const [running, setRunning] = useState(false)
  const [ms, setMs] = useState(0)
  const [offer, setOffer] = useState<number | null>(null)
  const [manual, setManual] = useState('')
  const [reps, setReps] = useState('10')
  const [sets, setSets] = useState('1')
  const [otherName, setOtherName] = useState('')
  const [otherKind, setOtherKind] = useState<'hold' | 'reps'>('reps')
  const [skillAthleteId, setSkillAthleteId] = useState(pool[0]?.id ?? '')
  const [skillText, setSkillText] = useState('')
  const [postWins, setPostWins] = useState(true)
  const [bigWin, setBigWin] = useState(false)
  const [skillFile, setSkillFile] = useState<File | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [pickQuery, setPickQuery] = useState('')
  const [extraPicks, setExtraPicks] = useState<Athlete[]>([])
  const startRef = useRef<number | null>(null)
  const accRef = useRef(0)

  const logPool = classOpen ? pool : extraPicks

  useEffect(() => {
    if (classOpen) {
      setSelected(pool.map((a) => a.id))
      if (!skillAthleteId && pool[0]) setSkillAthleteId(pool[0].id)
      setExtraPicks([])
      return
    }
    setSelected(extraPicks.map((a) => a.id))
  }, [classOpen, pool.map((a) => a.id).join('|'), extraPicks.map((a) => a.id).join('|')])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const start = startRef.current ?? performance.now()
      setMs(accRef.current + (performance.now() - start))
    }, 80)
    return () => window.clearInterval(id)
  }, [running])

  const start = () => {
    startRef.current = performance.now()
    setRunning(true)
    setOffer(null)
  }

  const stop = () => {
    const startAt = startRef.current
    if (startAt != null) accRef.current += performance.now() - startAt
    startRef.current = null
    setRunning(false)
    const secs = accRef.current / 1000
    setMs(accRef.current)
    setOffer(secs)
    setManual(String(Math.round(secs * 10) / 10))
  }

  const reset = () => {
    startRef.current = running ? performance.now() : null
    accRef.current = 0
    setMs(0)
    setOffer(null)
    setManual('')
  }

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const addPick = (row: Athlete) => {
    setExtraPicks((prev) => (prev.some((a) => a.id === row.id) ? prev : [...prev, row]))
    setSelected((prev) => (prev.includes(row.id) ? prev : [...prev, row.id]))
    setPickQuery('')
  }

  const removePick = (id: string) => {
    setExtraPicks((prev) => prev.filter((a) => a.id !== id))
    setSelected((prev) => prev.filter((x) => x !== id))
  }

  const logWho = (
    <LogWho
      classOpen={classOpen}
      className={className}
      pool={logPool}
      selected={selected}
      allAthletes={athletes}
      pickQuery={pickQuery}
      onPickQuery={setPickQuery}
      onToggle={toggle}
      onSelectAll={() => setSelected(logPool.map((a) => a.id))}
      onSelectNone={() => setSelected([])}
      onAddPick={addPick}
      onRemovePick={removePick}
    />
  )

  const activeExtra = (id: string | null): ClassExtraExercise | undefined =>
    extras.find((ex) => ex.id === id)

  const logHold = () => {
    const secs = Number(manual || offer)
    if (!Number.isFinite(secs) || secs <= 0) {
      setFlash('Start and stop the clock, or type the seconds.')
      return
    }
    if (selected.length === 0) {
      setFlash('Pick at least one athlete.')
      return
    }
    const pinned = extraHoldId ? activeExtra(extraHoldId) : undefined
    if (pinned && pinned.trackMode === 'hold') {
      const n = logClassExtraForAthletes({
        athleteIds: selected,
        extra: pinned,
        seconds: secs,
        className,
        meetingId: meeting?.id,
      })
      reset()
      setFlash(
        `Logged ${pinned.label} — ${formatSeconds(secs)} for ${n} athlete${n === 1 ? '' : 's'}. It shows on their homework as in class.`,
      )
      return
    }
    const drill = CLASS_HOLD_DRILLS.find((d) => d.id === holdId)
    if (!drill) return
    const holdName =
      drill.autoKey === 'side_plank' ? `${drill.label} · ${side}` : drill.label
    const n = logClassHoldForAthletes({
      athleteIds: selected,
      autoKey: drill.autoKey,
      seconds: secs,
      label: holdName,
      className,
      meetingId: meeting?.id,
      side: drill.autoKey === 'side_plank' ? side : undefined,
      coachId: signedIn?.id,
      coachName: signedIn?.name,
    })
    reset()
    setFlash(
      `Logged ${holdName} — ${formatSeconds(secs)} for ${n} athlete${n === 1 ? '' : 's'}. It shows on their homework as in class.`,
    )
  }

  const logExtraReps = (extra: ClassExtraExercise) => {
    const nReps = Number(reps)
    if (!Number.isFinite(nReps) || nReps <= 0) {
      setFlash(`Enter how many ${extra.label} they did.`)
      return
    }
    if (selected.length === 0) {
      setFlash('Pick at least one athlete.')
      return
    }
    const nSets = Number(sets)
    const n = logClassExtraForAthletes({
      athleteIds: selected,
      extra,
      reps: nReps,
      sets: Number.isFinite(nSets) && nSets > 1 ? nSets : undefined,
      className,
      meetingId: meeting?.id,
    })
    setFlash(
      `Logged ${Number.isFinite(nSets) && nSets > 1 ? `${nSets}×` : ''}${nReps} ${extra.label} for ${n} athlete${n === 1 ? '' : 's'}.`,
    )
  }

  const logOther = () => {
    const label = otherName.trim()
    if (!label) {
      setFlash('Type the exercise they just did.')
      return
    }
    if (selected.length === 0) {
      setFlash('Pick at least one athlete.')
      return
    }
    const extra = makeClassExtra({ kind: 'custom', label, trackMode: otherKind })
    if (!extra) return
    if (otherKind === 'hold') {
      const secs = Number(manual || offer)
      if (!Number.isFinite(secs) || secs <= 0) {
        setFlash('Type how many seconds they held.')
        return
      }
      const n = logClassExtraForAthletes({
        athleteIds: selected,
        extra,
        seconds: secs,
        className,
        meetingId: meeting?.id,
      })
      reset()
      setFlash(`Logged ${label} — ${formatSeconds(secs)} for ${n} athlete${n === 1 ? '' : 's'}.`)
      return
    }
    const nReps = Number(reps)
    const nSets = Number(sets)
    if (!Number.isFinite(nReps) || nReps <= 0) {
      setFlash(`Enter how many ${label} they did.`)
      return
    }
    const n = logClassExtraForAthletes({
      athleteIds: selected,
      extra,
      reps: nReps,
      sets: Number.isFinite(nSets) && nSets > 1 ? nSets : undefined,
      className,
      meetingId: meeting?.id,
    })
    setOtherName('')
    setFlash(
      `Logged ${Number.isFinite(nSets) && nSets > 1 ? `${nSets}×` : ''}${nReps} ${label} for ${n} athlete${n === 1 ? '' : 's'}.`,
    )
  }

  const logVups = () => {
    const nReps = Number(reps)
    if (!Number.isFinite(nReps) || nReps <= 0) {
      setFlash('Enter how many V-ups they did.')
      return
    }
    if (selected.length === 0) {
      setFlash('Pick at least one athlete.')
      return
    }
    const nSets = Number(sets)
    const n = logClassRepsForAthletes({
      athleteIds: selected,
      catalogId: 'v_up',
      sets: Number.isFinite(nSets) && nSets > 1 ? nSets : undefined,
      reps: nReps,
      label: `V-ups · ${nReps} reps`,
      className,
      meetingId: meeting?.id,
    })
    setFlash(
      `Logged ${nReps} V-up${nReps === 1 ? '' : 's'} for ${n} athlete${n === 1 ? '' : 's'}.`,
    )
  }

  const logSkill = async () => {
    const text = skillText.trim()
    if (!skillAthleteId || (!text && !skillFile)) {
      setFlash('Pick the athlete and type what they did, or attach a clip.')
      return
    }
    const log = logClassSkillForAthlete({
      athleteId: skillAthleteId,
      text: text || 'Video win',
      className,
      meetingId: meeting?.id,
    })
    if (!log) return
    const who = athletes.find((a) => a.id === skillAthleteId)
    if (postWins && signedIn) {
      const channels: ('gym' | 'wins')[] = bigWin ? ['wins', 'gym'] : ['wins']
      const posted = skillFile
        ? await publishFeedPostResult({
            authorId: skillAthleteId,
            caption: text,
            taggedIds: [skillAthleteId],
            blob: skillFile,
            channels,
            sharedById: signedIn.id,
            sharedByName: coachShareLabel(signedIn),
          })
        : await publishTextPostResult({
            authorId: skillAthleteId,
            caption: text,
            taggedIds: [skillAthleteId],
            channels,
            sharedById: signedIn.id,
            sharedByName: coachShareLabel(signedIn),
          })
      if (!posted.post) {
        setFlash(posted.error || 'Logged the skill, but the win post did not go through.')
        setSkillText('')
        return
      }
    }
    setSkillText('')
    setSkillFile(null)
    setFlash(
      postWins
        ? `Logged for ${who?.name ?? 'them'} and posted to Wins${bigWin ? ' and the gym feed' : ''}${skillFile ? ' with the clip' : ''}.`
        : `Logged for ${who?.name ?? 'them'} on homework as a class skill.`,
    )
  }

  const body = (
    <div className="flex flex-col gap-4">
      {flash && (
        <p className="rounded-lg border border-[var(--accent)] bg-[#102820] px-3 py-2 text-sm font-semibold text-[var(--accent)]">
          {flash}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['hold', 'Core holds'],
            ['vups', 'V-ups'],
            ['skill', 'New skill / win'],
            ['other', 'Just did'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMode(id)
              setExtraHoldId(null)
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              mode === id
                ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                : 'bg-white/8 text-white/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {extraReps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {extraReps.map((ex) => {
            const id = `extra:${ex.id}` as Mode
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  setMode(id)
                  setExtraHoldId(null)
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  mode === id
                    ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                    : 'bg-white/8 text-white/80'
                }`}
              >
                {ex.label}
              </button>
            )
          })}
        </div>
      )}

      {mode === 'hold' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {CLASS_HOLD_DRILLS.map((d) =>
              d.id === 'side_plank' ? (
                <div
                  key={d.id}
                  className="grid grid-cols-2 overflow-hidden rounded-xl bg-white/8"
                >
                  {(['left', 'right'] as const).map((s) => {
                    const on = !extraHoldId && holdId === 'side_plank' && side === s
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        aria-label={s === 'left' ? 'Left side plank' : 'Right side plank'}
                        onClick={() => {
                          setHoldId('side_plank')
                          setSide(s)
                          setExtraHoldId(null)
                        }}
                        className={`whitespace-nowrap px-1.5 py-2 text-xs font-semibold sm:px-3 sm:text-sm ${
                          s === 'right' ? 'border-l border-white/15' : ''
                        } ${
                          on
                            ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                            : 'text-white/90'
                        }`}
                      >
                        {s === 'left' ? 'Left plank' : 'Right plank'}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setHoldId(d.id)
                    setExtraHoldId(null)
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                    !extraHoldId && holdId === d.id
                      ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                      : 'bg-white/8'
                  }`}
                >
                  {d.label}
                </button>
              ),
            )}
          </div>
          {extraHolds.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Also on this class
              </p>
              <div className="flex flex-wrap gap-2">
                {extraHolds.map((ex) => {
                  const on = extraHoldId === ex.id
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setExtraHoldId(ex.id)
                        setMode('hold')
                      }}
                      className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                        on ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-white/8'
                      }`}
                    >
                      {ex.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <HoldClock
            ms={ms}
            running={running}
            manual={manual}
            onManual={setManual}
            onStart={start}
            onStop={stop}
            onReset={reset}
          />
          {logWho}
          <button
            type="button"
            onClick={logHold}
            className="h-12 rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)]"
          >
            Log {extraHoldId ? activeExtra(extraHoldId)?.label ?? 'hold' : 'hold'}
            {selected.length ? ` · ${selected.length}` : ''}
          </button>
        </>
      )}

      {mode.startsWith('extra:') && (() => {
        const extra = activeExtra(mode.slice(6))
        if (!extra || extra.trackMode !== 'reps') return null
        return (
          <>
            <p className="text-sm text-white/60">
              {extra.label} counts change by class. Type how many this group just did.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Sets
                </span>
                <input
                  inputMode="numeric"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-lg"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Reps / set
                </span>
                <input
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-lg"
                />
              </label>
            </div>
            {logWho}
            <button
              type="button"
              onClick={() => logExtraReps(extra)}
              className="h-12 rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)]"
            >
              Log {extra.label} for selected
            </button>
          </>
        )
      })()}

      {mode === 'other' && (
        <>
          <p className="text-sm text-white/60">
            Already did it without the stopwatch? Type the name, pick hold
            seconds or sets × reps, and log it.
          </p>
          <input
            className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
            placeholder="Bear crawls, 10 push-ups, candlestick…"
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setOtherKind('hold')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                otherKind === 'hold' ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-white/8'
              }`}
            >
              Hold time
            </button>
            <button
              type="button"
              onClick={() => setOtherKind('reps')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                otherKind === 'reps' ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-white/8'
              }`}
            >
              Reps / sets
            </button>
          </div>
          {otherKind === 'hold' ? (
            <label className="block text-sm">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
                Seconds they held
              </span>
              <input
                inputMode="decimal"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="e.g. 45"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-lg"
              />
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Sets
                </span>
                <input
                  inputMode="numeric"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-lg"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Reps / set
                </span>
                <input
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-lg"
                />
              </label>
            </div>
          )}
          {logWho}
          <button
            type="button"
            onClick={logOther}
            className="h-12 rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)]"
          >
            Log {otherName.trim() || 'other'} for selected
          </button>
        </>
      )}

      {mode === 'vups' && (
        <>
          <p className="text-sm text-white/60">
            V-up counts change by class. Type the number this group just did.
          </p>
          <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Sets
            </span>
            <input
              inputMode="numeric"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-lg"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Reps / set
            </span>
            <input
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-lg"
            />
          </label>
          </div>
          {logWho}
          <button
            type="button"
            onClick={logVups}
            className="h-12 rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)]"
          >
            Log V-ups for selected
          </button>
        </>
      )}

      {mode === 'skill' && (
        <>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Who</p>
            <InfoHint>
              Pick the athlete, type what they did, and post to Wins. Check big win only when it also belongs on the gym feed.
            </InfoHint>
          </div>
          {classOpen ? (
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {logPool.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSkillAthleteId(a.id)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                    skillAthleteId === a.id
                      ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                      : 'bg-white/8'
                  }`}
                >
                  <AthleteAvatar athlete={a} size="xs" />
                  <span className="font-semibold">{a.name}</span>
                </button>
              ))}
              {logPool.length === 0 && (
                <p className="text-sm text-white/55">Mark who is present on this class first.</p>
              )}
            </div>
          ) : (
            <AthleteSearchField
              athletes={athletes}
              query={pickQuery}
              onQuery={setPickQuery}
              onPick={(row) => {
                setSkillAthleteId(row.id)
                addPick(row)
              }}
              excludeIds={[]}
            />
          )}
          {skillAthleteId && !classOpen && (
            <p className="text-sm">
              {athletes.find((a) => a.id === skillAthleteId)?.name ?? 'Selected'}
            </p>
          )}
          <textarea
            value={skillText}
            onChange={(e) => setSkillText(e.target.value)}
            rows={3}
            placeholder="First standing back tuck · stuck the layout…"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
          />
          <label className="inline-flex cursor-pointer items-center gap-1 self-start rounded-full bg-white/10 px-2 py-2">
            <IconMark kind="plus" />
            <span className="sr-only">Attach clip from Photos</span>
            <input
              type="file"
              accept={videoFileAccept('video/mp4,video/webm,video/quicktime,video/*')}
              className="sr-only"
              onChange={(e) => setSkillFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {skillFile && (
            <p className="text-xs text-[var(--muted)]">{skillFile.name}</p>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={postWins}
              onChange={(e) => setPostWins(e.target.checked)}
            />
            Post to the Wins feed
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bigWin}
              onChange={(e) => setBigWin(e.target.checked)}
              disabled={!postWins}
            />
            Big win — also post to the gym feed
          </label>
          <button
            type="button"
            onClick={() => void logSkill()}
            className="h-12 rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)]"
          >
            Log skill
          </button>
        </>
      )}
    </div>
  )

  if (variant === 'overlay') {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col bg-[#07110e] text-[var(--text)]">
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Class clock
            </p>
            <p className="text-sm text-white/60">
              {className ?? (coach ? 'Stopwatch' : 'Quick stopwatch')}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold"
            >
              Close
            </button>
          )}
        </header>
        <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-8">{body}</div>
      </div>
    )
  }

  if (embed) {
    return (
      <div>
        <p className="mb-3 flex items-center gap-2 text-sm text-white/55">
          {className ? `Holds for ${className}` : 'Stopwatch'}
          <InfoHint>
            {classOpen
              ? 'Logs go to athletes marked present on this class.'
              : 'Search a name to log a hold. Older holds belong in an open lesson, not here.'}
          </InfoHint>
        </p>
        {body}
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        Class clock
      </p>
      <h3 className="mt-1 text-lg font-semibold">
        {className ? `Holds for ${className}` : 'Stopwatch'}
      </h3>
      <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
        Time a hold, then log it.
        <InfoHint>
          {classOpen
            ? 'Everyone selected on the present roster gets it as in class.'
            : 'When no class is open, search who to log. Historical times go in a lesson.'}
        </InfoHint>
      </p>
      <div className="mt-4">{body}</div>
    </section>
  )
}

function HoldClock({
  ms,
  running,
  manual,
  onManual,
  onStart,
  onStop,
  onReset,
}: {
  ms: number
  running: boolean
  manual: string
  onManual: (v: string) => void
  onStart: () => void
  onStop: () => void
  onReset: () => void
}) {
  return (
    <>
      <p className="text-center font-mono text-5xl font-bold tabular-nums">
        {formatWatch(ms)}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {!running ? (
          <button
            type="button"
            onClick={onStart}
            className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-bold text-[var(--on-accent)]"
          >
            Start
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            className="rounded-xl bg-[var(--bad)] px-5 py-2 text-sm font-bold text-white"
          >
            Stop
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold"
        >
          Reset
        </button>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Seconds to log
        </span>
        <input
          inputMode="decimal"
          value={manual}
          onChange={(e) => onManual(e.target.value)}
          placeholder="Or type the time"
          className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3"
        />
      </label>
    </>
  )
}

function LogWho({
  classOpen,
  className,
  pool,
  selected,
  allAthletes,
  pickQuery,
  onPickQuery,
  onToggle,
  onSelectAll,
  onSelectNone,
  onAddPick,
  onRemovePick,
}: {
  classOpen: boolean
  className?: string
  pool: Athlete[]
  selected: string[]
  allAthletes: Athlete[]
  pickQuery: string
  onPickQuery: (v: string) => void
  onToggle: (id: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
  onAddPick: (row: Athlete) => void
  onRemovePick: (id: string) => void
}) {
  if (!classOpen) {
    return (
      <div>
        <div className="mb-1 flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Log for</p>
          <InfoHint>No class is open, so the roster stays hidden. Search a name to log one hold.</InfoHint>
        </div>
        {pool.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {pool.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onRemovePick(a.id)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                    selected.includes(a.id) ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-white/10'
                  }`}
                >
                  {a.name.split(' ')[0]}
                  <IconMark kind="remove" className="text-[var(--bad)]" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <AthleteSearchField
          athletes={allAthletes}
          query={pickQuery}
          onQuery={onPickQuery}
          onPick={onAddPick}
          excludeIds={pool.map((a) => a.id)}
        />
      </div>
    )
  }
  return (
    <RosterPicks
      athletes={pool}
      selected={selected}
      onToggle={onToggle}
      onSelectAll={onSelectAll}
      onSelectNone={onSelectNone}
      emptyText={
        className
          ? 'Mark who is present on this class to log holds.'
          : 'No one marked present yet.'
      }
    />
  )
}

function AthleteSearchField({
  athletes,
  query,
  onQuery,
  onPick,
  excludeIds,
}: {
  athletes: Athlete[]
  query: string
  onQuery: (v: string) => void
  onPick: (row: Athlete) => void
  excludeIds: string[]
}) {
  const hits = query.trim()
    ? athletes
        .filter((a) => isAthleteProfile(a) && !excludeIds.includes(a.id) && athleteMatchesQuery(a, query))
        .slice(0, 8)
    : []
  return (
    <div>
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search an athlete to log"
        className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
      />
      {hits.length > 0 && (
        <ul className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1218]">
          {hits.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onPick(a)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/8"
              >
                <AthleteAvatar athlete={a} size="xs" />
                <span>{a.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RosterPicks({
  athletes,
  selected,
  onToggle,
  onSelectAll,
  onSelectNone,
  emptyText = 'No athletes on this list yet.',
}: {
  athletes: Athlete[]
  selected: string[]
  onToggle: (id: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
  emptyText?: string
}) {
  const allOn = athletes.length > 0 && selected.length === athletes.length
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Log for
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/45">
            {selected.length} of {athletes.length}
          </span>
          <button
            type="button"
            onClick={allOn ? onSelectNone : onSelectAll}
            className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white"
          >
            {allOn ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      </div>
      {athletes.length === 0 ? (
        <p className="text-sm text-white/55">{emptyText}</p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {athletes.map((a) => {
            const on = selected.includes(a.id)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onToggle(a.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                    on ? 'bg-white/12' : 'opacity-50'
                  }`}
                >
                  <AthleteName athlete={a} size="xs" className="min-w-0 flex-1" />
                  <span className="ml-auto text-[10px] uppercase tracking-wide">
                    {on ? 'On' : 'Off'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
