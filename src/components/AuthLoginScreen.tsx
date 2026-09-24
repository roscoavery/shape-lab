import { useEffect, useState } from 'react'
import {
  bootstrapAdmin,
  loginWithPassword,
  peekInvite,
  redeemInvite,
  registerAccount,
  type AuthSessionUser,
} from '../lib/authSession'

type Props = {
  bootstrapAllowed: boolean
  onSignedIn: (user: AuthSessionUser) => void
}

function inviteTokenFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get('invite')?.trim() || ''
  } catch {
    return ''
  }
}

function clearInviteFromUrl() {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('invite')) return
    url.searchParams.delete('invite')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  } catch {
    /* keep the query */
  }
}

export function AuthLoginScreen({ bootstrapAllowed, onSignedIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('Gym admin')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteReady, setInviteReady] = useState(false)
  const [mode, setMode] = useState<'login' | 'bootstrap' | 'invite' | 'register'>(
    bootstrapAllowed ? 'bootstrap' : 'login',
  )
  const [registerRole, setRegisterRole] = useState<'athlete' | 'parent' | 'coach'>('athlete')

  useEffect(() => {
    const token = inviteTokenFromUrl()
    if (!token) return
    setInviteToken(token)
    setMode('invite')
    void peekInvite(token)
      .then((peek) => {
        if (!peek.valid) {
          setError('That sign-in link is wrong or already used.')
          setMode('login')
          clearInviteFromUrl()
          return
        }
        setInviteEmail(peek.email || '')
        setInviteName(peek.displayName || peek.email || '')
        setInviteReady(true)
      })
      .catch(() => {
        setError('Could not open that sign-in link.')
        setMode('login')
      })
  }, [])

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      const result =
        mode === 'bootstrap'
          ? await bootstrapAdmin(email, password, displayName)
          : mode === 'invite'
            ? await redeemInvite(inviteToken, password)
            : mode === 'register'
              ? await registerAccount(email, password, displayName || email, registerRole)
              : await loginWithPassword(email, password)
      if (!result.user) {
        setError('Could not start that session.')
        return
      }
      if (mode === 'invite') clearInviteFromUrl()
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
        {mode === 'bootstrap'
          ? 'Create the gym admin account'
          : mode === 'invite'
            ? 'Choose your password'
            : mode === 'register'
              ? 'Create an account'
              : 'Sign in'}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
        {mode === 'bootstrap'
          ? 'This computer does not have an admin account yet. Use your email and a long password. The old 4-digit gym PIN is not enough to open private data.'
          : mode === 'invite'
            ? `This link is for ${inviteName || 'your gym login'}. Pick a password only you know. It works once.`
            : mode === 'register'
              ? 'Use the gym link you were sent. Pick your email, a long password, and whether you are an athlete, parent, or coach.'
              : 'Private roster, photos, and parent contacts stay behind this account. Profile PINs only pick who is unlocked on this device after you sign in.'}
      </p>
      {(mode === 'bootstrap' || mode === 'register') && (
        <label className="mt-5 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Display name
          </span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={mode === 'register' ? 'Your name' : 'Gym admin'}
            className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
          />
        </label>
      )}
      {mode !== 'invite' && (
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
      )}
      {mode === 'invite' && inviteReady && (
        <p className="mt-4 text-sm text-[var(--text)]">{inviteEmail}</p>
      )}
      <label className="mt-4 block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {mode === 'invite' ? 'New password' : 'Password'}
        </span>
        <input
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
        disabled={busy || (mode === 'invite' && !inviteReady)}
        className="mt-5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
      >
        {busy
          ? 'Working…'
          : mode === 'bootstrap'
            ? 'Create admin and sign in'
            : mode === 'invite'
              ? 'Save password and open the gym'
              : mode === 'register'
                ? 'Create account and sign in'
                : 'Sign in'}
      </button>
      {mode === 'register' && (
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            I am a
          </span>
          <select
            value={registerRole}
            onChange={(e) => setRegisterRole(e.target.value as 'athlete' | 'parent' | 'coach')}
            className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
          >
            <option value="athlete">Athlete</option>
            <option value="parent">Parent</option>
            <option value="coach">Coach</option>
          </select>
        </label>
      )}
      {mode === 'login' && (
        <button
          type="button"
          onClick={() => {
            setDisplayName('')
            setMode('register')
          }}
          className="mt-3 text-left text-sm text-[var(--accent)]"
        >
          Create an account
        </button>
      )}
      {mode === 'register' && (
        <button
          type="button"
          onClick={() => setMode('login')}
          className="mt-3 text-left text-sm text-[var(--muted)]"
        >
          I already have an account
        </button>
      )}
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
