/**
 * Coach-only panel for public share links (build 1076+).
 *
 * - Shape study link: read-only shape library, no account needed.
 * - New athlete link: anyone can create a profile from scratch and answer
 *   all the intake questions. No quick-add needed first.
 * - Group sign-up link: pick a training event; anyone who signs up through
 *   it gets a profile AND lands in that group automatically.
 */

import { useMemo, useState } from 'react'
import { markedFetch } from '../../lib/authSession'
import { listTrainingEvents } from '../../lib/trainingEvents'

function LinkRow({
  label,
  blurb,
  endpoint,
  body,
}: {
  label: string
  blurb: string
  endpoint: string
  body?: Record<string, string>
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const makeLink = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await markedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const d = await r.json()
      if (!r.ok || !d?.path) throw new Error(d?.error ?? 'Could not make the link.')
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
      <p className="text-sm font-bold text-white">{label}</p>
      <p className="mt-0.5 text-xs text-white/55">{blurb}</p>
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
            {busy ? 'Making…' : 'Get link'}
          </button>
          {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
        </>
      )}
    </div>
  )
}

export function ShareLinksPanel() {
  const [groupId, setGroupId] = useState('')
  const [groupUrl, setGroupUrl] = useState<string | null>(null)
  const [groupBusy, setGroupBusy] = useState(false)
  const [groupCopied, setGroupCopied] = useState(false)
  const [groupError, setGroupError] = useState('')

  const groups = useMemo(() => listTrainingEvents(), [])

  const makeGroupLink = async () => {
    if (!groupId) return
    setGroupBusy(true)
    setGroupError('')
    try {
      const r = await markedFetch('/api/share-links/intake-group-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })
      const d = await r.json()
      if (!r.ok || !d?.path) throw new Error(d?.error ?? 'Could not make the link.')
      setGroupUrl(`${window.location.origin}${d.path}`)
    } catch (e: any) {
      setGroupError(e?.message ?? 'Could not make the link.')
    } finally {
      setGroupBusy(false)
    }
  }

  const copyGroup = async () => {
    if (!groupUrl) return
    try {
      await navigator.clipboard.writeText(groupUrl)
      setGroupCopied(true)
      setTimeout(() => setGroupCopied(false), 2000)
    } catch {
      // clipboard may be blocked; coach can copy manually
    }
  }

  return (
    <div className="space-y-3">
      <LinkRow
        label="New athlete link"
        blurb="Anyone can make a profile from scratch and answer all the intake questions. No account, no quick-add first."
        endpoint="/api/share-links/intake-open-token"
      />

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-sm font-bold text-white">Group sign-up link</p>
        <p className="mt-0.5 text-xs text-white/55">
          Pick a group. Anyone who signs up through this link gets a profile and
          lands in that group automatically. Handy for clinics and camps.
        </p>
        {groupUrl ? (
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={groupUrl}
              onFocus={(e) => e.target.select()}
              className="h-9 min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-2 text-xs text-white/80"
            />
            <button
              type="button"
              onClick={() => void copyGroup()}
              className="h-9 shrink-0 rounded-lg bg-sky-400 px-3 text-xs font-bold text-black"
            >
              {groupCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : (
          <>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="mt-2 h-9 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm text-white"
            >
              <option value="">Pick a group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void makeGroupLink()}
              disabled={!groupId || groupBusy}
              className="mt-2 h-9 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {groupBusy ? 'Making…' : 'Get link'}
            </button>
            {groupError && <p className="mt-1 text-xs text-red-300">{groupError}</p>}
          </>
        )}
      </div>

      <LinkRow
        label="Shape study link"
        blurb="Read-only shape library for athletes to study. No account needed."
        endpoint="/api/share-links/library-token"
      />
    </div>
  )
}
