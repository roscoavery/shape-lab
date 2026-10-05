import { authWriteInit, rememberCsrf } from './authSession'

export type Gym = {
  id: string
  name: string
  ownerAccountId?: string | null
  createdByAccountId: string
  createdAt: string
  updatedAt: string
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string; csrf?: string }
  rememberCsrf(data)
  return data.error || fallback
}

export async function listGyms(): Promise<Gym[]> {
  const res = await fetch('/api/gyms', { credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) throw new Error(await readError(res, 'Could not load gyms.'))
  const data = (await res.json()) as { gyms?: Gym[] }
  return Array.isArray(data.gyms) ? data.gyms : []
}

export async function createGym(name: string): Promise<Gym> {
  const res = await fetch('/api/gyms', {
    ...authWriteInit(JSON.stringify({ name })),
    method: 'POST',
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not create that gym.'))
  const data = (await res.json()) as { gym?: Gym }
  if (!data.gym) throw new Error('Could not create that gym.')
  return data.gym
}

export async function patchGym(input: {
  id: string
  name?: string
  ownerAccountId?: string | null
}): Promise<Gym> {
  const res = await fetch('/api/gyms', {
    ...authWriteInit(JSON.stringify(input)),
    method: 'PATCH',
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not update that gym.'))
  const data = (await res.json()) as { gym?: Gym }
  if (!data.gym) throw new Error('Could not update that gym.')
  return data.gym
}
