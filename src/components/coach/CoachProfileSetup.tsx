/**
 * CoachProfileSetup — first-run profile step for a coach account.
 * Invite redemption and admin account creation now make the coach roster
 * row (build 1236), stamped needsProfileSetup. This step finishes that
 * row: a photo, the name, and the main gym, then hands the coach to the
 * setup wizard. It never blocks sign-in: Skip clears the flag and the
 * coach lands in the app. It only ever renders for a coach profile with
 * needsProfileSetup set, so existing coaches never see it.
 */

import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import { StationSnapshot } from '../today/StationSnapshot'
import { rememberLocalPhoto } from '../../lib/rosterSync'
import { createGym, listPublicGyms } from '../../lib/gyms'

export function CoachProfileSetup({
  coach,
  onFinish,
  onSkip,
}: {
  coach: Athlete
  onFinish: (patched: Athlete) => void
  onSkip: () => void
}) {
  const nameParts = (coach.name || '').trim().split(/\s+/).filter(Boolean)
  const [firstName, setFirstName] = useState(coach.firstName ?? nameParts[0] ?? '')
  const [lastName, setLastName] = useState(coach.lastName ?? nameParts.slice(1).join(' '))
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(coach.photoDataUrl)
  const [gymId, setGymId] = useState('')
  const [newGymName, setNewGymName] = useState('')
  const [gyms, setGyms] = useState<{ id: string; name: string }[]>([])
  const [gymsLoaded, setGymsLoaded] = useState(false)
  const [gymsFailed, setGymsFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasGym = Boolean(coach.gymId && coach.gymName)

  useEffect(() => {
    if (hasGym) return
    let cancelled = false
    void listPublicGyms()
      .then((rows) => {
        if (cancelled) return
        setGyms(rows)
        setGymsLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setGymsFailed(true)
        setGymsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [hasGym])

  const finish = async () => {
    const first = firstName.trim()
    if (!first) {
      setError('Add your first name.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      let gym: { id: string; name: string } | null = null
      if (!hasGym) {
        if (gymId === '__new') {
          if (!newGymName.trim()) {
            setError('Type your gym name, or pick one from the list.')
            setBusy(false)
            return
          }
          gym = await createGym(newGymName.trim())
        } else if (gymId) {
          const picked = gyms.find((g) => g.id === gymId)
          if (picked) gym = picked
        }
      }
      const last = lastName.trim()
      const composed = `${first} ${last}`.trim()
      onFinish({
        ...coach,
        firstName: first,
        lastName: last || undefined,
        name: composed || coach.name,
        photoDataUrl,
        gymId: gym ? gym.id : coach.gymId,
        gymName: gym ? gym.name : coach.gymName,
        needsProfileSetup: false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that gym.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#071018] text-[var(--text)]">
      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-10">
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">shapelab</p>
          <h1 className="mt-2 text-2xl font-semibold">Finish your coach profile</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
            Your account is ready. Add a photo and check your name and gym, then set up your
            coaching system.
          </p>

          <section className="mt-6 flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Profile photo</h2>
            <p className="text-xs text-[var(--muted)]">
              Take a snapshot or upload. This is the pic everyone sees on your page. A photo is
              optional. You can add one later from your profile.
            </p>
            <StationSnapshot
              photoDataUrl={photoDataUrl}
              allowUpload
              athleteId={coach.id}
              onCapture={(url) => {
                rememberLocalPhoto(coach.id, url)
                setPhotoDataUrl(url)
              }}
            />
          </section>

          <section className="mt-6 flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Your name</h2>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  First name
                </span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Last name
                </span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
            </div>
          </section>

          <section className="mt-6 flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Your main gym</h2>
            {hasGym ? (
              <p className="text-sm text-[var(--text)]">{coach.gymName}</p>
            ) : gymsLoaded && (gymsFailed || gyms.length === 0) ? (
              <input
                value={newGymName}
                onChange={(e) => {
                  setNewGymName(e.target.value)
                  setGymId('__new')
                }}
                placeholder="Type your gym name"
                className="w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
              />
            ) : gymsLoaded ? (
              <>
                <select
                  value={gymId}
                  onChange={(e) => setGymId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
                >
                  <option value="">Choose your main gym</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                  <option value="__new">My gym is not listed</option>
                </select>
                {gymId === '__new' && (
                  <input
                    value={newGymName}
                    onChange={(e) => setNewGymName(e.target.value)}
                    placeholder="Type your gym name"
                    className="w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
                  />
                )}
              </>
            ) : (
              <span className="text-xs text-[var(--muted)]">Loading gyms…</span>
            )}
            {!hasGym && (
              <span className="text-xs leading-relaxed text-[var(--muted)]">
                This sets the gym for athletes who sign up through your links. You can leave it
                blank and add it later.
              </span>
            )}
          </section>

          {error && <p className="mt-4 text-sm text-[var(--bad)]">{error}</p>}

          <button
            type="button"
            onClick={() => void finish()}
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[var(--accent)] px-3 py-3 text-sm font-bold text-[var(--on-accent)] disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Continue to setup'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="mt-2 w-full rounded-xl border border-[var(--panel-border)] px-3 py-2.5 text-sm font-semibold text-[var(--text)] disabled:opacity-60"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
