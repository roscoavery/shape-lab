import { useMemo, useState } from 'react'
import type { HomeworkItem, HomeworkLog, ReferencePhoto } from '../../types'
import { homeworkTitle, homeworkTrackMode, isSequenceHomework } from '../../lib/homeworkLabel'
import { formatSeconds } from '../../hooks/useHoldTimer'
import { ReferenceStill } from '../ReferenceStill'

type Props = {
  assigned: HomeworkItem[]
  core: HomeworkItem[]
  strength: HomeworkItem[]
  other: HomeworkItem[]
  photos: ReferencePhoto[]
  logsByItem: Map<string, HomeworkLog[]>
  onPick: (item: HomeworkItem) => void
  onAddHomework?: () => void
  onOther?: () => void
}

function lastHold(logs: HomeworkLog[]): number | null {
  return logs[0]?.totalHoldSeconds ?? null
}

function bestHold(logs: HomeworkLog[]): number {
  return logs.reduce((best, log) => Math.max(best, log.totalHoldSeconds), 0)
}

function logLine(log: HomeworkLog): string {
  if (log.reps) {
    const sets = log.sets && log.sets > 1 ? `${log.sets}×` : ''
    return `${sets}${log.reps} reps`
  }
  if (log.totalHoldSeconds > 0) return formatSeconds(log.totalHoldSeconds)
  return 'logged'
}

function DrillCard({
  item,
  photos,
  logs,
  logsOpen,
  onToggleLogs,
  onPick,
}: {
  item: HomeworkItem
  photos: ReferencePhoto[]
  logs: HomeworkLog[]
  logsOpen: boolean
  onToggleLogs: () => void
  onPick: () => void
}) {
  const title = homeworkTitle(item)
  const last = lastHold(logs)
  const best = bestHold(logs)
  const mode = homeworkTrackMode(item)
  const action = isSequenceHomework(item) ? 'Flow' : mode === 'hold' ? 'Train' : 'Log'

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#121820]">
      <button type="button" onClick={onPick} className="block w-full text-left">
        <div className="relative aspect-[4/3] bg-black">
          <ReferenceStill
            shapeId={item.shapeId}
            photos={photos}
            alt={title}
            className="h-full w-full object-contain"
            emptyLabel={title}
          />
        </div>
        <div className="px-3 pt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {action}
          </p>
          <p className="mt-0.5 text-base font-semibold leading-snug text-white">{title}</p>
          <p className="mt-1 text-xs tabular-nums text-white/55">
            {last != null ? `Last ${formatSeconds(last)}` : 'No logs yet'}
            {best > 0 ? ` · Best ${formatSeconds(best)}` : ''}
          </p>
        </div>
      </button>
      <div className="flex items-center justify-between px-3 pb-2.5 pt-2">
        <button
          type="button"
          onClick={onPick}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[#06281f]"
        >
          {action}
        </button>
        <button
          type="button"
          onClick={onToggleLogs}
          className="text-xs font-semibold text-white/60"
        >
          {logsOpen ? 'Hide times' : logs.length ? `${logs.length} log${logs.length === 1 ? '' : 's'}` : 'Times'}
        </button>
      </div>
      {logsOpen ? (
        <ul className="border-t border-white/8 px-3 py-2">
          {logs.length === 0 ? (
            <li className="py-1 text-xs text-white/45">Nothing logged yet.</li>
          ) : (
            logs.slice(0, 8).map((log) => (
              <li
                key={log.id}
                className="flex items-baseline justify-between gap-2 py-1 text-xs"
              >
                <span className="text-white/45">
                  {new Date(log.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {log.side ? ` · ${log.side === 'left' ? 'L' : 'R'}` : ''}
                  {log.loggedFrom === 'class' ? ' · class' : ''}
                  {log.loggedFrom === 'lesson' ? ' · lesson' : ''}
                </span>
                <span className="tabular-nums font-semibold text-white">{logLine(log)}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </article>
  )
}

function Section({
  title,
  items,
  photos,
  logsByItem,
  openId,
  onToggleLogs,
  onPick,
}: {
  title: string
  items: HomeworkItem[]
  photos: ReferencePhoto[]
  logsByItem: Map<string, HomeworkLog[]>
  openId: string | null
  onToggleLogs: (id: string) => void
  onPick: (item: HomeworkItem) => void
}) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <DrillCard
            key={item.id}
            item={item}
            photos={photos}
            logs={logsByItem.get(item.id) ?? []}
            logsOpen={openId === item.id}
            onToggleLogs={() => onToggleLogs(item.id)}
            onPick={() => onPick(item)}
          />
        ))}
      </div>
    </section>
  )
}

export function TrainPicker({
  assigned,
  core,
  strength,
  other,
  photos,
  logsByItem,
  onPick,
  onAddHomework,
  onOther,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const recent = useMemo(() => {
    const rows: { item: HomeworkItem; log: HomeworkLog }[] = []
    for (const item of [...assigned, ...core, ...strength, ...other]) {
      for (const log of logsByItem.get(item.id) ?? []) {
        rows.push({ item, log })
      }
    }
    return rows
      .sort((a, b) => +new Date(b.log.date) - +new Date(a.log.date))
      .slice(0, 6)
  }, [assigned, core, strength, other, logsByItem])

  const toggleLogs = (id: string) => setOpenId((prev) => (prev === id ? null : id))

  return (
    <div className="flex flex-col gap-5">
      {recent.length > 0 ? (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Recent
          </p>
          <ul className="mt-2 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/10 bg-[#121820]">
            {recent.map(({ item, log }) => (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => toggleLogs(item.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <span className="min-w-0 truncate text-sm font-semibold text-white">
                    {homeworkTitle(item)}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-white/55">
                    {logLine(log)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Section
        title="Assigned"
        items={assigned}
        photos={photos}
        logsByItem={logsByItem}
        openId={openId}
        onToggleLogs={toggleLogs}
        onPick={onPick}
      />
      <Section
        title="Core"
        items={core}
        photos={photos}
        logsByItem={logsByItem}
        openId={openId}
        onToggleLogs={toggleLogs}
        onPick={onPick}
      />
      <Section
        title="Reps"
        items={strength}
        photos={photos}
        logsByItem={logsByItem}
        openId={openId}
        onToggleLogs={toggleLogs}
        onPick={onPick}
      />
      <Section
        title="More"
        items={other}
        photos={photos}
        logsByItem={logsByItem}
        openId={openId}
        onToggleLogs={toggleLogs}
        onPick={onPick}
      />

      <div className="flex flex-wrap gap-2">
        {onOther ? (
          <button
            type="button"
            onClick={onOther}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Other
          </button>
        ) : null}
        {onAddHomework ? (
          <button
            type="button"
            onClick={onAddHomework}
            className="rounded-xl bg-white/8 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Add homework
          </button>
        ) : null}
      </div>
    </div>
  )
}
