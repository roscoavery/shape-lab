import { useMemo, useState } from 'react'
import type { Athlete, HomeworkItem, HomeworkLog } from '../../types'
import { homeworkTitle } from '../../lib/homeworkLabel'
import { flowIdForHomeworkItem } from '../../lib/homeworkFlow'
import {
  canEditHomeworkLog,
  canReactToHomeworkLog,
  isLogToday,
  localDateKey,
  logsChrono,
  todayDateKey,
  viewerOwnsHomeworkLog,
} from '../../lib/homeworkLogView'
import { dayHeading } from '../../lib/familySchedule'
import { ensureAutoHomework, logProperHoldSeconds, patchHomeworkLog } from '../../lib/storage'
import { formatSeconds, roundHoldSecondsUp } from '../../hooks/useHoldTimer'
import { HoldProperTimes } from '../HoldProperTimes'
import { HomeworkLogReactions } from './HomeworkLogReactions'

type Scope = 'today' | 'all'
type GroupMode = 'day' | 'exercise'

type Props = {
  logs: HomeworkLog[]
  items?: HomeworkItem[]
  athlete?: Athlete | null
  viewer?: Athlete | null
  athletes?: Athlete[]
  showTitles?: boolean
  onRemove?: (id: string) => void
  onLogsChange?: () => void
}

function exerciseLabel(log: HomeworkLog, item?: HomeworkItem): string {
  if (item) return homeworkTitle(item)
  if (log.sourceLabel?.trim()) return log.sourceLabel.trim()
  return log.shapeId.replace(/^catalog_/, '').replace(/_/g, ' ')
}

