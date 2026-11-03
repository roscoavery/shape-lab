/**
 * DeadMatLesson — the Training for Dead Mat parent education lesson
 * (build 1202).
 *
 * Renders DEAD_MAT_LESSON (src/config/deadMatLesson.ts) inside the same
 * article shell parents already know. Reached through the Parent
 * Education desk and the public parent Learn desk via the `lesson`
 * article marker in parentEducation.ts; ParentGuideArticle branches here
 * when that marker is set, so the interview Q&A renderer stays untouched.
 *
 * Interactives are all local state: expandable stage cards, an expandable
 * surface comparison, a blocking schematic (hands plant, feet behind
 * them, trajectory redirected; lines and arrows only, never an athlete
 * figure, so no position can read as ideal), and a knowledge check with
 * explanations. No athlete data, no roster access, no new permissions.
 * External links open out (Instagram, Baylor, research); nothing is
 * scraped, downloaded, cached, or rehosted.
 */

import { useState } from 'react'
import { CollapsibleSection } from '../CollapsibleSection'
import { DEAD_MAT_LESSON } from '../../config/deadMatLesson'

const L = DEAD_MAT_LESSON

/**
 * BlockingSchematic — a block, not an acceleration diagram (build 1203).
 *
 * Ryan's correction, owned: the 1202 arrows showed run-up speed continuing
 * forward and up, which reads as a positive angle for acceleration into a
 * handspring. A block is the opposite shape. The hands plant while the feet
 * are still BEHIND them, and the push redirects momentum into the next
 * skill instead of an extra jump. This diagram shows exactly that: the
 * body line slanting back from the hands at contact, the blocking angle
 * between body and floor, and the trajectory redirected back over the
 * hands. Lines and arrows only, never an athlete figure, so no position
 * can read as ideal. Labels are short and zoned so none overlap or run
 * off the viewBox (the 1202 labels collided on a phone screen).
 */
function BlockingSchematic() {
  return (
    <figure className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
      <svg
        viewBox="0 0 340 190"
        className="w-full"
        role="img"
        aria-label="Schematic of a block: hands plant, feet behind the hands, momentum redirected into the next skill"
      >
        <defs>
          <marker
            id="dm-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill="var(--accent)" />
          </marker>
        </defs>
        <line x1="10" y1="160" x2="330" y2="160" stroke="var(--muted)" strokeWidth="1" />
        <line
          x1="170" y1="160" x2="218" y2="62"
          stroke="var(--accent)" strokeWidth="3"
        />
        <circle cx="218" cy="62" r="4" fill="var(--accent)" />
        <circle cx="170" cy="160" r="4" fill="var(--accent)" />
        <path
          d="M 170 160 Q 108 118 48 78"
          fill="none" stroke="var(--accent)" strokeWidth="3" markerEnd="url(#dm-arrow)"
        />
        <text x="222" y="48" fill="var(--muted)" fontSize="11">
          Feet behind hands
        </text>
        <text x="12" y="62" fill="var(--muted)" fontSize="11">
          Blocked trajectory
        </text>
        <text x="196" y="146" fill="var(--muted)" fontSize="11">
          Blocking angle
        </text>
        <text x="120" y="178" fill="var(--muted)" fontSize="11">
          Contact: hands
        </text>
      </svg>
      <figcaption className="mt-2 text-xs leading-relaxed text-white/55">
        A block, not an extra jump. The hands plant while the feet are
        still behind them, and the push redirects momentum into the next
        skill. The angle between the body and the floor at contact is the
        blocking angle.
      </figcaption>
    </figure>
  )
}

