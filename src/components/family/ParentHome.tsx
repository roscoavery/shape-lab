import { useMemo, useState } from 'react'
import type { Athlete, HomeworkItem, HomeworkLog } from '../../types'
import { getAgeFromDateOfBirth, birthdayNeeded } from '../../lib/age'
import { loadAllHomework, loadHomeworkLogs } from '../../lib/storage'
import { PARENT_EDUCATION, PARENT_EDUCATION_CATEGORIES } from '../../config/parentEducation'
import { AthleteDeskFeed } from './AthleteDeskFeed'
import { DeskMessageCarousel } from './DeskMessageCarousel'
import { NutritionFactsBrowse } from '../learn/NutritionFactsBrowse'
import { CollapsibleSection } from '../CollapsibleSection'
import { ProgressionLevels } from '../learn/ProgressionLevels'
import { ConceptCards } from '../learn/ConceptCards'

type Props = {
  parent: Athlete
  kids: Athlete[]
  focusId: string | null
  onFocus: (id: string) => void
  onOpenAthletes: () => void
  onOpenLearn: () => void
  onOpenWellness: () => void
}

export function ParentHome({
  parent,
  kids,
  focusId,
  onFocus,
  onOpenAthletes,
  onOpenLearn,
  onOpenWellness,
}: Props) {
  const child = kids.find((row) => row.id === (focusId || kids[0]?.id)) ?? kids[0] ?? null
  const homework = useMemo(
    () => (child ? loadAllHomework().filter((row) => row.athleteId === child.id).slice(0, 8) : []),
    [child],
  )
  const logs = useMemo(
    () => (child ? loadHomeworkLogs().filter((row) => row.athleteId === child.id) : []),
    [child],
  )

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Home
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">Hi, {parent.firstName || parent.name}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This page is for your family. Coaching desks stay with the coaches.
        </p>
        {kids.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {kids.map((kid) => (
              <button
                key={kid.id}
                type="button"
                onClick={() => onFocus(kid.id)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  child?.id === kid.id
                    ? 'bg-[var(--accent-dim)] font-semibold text-white'
                    : 'bg-white/5 text-[var(--muted)]'
                }`}
              >
                {kid.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <DeskMessageCarousel audience="parent" surface="home" />

      {!child && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <p className="text-sm text-[var(--muted)]">
            No linked athletes yet. Ask the gym to send a parent invite for the existing profile —
            do not create a second child.
          </p>
        </section>
      )}

      {child && (
        <>
          <ChildSnapshot child={child} homework={homework} logs={logs} />
          <AthleteDeskFeed athlete={child} logs={logs} />
          {birthdayNeeded(child.dateOfBirth) && (
            <p className="rounded-xl border border-[#6ec8d6]/40 bg-[#6ec8d6]/10 px-4 py-3 text-sm">
              Birthday needed for {child.name}. It stays private and is used for age-appropriate
              access and safety settings.
            </p>
          )}
        </>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={onOpenAthletes} className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-left">
          <p className="text-xs uppercase tracking-wider text-[var(--accent)]">My Athletes</p>
          <p className="mt-1 font-semibold">Wins, homework, privacy</p>
        </button>
        <button type="button" onClick={onOpenLearn} className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-left">
          <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Learn</p>
          <p className="mt-1 font-semibold">{PARENT_EDUCATION[0]?.title}</p>
        </button>
        <button type="button" onClick={onOpenWellness} className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-left">
          <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Body care</p>
          <p className="mt-1 font-semibold">Your notes — not your child’s</p>
        </button>
      </section>
    </div>
  )
}

function ChildSnapshot({
  child,
  homework,
  logs,
}: {
  child: Athlete
  homework: HomeworkItem[]
  logs: HomeworkLog[]
}) {
  const age = getAgeFromDateOfBirth(child.dateOfBirth)
  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <h3 className="text-lg font-semibold">{child.name}</h3>
      <p className="text-sm text-[var(--muted)]">
        {age != null ? `Age ${age}` : 'Birthday not on file'} · homework {homework.length} · recent logs{' '}
        {logs.length}
      </p>
      {child.skillGoals && child.skillGoals.length > 0 && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Goals: {child.skillGoals.map((g) => g.label || g.id).join(', ')}
        </p>
      )}
      <ul className="mt-3 space-y-1 text-sm">
        {homework.slice(0, 5).map((row) => (
          <li key={row.id} className="text-[var(--text)]">
            {row.customLabel || row.shapeId}
          </li>
        ))}
        {homework.length === 0 && <li className="text-[var(--muted)]">No homework on file yet.</li>}
      </ul>
    </section>
  )
}

export function ParentEducationDesk() {
  const [open, setOpen] = useState<string | null>(PARENT_EDUCATION[0]?.id ?? null)
  const article = PARENT_EDUCATION.find((row) => row.id === open) ?? PARENT_EDUCATION[0]
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <DeskMessageCarousel audience="parent" surface="learn" />
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          For parents
        </p>
        <p className="mt-2 px-2 text-xs leading-relaxed text-[var(--muted)]">
          How to support your athlete for the long run, in Ryan&apos;s words.
        </p>
        {PARENT_EDUCATION_CATEGORIES.map((cat) => (
          <div key={cat.id} className="mt-3">
            <p className="px-2 text-[10px] uppercase tracking-wider text-[var(--muted)]">{cat.label}</p>
            {PARENT_EDUCATION.filter((row) => row.category === cat.id).map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setOpen(row.id)}
                className={`mt-1 block w-full rounded-lg px-2 py-2 text-left text-sm ${
                  article?.id === row.id ? 'bg-white/10 font-semibold' : 'text-[var(--muted)]'
                }`}
              >
                {row.title}
              </button>
            ))}
          </div>
        ))}
      </nav>
      {article && (
        <article className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <p className="rounded-lg bg-[#102028] px-3 py-2 text-xs leading-relaxed text-[var(--accent)]">
            Written for parents, in the coach&apos;s own words.
          </p>
          <p className="mt-3 text-xs uppercase tracking-wider text-[var(--accent)]">{article.summary}</p>
          <h2 className="mt-2 text-2xl font-semibold">{article.title}</h2>
          <div className="mt-4 text-sm leading-relaxed text-[var(--text)]">
            {article.intro.map((p) => (
              <p key={p} className="mb-3">{p}</p>
            ))}
            {article.qa.map((item) => (
              <div key={item.question} className="mb-5">
                <p className="border-l-2 border-[var(--accent)] pl-3 text-xs italic leading-relaxed text-[var(--muted)]">
                  <span className="font-semibold not-italic uppercase tracking-wider text-[var(--accent)]">Question </span>
                  {item.question}
                </p>
                <div className="mt-2 space-y-3">
                  {item.answer.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      )}
    </div>
      <CollapsibleSection title="The 4 levels of progression" hint="How skills build" defaultOpen={false}>
        <ProgressionLevels />
      </CollapsibleSection>
      <CollapsibleSection title="Coaching concepts" hint="The ideas behind the coaching" defaultOpen={false}>
        <ConceptCards />
      </CollapsibleSection>
      <CollapsibleSection title="Nutrition questions" hint="NutritionFacts.org" defaultOpen={false}>
        <NutritionFactsBrowse compact />
      </CollapsibleSection>
    </div>
  )
}
