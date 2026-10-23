import { ASSESSMENTS } from '../../src/content/coachEd/assessments.ts'
import { COMPARISONS } from '../../src/content/coachEd/comparisons.ts'
import { CONDITION_FILES, CONDITION_LOADERS } from '../../src/content/coachEd/conditions/files.ts'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildQuestionSources } from '../coach-ed-gen-questions.ts'
import { buildIndexSource } from '../coach-ed-gen-index.ts'
import { MEDIA_ASSETS, MEDIA_SLOTS } from '../../src/content/coachEd/media.ts'
import { MOVEMENT_TERMS } from '../../src/content/coachEd/movementTerms.ts'
import { DECKS, MATCHING } from '../../src/content/coachEd/practice.ts'
import { QUESTION_BANK } from '../../src/content/coachEd/questions/bank.generated.ts'
import { loadAllLessons } from '../../src/content/coachEd/registry.ts'
import { SCENARIOS } from '../../src/content/coachEd/scenarios.ts'
import { SOURCES } from '../../src/content/coachEd/sources.ts'
import { STRETCH_METHODS } from '../../src/content/coachEd/stretchMethods.ts'
import type { Claim, ConditionCard, Condition, LessonBlock, RecoveryRange } from '../../src/content/coachEd/types.ts'
import { ASSESSMENT_PASS_PERCENT, CARD_SECTIONS } from '../../src/content/coachEd/types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Structural checks over all Coach education content. Returns a list of
 * human-readable problems. Empty means clean. Answer keys are checked by the
 * server test, because nothing under src/ may import them.
 */
