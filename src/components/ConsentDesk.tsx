import { useEffect, useState } from 'react'
import {
  listConsentAthletes,
  patchConsent,
  type ConsentRow,
  type ConsentState,
  type ProfileVisibility,
} from '../lib/consentDesk'
import { sessionIsAdmin, type AuthSessionUser } from '../lib/authSession'
import { listStillTags, type StillTagRow } from '../lib/stillTags'
import { getShape } from '../config/shapes'
import { InfoHint } from './ui/InfoHint'

const CONSENT_OPTIONS: { id: ConsentState; label: string }[] = [
  { id: 'unknown', label: 'Not asked' },
  { id: 'pending', label: 'Waiting' },
  { id: 'granted', label: 'Yes' },
  { id: 'declined', label: 'No' },
]

const VISIBILITY_OPTIONS: { id: ProfileVisibility; label: string }[] = [
  { id: 'private', label: 'Private — coaches and family only' },
  { id: 'gym', label: 'Gym — signed-in gym members' },
  { id: 'public', label: 'Public — anyone who can open the gym feed' },
]

type Props = {
  user: AuthSessionUser
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
      {children}
    </span>
  )
}

function Select<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
      className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
    >
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function Toggle({
  checked,
  label,
  hint,
  disabled,
  onChange,
}: {
  checked: boolean
  label: string
  hint: string
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-3">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-semibold text-[var(--text)]">{label}</span>
        <span className="block text-xs text-[var(--muted)]">{hint}</span>
      </span>
    </label>
  )
}

