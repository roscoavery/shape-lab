import { randomUUID } from 'node:crypto'
import { readJson, writeJson } from './persist.ts'

const FILE = 'data/gyms.json'

export type Gym = {
  id: string
  name: string
  /** Account id of the gymOwner who owns this gym. Empty until handed over. */
  ownerAccountId?: string | null
  createdByAccountId: string
  createdAt: string
  updatedAt: string
}

type GymFile = {
  kind: 'shape-lab-gyms'
  version: 1
  gyms: Gym[]
}

const EMPTY: GymFile = { kind: 'shape-lab-gyms', version: 1, gyms: [] }

function normalizeName(name: unknown): string {
  return String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120)
}

async function readFile(): Promise<GymFile> {
  const stored = await readJson<GymFile>(FILE, EMPTY)
  if (!stored || stored.kind !== 'shape-lab-gyms' || !Array.isArray(stored.gyms)) {
    return { ...EMPTY }
  }
  return {
    kind: 'shape-lab-gyms',
    version: 1,
    gyms: stored.gyms.filter(
      (g): g is Gym => Boolean(g) && typeof g.id === 'string' && Boolean(g.id),
    ),
  }
}

async function writeFile(gyms: Gym[]): Promise<void> {
  await writeJson(FILE, { kind: 'shape-lab-gyms', version: 1, gyms } satisfies GymFile)
}

export async function listGyms(): Promise<Gym[]> {
  return (await readFile()).gyms
}

export async function getGym(id: string): Promise<Gym | null> {
  const gyms = await listGyms()
  return gyms.find((g) => g.id === id) ?? null
}

export async function createGym(input: {
  name: string
  createdByAccountId: string
}): Promise<Gym> {
  const name = normalizeName(input.name)
  if (!name) throw new Error('Give the gym a name.')
  const now = new Date().toISOString()
  const gym: Gym = {
    id: `gym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    name,
    ownerAccountId: null,
    createdByAccountId: input.createdByAccountId,
    createdAt: now,
    updatedAt: now,
  }
  const gyms = await listGyms()
  gyms.push(gym)
  await writeFile(gyms)
  return gym
}

export async function updateGym(
  id: string,
  patch: { name?: string; ownerAccountId?: string | null },
): Promise<Gym | null> {
  const gyms = await listGyms()
  const gym = gyms.find((g) => g.id === id)
  if (!gym) return null
  if (patch.name !== undefined) {
    const name = normalizeName(patch.name)
    if (!name) throw new Error('Give the gym a name.')
    gym.name = name
  }
  if (patch.ownerAccountId !== undefined) {
    gym.ownerAccountId = patch.ownerAccountId || null
  }
  gym.updatedAt = new Date().toISOString()
  await writeFile(gyms)
  return gym
}

/** Find the gym a gymOwner account belongs to. */
export async function gymForAccount(accountId: string, gymId?: string | null): Promise<Gym | null> {
  const gyms = await listGyms()
  if (gymId) {
    const direct = gyms.find((g) => g.id === gymId)
    if (direct) return direct
  }
  return gyms.find((g) => g.ownerAccountId === accountId) ?? null
}
