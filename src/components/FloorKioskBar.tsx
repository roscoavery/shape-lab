import { useState } from 'react'
import { setFloorKiosk, type AuthSessionUser } from '../lib/authSession'

type Props = {
  user: AuthSessionUser
  onUser: (user: AuthSessionUser) => void
}

export function FloorKioskBar({ user, onUser }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <section className="mb-4 rounded-xl border border-[#6ec8d6]/50 bg-[#102028] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6ec8d6]">
        Floor iPad
      </p>
      <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">This device is on the floor</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        Class, homework, and lessons still work. Contacts, accounts, consent, and
        research stay locked on this browser until someone types the admin
        password. Signing out also ends floor mode.
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{user.email}</p>
      <label className="mt-3 block max-w-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Admin password to leave
        </span>
        <input
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <button
        type="button"
        disabled={busy || !password}
        onClick={() => {
          setBusy(true)
          setError(null)
          void setFloorKiosk(false, password)
            .then((result) => {
              if (result.user) onUser(result.user)
              setPassword('')
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Could not leave the floor.'))
            .finally(() => setBusy(false))
        }}
        className="mt-3 rounded-full bg-[#6ec8d6] px-4 py-2 text-sm font-semibold text-[#061418] disabled:opacity-50"
      >
        Leave floor mode
      </button>
    </section>
  )
}
