import { createId } from './storage'

export type AthleteVideoSource =
  | 'delay-record'
  | 'compare-replay'
  | 'hold'
  | 'tasks2'
  | 'form-analysis'

export type AthleteVideo = {
  id: string
  athleteId: string
  name: string
  source: AthleteVideoSource
  createdAt: string
  durationSec: number | null
  sizeBytes: number
  mime: string
  url: string
}

export const SOURCE_LABEL: Record<AthleteVideoSource, string> = {
  'delay-record': 'Delay cam',
  'compare-replay': 'Compare',
  hold: 'Hold challenge',
  tasks2: 'Tasks 2',
  'form-analysis': 'Form analysis',
}

export async function listAthleteVideos(athleteId: string): Promise<AthleteVideo[]> {
  try {
    const res = await fetch(`/api/athlete-videos?athleteId=${encodeURIComponent(athleteId)}`)
    if (!res.ok) return []
    const data = (await res.json()) as { videos?: AthleteVideo[] }
    return Array.isArray(data.videos) ? data.videos : []
  } catch {
    return []
  }
}

export async function uploadAthleteVideo(opts: {
  athleteId: string
  blob: Blob
  name: string
  source: AthleteVideoSource
  durationSec?: number | null
}): Promise<AthleteVideo> {
  const id = createId('vid')
  const mime = opts.blob.type || 'video/webm'
  const res = await fetch(
    `/api/athlete-videos?id=${encodeURIComponent(id)}&athleteId=${encodeURIComponent(opts.athleteId)}&name=${encodeURIComponent(opts.name)}&source=${encodeURIComponent(opts.source)}&mime=${encodeURIComponent(mime)}&durationSec=${encodeURIComponent(String(opts.durationSec ?? ''))}`,
    {
      method: 'POST',
      headers: { 'Content-Type': mime },
      body: opts.blob,
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error || 'Could not save that video into the library.')
  }
  return (await res.json()) as AthleteVideo
}

export async function deleteAthleteVideo(id: string, athleteId: string): Promise<void> {
  const res = await fetch(
    `/api/athlete-videos?id=${encodeURIComponent(id)}&athleteId=${encodeURIComponent(athleteId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) throw new Error('Could not delete that video.')
}

export function groupVideosByDate(videos: AthleteVideo[]): { date: string; videos: AthleteVideo[] }[] {
  const map = new Map<string, AthleteVideo[]>()
  for (const v of videos) {
    const date = (v.createdAt || '').slice(0, 10) || 'Unknown date'
    const list = map.get(date) ?? []
    list.push(v)
    map.set(date, list)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({
      date,
      videos: list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
}

export function formatVideoDay(isoDay: string): string {
  const d = new Date(`${isoDay}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDay
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
