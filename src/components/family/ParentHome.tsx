import { useEffect, useMemo, useState } from 'react'
import type { Athlete, HomeworkItem } from '../../types'
import { getAgeFromDateOfBirth, getAthleteAccessLevel, birthdayNeeded } from '../../lib/age'
import { loadAllHomework, loadHomeworkLogs } from '../../lib/storage'
import { PARENT_EDUCATION, PARENT_EDUCATION_CATEGORIES } from '../../config/parentEducation'
import { useParentGuide } from '../../lib/useParentGuide'
import { ParentGuideArticle } from './ParentGuideArticle'
import { HelpfulRightNow } from './HelpfulRightNow'
import { TEST_HOMEWORK, TEST_LOGS, isTestAthletePreview } from '../../lib/testParentFixture'
import { AthleteUpcomingCard, AthleteProgressCard, AthleteActivityCard } from './AthleteDeskFeed'
import { DeskMessageCarousel } from './DeskMessageCarousel'
import { NutritionFactsBrowse } from '../learn/NutritionFactsBrowse'
import { CollapsibleSection } from '../CollapsibleSection'
import { ProgressionLevels } from '../learn/ProgressionLevels'
import { ConceptCards } from '../learn/ConceptCards'

const ONBOARDING_KEY = 'shape-lab.parent-onboarding.v1'

type Props = {
  parent: Athlete
  kids: Athlete[]
  focusId: string | null
  onFocus: (id: string) => void
  onOpenAthletes: () => void
  onOpenLearn: () => void
  onOpenArticle: (articleId: string) => void
  onEnterAthleteView: (id: string) => void
  onPracticeTogether?: () => void
}

function loadOnboardingSeen(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return true
  }
}

export function ParentHome({
  parent,
  kids,
  focusId,
  onFocus,
  onOpenAthletes,
  onOpenLearn,
  onOpenArticle,
  onEnterAthleteView,
  onPracticeTogether,
}: Props) {
  const child = kids.find((row) => row.id === (focusId || kids[0]?.id)) ?? kids[0] ?? null
  const [onboardingSeen, setOnboardingSeen] = useState(loadOnboardingSeen)
  const homework = useMemo(
    () =>
      child
        ? isTestAthletePreview(child.id)
          ? TEST_HOMEWORK
          : loadAllHomework().filter((row) => row.athleteId === child.id).slice(0, 8)
        : [],
    [child],
  )
  const logs = useMemo(
    () =>
      child
        ? isTestAthletePreview(child.id)
          ? TEST_LOGS
          : loadHomeworkLogs().filter((row) => row.athleteId === child.id)
        : [],
    [child],
  )
  const dismissOnboarding = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1')
    } catch {
      /* ignore */
    }
    setOnboardingSeen(true)
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      {/* 1. Greeting / athlete selector */}
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

      {/* First-login onboarding: 3 short cards max */}
      {!onboardingSeen && kids.length > 0 && (
        <section className="grid gap-3">
          <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
            <p className="font-semibold text-[var(--text)]">Welcome to Shape Lab</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Shape Lab connects you to the same athlete profile your coach uses. See what
              they&apos;re working on, follow progress, and learn how the progression works.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
            <p className="font-semibold text-[var(--text)]">No separate account needed</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Your athlete doesn&apos;t need their own login. Tap{' '}
              <strong>Use Shape Lab as {kids[0]?.firstName || kids[0]?.name}</strong> when they
              want to practice.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
            <p className="font-semibold text-[var(--text)]">One profile, always</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              If they get their own login later, they&apos;ll see this same profile, nothing is
              duplicated or lost.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissOnboarding}
            className="justify-self-start rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
          >
            Got it
          </button>
        </section>
      )}

      <DeskMessageCarousel audience="parent" surface="home" />

      {/* How do I let my athlete use Shape Lab? */}
      {kids.length > 0 && (
        <section className="grid gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--panel)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Practice time
          </p>
          {kids.map((kid) => {
            const level = getAthleteAccessLevel(getAgeFromDateOfBirth(kid.dateOfBirth))
            return (
              <div key={kid.id} className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text)]">{kid.firstName || kid.name}</p>
                  {level === 'independent' && (
                    <p className="text-xs text-[var(--muted)]">
                      Adult athlete, they can also sign in with their own account.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onEnterAthleteView(kid.id)}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
                >
                  Use Shape Lab as {kid.firstName || kid.name}
                </button>
              </div>
            )
          })}
          <p className="text-xs text-[var(--muted)]">
            This opens their practice view on this device, no separate login needed. You stay
            signed in as the parent.
          </p>
          {kids.length >= 2 && onPracticeTogether && (
            <button
              type="button"
              onClick={onPracticeTogether}
              className="mt-1 rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-left"
            >
              <p className="text-sm font-semibold text-amber-200">
                🏆 Practice together
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Run holds for {kids.length} kids at once. Tap each name when they come out,
                each time logs to their own homework.
              </p>
            </button>
          )}
        </section>
      )}

      {!child && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <p className="text-sm text-[var(--muted)]">
            Your Parent account is ready, but the gym still needs to connect your athlete&apos;s
            existing profile.
          </p>
        </section>
      )}

      {child && (
        <>
          {/* 2. Current focus / goals */}
          <ChildFocus child={child} />
          {/* 3. What did the coach assign? */}
          <ChildHomework homework={homework} />
          {/* 4. Recent progress */}
          <AthleteProgressCard athlete={child} logs={logs} />
          {/* 5. What is coming up? */}
          <AthleteUpcomingCard athlete={child} />
          {birthdayNeeded(child.dateOfBirth) && (
            <p className="rounded-xl border border-[#6ec8d6]/40 bg-[#6ec8d6]/10 px-4 py-3 text-sm">
              Birthday needed for {child.name}. It stays private and is used for age-appropriate
              access and safety settings.
            </p>
          )}
          {/* 6. Something useful to read right now */}
          <HelpfulRightNow child={child} homework={homework} logs={logs} onOpenArticle={onOpenArticle} />
          {/* 7. Recent activity */}
          <AthleteActivityCard athlete={child} logs={logs} />
        </>
      )}

      {/* 8. Secondary */}
      <section className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onOpenAthletes} className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-left">
          <p className="text-xs uppercase tracking-wider text-[var(--accent)]">My Athletes</p>
          <p className="mt-1 font-semibold">Wins, homework, privacy</p>
        </button>
        <button type="button" onClick={onOpenLearn} className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-left">
          <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Learn</p>
          <p className="mt-1 font-semibold">{PARENT_EDUCATION[0]?.title}</p>
        </button>
      </section>
    </div>
  )
}

