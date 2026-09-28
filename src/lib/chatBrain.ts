/**
 * Chat brain — smart search first, NOT an LLM.
 *
 * The chat answers ONLY from Ryan's own content: his interview answers,
 * skill cards, drills, spotting system, technique evidence, reference
 * library, and FAQ answers he wrote. Answers are extractive — verbatim
 * quotes with deep links. Nothing is invented. If nothing matches, the
 * question goes to the FAQ inbox instead of getting a made-up answer.
 *
 * No external API calls. Everything runs local/in-browser.
 */

import type { AppTab } from './storage'
import { COACH_INTERVIEW } from '../config/coachInterview'
import { pullCoachInterview } from './coachInterviewStore'
import { listSkills, drillsForSkill, saveDrill } from './skillPaths'
import { SHIPPED_DRILLS } from '../config/drills'
import { listDrills } from './coachContentStore'
import {
  SPOTTING_METHODS,
  SPOTTING_SKILLS,
  SPOTTING_RULES,
  SPOTTING_TOUCH_ETHICS,
  getSpottingSkill,
} from '../config/spotting'
import { TECHNIQUE_EVIDENCE } from '../config/techniqueEvidence'
import { getRegistrySkillByGuideId } from './skillRegistry'
import { getCollections } from './clipStore'
import { readFaqAnswers } from './chatFaq'
import type { DrillClip } from '../types'

export type ChatLink =
  | { kind: 'tab'; tab: AppTab }
  | { kind: 'skill'; skillId: string }
  | { kind: 'clip'; url: string }

export type CorpusDoc = {
  id: string
  kind: 'interview' | 'skill' | 'drill' | 'spotting' | 'proof' | 'reference' | 'faq'
  title: string
  text: string
  link?: ChatLink
}

const STOP = new Set(
  'a,an,the,and,or,but,if,then,than,so,of,at,by,for,with,about,into,from,to,in,on,do,does,did,doesn,is,are,was,were,be,been,being,have,has,had,how,what,when,where,which,who,whom,why,can,could,should,would,will,i,me,my,you,your,we,our,they,their,it,its,this,that,these,those,there,here,not,no,yes,please,like,just,get,got,make,made'.split(
    ',',
  ),
)

function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 3 && w.endsWith('es')) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1)
  return w
}

export function queryTokens(q: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of q.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || STOP.has(raw)) continue
    const s = stem(raw)
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

function scoreDoc(doc: CorpusDoc, tokens: string[]): number {
  const title = doc.title.toLowerCase()
  const text = doc.text.toLowerCase()
  let score = 0
  for (const t of tokens) {
    if (title.includes(t)) score += 3
    else if (text.includes(t)) score += 1
  }
  return score
}

export type ScoredDoc = { doc: CorpusDoc; score: number }

const MIN_SCORE = 2

/** Top matching docs for a question, or null when nothing matches well enough. */
export function answerQuestion(query: string, docs: CorpusDoc[]): ScoredDoc[] | null {
  const tokens = queryTokens(query)
  if (tokens.length === 0) return null
  const scored = docs
    .map((doc) => ({ doc, score: scoreDoc(doc, tokens) }))
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  return scored.length > 0 ? scored : null
}

/** Verbatim excerpt around the first matched query token. */
export function excerptFor(doc: CorpusDoc, query: string, radius = 140): string {
  const tokens = queryTokens(query)
  const lower = doc.text.toLowerCase()
  let idx = -1
  for (const t of tokens) {
    const i = lower.indexOf(t)
    if (i >= 0 && (idx < 0 || i < idx)) idx = i
  }
  if (idx < 0) return doc.text.slice(0, radius * 2)
  const start = Math.max(0, idx - radius)
  const end = Math.min(doc.text.length, idx + radius)
  const head = start > 0 ? '…' : ''
  const tail = end < doc.text.length ? '…' : ''
  return head + doc.text.slice(start, end).trim() + tail
}