export function DeadMatLesson() {
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [openStage, setOpenStage] = useState<string | null>('Introduction')
  const [openSurface, setOpenSurface] = useState<string | null>(null)

  const answeredCount = Object.keys(quizAnswers).length
  const correctCount = L.quiz.filter(
    (q, i) => quizAnswers[i] === q.answerIndex,
  ).length

  return (
    <article className="min-w-0 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <p className="text-xs uppercase tracking-wider text-[var(--accent)]">
        {L.categoryLabel}
      </p>
      <h2 className="mt-2 text-2xl font-semibold">{L.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{L.subtitle}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Reading time: {L.readingTime}
      </p>

      <h3 className="mt-6 text-lg font-semibold">{L.introHeading}</h3>
      <div className="mt-2 space-y-3 text-sm leading-relaxed">
        {L.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {L.sections.map((section) => (
        <section key={section.id} className="mt-8">
          <h3 className="text-lg font-semibold">{section.heading}</h3>
          <div className="mt-2 space-y-3 text-sm leading-relaxed">
            {section.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {section.bullets && (
            <ul className="mt-3 space-y-3">
              {section.bullets.map((b) => (
                <li key={b.title} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm font-semibold">{b.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{b.text}</p>
                </li>
              ))}
            </ul>
          )}

          {section.id === 'stages' && (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <span aria-hidden>Introduction</span>
                <span aria-hidden className="text-[var(--muted)]">→</span>
                <span aria-hidden>Approximation</span>
                <span aria-hidden className="text-[var(--muted)]">→</span>
                <span aria-hidden>Acquisition</span>
                <span aria-hidden className="text-[var(--muted)]">→</span>
                <span aria-hidden>Mastery</span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Tap a stage to read what it means. This diagram does not
                assign a stage to any athlete.
              </p>
              <div className="mt-3 space-y-2">
                {L.stages.map((stage) => {
                  const isOpen = openStage === stage.name
                  return (
                    <div
                      key={stage.name}
                      className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenStage(isOpen ? null : stage.name)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                      >
                        <span className="text-sm font-semibold">{stage.name}</span>
                        <span aria-hidden className={`text-[var(--muted)] transition ${isOpen ? 'rotate-180' : ''}`}>
                          ▾
                        </span>
                      </button>
                      {isOpen && (
                        <p className="px-3 pb-3 text-sm leading-relaxed text-white/70">
                          {stage.description}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 rounded-xl bg-sky-500/10 px-3 py-2 text-sm leading-relaxed text-sky-200/90">
                {L.stages[3].note}
              </p>
            </div>
          )}

          {section.id === 'surfaces' && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-[var(--muted)]">
                Tap a surface to see what it is for, what it helps, where it
                falls short, and how it can support dead mat development.
                There is no single fixed progression that applies to everyone.
              </p>
              {L.surfaces.map((surface) => {
                const isOpen = openSurface === surface.name
                return (
                  <div
                    key={surface.name}
                    className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenSurface(isOpen ? null : surface.name)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                    >
                      <span className="text-sm font-semibold">{surface.name}</span>
                      <span aria-hidden className={`text-[var(--muted)] transition ${isOpen ? 'rotate-180' : ''}`}>
                        ▾
                      </span>
                    </button>
                    {isOpen && (
                      <div className="space-y-2 px-3 pb-3 text-sm leading-relaxed">
                        <p><span className="font-semibold">Used for: </span><span className="text-white/70">{surface.purposes}</span></p>
                        <p><span className="font-semibold">Helps: </span><span className="text-white/70">{surface.advantages}</span></p>
                        <p><span className="font-semibold">Limit: </span><span className="text-white/70">{surface.limitations}</span></p>
                        <p><span className="font-semibold">Dead mat link: </span><span className="text-white/70">{surface.deadMatSupport}</span></p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {section.id === 'power' && (
            <div className="mt-4">
              <BlockingSchematic />
              <a
                href={L.reel.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <p className="text-sm font-semibold">{L.reel.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/70">{L.reel.note}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--accent)]">
                  Watch on Instagram →
                </p>
              </a>
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold">{L.baylor.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/70">{L.baylor.text}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/55">{L.baylor.limitation}</p>
                <a
                  href={L.baylor.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-[var(--accent)]"
                >
                  Read the Baylor announcement →
                </a>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {L.deeObservation}
              </p>
              <p className="mt-3 rounded-xl bg-sky-500/10 px-3 py-2 text-sm leading-relaxed text-sky-200/90">
                {L.powerTumblingConclusion}
              </p>
            </div>
          )}

          {section.id === 'transfer' && (
            <ol className="mt-4 space-y-2">
              {L.transferSteps.map((step, i) => (
                <li key={step.title} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm font-semibold">
                    Step {i + 1}: {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{step.text}</p>
                </li>
              ))}
            </ol>
          )}

          {section.id === 'demands' && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-semibold">Strength training supports:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-white/70">
                {L.strengthItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {section.id === 'perspective' && (
            <div className="mt-2">
              <p className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                Coach&apos;s Perspective
              </p>
              <div className="mt-3 space-y-3 border-l-2 border-[var(--accent)] pl-3 text-sm leading-relaxed">
                {L.coachPerspective.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                {L.coachPerspectiveNote}
              </p>
            </div>
          )}

          {section.id === 'avoid-dead-mat' && (
            <div className="mt-4">
              <p className="rounded-xl bg-sky-500/15 px-4 py-3 text-center text-lg font-bold leading-relaxed">
                {L.finalTakeaway}
              </p>
              <div className="mt-3 space-y-3 text-sm leading-relaxed">
                {L.finalClose.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          )}
        </section>
      ))}

      <section className="mt-8">
        <h3 className="text-lg font-semibold">Knowledge Check</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">{L.quizNote}</p>
        <div className="mt-3 space-y-4">
          {L.quiz.map((q, qi) => {
            const picked = quizAnswers[qi]
            return (
              <div key={qi} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold">
                  {qi + 1}. {q.question}
                </p>
                <div className="mt-2 space-y-2">
                  {q.options.map((option, oi) => {
                    const isPicked = picked === oi
                    const isAnswer = oi === q.answerIndex
                    const revealed = picked !== undefined
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => setQuizAnswers((cur) => ({ ...cur, [qi]: oi }))}
                        className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                          revealed && isAnswer
                            ? 'border-green-400/60 bg-green-500/10'
                            : revealed && isPicked
                              ? 'border-red-400/60 bg-red-500/10'
                              : 'border-white/15'
                        }`}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
                {picked !== undefined && (
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    {picked === q.answerIndex ? 'Correct. ' : 'Not quite. '}
                    {q.explanation}
                  </p>
                )}
              </div>
            )
          })}
        </div>
        {answeredCount === L.quiz.length && (
          <p className="mt-3 text-sm font-semibold">
            {correctCount} of {L.quiz.length} correct.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h3 className="text-lg font-semibold">{L.reflectionHeading}</h3>
        <ul className="mt-3 space-y-2">
          {L.reflection.map((item) => (
            <li key={item} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <CollapsibleSection
        title="Research and Evidence"
        hint="Sources and what each one actually shows"
        defaultOpen={false}
      >
        <div className="space-y-3 px-1 pb-2">
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Evidence in this lesson falls into four kinds, strongest first:
            {L.evidenceTiers.join(', ')}.
          </p>
          {L.references.map((ref) => (
            <div key={ref.url} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {ref.kind}
              </p>
              <p className="mt-1 text-sm font-semibold leading-relaxed">{ref.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">{ref.description}</p>
              {ref.limitation && (
                <p className="mt-2 text-xs leading-relaxed text-white/55">{ref.limitation}</p>
              )}
              <a
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-[var(--accent)]"
              >
                Open source →
              </a>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </article>
  )
}
