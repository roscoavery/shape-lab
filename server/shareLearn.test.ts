import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isLearnSectionSlug,
  LEARN_SECTIONS,
  mergeParentGuideAnswers,
  publicLearnArticles,
} from './shareLearn.ts'
import { PARENT_EDUCATION } from '../src/config/parentEducation.ts'

describe('mergeParentGuideAnswers', () => {
  it('uses the baked-in snapshot when the answers file is empty', () => {
    const { articles, live } = mergeParentGuideAnswers({})
    assert.equal(live, false)
    assert.equal(articles.length, PARENT_EDUCATION.length)
    const first = articles[0]!
    assert.deepEqual(first.qa[0]!.answer, PARENT_EDUCATION[0]!.qa[0]!.answer)
  })

  it('a live answer wins, split into paragraphs', () => {
    const key = PARENT_EDUCATION[0]!.qa[0]!.answerKey
    const { articles, live } = mergeParentGuideAnswers({
      [key]: 'First paragraph.\n\nSecond paragraph.',
    })
    assert.equal(live, true)
    assert.deepEqual(articles[0]!.qa[0]!.answer, ['First paragraph.', 'Second paragraph.'])
    // Untouched questions keep the baked-in snapshot.
    assert.deepEqual(articles[0]!.qa[1]!.answer, PARENT_EDUCATION[0]!.qa[1]!.answer)
  })

  it('a blank live answer falls back to the snapshot', () => {
    const key = PARENT_EDUCATION[0]!.qa[0]!.answerKey
    const { articles, live } = mergeParentGuideAnswers({ [key]: '   \n  ' })
    assert.equal(live, true)
    assert.deepEqual(articles[0]!.qa[0]!.answer, PARENT_EDUCATION[0]!.qa[0]!.answer)
  })

  it('unknown answer keys change nothing', () => {
    const { articles } = mergeParentGuideAnswers({ 'no-such-key': 'hello' })
    assert.deepEqual(articles, PARENT_EDUCATION)
  })
})

describe('publicLearnArticles', () => {
  it('withholds the dead mat lesson from the public desk, keeps the rest', () => {
    const { articles } = mergeParentGuideAnswers({})
    const pub = publicLearnArticles(articles)
    assert.equal(pub.find((a) => a.id === 'training-for-dead-mat'), undefined)
    assert.equal(pub.length, articles.length - 1)
    assert.ok(pub.every((a) => a.publicLink !== false))
  })

  it('an article without the flag stays public', () => {
    const pub = publicLearnArticles([
      { id: 'g', category: 'guide', title: 'G', summary: '', intro: [], qa: [] },
    ])
    assert.equal(pub.length, 1)
  })
})

describe('learn section links (build 1233)', () => {
  it('exactly the three shareable sections exist', () => {
    assert.deepEqual(Object.keys(LEARN_SECTIONS).sort(), [
      '4-levels',
      'concepts',
      'how-skills-grow',
    ])
  })

  it('each section has a title and a description', () => {
    for (const section of Object.values(LEARN_SECTIONS)) {
      assert.ok(section.title.length > 0)
      assert.ok(section.description.length > 0)
    }
    assert.equal(LEARN_SECTIONS['how-skills-grow'].title, 'How skills grow')
    assert.equal(LEARN_SECTIONS.concepts.title, 'Coaching concepts')
    assert.equal(LEARN_SECTIONS['4-levels'].title, 'The 4 levels of progression')
  })

  it('accepts the three slugs and nothing else', () => {
    assert.equal(isLearnSectionSlug('how-skills-grow'), true)
    assert.equal(isLearnSectionSlug('concepts'), true)
    assert.equal(isLearnSectionSlug('4-levels'), true)
    assert.equal(isLearnSectionSlug('learn'), false)
    assert.equal(isLearnSectionSlug('path-guide'), false)
    assert.equal(isLearnSectionSlug(''), false)
    assert.equal(isLearnSectionSlug('Concepts'), false)
    assert.equal(isLearnSectionSlug('concepts/'), false)
  })
})
