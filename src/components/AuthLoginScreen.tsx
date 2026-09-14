import { useState } from 'react'
import {
  bootstrapAdmin,
  loginWithPassword,
  type AuthSessionUser,
} from '../lib/authSession'

type Props = {
  bootstrapAllowed: boolean
  onSignedIn: (user: AuthSessionUser) => void
}

export function AuthLoginScreen({ bootstrapAllowed, onSignedIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('Gym admin')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'login' | 'bootstrap'>(bootstrapAllowed ? 'bootstrap' : 'login')

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      const result =
        mode === 'bootstrap'
          ? await bootstrapAdmin(email, password, displayName)
          : await loginWithPassword(email, password)
      if (!result.user) {
        setError('Could not start that session.')
        return
      }
      onSignedIn(result.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">shapelab</p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">
        {mode === 'bootstrap' ? 'Create the gym admin account' : 'Sign in'}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
        {mode === 'bootstrap'
          ? 'This computer does not have an admin account yet. Use your email and a long password. The old 4-digit gym PIN is not enough to open private data.'
          : 'Private roster, photos, and parent contacts stay behind this account. Profile PINs only pick who is unlocked on this device after you sign in.'}
      </p>
      {mode === 'bootstrap' && (
        <label className="mt-5 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Display name
          </span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
          />
        </label>
      )}
      <label className="mt-4 block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Email
        </span>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
        />
      </label>
      <label className="mt-4 block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Password
        </span>
        <input
          type="password"
          autoComplete={mode === 'bootstrap' ? 'new-password' : 'current-password'}
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
        onClick={() => void submit()}
        disabled={busy}
        className="mt-5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
      >
        {busy ? 'Working…' : mode === 'bootstrap' ? 'Create admin and sign in' : 'Sign in'}
      </button>
      {bootstrapAllowed && mode === 'login' && (
        <button
          type="button"
          onClick={() => setMode('bootstrap')}
          className="mt-3 text-left text-sm text-[var(--accent)]"
        >
          Create the first admin account
        </button>
      )}
      {bootstrapAllowed && mode === 'bootstrap' && (
        <button
          type="button"
          onClick={() => setMode('login')}
          className="mt-3 text-left text-sm text-[var(--muted)]"
        >
          I already have an account
        </button>
      )}
    </div>
  )
}
