import { readJson, writeJson } from './persist.ts'

const FILE = 'data/class-plans.json'

export type DiskClassPlanTask = {
  id: string
  athleteIds: string[]
  text: string
  done: boolean
  repsTarget?: number
  repsDone?: number
  carriedFromPlanId?: string
  createdAt: string
}

export type DiskClassPlan = {
  id: string
  date: string
  offeringId: string
  coachId: string
  notes: string
  tasks: DiskClassPlanTask[]
  createdAt: string
  updatedAt: string
}

export type DiskClassPlans = {
  kind: 'shape-lab-class-plans'
  version: 1
  plans: DiskClassPlan[]
}

const EMPTY: DiskClassPlans = {
  kind: 'shape-lab-class-plans',
  version: 1,
  plans: [],
}

function normalize(data: unknown): DiskClassPlans {
  if (!data || typeof data !== 'object') return { ...EMPTY }
  const d = data as Partial<DiskClassPlans>
  if (d.kind !== 'shape-lab-class-plans') return { ...EMPTY }
  return {
    kind: 'shape-lab-class-plans',
    version: 1,
    plans: Array.isArray(d.plans) ? d.plans.filter((p) => p && typeof p.id === 'string') : [],
  }
}

export async function readClassPlans(): Promise<DiskClassPlans> {
  return normalize(await readJson<DiskClassPlans>(FILE, { ...EMPTY }))
}

export async function writeClassPlans(plans: DiskClassPlan[]): Promise<void> {
  await writeJson(FILE, { ...EMPTY, plans })
}

/**
 * Merge incoming plans with stored plans. Per-plan: newer updatedAt wins.
 * Within a plan: tasks merge by ID (newer plan wins wholesale for simplicity,
 * since task edits always bump the plan's updatedAt).
 */
export function mergeClassPlans(
  stored: DiskClassPlan[],
  incoming: DiskClassPlan[],
): DiskClassPlan[] {
  const byId = new Map<string, DiskClassPlan>()
  for (const p of stored) byId.set(p.id, p)
  for (const p of incoming) {
    const existing = byId.get(p.id)
    if (!existing) {
      byId.set(p.id, p)
      continue
    }
    // Newer updatedAt wins; tie goes to incoming.
    if ((p.updatedAt || '') >= (existing.updatedAt || '')) {
      byId.set(p.id, p)
    }
  }
  return [...byId.values()]
}