export function ConsentDesk({ user }: Props) {
  const admin = sessionIsAdmin(user)
  const [rows, setRows] = useState<ConsentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    const next = await listConsentAthletes()
    setRows(next)
  }

  useEffect(() => {
    setLoading(true)
    void reload()
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load consent.'))
      .finally(() => setLoading(false))
  }, [])

  const save = (athleteId: string, patch: Omit<Parameters<typeof patchConsent>[0], 'athleteId'>) => {
    setBusyId(athleteId)
    setError(null)
    void patchConsent({ athleteId, ...patch })
      .then((updated) => {
        setRows((cur) => cur.map((row) => (row.id === updated.id ? updated : row)))
        setSaved(`Saved for ${updated.name}.`)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not save consent.'))
      .finally(() => setBusyId(null))
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Consent
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h2 className="text-xl font-semibold text-[var(--text)]">Who can see social posts</h2>
          <InfoHint>
            These flags only control feed, wins, stories, and a public profile. Class, homework, and
            lessons keep working. Coaching media is not instructional/reference media. This page is
            not a legal-compliance tool.
          </InfoHint>
        </div>
        {admin ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Gym admin. Tagged teaching stills and instructional consent live under More → Stills.
          </p>
        ) : user.role === 'parent' ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Consent for linked athletes. Teaching stills they appear in are listed below.
          </p>
        ) : user.role === 'athlete' ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Your social flags. A parent can still change them.</p>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">Coaches do not set consent.</p>
        )}
      </section>

      {error && (
        <p className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-xl border border-[var(--accent)]/40 bg-[#102820] px-4 py-3 text-sm text-[var(--accent)]">
          {saved}
        </p>
      )}

      {loading ? (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
          Loading consent…
        </section>
      ) : rows.length === 0 ? (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
          No athletes you can set consent for on this login. If you are a
          parent, ask gym admin to link this account to your child on More →
          Accounts.
        </section>
      ) : (
        rows.map((row) => {
          const busy = busyId === row.id
          return (
            <section
              key={row.id}
              className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5"
            >
              <h3 className="text-lg font-semibold text-[var(--text)]">{row.name}</h3>
              {row.parentConsentAt && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Parent consent last marked {new Date(row.parentConsentAt).toLocaleString()}
                </p>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label>
                  <FieldLabel>Parent consent</FieldLabel>
                  <Select
                    value={row.parentConsentStatus ?? 'unknown'}
                    options={CONSENT_OPTIONS}
                    disabled={busy}
                    onChange={(parentConsentStatus) => save(row.id, { parentConsentStatus })}
                  />
                </label>
                <label>
                  <FieldLabel>Coaching media (private lesson / class video)</FieldLabel>
                  <Select
                    value={row.mediaConsent ?? 'unknown'}
                    options={CONSENT_OPTIONS}
                    disabled={busy}
                    onChange={(mediaConsent) => save(row.id, { mediaConsent })}
                  />
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Lets the coach save a tumbling video for coaching this athlete. This is not
                    permission to use it as a Shape Lab teaching reference.
                  </p>
                </label>
                <label>
                  <FieldLabel>Public profile page</FieldLabel>
                  <Select
                    value={row.publicProfileConsent ?? 'unknown'}
                    options={CONSENT_OPTIONS}
                    disabled={busy}
                    onChange={(publicProfileConsent) => save(row.id, { publicProfileConsent })}
                  />
                </label>
                <label>
                  <FieldLabel>Instructional / reference media</FieldLabel>
                  <Select
                    value={row.instructionalMediaConsent ?? 'unknown'}
                    options={CONSENT_OPTIONS}
                    disabled={busy}
                    onChange={(instructionalMediaConsent) =>
                      save(row.id, { instructionalMediaConsent })
                    }
                  />
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Separate from coaching media. Yes means an approved photo or video may be used
                    as Shape Lab teaching / reference material.
                  </p>
                </label>
                <label className="sm:col-span-2">
                  <FieldLabel>Research notes (not used to share yet)</FieldLabel>
                  <Select
                    value={row.researchConsent ?? 'unknown'}
                    options={CONSENT_OPTIONS}
                    disabled={busy}
                    onChange={(researchConsent) => save(row.id, { researchConsent })}
                  />
                </label>
                <label className="sm:col-span-2">
                  <FieldLabel>Who can open the profile</FieldLabel>
                  <Select
                    value={row.profileVisibility ?? (row.profilePublic ? 'public' : 'private')}
                    options={VISIBILITY_OPTIONS}
                    disabled={busy}
                    onChange={(profileVisibility) =>
                      save(row.id, {
                        profileVisibility,
                        profilePublic: profileVisibility !== 'private',
                      })
                    }
                  />
                </label>
              </div>
              <div className="mt-4 grid gap-3">
                <Toggle
                  checked={row.allowWinsOnFeed === true}
                  disabled={busy}
                  label="Show wins on the gym feed"
                  hint="Off by default. Assigned coaches and family still see wins they already have access to."
                  onChange={(allowWinsOnFeed) => save(row.id, { allowWinsOnFeed })}
                />
                <Toggle
                  checked={row.allowStories === true}
                  disabled={busy}
                  label="Show stories to the rest of the gym"
                  hint="Off by default. Stories stay visible to assigned coaches, the athlete, and linked parents."
                  onChange={(allowStories) => save(row.id, { allowStories })}
                />
                <Toggle
                  checked={row.showProfilePhoto !== false}
                  disabled={busy}
                  label="Show the profile photo on their page"
                  hint="Coaches who already work with this athlete can still see the photo for coaching."
                  onChange={(showProfilePhoto) => save(row.id, { showProfilePhoto })}
                />
                <Toggle
                  checked={row.showCoachNames !== false}
                  disabled={busy}
                  label="Show coach names on the profile"
                  hint="Turn off if the family does not want coach names on a public-looking page."
                  onChange={(showCoachNames) => save(row.id, { showCoachNames })}
                />
              </div>
            </section>
          )
        })
      )}
      {user.role === 'parent' && <ParentTaggedStills />}
    </div>
  )
}

function ParentTaggedStills() {
  const [rows, setRows] = useState<StillTagRow[]>([])
  useEffect(() => {
    void listStillTags().then(setRows)
  }, [])
  if (rows.length === 0) return null
  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Teaching stills</h3>
        <InfoHint>
          Private tags on Shape Library pictures. The still itself does not show their name.
        </InfoHint>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.stillId} className="flex items-center gap-3 text-sm">
            {row.dataUrl ? (
              <img src={row.dataUrl} alt="" className="h-12 w-16 rounded-md object-contain bg-black" />
            ) : (
              <span className="h-12 w-16 rounded-md bg-black/40" />
            )}
            <span>{getShape(row.shapeId)?.name ?? row.label ?? 'Shape'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
