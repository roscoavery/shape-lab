import { useState } from 'react'
import { MOVEMENT_KIND_LABELS, MOVEMENT_TERMS } from '../../content/coachEd/movementTerms'
import { STRETCH_METHODS } from '../../content/coachEd/stretchMethods'
import { conditionRow } from '../../content/coachEd/registry'
import { sourceById } from '../../content/coachEd/sources'
import type { Lesson, LessonBlock, MovementTermKind } from '../../content/coachEd/types'
import { ComparisonTableView } from './ComparisonTableView'
import { coachEdApi } from './api'
import { useCoachEd } from './CoachEdContext'
import { FlashcardDeckView } from './FlashcardDeckView'
import { MatchingExercise } from './MatchingExercise'
import { EvidenceLinksView, ExerciseList, TimelineView } from './ExerciseViews'
import { DraftBanner, ReviewBadge } from './SafetyBanner'
import { ScenarioRunner } from './ScenarioRunner'
import { SourceList } from './SourceList'
import { PendingVisual, VerifiedFigure } from './VerifiedFigure'
import { urgencyClass } from './urgency'

const TONE: Record<string, string> = {
  safety: 'border-red-400/40 bg-red-500/10 text-red-100',
  tip: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  note: 'border-white/15 bg-white/5',
  uncertain: 'border-white/20 bg-white/[0.04] italic',
}
const TONE_LABEL: Record<string, string> = { safety: 'Safety', tip: 'Tip', note: 'Note', uncertain: 'Not well established' }

function Terms({ kinds }: { kinds: MovementTermKind[] }) {
  const [kind, setKind] = useState<MovementTermKind>(kinds[0])
  const terms = MOVEMENT_TERMS.filter((t) => t.kind === kind)
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      {kinds.length > 1 && (
        <div role="tablist" className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                kind === k ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]' : 'border-white/15 text-[var(--muted)]'
              }`}
            >
              {MOVEMENT_KIND_LABELS[k]}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {terms.map((t) => (
          <li key={t.id} className="rounded-xl bg-black/20 px-3 py-2">
            <p className="text-sm font-semibold">
              {t.term}
              {kind === 'loading' && <span className="ml-2 text-[10px] uppercase text-[var(--muted)]">Load, not a joint action</span>}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed">{t.definition}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">In the gym: {t.gymExample}</p>
            <SourceList ids={t.sourceIds} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Methods() {
  return (
    <div className="space-y-3">
      {STRETCH_METHODS.map((m) => (
        <section key={m.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <h4 className="text-base font-semibold">{m.name}</h4>
          <p className="mt-1 text-sm leading-relaxed">{m.what}</p>
          <dl className="mt-2 space-y-1.5 text-sm leading-relaxed">
            <div>
              <dt className="inline font-semibold">What the research says: </dt>
              <dd className="inline">{m.evidenceNote}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Gym use: </dt>
              <dd className="inline">{m.gymUse}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Cautions: </dt>
              <dd className="inline">{m.cautions}</dd>
            </div>
          </dl>
          <SourceList ids={m.sourceIds} />
        </section>
      ))}
    </div>
  )
}

function ConditionChips({ ids, onOpenCondition }: { ids: string[]; onOpenCondition: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const row = conditionRow(id)
        if (!row) return null
        return (
          <button
            key={id}
            type="button"
            onClick={() => onOpenCondition(id)}
            className={`rounded-xl border px-3 py-2 text-left text-sm active:bg-white/10 ${urgencyClass(row.urgency)}`}
          >
            <span className="block font-semibold">{row.name}</span>
            <span className="block text-[11px] opacity-80">{row.completeness === 'complete' ? 'Open card' : 'In preparation'}</span>
          </button>
        )
      })}
    </div>
  )
}

function Block({ b, onOpenCondition }: { b: LessonBlock; onOpenCondition: (id: string) => void }) {
  switch (b.kind) {
    case 'h':
      return <h4 className="pt-2 text-lg font-semibold">{b.text}</h4>
    case 'p':
      return (
        <div>
          <p className={`text-[15px] leading-relaxed ${b.evidence === 'uncertain' ? 'italic text-[var(--muted)]' : ''}`}>{b.text}</p>
          {b.sourceIds && <SourceList ids={b.sourceIds} />}
        </div>
      )
    case 'list':
      return (
        <div>
          <ul className="space-y-2 text-[15px] leading-relaxed">
            {b.items.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          {b.sourceIds && <SourceList ids={b.sourceIds} />}
        </div>
      )
    case 'callout':
      return (
        <div className={`rounded-xl border px-3 py-2.5 ${TONE[b.tone]}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{TONE_LABEL[b.tone]}</p>
          <p className="mt-0.5 text-sm leading-relaxed">{b.text}</p>
          {b.sourceIds && <SourceList ids={b.sourceIds} />}
        </div>
      )
    case 'figure':
      return <VerifiedFigure slotId={b.slotId} />
    case 'comparison':
      return <ComparisonTableView comparisonId={b.comparisonId} />
    case 'conditions':
      return <ConditionChips ids={b.conditionIds} onOpenCondition={onOpenCondition} />
    case 'scenarios':
      return <ScenarioRunner scenarioIds={b.scenarioIds} />
    case 'flashcards':
      return <FlashcardDeckView deckId={b.deckId} />
    case 'matching':
      return <MatchingExercise matchingId={b.matchingId} />
    case 'terms':
      return <Terms kinds={b.termKinds} />
    case 'methods':
      return <Methods />
    case 'exercises':
      return <ExerciseList ids={b.exerciseIds} onOpenCondition={onOpenCondition} />
    case 'evidenceLinks':
      return <EvidenceLinksView ids={b.exerciseIds} />
    case 'timeline':
      return <TimelineView items={b.items} />
  }
}