export async function validateContent(): Promise<string[]> {
  const bad: string[] = []
  const sourceIds = new Set(SOURCES.map((s) => s.id))
  if (sourceIds.size !== SOURCES.length) bad.push('duplicate source ids')
  const needSources = (where: string, ids: string[] | undefined) => {
    for (const id of ids ?? []) if (!sourceIds.has(id)) bad.push(`${where}: unknown source "${id}"`)
  }

  for (const s of SOURCES) {
    if (!s.url.startsWith('https://')) bad.push(`source ${s.id}: url must be https`)
    if (!s.title || !s.by || !s.venue) bad.push(`source ${s.id}: missing bibliographic field`)
    if (s.kind === 'journal' && !s.pmid && !s.doi) bad.push(`source ${s.id}: journal source needs pmid or doi`)
  }

  // Conditions
  const conditions: Condition[] = []
  for (const f of CONDITION_FILES) conditions.push(...(await CONDITION_LOADERS[f]()))
  const conditionIds = new Set(conditions.map((c) => c.id))
  if (conditionIds.size !== conditions.length) bad.push('duplicate condition ids')
  const mediaIds = new Set(MEDIA_ASSETS.map((m) => m.id))
  const claimOk = (where: string, c: Claim) => {
    needSources(where, c.sourceIds)
    const backed = (c.sourceIds?.length ?? 0) > 0 || c.evidence === 'uncertain' || c.evidence === 'policy'
    if (!backed) bad.push(`${where}: claim has no source and is not marked uncertain or policy`)
    if (!c.text.trim()) bad.push(`${where}: empty claim`)
  }
  const rangeOk = (where: string, r: RecoveryRange) => {
    needSources(where, r.sourceIds)
    if (!r.uncertain && r.sourceIds.length === 0) bad.push(`${where}: range has no source and is not uncertain`)
    if (r.minWeeks !== undefined && r.maxWeeks !== undefined && r.minWeeks > r.maxWeeks) bad.push(`${where}: min > max`)
  }
  for (const c of conditions) {
    for (const r of c.related) if (!conditionIds.has(r)) bad.push(`condition ${c.id}: unknown related "${r}"`)
    for (const m of c.mediaIds) if (!mediaIds.has(m)) bad.push(`condition ${c.id}: unknown media "${m}"`)
    if (c.completeness === 'complete') {
      if (!c.card) {
        bad.push(`condition ${c.id}: complete but no card`)
        continue
      }
      for (const sec of CARD_SECTIONS) {
        const v = c.card[sec.key as keyof ConditionCard]
        const where = `condition ${c.id}.${sec.key}`
        if (sec.key === 'tissueRecovery' || sec.key === 'returnToImpact') rangeOk(where, v as RecoveryRange)
        else if (sec.key === 'summary') claimOk(where, v as Claim)
        else if (!Array.isArray(v) || v.length === 0) bad.push(`${where}: empty`)
        else for (const claim of v as Claim[]) claimOk(where, claim)
      }
      if (c.card.redFlags.length === 0) bad.push(`condition ${c.id}: no red flags`)
    } else {
      if (c.card) bad.push(`condition ${c.id}: in preparation but has a card`)
      if (!c.preparationNote) bad.push(`condition ${c.id}: in preparation without a note`)
    }
  }
  const fresh = await buildIndexSource()
  const onDisk = readFileSync(join(root, 'src/content/coachEd/conditions/index.generated.ts'), 'utf8')
  if (fresh !== onDisk) bad.push('generated condition index is stale, run npm run coach-ed:gen')
  const { bank } = buildQuestionSources()
  const bankOnDisk = readFileSync(join(root, 'src/content/coachEd/questions/bank.generated.ts'), 'utf8')
  if (bank !== bankOnDisk) bad.push('generated question bank is stale, run npm run coach-ed:gen')

  // Lessons
  const lessons = await loadAllLessons()
  const lessonIds = new Set(lessons.map((l) => l.id))
  if (lessonIds.size !== lessons.length) bad.push('duplicate lesson ids')
  const slotIds = new Set(MEDIA_SLOTS.map((s) => s.id))
  const cmpIds = new Set(COMPARISONS.map((c) => c.id))
  const scIds = new Set(SCENARIOS.map((s) => s.id))
  const deckIds = new Set(DECKS.map((d) => d.id))
  const matchIds = new Set(MATCHING.map((m) => m.id))
  const blockOk = (where: string, b: LessonBlock) => {
    switch (b.kind) {
      case 'p':
      case 'list':
      case 'callout':
        needSources(where, b.sourceIds)
        break
      case 'figure':
        if (!slotIds.has(b.slotId)) bad.push(`${where}: unknown figure slot "${b.slotId}"`)
        break
      case 'comparison':
        if (!cmpIds.has(b.comparisonId)) bad.push(`${where}: unknown comparison "${b.comparisonId}"`)
        break
      case 'conditions':
        for (const id of b.conditionIds) if (!conditionIds.has(id)) bad.push(`${where}: unknown condition "${id}"`)
        break
      case 'scenarios':
        for (const id of b.scenarioIds) if (!scIds.has(id)) bad.push(`${where}: unknown scenario "${id}"`)
        break
      case 'flashcards':
        if (!deckIds.has(b.deckId)) bad.push(`${where}: unknown deck "${b.deckId}"`)
        break
      case 'matching':
        if (!matchIds.has(b.matchingId)) bad.push(`${where}: unknown matching "${b.matchingId}"`)
        break
      default:
        break
    }
  }
  for (const l of lessons) for (const b of l.blocks) blockOk(`lesson ${l.id}`, b)

  // Comparisons, scenarios, methods, terms
  for (const t of COMPARISONS) {
    for (const r of t.rows) {
      needSources(`comparison ${t.id}`, r.sourceIds)
      for (const col of t.columns) if (!(col.id in r.cells)) bad.push(`comparison ${t.id}: row "${r.label}" missing "${col.id}"`)
    }
  }
  for (const s of SCENARIOS) {
    needSources(`scenario ${s.id}`, s.sourceIds)
    if (s.choices.filter((c) => c.safest).length !== 1) bad.push(`scenario ${s.id}: needs exactly one safest choice`)
  }
  for (const m of STRETCH_METHODS) needSources(`stretch method ${m.id}`, m.sourceIds)
  const termIds = new Set(MOVEMENT_TERMS.map((t) => t.id))
  if (termIds.size !== MOVEMENT_TERMS.length) bad.push('duplicate movement term ids')
  for (const t of MOVEMENT_TERMS) {
    needSources(`term ${t.id}`, t.sourceIds)
    if (t.kind === 'loading' && t.isJointAction) bad.push(`term ${t.id}: loading concept marked as joint action`)
  }

  // Media
  for (const a of MEDIA_ASSETS) {
    if (a.status === 'approved') {
      if (a.license === 'unknown') bad.push(`media ${a.id}: approved with unknown license`)
      if (!a.commercialUseAllowed) bad.push(`media ${a.id}: approved without commercial use`)
      if (!a.verificationEvidence || !a.verifiedOn) bad.push(`media ${a.id}: approved without verification evidence`)
      if (!a.localPath) bad.push(`media ${a.id}: approved without a hosted copy`)
      if (!a.creditLine) bad.push(`media ${a.id}: approved without a credit line`)
      if (!a.altText) bad.push(`media ${a.id}: approved without alt text`)
    }
    if (a.status === 'rejected' && !a.rejectionReason) bad.push(`media ${a.id}: rejected without a reason`)
    if (a.license === 'unknown' && a.status !== 'rejected' && a.status !== 'candidate' && a.status !== 'license_pending')
      bad.push(`media ${a.id}: unknown license past license_pending`)
  }
  for (const s of MEDIA_SLOTS) for (const id of s.assetIds) if (!mediaIds.has(id)) bad.push(`slot ${s.id}: unknown asset "${id}"`)

  // Questions (public half)
  const qIds = new Set<string>()
  for (const q of QUESTION_BANK) {
    if (qIds.has(q.id)) bad.push(`duplicate question id ${q.id}`)
    qIds.add(q.id)
    needSources(`question ${q.id}`, q.sourceIds)
    if (q.sourceIds.length === 0) bad.push(`question ${q.id}: no source`)
    if (q.choices.length !== 4 || new Set(q.choices.map((c) => c.label)).size !== 4) bad.push(`question ${q.id}: needs 4 distinct choices`)
    if ('answerId' in q || 'explain' in q || 'why' in q) bad.push(`question ${q.id}: public question carries answer fields`)
  }
  const byTopic = new Map<string, number>()
  for (const q of QUESTION_BANK) byTopic.set(q.topicId, (byTopic.get(q.topicId) ?? 0) + 1)
  for (const a of ASSESSMENTS) {
    for (const t of a.topicIds) if (!byTopic.has(t)) bad.push(`assessment ${a.id}: topic "${t}" has no questions`)
    const avail = QUESTION_BANK.filter((q) => a.topicIds.includes(q.topicId)).length
    if (avail < 4) bad.push(`assessment ${a.id}: fewer than 4 questions`)
  }
  if (ASSESSMENTS.length !== 13) bad.push('expected 13 assessments')
  if (ASSESSMENT_PASS_PERCENT !== 85) bad.push('pass threshold must default to 85')
  return bad
}
