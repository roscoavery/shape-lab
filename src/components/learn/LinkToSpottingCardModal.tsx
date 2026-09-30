/**
 * Link a reference-library clip to spotting cards.
 * Opened from the share sheet ("+ Spotting card"). Pick one or more spotted
 * skills and/or spotting methods; the clip then shows up as a demo video on
 * those cards in the Spotting section.
 */

import { useState } from 'react'
import {
  SPOTTING_METHODS,
  SPOTTING_SKILLS,
} from '../../config/spotting'
import {
  linkClipToSpottingCards,
  type SpottingLinkTarget,
} from '../../lib/spottingLinks'

export function LinkToSpottingCardModal({
  clip,
  onClose,
}: {
  clip: { id: string; url: string; name: string }
  onClose: () => void
}) {
  const [selected, setSelected] = useState<SpottingLinkTarget[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const toggle = (t: SpottingLinkTarget) => {
    setSelected((prev) => {
      const has = prev.some((p) => p.kind === t.kind && p.id === t.id)
      if (has) return prev.filter((p) => !(p.kind === t.kind && p.id === t.id))
      return [...prev, t]
    })
  }

  const handleLink = async () => {
    if (selected.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const ok = await linkClipToSpottingCards(clip.id, clip.url, selected)
      if (!ok) {
        setError('Could not find that clip in the library.')
        return
      }
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not link the video.')
    } finally {
      setSaving(false)
    }
  }

  const chip = (t: SpottingLinkTarget, label: string, sub?: string) => {
    const on = selected.some((p) => p.kind === t.kind && p.id === t.id)
    return (
      <button
        key={`${t.kind}:${t.id}`}
        type="button"
        onClick={() => toggle(t)}
        aria-pressed={on}
        className={
          on
            ? 'rounded-xl border border-[var(--accent)] bg-[var(--accent-dim)] px-3 py-2 text-left text-sm font-semibold text-white'
            : 'rounded-xl border border-[var(--panel-border)] px-3 py-2 text-left text-sm text-[var(--text)]'
        }
      >
        <span className="block font-bold leading-snug">{label}</span>
        {sub ? <span className="block text-xs text-[var(--muted)]">{sub}</span> : null}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[390] flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-neutral-900 p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">Link to spotting cards</h2>
            <p className="mt-0.5 truncate text-sm text-[var(--muted)]">{clip.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-sm text-[var(--muted)]"
          >
            Close
          </button>
        </div>

        {done ? (
          <p className="mt-4 rounded-xl border border-[var(--panel-border)] bg-[#152018] px-3 py-3 text-sm">
            Linked. It will show up as a demo video on{' '}
            {selected.length === 1 ? 'that card' : `those ${selected.length} cards`} in the
            Spotting section.
          </p>
        ) : (
          <>
            <div className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Spotted skills
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SPOTTING_SKILLS.map((s) =>
                chip({ kind: 'skill', id: s.id }, s.name, s.sub),
              )}
            </div>

            <div className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Spotting methods
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SPOTTING_METHODS.map((m) => chip({ kind: 'method', id: m.id }, m.name))}
            </div>

            {error ? (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            ) : null}

            <button
              type="button"
              disabled={selected.length === 0 || saving}
              onClick={handleLink}
              className="mt-4 w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {saving
                ? 'Linking…'
                : selected.length === 0
                  ? 'Pick at least one card'
                  : `Link to ${selected.length} card${selected.length === 1 ? '' : 's'}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
