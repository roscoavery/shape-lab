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
import { AthleteAvatar } from '../AthleteAvatar'
import { FaceSnapshotField } from '../coach/FaceSnapshotField'
import { SkillGoalPicker } from '../coach/SkillGoalPicker'

type Props = {
  event: TrainingEvent
  coach: Athlete
  athletes: Athlete[]
  onAthletesChange: (next: Athlete[]) => void
  onAdded?: () => void
}

type Step = 'form' | 'face' | 'goal'

export function QuickGroupEnroll({ event, coach, athletes, onAthletesChange, onAdded }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [color, setColor] = useState<FavoriteColor | ''>('')
  const [photo, setPhoto] = useState('')
  const [pendingId, setPendingId] = useState('')
  const [flash, setFlash] = useState<string | null>(null)
  const [faceFor, setFaceFor] = useState<string | null>(null)
  const [goals, setGoals] = useState<AthleteSkillGoal[]>([])

  const onList = athletes.filter((a) => event.athleteIds.includes(a.id))
  const needFace = onList.filter((a) => !hasAthleteFace(a))

  const continueToFace = () => {
    const firstName = first.trim()
    const lastName = last.trim()
    const phone = parentPhone.trim()
    if (!firstName || !lastName) return
    if (!phone) {
      setFlash('Mom or dad’s phone first — that is how we text when the app is ready.')
      return
    }
    const existing = athletes.find((a) => namesMatch(a, firstName, lastName))
    setPendingId(existing?.id || createId('ath'))
    setPhoto(existing?.photoDataUrl || '')
    setFlash(null)
    setStep('face')
  }

  const commit = (photoDataUrl?: string) => {
    const firstName = first.trim()
    const lastName = last.trim()
    const phone = parentPhone.trim()
    if (!firstName || !lastName || !phone) return
    const name = displayPersonName(firstName, lastName)
    const existing = athletes.find((a) => namesMatch(a, firstName, lastName))
    const now = new Date().toISOString()
    const nextPhoto = photoDataUrl || photo || existing?.photoDataUrl
    const nextGoals = goals.length ? goals : existing?.skillGoals
    const athlete: Athlete = existing
      ? {
          ...existing,
          parentPhone: phone || existing.parentPhone,
          favoriteColor: color || existing.favoriteColor,
          photoDataUrl: nextPhoto || existing.photoDataUrl,
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
          gymName: event.hostGym || event.name,
          eventIds: [event.id],
          worksWithCoachIds: [coach.id],
          favoriteColor: color || undefined,
          photoDataUrl: nextPhoto || undefined,
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
    setFirst('')
    setLast('')
    setParentPhone('')
    setColor('')
    setPhoto('')
    setPendingId('')
    setGoals([])
    setStep('form')
    setFlash(
      nextPhoto
        ? `${name.split(' ')[0]} is on ${event.name} with a face for the names test.`
        : `${name.split(' ')[0]} is on ${event.name}. Add a snapshot when you can — the names test needs a face.`,
    )
    onAdded?.()
  }

  const saveExistingFace = (athlete: Athlete, photoDataUrl: string) => {
    rememberLocalPhoto(athlete.id, photoDataUrl)
    onAthletesChange(
      athletes.map((a) => (a.id === athlete.id ? { ...a, photoDataUrl } : a)),
    )
    setFaceFor(null)
    setFlash(`${athlete.name.split(' ')[0]} now has a face for the names test.`)
    onAdded?.()
  }

  return (
    <section className="mt-3 rounded-2xl border border-[var(--panel-border)] bg-[#121820] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Quick add · {eventKindLabel(event.kind)}
      </p>
      <h4 className="mt-1 text-lg font-semibold">New profile for {event.name}</h4>
      {step === 'form' && (
        <>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Name, parent phone, then a snapshot. The picture is how coaches
            pair this face with this name on the names test.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="h-11 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
              placeholder="First name"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              autoComplete="given-name"
            />
            <input
              className="h-11 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
              placeholder="Last name"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              autoComplete="family-name"
            />
          </div>
          <label className="mt-3 block">
            <span className="text-sm font-semibold text-[var(--text)]">Mom or dad’s phone</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--muted)]">
              We ask so we can text when shapelab is ready to share — not to call
              during class.
            </span>
            <input
              className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
              placeholder="Parent phone"
              inputMode="tel"
              autoComplete="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') continueToFace()
              }}
            />
          </label>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Favorite color · themes their app
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FAVORITE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                onClick={() => setColor(c.id)}
                className={`h-8 w-8 rounded-full border-2 ${
                  color === c.id ? 'border-white' : 'border-transparent'
                }`}
                style={{ background: c.swatch }}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={!first.trim() || !last.trim()}
            onClick={continueToFace}
            className="sl-btn-mint sl-center mt-3 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-40"
          >
            Next · take a snapshot
          </button>
        </>
      )}
      {step === 'face' && (
        <>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Snapshot {first.trim() || 'this athlete'} now so coaches can
            memorize the face with the name.
          </p>
          <div className="mt-3">
            <FaceSnapshotField
              photoDataUrl={photo}
              athleteId={pendingId}
              name={displayPersonName(first, last)}
              onCapture={(dataUrl) => setPhoto(dataUrl)}
            />
          </div>
          <button
            type="button"
            disabled={!photo}
            onClick={() => setStep('goal')}
            className="sl-btn-mint sl-center mt-3 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-40"
          >
            {photo ? 'Next · what are they working towards' : 'Take a snapshot first'}
          </button>
          <button
            type="button"
            onClick={() => setStep('goal')}
            className="mt-2 w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/70"
          >
            Skip photo · ask about skills
          </button>
          <button
            type="button"
            onClick={() => setStep('form')}
            className="mt-2 text-xs font-semibold text-[var(--muted)]"
          >
            Back to the name
          </button>
        </>
      )}
      {step === 'goal' && (
        <>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            What skill are they hoping to get? Coaches use this to group
            similar kids. It does not mean they will work that skill today.
          </p>
          <div className="mt-3">
            <SkillGoalPicker value={goals} onChange={setGoals} />
          </div>
          <button
            type="button"
            onClick={() => commit(photo)}
            className="sl-btn-mint sl-center mt-3 rounded-xl px-4 py-3 text-sm font-bold"
          >
            {goals.length ? `Add ${first.trim() || 'them'} to ${eventKindLabel(event.kind).toLowerCase()}` : 'Add without a skill hope'}
          </button>
          <button
            type="button"
            onClick={() => setStep('face')}
            className="mt-2 text-xs font-semibold text-[var(--muted)]"
          >
            Back to the snapshot
          </button>
        </>
      )}
      {needFace.length > 0 && step === 'form' && (
        <div className="mt-4 rounded-xl border border-[#6ec8d6]/35 bg-[#102028] p-3">
          <p className="text-sm font-semibold text-[#6ec8d6]">
            {needFace.length} on this {eventKindLabel(event.kind).toLowerCase()} still need a face
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Snapshot them so the names test can ask who is who.
          </p>
          <ul className="mt-2 grid gap-2">
            {needFace.map((a) => (
              <li key={a.id}>
                {faceFor === a.id ? (
                  <FaceSnapshotField
                    athleteId={a.id}
                    name={a.name}
                    onCapture={(dataUrl) => saveExistingFace(a, dataUrl)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setFaceFor(a.id)}
                    className="flex w-full items-center gap-3 rounded-xl bg-black/30 px-3 py-2 text-left"
                  >
                    <AthleteAvatar athlete={a} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{a.name}</span>
                      <span className="text-xs text-[#6ec8d6]">Take a snapshot</span>
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {flash && <p className="mt-2 text-sm font-semibold text-[var(--accent)]">{flash}</p>}
    </section>
  )
}
