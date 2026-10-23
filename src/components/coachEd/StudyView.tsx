import { MODULES } from '../../content/coachEd/modules'
import { DECKS, MATCHING } from '../../content/coachEd/practice'
import type { Lesson, ModuleId } from '../../content/coachEd/types'
import { useCoachEd } from './CoachEdContext'
import { FlashcardDeckView } from './FlashcardDeckView'
import { MatchingExercise } from './MatchingExercise'
import { ReviewBadge } from './SafetyBanner'

export type StudyRoute = 'home' | 'practice'

export function StudyHome({
  lessons,
  onLesson,
  onLibrary,
  route,
  setRoute,
}: {
  lessons: Lesson[] | null
  onLesson: (id: string) => void
  onLibrary: () => void
  route: StudyRoute
  setRoute: (r: StudyRoute) => void
}) {
  const ctx = useCoachEd()
  const done = ctx.state?.mine.lessons ?? {}

  if (route === 'practice') {
    return (
      <section className="space-y-4">
        <button type="button" onClick={() => setRoute('home')} className="text-sm text-[var(--accent)]">
          &larr; Study
        </button>
        <h3 className="text-xl font-semibold">Practice</h3>
        <p className="text-sm text-[var(--muted)]">Not graded. Use these to warm up before an assessment.</p>
        {DECKS.map((d) => (
          <FlashcardDeckView key={d.id} deckId={d.id} />
        ))}
        {MATCHING.map((m) => (
          <MatchingExercise key={m.id} matchingId={m.id} />
        ))}
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onLibrary}
          className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-4 text-left active:bg-white/10"
        >
          <span className="block text-base font-semibold">Injury library</span>
          <span className="mt-0.5 block text-xs text-[var(--muted)]">Search injuries by name or by what you saw</span>
        </button>
        <button
          type="button"
          onClick={() => setRoute('practice')}
          className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-4 text-left active:bg-white/10"
        >
          <span className="block text-base font-semibold">Practice</span>
          <span className="mt-0.5 block text-xs text-[var(--muted)]">Flashcards and matching, not graded</span>
        </button>
      </div>

      {!lessons && <p className="py-6 text-center text-sm text-[var(--muted)]">Loading lessons</p>}
      {lessons &&
        MODULES.filter((m) => m.id !== 'testing').map((m) => {
          const list = lessons.filter((l) => l.moduleId === (m.id as ModuleId))
          if (list.length === 0) return null
          return (
            <div key={m.id}>
              <h3 className="text-lg font-semibold">{m.title}</h3>
              <p className="mb-2 text-sm text-[var(--muted)]">{m.blurb}</p>
              <ul className="space-y-2">
                {list.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => onLesson(l.id)}
                      className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left active:bg-white/10"
                    >
                      <span
                        aria-label={done[l.id] ? 'Read' : 'Not read yet'}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                          done[l.id] ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-white/30'
                        }`}
                      >
                        {done[l.id] ? '\u2713' : ''}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold leading-snug">{l.title}</span>
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">{l.kicker}</span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <span className="text-[11px] text-[var(--muted)]">{l.minutes} min</span>
                          <ReviewBadge status={ctx.reviewOf('lesson', l.id, l.review)} />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
    </section>
  )
}
