/**
 * Ryan's custom skills added directly on the skill map.
 * Stored on the server (data/custom-map-skills.json), hydrated here.
 */

import { markedFetch } from './authSession'

export type CustomMapSkill = {
  id: string
  name: string
  rowIndex: number
  family: 'standing' | 'front' | 'cartwheel' | 'roundoff'
  createdAt: string
}

let skills: CustomMapSkill[] = []

const subs = new Set<() => void>()

export function subscribeCustomMapSkills(fn: () => void): () => void {
  subs.add(fn)
  return () => {
    subs.delete(fn)
  }
}

function emit() {
  for (const fn of subs) fn()
}

export function getCustomMapSkills(): CustomMapSkill[] {
  return skills
}

export async function hydrateCustomMapSkills(): Promise<void> {
  try {
    const res = await fetch('/api/custom-map-skills', { credentials: 'same-origin' })
    if (!res.ok) return
    const data = (await res.json()) as { skills?: CustomMapSkill[] }
    if (Array.isArray(data.skills)) {
      skills = data.skills
      emit()
    }
  } catch {
    // ignore
  }
}

export async function addCustomMapSkill(
  name: string,
  rowIndex: number,
  family: CustomMapSkill['family'],
): Promise<CustomMapSkill | null> {
  // Optimistic: add locally immediately
  const temp: CustomMapSkill = {
    id: `temp_${Date.now()}`,
    name: name.trim(),
    rowIndex,
    family,
    createdAt: new Date().toISOString(),
  }
  skills = [...skills, temp]
  emit()
  try {
    const res = await markedFetch('/api/custom-map-skills', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name, rowIndex, family }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { skill?: CustomMapSkill }
    if (data.skill) {
      // Replace temp with server version
      skills = skills.map((s) => (s.id === temp.id ? data.skill! : s))
      emit()
      return data.skill
    }
    return null
  } catch {
    // Roll back optimistic add on failure
    skills = skills.filter((s) => s.id !== temp.id)
    emit()
    return null
  }
}

export async function deleteCustomMapSkill(id: string): Promise<boolean> {
  const prev = skills
  skills = skills.filter((s) => s.id !== id)
  emit()
  try {
    const res = await markedFetch('/api/custom-map-skills', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return true
  } catch {
    // Roll back on failure
    skills = prev
    emit()
    return false
  }
}
