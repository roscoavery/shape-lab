import { useEffect, useState } from 'react'
import type { Athlete } from '../types'
import { createId, noteRemovedAthlete } from '../lib/storage'
import { instagramUrl, normalizeInstagramHandle } from '../lib/flowShare'
import { isRyanAthlete } from '../lib/ryanProfile'
import {
  PROFILE_KINDS,
  profileRole,
  roleHint,
  roleLabel,
  type ProfileKind,
} from '../lib/profileRole'
import {
  digitsOnlyPin,
  hashPasscode,
  markProfileUnlocked,
  passcodeLooksOk,
} from '../lib/athletePasscode'

type Props = {
  athletes: Athlete[]
  activeId: string | null
  onChangeAthletes: (next: Athlete[]) => void
  onSelect: (id: string | null) => void
  /** Destructive profile controls belong only on More → Profiles. */
  allowDelete?: boolean
}

export function AthletePanel({
  athletes,
  activeId,
  onChangeAthletes,
  onSelect,
  allowDelete = false,
}: Props) {
  const [newProfileOpen, setNewProfileOpen] = useState(false)
  const [name, setName] = useState('')
  const [newHandle, setNewHandle] = useState('')
  const [newRole, setNewRole] = useState<ProfileKind>('athlete')
  const [newGym, setNewGym] = useState('')
  const [newChild, setNewChild] = useState('')
  const [newBackPain, setNewBackPain] = useState<boolean | null>(null)
  const [passcode, setPasscode] = useState('')
  const [passcodeAgain, setPasscodeAgain] = useState('')
  const [handle, setHandle] = useState('')
  const [gymName, setGymName] = useState('')
  const [childName, setChildName] = useState('')
  const [legacyPin, setLegacyPin] = useState('')
  const [legacyPinAgain, setLegacyPinAgain] = useState('')
  const [saved, setSaved] = useState<string | null>(null)

  const active = athletes.find((a) => a.id === activeId) ?? null

  useEffect(() => {
    setHandle(active?.instagramHandle ?? '')
    setGymName(active?.gymName ?? '')
    setChildName(active?.childName ?? '')
    setLegacyPin('')
    setLegacyPinAgain('')
  }, [active?.id, active?.instagramHandle, active?.gymName, active?.childName])

  const flash = (msg: string, ms = 2800) => {
    setSaved(msg)
    window.setTimeout(() => setSaved(null), ms)
  }

  const add = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      flash('Type a name, then a 4-digit passcode, then Create.')
      return
    }
    const existing = athletes.find(
      (a) => a.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (existing) {
      flash(
        newRole !== profileRole(existing)
          ? `${existing.name} is already on this gym as ${roleLabel(existing)}. Use a different name to create a ${newRole} profile. That name was not overwritten.`
          : `${existing.name} is already on this gym computer. Unlock that profile with its own passcode — Create does not make a second one.`,
        5200,
      )
      return
    }
    if (!passcodeLooksOk(passcode)) {
      flash('Set a 4-digit passcode (numbers only) when you create the profile.')
      return
    }
    if (passcode !== passcodeAgain) {
      flash('Those passcodes do not match.')
      return
    }
    const role = newRole
    const id = createId('ath')
    const passcodeHash = await hashPasscode(id, passcode)
    const athlete: Athlete = {
      id,
      name: trimmed,
      instagramHandle: normalizeInstagramHandle(newHandle) || undefined,
      gymName: newGym.trim() || undefined,
      childName: role === 'parent' ? newChild.trim() || undefined : undefined,
      createdAt: new Date().toISOString(),
      passcodeHash,
      role,
      ...(newBackPain != null ? { hasBackPain: newBackPain } : {}),
    }
    markProfileUnlocked(id)
    onChangeAthletes([...athletes, athlete])
    onSelect(athlete.id)
    setName('')
    setNewHandle('')
    setNewGym('')
    setNewChild('')
    setPasscode('')
    setPasscodeAgain('')
    setNewRole('athlete')
    setNewBackPain(null)
    flash(
      role === 'coach' || role === 'gym_owner'
        ? `${athlete.name} is ready as ${roleLabel(athlete)}. Unlock with that passcode to add Instagram URLs in Compare — those collections stay on this profile. Ryan’s gym library stays as he left it.`
        : `${athlete.name} is ready as ${roleLabel(athlete)}. Use that 4-digit passcode on any link.`,
      role === 'coach' || role === 'gym_owner' ? 4200 : 2800,
    )
  }

  const saveDetails = () => {
    if (!active) return
    const instagramHandle = normalizeInstagramHandle(handle) || undefined
    const nextGym = gymName.trim() || undefined
    const nextChild = profileRole(active) === 'parent' ? childName.trim() || undefined : active.childName
    onChangeAthletes(
      athletes.map((a) =>
        a.id === active.id
          ? { ...a, instagramHandle, gymName: nextGym, childName: nextChild }
          : a,
      ),
    )
    const bits = [
      instagramHandle ? `@${instagramHandle}` : null,
      nextGym,
      nextChild ? `athlete ${nextChild}` : null,
    ].filter(Boolean)
    flash(bits.length ? `Saved ${bits.join(' · ')}` : 'Profile details cleared', 2200)
  }

  const saveLegacyPin = async () => {
    if (!active || active.passcodeHash) return
    if (!passcodeLooksOk(legacyPin)) {
      flash('Use four digits, 0–9.')
      return
    }
    if (legacyPin !== legacyPinAgain) {
      flash('Those passcodes do not match.')
      return
    }
    const passcodeHash = await hashPasscode(active.id, legacyPin)
    markProfileUnlocked(active.id)
    onChangeAthletes(
      athletes.map((a) => (a.id === active.id ? { ...a, passcodeHash } : a)),
    )
    setLegacyPin('')
    setLegacyPinAgain('')
    flash(`Passcode saved for ${active.name}.`)
  }

  const remove = (id: string) => {
    const target = athletes.find((a) => a.id === id)
    if (target && isRyanAthlete(target)) {
      flash('Ryan stays on the roster — that profile is how IG shapes save into the app.', 3200)
      return
    }
    const next = athletes.filter((a) => a.id !== id)
    noteRemovedAthlete(id)
    onChangeAthletes(next)
    if (activeId === id) onSelect(next[0]?.id ?? null)
  }

  const pinInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    onEnter?: () => void,
  ) => (
    <input
      type="password"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={4}
      className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm tracking-[0.35em]"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(digitsOnlyPin(e.target.value))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onEnter?.()
      }}
    />
  )

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">
        {active ? `${roleLabel(active)} profile` : 'Profile'}
      </p>
      <select
        className="mb-3 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
        value={activeId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
      >
        <option value="">Select profile…</option>
        {athletes.map((a) => (
          <option key={a.id} value={a.id}>
            {`${a.name} · ${roleLabel(a)}`}
            {a.gymName ? ` · ${a.gymName}` : ''}
            {a.instagramHandle ? ` (@${a.instagramHandle})` : ''}
          </option>
        ))}
      </select>

      <button
        type="button"
        aria-expanded={newProfileOpen}
        onClick={() => setNewProfileOpen((open) => !open)}
        className="mb-2 rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]"
      >
        {newProfileOpen ? 'Hide new profile form' : 'New profile'}
      </button>
      {newProfileOpen && <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {PROFILE_KINDS.map((kind) => (
            <button
              key={kind.id}
              type="button"
              aria-pressed={newRole === kind.id}
              onClick={() => setNewRole(kind.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                newRole === kind.id
                  ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-white'
                  : 'border-[var(--panel-border)] text-[var(--muted)]'
              }`}
            >
              {kind.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add()
            }}
          />
          <button
            type="button"
            onClick={() => void add()}
            className="rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-sm font-medium text-white"
          >
            Create
          </button>
        </div>
        {pinInput(passcode, setPasscode, '4-digit passcode')}
        {pinInput(passcodeAgain, setPasscodeAgain, 'Type it again', () => void add())}
        <input
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Instagram @handle (optional)"
          value={newHandle}
          onChange={(e) => setNewHandle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void add()
          }}
        />
        {(newRole === 'gym_owner' || newRole === 'coach' || newRole === 'athlete') && (
          <input
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder={newRole === 'athlete' ? 'Gym you train at (optional)' : 'Gym name (optional)'}
            value={newGym}
            onChange={(e) => setNewGym(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add()
            }}
          />
        )}
        {newRole === 'parent' && (
          <input
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="Your athlete’s name (optional)"
            value={newChild}
            onChange={(e) => setNewChild(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add()
            }}
          />
        )}
        {(newRole === 'coach' || newRole === 'parent' || newRole === 'gym_owner') && (
          <div className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2">
            <p className="text-xs text-[var(--text)]">Do you ever have back pain?</p>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              If yes, Homework opens a back-care path — journal, glute bridges,
              and back extensions you ease into.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setNewBackPain(true)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  newBackPain === true
                    ? 'bg-[var(--accent)] text-[#06281f]'
                    : 'border border-[var(--panel-border)]'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setNewBackPain(false)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  newBackPain === false
                    ? 'bg-[var(--accent)] text-[#06281f]'
                    : 'border border-[var(--panel-border)]'
                }`}
              >
                No
              </button>
            </div>
          </div>
        )}
        <p className="text-[11px] leading-snug text-[var(--muted)]">{roleHint(newRole)}</p>
      </div>}

      {active && !active.passcodeHash && (
        <div className="mt-3 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] p-3">
          <p className="text-[11px] font-semibold text-[var(--text)]">
            {active.name} does not have a passcode yet
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
            Set four digits now if you want this profile to open on another phone
            link.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {pinInput(legacyPin, setLegacyPin, '4-digit passcode')}
            {pinInput(legacyPinAgain, setLegacyPinAgain, 'Type it again', () => void saveLegacyPin())}
            <button
              type="button"
              onClick={() => void saveLegacyPin()}
              className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-medium text-white"
            >
              Save passcode
            </button>
          </div>
        </div>
      )}

      {active && (
        <div className="mt-3 flex flex-col gap-2">
          {(profileRole(active) === 'gym_owner' ||
            profileRole(active) === 'coach' ||
            profileRole(active) === 'athlete') && (
            <input
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
              placeholder={
                profileRole(active) === 'athlete' ? 'Gym you train at (optional)' : 'Gym name (optional)'
              }
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveDetails()
              }}
            />
          )}
          {profileRole(active) === 'parent' && (
            <input
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
              placeholder="Your athlete’s name (optional)"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveDetails()
              }}
            />
          )}
          {(profileRole(active) === 'coach' ||
            profileRole(active) === 'parent' ||
            profileRole(active) === 'gym_owner') && (
            <div className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2">
              <p className="text-xs text-[var(--text)]">Back pain on this profile?</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChangeAthletes(
                      athletes.map((a) =>
                        a.id === active.id ? { ...a, hasBackPain: true } : a,
                      ),
                    )
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    active.hasBackPain
                      ? 'bg-[var(--accent)] text-[#06281f]'
                      : 'border border-[var(--panel-border)]'
                  }`}
                >
                  Yes — show back care
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeAthletes(
                      athletes.map((a) =>
                        a.id === active.id ? { ...a, hasBackPain: false } : a,
                      ),
                    )
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    active.hasBackPain === false
                      ? 'bg-[var(--accent)] text-[#06281f]'
                      : 'border border-[var(--panel-border)]'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}
          <input
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="Instagram @handle (optional)"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveDetails()
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveDetails}
              className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1 text-xs"
            >
              Save details
            </button>
            {active.instagramHandle && (
              <a
                href={instagramUrl(active.instagramHandle)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--accent)] underline"
              >
                @{active.instagramHandle}
              </a>
            )}
            {allowDelete && (
            <button
              type="button"
              className="text-xs text-[var(--bad)] underline"
              onClick={() => remove(active.id)}
              disabled={isRyanAthlete(active)}
              title={
                isRyanAthlete(active)
                  ? 'Ryan stays on the roster so IG shapes can save into the app'
                  : 'Delete this profile'
              }
            >
              {isRyanAthlete(active) ? 'Ryan stays on the roster' : 'Delete profile'}
            </button>
            )}
            <button
              type="button"
              className="text-xs text-[var(--muted)] underline"
              onClick={() => onSelect(null)}
              title="Lock this profile. Selecting it again will ask for the passcode."
            >
              Lock profile
            </button>
          </div>
        </div>
      )}
      {saved && <p className="mt-2 text-[11px] text-[var(--accent)]">{saved}</p>}
      <p className="mt-2 text-[11px] leading-snug text-[var(--muted)]">
        Each new profile sets a 4-digit passcode on Create. Unlock that profile
        on any phone link or browser to see homework, hold times, the video
        library, Classes collages, and the gym feed.         Pick <strong>Gym owner</strong>, <strong>Coach</strong>,{' '}
        <strong>Athlete</strong>, or <strong>Parent</strong> so we know who you
        are. Gym owners and coaches can explore the tools, build collages, answer
        Research, and keep their own Compare collections. They cannot edit Ryan’s
        gym collections, shape descriptions, or picture sizes. Selecting Ryan
        always asks for his passcode — a shared link does not open gym admin by
        tapping the name. Only one profile stays unlocked in this tab. Creating
        the same name again selects the existing profile.
      </p>
    </div>
  )
}
