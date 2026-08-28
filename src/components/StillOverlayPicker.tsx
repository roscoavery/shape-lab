/**
 * Pick a still from the coach shape library or the IG shapes library
 * and use it as a ghost overlay on the live camera.
 */

import { useMemo, useState } from 'react'
import {
  listCoachOverlayStills,
  listIgOverlayStills,
  type OverlayStillOption,
} from '../lib/igStills'
import type { ReferencePhoto } from '../types'
import { useOverlayStill } from './OverlayStillContext'

type Props = {
  photos: ReferencePhoto[]
  /** Compact strip for camera sidebars / homework cards. */
  compact?: boolean
}

export function StillOverlayPicker({ photos, compact = false }: Props) {
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

  return (
    <div
      className={`rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] ${
        compact ? 'p-2' : 'p-3'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Still overlay
        </p>
        <div className="flex gap-1 rounded-md border border-[var(--panel-border)] p-0.5">
          <button
            type="button"
            onClick={() => setLibrary('coach')}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
              library === 'coach'
                ? 'bg-[var(--accent-dim)] text-white'
                : 'text-[var(--muted)]'
            }`}
          >
            Shape library
          </button>
          <button
            type="button"
            onClick={() => setLibrary('ig')}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
              library === 'ig'
                ? 'bg-[var(--accent-dim)] text-white'
                : 'text-[var(--muted)]'
            }`}
          >
            IG shapes {ig.length ? `(${ig.length})` : ''}
          </button>
        </div>
      </div>
      <p className={`text-[11px] leading-snug text-[var(--muted)] ${compact ? 'mt-1' : 'mt-1.5'}`}>
        Pick any still. It sits on the live camera so you can match the shape.
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a shape…"
        className="mt-2 w-full rounded-md border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1 text-xs text-[var(--text)]"
      />
      <div
        className={`mt-2 grid gap-1.5 overflow-y-auto ${
          compact ? 'max-h-36 grid-cols-4' : 'max-h-48 grid-cols-3 sm:grid-cols-4'
        }`}
      >
        {filtered.map((still) => {
          const on = selected?.id === still.id
          return (
            <button
              key={still.id}
              type="button"
              onClick={() => pick(still)}
              className={`overflow-hidden rounded-md border text-left ${
                on
                  ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                  : 'border-[var(--panel-border)] hover:border-[var(--accent-dim)]'
              }`}
              title={still.label ? `${still.name} — ${still.label}` : still.name}
            >
              <img src={still.src} alt="" className="h-14 w-full object-cover sm:h-16" />
              <span className="block truncate px-1 py-0.5 text-[9px] leading-tight text-[var(--text)]">
                {still.name}
              </span>
            </button>
          )
        })}
      </div>
      {filtered.length === 0 && (
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          {library === 'ig'
            ? 'No IG crops yet. On Compare, tap Screenshot and drag one corner to the other.'
            : 'No coach stills match that search.'}
        </p>
      )}
      <label className="mt-2 flex items-center gap-2 text-[11px] text-[var(--muted)]">
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
          className="mt-1 text-[11px] text-[var(--accent)] hover:underline"
        >
          Clear overlay · {selected.name}
          {selected.library === 'ig' ? ' (IG)' : ''}
        </button>
      )}
    </div>
  )
}
