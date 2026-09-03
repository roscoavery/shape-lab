/**
 * Camp / clinic / travel groups. Athletes stay on their home gym.
 * Being on an event does not put them on Tumble Smart’s Today desk.
 */

import { createId } from './storage'
import { TUMBLE_SMART } from '../config/gyms'

export type TrainingEvent = {
  id: string
  name: string
  hostGym?: string
  athleteIds: string[]
  coachIds: string[]
  createdAt: string
  updatedAt?: string
}

export type TrainingEventFile = {
  kind: 'shape-lab-training-events'
  version: 1
  exportedAt: string
  events: TrainingEvent[]
}

const KEY = 'shape-lab.trainingEvents.v1'
const listeners = new Set<() => void>()

function emptyFile(): TrainingEventFile {
  return {
    kind: 'shape-lab-training-events',
    version: 1,
    exportedAt: '',
    events: [],
  }
}

function read(): TrainingEventFile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyFile()
    const data = JSON.parse(raw) as TrainingEventFile
    if (data?.kind !== 'shape-lab-training-events' || !Array.isArray(data.events)) return emptyFile()
    return {
      ...emptyFile(),
      exportedAt: data.exportedAt ?? '',
      events: data.events.filter((e) => e && typeof e.id === 'string' && e.name),
    }
  } catch {
    return emptyFile()
  }
}

function write(file: TrainingEventFile) {
  const next = { ...file, exportedAt: new Date().toISOString() }
  localStorage.setItem(KEY, JSON.stringify(next))
  for (const cb of listeners) cb()
  void fetch('/api/training-events', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  }).catch(() => {})
}

export function subscribeTrainingEvents(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function listTrainingEvents(): TrainingEvent[] {
  return [...read().events].sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
}

export function getTrainingEvent(id: string | null | undefined): TrainingEvent | null {
  if (!id) return null
  return read().events.find((e) => e.id === id) ?? null
}

export function saveTrainingEvent(row: TrainingEvent): TrainingEvent {
  const file = read()
  const next = { ...row, updatedAt: new Date().toISOString() }
  write({
    ...file,
    events: [next, ...file.events.filter((e) => e.id !== next.id)],
  })
  return next
}

export function createTrainingEvent(opts: {
  name: string
  coachId: string
  hostGym?: string
  athleteIds?: string[]
}): TrainingEvent {
  const now = new Date().toISOString()
  return saveTrainingEvent({
    id: createId('evt'),
    name: opts.name.trim(),
    hostGym: opts.hostGym?.trim() || TUMBLE_SMART,
    athleteIds: [...new Set(opts.athleteIds ?? [])],
    coachIds: [opts.coachId],
    createdAt: now,
    updatedAt: now,
  })
}

export function deleteTrainingEvent(id: string) {
  const file = read()
  write({ ...file, events: file.events.filter((e) => e.id !== id) })
}

export function setEventAthletes(id: string, athleteIds: string[]): TrainingEvent | null {
  const event = getTrainingEvent(id)
  if (!event) return null
  return saveTrainingEvent({ ...event, athleteIds: [...new Set(athleteIds)] })
}

export function toggleEventAthlete(id: string, athleteId: string): TrainingEvent | null {
  const event = getTrainingEvent(id)
  if (!event) return null
  const has = event.athleteIds.includes(athleteId)
  return setEventAthletes(
    id,
    has ? event.athleteIds.filter((x) => x !== athleteId) : [...event.athleteIds, athleteId],
  )
}

export async function hydrateTrainingEvents(): Promise<void> {
  try {
    const res = await fetch('/api/training-events')
    if (!res.ok) return
    const data = (await res.json()) as TrainingEventFile
    if (data?.kind !== 'shape-lab-training-events' || !Array.isArray(data.events)) return
    const local = read()
    const byId = new Map(local.events.map((e) => [e.id, e]))
    for (const row of data.events) {
      if (!row?.id || !row.name) continue
      const keep = byId.get(row.id)
      if (!keep || (row.updatedAt || row.createdAt || '') >= (keep.updatedAt || keep.createdAt || '')) {
        byId.set(row.id, row)
      }
    }
    write({
      kind: 'shape-lab-training-events',
      version: 1,
      exportedAt: new Date().toISOString(),
      events: [...byId.values()],
    })
  } catch {
    /* offline */
  }
}
