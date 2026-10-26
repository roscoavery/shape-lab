import { useState } from 'react'
import type { Athlete } from '../types'
import { createAccountInvite } from '../lib/accountAdmin'
import { CollapsibleSection } from './CollapsibleSection'

type Props = {
  athletes: Athlete[]
}

export function InviteManager({ athletes }: Props) {
  const [role, setRole] = useState<'coach' | 'parent' | 'athlete'>('coach')
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const toggleAthlete = (id: string) => {
    // Athlete invitations bind exactly one existing profile: picking
    // another athlete replaces the previous pick. Parent invitations keep
    // the multi-select. The server enforces the same rule.
    if (role === 'athlete') {
      setSelectedAthletes((prev) => (prev.includes(id) ? [] : [id]))
      return
    }
    setSelectedAthletes((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    )
  }

  const create = async () => {
    setError(null)
    setInviteUrl(null)
    setCopied(false)
    if (role === 'athlete' && selectedAthletes.length !== 1) {
      setError('Choose the existing athlete profile this login belongs to.')
      return
    }
    if (role === 'parent' && selectedAthletes.length === 0) {
      setError('Choose the athlete profiles this parent should be linked to.')
      return
    }
    setBusy(true)
    try {
      const invite = await createAccountInvite(role, selectedAthletes)
      setInviteUrl(invite.url)
      setSelectedAthletes([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create that invitation.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
    } catch {
      setError('Could not copy. Long-press the link to copy it manually.')
    }
  }

  return (
    <CollapsibleSection title="Invitations" hint="Invite coach, parent, or athlete" defaultOpen={false}>
      <section>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Send someone a link to create their own login. The link works once and
          expires in 7 days.
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
          {role === 'coach' && 'Creates a coach login. Athlete access is assigned separately.'}
          {role === 'parent' && 'Choose the athlete profiles this parent should be linked to.'}
          {role === 'athlete' && 'Choose the existing athlete profile this login belongs to.'}
        </p>

        <div className="mt-3 flex gap-2">
          {(['coach', 'parent', 'athlete'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r)
                setInviteUrl(null)
                setError(null)
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                role === r
                  ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                  : 'border border-[var(--panel-border)] text-[var(--muted)]'
              }`}
            >
              {r === 'coach' ? 'Coach' : r === 'parent' ? 'Parent' : 'Athlete'}
            </button>
          ))}
        </div>

        {(role === 'parent' || role === 'athlete') && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {role === 'athlete'
                ? 'Athlete profile'
                : `Link to athlete${selectedAthletes.length !== 1 ? 's' : ''}`}
            </p>
            <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--panel-border)] p-2">
              {athletes.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No athlete profiles yet.</p>
              ) : (
                athletes.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAthletes.includes(a.id)}
                      onChange={() => toggleAthlete(a.id)}
                      className="h-4 w-4 rounded accent-[var(--accent)]"
                    />
                    {a.name}
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}

        <button
          type="button"
          onClick={() => void create()}
          disabled={busy}
          className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50"
        >
          {busy ? 'Working…' : `Create ${role} invitation`}
        </button>

        {inviteUrl && (
          <div className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Invitation link (one-time use)
            </p>
            <p className="mt-1 break-all text-sm text-[var(--text)]">{inviteUrl}</p>
            <button
              type="button"
              onClick={() => void copy()}
              className="mt-2 rounded-lg border border-[var(--accent)]/40 px-3 py-1.5 text-sm font-semibold text-[var(--accent)]"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        )}
      </section>
    </CollapsibleSection>
  )
}
