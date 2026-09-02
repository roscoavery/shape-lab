import type { Athlete, HomeworkLog, HomeworkLogReaction, HomeworkReactionKind } from '../types'
import { givenName } from './classStation'
import { formatHomeworkLogLine } from './coachLink'
import { pushNotice } from './notify'
import { loadAllHomework, loadHomeworkLogs, patchHomeworkLog } from './storage'

export const HOMEWORK_REACTIONS: {
  kind: HomeworkReactionKind
  emoji: string
  label: string
  verb: string
}[] = [
  { kind: 'hi5', emoji: '🙌', label: 'High five', verb: 'high-fived' },
  { kind: 'fist', emoji: '👊', label: 'Fist bump', verb: 'fist bumped' },
  { kind: 'flex', emoji: '💪', label: 'Flex', verb: 'flexed at' },
  { kind: 'like', emoji: '👍', label: 'Like', verb: 'liked' },
  { kind: 'heart', emoji: '❤️', label: 'Heart', verb: 'hearted' },
]

export function reactionMeta(kind: HomeworkReactionKind) {
  return HOMEWORK_REACTIONS.find((r) => r.kind === kind) ?? HOMEWORK_REACTIONS[0]!
}

export function reactionOnLog(
  log: HomeworkLog | null | undefined,
  fromId: string,
): HomeworkLogReaction | undefined {
  return (log?.reactions ?? []).find((r) => r.fromId === fromId)
}

export function reactToHomeworkLog(
  logId: string,
  from: Athlete,
  kind: HomeworkReactionKind,
): HomeworkLog | null {
  const log = loadHomeworkLogs().find((row) => row.id === logId)
  if (!log) return null
  const next: HomeworkLogReaction = {
    fromId: from.id,
    fromName: from.name,
    kind,
    createdAt: new Date().toISOString(),
  }
  const rest = (log.reactions ?? []).filter((r) => r.fromId !== from.id)
  const patched = patchHomeworkLog(logId, { reactions: [next, ...rest].slice(0, 24) })
  if (!patched) return null
  if (from.id !== log.athleteId) {
    const item = loadAllHomework().find((h) => h.id === log.homeworkId)
    const meta = reactionMeta(kind)
    const line = formatHomeworkLogLine(log, item)
    void pushNotice({
      toId: log.athleteId,
      kind,
      title: `${givenName(from)} ${meta.verb} your homework`,
      body: `${meta.emoji} ${line}`,
      href: 'homework',
      fromId: from.id,
      homeworkLogId: log.id,
      athleteId: log.athleteId,
    })
  }
  return patched
}
