import type { Athlete } from '../types'
import { loadResearch, saveResearch, type ResearchFile } from './research'
import {
  applyRosterSnapshot,
  enableServerRosterPush,
  localRosterSnapshot,
  pushServerRoster,
  type RosterBackup,
} from './rosterSync'

export type GymBackup = {
  kind: 'shape-lab-gym-backup'
  version: 1
  exportedAt: string
  roster: RosterBackup
  research: ResearchFile
}

export async function buildGymBackup(): Promise<GymBackup> {
  return {
    kind: 'shape-lab-gym-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    roster: localRosterSnapshot(),
    research: await loadResearch(),
  }
}

export function parseGymBackup(raw: unknown): GymBackup | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<GymBackup>
  if (data.kind !== 'shape-lab-gym-backup') return null
  if (!data.roster || data.roster.kind !== 'shape-lab-roster') return null
  if (!Array.isArray(data.roster.athletes)) return null
  return {
    kind: 'shape-lab-gym-backup',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    roster: data.roster,
    research: data.research ?? {
      kind: 'shape-lab-research',
      version: 1,
      exportedAt: '',
      observations: [],
      ideas: [],
    },
  }
}

export async function applyGymBackup(backup: GymBackup): Promise<{ athletes: Athlete[] }> {
  const { athletes } = applyRosterSnapshot(backup.roster)
  enableServerRosterPush()
  await pushServerRoster()
  if (backup.research?.kind === 'shape-lab-research') {
    await saveResearch(backup.research)
  }
  return { athletes }
}

export function downloadGymBackup(backup: GymBackup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shape-lab-gym-${backup.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function athleteContact(athlete: Athlete): {
  name: string
  role: string
  email: string
  phone: string
  parentPhone: string
} {
  return {
    name: athlete.name,
    role: athlete.role ?? 'athlete',
    email: athlete.email?.trim() || '',
    phone: athlete.phone?.trim() || '',
    parentPhone: athlete.parentPhone?.trim() || '',
  }
}
