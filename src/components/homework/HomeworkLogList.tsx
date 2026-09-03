import { useState } from 'react'
import type { Athlete, HomeworkItem, HomeworkLog } from '../../types'
import { homeworkTitle } from '../../lib/homeworkLabel'
import {
  canReactToHomeworkLog,
  isLogToday,
  logsChrono,
  viewerOwnsHomeworkLog,
} from '../../lib/homeworkLogView'
import { logProperHoldSeconds } from '../../lib/storage'
import { HoldProperTimes } from '../HoldProperTimes'
import { HomeworkLogReactions } from './HomeworkLogReactions'

type Scope = 'today' | 'all'

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

function logLine(log: HomeworkLog): string {
  if (log.reps) {
    const sets = log.sets && log.sets > 1 ? `${log.sets}×${log.reps}` : `${log.reps} rep${log.reps === 1 ? '' : 's'}`
    return log.qualityReps != null ? `${sets} (${log.qualityReps} quality)` : sets
  }
  if (log.journal) return log.journal
  return ''
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
  const [scope, setScope] = useState<Scope>('today')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const chrono = logsChrono(logs)
  const today = chrono.filter((log) => isLogToday(log))
  const shown = scope === 'today' ? today : chrono

  return (
    <div className="rounded-lg border border-[var(--panel-border)] bg-[#0d1614] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Your logs
        </p>
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
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                scope === id
                  ? 'bg-[var(--accent)] text-[#06281f]'
                  : 'text-[var(--muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">
          {scope === 'today'
            ? 'Nothing logged today. Start the stopwatch or train a drill, then it shows here.'
            : 'Nothing logged yet. After you log a hold or set, it shows here.'}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--panel-border)] border-t border-[var(--panel-border)]">
          {shown.map((log) => {
            const todayLog = isLogToday(log)
            const item = items.find((row) => row.id === log.homeworkId)
            const proper = logProperHoldSeconds(log)
            const isManual = log.method === 'manual'
            return (
              <li
                key={log.id}
                className={`py-2 ${
                  todayLog ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="min-w-0 text-[12px] leading-snug">
                    {showTitles && item ? (
                      <span
                        className={`mr-1.5 font-semibold ${
                          todayLog ? 'text-[var(--text)]' : 'text-[var(--text)]/80'
                        }`}
                      >
                        {homeworkTitle(item)}
                      </span>
                    ) : null}
                    <span className={todayLog ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}>
                      {new Date(log.date).toLocaleString()}
                    </span>
                    {log.side ? ` · ${log.side === 'left' ? 'L' : 'R'}` : ''}
                    {logLine(log) ? ` · ${logLine(log)}` : ''}
                    {log.loggedFrom === 'lesson' && (
                      <span className="ml-1.5 rounded bg-[#1a2a22] px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                        {log.coachName ? `lesson with ${log.coachName}` : 'lesson'}
                      </span>
                    )}
                    {log.loggedFrom === 'class' && (
                      <span className="ml-1.5 rounded bg-[#1a2a22] px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                        {log.sourceLabel ?? 'in class'}
                      </span>
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
          })}
        </ul>
      )}
    </div>
  )
}
