/**
 * Unlock an athlete profile that already has a 4-digit passcode.
 * New athletes set the PIN on the create form — this modal does not invent one.
 */

import { useState } from 'react'
import type { Athlete } from '../types'
import { digitsOnlyPin, hashPasscode, markProfileUnlocked } from '../lib/athletePasscode'

type Props = {
  athlete: Athlete
  onCancel: () => void
  onUnlocked: (athlete: Athlete) => void
}

export function UnlockAthleteModal({ athlete, onCancel, onUnlocked }: Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)
    if (!athlete.passcodeHash) {
      setError('This profile does not have a passcode yet. Set one when you create it.')
      return
    }
    if (!code.trim()) {
      setError('Enter this profile’s 4-digit passcode.')
      return
    }
    setBusy(true)
    try {
      const hash = await hashPasscode(athlete.id, code)
      if (hash !== athlete.passcodeHash) {
        setError('That passcode does not match this profile.')
        return
      }
      markProfileUnlocked(athlete.id)
      onUnlocked(athlete)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Unlock profile
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">{athlete.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Enter the 4-digit passcode set when this profile was created. That loads
          homework, hold times, Compare URLs, and the video library on this link.
        </p>
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            4-digit passcode
          </span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(digitsOnlyPin(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit()
            }}
            className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm tracking-[0.35em] text-[var(--text)]"
          />
        </label>
        {error && <p className="mt-2 text-[12px] text-[var(--bad)]">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#06281f] disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Unlock'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
