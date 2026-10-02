import { useMemo } from 'react'
import type { HomeworkLog } from '../../types'
import {
  perShapeHoldStats,
  windowHoldTotals,
  monthlyHoldHistory,
  repTotals,
  formatSecondsShort,
  shortDate,
} from '../../lib/holdStats'

/**
 * Hold analytics with an arcade/rave vibe: neon glows, pulsing records,
 * big numbers. Every number still says what it is and when — the rave
 * is the presentation, not a substitute for clarity.
 */

const NEON_GREEN = '0 0 12px rgba(74,222,128,0.55), 0 0 32px rgba(74,222,128,0.25)'
const NEON_GOLD = '0 0 12px rgba(251,191,36,0.55), 0 0 32px rgba(251,191,36,0.25)'
const NEON_PURPLE = '0 0 12px rgba(180,140,232,0.55), 0 0 32px rgba(180,140,232,0.25)'

function deltaLabel(cur: number, prev: number): string | null {
  if (prev <= 0) return cur > 0 ? 'new' : null
  const d = cur - prev
  if (d === 0) return 'even'
  return `${d > 0 ? '+' : ''}${formatSecondsShort(d)}`
}

function isRecent(iso: string): boolean {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return false
  return Date.now() - t < 30 * 24 * 3600 * 1000
}

