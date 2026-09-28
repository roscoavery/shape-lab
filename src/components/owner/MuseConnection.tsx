/**
 * Muse connection (owner side) — generate and manage scoped API keys that let
 * someone's own Muse talk to this gym remotely: file library videos, read
 * athlete progress, and read Ryan's coaching philosophy.
 *
 * Keys are shown once at creation and stored as hashes only. The owner can
 * revoke any key at any time.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { profileRole } from '../../lib/profileRole'
import { markedFetch } from '../../lib/authSession'

type MuseKeyView = {
  id: string
  label: string
  scopes: string[]
  athleteId: string | null
  createdAt: string
  lastUsedAt: string | null
  revoked: boolean
}

type Props = { athletes: Athlete[] }

const SCOPE_LABELS: Record<string, string> = {
  'library:read': 'Read the video library',
  'library:add': 'Add videos to the library',
  'progress:read': 'Read athlete progress',
  'philosophy:read': 'Read coaching philosophy',
}

const OWNER_SCOPES = ['library:read', 'library:add', 'progress:read', 'philosophy:read']
const PARENT_SCOPES = ['progress:read', 'philosophy:read']

function scopeText(scopes: string[]): string {
  return scopes.map((s) => SCOPE_LABELS[s] ?? s).join(', ')
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? 'Never' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function MuseConnection({ athletes }: Props) {
  const [keys, setKeys] = useState<MuseKeyView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [preset, setPreset] = useState<'owner' | 'parent'>('owner')
  const [athleteId, setAthleteId] = useState('')
  const [creating, setCreating] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const athleteOptions = useMemo(
    () => athletes.filter((a) => profileRole(a) === 'athlete').sort((a, b) => a.name.localeCompare(b.name)),
    [athletes],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await markedFetch('/api/muse/keys')
      if (!res.ok) throw new Error('Could not load keys.')
      const data = (await res.json()) as { keys?: MuseKeyView[] }
      setKeys(Array.isArray(data.keys) ? data.keys : [])
    } catch {
      setError('Could not load keys. Try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const athleteName = (id: string | null): string => {
    if (!id) return ''
    return athletes.find((a) => a.id === id)?.name ?? 'Unknown athlete'
  }

  const create = async () => {
    if (creating) return
    const scopes = preset === 'owner' ? OWNER_SCOPES : PARENT_SCOPES
    if (preset === 'parent' && !athleteId) {
      setError('Pick the athlete this parent key may read.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await markedFetch('/api/muse/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim() || (preset === 'owner' ? 'Owner key' : 'Parent key'),
          scopes,
          athleteId: preset === 'parent' ? athleteId : null,
        }),
      })
      const data = (await res.json()) as { key?: MuseKeyView; secret?: string; error?: string }
      if (!res.ok || !data.secret) throw new Error(data.error || 'Could not create the key.')
      setNewSecret(data.secret)
      setCopied(false)
      setLabel('')
      setAthleteId('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the key.')
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (id: string) => {
    if (revokingId) return
    setRevokingId(id)
    setError(null)
    try {
      const res = await markedFetch('/api/muse/keys/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Could not revoke the key.')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke the key.')
    } finally {
      setRevokingId(null)
    }
  }

  const copySecret = async () => {
    if (!newSecret) return
    try {
      await navigator.clipboard.writeText(newSecret)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
        <h2 className="text-sm font-bold text-[var(--text)]">Muse connection</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Give your own Muse a key and it can help with the gym from anywhere: file a video you
          send it straight into the library, look up an athlete's progress, or answer from your
          coaching philosophy. A key only allows what you pick below, and you can revoke it any
          time. The secret is shown once. Keep it somewhere safe.
        </p>
      </div>

      {newSecret && (
        <div className="rounded-2xl border border-[var(--accent)] bg-[#0d1614] p-4">
          <h3 className="text-sm font-bold text-[var(--text)]">Your new key</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Copy it now. It will not be shown again. Paste it to your Muse once and it can connect.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-white/5 px-3 py-2 text-xs text-[var(--text)]">
              {newSecret}
            </code>
            <button
              type="button"
              onClick={copySecret}
              className="shrink-0 rounded-full bg-[var(--accent-dim)] px-4 py-2 text-xs font-semibold text-white"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNewSecret(null)}
            className="mt-2 text-xs text-[var(--muted)] underline"
          >
            I saved it, hide this
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
        <h3 className="text-sm font-bold text-[var(--text)]">New key</h3>
        <div className="mt-2 space-y-2.5">
          <label className="block">
            <span className="text-xs text-[var(--muted)]">Label</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Ryan's phone Muse"
              maxLength={80}
              className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-white/5 px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>
          <div>
            <span className="text-xs text-[var(--muted)]">What this key may do</span>
            <div className="mt-1 flex gap-1.5">
              <button
                type="button"
                onClick={() => setPreset('owner')}
                aria-pressed={preset === 'owner'}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  preset === 'owner'
                    ? 'bg-[var(--accent-dim)] font-semibold text-white'
                    : 'bg-white/5 text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => setPreset('parent')}
                aria-pressed={preset === 'parent'}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  preset === 'parent'
                    ? 'bg-[var(--accent-dim)] font-semibold text-white'
                    : 'bg-white/5 text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Parent
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              {preset === 'owner'
                ? 'Owner: file library videos, read the library, read any athlete\u2019s progress, read coaching philosophy.'
                : 'Parent: read one athlete\u2019s progress and the coaching philosophy. Nothing else.'}
            </p>
          </div>
          {preset === 'parent' && (
            <label className="block">
              <span className="text-xs text-[var(--muted)]">Athlete</span>
              <select
                value={athleteId}
                onChange={(e) => setAthleteId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-white/5 px-3 py-2 text-sm text-[var(--text)]"
              >
                <option value="">Pick an athlete</option>
                {athleteOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="rounded-full bg-[var(--accent-dim)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Generate key'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
        <h3 className="text-sm font-bold text-[var(--text)]">Keys</h3>
        {loading ? (
          <p className="mt-1 text-xs text-[var(--muted)]">Loading...</p>
        ) : keys.length === 0 ? (
          <p className="mt-1 text-xs text-[var(--muted)]">No keys yet. Generate one above.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="rounded-xl border border-[var(--panel-border)] bg-white/[0.02] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">
                      {k.label}
                      {k.revoked && (
                        <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-normal text-[var(--muted)]">
                          revoked
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{scopeText(k.scopes)}</p>
                    {k.athleteId && (
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        Athlete: {athleteName(k.athleteId)}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      Created {formatDate(k.createdAt)} · Last used {formatDate(k.lastUsedAt)}
                    </p>
                  </div>
                  {!k.revoked && (
                    <button
                      type="button"
                      onClick={() => revoke(k.id)}
                      disabled={revokingId === k.id}
                      className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-white/10 disabled:opacity-50"
                    >
                      {revokingId === k.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
        </p>
      )}
    </div>
  )
}
