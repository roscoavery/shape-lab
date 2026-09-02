import type { Athlete } from '../types'
import { normalizeInstagramHandle } from './flowShare'

const MENTION_RE = /@"([^"]+)"|@([a-zA-Z0-9._]+)/g

export function normalizeHandle(raw: string | undefined | null): string {
  return normalizeInstagramHandle(raw)
}

/** Instagram @ is the Shape Lab handle unless they set a different one. */
export function profileHandle(athlete: Athlete | null | undefined): string {
  if (!athlete) return ''
  return normalizeHandle(athlete.shapeLabHandle) || normalizeHandle(athlete.instagramHandle)
}

export function mentionLabel(athlete: Athlete): string {
  const handle = profileHandle(athlete)
  return handle ? `@${handle}` : `@"${athlete.name}"`
}

function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function compactName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function parseMentionTokens(text: string): string[] {
  const tokens: string[] = []
  const re = new RegExp(MENTION_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    const token = (match[1] || match[2] || '').trim()
    if (token) tokens.push(token)
  }
  return tokens
}

export function resolveProfileMention(token: string, athletes: Athlete[]): Athlete | null {
  const raw = token.trim()
  if (!raw) return null
  const handle = normalizeHandle(raw).toLowerCase()
  const named = nameKey(raw)
  const compact = compactName(raw)

  if (handle) {
    const byHandle = athletes.find((a) => profileHandle(a).toLowerCase() === handle)
    if (byHandle) return byHandle
  }

  const byName = athletes.find((a) => nameKey(a.name) === named)
  if (byName) return byName

  const byCompact = athletes.find((a) => compactName(a.name) === compact)
  if (byCompact) return byCompact

  const first = athletes.filter((a) => {
    const given = nameKey(a.firstName || a.name.split(/\s+/)[0] || '')
    return given && given === named
  })
  return first.length === 1 ? first[0]! : null
}

export function taggedIdsFromText(
  text: string,
  athletes: Athlete[],
  extra: string[] = [],
): string[] {
  const ids = new Set(extra.filter(Boolean))
  for (const token of parseMentionTokens(text)) {
    const found = resolveProfileMention(token, athletes)
    if (found) ids.add(found.id)
  }
  return [...ids]
}

export type MentionPart =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; value: string; athlete: Athlete | null }

export function splitMentions(text: string, athletes: Athlete[]): MentionPart[] {
  const parts: MentionPart[] = []
  const re = new RegExp(MENTION_RE.source, 'g')
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push({ kind: 'text', value: text.slice(last, match.index) })
    const token = (match[1] || match[2] || '').trim()
    parts.push({
      kind: 'mention',
      value: match[0],
      athlete: resolveProfileMention(token, athletes),
    })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) })
  return parts
}
