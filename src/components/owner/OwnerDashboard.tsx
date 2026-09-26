/**
 * Gym owner dashboard — the owner-only tab. Six modules:
 * Overview, Coach onboarding, Class criteria (levels), Classes,
 * Staff hub, Athlete progress. Read-only aggregates plus owner
 * management tools. Nothing here touches athlete/coach/parent flows.
 */
import { useState } from 'react'
import type { Athlete } from '../../types'
import { OwnerOverview } from './OwnerOverview'
import { OnboardingManager } from './OnboardingManager'
import { ClassCriteria } from './ClassCriteria'
import { OwnerClasses } from './OwnerClasses'
import { StaffHub } from './StaffHub'
import { AthleteProgress } from './AthleteProgress'

type Props = {
  owner: Athlete
  athletes: Athlete[]
}

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'levels', label: 'Levels' },
  { id: 'classes', label: 'Classes' },
  { id: 'staff', label: 'Staff' },
  { id: 'progress', label: 'Athletes' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export function OwnerDashboard({ owner, athletes }: Props) {
  const [section, setSection] = useState<SectionId>('overview')
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-[var(--text)]">Gym owner</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">
          Standards, visibility, and people — the coaching layer on top of what the gym already runs.
        </p>
      </div>
      <nav aria-label="Owner sections" className="mb-4 flex max-w-full gap-1.5 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            aria-current={section === s.id ? 'page' : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
              section === s.id
                ? 'bg-[var(--accent-dim)] font-semibold text-white'
                : 'bg-white/5 text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>
      {section === 'overview' && <OwnerOverview athletes={athletes} />}
      {section === 'onboarding' && <OnboardingManager owner={owner} athletes={athletes} />}
      {section === 'levels' && <ClassCriteria athletes={athletes} />}
      {section === 'classes' && <OwnerClasses athletes={athletes} ownerId={owner.id} />}
      {section === 'staff' && <StaffHub owner={owner} athletes={athletes} />}
      {section === 'progress' && <AthleteProgress athletes={athletes} />}
    </div>
  )
}
