/**
 * Client helper for the V4 account session.
 * The 4-digit profile PIN is not used here — the cookie is the real login.
 */

export type SessionRole = 'admin' | 'coach' | 'athlete' | 'parent' | 'gymOwner'

export type AuthSessionUser = {
  accountId: string
  email: string
  role: SessionRole
  displayName: string
  rosterProfileId?: string
  linkedAthleteIds: string[]
  kiosk?: boolean
}

export type AuthMeResponse = {
  authenticated: boolean
  user: AuthSessionUser | null
  bootstrapAllowed?: boolean
}

const jsonInit: RequestInit = {
  credentials: 'same-origin',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
}

export function sessionIsKiosk(user: AuthSessionUser | null | undefined): boolean {
  return user?.kiosk === true
}

export function sessionIsAdmin(user: AuthSessionUser | null | undefined): boolean {
  if (sessionIsKiosk(user)) return false
  return user?.role === 'admin' || user?.role === 'gymOwner'
}

export async function setFloorKiosk(enabled: boolean, password?: string): Promise<AuthMeResponse> {
  const res = await fetch('/api/auth/kiosk', {
    ...jsonInit,
    method: 'POST',
    body: JSON.stringify({ enabled, password }),
  })
  const data = (await res.json().catch(() => ({}))) as AuthMeResponse & { error?: string }
  if (!res.ok) {
    throw new Error(
      data.error || (enabled ? 'Could not turn this device into a floor iPad.' : 'Could not leave the floor.'),
    )
  }
  return data
}

export async function unlockAway(password: string): Promise<void> {
  const res = await fetch('/api/auth/unlock', {
    ...jsonInit,
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(data.error || 'Password is wrong.')
  }
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) return { authenticated: false, user: null, bootstrapAllowed: false }
  return (await res.json()) as AuthMeResponse
}

export async function loginWithPassword(email: string, password: string): Promise<AuthMeResponse> {
  const res = await fetch('/api/auth/login', {
    ...jsonInit,
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const data = (await res.json().catch(() => ({}))) as AuthMeResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || 'Email or password is wrong.')
  }
  return data
}

export async function bootstrapAdmin(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthMeResponse> {
  const res = await fetch('/api/auth/bootstrap', {
    ...jsonInit,
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  })
  const data = (await res.json().catch(() => ({}))) as AuthMeResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || 'Could not create the first admin account.')
  }
  return data
}

export async function logoutSession(): Promise<void> {
  await fetch('/api/auth/logout', { ...jsonInit, method: 'POST' })
}

export async function peekInvite(token: string): Promise<{
  valid: boolean
  email?: string
  displayName?: string
}> {
  const res = await fetch(`/api/auth/invite?token=${encodeURIComponent(token)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!res.ok) return { valid: false }
  return (await res.json()) as { valid: boolean; email?: string; displayName?: string }
}

export async function redeemInvite(token: string, password: string): Promise<AuthMeResponse> {
  const res = await fetch('/api/auth/invite', {
    ...jsonInit,
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
  const data = (await res.json().catch(() => ({}))) as AuthMeResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || 'That sign-in link is wrong or already used.')
  }
  return data
}
