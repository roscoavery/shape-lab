import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { buildAuditSource } from '../coach-ed-gen-audit.ts'
import { buildManifestSource } from '../coach-ed-gen-manifest.ts'
import { MEDIA_ASSETS } from '../../src/content/coachEd/media.ts'
import { MOVEMENT_TERMS } from '../../src/content/coachEd/movementTerms.ts'
import { loadAllLessons, searchConditions } from '../../src/content/coachEd/registry.ts'
import { validateContent } from './validateContent.ts'
import { EXERCISES, EXERCISE_LINKS } from '../../src/content/coachEd/exercises.ts'
import { HOMEWORK_CATALOG } from '../../src/config/homeworkCatalog.ts'
import { SCENARIOS } from '../../src/content/coachEd/scenarios.ts'
import { SOURCES } from '../../src/content/coachEd/sources.ts'
import { ASSESSMENTS, MASTERY_LEVELS } from '../../src/content/coachEd/assessments.ts'
import { PREVENTION_EVIDENCE_LABELS } from '../../src/content/coachEd/types.ts'

const root = process.cwd()

test('content references, sources, cards, and generated files are all consistent', async () => {
  const bad = await validateContent()
  assert.deepEqual(bad, [])
})

test('server manifest is fresh', async () => {
  const disk = readFileSync(join(root, 'server/coachEd/manifest.generated.ts'), 'utf8')
  assert.equal(await buildManifestSource(), disk, 'run npm run coach-ed:gen')
})

test('image audit report is fresh', async () => {
  const disk = readFileSync(join(root, 'docs/coach-ed/image-audit.md'), 'utf8')
  assert.equal(await buildAuditSource(), disk, 'run npm run coach-ed:gen')
})

test('injury library search finds the spondylo family and aliases', () => {
  const ids = (q: string) => searchConditions({ query: q }).map((c) => c.id)
  for (const q of ['spondylolysis', 'pars', 'back pain']) assert.ok(ids(q).includes('spondylolysis'), q)
  assert.ok(ids('ganglion').includes('ganglion-cyst'))
  assert.ok(ids('head bump').includes('concussion') || ids('concussion').includes('concussion'))
  assert.deepEqual(ids('zzzznotathing'), [])
  const list = searchConditions({})
  assert.ok(list.length >= 50)
  const firstPrep = list.findIndex((c) => c.completeness === 'in_preparation')
  assert.ok(list.slice(firstPrep).every((c) => c.completeness === 'in_preparation'), 'complete entries sort first')
})

test('every module has lessons and the existing Learn lessons are preserved', async () => {
  const lessons = await loadAllLessons()
  for (const m of ['fundamentals', 'library', 'response', 'recovery', 'movement', 'stretching', 'training']) {
    assert.ok(lessons.some((l) => l.moduleId === m), m)
  }
  const legacy = new Set(lessons.map((l) => l.legacyId).filter(Boolean))
  for (const id of ['movement-names', 'struggle-hypermobile', 'tissues-grades', 'injury-prevention']) {
    assert.ok(legacy.has(id), `existing lesson ${id} kept`)
  }
})

test('loading concepts stay separate from joint actions', () => {
  const loading = MOVEMENT_TERMS.filter((t) => t.kind === 'loading')
  assert.ok(loading.length >= 5)
  assert.ok(loading.every((t) => !t.isJointAction))
  const names = new Set(MOVEMENT_TERMS.filter((t) => t.isJointAction).map((t) => t.term.toLowerCase()))
  for (const w of ['compression', 'tension', 'shear', 'torsion']) assert.ok(!names.has(w), w)
})

