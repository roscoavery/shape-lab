import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../types'
import {
  adminResetPassword,
  changeOwnPassword,
  createGymAccount,
  listGymAccounts,
  patchGymAccount,
  type PublicAccount,
} from '../lib/accountAdmin'
import { sessionIsAdmin, type AuthSessionUser, type SessionRole } from '../lib/authSession'

const ROLES: { id: SessionRole; label: string }[] = [
  { id: 'admin', label: 'Admin' },
  { id: 'coach', label: 'Coach' },
  { id: 'athlete', label: 'Athlete' },
  { id: 'parent', label: 'Parent' },
  { id: 'gymOwner', label: 'Gym owner' },
]

type Props = {
  user: AuthSessionUser
  athletes: Athlete[]
}

export function AccountsDesk({ user, athletes }: Props) {
  const admin = sessionIsAdmin(user)
  const [accounts, setAccounts] = useState<PublicAccount[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [email, setEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<SessionRole>('coach')
  const [rosterProfileId, setRosterProfileId] = useState('')
  const [parentChildId, setParentChildId] = useState('')

  const sortedAthletes = useMemo(
    () => [...athletes].sort((a, b) => a.name.localeCompare(b.name)),
    [athletes],
  )

  const reload = async () => {
    if (!admin) return
    const rows = await listGymAccounts()
    setAccounts(rows)
  }

  useEffect(() => {
    if (!admin) return
    void reload().catch((err) => {
      setError(err instanceof Error ? err.message : 'Could not load accounts.')
    })
  }, [admin])

  const flash = (message: string) => {
    setSaved(message)
    setError(null)
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Signed in
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">{user.displayName}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {user.email} · {user.role}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          This email and password open private gym data on every device. Profile
          PINs only pick a name after you are signed in.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Current password
            </span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>
          <label>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              New password
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void changeOwnPassword(currentPassword, newPassword)
              .then(() => {
                setCurrentPassword('')
                setNewPassword('')
                flash('Password updated on this account. Other devices must sign in again.')
              })
              .catch((err) => setError(err instanceof Error ? err.message : 'Could not change that password.'))
              .finally(() => setBusy(false))
          }}
          className="mt-4 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
        >
          Save new password
        </button>
      </section>

      {admin && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <h2 className="text-xl font-semibold text-[var(--text)]">Add a login</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Coaches only see athletes assigned to them. Parents only see the
            child you link. Athletes only see themselves.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Name
              </span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
              />
            </label>
            <label>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
              />
            </label>
            <label>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Password
              </span>
              <input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
              />
            </label>
            <label>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Role
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as SessionRole)}
                className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
              >
                {ROLES.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Linked profile
              </span>
              <select
                value={rosterProfileId}
                onChange={(e) => setRosterProfileId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
              >
                <option value="">No roster profile yet</option>
                {sortedAthletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name}
                    {athlete.role ? ` · ${athlete.role}` : ''}
                  </option>
                ))}
              </select>
            </label>
            {role === 'parent' && (
              <label className="sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Child this parent can see
                </span>
                <select
                  value={parentChildId}
                  onChange={(e) => setParentChildId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
                >
                  <option value="">Pick the athlete</option>
                  {sortedAthletes
                    .filter((athlete) => athlete.role !== 'parent' && athlete.role !== 'coach')
                    .map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void createGymAccount({
                email,
                password: createPassword,
                role,
                displayName: displayName || email,
                rosterProfileId: rosterProfileId || undefined,
                linkedAthleteIds: parentChildId ? [parentChildId] : undefined,
              })
                .then(() => {
                  setEmail('')
                  setCreatePassword('')
                  setDisplayName('')
                  setRosterProfileId('')
                  setParentChildId('')
                  flash('Login created. They can sign in on any device with that email.')
                  return reload()
                })
                .catch((err) => setError(err instanceof Error ? err.message : 'Could not create that account.'))
                .finally(() => setBusy(false))
            }}
            className="mt-4 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
          >
            Create login
          </button>
        </section>
      )}

      {admin && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <h2 className="text-xl font-semibold text-[var(--text)]">Logins on this gym</h2>
          {accounts.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No other accounts yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  athletes={sortedAthletes}
                  busy={busy}
                  onError={setError}
                  onSaved={(message) => {
                    flash(message)
                    void reload()
                  }}
                  setBusy={setBusy}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      {saved && <p className="text-sm text-[var(--accent)]">{saved}</p>}
    </div>
  )
}

function AccountRow({
  account,
  athletes,
  busy,
  onError,
  onSaved,
  setBusy,
}: {
  account: PublicAccount
  athletes: Athlete[]
  busy: boolean
  onError: (message: string) => void
  onSaved: (message: string) => void
  setBusy: (value: boolean) => void
}) {
  const [profileId, setProfileId] = useState(account.rosterProfileId ?? '')
  const [resetPassword, setResetPassword] = useState('')
  const linked = athletes.find((row) => row.id === account.rosterProfileId)

  return (
    <li className="rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-3">
      <p className="font-semibold text-[var(--text)]">{account.displayName}</p>
      <p className="text-xs text-[var(--muted)]">
        {account.email} · {account.role}
        {linked ? ` · ${linked.name}` : ''}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <select
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)]"
        >
          <option value="">No roster profile</option>
          {athletes.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void patchGymAccount({
              id: account.id,
              rosterProfileId: profileId || null,
            })
              .then(() => onSaved(`Linked ${account.displayName}.`))
              .catch((err) => onError(err instanceof Error ? err.message : 'Could not link that profile.'))
              .finally(() => setBusy(false))
          }}
          className="rounded-full border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold"
        >
          Save link
        </button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="password"
          placeholder="Reset password"
          value={resetPassword}
          onChange={(e) => setResetPassword(e.target.value)}
          className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)]"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void adminResetPassword(account.id, resetPassword)
              .then(() => {
                setResetPassword('')
                onSaved(`${account.displayName} must sign in with the new password.`)
              })
              .catch((err) => onError(err instanceof Error ? err.message : 'Could not reset that password.'))
              .finally(() => setBusy(false))
          }}
          className="rounded-full border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold"
        >
          Reset
        </button>
      </div>
    </li>
  )
}
