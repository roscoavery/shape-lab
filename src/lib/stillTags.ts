import { markedFetch } from './authSession'

export type StillTagPerson = {
  athleteId: string
  name: string
  instructionalMediaConsent?: string
}

export type StillTagRow = {
  stillId: string
  shapeId: string
  label?: string
  dataUrl?: string
  taggedAthleteIds: string[]
  tagged: StillTagPerson[]
  needsInstructionalConsent: boolean
}

export async function listStillTags(): Promise<StillTagRow[]> {
  const res = await fetch('/api/still-tags', { credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) return []
  const data = (await res.json()) as { stills?: StillTagRow[] }
  return Array.isArray(data.stills) ? data.stills : []
}

export async function saveStillTags(stillId: string, taggedAthleteIds: string[]): Promise<StillTagRow[]> {
  const res = await markedFetch('/api/still-tags', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stillId, taggedAthleteIds }),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { error?: string }
      detail = body.error ?? ''
    } catch {
      /* ignore */
    }
    throw new Error(detail || 'Could not save that tag.')
  }
  const data = (await res.json()) as { stills?: StillTagRow[] }
  return Array.isArray(data.stills) ? data.stills : []
}
