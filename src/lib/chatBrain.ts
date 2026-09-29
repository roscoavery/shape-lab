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
import { getRegistrySkill, getRegistrySkillByGuideId, guideSkills } from './skillRegistry'
import { getCollections } from './clipStore'
import { readFaqAnswers } from './chatFaq'
import type { DrillClip } from '../types'

/** Sections inside a skill guide card that a chat deep link can jump to. */
export type SkillCardSection =
  | 'needs'
  | 'canbend'
  | 'ask'
  | 'shapes'
  | 'proof'
  | 'ryan'
  | 'breakdown'
  | 'path'

export type ChatLink =
  | { kind: 'tab'; tab: AppTab }
  | { kind: 'skill'; skillId: string; section?: SkillCardSection }
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

export type ScoredDoc = { doc: CorpusDoc; score: number }

const MIN_SCORE = 2

function scoreDoc(
  doc: CorpusDoc,
  tokens: string[],
  skill: DetectedSkill | null,
  intent: AskIntent,
): number {
  const title = doc.title.toLowerCase()
  const text = doc.text.toLowerCase()
  let score = 0
  let hits = 0
  for (const t of tokens) {
    if (title.includes(t)) {
      score += 3
      hits++
    } else if (text.includes(t)) {
      score += 1
      hits++
    }
  }
  // The skill the question is about outranks everything else: a question
  // about a back handspring must surface the back handspring card, never
  // the back tuck card that merely mentions handsprings.
  if (
    skill &&
    doc.kind === 'skill' &&
    doc.link?.kind === 'skill' &&
    doc.link.skillId === skill.id
  ) {
    score += 12
  }
  // Intent-kind alignment.
  if (intent === 'spot' && doc.kind === 'spotting') score += 4
  if (intent === 'drill' && doc.kind === 'drill') score += 4
  if (intent === 'parent' && doc.kind === 'interview') score += 2
  // Coverage bonus: most of the question's words hit this doc.
  if (tokens.length > 0 && hits / tokens.length >= 0.6) score += 2
  return score
}

export type AskIntent = 'help' | 'spot' | 'drill' | 'parent' | 'general'

const HELP_RE = /\b(struggl\w*|stuck|trouble|can'?t|won'?t|help\w*|fix\w*|work on|getting|learn\w*)\b/
const SPOT_RE = /\bspot\w*\b/
const DRILL_RE = /\bdrill\w*\b/
const PARENT_RE = /\bparent\w*\b/

/** What the asker wants: coaching help, spotting, drills, parent talk, or general. */
export function detectIntent(query: string): AskIntent {
  const q = ` ${query.toLowerCase()} `
  if (SPOT_RE.test(q)) return 'spot'
  if (DRILL_RE.test(q)) return 'drill'
  if (PARENT_RE.test(q)) return 'parent'
  if (HELP_RE.test(q)) return 'help'
  return 'general'
}

export type DetectedSkill = { id: string; name: string }

/** Normalized phrase for matching: lowercase, stemmed words, single spaces. */
function phraseKey(t: string): string {
  return t
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(stem)
    .join(' ')
}

/**
 * The skill the question is about, by name/alias phrase match.
 * Longest phrase wins ("round off back handspring" beats "back handspring"),
 * so "struggling with her back handspring" finds the back handspring card
 * and not the back tuck card. Null when no skill is named.
 */
export function detectSkill(query: string): DetectedSkill | null {
  const q = ` ${phraseKey(query)} `
  const cands: (DetectedSkill & { phrase: string })[] = []
  for (const s of guideSkills()) {
    for (const p of [s.name, ...(s.aliases ?? [])]) {
      const k = phraseKey(p)
      if (k.length < 3) continue
      cands.push({ id: s.id, name: s.name, phrase: k })
    }
  }
  cands.sort((a, b) => b.phrase.length - a.phrase.length)
  for (const c of cands) {
    if (q.includes(` ${c.phrase} `)) return { id: c.id, name: c.name }
  }
  return null
}

export type AnswerPlan = {
  skill: DetectedSkill | null
  intent: AskIntent
  scored: ScoredDoc[]
}

