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
  mailEnabled?: boolean
  csrf?: string
}

const CSRF_HEADER = 'X-Shape-Lab-Csrf'

let csrfToken = ''

export function rememberCsrf(data: { csrf?: string } | null | undefined): void {
  if (data?.csrf) csrfToken = data.csrf
}

export function withCsrfHeaders(headers?: HeadersInit): Headers {
  const next = new Headers(headers)
  if (csrfToken) next.set(CSRF_HEADER, csrfToken)
  return next
}

/** Same-origin write. Adds the gym mark on POST / PUT / PATCH / DELETE. */
export async function markedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = String(init?.method || 'GET').toUpperCase()
  const write = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
  if (!write) return fetch(input, init)
  return fetch(input, { ...init, headers: withCsrfHeaders(init?.headers) })
}

export function authWriteInit(body?: string): RequestInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (csrfToken) headers[CSRF_HEADER] = csrfToken
  return { credentials: 'same-origin', headers, body }
}

export const SESSION_LOST_EVENT = 'shape-lab-session-lost'

let sessionLost = false

/** Wrong password is 401; the cookie is still good. A missing cookie is not. */
export function shouldClearSession(status: number, error?: string): boolean {
  if (status !== 401) return false
  if (error === 'Password is wrong.') return false
  if (error === 'Email or password is wrong.') return false
  return true
}

export function markSessionPresent(): void {
  sessionLost = false
}

export function noteSessionLost(): void {
  if (sessionLost) return
  sessionLost = true
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(SESSION_LOST_EVENT))
}

export function resetSessionLostForTests(): void {
  sessionLost = false
  csrfToken = ''
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
    ...authWriteInit(JSON.stringify({ enabled, password })),
    method: 'POST',
  })
  const data = (await res.json().catch(() => ({}))) as AuthMeResponse & { error?: string }
  rememberCsrf(data)
  if (!res.ok) {
    throw new Error(
      data.error || (enabled ? 'Could not turn this device into a floor iPad.' : 'Could not leave the floor.'),
    )
  }
  return data
}

export async function unlockAway(password: string): Promise<void> {
  const res = await fetch('/api/auth/unlock', {
    ...authWriteInit(JSON.stringify({ password })),
    method: 'POST',
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string; csrf?: string }
  rememberCsrf(data)
  if (!res.ok) {
    if (shouldClearSession(res.status, data.error)) noteSessionLost()
    throw new Error(data.error || 'Password is wrong.')
  }
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) return { authenticated: false, user: null, bootstrapAllowed: false }
  const data = (await res.json()) as AuthMeResponse
  rememberCsrf(data)
  return data
}

export async function loginWithPassword(email: string, password: string): Promise<AuthMeResponse> {
  const res = await fetch('/api/auth/login', {
    ...authWriteInit(JSON.stringify({ email, password })),
    method: 'POST',
  })
  const data = (await res.json().catch(() => ({}))) as AuthMeResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || 'Email or password is wrong.')
  }
  rememberCsrf(data)
  markSessionPresent()
  return data
}

export async function registerAccount(
  email: string,
  password: string,
  displayName: string,
  role: 'athlete' | 'parent' | 'coach' = 'athlete',
): Promise<AuthMeResponse> {
  const res = await fetch('/api/auth/register', {
    ...authWriteInit(JSON.stringify({ email, password, displayName, role })),
    method: 'POST',
  })
  const data = (await res.json().catch(() => ({}))) as AuthMeResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || 'Could not create that account.')
  }
  rememberCsrf(data)
  markSessionPresent()
  return data
}

export async function deleteOwnAccount(): Promise<void> {
  const res = await fetch('/api/auth/delete-self', { ...authWriteInit(), method: 'POST' })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(data.error || 'Could not delete that account.')
}

export async function bootstrapAdmin(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthMeResponse> {
  const res = await fetch('/api/auth/bootstrap', {
    ...authWriteInit(JSON.stringify({ email, password, displayName })),
    method: 'POST',
  })
  const data = (await res.json().catch(() => ({}))) as AuthMeResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || 'Could not create the first admin account.')
  }
  rememberCsrf(data)
  markSessionPresent()
  return data
}

export async function logoutSession(): Promise<void> {
  await fetch('/api/auth/logout', { ...authWriteInit(), method: 'POST' })
  csrfToken = ''
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
    ...authWriteInit(JSON.stringify({ token, password })),
    method: 'POST',
  })
  const data = (await res.json().catch(() => ({}))) as AuthMeResponse & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || 'That sign-in link is wrong or already used.')
  }
  rememberCsrf(data)
  markSessionPresent()
  return data
}