/** Consecutive days with at least one log, ending today (or yesterday if today is empty). */
function dayStreak(logs: HomeworkLog[]): number {
  const days = new Set(logs.map((l) => localDateKey(l.date)))
  if (days.size === 0) return 0
  const cursor = new Date()
  if (!days.has(todayDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  for (;;) {
    const key = todayDateKey(cursor)
    if (!days.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
    if (streak > 365) break
  }
  return streak
}

function weekWindow(now: Date, weeksBack: number): { start: Date; end: Date } {
  const end = new Date(now)
  end.setDate(end.getDate() - weeksBack * 7)
  const start = new Date(end)
  start.setDate(start.getDate() - 7)
  return { start, end }
}

function encouragement(logs: HomeworkLog[]): { headline: string; sub: string } | null {
  if (logs.length === 0) return null
  const streak = dayStreak(logs)
  const now = new Date()
  const thisWk = weekWindow(now, 0)
  const lastWk = weekWindow(now, 1)
  const inWin = (w: { start: Date; end: Date }) =>
    logs.filter((l) => {
      const t = new Date(l.date).getTime()
      return t >= w.start.getTime() && t < w.end.getTime()
    })
  const thisLogs = inWin(thisWk)
  const lastLogs = inWin(lastWk)
  const holdOf = (rows: HomeworkLog[]) => rows.reduce((s, l) => s + (l.totalHoldSeconds || 0), 0)
  const improving = thisLogs.length > 0 && holdOf(thisLogs) >= holdOf(lastLogs) * 1.2

  if (streak >= 7)
    return {
      headline: `🔥 ${streak}-day streak`,
      sub: 'A full week of showing up — that is how skills get built.',
    }
  if (streak >= 3)
    return {
      headline: `🔥 ${streak} days in a row`,
      sub: improving
        ? 'And more mat time than last week. The work is working.'
        : 'Consistency is the whole game. Keep it rolling.',
    }
  if (streak === 2)
    return { headline: 'Two days running', sub: 'Nice rhythm — one more makes a streak.' }
  if (improving)
    return {
      headline: 'Trending up 📈',
      sub: 'More training time than last week. Progress loves company.',
    }
  if (dayStreak(logs) === 1)
    return { headline: 'Logged today ✅', sub: 'Every hold counts. See you tomorrow?' }
  return { headline: 'Welcome back', sub: 'One session today restarts the streak.' }
}

/** Previous best (before today) per exercise label, for "new best" badges. */
function previousBests(
  logs: HomeworkLog[],
  items: HomeworkItem[],
): Map<string, { hold: number; reps: number }> {
  const best = new Map<string, { hold: number; reps: number }>()
  for (const log of logs) {
    if (isLogToday(log)) continue
    const label = exerciseLabel(log, items.find((row) => row.id === log.homeworkId))
    const cur = best.get(label) ?? { hold: 0, reps: 0 }
    const reps = (log.sets && log.sets > 1 ? log.sets : 1) * (log.reps ?? 0)
    best.set(label, {
      hold: Math.max(cur.hold, log.totalHoldSeconds || 0),
      reps: Math.max(cur.reps, reps),
    })
  }
  return best
}

export function HomeworkLogList({
  logs,
  items = [],
  athlete,
  viewer,
  athletes = [],
  showTitles = true,
  onRemove,
  onLogsChange,
}: Props) {
  const [scope, setScope] = useState<Scope>(
    viewer && athlete && viewer.id === athlete.id ? 'all' : 'today',
  )
  const [groupMode, setGroupMode] = useState<GroupMode>('day')
  const [query, setQuery] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const chrono = logsChrono(logs)
  const today = chrono.filter((log) => isLogToday(log))
  const scoped = scope === 'today' ? today : chrono

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return scoped
    return scoped.filter((log) => {
      const item = items.find((row) => row.id === log.homeworkId)
      const label = exerciseLabel(log, item)
      const hay = `${label} ${log.journal ?? ''} ${log.sourceLabel ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [scoped, items, query])

  const groups = useMemo(() => {
    if (groupMode === 'day') return groupByDay(filtered, items)
    return groupByExercise(filtered, items)
  }, [filtered, groupMode, items])

  const pep = useMemo(() => encouragement(chrono), [chrono])
  const bests = useMemo(() => previousBests(chrono, items), [chrono, items])

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-[var(--text)]">Training log</p>
        <div className="flex rounded-full bg-black/30 p-0.5">
          {(
            [
              ['today', `Today${today.length ? ` · ${today.length}` : ''}`],
              ['all', `All${chrono.length ? ` · ${chrono.length}` : ''}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setScope(id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                scope === id ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--text)]/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {pep && (
        <div className="mt-3 rounded-xl border border-amber-200/20 bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-4 py-3">
          <p className="text-sm font-bold text-[var(--text)]">{pep.headline}</p>
          <p className="mt-0.5 text-xs text-[var(--text)]/70">{pep.sub}</p>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercise or notes…"
          className="min-w-0 flex-1 rounded-xl border border-[var(--panel-border)] bg-[#0a1210] px-3 py-2 text-sm text-[var(--text)]"
        />
        <div className="flex shrink-0 rounded-full bg-black/30 p-0.5">
          {(
            [
              ['day', 'By day'],
              ['exercise', 'By exercise'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setGroupMode(id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                groupMode === id ? 'bg-white/15 text-[var(--text)]' : 'text-[var(--text)]/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center">
          <p className="text-sm font-semibold text-[var(--text)]">
            {chrono.length === 0 ? 'No training logged yet' : 'Nothing matches'}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-[var(--text)]/65">
            {chrono.length === 0
              ? 'Log your first hold or set and it will show up here — streaks start with one session.'
              : 'Try a different search, or switch between Today and All.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-bold text-[#6ec8d6]">{group.heading}</p>
                {group.summary && (
                  <p className="text-xs text-[var(--text)]/55">{group.summary}</p>
                )}
              </div>
              <ul className="space-y-2">
                {group.logs.map((log) => (
                  <LogCard
                    key={log.id}
                    log={log}
                    item={items.find((row) => row.id === log.homeworkId)}
                    items={items}
                    athlete={athlete}
                    viewer={viewer}
                    athletes={athletes}
                    showTitles={showTitles}
                    showDate={groupMode === 'exercise'}
                    isNewBest={isNewBest(log, items, bests)}
                    confirmId={confirmId}
                    editingId={editingId}
                    onConfirm={setConfirmId}
                    onEdit={setEditingId}
                    onRemove={onRemove}
                    onLogsChange={onLogsChange}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function isNewBest(
  log: HomeworkLog,
  items: HomeworkItem[],
  bests: Map<string, { hold: number; reps: number }>,
): boolean {
  if (!isLogToday(log)) return false
  const label = exerciseLabel(log, items.find((row) => row.id === log.homeworkId))
  const prev = bests.get(label)
  if (!prev) return log.totalHoldSeconds > 0 || (log.reps ?? 0) > 0
  if (log.totalHoldSeconds > 0) return log.totalHoldSeconds > prev.hold && prev.hold > 0
  const reps = (log.sets && log.sets > 1 ? log.sets : 1) * (log.reps ?? 0)
  return reps > prev.reps && prev.reps > 0
}

type Group = { key: string; heading: string; summary: string; logs: HomeworkLog[] }

function groupSummary(logs: HomeworkLog[]): string {
  const hold = logs.reduce((s, l) => s + (l.totalHoldSeconds || 0), 0)
  const parts = [`${logs.length} session${logs.length === 1 ? '' : 's'}`]
  if (hold > 0) parts.push(`${formatSeconds(hold)} total hold`)
  return parts.join(' · ')
}

function groupByDay(logs: HomeworkLog[], _items: HomeworkItem[]): Group[] {
  const map = new Map<string, HomeworkLog[]>()
  const order: string[] = []
  for (const log of logs) {
    const day = localDateKey(log.date)
    if (!map.has(day)) {
      map.set(day, [])
      order.push(day)
    }
    map.get(day)!.push(log)
  }
  return order.map((day) => {
    const rows = map.get(day)!
    return { key: day, heading: dayHeading(day), summary: groupSummary(rows), logs: rows }
  })
}

function groupByExercise(logs: HomeworkLog[], items: HomeworkItem[]): Group[] {
  const map = new Map<string, HomeworkLog[]>()
  for (const log of logs) {
    const item = items.find((row) => row.id === log.homeworkId)
    const label = exerciseLabel(log, item)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(log)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, rows]) => {
      const best = Math.max(...rows.map((l) => l.totalHoldSeconds || 0))
      const summary =
        best > 0 ? `${groupSummary(rows)} · best ${formatSeconds(best)}` : groupSummary(rows)
      return { key: label, heading: label, summary, logs: rows }
    })
}

function LogCard({
  log,
  item,
  items,
  athlete,
  viewer,
  athletes,
  showTitles,
  showDate,
  isNewBest,
  confirmId,
  editingId,
  onConfirm,
  onEdit,
  onRemove,
  onLogsChange,
}: {
  log: HomeworkLog
  item?: HomeworkItem
  items: HomeworkItem[]
  athlete?: Athlete | null
  viewer?: Athlete | null
  athletes: Athlete[]
  showTitles: boolean
  showDate: boolean
  isNewBest: boolean
  confirmId: string | null
  editingId: string | null
  onConfirm: (id: string | null) => void
  onEdit: (id: string | null) => void
  onRemove?: (id: string) => void
  onLogsChange?: () => void
}) {
  const todayLog = isLogToday(log)
  const proper = logProperHoldSeconds(log)
  const label = exerciseLabel(log, item)
  const canEdit = canEditHomeworkLog(viewer, athlete, log)
  const editing = editingId === log.id

  const holdSecs = log.totalHoldSeconds || 0
  const sets = log.sets && log.sets > 1 ? log.sets : 0
  const reps = log.reps ?? 0
  const isRepLog = reps > 0 && holdSecs === 0
  /** One run, one card: reps AND hold time together (handstand/lever/lunge
   *  challenges, MC HS 5 reps). */
  const paired = reps > 0 && holdSecs > 0
  const isMcHs = !!item && flowIdForHomeworkItem(item) === 'flow_mc_hs_5reps'

  if (editing) {
    return (
      <li className="rounded-xl border border-[var(--panel-border)] bg-[#0a1210] px-3 py-3">
        <EditLogForm
          log={log}
          items={items}
          athlete={athlete}
          onCancel={() => onEdit(null)}
          onSaved={() => {
            onEdit(null)
            onLogsChange?.()
          }}
        />
      </li>
    )
  }

  const meta: string[] = []
  meta.push(
    new Date(log.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  )
  if (showDate) meta.push(dayHeading(localDateKey(log.date)))
  if (log.side) meta.push(log.side === 'left' ? 'Left side' : 'Right side')
  if (log.loggedFrom === 'lesson') meta.push(log.coachName ? `Lesson · ${log.coachName}` : 'Lesson')
  else if (log.loggedFrom === 'class') meta.push(log.sourceLabel ?? 'In class')
  else if (log.kind === 'sequence' && log.sourceLabel) meta.push(log.sourceLabel)
  if (log.method === 'manual') meta.push('Manual entry')

  return (
    <li
      className={`rounded-xl border px-3.5 py-3 ${
        todayLog
          ? 'border-[var(--accent)]/30 bg-[#10261f]'
          : 'border-[var(--panel-border)] bg-[#0a1210]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {showTitles && (
            <p className="text-[15px] font-bold leading-snug text-[var(--text)]">{label}</p>
          )}
          <p className="mt-0.5 text-xs text-[var(--text)]/55">{meta.join(' · ')}</p>
          {isNewBest && (
            <p className="mt-1.5 inline-block rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
              🎉 New best!
            </p>
          )}
        </div>
        {/* Hero stat: exercise + hold are the eye-catchers.
            Paired logs (reps + hold in one run) show both together. */}
        <div className="shrink-0 text-right">
          {isRepLog ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)]/50">
                Sets × Reps
              </p>
              <p className="text-2xl font-extrabold tabular-nums text-[#e0b872]">
                {sets > 0 ? `${sets} × ${reps}` : `${reps}`}
              </p>
              {sets === 0 && <p className="text-[11px] text-[var(--text)]/55">reps</p>}
            </>
          ) : paired && isMcHs ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)]/50">
                Handstands
              </p>
              <p className="text-2xl font-extrabold tabular-nums text-[#e0b872]">
                {reps}
                <span className="text-base font-bold text-[var(--text)]/50">/5</span>
              </p>
              <p className="text-[11px] font-semibold tabular-nums text-[#8fbf6a]">
                ≈{formatSeconds(holdSecs)} hold
              </p>
            </>
          ) : paired ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)]/50">
                Hold
              </p>
              <p className="text-2xl font-extrabold tabular-nums text-[#8fbf6a]">
                {formatSeconds(holdSecs)}
              </p>
              <p className="text-[11px] font-semibold text-[var(--text)]/60">
                {sets > 0 ? `${sets} × ` : ''}
                {reps} attempt{reps === 1 ? '' : 's'}
              </p>
            </>
          ) : holdSecs > 0 ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)]/50">
                Hold
              </p>
              <p className="text-2xl font-extrabold tabular-nums text-[#8fbf6a]">
                {formatSeconds(holdSecs)}
              </p>
              {sets > 0 && (
                <p className="text-[11px] font-semibold text-[var(--text)]/60">{sets} sets</p>
              )}
            </>
          ) : (
            <p className="text-xs italic text-[var(--text)]/50">journal</p>
          )}
        </div>
      </div>

      {!isRepLog && holdSecs > 0 && log.method !== 'manual' && (
        <div className="mt-1.5">
          <HoldProperTimes total={holdSecs} proper={proper} className="text-xs" />
        </div>
      )}

      {log.journal?.trim() && (
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--text)]/70">{log.journal.trim()}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {canEdit && (
          <button
            type="button"
            className="text-xs font-semibold text-[var(--accent)]"
            onClick={() => onEdit(log.id)}
          >
            Edit
          </button>
        )}
        {onRemove &&
          (confirmId === log.id ? (
            <>
              <button
                type="button"
                className="rounded bg-[var(--bad)] px-2 py-0.5 text-xs font-semibold text-white"
                onClick={() => {
                  onRemove(log.id)
                  onConfirm(null)
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="text-xs text-[var(--text)]/70 underline"
                onClick={() => onConfirm(null)}
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              className="text-xs text-[var(--text)]/60"
              onClick={() => onConfirm(log.id)}
            >
              Remove
            </button>
          ))}
      </div>
      {!viewerOwnsHomeworkLog(viewer, log) && (
        <HomeworkLogReactions
          log={log}
          athletes={athletes}
          viewer={viewer ?? null}
          canReact={canReactToHomeworkLog(viewer, athlete, log)}
          onChanged={onLogsChange}
        />
      )}
    </li>
  )
}

function EditLogForm({
  log,
  items,
  athlete,
  onCancel,
  onSaved,
}: {
  log: HomeworkLog
  items: HomeworkItem[]
  athlete?: Athlete | null
  onCancel: () => void
  onSaved: () => void
}) {
  const pickItems = useMemo(() => {
    if (items.length) return items
    if (athlete?.id) return ensureAutoHomework(athlete.id)
    return items
  }, [items, athlete])
  const [homeworkId, setHomeworkId] = useState(log.homeworkId)
  const [hold, setHold] = useState(
    log.totalHoldSeconds ? String(roundHoldSecondsUp(log.totalHoldSeconds)) : '',
  )
  const [sets, setSets] = useState(log.sets ? String(log.sets) : '')
  const [reps, setReps] = useState(log.reps ? String(log.reps) : '')
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const item = pickItems.find((row) => row.id === homeworkId)
    if (!item) {
      setError('Pick which exercise this was.')
      return
    }
    const holdN = hold.trim() ? roundHoldSecondsUp(Number(hold)) : 0
    const repsN = reps.trim() ? Number(reps) : undefined
    const setsN = sets.trim() ? Number(sets) : undefined
    if (hold.trim() && (!Number.isFinite(holdN) || holdN < 0)) {
      setError('Hold time must be a number.')
      return
    }
    if (reps.trim() && (!Number.isFinite(repsN) || (repsN ?? 0) <= 0)) {
      setError('Reps must be a positive number.')
      return
    }
    const kind =
      repsN && repsN > 0 ? 'reps' : holdN > 0 ? 'hold' : log.kind ?? 'hold'
    patchHomeworkLog(log.id, {
      homeworkId: item.id,
      shapeId: item.shapeId,
      totalHoldSeconds: holdN,
      reps: repsN,
      sets: setsN && setsN > 1 ? setsN : undefined,
      kind,
    })
    onSaved()
  }

  return (
    <div className="rounded-lg border border-[var(--accent)]/40 bg-[#121820] p-3">
      <p className="text-sm font-semibold text-[var(--text)]">Fix this log</p>
      <p className="mt-1 text-xs text-[var(--text)]/65">Wrong exercise? Change it here — holds round up to 0.01s.</p>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <label className="mt-3 block text-xs font-semibold text-[var(--text)]/70">
        Exercise
        <select
          value={homeworkId}
          onChange={(e) => setHomeworkId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0a1210] px-2 py-2 text-sm"
        >
          {pickItems.map((row) => (
            <option key={row.id} value={row.id}>{homeworkTitle(row)}</option>
          ))}
        </select>
      </label>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <label className="text-xs font-semibold text-[#8fbf6a]">
          Hold (s)
          <input
            value={hold}
            onChange={(e) => setHold(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0a1210] px-2 py-2 text-sm tabular-nums"
          />
        </label>
        <label className="text-xs font-semibold text-[#c49ae0]">
          Sets
          <input
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0a1210] px-2 py-2 text-sm tabular-nums"
          />
        </label>
        <label className="text-xs font-semibold text-[#e0b872]">
          Reps
          <input
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0a1210] px-2 py-2 text-sm tabular-nums"
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--on-accent)]"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-[var(--text)]/70 underline">
          Cancel
        </button>
      </div>
    </div>
  )
}
