import { useState } from 'react'
import type { Athlete } from '../../types'
import { createId } from '../../lib/storage'
import { displayPersonName, namesMatch } from '../../lib/classStation'
import { rememberLocalPhoto } from '../../lib/rosterSync'
import { FaceSnapshotField } from '../coach/FaceSnapshotField'
import { BirthdayQuickPick } from './BirthdayQuickPick'

type Props = {
  coach: Athlete
  athletes: Athlete[]
  onAthletesChange: (next: Athlete[]) => void
  onClose: () => void
  onAdded?: (athlete: Athlete) => void
}

/**
 * Fast athlete profile creation for class time. First + last name only —
 * birthday and snapshot are optional. The profile is flagged
 * `needsOnboarding` so the athlete can answer the rest later at the
 * new-athlete shape test station.
 */
export function QuickAddAthlete({ coach, athletes, onAthletesChange, onClose, onAdded }: Props) {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [birthday, setBirthday] = useState('')
  const [photo, setPhoto] = useState('')

  const firstName = first.trim()
  const lastName = last.trim()
  const canSave = firstName.length > 0 && lastName.length > 0
  const existing = canSave ? athletes.find((a) => namesMatch(a, firstName, lastName)) : undefined

  const save = () => {
    if (!canSave) return
    if (existing) {
      onAdded?.(existing)
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
      dateOfBirth: birthday || undefined,
      createdAt: now,
    }
    if (athlete.photoDataUrl) rememberLocalPhoto(athlete.id, athlete.photoDataUrl)
    onAthletesChange([...athletes, athlete])
    onAdded?.(athlete)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Quick add athlete
            </p>
            <h3 className="mt-1 text-lg font-semibold">New profile</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Name is enough — birthday and snapshot are optional. They can answer
              the rest at the shape test station later.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold"
          >
            Close
          </button>
        </div>

        {existing ? (
          <div className="mt-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4">
            <p className="text-sm font-semibold">{existing.name} already has a profile.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={save}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)]"
              >
                Use {existing.name.split(' ')[0]}'s profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setFirst('')
                  setLast('')
                }}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold"
              >
                Different name
              </button>
            </div>
          </div>
        ) : (
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
                    if (e.key === 'Enter') save()
                  }}
                  className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-base"
                />
              </label>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Birthday <span className="font-normal normal-case">(optional)</span>
              </p>
              <div className="mt-1">
                <BirthdayQuickPick value={birthday} onChange={setBirthday} size="compact" />
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Snapshot <span className="font-normal normal-case">(optional)</span>
              </p>
              <div className="mt-1">
                <FaceSnapshotField
                  photoDataUrl={photo || undefined}
                  name={canSave ? displayPersonName(firstName, lastName) : undefined}
                  hint="For the name quiz later"
                  onCapture={setPhoto}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="mt-5 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-bold text-[var(--on-accent)] disabled:opacity-40"
            >
              Create profile
            </button>
          </>
        )}
      </div>
    </div>
  )
}