export function AthleteHoldStats({ logs }: { logs: HomeworkLog[] }) {
  const shapes = useMemo(() => perShapeHoldStats(logs), [logs])
  const windows = useMemo(() => windowHoldTotals(logs), [logs])
  const months = useMemo(() => monthlyHoldHistory(logs), [logs])
  const reps = useMemo(() => repTotals(logs), [logs])
  const maxMonth = Math.max(1, ...months.map((m) => m.seconds))

  if (shapes.length === 0 && reps.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No holds or reps logged yet — your stats will light up here as you train.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Per-shape cards */}
      {shapes.length > 0 && (
        <div>
          <h4
            className="text-sm font-bold uppercase tracking-widest text-[var(--text)]"
            style={{ textShadow: NEON_PURPLE }}
          >
            By shape
          </h4>
          <ul className="mt-3 space-y-3">
            {shapes.map((s) => {
              const delta = s.latestSeconds - s.firstSeconds
              const recordRecent = isRecent(s.longestDate)
              return (
                <li
                  key={s.shapeId}
                  className="rounded-2xl border bg-[#0d1218] p-4"
                  style={{
                    borderColor: 'rgba(180,140,232,0.35)',
                    boxShadow: '0 0 18px rgba(180,140,232,0.12)',
                  }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-base font-bold text-[var(--text)]">{s.name}</span>
                    <span className="text-xs tabular-nums text-[var(--muted)]">
                      {s.count} session{s.count === 1 ? '' : 's'} · {formatSecondsShort(s.totalSeconds)} total
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div
                      className="rounded-xl bg-black/40 px-2 py-2"
                      style={{ boxShadow: 'inset 0 0 18px rgba(251,191,36,0.08)' }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300/80">Longest</p>
                      <p
                        className="text-2xl font-black tabular-nums text-amber-200"
                        style={{
                          textShadow: NEON_GOLD,
                          animation: recordRecent ? 'sl-skill-pulse 2.4s ease-in-out infinite' : undefined,
                        }}
                      >
                        {formatSecondsShort(s.longest)}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">{shortDate(s.longestDate)}</p>
                    </div>
                    <div className="rounded-xl bg-black/40 px-2 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Average</p>
                      <p className="text-2xl font-black tabular-nums text-[var(--text)]">
                        {formatSecondsShort(s.average)}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">per hold</p>
                    </div>
                    <div className="rounded-xl bg-black/40 px-2 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Latest</p>
                      <p
                        className="text-2xl font-black tabular-nums text-[var(--text)]"
                        style={s.latestSeconds >= s.longest && s.count > 1 ? { textShadow: NEON_GREEN } : undefined}
                      >
                        {formatSecondsShort(s.latestSeconds)}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">{shortDate(s.latestDate)}</p>
                    </div>
                  </div>
                  {s.count > 1 && (
                    <p className="mt-2.5 text-xs text-[var(--muted)]">
                      {delta > 0 ? (
                        <>Up <span className="font-black text-green-300" style={{ textShadow: NEON_GREEN }}>{formatSecondsShort(delta)}</span> since {shortDate(s.firstDate)} <span className="tabular-nums">({formatSecondsShort(s.firstSeconds)} → {formatSecondsShort(s.latestSeconds)})</span></>
                      ) : delta < 0 ? (
                        <><span className="font-black text-orange-300">{formatSecondsShort(delta)}</span> since {shortDate(s.firstDate)} — off days happen, next one counts</>
                      ) : (
                        <>Holding steady since {shortDate(s.firstDate)}</>
                      )}
                    </p>
                  )}
                  {recordRecent && (
                    <p
                      className="mt-1.5 text-[11px] font-black uppercase tracking-widest text-amber-200"
                      style={{ textShadow: NEON_GOLD, animation: 'sl-skill-pulse 2.4s ease-in-out infinite' }}
                    >
                      ★ Personal best
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Time comparisons */}
      <div>
        <h4
          className="text-sm font-bold uppercase tracking-widest text-[var(--text)]"
          style={{ textShadow: NEON_PURPLE }}
        >
          How the training stacks up
        </h4>
        <ul className="mt-3 space-y-2 text-sm">
          {[
            { label: 'Today vs yesterday', cur: windows.today, prev: windows.yesterday },
            { label: 'This week vs last week', cur: windows.thisWeek, prev: windows.lastWeek },
            { label: 'This month vs last month', cur: windows.thisMonth, prev: windows.lastMonth },
          ].map((r) => {
            const d = deltaLabel(r.cur, r.prev)
            const up = d != null && d !== 'even' && (d === 'new' || d.startsWith('+'))
            return (
              <li
                key={r.label}
                className="flex items-baseline justify-between gap-2 rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2.5"
              >
                <span className="font-semibold text-[var(--text)]">{r.label}</span>
                <span className="tabular-nums">
                  <span className="font-black text-[var(--text)]">{formatSecondsShort(r.cur)}</span>
                  <span className="text-[var(--muted)]"> vs {formatSecondsShort(r.prev)}</span>
                  {d && d !== 'even' && (
                    <span
                      className={`ml-2 font-black ${up ? 'text-green-300' : 'text-orange-300'}`}
                      style={{ textShadow: up ? NEON_GREEN : undefined }}
                    >
                      {d === 'new' ? 'NEW!' : d}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-1 text-[11px] text-[var(--muted)]">Total hold time across all shapes.</p>
      </div>

      {/* Monthly history chart */}
      <div>
        <h4
          className="text-sm font-bold uppercase tracking-widest text-[var(--text)]"
          style={{ textShadow: NEON_PURPLE }}
        >
          Monthly history
        </h4>
        <div className="mt-3 flex h-36 items-end gap-1 rounded-2xl border border-[var(--panel-border)] bg-[#0d1218] p-3">
          {months.map((m) => {
            const isPeak = m.seconds > 0 && m.seconds === maxMonth
            return (
              <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[9px] tabular-nums text-[var(--muted)]">
                  {m.seconds > 0 ? formatSecondsShort(m.seconds) : ''}
                </span>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(3, (m.seconds / maxMonth) * 92)}px`,
                    background: m.seconds > 0
                      ? 'linear-gradient(to top, rgba(180,140,232,0.55), rgba(180,140,232,0.95))'
                      : 'rgba(255,255,255,0.06)',
                    boxShadow: isPeak ? NEON_PURPLE : m.seconds > 0 ? '0 0 8px rgba(180,140,232,0.35)' : undefined,
                    animation: isPeak ? 'sl-skill-pulse 2.4s ease-in-out infinite' : undefined,
                  }}
                  title={`${m.label}: ${formatSecondsShort(m.seconds)}`}
                />
                <span className="text-[9px] text-[var(--muted)]">{m.label}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-1 text-[11px] text-[var(--muted)]">Total hold time per month — your training electric bill.</p>
      </div>

      {/* Rep totals */}
      {reps.length > 0 && (
        <div>
          <h4
            className="text-sm font-bold uppercase tracking-widest text-[var(--text)]"
            style={{ textShadow: NEON_GREEN }}
          >
            Reps logged
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            {reps.map((r) => (
              <li
                key={r.name}
                className="flex items-baseline justify-between gap-2 rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2.5"
              >
                <span className="font-semibold text-[var(--text)]">{r.name}</span>
                <span className="tabular-nums">
                  <span
                    className="text-lg font-black text-green-300"
                    style={{ textShadow: NEON_GREEN }}
                  >
                    {r.totalReps}
                  </span>
                  <span className="text-[var(--muted)]"> total · {r.sessions} session{r.sessions === 1 ? '' : 's'}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
