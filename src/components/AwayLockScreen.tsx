/**
 * Browser-only desk lock. The session cookie stays until sign-out.
 * Floor iPad mode is separate — do not use this overlay there.
 */

import { useEffect, useState } from 'react'
import { logoutSession, unlockAway, type AuthSessionUser } from '../lib/authSession'

export const AWAY_IDLE_MS = 20 * 60 * 1000

type Props = {
  user: AuthSessionUser
  onUnlocked: () => void
  onSignedOut: () => void
}

export function AwayLockScreen({ user, onUnlocked, onSignedOut }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(null)
    setBusy(true)
    try {
      await unlockAway(password)
      setPassword('')
      onUnlocked()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not unlock.'
      if (message === 'Sign in to continue.') {
        onSignedOut()
        return
      }
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end justify-center bg-[#061418]/92 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="away-lock-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Away
        </p>
        <h2 id="away-lock-title" className="mt-1 text-xl font-semibold text-[var(--text)]">
          This gym is locked
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Type the password for {user.email}. This browser still has a signed-in
          cookie — locking only covers this screen. Use floor mode on the shared
          iPad.
        </p>
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit()
            }}
            className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
          />
        </label>
        {error && <p className="mt-3 text-sm text-[var(--bad)]">{error}</p>}
        <button
          type="button"
          disabled={busy || !password}
          onClick={() => void submit()}
          className="mt-4 w-full rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Unlock'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void logoutSession()
              .then(onSignedOut)
              .catch(() => onSignedOut())
          }}
          className="mt-3 w-full text-center text-sm text-[var(--muted)]"
        >
          Sign out instead
        </button>
      </div>
    </div>
  )
}

export function useAwayLock(enabled: boolean, onLock: () => void) {
  useEffect(() => {
    if (!enabled) return
    let timer = window.setTimeout(onLock, AWAY_IDLE_MS)
    const bump = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(onLock, AWAY_IDLE_MS)
    }
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart']
    for (const name of events) window.addEventListener(name, bump, { passive: true })
    return () => {
      window.clearTimeout(timer)
      for (const name of events) window.removeEventListener(name, bump)
    }
  }, [enabled, onLock])
}
