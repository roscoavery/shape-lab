import { useState } from 'react'
import type { Athlete } from '../../types'
import { createId } from '../../lib/storage'
import { displayPersonName, namesMatch } from '../../lib/classStation'
import { rememberLocalPhoto } from '../../lib/rosterSync'
import { FaceSnapshotField } from '../coach/FaceSnapshotField'
import { ACRO_SKILLS, ACRO_TRACKS, ACRO_TRACK_LABELS, type AcroTrack } from '../../lib/acroSkills'

type Props = {
  coach: Athlete
  athletes: Athlete[]
  onAthletesChange: (next: Athlete[]) => void
  onClose: () => void
  onAdded?: (athlete: Athlete) => void
}

type Step = 'name' | 'snapshot' | 'skills'

const TRACK_RGB: Record<AcroTrack, string> = {
  standing: '192,132,252',
  front: '251,146,60',
  side: '96,165,250',
  other: '74,222,128',
}

/**
 * Fast athlete profile creation for clinics. Stepped flow:
 * 1. Name (quick)
 * 2. Snapshot (optional, can skip)
 * 3. Working towards: acro skill map, be quick, pick up to 3, Done.
 */
export function QuickAddAthlete({ coach, athletes, onAthletesChange, onClose, onAdded }: Props) {
  const [step, setStep] = useState<Step>('name')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [photo, setPhoto] = useState('')
  const [workingTowards, setWorkingTowards] = useState<string[]>([])

  const firstName = first.trim()
  const lastName = last.trim()
  const canSave = firstName.length > 0 && lastName.length > 0
  const existing = canSave ? athletes.find((a) => namesMatch(a, firstName, lastName)) : undefined

  const toggleWorking = (id: string) => {
    setWorkingTowards((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  const save = () => {
    if (!canSave) return
    if (existing) {
      const updated: Athlete = {
        ...existing,
        ...(workingTowards.length > 0
          ? { acroWorkingTowards: Array.from(new Set([...(existing.acroWorkingTowards ?? []), ...workingTowards])).slice(0, 3) }
          : {}),
      }
      onAthletesChange(athletes.map((a) => (a.id === existing.id ? updated : a)))
      onAdded?.(updated)
      onClose()
      return
    }
    const now = new Date().toISOString()
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
      ...(workingTowards.length > 0 ? { acroWorkingTowards: workingTowards } : {}),
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
                {workingTowards.length}/3 selected
              </p>
              <div className="mt-3 max-h-[50vh] space-y-3 overflow-y-auto">
                {[7, 6, 5, 4, 3, 2, 1].map((level) => (
                  <div key={level}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                      Level {level}
                    </p>
                    <div className="mt-1 grid grid-cols-4 gap-1.5">
                      {ACRO_TRACKS.map((track) => {
                        const skills = ACRO_SKILLS.filter((s) => s.track === track && s.level === level)
                        const rgb = TRACK_RGB[track]
                        if (skills.length === 0) return <div key={track} />
                        return (
                          <div key={track} className="space-y-1.5">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                              {ACRO_TRACK_LABELS[track]}
                            </p>
                            {skills.map((sk) => {
                              const on = workingTowards.includes(sk.id)
                              const disabled = !on && workingTowards.length >= 3
                              return (
                                <button
                                  key={sk.id}
                                  type="button"
                                  onClick={() => toggleWorking(sk.id)}
                                  disabled={disabled}
                                  className="w-full rounded-lg border-2 px-1.5 py-2 text-center text-[10px] font-bold leading-tight text-white disabled:opacity-30"
                                  style={{
                                    background: on ? `rgba(${rgb},0.25)` : '#000000',
                                    borderColor: `rgba(${rgb},${on ? 1 : 0.6})`,
                                    boxShadow: on ? `0 0 8px rgba(${rgb},0.5)` : 'none',
                                  }}
                                >
                                  {sk.name}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep('snapshot')}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="rounded-lg bg-[var(--accent)] px-8 py-2.5 text-sm font-semibold text-[var(--on-accent)]"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
