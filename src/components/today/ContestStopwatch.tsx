import { useEffect, useRef, useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteName } from '../AthleteAvatar'
import { AthleteSearchField } from './AthleteSearchField'
import { CONTEST_HOLD_DRILLS, CONTEST_HOLD_SPECS } from '../../lib/classSessionLog'
import { logSessionHold, type LessonClockContext } from '../../lib/sessionClockLog'
import { formatSeconds } from '../../hooks/useHoldTimer'

type Phase = 'setup' | 'live' | 'done'

type Props = {
  athletes: Athlete[]
  signedIn: Athlete | null
  className?: string
  meetingId?: string
  /** Lesson context: contest times log as lesson work instead of class work. */
  lesson?: LessonClockContext
  /** Fired after lesson-mode logging so the host can refresh. */
  onLessonActivity?: () => void
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
export function ContestStopwatch({ athletes, signedIn, className, meetingId, lesson, onLessonActivity }: Props) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [drillId, setDrillId] = useState<string>('wall_handstand')
  const [picked, setPicked] = useState<string[]>([])
  const [inIds, setInIds] = useState<string[]>([])
  const [down, setDown] = useState<DownEntry[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [query, setQuery] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestNames, setGuestNames] = useState<Record<string, string>>({})
  const startRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const drill = CONTEST_HOLD_DRILLS.find((d) => d.id === drillId) ?? CONTEST_HOLD_DRILLS[0]
  const [variationId, setVariationId] = useState<string | null>(null)
  const holdName = drill.id === 'wall_handstand' ? 'Wall handstand contest' : `${drill.label} contest`
  const variationLabel = CONTEST_HOLD_SPECS[drill.id]?.find((s) => s.id === variationId)?.label

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  const isGuestId = (id: string) => id.startsWith('guest:')

  const addAthlete = (a: Athlete) => {
    if (!picked.includes(a.id)) setPicked((p) => [...p, a.id])
    setQuery('')
  }

  const addGuest = () => {
    const name = guestName.trim()
    if (!name) return
    const id = `guest:${name.toLowerCase()}`
    setGuestNames((g) => ({ ...g, [id]: name }))
    if (!picked.includes(id)) setPicked((p) => [...p, id])
    setGuestName('')
  }

  const removePick = (id: string) => setPicked((p) => p.filter((x) => x !== id))

  const pickLabel = (id: string) =>
    isGuestId(id) ? (guestNames[id] ?? id.slice(6)) : (byId.get(id)?.name ?? '—')

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
    const label = variationLabel ? `${holdName} · ${variationLabel}` : holdName
    // Guests have no profile — their time shows in the results but isn't logged.
    if (!isGuestId(athleteId)) {
      const n = logSessionHold({
        athleteIds: [athleteId],
        autoKey: drill.autoKey,
        seconds,
        label,
        lesson,
        className,
        meetingId,
        coachId: signedIn?.id,
        coachName: signedIn?.name,
      })
      if (lesson && n > 0) onLessonActivity?.()
    }
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
    const loggable = inIds.filter((id) => !isGuestId(id))
    const label = variationLabel ? `${holdName} · ${variationLabel}` : holdName
    for (const athleteId of loggable) {
      const n = logSessionHold({
        athleteIds: [athleteId],
        autoKey: drill.autoKey,
        seconds,
        label,
        lesson,
        className,
        meetingId,
        coachId: signedIn?.id,
        coachName: signedIn?.name,
      })
      if (lesson && n > 0) onLessonActivity?.()
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

  /** Profile athletes and guests alike, for the live/done phases. */
  const playerOf = (id: string): { name: string; athlete: Athlete | null; guest: boolean } => {
    if (isGuestId(id)) {
      const name = guestNames[id] ?? id.slice('guest:'.length)
      return { name, athlete: { id, name } as Athlete, guest: true }
    }
    const a = byId.get(id)
    return { name: a?.name ?? '—', athlete: a ?? null, guest: false }
  }

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
                  onClick={() => {
                    setDrillId(d.id)
                    setVariationId(null)
                  }}
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
          {(CONTEST_HOLD_SPECS[drill.id]?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                Variation
              </p>
              <div className="flex flex-wrap gap-2">
                {CONTEST_HOLD_SPECS[drill.id]!.map((spec) => {
                  const on = variationId === spec.id
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => setVariationId(on ? null : spec.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        on ? 'bg-[var(--accent)] text-black' : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {spec.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Who's in ({picked.length})
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
            <AthleteSearchField
              athletes={athletes}
              query={query}
              onQuery={setQuery}
              onPick={addAthlete}
              excludeIds={picked}
              placeholder="Search athletes…"
              anyRole
            />
            <div className="mt-2 flex gap-2">
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                placeholder="Add someone without a profile"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addGuest}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"
              >
                Add
              </button>
            </div>
            {picked.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {picked.map((id) => {
                  const a = byId.get(id)
                  const guest = isGuestId(id)
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-xl bg-black/25 px-3 py-2"
                    >
                      <span className="flex-1 truncate text-sm font-medium">
                        {a && !guest ? <AthleteName athlete={a} /> : pickLabel(id)}
                      </span>
                      {guest && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                          Guest · won't log
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePick(id)}
                        className="text-sm font-bold text-white/40"
                        aria-label={`Remove ${pickLabel(id)}`}
                      >
                        ✕
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
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
              const p = playerOf(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => tapDown(id)}
                  className="sl-names-glow flex items-center gap-2 !rounded-xl px-3 py-3 text-left"
                >
                  <AthleteName athlete={p.athlete} />
                  {p.guest && (
                    <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/50">
                      Guest
                    </span>
                  )}
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
                  const p = playerOf(d.athleteId)
                  return (
                    <li
                      key={d.athleteId}
                      className="flex items-center justify-between rounded-lg bg-black/25 px-3 py-1.5 text-sm"
                    >
                      <span className="text-white/70">
                        <AthleteName athlete={p.athlete} />
                      </span>
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
              const p = playerOf(d.athleteId)
              return (
                <li
                  key={d.athleteId}
                  className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2"
                >
                  <span className="w-6 text-center text-lg font-black text-[var(--accent)]">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">
                    <AthleteName athlete={p.athlete} />
                  </span>
                  {p.guest && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                      Guest
                    </span>
                  )}
                  <span className="font-mono font-bold tabular-nums">{formatSeconds(d.seconds)}</span>
                </li>
              )
            })}
          </ol>
          <p className="text-xs text-white/50">
            Each time is logged to that athlete's homework as {lesson ? 'in this lesson' : 'in class'}. Guests aren't logged.
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
