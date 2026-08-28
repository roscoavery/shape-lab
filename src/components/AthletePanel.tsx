import { useEffect, useState } from 'react'
import type { Athlete } from '../types'
import { createId } from '../lib/storage'
import { instagramUrl, normalizeInstagramHandle } from '../lib/flowShare'
import { isRyanAthlete } from '../lib/ryanProfile'
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
}

export function AthletePanel({
  athletes,
  activeId,
  onChangeAthletes,
  onSelect,
}: Props) {
  const [name, setName] = useState('')
  const [newHandle, setNewHandle] = useState('')
  const [passcode, setPasscode] = useState('')
  const [passcodeAgain, setPasscodeAgain] = useState('')
  const [handle, setHandle] = useState('')
  const [legacyPin, setLegacyPin] = useState('')
  const [legacyPinAgain, setLegacyPinAgain] = useState('')
  const [saved, setSaved] = useState<string | null>(null)

  const active = athletes.find((a) => a.id === activeId) ?? null

  useEffect(() => {
    setHandle(active?.instagramHandle ?? '')
    setLegacyPin('')
    setLegacyPinAgain('')
  }, [active?.id, active?.instagramHandle])

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
      onSelect(existing.id)
      setName('')
      setPasscode('')
      setPasscodeAgain('')
      flash(`${existing.name} is already on this gym computer — selected.`)
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
    const id = createId('ath')
    const passcodeHash = await hashPasscode(id, passcode)
    const athlete: Athlete = {
      id,
      name: trimmed,
      instagramHandle: normalizeInstagramHandle(newHandle) || undefined,
      createdAt: new Date().toISOString(),
      passcodeHash,
    }
    markProfileUnlocked(id)
    onChangeAthletes([...athletes, athlete])
    onSelect(athlete.id)
    setName('')
    setNewHandle('')
    setPasscode('')
    setPasscodeAgain('')
    flash(`${athlete.name} is ready. Use that 4-digit passcode on any link.`)
  }

  const saveHandle = () => {
    if (!active) return
    const instagramHandle = normalizeInstagramHandle(handle) || undefined
    onChangeAthletes(
      athletes.map((a) => (a.id === active.id ? { ...a, instagramHandle } : a)),
    )
    flash(instagramHandle ? `Saved @${instagramHandle}` : 'Instagram handle cleared', 2200)
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
      <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">Athlete profile</p>
      <select
        className="mb-3 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
        value={activeId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
      >
        <option value="">Select athlete…</option>
        {athletes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.instagramHandle ? ` (@${a.instagramHandle})` : ''}
          </option>
        ))}
      </select>

      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        New athlete
      </p>
      <div className="flex flex-col gap-2">
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
      </div>

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
          <input
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="Instagram @handle (optional)"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveHandle()
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveHandle}
              className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1 text-xs"
            >
              Save Instagram
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
          </div>
        </div>
      )}
      {saved && <p className="mt-2 text-[11px] text-[var(--accent)]">{saved}</p>}
      <p className="mt-2 text-[11px] leading-snug text-[var(--muted)]">
        Each new profile sets a 4-digit passcode on Create. Unlock that profile
        on any phone link or browser to see homework, hold times, Compare URLs,
        and the video library. Ryan’s passcode is 2223. Creating the same name
        again selects the existing profile. Ryan stays on the roster.
      </p>
    </div>
  )
}
