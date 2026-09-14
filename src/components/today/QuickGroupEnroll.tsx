import { useState } from 'react'
import type { Athlete, AthleteSkillGoal, FavoriteColor } from '../../types'
import { createId } from '../../lib/storage'
import { displayPersonName, namesMatch } from '../../lib/classStation'
import { FAVORITE_COLORS } from '../../lib/profileTheme'
import {
  eventKindLabel,
  setEventAthletes,
  type TrainingEvent,
} from '../../lib/trainingEvents'
import { withEventMembership } from '../../lib/gymScope'
import { rememberLocalPhoto } from '../../lib/rosterSync'
import { hasAthleteFace } from '../../lib/namesQuiz'
import { FaceSnapshotField } from '../coach/FaceSnapshotField'
import { SkillGoalPicker } from '../coach/SkillGoalPicker'
import { BirthdayQuickPick } from './BirthdayQuickPick'
import { AthleteSearchField } from './AthleteSearchField'
import { StationSnapshot } from './StationSnapshot'

type Props = {
  event: TrainingEvent
  coach: Athlete
  athletes: Athlete[]
  onAthletesChange: (next: Athlete[]) => void
  onClose: () => void
  onAdded?: () => void
}

type Step = 'find' | 'first' | 'last' | 'phone' | 'photo' | 'more' | 'color' | 'birthday' | 'goal'

const MAIN: Step[] = ['find', 'first', 'last', 'phone', 'photo']

