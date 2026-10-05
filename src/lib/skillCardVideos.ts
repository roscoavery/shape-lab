/**
 * Skill card videos for the compare tool picker.
 *
 * A skill card's videos are the same list the Learn card renders: the seed
 * evidence (TECHNIQUE_EVIDENCE), the featured proof video, and the
 * admin-added videos from /api/skill-card-videos, deduplicated by normalized
 * URL and minus anything hidden via Adjust mode. Each ProofVideo is mapped
 * to a RefItem so the compare panes can reuse their existing load paths
 * (social via InstagramEmbed, YouTube via iframe, direct URLs/files direct).
 */
import {
  FEATURED_PROOF,
  TECHNIQUE_EVIDENCE,
  evidenceKeyForSkill,
  type ProofVideo,
} from '../config/techniqueEvidence'
import {
  getRegistrySkill,
  guideSkillsInOrder,
  guidelessSkills,
} from './skillRegistry'
import { kindFromUrl, type RefItem } from './clipStore'
import { normalizeVideoUrl } from './socialUrls'

export type SkillCardVideoList = {
  skillId: string
  name: string
  evidenceKey: string
  items: RefItem[]
}

export type SkillVideoSummary = {
  skillId: string
  name: string
  /** Playable videos on the card (seed + featured + admin, deduped, unhidden). */
  count: number
}

function proofVideoToRefItem(
  skillId: string,
  video: ProofVideo,
  index: number,
): RefItem | null {
  const raw = (video.url || '').trim()
  if (!raw) return null
  return {
    id: `skillcard:${skillId}:${index}`,
    kind: kindFromUrl(raw),
    name: video.watchFor || video.who || 'Skill card video',
    url: raw,
    postedBy: video.creator || undefined,
    keywords: video.who ? [video.who] : undefined,
    trimStart: video.startAt,
    trimEnd: video.endAt,
    createdAt: new Date(0).toISOString(),
  }
}

type AdminVideoMap = Record<string, ProofVideo[]>

async function fetchAdminVideoMap(): Promise<AdminVideoMap> {
  try {
    const data = await fetch('/api/skill-card-videos').then((r) =>
      r.ok ? r.json() : {},
    )
    if (data && typeof data === 'object') return data as AdminVideoMap
  } catch {
    /* offline or unavailable — seed videos still work */
  }
  return {}
}

async function fetchHiddenMap(): Promise<Record<string, string[]>> {
  try {
    const data = await fetch('/api/skill-card-hidden').then((r) =>
      r.ok ? r.json() : {},
    )
    if (data && typeof data === 'object') return data as Record<string, string[]>
  } catch {
    /* ignore */
  }
  return {}
}

/**
 * Full playable video list for one skill card, in card order:
 * featured proof first, then seed evidence, then admin-added.
 */
export async function fetchSkillCardVideos(
  skillId: string,
): Promise<SkillCardVideoList | null> {
  const skill = getRegistrySkill(skillId)
  if (!skill) return null
  const evidenceKey = evidenceKeyForSkill(skill)
  const [adminMap, hiddenMap] = await Promise.all([
    fetchAdminVideoMap(),
    fetchHiddenMap(),
  ])
  const hidden = new Set(
    (hiddenMap[evidenceKey] ?? []).filter((u) => typeof u === 'string'),
  )
  const ordered: ProofVideo[] = []
  const featured = FEATURED_PROOF[evidenceKey]
  if (featured) ordered.push(featured)
  ordered.push(...(TECHNIQUE_EVIDENCE[evidenceKey] ?? []))
  const admin = adminMap[evidenceKey]
  if (Array.isArray(admin)) ordered.push(...admin)
  const seen = new Set<string>()
  const items: RefItem[] = []
  ordered.forEach((video, index) => {
    const raw = (video.url || '').trim()
    if (!raw || hidden.has(raw)) return
    const key = normalizeVideoUrl(raw)
    if (seen.has(key)) return
    seen.add(key)
    const item = proofVideoToRefItem(skillId, video, index)
    if (item) items.push(item)
  })
  return { skillId, name: skill.name, evidenceKey, items }
}

/**
 * Every skill that has at least one playable card video, in guide order
 * then guideless skills. Used for the picker's skill list.
 */
export async function skillVideoSummaries(): Promise<SkillVideoSummary[]> {
  const seen = new Set<string>()
  const skills = [...guideSkillsInOrder(), ...guidelessSkills()].filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
  const [adminMap, hiddenMap] = await Promise.all([
    fetchAdminVideoMap(),
    fetchHiddenMap(),
  ])
  const out: SkillVideoSummary[] = []
  for (const skill of skills) {
    const evidenceKey = evidenceKeyForSkill(skill)
    const hidden = new Set(
      (hiddenMap[evidenceKey] ?? []).filter((u) => typeof u === 'string'),
    )
    const urls = new Set<string>()
    const featured = FEATURED_PROOF[evidenceKey]
    if (featured && featured.url && !hidden.has(featured.url.trim())) {
      urls.add(normalizeVideoUrl(featured.url.trim()))
    }
    for (const video of TECHNIQUE_EVIDENCE[evidenceKey] ?? []) {
      const raw = (video.url || '').trim()
      if (raw && !hidden.has(raw)) urls.add(normalizeVideoUrl(raw))
    }
    const admin = adminMap[evidenceKey]
    if (Array.isArray(admin)) {
      for (const video of admin) {
        const raw = (video.url || '').trim()
        if (raw && !hidden.has(raw)) urls.add(normalizeVideoUrl(raw))
      }
    }
    if (urls.size > 0) out.push({ skillId: skill.id, name: skill.name, count: urls.size })
  }
  return out
}
