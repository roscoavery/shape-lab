/**
 * Coach-only panel for the public study library link (build 1076).
 * Read-only shape library for athletes to study — no account needed.
 * (Athlete intake links are per-athlete; see AthleteIntakeLink.)
 */

import { useState } from 'react'
import { markedFetch } from '../../lib/authSession'

export function ShareLinksPanel() {
  const [libUrl, setLibUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const makeLink = async () => {
    setBusy(true)
    try {
      const r = await markedFetch('/api/share-links/library-token', { method: 'POST' })
      const d = await r.json()
      if (!r.ok || !d?.path) throw new Error('Could not make the link.')
      setLibUrl(`${window.location.origin}${d.path}`)
    } catch {
      // silent — coach can retry
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!libUrl) return
    try {
      await navigator.clipboard.writeText(libUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be blocked; coach can copy manually
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-sm font-bold text-white">Shape study link</p>
      <p className="mt-0.5 text-xs text-white/55">
        Read-only shape library for athletes to study. No account needed.
      </p>
      {libUrl ? (
        <div className="mt-2 flex gap-2">
          <input
            readOnly
            value={libUrl}
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
        <button
          type="button"
          onClick={() => void makeLink()}
          disabled={busy}
          className="mt-2 h-9 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? 'Making…' : 'Get link'}
        </button>
      )}
    </div>
  )
}
