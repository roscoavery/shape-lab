/**
 * Public shareable parent Learn desk (build 1185).
 *
 * GET /api/share/learn?token= — NO AUTH REQUIRED.
 *
 * Returns only public-safe Learn content, exactly what a signed-in parent
 * sees on the Learn tab: the Parent Guide articles (Ryan's words, with the
 * live coach-interview answers merged in the same way useParentGuide does
 * it), plus the section titles the page renders from its own bundle.
 * Articles with publicLink: false (build 1203) are withheld here until
 * Ryan approves them, even though signed-in desks still show them.
 * Nothing else: no athlete data, no roster, no notes, no edit paths.
 * The unguessable token is the only secret; every request validates it.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  PARENT_EDUCATION,
  type ParentEducationArticle,
} from '../src/config/parentEducation.ts'
import { readCoachInterviewFile } from './coachInterviewStore.ts'
import { sendJson } from './instagramResolve.ts'
import { validateShareToken } from './shareLinks.ts'

/** Split a saved answer string into display paragraphs (blank-line separated). */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

/**
 * Merge live coach-interview answers into the baked-in Parent Guide
 * articles. Same semantics as useParentGuide's mergeAnswers: a live
 * answer wins when it is present and non-blank; otherwise the baked-in
 * snapshot stands. `live` is false when the answers file holds no keys
 * at all, so the page can say it is showing saved answers.
 */
export function mergeParentGuideAnswers(
  answers: Record<string, string>,
): { articles: ParentEducationArticle[]; live: boolean } {
  const hasLive = Object.keys(answers).length > 0
  const articles = PARENT_EDUCATION.map((article) => ({
    ...article,
    qa: article.qa.map((item) => {
      const raw = hasLive ? answers[item.answerKey] : undefined
      const trimmed = raw?.trim()
      if (trimmed) {
        return { ...item, answer: splitParagraphs(trimmed) }
      }
      return item
    }),
  }))
  return { articles, live: hasLive }
}

/**
 * Public desk filter (build 1203). Articles with publicLink: false are
 * withheld from the shareable parent Learn desk until Ryan approves them.
 * The merge above still carries them, so signed-in desks and the admin
 * preview keep showing them for review. Filtering here, server side, is
 * the gate: the public page only renders what this endpoint returns.
 */
export function publicLearnArticles(
  articles: ParentEducationArticle[],
): ParentEducationArticle[] {
  return articles.filter((a) => a.publicLink !== false)
}

export async function handleShareLearn(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return
  }
  const rec = await validateShareToken(url.searchParams.get('token') ?? '')
  if (!rec || rec.type !== 'parent-learn') {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  const file = await readCoachInterviewFile()
  const { articles, live } = mergeParentGuideAnswers(file?.answers ?? {})
  res.setHeader('Cache-Control', 'public, max-age=60')
  sendJson(res, 200, { ok: true, live, articles: publicLearnArticles(articles) })
}

/**
 * Single-section public Learn pages (build 1233). Three shareable links,
 * one per section, each opening JUST that section: How skills grow,
 * Concepts, and 4 levels. Same token as the parent Learn desk, no sign-in,
 * no athlete data, no edit paths. The section content itself lives in the
 * app bundle (PhysicsLessons, ConceptCards, ProgressionLevels); this
 * endpoint only gates the link: a valid parent-learn token plus a known
 * section slug.
 */
export const LEARN_SECTIONS = {
  'how-skills-grow': {
    title: 'How skills grow',
    description:
      'Four stages, written for the person on the floor. Nerves, stuck skills, a heavy room.',
  },
  concepts: {
    title: 'Coaching concepts',
    description:
      'The ideas behind the training. Two gears, the S-curve, control, and why slow is fast.',
  },
  '4-levels': {
    title: 'The 4 levels of progression',
    description:
      'The four levels of progression. Where you are and what it takes to move up.',
  },
} as const

export type LearnSectionSlug = keyof typeof LEARN_SECTIONS

export function isLearnSectionSlug(value: string): value is LearnSectionSlug {
  return Object.prototype.hasOwnProperty.call(LEARN_SECTIONS, value)
}

export async function handleShareLearnSection(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Use GET' })
    return
  }
  const section = url.searchParams.get('section') ?? ''
  if (!isLearnSectionSlug(section)) {
    sendJson(res, 404, { error: 'Unknown section.' })
    return
  }
  const rec = await validateShareToken(url.searchParams.get('token') ?? '')
  if (!rec || rec.type !== 'parent-learn') {
    sendJson(res, 404, { error: 'Invalid or expired link.' })
    return
  }
  res.setHeader('Cache-Control', 'public, max-age=60')
  sendJson(res, 200, {
    ok: true,
    section,
    title: LEARN_SECTIONS[section].title,
    description: LEARN_SECTIONS[section].description,
  })
}
