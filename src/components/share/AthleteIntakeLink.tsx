/**
 * Coach-only: intake link tied to one athlete (build 1076).
 * The link only ever touches that athlete's profile — no roster search.
 */

import { useState } from 'react'
import { markedFetch } from '../../lib/authSession'

export function AthleteIntakeLink({
  athleteId,
  athleteName,
}: {
  athleteId: string
  athleteName: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const makeLink = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await markedFetch('/api/share-links/intake-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d?.path) throw new Error(d?.error ?? `Server said ${r.status}`)
      setUrl(`${window.location.origin}${d.path}`)
    } catch (e: any) {
      setError(e?.message ?? 'Could not make the link.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be blocked; coach can copy manually
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-sm font-bold text-white">Intake link for {athleteName}</p>
      <p className="mt-0.5 text-xs text-white/55">
        Text them this link — they answer the intake questions with no account.
        It only fills out {athleteName.split(' ')[0]}'s profile.
      </p>
      {url ? (
        <div className="mt-2 flex gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="h-9 min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-2 text-xs text-white/80"
          />
          <button
            type="button"
            onClick={() => void copy()}
            className="h-9 shrink-0 rounded-lg bg-sky-400 px-3 text-xs font-bold text-black"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void makeLink()}
            disabled={busy}
            className="mt-2 h-9 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Making…' : 'Get intake link'}
          </button>
          {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
        </>
      )}
    </div>
  )
}