export function LessonView({
  lesson,
  onBack,
  onOpenCondition,
}: {
  lesson: Lesson
  onBack: () => void
  onOpenCondition: (id: string) => void
}) {
  const ctx = useCoachEd()
  const [busy, setBusy] = useState(false)
  const review = ctx.reviewOf('lesson', lesson.id, lesson.review)
  const done = Boolean(ctx.state?.mine.lessons[lesson.id])
  const sources = lesson.blocks.flatMap((b) =>
    b.kind === 'timeline' ? b.items.flatMap((it) => it.sourceIds) : 'sourceIds' in b && b.sourceIds ? b.sourceIds : [],
  )
  const toggle = async () => {
    setBusy(true)
    try {
      const mine = await coachEdApi.markLesson(lesson.id, !done)
      ctx.patch({ mine })
    } catch {
      /* progress is optional; the lesson still reads fine */
    } finally {
      setBusy(false)
    }
  }
  const verified = sources.filter((s) => sourceById(s)).length
  return (
    <article className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-[var(--accent)]">
        &larr; All lessons
      </button>
      <header className="space-y-1.5">
        <p className="text-xs text-[var(--muted)]">{lesson.minutes} min read</p>
        <h3 className="text-2xl font-semibold leading-tight">{lesson.title}</h3>
        <p className="text-sm text-[var(--muted)]">{lesson.kicker}</p>
        <ReviewBadge status={review} />
      </header>
      {review !== 'approved' && <DraftBanner />}
      {lesson.blocks.map((b, i) => (
        <Block key={i} b={b} onOpenCondition={onOpenCondition} />
      ))}
      {lesson.visualNeeded && lesson.visualNeeded.length > 0 && (
        <PendingVisual title="Visuals this lesson still needs" need={lesson.visualNeeded.join('; ')} />
      )}
      {lesson.gym && (
        <p className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2.5 text-sm leading-relaxed">
          <span className="font-semibold">In the gym: </span>
          {lesson.gym}
        </p>
      )}
      {verified > 0 && <SourceList ids={sources} label="All sources for this lesson" />}
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        className={`w-full rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50 ${
          done ? 'border border-emerald-400/50 text-emerald-200' : 'bg-[var(--accent)] text-[var(--on-accent)]'
        }`}
      >
        {done ? 'Marked as read. Tap to undo.' : 'Mark as read'}
      </button>
    </article>
  )
}
