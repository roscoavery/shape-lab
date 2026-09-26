import { allLibraryShapes } from '../config/shapes'
import { HOMEWORK_CATALOG } from '../config/homeworkCatalog'
import { SECTION_SUBNAV, type NavRole } from './appNav'
import type { AppTab } from './storage'
import type { Athlete } from '../types'
import type { GymClip } from './gymLibrary'
import { itemMatchesQuery } from './clipStore'

export type AppSearchHitKind =
  | 'feature'
  | 'shape'
  | 'homework'
  | 'clip'
  | 'person'
  | 'collection'

export type AppSearchHit = {
  id: string
  kind: AppSearchHitKind
  title: string
  subtitle?: string
  tab: AppTab
  score: number
  shapeId?: string
  clipUrl?: string
  catalogId?: string
  athleteId?: string
}

const FEATURE_WORDS: Record<AppTab, string> = {
  today: 'today home schedule class calendar',
  tasks: 'hold body work timer practice scoring',
  tasks2: 'class flows sequence lesson plan',
  homework: 'homework holds reps drills log',
  warmup: 'warm up warmup stretch',
  learn: 'learn shapes library education skill',
  coachlib: 'coach library references',
  drills: 'drill library exercises',
  compare: 'compare video delay side by side ab',
  scroll: 'reels scroll reference videos passes',
  classes: 'classes roster meeting',
  feed: 'gym feed posts team',
  wins: 'wins accomplishments high five feed',
  network: 'messages inbox dm chat network people',
  research: 'research notes study',
  coach: 'live scoring coach camera practice',
  history: 'profiles roster athletes history',
  accounts: 'accounts login sign in gym account',
  consent: 'consent forms permissions',
  stills: 'stills photos reference images',
  watch: 'watch video playback',
  about: 'about help info',
  wellness: 'body care wellness recovery',
  progress: 'progress tracking levels',
  classclock: 'class clock stopwatch timer',
}

function tokenScore(hay: string, needle: string): number {
  const h = hay.toLowerCase()
  const n = needle.toLowerCase()
  if (!n) return 0
  if (h === n) return 100
  if (h.startsWith(n)) return 80
  const words = h.split(/\s+/)
  if (words.some((w) => w.startsWith(n))) return 65
  if (h.includes(n)) return 40
  return 0
}

function featureHits(needle: string, ryan: boolean): AppSearchHit[] {
  const out: AppSearchHit[] = []
  const seen = new Set<AppTab>()
  for (const rows of Object.values(SECTION_SUBNAV)) {
    for (const row of rows) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      const extra = FEATURE_WORDS[row.id] ?? ''
      const blob = `${row.label} ${extra}`
      const score = Math.max(tokenScore(row.label, needle), tokenScore(blob, needle))
      if (score <= 0) continue
      if (row.id === 'tasks' || row.id === 'coach' || row.id === 'drills') {
        if (!ryan) continue
      }
      out.push({
        id: `feature:${row.id}`,
        kind: 'feature',
        title: row.label,
        subtitle: 'Open in app',
        tab: row.id,
        score,
      })
    }
  }
  return out
}

function shapeHits(needle: string): AppSearchHit[] {
  const out: AppSearchHit[] = []
  for (const s of allLibraryShapes()) {
    const blob = `${s.name} ${s.id} ${s.category} ${s.description}`
    const score = Math.max(tokenScore(s.name, needle), tokenScore(blob, needle))
    if (score <= 0) continue
    out.push({
      id: `shape:${s.id}`,
      kind: 'shape',
      title: s.name,
      subtitle: 'Shape library',
      tab: 'learn',
      score,
      shapeId: s.id,
    })
  }
  return out
}

function homeworkHits(needle: string): AppSearchHit[] {
  const out: AppSearchHit[] = []
  for (const item of HOMEWORK_CATALOG) {
    const blob = `${item.name} ${item.id} ${item.notes} ${item.cues.join(' ')}`
    const score = Math.max(tokenScore(item.name, needle), tokenScore(blob, needle))
    if (score <= 0) continue
    out.push({
      id: `hw:${item.id}`,
      kind: 'homework',
      title: item.name,
      subtitle: 'Homework',
      tab: 'homework',
      score,
      catalogId: item.id,
    })
  }
  return out
}

