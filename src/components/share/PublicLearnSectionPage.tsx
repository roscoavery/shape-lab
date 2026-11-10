/**
 * Public single-section Learn page (build 1233).
 *
 * Rendered standalone at /share/learn/<token>/<section> with NO sign-in,
 * one section only: how-skills-grow, concepts, or 4-levels. The token is
 * the same parent Learn desk token; the server endpoint validates both the
 * token and the section slug before the page renders anything. No athlete
 * data, no roster, no notes, no edit paths: ConceptCards renders with its
 * default canEdit=false, ProgressionLevels is read-only, and PhysicsLessons
 * without a ShapeCopyContext provider reports canEdit=false, so its edit
 * UI never appears here.
 */

import { useEffect, useState } from 'react'
import { ATHLETE_PROGRESSION_LESSONS } from '../../config/athleteProgression'
import { ConceptCards } from '../learn/ConceptCards'
import { PhysicsLessons } from '../learn/PhysicsLessons'
import { ProgressionLevels } from '../learn/ProgressionLevels'

export type LearnSectionSlug = 'how-skills-grow' | 'concepts' | '4-levels'

const SECTION_TITLES: Record<LearnSectionSlug, string> = {
  'how-skills-grow': 'How skills grow',
  concepts: 'Coaching concepts',
  '4-levels': 'The 4 levels of progression',
}

const SECTION_EYEBROWS: Record<LearnSectionSlug, string> = {
  'how-skills-grow': 'Learn · How skills grow',
  concepts: 'Learn · Coaching concepts',
  '4-levels': 'Learn · 4 levels',
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; title: string }

export default function PublicLearnSectionPage({
  token,
  section,
}: {
  token: string
  section: string
}) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    fetch(
      `/api/share/learn/section?token=${encodeURIComponent(token)}&section=${encodeURIComponent(section)}`,
    )
      .then(async (r) => {
        const body = await r.json().catch(() => null)
        if (!r.ok) {
          throw new Error(
            (body && body.error) || 'This shared page could not be found.',
          )
        }
        return body as { title: string }
      })
      .then((body) => {
        if (!cancelled) {
          setState({ status: 'ready', title: body.title })
          document.title = `ShapeLab | ${body.title}`
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load this page.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [token, section])

  const slug = section as LearnSectionSlug
  const eyebrow = SECTION_EYEBROWS[slug] ?? 'Learn'

  return (
    <div className="min-h-dvh bg-[#0b0f14] text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-sm font-extrabold tracking-wide">Shape Lab</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            {eyebrow}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-5">
        {state.status === 'loading' && (
          <p className="py-16 text-center text-sm text-white/60">Loading…</p>
        )}
        {state.status === 'error' && (
          <div className="py-16 text-center">
            <p className="text-sm font-bold">{state.message}</p>
            <p className="mt-2 text-xs text-white/60">
              The link may be old, or the gym may be offline right now.
            </p>
          </div>
        )}
        {state.status === 'ready' && (
          <div className="grid gap-4">
            <h1 className="learn-serif text-2xl font-semibold">
              {SECTION_TITLES[slug] ?? state.title}
            </h1>
            {slug === 'how-skills-grow' && (
              <PhysicsLessons
                lessons={ATHLETE_PROGRESSION_LESSONS}
                heading="How skills grow"
              />
            )}
            {slug === 'concepts' && <ConceptCards />}
            {slug === '4-levels' && <ProgressionLevels />}
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 px-4 py-6">
        <p className="mx-auto max-w-3xl text-center text-xs text-white/50">
          Shared from Shape Lab · This link works while Coach Ryan&apos;s gym is online.
        </p>
      </footer>
    </div>
  )
}
