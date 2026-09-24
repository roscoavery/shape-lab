/**
 * Coach notes on how to make the app better.
 * Lives locally first so the dock never blocks a page. Gym file is best-effort.
 */

import { gymWriteFetch } from './gymWritePace'
import { createId } from './storage'

export type ImproveNote = {
  id: string
  page: string
  text: string
  createdAt: string
  updatedAt: string
  doneAt?: string | null
}

export type ImproveNotesFile = {
  kind: 'shape-lab-improve-notes'
  version: 1
  exportedAt: string
  notes: ImproveNote[]
}

const KEY = 'shape-lab.improveNotes.v1'
const listeners = new Set<() => void>()

function empty(): ImproveNotesFile {
  return { kind: 'shape-lab-improve-notes', version: 1, exportedAt: '', notes: [] }
}

function read(): ImproveNotesFile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const data = JSON.parse(raw) as ImproveNotesFile
    if (data?.kind !== 'shape-lab-improve-notes' || !Array.isArray(data.notes)) return empty()
    return { ...empty(), ...data, notes: data.notes }
  } catch {
    return empty()
  }
}

function write(file: ImproveNotesFile) {
  const next = { ...file, exportedAt: new Date().toISOString() }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  for (const cb of listeners) cb()
  void gymWriteFetch('/api/improve-notes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  }).catch(() => {})
}

export function subscribeImproveNotes(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function listImproveNotes(page?: string): ImproveNote[] {
  const notes = read().notes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (!page) return notes
  return notes.filter((n) => n.page === page)
}

export function addImproveNote(page: string, text: string): ImproveNote | null {
  const trimmed = text.trim().slice(0, 800)
  if (!trimmed) return null
  const now = new Date().toISOString()
  const row: ImproveNote = {
    id: createId('imp'),
    page,
    text: trimmed,
    createdAt: now,
    updatedAt: now,
  }
  const file = read()
  write({ ...file, notes: [row, ...file.notes] })
  return row
}

export function saveImproveNote(id: string, text: string): void {
  const trimmed = text.trim().slice(0, 800)
  const file = read()
  write({
    ...file,
    notes: file.notes.map((n) =>
      n.id === id ? { ...n, text: trimmed || n.text, updatedAt: new Date().toISOString() } : n,
    ),
  })
}

export function setImproveNoteDone(id: string, done: boolean): void {
  const file = read()
  write({
    ...file,
    notes: file.notes.map((n) =>
      n.id === id
        ? { ...n, doneAt: done ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }
        : n,
    ),
  })
}

export function deleteImproveNote(id: string): void {
  const file = read()
  write({ ...file, notes: file.notes.filter((n) => n.id !== id) })
}

export async function hydrateImproveNotes(): Promise<void> {
  try {
    const res = await fetch('/api/improve-notes')
    if (!res.ok) return
    const data = (await res.json()) as ImproveNotesFile
    if (data?.kind !== 'shape-lab-improve-notes' || !Array.isArray(data.notes)) return
    const local = read()
    const map = new Map(local.notes.map((n) => [n.id, n]))
    for (const row of data.notes) {
      if (!row?.id || !row.text) continue
      const keep = map.get(row.id)
      if (!keep || (row.updatedAt || row.createdAt) >= (keep.updatedAt || keep.createdAt)) {
        map.set(row.id, row)
      }
    }
    write({
      kind: 'shape-lab-improve-notes',
      version: 1,
      exportedAt: new Date().toISOString(),
      notes: [...map.values()],
    })
    markCoveredImproveNotes()
  } catch {
    /* offline */
  }
}

/** Notes written before this ship get checked off when the text matches what we just built. */
const COVERED: { keys: string[] }[] = [
  { keys: ['week', 'timeline'] },
  { keys: ['day view', 'timeline'] },
  { keys: ['swipe', 'v-up'] },
  { keys: ['push-up', 'swipe'] },
  { keys: ['hollow'] },
  { keys: ['curl up'] },
  { keys: ['wall sit'] },
  { keys: ['calf'] },
  { keys: ['nordic'] },
  { keys: ['slantboard'] },
  { keys: ['poliquin'] },
  { keys: ['tib'] },
  { keys: ['names test'] },
  { keys: ['calendar', 'phone'] },
  { keys: ['profiles', 'phone'] },
  { keys: ['skill path'] },
  { keys: ['dead mat'] },
  { keys: ['nutritionfacts'] },
  { keys: ['wellness', 'journal'] },
]

export function markCoveredImproveNotes(): void {
  const cutoff = '2026-09-24T08:00:00.000Z'
  const file = read()
  let changed = false
  const notes = file.notes.map((n) => {
    if (n.doneAt || n.createdAt > cutoff) return n
    const hay = n.text.toLowerCase()
    const hit = COVERED.some((row) => row.keys.every((k) => hay.includes(k)))
    if (!hit) return n
    changed = true
    return { ...n, doneAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  })
  if (!changed) return
  write({ ...file, notes })
}

export function pageLabel(page: string): string {
  const labels: Record<string, string> = {
    today: 'Today',
    learn: 'Learn',
    homework: 'Homework',
    history: 'Profiles',
    wellness: 'Body care',
    tasks2: 'Class flows',
    compare: 'Videos',
    more: 'More',
    classes: 'Classes',
    feed: 'Feed',
    skillpaths: 'Skill paths',
  }
  return labels[page] || page
}
