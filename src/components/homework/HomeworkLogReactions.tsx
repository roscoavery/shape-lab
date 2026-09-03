import type { Athlete, HomeworkLog, HomeworkReactionKind } from '../../types'
import { AthleteAvatar } from '../AthleteAvatar'
import {
  HOMEWORK_REACTIONS,
  reactToHomeworkLog,
  reactionMeta,
  reactionOnLog,
} from '../../lib/homeworkReactions'
import { viewerOwnsHomeworkLog } from '../../lib/homeworkLogView'
import { playGestureBurst } from '../../lib/gestureBurst'

type Props = {
  log: HomeworkLog
  athletes: Athlete[]
  viewer: Athlete | null
  /** Coaches who work with this athlete can acknowledge the log. */
  canReact?: boolean
  onChanged?: () => void
}

export function HomeworkLogReactions({
  log,
  athletes,
  viewer,
  canReact = false,
  onChanged,
}: Props) {
  if (viewerOwnsHomeworkLog(viewer, log)) return null
  const reactions = log.reactions ?? []
  const mine = viewer ? reactionOnLog(log, viewer.id) : undefined

  const pick = (kind: HomeworkReactionKind) => {
    if (!viewer) return
    reactToHomeworkLog(log.id, viewer, kind)
    if (kind === 'hi5' || kind === 'fist') playGestureBurst(kind)
    onChanged?.()
  }

  if (reactions.length === 0 && !canReact) return null

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {reactions.map((row) => {
        const who = athletes.find((a) => a.id === row.fromId)
        const meta = reactionMeta(row.kind)
        return (
          <span
            key={`${row.fromId}-${row.kind}`}
            title={`${row.fromName} ${meta.verb} this`}
            className="inline-flex items-center rounded-full bg-white/8 py-0.5 pl-0.5 pr-1.5"
          >
            <span className="relative">
              <AthleteAvatar
                athlete={who ?? { name: row.fromName }}
                size="xs"
              />
              {meta.emoji ? (
                <span className="absolute -bottom-1 -right-1 text-[11px] leading-none">
                  {meta.emoji}
                </span>
              ) : (
                <span className="absolute -bottom-1 -right-1 rounded bg-black/70 px-0.5 text-[8px] font-bold leading-none text-[var(--accent)]">
                  {row.kind === 'hi5' ? '5' : '•'}
                </span>
              )}
            </span>
          </span>
        )
      })}
      {canReact && viewer && (
        <span className="inline-flex flex-wrap gap-0.5">
          {HOMEWORK_REACTIONS.map((r) => (
            <button
              key={r.kind}
              type="button"
              title={r.label}
              onClick={() => pick(r.kind)}
              className={`rounded-md px-1.5 py-0.5 text-sm ${
                mine?.kind === r.kind
                  ? 'bg-[var(--accent)]/25 ring-1 ring-[var(--accent)]'
                  : 'hover:bg-white/10'
              }`}
            >
              {r.emoji || (r.kind === 'hi5' ? 'Hi-5' : r.kind === 'fist' ? 'Bump' : r.label)}
            </button>
          ))}
        </span>
      )}
    </div>
  )
}
