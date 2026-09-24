import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../types'
import {
  adminResetPassword,
  changeOwnPassword,
  createGymAccount,
  createSignInLink,
  deleteGymAccount,
  listGymAccounts,
  patchGymAccount,
  type PublicAccount,
} from '../lib/accountAdmin'
import {
  deleteOwnAccount,
  sessionIsAdmin,
  setFloorKiosk,
  fetchAuthMe,
  saveMaxDevices,
  type AuthSessionUser,
  type SessionRole,
} from '../lib/authSession'
import { CollapsibleSection } from './CollapsibleSection'
import { DeskPreviewPicker } from './DeskPreviewPicker'
import { DeskMessagesEditor } from './DeskMessagesEditor'
import { type DeskPreview } from '../lib/deskPreview'

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
  onUser?: (user: AuthSessionUser) => void
  onLock?: () => void
  deskPreview?: DeskPreview
  onDeskPreview?: (next: DeskPreview) => void
}

export function AccountsDesk({ user, athletes, onUser, onLock, deskPreview, onDeskPreview }: Props) {
  const admin = sessionIsAdmin(user)
  const [accounts, setAccounts] = useState<PublicAccount[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [maxDevices, setMaxDevices] = useState(user.maxDevices ?? 4)
  const [email, setEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<SessionRole>('coach')
  const [rosterProfileId, setRosterProfileId] = useState('')
  const [parentChildIds, setParentChildIds] = useState<string[]>([])
  const [mailEnabled, setMailEnabled] = useState(false)
  const [emailNewLogin, setEmailNewLogin] = useState(false)

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
    void fetchAuthMe().then((me) => setMailEnabled(Boolean(me.mailEnabled)))
  }, [admin])

  const flash = (message: string) => {
    setSaved(message)
    setError(null)
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <CollapsibleSection title="This login" hint={`${user.email} · ${user.role}`} defaultOpen={false}>
      <section>
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
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Devices signed in at once
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
            Phones and iPads stay signed in until you hit this number. Signing in on a new
            device then drops the oldest one. Changing your password still signs the others
            out.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={12}
              value={maxDevices}
              onChange={(e) => setMaxDevices(Number(e.target.value))}
              className="min-w-0 flex-1"
            />
            <span className="w-8 text-right text-sm font-semibold">{maxDevices}</span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void saveMaxDevices(maxDevices)
                .then((result) => {
                  if (result.user) onUser?.(result.user)
                  flash(`This login keeps ${maxDevices} device${maxDevices === 1 ? '' : 's'} signed in.`)
                })
                .catch((err) => setError(err instanceof Error ? err.message : 'Could not save that limit.'))
                .finally(() => setBusy(false))
            }}
            className="mt-3 rounded-full border border-[var(--panel-border)] px-4 py-2 text-sm font-semibold"
          >
            Save device limit
          </button>
        </div>
        {admin && onDeskPreview && (
          <div className="mt-6">
            <DeskPreviewPicker
              value={deskPreview ?? 'home'}
              onChange={(next) => {
                onDeskPreview(next)
                flash(`Desk is now ${next === 'home' ? 'this gym login' : next}.`)
              }}
            />
          </div>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!confirm('Delete your own gym login? You will have to create a new account to sign in again. Profiles stay.')) {
              return
            }
            setBusy(true)
            void deleteOwnAccount()
              .then(() => window.location.reload())
              .catch((err) => setError(err instanceof Error ? err.message : 'Could not delete that account.'))
              .finally(() => setBusy(false))
          }}
          className="mt-3 rounded-full border border-red-900/60 px-4 py-2 text-sm font-semibold text-red-300 disabled:opacity-50"
        >
          Delete my account
        </button>
        {onLock && (
          <>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
              Lock this browser when you walk away. It asks for your password
              again after 20 minutes of no taps. The shared iPad should use
              floor mode instead.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => onLock()}
              className="mt-3 rounded-full border border-[var(--panel-border)] px-4 py-2 text-sm font-semibold"
            >
              Lock this gym
            </button>
          </>
        )}
      </section>
      </CollapsibleSection>

      {admin && (
        <CollapsibleSection title="Floor iPad" hint="Shared gym iPad mode" defaultOpen={false}>
        <section>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Use this when the shared gym iPad stays signed in. Class, homework,
            and lessons keep working. This browser cannot open contacts,
            accounts, consent, Watch, or research until someone types the admin
            password.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void setFloorKiosk(true)
                .then((result) => {
                  if (result.user) onUser?.(result.user)
                  flash('This browser is now a floor iPad.')
                })
                .catch((err) =>
                  setError(err instanceof Error ? err.message : 'Could not turn this device into a floor iPad.'),
                )
                .finally(() => setBusy(false))
            }}
            className="mt-4 rounded-full bg-[#6ec8d6] px-4 py-2 text-sm font-semibold text-[#061418] disabled:opacity-50"
          >
            Use this iPad on the floor
          </button>
        </section>
        </CollapsibleSection>
      )}

      {admin && (
        <CollapsibleSection title="Add a login" hint="Coach, parent, athlete, or gym owner" defaultOpen={false}>
        <section>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Coaches only see athletes assigned to them. Parents only see the
            child you link. Athletes only see themselves. Leave the password
            blank to copy a one-time sign-in link — they choose their own
            password. Email is off on this gym until SMTP is set on the Mac.
          </p>
          {mailEnabled && (
            <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={emailNewLogin}
                onChange={(e) => setEmailNewLogin(e.target.checked)}
              />
              Email them the sign-in link when the password is blank
            </label>
          )}
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
                Password (optional)
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
              <div className="sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Athletes this parent can see
                </span>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Link to existing profiles. Do not create a second child.
                </p>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[var(--panel-border)] bg-[#0d1218] p-2">
                  {sortedAthletes
                    .filter((athlete) => athlete.role !== 'parent' && athlete.role !== 'coach')
                    .map((athlete) => {
                      const on = parentChildIds.includes(athlete.id)
                      return (
                        <li key={athlete.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setParentChildIds(
                                on
                                  ? parentChildIds.filter((id) => id !== athlete.id)
                                  : [...parentChildIds, athlete.id],
                              )
                            }
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                              on ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--muted)]'
                            }`}
                          >
                            <span>{athlete.name}</span>
                            <span className="text-[11px]">{on ? 'Linked' : 'Select'}</span>
                          </button>
                        </li>
                      )
                    })}
                </ul>
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void createGymAccount({
                email,
                password: createPassword || undefined,
                role,
                displayName: displayName || email,
                rosterProfileId: rosterProfileId || undefined,
                linkedAthleteIds: parentChildIds.length ? parentChildIds : undefined,
                sendEmail: mailEnabled && emailNewLogin && !createPassword,
              })
                .then(async (result) => {
                  setEmail('')
                  setCreatePassword('')
                  setDisplayName('')
                  setRosterProfileId('')
                  setParentChildIds([])
                  if (result.inviteUrl) {
                    try {
                      await navigator.clipboard.writeText(result.inviteUrl)
                      flash(
                        result.mailed
                          ? 'Login created. Sign-in link emailed and copied — it works for 7 days.'
                          : 'Login created. Sign-in link copied — it works for 7 days. Email is off on this gym.',
                      )
                    } catch {
                      flash(`Login created. Send them this link: ${result.inviteUrl}`)
                    }
                  } else {
                    flash('Login created. They can sign in on any device with that email.')
                  }
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
        </CollapsibleSection>
      )}

      {admin && (
        <CollapsibleSection title="Logins on this gym" hint={`${accounts.length} account${accounts.length === 1 ? '' : 's'}`} defaultOpen={false}>
        <section>
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
                  mailEnabled={mailEnabled}
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
        </CollapsibleSection>
      )}

      <DeskMessagesEditor admin={admin} />

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      {saved && <p className="text-sm text-[var(--accent)]">{saved}</p>}
    </div>
  )
}

function AccountRow({
  account,
  athletes,
  busy,
  mailEnabled,
  onError,
  onSaved,
  setBusy,
}: {
  account: PublicAccount
  athletes: Athlete[]
  busy: boolean
  mailEnabled: boolean
  onError: (message: string) => void
  onSaved: (message: string) => void
  setBusy: (busy: boolean) => void
}) {
  const [profileId, setProfileId] = useState(account.rosterProfileId ?? '')
  const [childIds, setChildIds] = useState<string[]>(account.linkedAthleteIds ?? [])
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
      {account.role === 'parent' && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Linked athletes
          </p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
            {athletes
              .filter((athlete) => athlete.role !== 'parent' && athlete.role !== 'coach')
              .map((athlete) => {
                const on = childIds.includes(athlete.id)
                return (
                  <li key={athlete.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setChildIds(on ? childIds.filter((id) => id !== athlete.id) : [...childIds, athlete.id])
                      }
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs ${
                        on ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'text-[var(--muted)]'
                      }`}
                    >
                      <span>{athlete.name}</span>
                      <span>{on ? 'Linked' : 'Select'}</span>
                    </button>
                  </li>
                )
              })}
          </ul>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void patchGymAccount({
                id: account.id,
                linkedAthleteIds: childIds,
              })
                .then(() => onSaved(`Updated athletes for ${account.displayName}.`))
                .catch((err) => onError(err instanceof Error ? err.message : 'Could not link those athletes.'))
                .finally(() => setBusy(false))
            }}
            className="mt-2 rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold"
          >
            Save athlete links
          </button>
        </div>
      )}
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
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          void createSignInLink(account.id)
            .then(async (invite) => {
              try {
                await navigator.clipboard.writeText(invite.url)
                onSaved(`Sign-in link for ${account.displayName} copied. It works for 7 days.`)
              } catch {
                onSaved(invite.url)
              }
            })
            .catch((err) =>
              onError(err instanceof Error ? err.message : 'Could not make that sign-in link.'),
            )
            .finally(() => setBusy(false))
        }}
        className="mt-2 rounded-full border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold"
      >
        Copy sign-in link
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!confirm(`Delete ${account.displayName}'s login? Their athlete profile stays.`)) return
          setBusy(true)
          void deleteGymAccount(account.id)
            .then(() => onSaved(`Deleted ${account.displayName}.`))
            .catch((err) => onError(err instanceof Error ? err.message : 'Could not delete that account.'))
            .finally(() => setBusy(false))
        }}
        className="mt-2 ml-2 rounded-full border border-red-900/60 px-3 py-2 text-xs font-semibold text-red-300"
      >
        Delete account
      </button>
      {mailEnabled && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void createSignInLink(account.id, true)
              .then(async (invite) => {
                try {
                  await navigator.clipboard.writeText(invite.url)
                } catch {
                  /* copy is extra */
                }
                if (invite.mailed) {
                  onSaved(`Sign-in link emailed to ${account.email}. It works for 7 days.`)
                } else {
                  onSaved(
                    invite.mailError ||
                      `Could not email ${account.email}. Sign-in link copied instead.`,
                  )
                }
              })
              .catch((err) =>
                onError(err instanceof Error ? err.message : 'Could not make that sign-in link.'),
              )
              .finally(() => setBusy(false))
          }}
          className="mt-2 ml-2 rounded-full border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold"
        >
          Email sign-in link
        </button>
      )}
    </li>
  )
}
