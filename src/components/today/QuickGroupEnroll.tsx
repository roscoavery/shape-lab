import { useState } from 'react'
import type { Athlete, FavoriteColor } from '../../types'
import { createId } from '../../lib/storage'
import { displayPersonName, namesMatch } from '../../lib/classStation'
import { FAVORITE_COLORS } from '../../lib/profileTheme'
import {
  eventKindLabel,
  setEventAthletes,
  type TrainingEvent,
} from '../../lib/trainingEvents'
import { withEventMembership } from '../../lib/gymScope'

type Props = {
  event: TrainingEvent
  coach: Athlete
  athletes: Athlete[]
  onAthletesChange: (next: Athlete[]) => void
  onAdded?: () => void
}

export function QuickGroupEnroll({ event, coach, athletes, onAthletesChange, onAdded }: Props) {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [color, setColor] = useState<FavoriteColor | ''>('')
  const [flash, setFlash] = useState<string | null>(null)

  const save = () => {
    const firstName = first.trim()
    const lastName = last.trim()
    const phone = parentPhone.trim()
    if (!firstName || !lastName) return
    if (!phone) {
      setFlash('Mom or dad’s phone first — that is how we text when the app is ready.')
      return
    }
    const name = displayPersonName(firstName, lastName)
    const existing = athletes.find((a) => namesMatch(a, firstName, lastName))
    const now = new Date().toISOString()
    const athlete: Athlete = existing
      ? {
          ...existing,
          parentPhone: phone || existing.parentPhone,
          favoriteColor: color || existing.favoriteColor,
          worksWithCoachIds: [...new Set([...(existing.worksWithCoachIds ?? []), coach.id])],
        }
      : {
          id: createId('ath'),
          name,
          firstName,
          lastName,
          parentPhone: phone,
          role: 'athlete',
          gymName: event.hostGym || event.name,
          eventIds: [event.id],
          worksWithCoachIds: [coach.id],
          favoriteColor: color || undefined,
          createdAt: now,
        }
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
    setFlash(`${name.split(' ')[0]} is on ${event.name}. Next kid.`)
    onAdded?.()
  }

  return (
    <section className="mt-3 rounded-2xl border border-[var(--panel-border)] bg-[#121820] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Quick add · {eventKindLabel(event.kind)}
      </p>
      <h4 className="mt-1 text-lg font-semibold">New profile for {event.name}</h4>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        A profile helps your coach remember your name and write down skills and
        wins. We only need the important stuff right now — you can fill more later.
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
          We ask so we can text when Shape Lab is ready to share — not to call
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
            if (e.key === 'Enter') save()
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
        onClick={save}
        className="sl-btn-mint sl-center mt-3 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-40"
      >
        Add to {eventKindLabel(event.kind).toLowerCase()}
      </button>
      {flash && <p className="mt-2 text-sm font-semibold text-[var(--accent)]">{flash}</p>}
    </section>
  )
}
