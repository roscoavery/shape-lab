import type { AuthSessionUser, SessionRole } from './authSession'

export type PublicAccount = {
  id: string
  email: string
  role: SessionRole
  displayName: string
  rosterProfileId?: string
  linkedAthleteIds?: string[]
  createdAt: string
  updatedAt: string
}

const jsonInit: RequestInit = {
  credentials: 'same-origin',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string }
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
  sendEmail?: boolean
}): Promise<{ account: AuthSessionUser; inviteUrl?: string; mailed?: boolean }> {
  const res = await fetch('/api/auth/accounts', {
    ...jsonInit,
    method: 'POST',
    body: JSON.stringify(input),
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
    ...jsonInit,
    method: 'POST',
    body: JSON.stringify({ accountId, sendEmail }),
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
}): Promise<PublicAccount> {
  const res = await fetch('/api/auth/accounts', {
    ...jsonInit,
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not update that account.'))
  const data = (await res.json()) as { account?: PublicAccount }
  if (!data.account) throw new Error('Could not update that account.')
  return data.account
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/auth/password', {
    ...jsonInit,
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not change that password.'))
}

export async function adminResetPassword(accountId: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/auth/password', {
    ...jsonInit,
    method: 'POST',
    body: JSON.stringify({ accountId, newPassword }),
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not reset that password.'))
}