test('approved visuals have hosted files, and no unapproved license is shown as verified', () => {
  for (const a of MEDIA_ASSETS) {
    if (a.status === 'approved') {
      assert.ok(a.localPath && existsSync(join(root, 'public', a.localPath.replace(/^\//, ''))), `${a.id} file exists`)
      assert.ok(['CC0', 'PD', 'CC-BY-4.0', 'CC-BY-3.0', 'CC-BY-SA-4.0', 'CC-BY-SA-3.0'].includes(a.license))
      assert.ok(a.commercialUseAllowed)
    }
    assert.ok(!/NC|noncommercial/i.test(a.licenseUrl) || a.status === 'rejected', `${a.id} NC license must be rejected`)
  }
})

test('expansion: every exercise link carries an evidence label, limits, and contraindications', () => {
  const labels = Object.keys(PREVENTION_EVIDENCE_LABELS)
  assert.equal(labels.length, 4)
  for (const l of EXERCISE_LINKS) {
    assert.ok(labels.includes(l.evidence), l.exerciseId)
    assert.ok(l.limits.trim() && l.contraindications.trim(), l.exerciseId)
  }
  assert.equal(EXERCISE_LINKS.length, EXERCISES.length)
  assert.equal(EXERCISE_LINKS.find((l) => l.exerciseId === 'ex-nordic')?.evidence, 'direct_reduction')
  assert.ok(EXERCISE_LINKS.filter((l) => l.evidence === 'direct_reduction').every((l) => l.sourceIds.length > 0))
})

test('expansion: Jefferson curls are education-only, caution-labeled, and not assignable', () => {
  const j = EXERCISES.find((e) => e.id === 'ex-jefferson-curl')!
  assert.ok(j.educationOnly && !j.catalogId)
  assert.equal(j.caution, 'advanced')
  assert.ok((j.readiness?.length ?? 0) >= 7)
  assert.ok((j.contraindications?.length ?? 0) >= 5)
  assert.ok(!HOMEWORK_CATALOG.some((h) => /jefferson/i.test(h.id + h.name)))
})

test('expansion: new catalog drills exist and every exercise record points at a real catalog id', () => {
  const ids = new Set(HOMEWORK_CATALOG.map((h) => h.id))
  for (const id of ['sissy_squat', 'sled_push', 'sled_pull', 'backward_walk', 'poliquin_step', 'split_squat', 'slantboard_squat', 'back_extension', 'nordic_hamstring'])
    assert.ok(ids.has(id), id)
  for (const e of EXERCISES) if (e.catalogId) assert.ok(ids.has(e.catalogId), e.id)
  assert.equal(EXERCISES.length, 11)
})

test('expansion: safety callouts and the circulation emergency are present', async () => {
  const lessons = await loadAllLessons()
  const rice = lessons.find((l) => l.id === 'rec-rice-evolution')!
  const safety = rice.blocks.filter((b) => b.kind === 'callout' && b.tone === 'safety').map((b) => ('text' in b ? b.text : ''))
  assert.ok(safety.some((t) => /circulation/i.test(t) && /never delay/i.test(t)))
  assert.ok(rice.blocks.some((b) => b.kind === 'timeline' && b.items.length >= 5))
  const sc = SCENARIOS.find((s) => s.id === 'sc-compartment')!
  assert.ok(sc.emergency)
  const vp = lessons.find((l) => l.id === 'trn-vulnerable-positions')!
  assert.ok(vp.blocks.some((b) => 'text' in b && /injury-proof/i.test(b.text)))
  const prog = lessons.find((l) => l.id === 'trn-progression')!
  assert.ok(prog.blocks.some((b) => b.kind === 'callout' && b.tone === 'safety' && /does not prescribe rehabilitation/i.test(b.text)))
})

test('expansion: no lesson claims ice definitely speeds or delays healing', async () => {
  const lessons = await loadAllLessons()
  const text = lessons.flatMap((l) => l.blocks.flatMap((b) => ('text' in b ? [b.text] : b.kind === 'list' ? b.items : []))).join('\n')
  assert.ok(!/ice (definitely|always|is proven to) (speed|delay)s? healing/i.test(text))
})

test('expansion: practitioner sources are labeled, and the Duke account is marked unverified', async () => {
  for (const id of ['poliquin-1997', 'atg-patrick']) assert.equal(SOURCES.find((s) => s.id === id)?.kind, 'practitioner')
  const lessons = await loadAllLessons()
  const kot = lessons.find((l) => l.id === 'trn-knees-over-toes')!
  assert.ok(kot.blocks.some((b) => b.kind === 'callout' && b.tone === 'uncertain' && /Duke/.test(b.text) && /unverified/i.test(b.text)))
})

test('expansion: training_science assessment exists and Advanced requires it', () => {
  assert.equal(ASSESSMENTS.length, 14)
  const t = ASSESSMENTS.find((a) => a.id === 'training_science')!
  assert.deepEqual(t.topicIds, ['knee-travel', 'progression', 'exercise-evidence'])
  assert.ok(MASTERY_LEVELS.find((m) => m.id === 'advanced')!.requires.includes('training_science'))
  const comp = ASSESSMENTS.find((a) => a.id === 'comprehensive')!
  for (const topic of ['impingement', 'kinetic-chain', 'rice-history', 'cryotherapy', 'knee-travel', 'progression', 'exercise-evidence'])
    assert.ok(comp.topicIds.includes(topic), topic)
})
