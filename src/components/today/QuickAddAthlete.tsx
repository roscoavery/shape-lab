import { useState } from 'react'
import type { Athlete } from '../../types'
import { createId } from '../../lib/storage'
import { displayPersonName, namesMatch } from '../../lib/classStation'
import { rememberLocalPhoto } from '../../lib/rosterSync'
import { FaceSnapshotField } from '../coach/FaceSnapshotField'
import { BirthdayQuickPick } from './BirthdayQuickPick'
import { acroSkillsByLevel } from '../../lib/acroSkills'

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
  const [skillsHave, setSkillsHave] = useState<string[]>([])
  const [workingTowards, setWorkingTowards] = useState<string[]>([])

  const firstName = first.trim()
  const lastName = last.trim()
  const canSave = firstName.length > 0 && lastName.length > 0
  const existing = canSave ? athletes.find((a) => namesMatch(a, firstName, lastName)) : undefined

  const toggleHave = (id: string) => {
    setSkillsHave((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
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
      // Update the existing profile with any newly selected acro skills.
      const updated: Athlete = {
        ...existing,
        ...(skillsHave.length > 0
          ? { acroSkillsHave: Array.from(new Set([...(existing.acroSkillsHave ?? []), ...skillsHave])) }
          : {}),
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
      dateOfBirth: birthday || undefined,
      createdAt: now,
      ...(skillsHave.length > 0 ? { acroSkillsHave: skillsHave } : {}),
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
      <div className="w-full max-w-md rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Quick add athlete
            </p>
            <h3 className="mt-1 text-lg font-semibold">New profile</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Name is enough, birthday and snapshot are optional. They can answer
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
            <p className="mt-1 text-xs text-[var(--muted)]">
              Pick what they're working towards below, then tap to use their profile.
            </p>
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Working towards{' '}
                <span className="font-normal normal-case">
                  (pick up to 3, {3 - workingTowards.length} left)
                </span>
              </p>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {acroSkillsByLevel().map(({ level, skills }) => (
                  <div key={level}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Level {level}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {skills.map((sk) => {
                        const on = workingTowards.includes(sk.id) || (existing.acroWorkingTowards ?? []).includes(sk.id)
                        const disabled = !on && workingTowards.length >= 3
                        return (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => toggleWorking(sk.id)}
                            disabled={disabled}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-30 ${
                              on
                                ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                                : 'bg-white/10 text-[var(--text)]'
                            }`}
                          >
                            {sk.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Skills I have <span className="font-normal normal-case">(tap all that apply)</span>
              </p>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {acroSkillsByLevel().map(({ level, skills }) => (
                  <div key={level}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Level {level}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {skills.map((sk) => {
                        const on = skillsHave.includes(sk.id)
                        return (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => toggleHave(sk.id)}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              on
                                ? 'bg-emerald-500/90 text-white'
                                : 'bg-white/10 text-[var(--text)]'
                            }`}
                          >
                            {sk.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Working towards{' '}
                <span className="font-normal normal-case">
                  (pick up to 3, {3 - workingTowards.length} left)
                </span>
              </p>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {acroSkillsByLevel().map(({ level, skills }) => (
                  <div key={level}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Level {level}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {skills.map((sk) => {
                        const on = workingTowards.includes(sk.id)
                        const disabled = !on && workingTowards.length >= 3
                        return (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => toggleWorking(sk.id)}
                            disabled={disabled}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-30 ${
                              on
                                ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                                : 'bg-white/10 text-[var(--text)]'
                            }`}
                          >
                            {sk.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
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
    </div>
  )
}
