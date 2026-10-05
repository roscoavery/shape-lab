import { authWriteInit, rememberCsrf, type AuthSessionUser, type SessionRole } from './authSession'

export type PublicAccount = {
  id: string
  email: string
  role: SessionRole
  displayName: string
  rosterProfileId?: string
  linkedAthleteIds?: string[]
  gymId?: string
  linkedAccountIds?: string[]
  createdAt: string
  updatedAt: string
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string; csrf?: string }
  rememberCsrf(data)
  return data.error || fallback
}

export async function listGymAccounts(): Promise<PublicAccount[]> {
  const res = await fetch('/api/auth/accounts', { credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) throw new Error(await readError(res, 'Could not load accounts.'))
  const data = (await res.json()) as { accounts?: PublicAccount[] }
  return Array.isArray(data.accounts) ? data.accounts : []
}

export async function createGymAccount(input: {
  email: string
  password?: string
  role: SessionRole
  displayName: string
  rosterProfileId?: string
  linkedAthleteIds?: string[]
  gymId?: string
  linkedAccountIds?: string[]
  sendEmail?: boolean
}): Promise<{ account: AuthSessionUser; inviteUrl?: string; mailed?: boolean }> {
  const res = await fetch('/api/auth/accounts', {
    ...authWriteInit(JSON.stringify(input)),
    method: 'POST',
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not create that account.'))
  const data = (await res.json()) as { account?: AuthSessionUser; inviteUrl?: string; mailed?: boolean }
  if (!data.account) throw new Error('Could not create that account.')
  return { account: data.account, inviteUrl: data.inviteUrl, mailed: data.mailed }
}

export async function createSignInLink(
  accountId: string,
  sendEmail = false,
): Promise<{ url: string; expiresAt: string; mailed: boolean; mailError?: string }> {
  const res = await fetch('/api/auth/invites', {
    ...authWriteInit(JSON.stringify({ accountId, sendEmail })),
    method: 'POST',
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not make that sign-in link.'))
  const data = (await res.json()) as {
    url?: string
    expiresAt?: string
    mailed?: boolean
    mailError?: string
  }
  if (!data.url) throw new Error('Could not make that sign-in link.')
  return {
    url: data.url,
    expiresAt: data.expiresAt || '',
    mailed: data.mailed === true,
    mailError: data.mailError,
  }
}

export async function patchGymAccount(input: {
  id: string
  displayName?: string
  role?: SessionRole
  rosterProfileId?: string | null
  linkedAthleteIds?: string[]
  gymId?: string | null
  linkedAccountIds?: string[]
}): Promise<PublicAccount> {
  const res = await fetch('/api/auth/accounts', {
    ...authWriteInit(JSON.stringify(input)),
    method: 'PATCH',
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not update that account.'))
  const data = (await res.json()) as { account?: PublicAccount }
  if (!data.account) throw new Error('Could not update that account.')
  return data.account
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/auth/password', {
    ...authWriteInit(JSON.stringify({ currentPassword, newPassword })),
    method: 'POST',
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string; csrf?: string }
  rememberCsrf(data)
  if (!res.ok) throw new Error(data.error || 'Could not change that password.')
}

export async function deleteGymAccount(accountId: string): Promise<void> {
  const res = await fetch('/api/auth/accounts', {
    ...authWriteInit(JSON.stringify({ id: accountId })),
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not delete that account.'))
}

export async function adminResetPassword(accountId: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/auth/password', {
    ...authWriteInit(JSON.stringify({ accountId, newPassword })),
    method: 'POST',
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not reset that password.'))
}

const DEVICE_KEY = 'shape-lab.device-id.v1'

/** Stable per-browser id so a linked-account switch only asks for the password once per device. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

export type SwitchResult =
  | { ok: true; user: AuthSessionUser }
  | { ok: false; needPassword: true; message: string }
  | { ok: false; needPassword: false; message: string }

/**
 * Switch to a linked account (same person, two logins). Returns
 * needPassword when this device has not proven the target password yet.
 */
export async function switchAccount(
  accountId: string,
  password?: string,
): Promise<SwitchResult> {
  const res = await fetch('/api/auth/switch', {
    ...authWriteInit(JSON.stringify({ accountId, password, deviceId: deviceId() })),
    method: 'POST',
  })
  const data = (await res.json().catch(() => ({}))) as {
    user?: AuthSessionUser
    error?: string
    needPassword?: boolean
    csrf?: string
    mailEnabled?: boolean
  }
  rememberCsrf(data)
  if (res.ok && data.user) return { ok: true, user: data.user }
  return {
    ok: false,
    needPassword: data.needPassword === true || res.status === 401,
    message: data.error || 'Could not switch accounts.',
  }
}

/** Shapelab admin only: link or unlink two accounts owned by the same person. */
export async function linkGymAccounts(aId: string, bId: string, unlink = false): Promise<void> {
  const res = await fetch('/api/auth/link', {
    ...authWriteInit(JSON.stringify({ aId, bId, unlink })),
    method: 'POST',
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not link those accounts.'))
}