/** Top matching docs for a question, or null when nothing matches well enough. */
export function planAnswer(query: string, docs: CorpusDoc[]): AnswerPlan | null {
  const skill = detectSkill(query)
  const intent = detectIntent(query)
  const tokens = queryTokens(query)
  if (tokens.length === 0 && !skill) return null
  const scored = docs
    .map((doc) => ({ doc, score: scoreDoc(doc, tokens, skill, intent) }))
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  if (scored.length === 0) return null
  return { skill, intent, scored }
}

/** Back-compat: top matching docs for a question, or null. */
export function answerQuestion(query: string, docs: CorpusDoc[]): ScoredDoc[] | null {
  return planAnswer(query, docs)?.scored ?? null
}

/**
 * Conversational lead-in for an answer, in Ryan's voice. Claim-free
 * connective tissue only — every coaching claim stays inside the verbatim
 * quotes that follow, so nothing is ever invented.
 */
export function synthesizeLead(plan: AnswerPlan): string {
  const name = plan.skill?.name
  switch (plan.intent) {
    case 'help':
      return name
        ? `When an athlete is struggling with ${name}, Ryan goes back to what the card actually says:`
        : `Here's how Ryan thinks about this one:`
    case 'spot':
      return name ? `Here's how Ryan spots ${name}:` : `Here's Ryan on spotting:`
    case 'drill':
      return name ? `Drills Ryan uses for ${name}:` : `Here's what Ryan uses:`
    case 'parent':
      return `Here's how Ryan talks to parents about this:`
    default:
      return name ? `Here's what Ryan says about ${name}:` : `Here's what Ryan says on this:`
  }
}

export type AnswerExtra = {
  title: string
  text: string
  link: ChatLink
  linkLabel: string
}

/**
 * Coach-like follow-through for struggling athletes: Ryan's own prerequisite
 * list for the skill, quoted from its card. Grounded in his content —
 * never advice, just what his card requires first.
 */
export function prerequisitesExtra(plan: AnswerPlan): AnswerExtra | null {
  if (plan.intent !== 'help' || !plan.skill) return null
  const s = getRegistrySkill(plan.skill.id)
  const needs = (s?.guideNeeds ?? []).filter(Boolean)
  if (!s || needs.length === 0) return null
  return {
    title: `${s.name} — prerequisites`,
    text: `His card lists the prerequisites for ${s.name}: ${needs.join('; ')}.`,
    link: { kind: 'skill', skillId: s.id, section: 'path' },
    linkLabel: `Open ${s.name} path`,
  }
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

  // Skill cards — one doc per card section, so answers quote Ryan's actual
  // card content (his note, his ask, his breakdown) and deep-link to it.
  const guideIds = new Set<string>()
  for (const s of guideSkills()) {
    guideIds.add(s.id)
    const aliasText =
      s.aliases && s.aliases.length > 0 ? ` Also called: ${s.aliases.join(', ')}.` : ''
    const secLink = (section: SkillCardSection): ChatLink => ({
      kind: 'skill',
      skillId: s.id,
      section,
    })
    if (s.ryanNote) {
      docs.push({
        id: `skill:${s.id}:ryan`,
        kind: 'skill',
        title: `${s.name} — Ryan's note`,
        text: `Ryan: ${s.ryanNote}.${aliasText}`,
        link: secLink('ryan'),
      })
    }
    if (s.noteBlocks && s.noteBlocks.length > 0) {
      docs.push({
        id: `skill:${s.id}:breakdown`,
        kind: 'skill',
        title: `${s.name} — breaking down the video`,
        text: s.noteBlocks
          .map((b) =>
            b.kind === 'quote' ? `"${b.text}" — ${b.source}.` : `Ryan: ${b.text}.`,
          )
          .join(' '),
        link: secLink('breakdown'),
      })
    }
    if (s.ask) {
      docs.push({
        id: `skill:${s.id}:ask`,
        kind: 'skill',
        title: `${s.name} — ask your coach`,
        text: `${s.ask}.${aliasText}`,
        link: secLink('ask'),
      })
    }
    if (s.canBend && s.canBend.length > 0) {
      docs.push({
        id: `skill:${s.id}:canbend`,
        kind: 'skill',
        title: `${s.name} — can bend`,
        text: s.canBend.join(' '),
        link: secLink('canbend'),
      })
    }
  }

  // Skill-path store skills not covered by a registry guide card.
  for (const s of listSkills()) {
    if (guideIds.has(s.id)) continue
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