export function QuickGroupEnroll({
  event,
  coach,
  athletes,
  onAthletesChange,
  onClose,
  onAdded,
}: Props) {
  const [step, setStep] = useState<Step>('find')
  const [query, setQuery] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [color, setColor] = useState<FavoriteColor | ''>('')
  const [photo, setPhoto] = useState('')
  const [pendingId, setPendingId] = useState('')
  const [goals, setGoals] = useState<AthleteSkillGoal[]>([])
  const [birthday, setBirthday] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  const kind = eventKindLabel(event.kind).toLowerCase()
  const existingMatch = athletes.find((a) => namesMatch(a, first, last))

  const resetForm = (message?: string) => {
    setStep('find')
    setQuery('')
    setFirst('')
    setLast('')
    setParentPhone('')
    setColor('')
    setPhoto('')
    setPendingId('')
    setGoals([])
    setBirthday('')
    setFlash(message ?? null)
  }

  const addExisting = (row: Athlete) => {
    setEventAthletes(event.id, [...new Set([...event.athleteIds, row.id])])
    onAthletesChange(
      athletes.map((a) => (a.id === row.id ? withEventMembership(a, event.id, true) : a)),
    )
    resetForm(`${row.name.split(' ')[0]} is on ${event.name}. Next.`)
    onAdded?.()
  }

  const commit = (opts: { stayForMore?: boolean } = {}) => {
    const firstName = first.trim()
    const lastName = last.trim()
    const phone = parentPhone.trim()
    if (!firstName || !lastName || !phone) return
    const name = displayPersonName(firstName, lastName)
    const existing = athletes.find((a) => namesMatch(a, firstName, lastName))
    const now = new Date().toISOString()
    const nextPhoto = photo || existing?.photoDataUrl
    const nextGoals = goals.length ? goals : existing?.skillGoals
    const athlete: Athlete = existing
      ? {
          ...existing,
          parentPhone: phone || existing.parentPhone,
          favoriteColor: color || existing.favoriteColor,
          photoDataUrl: nextPhoto || existing.photoDataUrl,
          dateOfBirth: birthday || existing.dateOfBirth,
          skillGoals: nextGoals,
          worksWithCoachIds: [...new Set([...(existing.worksWithCoachIds ?? []), coach.id])],
        }
      : {
          id: pendingId || createId('ath'),
          name,
          firstName,
          lastName,
          parentPhone: phone,
          role: 'athlete',
          profilePublic: false,
          gymName: event.hostGym || event.name,
          eventIds: [event.id],
          worksWithCoachIds: [coach.id],
          favoriteColor: color || undefined,
          photoDataUrl: nextPhoto || undefined,
          dateOfBirth: birthday || undefined,
          skillGoals: nextGoals,
          createdAt: now,
        }
    if (athlete.photoDataUrl) rememberLocalPhoto(athlete.id, athlete.photoDataUrl)
    setEventAthletes(event.id, [...new Set([...event.athleteIds, athlete.id])])
    onAthletesChange(
      existing
        ? athletes.map((a) => (a.id === athlete.id ? withEventMembership(athlete, event.id, true) : a))
        : [...athletes, withEventMembership(athlete, event.id, true)],
    )
    onAdded?.()
    if (opts.stayForMore) {
      setPendingId(athlete.id)
      setFlash(`${name.split(' ')[0]} is on the ${kind}. Extra questions if they have time.`)
      setStep('more')
      return
    }
    resetForm(`${name.split(' ')[0]} is on ${event.name}. Next athlete.`)
  }

  const goPhoto = () => {
    if (!first.trim() || !last.trim() || !parentPhone.trim()) return
    const existing = athletes.find((a) => namesMatch(a, first, last))
    setPendingId(existing?.id || pendingId || createId('ath'))
    if (existing?.photoDataUrl && !photo) setPhoto(existing.photoDataUrl)
    setStep('photo')
  }

  const title =
    step === 'find'
      ? 'Who is this?'
      : step === 'first'
        ? 'First name'
        : step === 'last'
          ? 'Last name'
          : step === 'phone'
            ? 'Mom or dad’s phone'
            : step === 'photo'
              ? `Snapshot ${first.trim() || 'them'}`
              : step === 'more'
                ? `${first.trim() || 'They'} are on the list`
                : step === 'color'
                  ? 'Favorite color'
                  : step === 'birthday'
                    ? 'Birthday'
                    : 'What skill are they hoping to get?'

  const hint =
    step === 'find'
      ? `Search a profile already in Shape Lab, or start a new one for this ${kind}.`
      : step === 'first'
        ? 'One name at a time so the line keeps moving.'
        : step === 'last'
          ? 'Last name as it should appear on the roster.'
          : step === 'phone'
            ? 'We text when shapelab is ready to share — not to call during class.'
            : step === 'photo'
              ? 'Snap a face now. That is the main thing after the name.'
              : step === 'more'
                ? 'Move on, or answer a couple more if they have a minute.'
                : step === 'color'
                  ? 'Themes their app. Skip if the line is moving.'
                  : step === 'birthday'
                    ? 'Private. Used for age-appropriate access. Skip if they are rushing.'
                    : 'Not a promise they throw it today. Skip if they are rushing.'

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0b1016] text-[var(--text)]">
      <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            Quick add · {eventKindLabel(event.kind)}
          </p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{event.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold"
        >
          Close
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5">
          {MAIN.includes(step) && (
            <div className="flex gap-1">
              {MAIN.map((id) => (
                <span
                  key={id}
                  className={`h-1.5 flex-1 rounded-full ${
                    MAIN.indexOf(step) >= MAIN.indexOf(id) ? 'bg-[var(--accent)]' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          )}
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{hint}</p>
          </div>
          {flash && <p className="text-sm font-semibold text-[var(--accent)]">{flash}</p>}

          {step === 'find' && (
            <>
              <AthleteSearchField
                athletes={athletes.filter((a) => !event.athleteIds.includes(a.id))}
                query={query}
                onQuery={setQuery}
                onPick={addExisting}
                placeholder="Search an existing profile"
                emptyText="No match. Start a new profile below."
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-lg"
              />
              <button
                type="button"
                onClick={() => setStep('first')}
                className="h-16 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[var(--on-accent)]"
              >
                New athlete
              </button>
            </>
          )}

          {step === 'first' && (
            <>
              <input
                autoFocus
                className="h-16 rounded-2xl border border-white/10 bg-black/30 px-4 text-2xl"
                placeholder="First name"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                autoComplete="given-name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && first.trim()) setStep('last')
                }}
              />
              <button
                type="button"
                disabled={!first.trim()}
                onClick={() => setStep('last')}
                className="h-16 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[var(--on-accent)] disabled:opacity-40"
              >
                Next
              </button>
              <button type="button" onClick={() => setStep('find')} className="self-start text-sm text-white/50 underline">
                Back
              </button>
            </>
          )}

          {step === 'last' && (
            <>
              <input
                autoFocus
                className="h-16 rounded-2xl border border-white/10 bg-black/30 px-4 text-2xl"
                placeholder="Last name"
                value={last}
                onChange={(e) => setLast(e.target.value)}
                autoComplete="family-name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && last.trim()) setStep('phone')
                }}
              />
              {existingMatch && (
                <button
                  type="button"
                  onClick={() => addExisting(existingMatch)}
                  className="rounded-2xl border border-[var(--accent)] bg-[#102820] px-4 py-3 text-left"
                >
                  <span className="block text-sm font-bold">{existingMatch.name} already has a profile</span>
                  <span className="text-xs text-[var(--muted)]">Tap to put them on this {kind}</span>
                </button>
              )}
              <button
                type="button"
                disabled={!last.trim()}
                onClick={() => setStep('phone')}
                className="h-16 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[var(--on-accent)] disabled:opacity-40"
              >
                Next
              </button>
              <button type="button" onClick={() => setStep('first')} className="self-start text-sm text-white/50 underline">
                Back
              </button>
            </>
          )}

          {step === 'phone' && (
            <>
              <input
                autoFocus
                className="h-16 rounded-2xl border border-white/10 bg-black/30 px-4 text-xl"
                placeholder="Parent phone"
                inputMode="tel"
                autoComplete="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && parentPhone.trim()) goPhoto()
                }}
              />
              <button
                type="button"
                disabled={!parentPhone.trim()}
                onClick={goPhoto}
                className="h-16 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[var(--on-accent)] disabled:opacity-40"
              >
                Next · snapshot
              </button>
              <button type="button" onClick={() => setStep('last')} className="self-start text-sm text-white/50 underline">
                Back
              </button>
            </>
          )}

          {step === 'photo' && (
            <>
              <StationSnapshot
                photoDataUrl={photo}
                athleteId={pendingId}
                allowUpload
                size="hero"
                autoStart
                onCapture={(dataUrl) => setPhoto(dataUrl)}
              />
              <button
                type="button"
                disabled={!photo}
                onClick={() => commit({ stayForMore: true })}
                className="h-16 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[var(--on-accent)] disabled:opacity-40"
              >
                {photo ? 'They’re in · next questions or next kid' : 'Take a snapshot first'}
              </button>
              <button
                type="button"
                onClick={() => commit()}
                className="h-12 rounded-2xl border border-white/15 text-sm font-semibold text-white/80"
              >
                {photo ? 'Done · next athlete' : 'Skip photo · next athlete'}
              </button>
              <button type="button" onClick={() => setStep('phone')} className="self-start text-sm text-white/50 underline">
                Back
              </button>
            </>
          )}

          {step === 'more' && (
            <>
              <button
                type="button"
                onClick={() => resetForm(`${first.trim() || 'Next'} — ready for the next athlete.`)}
                className="h-16 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[var(--on-accent)]"
              >
                Next athlete
              </button>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setStep('color')}
                  className="h-14 rounded-2xl bg-white/8 text-base font-semibold"
                >
                  Favorite color{color ? ' · set' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('birthday')}
                  className="h-14 rounded-2xl bg-white/8 text-base font-semibold"
                >
                  Birthday{birthday ? ' · set' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('goal')}
                  className="h-14 rounded-2xl bg-white/8 text-base font-semibold"
                >
                  Skill hope{goals.length ? ' · set' : ''}
                </button>
              </div>
            </>
          )}

          {step === 'color' && (
            <>
              <div className="flex flex-wrap gap-3">
                {FAVORITE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.id)}
                    className={`h-14 w-14 rounded-full border-4 ${
                      color === c.id ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ background: c.swatch }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  commit({ stayForMore: true })
                  setStep('more')
                }}
                className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[var(--on-accent)]"
              >
                Save color
              </button>
              <button type="button" onClick={() => setStep('more')} className="self-start text-sm text-white/50 underline">
                Back
              </button>
            </>
          )}

          {step === 'birthday' && (
            <>
              <BirthdayQuickPick size="station" value={birthday} onChange={setBirthday} />
              <button
                type="button"
                onClick={() => {
                  commit({ stayForMore: true })
                  setStep('more')
                }}
                className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[var(--on-accent)]"
              >
                {birthday ? 'Save birthday' : 'Skip birthday'}
              </button>
              <button type="button" onClick={() => setStep('more')} className="self-start text-sm text-white/50 underline">
                Back
              </button>
            </>
          )}

          {step === 'goal' && (
            <>
              <SkillGoalPicker value={goals} onChange={setGoals} />
              <button
                type="button"
                onClick={() => {
                  commit({ stayForMore: true })
                  setStep('more')
                }}
                className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[var(--on-accent)]"
              >
                {goals.length ? 'Save hope' : 'Skip hope'}
              </button>
              <button type="button" onClick={() => setStep('more')} className="self-start text-sm text-white/50 underline">
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Compact “still need a face” list for coach view — not the add flow. */
export function GroupNeedFaces({
  event,
  athletes,
  onAthletesChange,
}: {
  event: TrainingEvent
  athletes: Athlete[]
  onAthletesChange: (next: Athlete[]) => void
}) {
  const [faceFor, setFaceFor] = useState<string | null>(null)
  const needFace = athletes.filter((a) => event.athleteIds.includes(a.id) && !hasAthleteFace(a))
  if (needFace.length === 0) return null
  return (
    <section className="mt-3 rounded-2xl border border-[#6ec8d6]/35 bg-[#102028] p-3">
      <p className="text-sm font-semibold text-[#6ec8d6]">
        {needFace.length} still need a snapshot
      </p>
      <ul className="mt-2 grid gap-2">
        {needFace.map((a) => (
          <li key={a.id}>
            {faceFor === a.id ? (
              <FaceSnapshotField
                athleteId={a.id}
                name={a.name}
                onCapture={(dataUrl) => {
                  rememberLocalPhoto(a.id, dataUrl)
                  onAthletesChange(athletes.map((row) => (row.id === a.id ? { ...row, photoDataUrl: dataUrl } : row)))
                  setFaceFor(null)
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setFaceFor(a.id)}
                className="w-full rounded-xl bg-black/30 px-3 py-2 text-left text-sm font-bold"
              >
                {a.name}
                <span className="ml-2 text-xs font-medium text-[#6ec8d6]">Take a snapshot</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
