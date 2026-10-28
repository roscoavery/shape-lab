import { useState } from 'react'
import type { Athlete, AthleteSkillGoal } from '../../types'
import { createId } from '../../lib/storage'
import { displayPersonName, namesMatch } from '../../lib/classStation'
import { rememberLocalPhoto } from '../../lib/rosterSync'
import { FaceSnapshotField } from '../coach/FaceSnapshotField'
import type { UnifiedSkill } from '../../config/unifiedSkillSeed'
import { SkillMapView } from '../learn/SkillMapView'
import { AcroMapView } from '../learn/AcroMapView'

type Props = {
  coach: Athlete
  athletes: Athlete[]
  onAthletesChange: (next: Athlete[]) => void
  onClose: () => void
  onAdded?: (athlete: Athlete) => void
}

type Step = 'name' | 'snapshot' | 'skills'

type Pick = { id: string; name: string }

/**
 * Fast athlete profile creation for clinics. Stepped flow:
 * 1. Name (quick)
 * 2. Snapshot (optional, can skip)
 * 3. Working towards: main or acro skill map, be quick, pick up to 3, Done — or skip.
 */
export function QuickAddAthlete({ coach, athletes, onAthletesChange, onClose, onAdded }: Props) {
  const [step, setStep] = useState<Step>('name')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [photo, setPhoto] = useState('')
  const [map, setMap] = useState<'main' | 'acro'>('main')
  const [workingTowards, setWorkingTowards] = useState<Pick[]>([])

  const firstName = first.trim()
  const lastName = last.trim()
  const canSave = firstName.length > 0 && lastName.length > 0
  const existing = canSave ? athletes.find((a) => namesMatch(a, firstName, lastName)) : undefined

  // The maps shine a skill's path on the first tap and only call this on
  // a second tap on the same skill, exactly as on the intake link.
  const toggleWorking = (skill: UnifiedSkill) => {
    setWorkingTowards((prev) => {
      if (prev.some((p) => p.id === skill.id)) return prev.filter((p) => p.id !== skill.id)
      if (prev.length >= 3) return prev
      return [...prev, { id: skill.id, name: skill.name }]
    })
  }

  const save = (picks: Pick[] = workingTowards) => {
    if (!canSave) return
    const now = new Date().toISOString()
    const pickIds = picks.map((p) => p.id)
    // Goals carry the display names so picks show under "Working towards"
    // on the profile, as intake picks do. Acro ids keep working in the
    // check-in board and recap lists, which resolve by acro id.
    const freshGoals = (existingGoals: AthleteSkillGoal[] | undefined): AthleteSkillGoal[] => {
      const seen = new Set((existingGoals ?? []).map((g) => g.label.toLowerCase()))
      const fresh = picks
        .filter((p) => !seen.has(p.name.toLowerCase()))
        .map((p) => ({ id: createId('sg'), label: p.name, setAt: now, source: 'coach' as const }))
      return [...(existingGoals ?? []), ...fresh]
    }
    if (existing) {
      const updated: Athlete = {
        ...existing,
        ...(pickIds.length > 0
          ? {
              acroWorkingTowards: Array.from(
                new Set([...(existing.acroWorkingTowards ?? []), ...pickIds]),
              ).slice(0, 3),
              skillGoals: freshGoals(existing.skillGoals),
            }
          : {}),
      }
      onAthletesChange(athletes.map((a) => (a.id === existing.id ? updated : a)))
      onAdded?.(updated)
      onClose()
      return
    }
    const athlete: Athlete = {
      id: createId('ath'),
      name: displayPersonName(firstName, lastName),
      firstName,
      lastName,
      role: 'athlete',
      profilePublic: false,
      worksWithCoachIds: [coach.id],
      createdByCoachId: coach.id,
      needsOnboarding: true,
      photoDataUrl: photo || undefined,
      createdAt: now,
      ...(pickIds.length > 0 ? { acroWorkingTowards: pickIds } : {}),
      ...(pickIds.length > 0 ? { skillGoals: freshGoals(undefined) } : {}),
    }
    if (athlete.photoDataUrl) rememberLocalPhoto(athlete.id, athlete.photoDataUrl)
    onAthletesChange([...athletes, athlete])
    onAdded?.(athlete)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-black/60 p-4"
      style={{ touchAction: 'pan-y' }}
      role="dialog"
      aria-modal
    >
      <div className="flex min-h-full items-end justify-center sm:items-center">
        <div className="w-full max-w-2xl rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                Quick add athlete
              </p>
              <h3 className="mt-1 text-lg font-semibold">
                {step === 'name' && 'New profile'}
                {step === 'snapshot' && 'Take a snapshot'}
                {step === 'skills' && 'What are you working towards?'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold"
            >
              Close
            </button>
          </div>

          {step === 'name' && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    First name
                  </span>
                  <input
                    value={first}
                    onChange={(e) => setFirst(e.target.value)}
                    placeholder="First"
                    autoFocus
                    className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-base"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Last name
                  </span>
                  <input
                    value={last}
                    onChange={(e) => setLast(e.target.value)}
                    placeholder="Last"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canSave) setStep('snapshot')
                    }}
                    className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-base"
                  />
                </label>
              </div>
              {existing && (
                <p className="mt-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-3 text-sm">
                  {existing.name} already has a profile. You'll add working-towards skills to it.
                </p>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={!canSave}
                  onClick={() => setStep('snapshot')}
                  className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === 'snapshot' && (
            <>
              <p className="mt-2 text-sm text-[var(--muted)]">
                For the name quiz later. You can skip this.
              </p>
              <div className="mt-3">
                <FaceSnapshotField
                  photoDataUrl={photo || undefined}
                  name={canSave ? displayPersonName(firstName, lastName) : undefined}
                  hint="For the name quiz later"
                  onCapture={setPhoto}
                />
              </div>
              <div className="mt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep('name')}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold"
                >
                  Back
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('skills')}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('skills')}
                    className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--on-accent)]"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 'skills' && (
            <>
              <p className="mt-2 text-sm font-semibold text-amber-300">
                Be quick! Pick up to 3 you can reasonably work towards now.
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Tap a skill once to see the steps to get there. Tap it again to pick it.
                Skip this step if you&apos;re not sure.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMap('main')}
                  className={`h-11 rounded-xl text-sm font-bold ${
                    map === 'main'
                      ? 'bg-sky-400 text-black'
                      : 'border border-white/15 text-white/70'
                  }`}
                >
                  Main skill map
                </button>
                <button
                  type="button"
                  onClick={() => setMap('acro')}
                  className={`h-11 rounded-xl text-sm font-bold ${
                    map === 'acro'
                      ? 'bg-sky-400 text-black'
                      : 'border border-white/15 text-white/70'
                  }`}
                >
                  Acro map
                </button>
              </div>
              <p className="mt-3 text-xs text-white/50">
                {workingTowards.length}/3 selected
                {workingTowards.length > 0 && `: ${workingTowards.map((p) => p.name).join(', ')}`}
              </p>
              <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-xl border border-white/10">
                {map === 'main' ? (
                  <SkillMapView onTileTap={toggleWorking} />
                ) : (
                  <AcroMapView onTileTap={toggleWorking} />
                )}
              </div>
              {workingTowards.length > 0 && (
                <button
                  type="button"
                  onClick={() => setWorkingTowards([])}
                  className="mt-2 text-sm font-semibold text-sky-300"
                >
                  Clear selection
                </button>
              )}
              <div className="mt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep('snapshot')}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold"
                >
                  Back
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => save([])}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => save()}
                    className="rounded-lg bg-[var(--accent)] px-8 py-2.5 text-sm font-semibold text-[var(--on-accent)]"
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
