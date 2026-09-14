import { markedFetch } from './authSession'

export type ConsentState = 'unknown' | 'pending' | 'granted' | 'declined'
export type ProfileVisibility = 'private' | 'public' | 'gym'

export type ConsentRow = {
  id: string
  name: string
  role?: string
  parentConsentStatus?: ConsentState
  parentConsentAt?: string
  mediaConsent?: ConsentState
  publicProfileConsent?: ConsentState
  instructionalMediaConsent?: ConsentState
  researchConsent?: ConsentState
  allowWinsOnFeed?: boolean
  allowStories?: boolean
  showProfilePhoto?: boolean
  showCoachNames?: boolean
  profileVisibility?: ProfileVisibility
  profilePublic?: boolean
}

export type ConsentPatch = {
  athleteId: string
  parentConsentStatus?: ConsentState
  mediaConsent?: ConsentState
  publicProfileConsent?: ConsentState
  instructionalMediaConsent?: ConsentState
  researchConsent?: ConsentState
  allowWinsOnFeed?: boolean
  allowStories?: boolean
  showProfilePhoto?: boolean
  showCoachNames?: boolean
  profileVisibility?: ProfileVisibility
  profilePublic?: boolean
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    if (data.error) return data.error
  } catch {
    /* keep fallback */
  }
  return fallback
}

export async function listConsentAthletes(): Promise<ConsentRow[]> {
  const res = await fetch('/api/consent', { credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) throw new Error(await readError(res, 'Could not load consent.'))
  const data = (await res.json()) as { athletes?: ConsentRow[] }
  return Array.isArray(data.athletes) ? data.athletes : []
}

export async function patchConsent(patch: ConsentPatch): Promise<ConsentRow> {
  const res = await markedFetch('/api/consent', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await readError(res, 'Could not save consent.'))
  const data = (await res.json()) as { athlete?: ConsentRow }
  if (!data.athlete) throw new Error('Consent saved, but the gym did not return the athlete.')
  return data.athlete
}