function ChildFocus({ child }: { child: Athlete }) {
  const age = getAgeFromDateOfBirth(child.dateOfBirth)
  const goals = child.skillGoals ?? []
  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Current focus
      </p>
      <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">{child.name}</h3>
      <p className="text-sm text-[var(--muted)]">
        {age != null ? `Age ${age}` : 'Birthday not on file'}
      </p>
      {goals.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {goals.map((g) => (
            <li key={g.id} className="text-[var(--text)]">
              {g.label || g.id}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">No goals set yet, the coach can add them.</p>
      )}
    </section>
  )
}

function ChildHomework({ homework }: { homework: HomeworkItem[] }) {
  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Homework
      </p>
      {homework.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {homework.slice(0, 5).map((row) => (
            <li key={row.id} className="text-[var(--text)]">
              {row.customLabel || row.shapeId}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Nothing assigned right now. Your coach can add homework after a class or lesson.
        </p>
      )}
    </section>
  )
}

export function ParentEducationDesk({ initialArticleId }: { initialArticleId?: string | null }) {
  const { articles, loading, live } = useParentGuide()
  const [open, setOpen] = useState<string | null>(initialArticleId ?? articles[0]?.id ?? null)
  useEffect(() => {
    if (initialArticleId) setOpen(initialArticleId)
  }, [initialArticleId])
  const article = articles.find((row) => row.id === open) ?? articles[0]
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
            {articles.filter((row) => row.category === cat.id).map((row) => (
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
      <div className="grid gap-2">
        {loading && (
          <p className="text-xs text-[var(--muted)]">Loading the latest answers…</p>
        )}
        {!loading && !live && (
          <p className="rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200/80">
            Showing saved answers, could not reach the gym computer for the latest.
          </p>
        )}
        {article && <ParentGuideArticle article={article} />}
      </div>
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
