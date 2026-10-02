import { useEffect, useRef, useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteAvatar, AthleteName } from '../AthleteAvatar'
import {
  CONTEST_HOLD_DRILLS,
  logClassHoldForAthletes,
} from '../../lib/classSessionLog'
import { formatSeconds } from '../../hooks/useHoldTimer'

type Phase = 'setup' | 'live' | 'done'

type Props = {
  athletes: Athlete[]
  signedIn: Athlete | null
  className?: string
  meetingId?: string
}

type DownEntry = { athleteId: string; seconds: number }

/**
 * Hold contest stopwatch for classes.
 *
 * The class clock logs one time for the whole class — wrong for contests,
 * because athletes who come down early would get the winner's time.
 * Here the coach taps each athlete's name the moment they come down and
 * that athlete's own time is logged to their homework on the spot.
 */
export function ContestStopwatch({ athletes, signedIn, className, meetingId }: Props) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [drillId, setDrillId] = useState<string>('wall_handstand')
  const [picked, setPicked] = useState<string[]>([])
  const [inIds, setInIds] = useState<string[]>([])
  const [down, setDown] = useState<DownEntry[]>([])
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const drill = CONTEST_HOLD_DRILLS.find((d) => d.id === drillId) ?? CONTEST_HOLD_DRILLS[0]
  const holdName = drill.id === 'wall_handstand' ? 'Wall handstand contest' : `${drill.label} contest`

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const start = () => {
    if (!picked.length) return
    startRef.current = Date.now()
    setInIds([...picked])
    setDown([])
    setElapsed(0)
    setPhase('live')
    timerRef.current = window.setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000)
    }, 100)
  }

  const stopClock = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  /** Athlete came down — freeze their time and log it to their homework now. */
  const tapDown = (athleteId: string) => {
    const seconds = (Date.now() - startRef.current) / 1000
    logClassHoldForAthletes({
      athleteIds: [athleteId],
      autoKey: drill.autoKey,
      seconds,
      label: holdName,
      className,
      meetingId,
      coachId: signedIn?.id,
      coachName: signedIn?.name,
    })
    setDown((d) => [...d, { athleteId, seconds }])
    setInIds((ids) => {
      const rest = ids.filter((x) => x !== athleteId)
      if (rest.length === 0) {
        stopClock()
        setPhase('done')
      }
      return rest
    })
  }

  /** End early — anyone still up keeps the current clock time. */
  const endEarly = () => {
    const seconds = (Date.now() - startRef.current) / 1000
    for (const athleteId of inIds) {
      logClassHoldForAthletes({
        athleteIds: [athleteId],
        autoKey: drill.autoKey,
        seconds,
        label: holdName,
        className,
        meetingId,
        coachId: signedIn?.id,
        coachName: signedIn?.name,
      })
    }
    setDown((d) => [...d, ...inIds.map((athleteId) => ({ athleteId, seconds }))])
    setInIds([])
    stopClock()
    setPhase('done')
  }

  const reset = () => {
    stopClock()
    setPhase('setup')
    setPicked([])
    setInIds([])
    setDown([])
    setElapsed(0)
  }

  const byId = new Map(athletes.map((a) => [a.id, a]))
  const ranked = [...down].sort((a, b) => b.seconds - a.seconds)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Hold contest
      </p>
      <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">
        {phase === 'setup' && 'Pick the hold and the athletes'}
        {phase === 'live' && `${drill.label} contest — tap names as they come down`}
        {phase === 'done' && `${drill.label} contest — results`}
      </h3>

      {phase === 'setup' && (
        <div className="mt-3 flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Hold</p>
            <div className="flex flex-wrap gap-2">
              {CONTEST_HOLD_DRILLS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDrillId(d.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    d.id === drillId
                      ? 'bg-[var(--accent)] text-black'
                      : 'bg-white/10 text-white/80'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Athletes ({picked.length})
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPicked(athletes.map((a) => a.id))}
                  className="text-xs font-semibold text-[var(--accent)]"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setPicked([])}
                  className="text-xs font-semibold text-white/50"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {athletes.map((a) => {
                const on = picked.includes(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => togglePick(a.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left ${
                      on ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-white/10 bg-black/20'
                    }`}
                  >
                    <AthleteAvatar athlete={a} size="sm" />
                    <span className="truncate text-sm font-medium">
                      <AthleteName athlete={a} />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <button
            type="button"
            disabled={!picked.length}
            onClick={start}
            className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-black text-black disabled:opacity-40"
          >
            Start the clock — {picked.length} in
          </button>
        </div>
      )}

      {phase === 'live' && (
        <div className="mt-3 flex flex-col gap-4">
          <div className="text-center">
            <p className="font-mono text-5xl font-black tabular-nums text-[var(--text)]">
              {formatSeconds(elapsed)}
            </p>
            <p className="mt-1 text-xs text-white/50">
              {inIds.length} still up · tap a name the moment they come down
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {inIds.map((id) => {
              const a = byId.get(id)
              if (!a) return null
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => tapDown(id)}
                  className="sl-names-glow flex items-center gap-2 !rounded-xl px-3 py-3 text-left"
                >
                  <AthleteAvatar athlete={a} size="sm" />
                  <span className="truncate text-sm font-bold">
                    <AthleteName athlete={a} />
                  </span>
                </button>
              )
            })}
          </div>
          {down.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">
                Down ({down.length})
              </p>
              <ul className="flex flex-col gap-1">
                {[...down].reverse().map((d) => {
                  const a = byId.get(d.athleteId)
                  return (
                    <li
                      key={d.athleteId}
                      className="flex items-center justify-between rounded-lg bg-black/25 px-3 py-1.5 text-sm"
                    >
                      <span className="text-white/70">{a ? <AthleteName athlete={a} /> : '—'}</span>
                      <span className="font-mono font-bold tabular-nums">{formatSeconds(d.seconds)}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={endEarly}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/70"
          >
            End contest — log current time for everyone still up
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="mt-3 flex flex-col gap-3">
          <ol className="flex flex-col gap-1.5">
            {ranked.map((d, i) => {
              const a = byId.get(d.athleteId)
              return (
                <li
                  key={d.athleteId}
                  className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2"
                >
                  <span className="w-6 text-center text-lg font-black text-[var(--accent)]">
                    {i + 1}
                  </span>
                  <AthleteAvatar athlete={a ?? null} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium">
                    {a ? <AthleteName athlete={a} /> : '—'}
                  </span>
                  <span className="font-mono font-bold tabular-nums">{formatSeconds(d.seconds)}</span>
                </li>
              )
            })}
          </ol>
          <p className="text-xs text-white/50">
            Each time is logged to that athlete's homework as in class.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
          >
            Run another contest
          </button>
        </div>
      )}
    </div>
  )
}
