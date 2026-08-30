/**
 * Common corrections for a lesson note.
 * Library cues come from the shape. Cues you write stay on your profile.
 */

import { getShape } from '../config/shapes'
import { SEQUENCES } from '../config/sequences'
import { getCoachShape } from './coachContentStore'
import { howToHitShape } from './educationCopy'
import { topicKey, type SkillTopic } from '../components/lesson/SkillPicker'

const KEY = 'shape-lab.noteCues.v1'
const MAX_PER_TOPIC = 20

type File = {
  kind: 'shape-lab-note-cues'
  byCoach: Record<string, Record<string, string[]>>
}

export type NoteCue = {
  text: string
  source: 'yours' | 'shape'
}

function read(): File {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { kind: 'shape-lab-note-cues', byCoach: {} }
    const data = JSON.parse(raw) as File
    if (data?.kind !== 'shape-lab-note-cues' || !data.byCoach) {
      return { kind: 'shape-lab-note-cues', byCoach: {} }
    }
    return data
  } catch {
    return { kind: 'shape-lab-note-cues', byCoach: {} }
  }
}

function write(file: File) {
  try {
    localStorage.setItem(KEY, JSON.stringify(file))
  } catch {
    /* quota */
  }
}

export function cueTopicKey(topic: SkillTopic): string {
  return topicKey({
    topicKind: topic.kind,
    topicId: topic.id,
    topicLabel: topic.label,
  })
}

export function listSavedCues(coachId: string | null | undefined, topic: SkillTopic): string[] {
  if (!coachId || !topic.label.trim()) return []
  return read().byCoach[coachId]?.[cueTopicKey(topic)] ?? []
}

export function saveNoteCue(coachId: string | null | undefined, topic: SkillTopic, text: string) {
  const line = text.trim()
  if (!coachId || !topic.label.trim() || !line) return
  const file = read()
  const key = cueTopicKey(topic)
  const mine = file.byCoach[coachId] ?? {}
  const prev = mine[key] ?? []
  mine[key] = [line, ...prev.filter((x) => x.toLowerCase() !== line.toLowerCase())].slice(
    0,
    MAX_PER_TOPIC,
  )
  file.byCoach[coachId] = mine
  write(file)
}

function cameraTip(line: string): boolean {
  return /^(film|photograph|shoot|side view|front\.|standalone)/i.test(line.trim())
}

function libraryCues(topic: SkillTopic): string[] {
  const shapeId =
    topic.scoreShapeId || (topic.kind === 'shape' && topic.id ? topic.id : undefined)
  const shape = shapeId ? getShape(shapeId) : undefined
  if (shape) {
    return howToHitShape(shape)
      .filter((t) => !cameraTip(t) && t.length <= 180)
      .slice(0, 12)
  }
  if (topic.kind === 'sequence' && topic.id) {
    const seq = SEQUENCES.find((s) => s.id === topic.id)
    return seq?.description ? [seq.description] : []
  }
  if (topic.kind === 'coach' && topic.id) {
    const s = getCoachShape(topic.id)
    if (!s) return []
    return [s.bodyPosition, s.description, ...s.progressions.map((p) => `${p.title}: ${p.notes}`)]
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12)
  }
  return []
}

export function cuesForNote(topic: SkillTopic, coachId: string | null | undefined): NoteCue[] {
  if (!topic.label.trim()) return []
  const seen = new Set<string>()
  const out: NoteCue[] = []
  for (const text of listSavedCues(coachId, topic)) {
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ text, source: 'yours' })
  }
  for (const text of libraryCues(topic)) {
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ text, source: 'shape' })
  }
  return out
}
