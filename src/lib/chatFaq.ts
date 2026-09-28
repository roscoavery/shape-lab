/**
 * FAQ inbox — questions the chat couldn't answer, for Ryan to review.
 * Ryan writes clearer answers here; answered items feed back into the
 * chat's answerable knowledge (see chatBrain.buildCorpus).
 */

import { createId } from './storage'

const FAQ_KEY = 'shape-lab.chatFaq.v1'

export type FaqItem = {
  id: string
  question: string
  status: 'open' | 'answered'
  answer?: string
  createdAt: string
  answeredAt?: string
}

function readAll(): FaqItem[] {
  try {
    const raw = localStorage.getItem(FAQ_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (i): i is FaqItem =>
        !!i && typeof i.id === 'string' && typeof i.question === 'string',
    )
  } catch {
    return []
  }
}

function writeAll(items: FaqItem[]) {
  try {
    localStorage.setItem(FAQ_KEY, JSON.stringify(items))
  } catch {
    /* private mode — inbox just won't persist */
  }
}

export function listFaq(): FaqItem[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addFaqQuestion(question: string): FaqItem | null {
  const q = question.trim()
  if (!q) return null
  const items = readAll()
  const dupe = items.find(
    (i) => i.status === 'open' && i.question.trim().toLowerCase() === q.toLowerCase(),
  )
  if (dupe) return dupe
  const item: FaqItem = {
    id: createId('faq'),
    question: q,
    status: 'open',
    createdAt: new Date().toISOString(),
  }
  writeAll([item, ...items])
  return item
}

export function answerFaq(id: string, answer: string): boolean {
  const a = answer.trim()
  if (!a) return false
  const items = readAll()
  const idx = items.findIndex((i) => i.id === id)
  if (idx < 0) return false
  items[idx] = {
    ...items[idx],
    status: 'answered',
    answer: a,
    answeredAt: new Date().toISOString(),
  }
  writeAll(items)
  return true
}

export function removeFaq(id: string) {
  writeAll(readAll().filter((i) => i.id !== id))
}

/** Ryan's written answers — these become answerable chat knowledge. */
export function readFaqAnswers(): FaqItem[] {
  return readAll().filter((i) => i.status === 'answered' && (i.answer ?? '').trim().length > 0)
}