function clipHits(needle: string, clips: GymClip[]): AppSearchHit[] {
  const out: AppSearchHit[] = []
  const seen = new Set<string>()
  for (const c of clips) {
    const asItem = {
      id: c.id,
      kind: c.kind,
      name: c.name,
      url: c.url,
      keywords: c.keywords,
      createdAt: '',
    }
    if (!itemMatchesQuery(asItem, needle) && !c.collectionName.toLowerCase().includes(needle.toLowerCase())) {
      continue
    }
    const key = c.url.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const score = Math.max(
      tokenScore(c.name, needle),
      tokenScore((c.keywords ?? []).join(' '), needle),
      tokenScore(c.collectionName, needle),
    )
    out.push({
      id: `clip:${c.id}`,
      kind: 'clip',
      title: c.name,
      subtitle: c.collectionName || 'Reference video',
      tab: 'scroll',
      score: score || 35,
      clipUrl: c.url,
    })
  }
  return out
}

function peopleHits(needle: string, athletes: Athlete[]): AppSearchHit[] {
  const out: AppSearchHit[] = []
  for (const a of athletes) {
    const score = tokenScore(a.name, needle)
    if (score <= 0) continue
    out.push({
      id: `person:${a.id}`,
      kind: 'person',
      title: a.name,
      subtitle: 'Profile',
      tab: 'history',
      score,
      athleteId: a.id,
    })
  }
  return out
}

export function popularSearchHits(role: NavRole, ryan: boolean): AppSearchHit[] {
  const tabs: AppTab[] =
    role === 'parent'
      ? ['today', 'homework', 'learn', 'wins', 'network', 'history']
      : ['today', 'scroll', 'homework', 'wins', 'tasks2', 'learn', 'compare', 'network', 'drills', 'coachlib', 'research', 'wellness', 'progress']
  const out: AppSearchHit[] = []
  for (const tab of tabs) {
    if ((tab === 'tasks' || tab === 'coach' || tab === 'drills') && !ryan) continue
    const label =
      Object.values(SECTION_SUBNAV)
        .flat()
        .find((r) => r.id === tab)?.label ?? tab
    out.push({
      id: `feature:${tab}`,
      kind: 'feature',
      title: label,
      subtitle: 'Suggested',
      tab,
      score: 1,
    })
  }
  // Popular shapes — tap to open in the shape library.
  const shapeNames = ['Handstand', 'Tuck', 'Hollow (arms up)', 'Tight arch', 'Pike (zombie arms)', 'Candlestick', 'Bridge', 'Lunge']
  for (const s of allLibraryShapes()) {
    if (!shapeNames.includes(s.name)) continue
    out.push({
      id: `shape:${s.id}`,
      kind: 'shape',
      title: s.name,
      subtitle: 'Shape library · Suggested',
      tab: 'learn',
      score: 0.9,
      shapeId: s.id,
    })
  }
  // Popular homework drills — tap to open.
  const hwNames = ['Candlestick drills', 'Hollow', 'Wall handstand', 'Bridge push-ups', 'V-ups']
  for (const item of HOMEWORK_CATALOG) {
    if (!hwNames.some((n) => item.name.toLowerCase().includes(n.toLowerCase()))) continue
    out.push({
      id: `hw:${item.id}`,
      kind: 'homework',
      title: item.name,
      subtitle: 'Homework · Suggested',
      tab: 'homework',
      score: 0.8,
      catalogId: item.id,
    })
  }
  return out
}

export function searchAppIndex(
  query: string,
  opts: {
    athletes: Athlete[]
    clips: GymClip[]
    role: NavRole
    ryan: boolean
    limit?: number
  },
): AppSearchHit[] {
  const needle = query.trim()
  if (!needle) return popularSearchHits(opts.role, opts.ryan)

  const merged = [
    ...featureHits(needle, opts.ryan),
    ...shapeHits(needle),
    ...homeworkHits(needle),
    ...clipHits(needle, opts.clips),
    ...peopleHits(needle, opts.athletes),
  ]
  merged.sort((a, b) => b.score - a.score)
  const limit = opts.limit ?? 24
  return merged.slice(0, limit)
}
