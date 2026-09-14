import { authWriteInit, type SessionRole } from './authSession'

export type WatchEvent = {
  at: string
  action: string
  actorId?: string
  actorEmail?: string
  actorRole?: string
  athleteId?: string
  detail?: string
}

export type WatchSession = {
  accountId: string
  email: string
  displayName: string
  role: SessionRole | string
  createdAt: string
  expiresAt: string
  kiosk: boolean
  self: boolean
}

const jsonGet: RequestInit = {
  credentials: 'same-origin',
  cache: 'no-store',
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  return data.error || fallback
}

export async function listWatchEvents(includeViews = false): Promise<WatchEvent[]> {
  const qs = includeViews ? '?views=1' : ''
  const res = await fetch(`/api/auth/audit${qs}`, jsonGet)
  if (!res.ok) throw new Error(await readError(res, 'Could not load the gym log.'))
  const data = (await res.json()) as { events?: WatchEvent[] }
  return Array.isArray(data.events) ? data.events : []
}

export async function listSignedInLogins(): Promise<WatchSession[]> {
  const res = await fetch('/api/auth/sessions', jsonGet)
  if (!res.ok) throw new Error(await readError(res, 'Could not see who is signed in.'))
  const data = (await res.json()) as { sessions?: WatchSession[] }
  return Array.isArray(data.sessions) ? data.sessions : []
}

export async function endSignedInLogin(accountId: string): Promise<void> {
  const res = await fetch('/api/auth/sessions', {
    ...authWriteInit(JSON.stringify({ accountId })),
    method: 'POST',
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not end that login.'))
}

export function watchActionLabel(action: string): string {
  switch (action) {
    case 'auth.login':
      return 'Signed in'
    case 'auth.logout':
      return 'Signed out'
    case 'auth.account_create':
      return 'Created a login'
    case 'auth.kiosk':
      return 'Floor iPad'
    case 'auth.invite':
      return 'Sign-in link'
    case 'contacts.view':
      return 'Opened contacts'
    case 'roster.write':
      return 'Changed the roster'
    case 'roster.view':
      return 'Opened the roster'
    case 'role.change':
      return 'Changed a role or password'
    case 'athlete.edit':
      return 'Edited an athlete'
    case 'athlete.view':
      return 'Opened an athlete'
    case 'media.view':
      return 'Opened a photo or clip'
    case 'media.delete':
      return 'Deleted media'
    case 'parent.link':
      return 'Linked a parent'
    default:
      return action
  }
}

export function watchWhen(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso
  return new Date(ms).toLocaleString()
}
