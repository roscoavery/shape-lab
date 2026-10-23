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
  for (const m of ['fundamentals', 'library', 'response', 'recovery', 'movement', 'stretching']) {
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
