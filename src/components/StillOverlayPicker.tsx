/**
 * Pick a still from the coach shape library or the IG shapes library
 * and use it as a ghost overlay on the live camera / Compare video.
 * Collapsed by default — open to choose, then the menu hides so the video stays clean.
 * In Compare fullscreen the library opens as a large filmstrip over the split,
 * not a cramped list in the side rail.
 */

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  listCoachOverlayStills,
  listIgOverlayStills,
  type OverlayStillOption,
} from '../lib/igStills'
import type { ReferencePhoto } from '../types'
import { HScrollRow } from './HScrollRow'
import { CroppedStill } from './CroppedStill'
import { useOverlayStill } from './OverlayStillContext'
import { ShareReference } from './share/ShareReference'

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
    visible,
    opacity,
    scale,
    menuOpen,
    setSelected,
    setVisible,
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
    setVisible(true)
    setMenuOpen(false)
  }

  const pickNone = () => {
    setSelected(null)
    setMenuOpen(false)
  }

  const dark = onVideo || rail
  const shell = dark
    ? 'rounded-xl border border-white/15 bg-black/55 p-2 shadow-lg backdrop-blur-md'
    : `rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] ${compact ? 'p-2' : 'p-3'}`
  const muted = dark ? 'text-white/70' : 'text-[var(--muted)]'
  const text = dark ? 'text-white' : 'text-[var(--text)]'

  const noneThumb = (size: 'row' | 'film') => {
    const on = selected == null
    return (
      <button
        type="button"
        role="option"
        aria-selected={on}
        onClick={pickNone}
        className={`${
          size === 'film'
            ? 'w-[7.5rem] shrink-0 snap-start sm:w-36'
            : 'w-[5.5rem] shrink-0 snap-start sm:w-24'
        } overflow-hidden rounded-lg border text-left ${
          on
            ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
            : dark || rail
              ? 'border-white/20 hover:border-white/50'
              : 'border-[var(--panel-border)] hover:border-[var(--accent-dim)]'
        }`}
        title="No shape overlay"
      >
        <span
          className={`flex items-center justify-center bg-black/70 text-[11px] font-semibold uppercase tracking-wider ${
            size === 'film' ? 'h-28 sm:h-32' : 'h-16 sm:h-[4.5rem]'
          } ${on ? 'text-[var(--accent)]' : text}`}
        >
          None
        </span>
        <span className={`block truncate px-1 py-0.5 text-[9px] leading-tight ${text}`}>
          No overlay
        </span>
      </button>
    )
  }

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
        <CroppedStill
          src={selected.src}
          stillId={selected.photoId}
          alt=""
          className="h-8 w-10 shrink-0 rounded object-contain bg-black"
        />
      ) : (
        <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded bg-black/40 text-[10px] uppercase tracking-wide">
          None
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">
        {selected
          ? visible
            ? selected.name
            : `${selected.name} · hidden`
          : 'None'}
      </span>
      <span className={`shrink-0 text-[10px] uppercase tracking-wider ${muted}`}>
        {menuOpen ? 'Hide' : 'Open'}
      </span>
    </button>
  )

  const tabBtn = (id: 'coach' | 'ig', label: string) => (
    <button
      type="button"
      onClick={() => setLibrary(id)}
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        library === id
          ? dark || rail
            ? 'bg-white text-black'
            : 'bg-[var(--accent-dim)] text-white'
          : muted
      }`}
    >
      {label}
    </button>
  )

  const thumb = (still: OverlayStillOption, size: 'row' | 'film') => {
    const on = selected?.id === still.id
    return (
      <button
        key={still.id}
        type="button"
        role="option"
        aria-selected={on}
        onClick={() => pick(still)}
        className={`${
          size === 'film'
            ? 'w-[7.5rem] shrink-0 snap-start sm:w-36'
            : 'w-[5.5rem] shrink-0 snap-start sm:w-24'
        } overflow-hidden rounded-lg border text-left ${
          on
            ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
            : dark || rail
              ? 'border-white/20 hover:border-white/50'
              : 'border-[var(--panel-border)] hover:border-[var(--accent-dim)]'
        }`}
        title={still.label ? `${still.name} — ${still.label}` : still.name}
      >
        <CroppedStill
          src={still.src}
          stillId={still.photoId}
          alt=""
          className={
            size === 'film'
              ? 'h-28 w-full bg-black object-contain sm:h-32'
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

  const controls = (
    <>
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
          min={0.05}
          max={1}
          step={0.01}
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
              onClick={() => setVisible(!visible)}
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                dark || rail ? 'bg-white/10 text-white' : 'border border-[var(--panel-border)]'
              }`}
            >
              {visible ? 'Hide overlay' : 'Show overlay'}
            </button>
          <button
            type="button"
            onClick={() => setOffset(88, 22)}
            className={`rounded-full px-2 py-0.5 text-[10px] ${dark || rail ? 'bg-white/10 text-white' : 'border border-[var(--panel-border)]'}`}
          >
            Top right
          </button>
          <button
            type="button"
            onClick={() => setOffset(12, 22)}
            className={`rounded-full px-2 py-0.5 text-[10px] ${dark || rail ? 'bg-white/10 text-white' : 'border border-[var(--panel-border)]'}`}
          >
            Top left
          </button>
          <button
            type="button"
            onClick={() => setOffset(50, 50)}
            className={`rounded-full px-2 py-0.5 text-[10px] ${dark || rail ? 'bg-white/10 text-white' : 'border border-[var(--panel-border)]'}`}
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
          {selected && (
            <ShareReference
              variant="compact"
              draft={{
                kind: selected.library === 'ig' ? 'ig-still' : 'still',
                title: selected.name,
                stillId: selected.photoId,
                shapeId: selected.shapeId,
                photoSrc: selected.src,
              }}
            />
          )}
        </div>
      )}
    </>
  )

  if (!menuOpen) {
    return <div>{chip}</div>
  }

  if (rail) {
    const sheet = (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[280] p-2 sm:p-3">
        <div className="pointer-events-auto mx-auto max-w-[90rem] rounded-2xl border border-white/20 bg-[#0b0f14]/92 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Shape overlay — tap a still, then drag it anywhere
            </p>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-white"
            >
              Close
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {tabBtn('coach', 'Library')}
            {tabBtn('ig', ig.length ? `IG (${ig.length})` : 'IG')}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a shape…"
              className="min-w-[10rem] flex-1 rounded-lg border border-white/20 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40"
            />
          </div>
          <HScrollRow label={library === 'ig' ? 'IG shapes' : 'Shape library'} className="mt-2">
            {noneThumb('film')}
            {filtered.map((s) => thumb(s, 'film'))}
          </HScrollRow>
          {filtered.length === 0 && (
            <p className="mt-1 text-[11px] text-white/70">
              {library === 'ig'
                ? 'No IG crops yet. On Compare, tap Screenshot and drag one corner to the other.'
                : 'No coach stills match that search.'}
            </p>
          )}
          {controls}
          <p className="mt-1.5 text-[10px] leading-snug text-white/55">
            The still floats over both videos. Drag it off to the side, or tap × on it to hide.
          </p>
        </div>
      </div>
    )
    return (
      <>
        {chip}
        {typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet}
      </>
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
      <div className="mt-1.5 flex gap-1">
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
      <HScrollRow label={library === 'ig' ? 'IG shapes' : 'Shape library'} className="mt-1.5">
        {noneThumb('row')}
        {filtered.map((s) => thumb(s, 'row'))}
      </HScrollRow>
      {filtered.length === 0 && (
        <p className={`mt-1 text-[11px] ${muted}`}>
          {library === 'ig'
            ? 'No IG crops yet. On Compare, tap Screenshot and drag one corner to the other.'
            : 'No coach stills match that search.'}
        </p>
      )}
      {controls}
      <p className={`mt-1.5 text-[10px] leading-snug ${muted}`}>
        Drag the still on the video to park it in a corner. Close this menu when you are set.
      </p>
    </div>
  )
}
