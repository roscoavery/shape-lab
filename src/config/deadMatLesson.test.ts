/**
 * Dead Mat lesson content tests (build 1202).
 *
 * Guards the lesson data contract: quiz answers point at real options,
 * every reference is a real https link, the four stages use Shape Lab's
 * established names in order, and no string carries an em dash or en dash
 * (Ryan's standing app-copy rule).
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEAD_MAT_LESSON } from './deadMatLesson.ts'
import { PARENT_EDUCATION } from './parentEducation.ts'

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out)
    return
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStrings(item, out)
    }
  }
}

describe('dead mat lesson', () => {
  it('is listed as a lesson article in Parent Education', () => {
    const article = PARENT_EDUCATION.find((a) => a.id === 'training-for-dead-mat')
    assert.ok(article, 'training-for-dead-mat article exists')
    assert.equal(article?.category, 'lesson')
    assert.equal(article?.lesson, 'dead-mat')
    assert.equal(article?.title, 'Training for Dead Mat')
  })

  it('uses the four established stage names in order', () => {
    assert.deepEqual(
      DEAD_MAT_LESSON.stages.map((s) => s.name),
      ['Introduction', 'Approximation', 'Acquisition', 'Mastery'],
    )
  })

  it('covers all six training surfaces', () => {
    assert.deepEqual(
      DEAD_MAT_LESSON.surfaces.map((s) => s.name),
      [
        'Trampoline',
        'Tumble Track',
        'Rod Floor',
        'Spring Floor',
        'Soft Mats and Landing Systems',
        'Dead Mat',
      ],
    )
  })

  it('has four quiz questions with in-range answers', () => {
    assert.equal(DEAD_MAT_LESSON.quiz.length, 4)
    for (const q of DEAD_MAT_LESSON.quiz) {
      assert.ok(q.options.length >= 2, q.question)
      assert.ok(
        q.answerIndex >= 0 && q.answerIndex < q.options.length,
        q.question,
      )
      assert.ok(q.explanation.length > 0, q.question)
    }
    assert.deepEqual(
      DEAD_MAT_LESSON.quiz.map((q) => q.answerIndex),
      [1, 0, 1, 0],
    )
  })

  it('links only https references, including the required sources', () => {
    const urls = DEAD_MAT_LESSON.references.map((r) => r.url)
    for (const url of urls) {
      assert.ok(url.startsWith('https://'), url)
    }
    for (const host of [
      'nature.com/articles/s41598-025-26522-y',
      'publications.aap.org/pediatrics/article/154/5/e2024068956',
      'usacheer.org/safety/national-cheer-safety-month',
      'baylorbears.com/news/2024/11/13',
      'instagram.com/reel/DeKX7uGPg8c',
    ]) {
      assert.ok(
        urls.some((u) => u.includes(host)),
        `missing reference: ${host}`,
      )
    }
  })

  it('contains no em dashes or en dashes in any lesson string', () => {
    const strings: string[] = []
    collectStrings(DEAD_MAT_LESSON, strings)
    assert.ok(strings.length > 50, 'lesson has copy to check')
    for (const s of strings) {
      assert.ok(!s.includes('\u2014'), `em dash in: ${s.slice(0, 80)}`)
      assert.ok(!s.includes('\u2013'), `en dash in: ${s.slice(0, 80)}`)
    }
  })
})
