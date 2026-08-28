/**
 * Pick a still from the coach shape library or the IG shapes library
 * and use it as a ghost overlay on the live camera / Compare video.
 * Collapsed by default — open to choose, then the menu hides so the video stays clean.
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
  /** Vertical stack for the Compare fullscreen side rail. */
  rail?: boolean
}

export function StillOverlayPicker({
  photos,
  compact = false,
  onVideo = false,
  rail = false,
}: Props) {
  const {
    selected,
    opacity,
    scale,
    menuOpen,
    setSelected,
    setOpacity,
    setScale,
    setOffset,
    setMenuOpen,
  } = useOverlayStill()
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
    if (opacity < 0.08) setOpacity(0.45)
    setMenuOpen(false)
  }

  const dark = onVideo || rail
  const shell = dark
    ? 'rounded-xl border border-white/15 bg-black/55 p-2 shadow-lg backdrop-blur-md'
    : `rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] ${compact ? 'p-2' : 'p-3'}`
  const muted = dark ? 'text-white/70' : 'text-[var(--muted)]'
  const text = dark ? 'text-white' : 'text-[var(--text)]'

  const chip = (
    <button
      type="button"
      onClick={() => setMenuOpen(true)}
      className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium ${
        dark
          ? 'border border-white/20 bg-white/5 text-white hover:bg-white/10'
          : 'border border-[var(--panel-border)] bg-[var(--panel)] hover:border-[var(--accent-dim)]'
      }`}
    >
      {selected ? (
        <img
          src={selected.src}
          alt=""
          className="h-8 w-10 shrink-0 rounded object-contain bg-black"
        />
      ) : (
        <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded bg-black/40 text-[10px] uppercase tracking-wide">
          Still
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">
        {selected ? selected.name : 'Shape overlay'}
      </span>
      <span className={`shrink-0 text-[10px] uppercase tracking-wider ${muted}`}>
        {menuOpen ? 'Hide' : 'Open'}
      </span>
    </button>
  )

  if (!menuOpen) {
    return <div className={rail ? '' : ''}>{chip}</div>
  }

  const tabBtn = (id: 'coach' | 'ig', label: string) => (
    <button
      type="button"
      onClick={() => setLibrary(id)}
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        library === id
          ? dark
            ? 'bg-white text-black'
            : 'bg-[var(--accent-dim)] text-white'
          : muted
      }`}
    >
      {label}
    </button>
  )

  const thumb = (still: OverlayStillOption) => {
    const on = selected?.id === still.id
    return (
      <button
        key={still.id}
        type="button"
        role="option"
        aria-selected={on}
        onClick={() => pick(still)}
        className={`${
          rail ? 'flex w-full gap-2 p-1' : 'w-[5.5rem] shrink-0 snap-start sm:w-24'
        } overflow-hidden rounded-lg border text-left ${
          on
            ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
            : dark
              ? 'border-white/20 hover:border-white/50'
              : 'border-[var(--panel-border)] hover:border-[var(--accent-dim)]'
        }`}
        title={still.label ? `${still.name} — ${still.label}` : still.name}
      >
        <img
          src={still.src}
          alt=""
          className={
            rail
              ? 'h-12 w-16 shrink-0 bg-black object-contain'
              : 'h-16 w-full bg-black object-contain sm:h-[4.5rem]'
          }
        />
        <span className={`block truncate px-1 py-0.5 text-[9px] leading-tight ${text}`}>
          {still.label && still.label !== 'Coach still' && still.label !== 'Coach reference'
            ? `${still.name} · ${still.label}`
            : still.name}
        </span>
      </button>
    )
  }

  return (
    <div className={shell}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>
          Shape overlay
        </p>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            dark ? 'bg-white/15 text-white' : 'border border-[var(--panel-border)]'
          }`}
        >
          Close
        </button>
      </div>
      <div className={`mt-1.5 flex gap-1 ${dark ? '' : ''}`}>
        {tabBtn('coach', 'Library')}
        {tabBtn('ig', ig.length ? `IG (${ig.length})` : 'IG')}
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a shape…"
        className={`mt-1.5 w-full rounded-lg px-2 py-1 text-xs ${
          dark
            ? 'border border-white/20 bg-black/40 text-white placeholder:text-white/40'
            : 'border border-[var(--panel-border)] bg-[#0d1218] text-[var(--text)]'
        }`}
      />
      {rail ? (
        <div className="mt-1.5 flex max-h-52 flex-col gap-1 overflow-y-auto">
          {filtered.map(thumb)}
        </div>
      ) : (
        <HScrollRow label={library === 'ig' ? 'IG shapes' : 'Shape library'} className="mt-1.5">
          {filtered.map(thumb)}
        </HScrollRow>
      )}
      {filtered.length === 0 && (
        <p className={`mt-1 text-[11px] ${muted}`}>
          {library === 'ig'
            ? 'No IG crops yet. On Compare, tap Screenshot and drag one corner to the other.'
            : 'No coach stills match that search.'}
        </p>
      )}
      <label className={`mt-2 flex items-center gap-2 text-[11px] ${muted}`}>
        <span className="w-10 shrink-0">Fade</span>
        <input
          type="range"
          min={0}
          max={0.85}
          step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="min-w-0 flex-1 accent-[var(--accent)]"
          disabled={!selected}
        />
        <span className="w-8 tabular-nums">{Math.round(opacity * 100)}%</span>
      </label>
      <label className={`mt-1 flex items-center gap-2 text-[11px] ${muted}`}>
        <span className="w-10 shrink-0">Size</span>
        <input
          type="range"
          min={0.18}
          max={1}
          step={0.02}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="min-w-0 flex-1 accent-[var(--accent)]"
          disabled={!selected}
        />
        <span className="w-8 tabular-nums">{Math.round(scale * 100)}%</span>
      </label>
      {selected && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setOffset(82, 16)}
            className={`rounded-full px-2 py-0.5 text-[10px] ${dark ? 'bg-white/10 text-white' : 'border border-[var(--panel-border)]'}`}
          >
            Top right
          </button>
          <button
            type="button"
            onClick={() => setOffset(18, 16)}
            className={`rounded-full px-2 py-0.5 text-[10px] ${dark ? 'bg-white/10 text-white' : 'border border-[var(--panel-border)]'}`}
          >
            Top left
          </button>
          <button
            type="button"
            onClick={() => setOffset(50, 50)}
            className={`rounded-full px-2 py-0.5 text-[10px] ${dark ? 'bg-white/10 text-white' : 'border border-[var(--panel-border)]'}`}
          >
            Center
          </button>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="rounded-full px-2 py-0.5 text-[10px] text-[var(--accent)]"
          >
            Clear
          </button>
        </div>
      )}
      <p className={`mt-1.5 text-[10px] leading-snug ${muted}`}>
        Drag the still on the video to park it in a corner. Close this menu when you are set.
      </p>
    </div>
  )
}
