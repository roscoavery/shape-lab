/**
 * Pick a still from the coach shape library or the IG shapes library
 * and use it as a ghost overlay on the live camera / Compare video.
 */

import { useMemo, useState } from 'react'
import {
  listCoachOverlayStills,
  listIgOverlayStills,
  type OverlayStillOption,
} from '../lib/igStills'
import type { ReferencePhoto } from '../types'
import { HScrollRow } from './HScrollRow'
import { useOverlayStill } from './OverlayStillContext'

type Props = {
  photos: ReferencePhoto[]
  /** Compact strip for camera sidebars / homework cards. */
  compact?: boolean
  /** Dark filmstrip on top of a video (fullscreen / Compare). */
  onVideo?: boolean
}

export function StillOverlayPicker({ photos, compact = false, onVideo = false }: Props) {
  const { selected, opacity, setSelected, setOpacity } = useOverlayStill()
  const [library, setLibrary] = useState<'coach' | 'ig'>('coach')
  const [query, setQuery] = useState('')

  const coach = useMemo(() => listCoachOverlayStills(photos), [photos])
  const ig = useMemo(() => listIgOverlayStills(photos), [photos])
  const items = library === 'ig' ? ig : coach

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((s) => {
      const hay = `${s.name} ${s.label ?? ''} ${s.shapeId}`.toLowerCase()
      return hay.includes(q)
    })
  }, [items, query])

  const pick = (still: OverlayStillOption) => {
    if (selected?.id === still.id) {
      setSelected(null)
      return
    }
    setSelected(still)
    if (opacity < 0.08) setOpacity(0.35)
  }

  const tabBtn = (id: 'coach' | 'ig', text: string) => (
    <button
      type="button"
      onClick={() => setLibrary(id)}
      className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
        library === id
          ? onVideo
            ? 'bg-[var(--accent)] text-[#06281f]'
            : 'bg-[var(--accent-dim)] text-white'
          : onVideo
            ? 'text-white/80'
            : 'text-[var(--muted)]'
      }`}
    >
      {text}
    </button>
  )

  return (
    <div
      className={
        onVideo
          ? 'rounded-lg border border-white/20 bg-black/70 p-1.5 shadow-lg backdrop-blur-sm'
          : `rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] ${compact ? 'p-2' : 'p-3'}`
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            onVideo ? 'text-white/80' : 'text-[var(--muted)]'
          }`}
        >
          Still overlay
        </p>
        <div
          className={`flex gap-1 rounded-md p-0.5 ${
            onVideo ? 'border border-white/20' : 'border border-[var(--panel-border)]'
          }`}
        >
          {tabBtn('coach', 'Shape library')}
          {tabBtn('ig', `IG shapes${ig.length ? ` (${ig.length})` : ''}`)}
        </div>
      </div>
      {!onVideo && (
        <p className={`text-[11px] leading-snug text-[var(--muted)] ${compact ? 'mt-1' : 'mt-1.5'}`}>
          Scroll left or right, then tap a still. It sits on the camera so you can match the shape.
        </p>
      )}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a shape…"
        className={`mt-1.5 w-full rounded-md px-2 py-1 text-xs ${
          onVideo
            ? 'border border-white/20 bg-black/50 text-white placeholder:text-white/50'
            : 'border border-[var(--panel-border)] bg-[#0d1218] text-[var(--text)]'
        }`}
      />
      <HScrollRow label={library === 'ig' ? 'IG shapes' : 'Shape library'} className="mt-1.5">
        {filtered.map((still) => {
          const on = selected?.id === still.id
          return (
            <button
              key={still.id}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => pick(still)}
              className={`w-[5.5rem] shrink-0 snap-start overflow-hidden rounded-md border text-left sm:w-24 ${
                on
                  ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                  : onVideo
                    ? 'border-white/25 hover:border-white/60'
                    : 'border-[var(--panel-border)] hover:border-[var(--accent-dim)]'
              }`}
              title={still.label ? `${still.name} — ${still.label}` : still.name}
            >
              <img src={still.src} alt="" className="h-16 w-full object-cover sm:h-[4.5rem]" />
              <span
                className={`block truncate px-1 py-0.5 text-[9px] leading-tight ${
                  onVideo ? 'bg-black/50 text-white' : 'text-[var(--text)]'
                }`}
              >
                {still.label && still.label !== 'Coach still' && still.label !== 'Coach reference'
                  ? `${still.name} · ${still.label}`
                  : still.name}
              </span>
            </button>
          )
        })}
      </HScrollRow>
      {filtered.length === 0 && (
        <p className={`mt-1 text-[11px] ${onVideo ? 'text-white/70' : 'text-[var(--muted)]'}`}>
          {library === 'ig'
            ? 'No IG crops yet. On Compare, tap Screenshot and drag one corner to the other.'
            : 'No coach stills match that search.'}
        </p>
      )}
      <label
        className={`mt-1.5 flex items-center gap-2 text-[11px] ${
          onVideo ? 'text-white/80' : 'text-[var(--muted)]'
        }`}
      >
        <span className="shrink-0">Opacity</span>
        <input
          type="range"
          min={0}
          max={0.8}
          step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="min-w-0 flex-1 accent-[var(--accent)]"
          disabled={!selected}
        />
        <span className="w-8 tabular-nums">{Math.round(opacity * 100)}%</span>
      </label>
      {selected && (
        <button
          type="button"
          onClick={() => setSelected(null)}
          className={`mt-0.5 text-[11px] hover:underline ${
            onVideo ? 'text-[var(--accent)]' : 'text-[var(--accent)]'
          }`}
        >
          Clear overlay · {selected.name}
          {selected.library === 'ig' ? ' (IG)' : ''}
        </button>
      )}
    </div>
  )
}
