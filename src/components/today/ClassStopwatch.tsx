import { useEffect, useMemo, useRef, useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteAvatar, AthleteName } from '../AthleteAvatar'
import {
  classLabel,
  getActiveMeeting,
  getOffering,
  resolveAttendeeAthletes,
} from '../../lib/coachClasses'
import {
  CLASS_HOLD_DRILLS,
  logClassHoldForAthletes,
  logClassRepsForAthletes,
  logClassSkillForAthlete,
} from '../../lib/classSessionLog'
import { publishTextPost } from '../../lib/feedPosts'
import { formatSeconds } from '../../hooks/useHoldTimer'

type Mode = 'hold' | 'vups' | 'skill'

type HoldId = (typeof CLASS_HOLD_DRILLS)[number]['id']

type Props = {
  athletes: Athlete[]
  signedIn: Athlete | null
  coach?: boolean
  variant?: 'card' | 'overlay'
  onClose?: () => void
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
}: Props) {
  const meeting = getActiveMeeting()
  const offering = meeting ? getOffering(meeting.offeringId) : null
  const className = offering ? classLabel(offering) : undefined
  const present = useMemo(
    () => (meeting ? resolveAttendeeAthletes(meeting, athletes) : []),
    [meeting, athletes],
  )
  const pool = present.length > 0
    ? present
    : coach
      ? athletes.filter((a) => a.role !== 'parent')
      : signedIn
        ? [signedIn]
        : []

  const [mode, setMode] = useState<Mode>('hold')
  const [holdId, setHoldId] = useState<HoldId>('hollow')
  const [side, setSide] = useState<'left' | 'right' | 'both'>('both')
  const [selected, setSelected] = useState<string[]>(() => pool.map((a) => a.id))
  const [running, setRunning] = useState(false)
  const [ms, setMs] = useState(0)
  const [offer, setOffer] = useState<number | null>(null)
  const [manual, setManual] = useState('')
  const [reps, setReps] = useState('10')
  const [skillAthleteId, setSkillAthleteId] = useState(pool[0]?.id ?? '')
  const [skillText, setSkillText] = useState('')
  const [postWins, setPostWins] = useState(true)
  const [bigWin, setBigWin] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const startRef = useRef<number | null>(null)
  const accRef = useRef(0)

  useEffect(() => {
    setSelected(pool.map((a) => a.id))
    if (!skillAthleteId && pool[0]) setSkillAthleteId(pool[0].id)
  }, [pool.map((a) => a.id).join('|')])

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

  const logHold = () => {
    const drill = CLASS_HOLD_DRILLS.find((d) => d.id === holdId)
    if (!drill) return
    const secs = Number(manual || offer)
    if (!Number.isFinite(secs) || secs <= 0) {
      setFlash('Start and stop the clock, or type the seconds.')
      return
    }
    if (selected.length === 0) {
      setFlash('Pick at least one athlete.')
      return
    }
    const n = logClassHoldForAthletes({
      athleteIds: selected,
      autoKey: drill.autoKey,
      seconds: secs,
      label: drill.label,
      className,
      meetingId: meeting?.id,
      side: drill.autoKey === 'side_plank' && side !== 'both' ? side : undefined,
    })
    reset()
    setFlash(
      `Logged ${drill.label} — ${formatSeconds(secs)} for ${n} athlete${n === 1 ? '' : 's'}. It shows on their homework as in class.`,
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
    const n = logClassRepsForAthletes({
      athleteIds: selected,
      catalogId: 'v_up',
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
    if (!skillAthleteId || !text) {
      setFlash('Pick the athlete and type what they did.')
      return
    }
    const log = logClassSkillForAthlete({
      athleteId: skillAthleteId,
      text,
      className,
      meetingId: meeting?.id,
    })
    if (!log) return
    const who = athletes.find((a) => a.id === skillAthleteId)
    if (postWins && signedIn) {
      const channels: ('gym' | 'wins')[] = bigWin ? ['wins', 'gym'] : ['wins']
      await publishTextPost({
        authorId: signedIn.id,
        caption: `${who?.name ?? 'Athlete'}: ${text}`,
        taggedIds: [skillAthleteId],
        channels,
      })
    }
    setSkillText('')
    setFlash(
      postWins
        ? `Logged for ${who?.name ?? 'them'} and posted to Wins${bigWin ? ' and the gym feed' : ''}.`
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
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              mode === id
                ? 'bg-[var(--accent)] text-[#06281f]'
                : 'border border-white/15 text-white/75'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'hold' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {CLASS_HOLD_DRILLS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setHoldId(d.id)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  holdId === d.id
                    ? 'bg-[var(--accent)] text-[#06281f]'
                    : 'bg-white/8'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {holdId === 'side_plank' && (
            <div className="flex gap-2">
              {(['left', 'right', 'both'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    side === s ? 'bg-white/20' : 'text-white/50'
                  }`}
                >
                  {s === 'both' ? 'Both sides' : s === 'left' ? 'Left' : 'Right'}
                </button>
              ))}
            </div>
          )}
          <p className="text-center font-mono text-5xl font-bold tabular-nums">
            {formatWatch(ms)}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {!running ? (
              <button
                type="button"
                onClick={start}
                className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-bold text-[#06281f]"
              >
                Start
              </button>
            ) : (
              <button
                type="button"
                onClick={stop}
                className="rounded-xl bg-[var(--bad)] px-5 py-2 text-sm font-bold text-white"
              >
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={reset}
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
              onChange={(e) => setManual(e.target.value)}
              placeholder="Or type the time"
              className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3"
            />
          </label>
          <RosterPicks athletes={pool} selected={selected} onToggle={toggle} />
          <button
            type="button"
            onClick={logHold}
            className="h-12 rounded-xl bg-[var(--accent)] text-sm font-bold text-[#06281f]"
          >
            Log hold for selected
          </button>
        </>
      )}

      {mode === 'vups' && (
        <>
          <p className="text-sm text-white/60">
            V-up counts change by class. Type the number this group just did.
          </p>
          <label className="block text-sm">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Reps
            </span>
            <input
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-lg"
            />
          </label>
          <RosterPicks athletes={pool} selected={selected} onToggle={toggle} />
          <button
            type="button"
            onClick={logVups}
            className="h-12 rounded-xl bg-[var(--accent)] text-sm font-bold text-[#06281f]"
          >
            Log V-ups for selected
          </button>
        </>
      )}

      {mode === 'skill' && (
        <>
          <p className="text-sm text-white/60">
            Pick who hit something, type it, and spam Wins. Check big win only
            when it belongs on the main gym feed too.
          </p>
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {pool.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSkillAthleteId(a.id)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                  skillAthleteId === a.id
                    ? 'bg-[var(--accent)] text-[#06281f]'
                    : 'bg-white/8'
                }`}
              >
                <AthleteAvatar athlete={a} size="xs" />
                <span className="font-semibold">{a.name}</span>
              </button>
            ))}
          </div>
          <textarea
            value={skillText}
            onChange={(e) => setSkillText(e.target.value)}
            rows={3}
            placeholder="First standing back tuck · stuck the layout · cartwheel on a beam…"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
          />
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
            className="h-12 rounded-xl bg-[var(--accent)] text-sm font-bold text-[#06281f]"
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
              {className ?? (coach ? 'Log holds for whoever you pick' : 'Quick stopwatch')}
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

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        Class clock
      </p>
      <h3 className="mt-1 text-lg font-semibold">
        {className ? `Holds for ${className}` : 'Stopwatch'}
      </h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Same idea as homework — time a hold, or skip the body position and just
        log the seconds. Everyone selected gets it on homework as in class.
      </p>
      <div className="mt-4">{body}</div>
    </section>
  )
}

function RosterPicks({
  athletes,
  selected,
  onToggle,
}: {
  athletes: Athlete[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
          Log for
        </p>
        <span className="text-xs text-white/45">
          {selected.length} of {athletes.length}
        </span>
      </div>
      {athletes.length === 0 ? (
        <p className="text-sm text-white/55">No athletes on this list yet.</p>
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
