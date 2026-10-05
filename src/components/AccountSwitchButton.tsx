import { useState } from 'react'
import type { AuthSessionUser } from '../lib/authSession'
import { rememberCsrf } from '../lib/authSession'
import { switchAccount } from '../lib/accountAdmin'

type LinkedLogin = {
  id: string
  email: string
  role: string
  displayName: string
}

async function listLinkedLogins(): Promise<LinkedLogin[]> {
  const res = await fetch('/api/auth/linked', { credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) return []
  const data = (await res.json().catch(() => ({}))) as { accounts?: LinkedLogin[]; csrf?: string }
  rememberCsrf(data)
  return Array.isArray(data.accounts) ? data.accounts : []
}

/**
 * Toggle between linked logins owned by the same person (e.g. Levi's
 * gymOwner login and his coach login). The first switch on a device asks
 * for the other login's password; after that the device is trusted.
 * Front desk staff on the gym owner login cannot reach the linked coach
 * login without that password.
 */
export function AccountSwitchButton({
  user,
  hiddenInFrontDesk = false,
  frontDeskMode = false,
  compact = false,
}: {
  user: AuthSessionUser
  /** Hide the switch while the front desk view is active. */
  hiddenInFrontDesk?: boolean
  frontDeskMode?: boolean
  compact?: boolean
}) {
  const [accounts, setAccounts] = useState<LinkedLogin[] | null>(null)
  const [picking, setPicking] = useState(false)
  const [target, setTarget] = useState<LinkedLogin | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const linkedIds = user.linkedAccountIds ?? []
  if (linkedIds.length === 0) return null
  if (hiddenInFrontDesk && frontDeskMode) return null

  const open = async () => {
    setError(null)
    setPicking(true)
    try {
      const known = await listLinkedLogins()
      setAccounts(known)
      if (known.length === 1 && known[0]) {
        void attempt(known[0], '')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load linked logins.')
    }
  }

  const attempt = async (to: LinkedLogin, pw: string) => {
    setBusy(true)
    setError(null)
    const result = await switchAccount(to.id, pw || undefined)
    setBusy(false)
    if (result.ok) {
      window.location.reload()
      return
    }
    if (result.needPassword) {
      setTarget(to)
      if (pw) setError(result.message)
      return
    }
    setError(result.message)
  }

  const close = () => {
    setPicking(false)
    setTarget(null)
    setPassword('')
    setError(null)
    setAccounts(null)
  }

  const label =
    user.role === 'gymOwner' ? 'Coach view' : user.role === 'coach' ? 'Gym owner view' : 'Switch login'

  return (
    <>
      <button
        type="button"
        onClick={() => void open()}
        className={
          compact
            ? 'rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text)]'
            : 'w-full rounded-xl border border-[var(--panel-border)] px-3 py-2 text-left text-sm font-semibold text-[var(--text)]'
        }
      >
        ⇄ {label}
      </button>
      {picking && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {!target ? (
              <>
                <p className="text-sm font-semibold text-[var(--text)]">Switch login</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Signed in as {user.email}. Pick which of your logins to open.
                </p>
                <div className="mt-3 grid gap-2">
                  {(accounts ?? []).map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      disabled={busy}
                      onClick={() => void attempt(row, '')}
                      className="rounded-xl border border-[var(--panel-border)] px-3 py-2 text-left text-sm text-[var(--text)] disabled:opacity-50"
                    >
                      <span className="font-semibold">{row.displayName}</span>
                      <span className="block text-xs text-[var(--muted)]">
                        {row.email} · {row.role}
                      </span>
                    </button>
                  ))}
                  {accounts && accounts.length === 0 && (
                    <p className="text-xs text-[var(--muted)]">
                      Linked logins are set up by the Shapelab admin when the accounts are created.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-[var(--text)]">
                  Open {target.displayName}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Enter the password for {target.email}. This device will remember it for next
                  time.
                </p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void attempt(target, password)
                  }}
                  placeholder="Password"
                  autoFocus
                  className="mt-3 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy || !password}
                    onClick={() => void attempt(target, password)}
                    className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
                  >
                    Switch
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTarget(null)
                      setPassword('')
                      setError(null)
                    }}
                    className="rounded-xl border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--muted)]"
                  >
                    Back
                  </button>
                </div>
              </>
            )}
            {error && <p className="mt-2 text-xs text-[var(--bad)]">{error}</p>}
            <button
              type="button"
              onClick={close}
              className="mt-3 w-full rounded-xl px-3 py-2 text-xs text-[var(--muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
