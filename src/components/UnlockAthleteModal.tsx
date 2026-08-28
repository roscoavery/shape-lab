/**
 * Unlock or set an athlete passcode before the profile (and its library) loads.
 */

import { useState } from 'react'
import type { Athlete } from '../types'
import {
  hashPasscode,
  markProfileUnlocked,
  passcodeLooksOk,
} from '../lib/athletePasscode'

type Props = {
  athlete: Athlete
  mode: 'unlock' | 'set'
  onCancel: () => void
  onUnlocked: (athlete: Athlete) => void
  onSetPasscode: (athlete: Athlete, passcodeHash: string) => void
}

export function UnlockAthleteModal({
  athlete,
  mode,
  onCancel,
  onUnlocked,
  onSetPasscode,
}: Props) {
  const [code, setCode] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)
    if (!passcodeLooksOk(code)) {
      setError('Use at least 4 characters.')
      return
    }
    setBusy(true)
    try {
      const hash = await hashPasscode(athlete.id, code)
      if (mode === 'set') {
        if (code !== again) {
          setError('Those passcodes do not match.')
          return
        }
        onSetPasscode(athlete, hash)
        markProfileUnlocked(athlete.id)
        onUnlocked({ ...athlete, passcodeHash: hash })
        return
      }
      if (!athlete.passcodeHash || hash !== athlete.passcodeHash) {
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
          {mode === 'set' ? 'Set passcode' : 'Unlock profile'}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">{athlete.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {mode === 'set'
            ? 'This passcode opens the profile from any phone link or browser. Homework, hold times, Compare URLs, and the video library stay with it.'
            : 'Enter the passcode for this profile to load its homework, hold times, Compare URLs, and video library.'}
        </p>
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Passcode
          </span>
          <input
            type="password"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit()
            }}
            className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
          />
        </label>
        {mode === 'set' && (
          <label className="mt-3 block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Type it again
            </span>
            <input
              type="password"
              autoComplete="off"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit()
              }}
              className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>
        )}
        {error && <p className="mt-2 text-[12px] text-[var(--bad)]">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#06281f] disabled:opacity-50"
          >
            {busy ? 'Checking…' : mode === 'set' ? 'Save passcode' : 'Unlock'}
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
