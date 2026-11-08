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

/**
 * Public gym list for pages with no sign-in: the invite setup page and the
 * group intake form. Names and ids only, nothing that identifies anyone.
 */
export async function listPublicGyms(): Promise<{ id: string; name: string }[]> {
  const res = await fetch('/api/share/gyms', { cache: 'no-store' })
  if (!res.ok) throw new Error('Could not load gyms.')
  const data = (await res.json()) as { gyms?: { id?: unknown; name?: unknown }[] }
  if (!Array.isArray(data.gyms)) return []
  return data.gyms
    .filter((g) => typeof g.id === 'string' && typeof g.name === 'string')
    .map((g) => ({ id: g.id as string, name: g.name as string }))
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
