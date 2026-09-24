import { useMemo, useState } from 'react'
import type { Athlete, HomeworkItem, HomeworkLog } from '../../types'
import { homeworkTitle } from '../../lib/homeworkLabel'
import {
  canEditHomeworkLog,
  canReactToHomeworkLog,
  isLogToday,
  localDateKey,
  logsChrono,
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
  const [exerciseFilter, setExerciseFilter] = useState<string>('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const chrono = logsChrono(logs)
  const today = chrono.filter((log) => isLogToday(log))
  const scoped = scope === 'today' ? today : chrono

  const exerciseOptions = useMemo(() => {
    const names = new Set<string>()
    for (const log of scoped) {
      const item = items.find((row) => row.id === log.homeworkId)
      names.add(exerciseLabel(log, item))
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [scoped, items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scoped.filter((log) => {
      const item = items.find((row) => row.id === log.homeworkId)
      const label = exerciseLabel(log, item)
      if (exerciseFilter !== 'all' && label !== exerciseFilter) return false
      if (!q) return true
      const hay = `${label} ${log.journal ?? ''} ${log.sourceLabel ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [scoped, items, query, exerciseFilter])

  const groups = useMemo(() => {
    if (groupMode === 'day') return groupByDay(filtered)
    return groupByExercise(filtered, items)
  }, [filtered, groupMode, items])

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Your logs</p>
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
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                scope === id ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--text)]/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercise or notes…"
          className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0a1210] px-3 py-2 text-sm text-[var(--text)]"
        />
        <select
          value={exerciseFilter}
          onChange={(e) => setExerciseFilter(e.target.value)}
          className="rounded-lg border border-[var(--panel-border)] bg-[#0a1210] px-3 py-2 text-sm"
        >
          <option value="all">All exercises</option>
          {exerciseOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <div className="flex rounded-full bg-black/30 p-0.5">
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
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                groupMode === id ? 'bg-white/15 text-[var(--text)]' : 'text-[var(--text)]/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text)]/70">
          {scope === 'today'
            ? 'Nothing logged today. Start the stopwatch or train a drill, then it shows here.'
            : 'No logs match. Try another filter or search.'}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <section
              key={group.key}
              className="overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[#0a1210]"
            >
              <p className="border-b border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm font-semibold text-[#6ec8d6]">
                {group.heading}
              </p>
              <div className="hidden grid-cols-[4.5rem_minmax(0,1.4fr)_4.5rem_3rem_3rem] gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text)]/75 sm:grid">
                <span>Time</span>
                <span>Exercise</span>
                <span className="text-[#8fbf6a]">Hold</span>
                <span className="text-[#c49ae0]">Sets</span>
                <span className="text-[#e0b872]">Reps</span>
              </div>
              <ul className="divide-y divide-[var(--panel-border)]">
                {group.logs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    item={items.find((row) => row.id === log.homeworkId)}
                    items={items}
                    athlete={athlete}
                    viewer={viewer}
                    athletes={athletes}
                    showTitles={showTitles}
                    showDate={groupMode === 'exercise'}
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

function groupByDay(logs: HomeworkLog[]): { key: string; heading: string; logs: HomeworkLog[] }[] {
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
  return order.map((day) => ({
    key: day,
    heading: dayHeading(day),
    logs: map.get(day)!,
  }))
}

function groupByExercise(
  logs: HomeworkLog[],
  items: HomeworkItem[],
): { key: string; heading: string; logs: HomeworkLog[] }[] {
  const map = new Map<string, HomeworkLog[]>()
  const order: string[] = []
  for (const log of logs) {
    const item = items.find((row) => row.id === log.homeworkId)
    const label = exerciseLabel(log, item)
    if (!map.has(label)) {
      map.set(label, [])
      order.push(label)
    }
    map.get(label)!.push(log)
  }
  return order
    .sort((a, b) => a.localeCompare(b))
    .map((label) => ({
      key: label,
      heading: label,
      logs: map.get(label)!,
    }))
}

function LogRow({
  log,
  item,
  items,
  athlete,
  viewer,
  athletes,
  showTitles,
  showDate,
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
  confirmId: string | null
  editingId: string | null
  onConfirm: (id: string | null) => void
  onEdit: (id: string | null) => void
  onRemove?: (id: string) => void
  onLogsChange?: () => void
}) {
  const todayLog = isLogToday(log)
  const proper = logProperHoldSeconds(log)
  const isManual = log.method === 'manual'
  const label = exerciseLabel(log, item)
  const canEdit = canEditHomeworkLog(viewer, athlete, log)
  const editing = editingId === log.id

  const holdDisplay =
    log.totalHoldSeconds > 0 ? formatSeconds(log.totalHoldSeconds) : log.journal ? '—' : '—'
  const setsDisplay = log.sets && log.sets > 1 ? String(log.sets) : log.reps ? '1' : '—'
  const repsDisplay = log.reps ? String(log.reps) : '—'

  if (editing) {
    return (
      <li className="px-3 py-3">
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

  return (
    <li className={`px-3 py-2.5 ${todayLog ? 'bg-[#102820]/40' : ''}`}>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-[4.5rem_minmax(0,1.4fr)_4.5rem_3rem_3rem] sm:items-center sm:gap-2">
        <span className="text-sm font-medium tabular-nums text-[#6ec8d6]">
          {new Date(log.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          {showDate && (
            <span className="mt-0.5 block text-[10px] font-normal text-[var(--text)]/55">
              {dayHeading(localDateKey(log.date))}
            </span>
          )}
        </span>
        {showTitles ? (
          <span className="text-sm font-semibold leading-snug text-[var(--text)]">
            {label}
            {log.side ? ` · ${log.side === 'left' ? 'Left' : 'Right'}` : ''}
            {badgeRow(log)}
          </span>
        ) : (
          <span className="text-sm text-[var(--text)]">{badgeRow(log)}</span>
        )}
        <span className="text-sm font-semibold tabular-nums text-[#8fbf6a]">{holdDisplay}</span>
        <span className="text-sm font-semibold tabular-nums text-[#c49ae0]">{setsDisplay}</span>
        <span className="text-sm font-semibold tabular-nums text-[#e0b872]">{repsDisplay}</span>
      </div>
      {!isManual && log.totalHoldSeconds > 0 && (
        <div className="mt-1 sm:pl-[4.5rem]">
          <HoldProperTimes total={log.totalHoldSeconds} proper={proper} className="text-xs" />
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {canEdit && (
          <button
            type="button"
            className="text-xs font-semibold text-[var(--accent)] underline"
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
              className="text-xs text-[var(--text)]/70 underline"
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

function badgeRow(log: HomeworkLog) {
  const parts: string[] = []
  if (log.loggedFrom === 'lesson') {
    parts.push(log.coachName ? `Lesson · ${log.coachName}` : 'Lesson')
  } else if (log.loggedFrom === 'class') {
    parts.push(log.sourceLabel ?? 'In class')
  } else if (log.kind === 'sequence' && log.sourceLabel) {
    parts.push(log.sourceLabel)
  }
  if (log.method === 'manual') parts.push('Manual')
  if (!parts.length) return null
  return (
    <span className="mt-0.5 block text-xs font-normal text-[var(--text)]/60">{parts.join(' · ')}</span>
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
