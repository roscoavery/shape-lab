import { useEffect, useState } from 'react'
import type { Athlete } from '../types'
import { createId, noteRemovedAthlete } from '../lib/storage'
import { instagramUrl, normalizeInstagramHandle } from '../lib/flowShare'
import { isRyanAthlete } from '../lib/ryanProfile'
import {
  PROFILE_KINDS,
  isCoachProfile,
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
import {
  displayPersonName,
  forgetQuizGuest,
  loadQuizGuests,
} from '../lib/classStation'
import {
  formatQuizScore,
  lastShapeTest,
  takeGuestGrades,
  quizKindLabel,
} from '../lib/quizGrades'
import { AthleteAvatar, AthleteName } from './AthleteAvatar'
import { AthleteProfileCard } from './AthleteProfileCard'
import { addCoachNotesToAthletes } from '../lib/athleteNotes'
import { withLinkedAthletes } from '../lib/parentLink'

type Props = {
  athletes: Athlete[]
  activeId: string | null
  onChangeAthletes: (next: Athlete[]) => void
  onSelect: (id: string | null) => void
  /** Destructive profile controls belong only on More → Profiles. */
  allowDelete?: boolean
  /** Gym admin sees every profile. Everyone else only sees their own. */
  canSeeAllProfiles?: boolean
  onViewProfile?: (id: string) => void
  viewer?: Athlete | null
}

export function AthletePanel({
  athletes,
  activeId,
  onChangeAthletes,
  onSelect,
  allowDelete = false,
  canSeeAllProfiles = false,
  onViewProfile,
  viewer = null,
}: Props) {
  const [newProfileOpen, setNewProfileOpen] = useState(false)
  const [name, setName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newHandle, setNewHandle] = useState('')
  const [newShapeHandle, setNewShapeHandle] = useState('')
  const [newRole, setNewRole] = useState<ProfileKind>('athlete')
  const [newGym, setNewGym] = useState('')
  const [newLinkedIds, setNewLinkedIds] = useState<string[]>([])
  const [newBackPain, setNewBackPain] = useState<boolean | null>(null)
  const [passcode, setPasscode] = useState('')
  const [passcodeAgain, setPasscodeAgain] = useState('')
  const [handle, setHandle] = useState('')
  const [shapeHandle, setShapeHandle] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [gymName, setGymName] = useState('')
  const [linkedIds, setLinkedIds] = useState<string[]>([])
  const guests = loadQuizGuests()
  void canSeeAllProfiles
  const [legacyPin, setLegacyPin] = useState('')
  const [legacyPinAgain, setLegacyPinAgain] = useState('')
  const [saved, setSaved] = useState<string | null>(null)

  const active = athletes.find((a) => a.id === activeId) ?? null

  useEffect(() => {
    setHandle(active?.instagramHandle ?? '')
    setShapeHandle(active?.shapeLabHandle ?? '')
    setGymName(active?.gymName ?? '')
    setLinkedIds(active?.linkedAthleteIds ?? [])
    setEmail(active?.email ?? '')
    setPhone(active?.phone ?? '')
    setParentPhone(active?.parentPhone ?? '')
    setLegacyPin('')
    setLegacyPinAgain('')
  }, [active?.id, active?.instagramHandle, active?.shapeLabHandle, active?.gymName, active?.linkedAthleteIds, active?.email, active?.phone, active?.parentPhone])

  const flash = (msg: string, ms = 2800) => {
    setSaved(msg)
    window.setTimeout(() => setSaved(null), ms)
  }

  const add = async () => {
    const trimmed =
      displayPersonName(firstName, lastName) || name.trim()
    if (!trimmed || !firstName.trim() || !lastName.trim()) {
      flash('First and last name, then email and phone, then a 4-digit passcode.')
      return
    }
    if (!newEmail.trim() || !newPhone.trim()) {
      flash('Add an email and a phone number so we can tell people apart.')
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
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      instagramHandle: normalizeInstagramHandle(newHandle) || undefined,
      shapeLabHandle: normalizeInstagramHandle(newShapeHandle) || undefined,
      gymName: newGym.trim() || undefined,
      createdAt: new Date().toISOString(),
      passcodeHash,
      role,
      ...(newBackPain != null ? { hasBackPain: newBackPain } : {}),
      shapeTests: takeGuestGrades(firstName, lastName),
    }
    const saved =
      role === 'parent'
        ? withLinkedAthletes(athlete, newLinkedIds, athletes)
        : athlete
    markProfileUnlocked(id)
    forgetQuizGuest(firstName, lastName)
    onChangeAthletes([...athletes, saved])
    onSelect(saved.id)
    setName('')
    setFirstName('')
    setLastName('')
    setNewEmail('')
    setNewPhone('')
    setNewHandle('')
    setNewShapeHandle('')
    setNewGym('')
    setNewLinkedIds([])
    setPasscode('')
    setPasscodeAgain('')
    setNewRole('athlete')
    setNewBackPain(null)
    flash(
      role === 'coach' || role === 'gym_owner'
        ? `${saved.name} is ready as ${roleLabel(saved)}. Unlock with that passcode to add Instagram URLs in Compare — those collections stay on this profile. Ryan’s gym library stays as he left it.`
        : `${saved.name} is ready as ${roleLabel(saved)}. Use that 4-digit passcode on any link.`,
      role === 'coach' || role === 'gym_owner' ? 4200 : 2800,
    )
  }

  const saveDetails = () => {
    if (!active) return
    const instagramHandle = normalizeInstagramHandle(handle) || undefined
    const shapeLabHandle = normalizeInstagramHandle(shapeHandle) || undefined
    const nextGym = gymName.trim() || undefined
    const next =
      profileRole(active) === 'parent'
        ? withLinkedAthletes(active, linkedIds, athletes)
        : active
    onChangeAthletes(
      athletes.map((a) =>
        a.id === active.id
          ? {
              ...next,
              instagramHandle,
              shapeLabHandle,
              gymName: nextGym,
              email: email.trim() || undefined,
              phone: phone.trim() || undefined,
              parentPhone: parentPhone.trim() || undefined,
            }
          : a,
      ),
    )
    const bits = [
      shapeLabHandle ? `@${shapeLabHandle}` : instagramHandle ? `@${instagramHandle}` : null,
      nextGym,
      next.childName ? `athlete ${next.childName}` : null,
      email.trim() || null,
      phone.trim() || null,
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
      {active && (
        <div className="mb-2">
          <AthleteName athlete={active} size="md" nameClassName="font-semibold" />
        </div>
      )}
      {canSeeAllProfiles && onViewProfile && (
        <div className="mb-3 flex flex-wrap gap-2">
          {athletes.slice(0, 24).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onViewProfile(a.id)}
              className="rounded-full border border-[var(--panel-border)] px-2.5 py-1 text-xs"
            >
              <AthleteName athlete={a} size="xs" />
            </button>
          ))}
        </div>
      )}
      <select
        className="mb-3 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
        value={activeId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
      >
        <option value="">Select profile…</option>
        {athletes.map((a) => {
          const last = lastShapeTest(a)
          return (
            <option key={a.id} value={a.id}>
              {`${a.name} · ${roleLabel(a)}`}
              {a.gymName ? ` · ${a.gymName}` : ''}
              {a.shapeLabHandle || a.instagramHandle
                ? ` (@${a.shapeLabHandle || a.instagramHandle})`
                : ''}
              {last ? ` · last test ${formatQuizScore(last)}` : ''}
            </option>
          )
        })}
      </select>

      {active && (
        <div className="mb-3">
          <AthleteProfileCard
            athlete={active}
            viewer={viewer ?? active}
            athletes={athletes}
            variant="embed"
            onAthleteChange={(next) =>
              onChangeAthletes(athletes.map((a) => (a.id === next.id ? next : a)))
            }
            onAddNote={
              viewer && isCoachProfile(viewer)
                ? (text) =>
                    onChangeAthletes(
                      addCoachNotesToAthletes(athletes, [active.id], {
                        author: viewer,
                        text,
                      }),
                    )
                : undefined
            }
          />
        </div>
      )}

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
        {guests.filter((g) => !athletes.some((a) => a.name.toLowerCase() === displayPersonName(g.firstName, g.lastName).toLowerCase())).length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Took the shape test — no profile yet
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {guests
                .filter((g) => !athletes.some((a) => a.name.toLowerCase() === displayPersonName(g.firstName, g.lastName).toLowerCase()))
                .slice(0, 8)
                .map((g) => (
                  <button
                    key={`${g.firstName}-${g.lastName}`}
                    type="button"
                    onClick={() => {
                      setFirstName(g.firstName)
                      setLastName(g.lastName)
                    }}
                    className="rounded-full border border-[var(--accent)]/40 bg-[#102820] px-3 py-1.5 text-xs font-semibold"
                  >
                    {displayPersonName(g.firstName, g.lastName)}
                  </button>
                ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <input
            className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <input
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Email"
          inputMode="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Phone"
          inputMode="tel"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
        />
        <button
          type="button"
          onClick={() => void add()}
          className="rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-sm font-medium text-white"
        >
          Create
        </button>
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
        <input
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Shape Lab @handle (optional — Instagram @ is used if blank)"
          value={newShapeHandle}
          onChange={(e) => setNewShapeHandle(e.target.value)}
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
          <ParentAthletePicker
            athletes={athletes}
            selected={newLinkedIds}
            onChange={setNewLinkedIds}
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

      {active && lastShapeTest(active) && (
        <div className="mt-3 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Shape tests
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">
            Last: {formatQuizScore(lastShapeTest(active)!)} · {quizKindLabel(lastShapeTest(active)!)}
          </p>
          {(active.shapeTests ?? []).length > 1 && (
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              {(active.shapeTests ?? []).length} saved scores on this profile
            </p>
          )}
        </div>
      )}

      {active && (
        <div className="mt-3 flex flex-col gap-2">
          {active.photoDataUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] p-2">
              <AthleteAvatar athlete={active} size="lg" />
              <p className="text-sm text-[var(--muted)]">
                Snapshot for {active.name}. It lives on this profile, not in the
                camera roll. Change it on Today → My profile.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[var(--muted)]">
              No snapshot on this profile yet. Add one on Today → My profile.
            </p>
          )}
          <input
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="Email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="Phone"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="Parent phone"
            inputMode="tel"
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
          />
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
            <ParentAthletePicker
              athletes={athletes.filter((a) => a.id !== active.id)}
              selected={linkedIds}
              onChange={setLinkedIds}
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
          <input
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="Shape Lab @handle (optional — Instagram @ is used if blank)"
            value={shapeHandle}
            onChange={(e) => setShapeHandle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveDetails()
            }}
          />
          <p className="text-[11px] text-[var(--muted)]">
            Tag this profile with {shapeHandle || handle ? `@${normalizeInstagramHandle(shapeHandle || handle)}` : `@"${active.name}"`}
            {' '}in stories, Feed, and Wins.
          </p>
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

function ParentAthletePicker({
  athletes,
  selected,
  onChange,
}: {
  athletes: Athlete[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const kids = athletes.filter((a) => profileRole(a) === 'athlete' || !a.role)
  return (
    <div className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2">
      <p className="text-xs font-semibold text-[var(--text)]">Who is your athlete?</p>
      <p className="mt-1 text-[11px] text-[var(--muted)]">
        Coaches will see you as their parent. You can open their wins, homework, and lessons.
      </p>
      {kids.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--muted)]">No athlete profiles on this gym yet.</p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {kids.map((a) => {
            const on = selected.includes(a.id)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() =>
                    onChange(on ? selected.filter((id) => id !== a.id) : [...selected, a.id])
                  }
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                    on ? 'bg-[var(--accent)] text-[#06281f]' : 'text-[var(--muted)]'
                  }`}
                >
                  <AthleteName athlete={a} />
                  <span className="text-[11px]">{on ? 'Linked' : 'Select'}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
