/**
 * Gym owner dashboard — the owner-only tab. Seven modules:
 * Overview, Coach onboarding, Class criteria (levels), Classes,
 * Staff hub, Athlete progress, Muse connection. Read-only aggregates plus owner
 * management tools. Nothing here touches athlete/coach/parent flows.
 *
 * Athletes shown here are scoped to this gym: only athletes who train at
 * the gym (home gym or class gyms) appear, not every profile in ShapeLab.
 *
 * Front desk mode is a simplified view for gym staff: today's classes with
 * attendance, the gym athlete list, and quick athlete creation. Leaving it
 * needs the login password so a shared front desk device stays put. The
 * linked coach login (if any) stays behind its own password.
 */
import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { AuthSessionUser } from '../../lib/authSession'
import { authWriteInit, rememberCsrf } from '../../lib/authSession'
import type { Gym } from '../../lib/gyms'
import { classGymsOf, sameGym } from '../../lib/gymScope'
import { OwnerOverview } from './OwnerOverview'
import { OnboardingManager } from './OnboardingManager'
import { ClassCriteria } from './ClassCriteria'
import { OwnerClasses } from './OwnerClasses'
import { StaffHub } from './StaffHub'
import { AthleteProgress } from './AthleteProgress'
import { MuseConnection } from './MuseConnection'
import { FrontDeskPanel } from './FrontDeskPanel'
import { AccountSwitchButton } from '../AccountSwitchButton'

type Props = {
  owner: Athlete
  athletes: Athlete[]
  user: AuthSessionUser
  gym: Gym | null
  onAthletesChange: (next: Athlete[]) => void
}

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'levels', label: 'Levels' },
  { id: 'classes', label: 'Classes' },
  { id: 'staff', label: 'Staff' },
  { id: 'progress', label: 'Athletes' },
  { id: 'muse', label: 'Muse' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const FRONT_DESK_KEY = 'shape-lab.front-desk.v1'

async function verifyPassword(password: string): Promise<boolean> {
  const res = await fetch('/api/auth/verify', {
    ...authWriteInit(JSON.stringify({ password })),
    method: 'POST',
  })
  const data = (await res.json().catch(() => ({}))) as { csrf?: string }
  rememberCsrf(data)
  return res.ok
}

export function OwnerDashboard({ owner, athletes, user, gym, onAthletesChange }: Props) {
  const [section, setSection] = useState<SectionId>('overview')
  const [frontDesk, setFrontDesk] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [password, setPassword] = useState('')
  const [leaveError, setLeaveError] = useState<string | null>(null)

  useEffect(() => {
    try {
      setFrontDesk(localStorage.getItem(FRONT_DESK_KEY) === '1')
    } catch {
      // Stay in owner view.
    }
  }, [])

  const gymAthletes = useMemo(() => {
    if (!gym) return athletes
    // Strict class association: only athletes who do classes at this gym.
    // Profiles that merely default their home gym here stay hidden until
    // they join a class roster or are marked present.
    return athletes.filter((a) => classGymsOf(a).some((g) => sameGym(g, gym.name)))
  }, [athletes, gym])

  const enterFrontDesk = () => {
    setFrontDesk(true)
    try {
      localStorage.setItem(FRONT_DESK_KEY, '1')
    } catch {
      // Mode just will not persist.
    }
  }

  const leaveFrontDesk = async () => {
    setLeaveError(null)
    const ok = await verifyPassword(password)
    if (!ok) {
      setLeaveError('That password is wrong.')
      return
    }
    setFrontDesk(false)
    setLeaving(false)
    setPassword('')
    try {
      localStorage.removeItem(FRONT_DESK_KEY)
    } catch {
      // Fine.
    }
  }

  if (frontDesk) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-[var(--text)]">Front desk</h1>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {gym ? gym.name : 'Gym'} · today's classes and athletes
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLeaving(true)}
            className="shrink-0 rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]"
          >
            Owner view
          </button>
        </div>
        <FrontDeskPanel
          athletes={gymAthletes}
          gymName={gym?.name ?? 'Tumble Smart Athletics'}
          onAthletesChange={onAthletesChange}
        />
        {leaving && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setLeaving(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-semibold text-[var(--text)]">Leave front desk mode</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Enter the password for {user.email} to open the full owner view.
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void leaveFrontDesk()
                }}
                placeholder="Password"
                autoFocus
                className="mt-3 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
              />
              {leaveError && <p className="mt-2 text-xs text-[var(--bad)]">{leaveError}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={!password}
                  onClick={() => void leaveFrontDesk()}
                  className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
                >
                  Open owner view
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLeaving(false)
                    setPassword('')
                    setLeaveError(null)
                  }}
                  className="rounded-xl border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--muted)]"
                >
                  Stay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--text)]">Gym owner</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {gym ? gym.name : 'Standards, visibility, and people, the coaching layer on top of what the gym already runs.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <AccountSwitchButton user={user} compact />
          <button
            type="button"
            onClick={enterFrontDesk}
            className="rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]"
          >
            Front desk view
          </button>
        </div>
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
      {section === 'overview' && <OwnerOverview athletes={gymAthletes} />}
      {section === 'onboarding' && <OnboardingManager owner={owner} athletes={gymAthletes} />}
      {section === 'levels' && <ClassCriteria athletes={gymAthletes} />}
      {section === 'classes' && (
        <OwnerClasses athletes={gymAthletes} ownerId={owner.id} gymName={gym?.name} />
      )}
      {section === 'staff' && <StaffHub owner={owner} athletes={gymAthletes} />}
      {section === 'progress' && <AthleteProgress athletes={gymAthletes} />}
      {section === 'muse' && <MuseConnection athletes={gymAthletes} viewerRole="gymOwner" keyScope="all" />}
    </div>
  )
}