/** Build the full answerable corpus. Async: interview answers + reference library live elsewhere. */
export async function buildCorpus(): Promise<CorpusDoc[]> {
  const docs: CorpusDoc[] = []

  // Interview — Ryan's own words.
  let answers: Record<string, string> = {}
  try {
    answers = await pullCoachInterview()
  } catch {
    answers = {}
  }
  for (const section of COACH_INTERVIEW) {
    for (const q of section.questions) {
      const a = (answers[q.id] ?? '').trim()
      if (!a) continue
      docs.push({
        id: `interview:${q.id}`,
        kind: 'interview',
        title: q.question,
        text: a,
        link: { kind: 'tab', tab: 'learn' },
      })
    }
  }

  // Skill cards.
  for (const s of listSkills()) {
    const parts: string[] = []
    if (s.note) parts.push(s.note)
    if (s.aliases && s.aliases.length > 0) parts.push(`Also called: ${s.aliases.join(', ')}.`)
    const drills = drillsForSkill(s.id)
    if (drills.length > 0) parts.push(`Drills: ${drills.map((d) => d.label).join('; ')}.`)
    const text = parts.join(' ').trim()
    if (!text) continue
    docs.push({
      id: `skill:${s.id}`,
      kind: 'skill',
      title: s.name,
      text,
      link: { kind: 'skill', skillId: s.id },
    })
  }

  // Drills — shipped + coach library.
  const seenDrills = new Set<string>()
  const drillDocs: CorpusDoc[] = []
  for (const d of [...SHIPPED_DRILLS, ...listDrills()]) {
    if (seenDrills.has(d.id)) continue
    seenDrills.add(d.id)
    const text = [d.title, d.notes].filter(Boolean).join(' — ').trim()
    if (!text) continue
    drillDocs.push({
      id: `drill:${d.id}`,
      kind: 'drill',
      title: d.title,
      text,
      link: { kind: 'tab', tab: 'drills' },
    })
  }
  docs.push(...drillDocs)

  // Spotting system.
  for (const m of SPOTTING_METHODS) {
    const parts = [m.description]
    if (m.credit) parts.push(`Credit: ${m.credit}.`)
    if (m.cues && m.cues.length > 0) parts.push(`Cues: ${m.cues.join(' ')}`)
    if (m.watchOuts && m.watchOuts.length > 0) parts.push(`Watch out: ${m.watchOuts.join(' ')}`)
    const applies = m.appliesTo
      .map((id) => getSpottingSkill(id)?.name)
      .filter(Boolean)
      .join(', ')
    if (applies) parts.push(`Used for: ${applies}.`)
    docs.push({
      id: `spotting-method:${m.id}`,
      kind: 'spotting',
      title: `${m.name} (spotting method)`,
      text: parts.join(' '),
      link: { kind: 'tab', tab: 'spotting' },
    })
  }
  for (const s of SPOTTING_SKILLS) {
    const methodNames = s.methodIds
      .map((id) => SPOTTING_METHODS.find((m) => m.id === id)?.name)
      .filter(Boolean)
      .join(', ')
    const parts = [`Spotting for ${s.name}.`]
    if (s.sub) parts.push(s.sub)
    if (methodNames) parts.push(`Methods: ${methodNames}.`)
    if (s.prerequisites) parts.push(`Before spotting: ${s.prerequisites}`)
    if (s.methodNote) parts.push(s.methodNote)
    docs.push({
      id: `spotting-skill:${s.id}`,
      kind: 'spotting',
      title: `Spotting ${s.name}`,
      text: parts.join(' '),
      link: { kind: 'tab', tab: 'spotting' },
    })
  }
  SPOTTING_RULES.forEach((r, i) =>
    docs.push({
      id: `spotting-rule:${i}`,
      kind: 'spotting',
      title: 'General spotting rule',
      text: r,
      link: { kind: 'tab', tab: 'spotting' },
    }),
  )
  SPOTTING_TOUCH_ETHICS.forEach((t, i) =>
    docs.push({
      id: `spotting-ethics:${i}`,
      kind: 'spotting',
      title: 'Spotting touch and comfort',
      text: t,
      link: { kind: 'tab', tab: 'spotting' },
    }),
  )

  // Technique evidence — proof videos with watch-for lines.
  for (const [key, videos] of Object.entries(TECHNIQUE_EVIDENCE)) {
    const skill = getRegistrySkillByGuideId(key)
    for (const v of videos) {
      docs.push({
        id: `proof:${key}:${v.url}`,
        kind: 'proof',
        title: `${v.who} — ${skill?.name ?? key}`,
        text: v.watchFor,
        link: skill ? { kind: 'skill', skillId: skill.id } : { kind: 'tab', tab: 'learn' },
      })
    }
  }

  // Reference library — names + keywords only.
  try {
    const cols = await getCollections()
    for (const c of cols) {
      for (const item of c.items) {
        const kw = Array.isArray(item.keywords) ? item.keywords.join(' ') : ''
        const text = `${item.name} ${kw}`.trim()
        if (!text || !item.url) continue
        docs.push({
          id: `ref:${item.id}`,
          kind: 'reference',
          title: item.name,
          text,
          link: { kind: 'clip', url: item.url },
        })
      }
    }
  } catch {
    /* library unreadable — skip */
  }

  // FAQ answers Ryan wrote — these improve the bot over time.
  for (const f of readFaqAnswers()) {
    docs.push({
      id: `faq:${f.id}`,
      kind: 'faq',
      title: f.question,
      text: f.answer ?? '',
    })
  }

  return docs
}

// ---------------------------------------------------------------------------
// Co-builder commands — the chat and the skill-path builder as one flow.
// ---------------------------------------------------------------------------

export type BuilderCommand = { drillQuery: string; skillQuery: string }

/**
 * "add this drill to my roundoff path", "add candlestick drill to back tuck".
 * Returns null when the text isn't a builder command.
 */
export function parseBuilderCommand(text: string): BuilderCommand | null {
  const m = text.trim().match(/^add\s+(.+?)\s+to\s+(?:my\s+)?(.+?)(?:\s+(?:path|skill|card))?\s*$/i)
  if (!m) return null
  const drill = m[1].replace(/\s+drill\s*$/i, '').trim()
  const skill = m[2].trim()
  if (!drill || !skill) return null
  return { drillQuery: drill, skillQuery: skill }
}

export function isThisDrill(q: string): boolean {
  return /^(this|that)\s+(drill|one|video)?$/i.test(q.trim()) || q.trim().toLowerCase() === 'this'
}

export function findDrills(query: string): DrillClip[] {
  const q = query.toLowerCase()
  const seen = new Set<string>()
  const out: DrillClip[] = []
  for (const d of [...SHIPPED_DRILLS, ...listDrills()]) {
    if (seen.has(d.id)) continue
    seen.add(d.id)
    if (d.title.toLowerCase().includes(q)) out.push(d)
  }
  return out
}

export type NamedSkill = { id: string; name: string }

export function findSkills(query: string): NamedSkill[] {
  const q = query.toLowerCase()
  return listSkills()
    .filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
    )
    .map((s) => ({ id: s.id, name: s.name }))
}

/** Attach a drill label to a skill's path. Returns the created drill. */
export function addDrillToSkill(skillId: string, label: string) {
  const order = drillsForSkill(skillId).length
  return saveDrill({ skillId, label, order })
}
