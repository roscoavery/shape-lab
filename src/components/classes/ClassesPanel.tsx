/**
 * Classes — named drill collages of up to 6 gym-library clips.
 * Captions and A/B loops save with the collage. Full screen splits evenly.
 */

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { GymClipPlayer } from '../GymClipPlayer'
import {
  evenGrid,
  listCollages,
  MAX_COLLAGE_SLOTS,
  newCollage,
  removeCollage,
  saveCollage,
  type Collage,
  type CollageSlot,
} from '../../lib/collages'
import { useGymLibrary, type GymClip } from '../../lib/gymLibrary'
import { isSameReferenceUrl } from '../../lib/clipStore'
import { isCoachProfile } from '../../lib/profileRole'
import type { Athlete } from '../../types'

type Props = {
  athlete: Athlete | null
}

type Draft = {
  id: string
  name: string
  createdById: string
  createdAt: string
  slots: CollageSlot[]
}

export function ClassesPanel({ athlete }: Props) {
  const { clips, collections, loading, nameForUrl } = useGymLibrary()
  const [collages, setCollages] = useState<Collage[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [playing, setPlaying] = useState<Collage | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [filter, setFilter] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const canEdit = Boolean(athlete)
  const admin = isCoachProfile(athlete)

  useEffect(() => {
    void listCollages().then(setCollages)
  }, [])

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return collections
      .map((col) => ({
        id: col.id,
        name: col.name,
        items: col.items.filter((i) => {
          if (!i.url) return false
          if (!q) return true
          return `${i.name} ${col.name} ${(i.keywords ?? []).join(' ')}`.toLowerCase().includes(q)
        }),
      }))
      .filter((c) => c.items.length > 0)
  }, [collections, filter])

  const startNew = () => {
    if (!athlete) {
      setNotice('Unlock a profile to save a named collage.')
      return
    }
    const c = newCollage(athlete.id)
    setDraft({
      id: c.id,
      name: c.name,
      createdById: c.createdById,
      createdAt: c.createdAt,
      slots: [],
    })
    setPlaying(null)
  }

  const editExisting = (c: Collage) => {
    setDraft({
      id: c.id,
      name: c.name,
      createdById: c.createdById,
      createdAt: c.createdAt,
      slots: c.slots.map((s) => ({ ...s })),
    })
    setPlaying(null)
  }

  const toggleClip = (clip: GymClip) => {
    if (!draft) return
    setDraft((prev) => {
      if (!prev) return prev
      const existing = prev.slots.find((s) => isSameReferenceUrl(s.url, clip.url))
      if (existing) {
        return { ...prev, slots: prev.slots.filter((s) => s.url !== existing.url) }
      }
      if (prev.slots.length >= MAX_COLLAGE_SLOTS) {
        setNotice(`A collage can hold ${MAX_COLLAGE_SLOTS} videos.`)
        return prev
      }
      return {
        ...prev,
        slots: [
          ...prev.slots,
          {
            clipId: clip.id,
            url: clip.url,
            caption: '',
            loopA: null,
            loopB: null,
          },
        ],
      }
    })
  }

  const selected = (url: string) => Boolean(draft?.slots.some((s) => isSameReferenceUrl(s.url, url)))

  const persist = async () => {
    if (!draft || !athlete) return
    const name = draft.name.trim()
    if (!name) {
      setNotice('Name this collage so the class can find it later.')
      return
    }
    if (draft.slots.length === 0) {
      setNotice('Pick at least one gym URL.')
      return
    }
    setSaving(true)
    const saved = await saveCollage({
      id: draft.id,
      name,
      createdAt: draft.createdAt,
      updatedAt: new Date().toISOString(),
      createdById: draft.createdById || athlete.id,
      slots: draft.slots,
    })
    setSaving(false)
    if (!saved) {
      setNotice('Could not save that collage into the app.')
      return
    }
    setCollages((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)])
    setDraft(null)
    setPlaying(saved)
    setNotice(`Saved “${saved.name}”. Every link can open this collage.`)
  }

  const drop = async (c: Collage) => {
    if (!athlete) return
    if (!admin && c.createdById !== athlete.id) return
    if (!confirm(`Delete collage “${c.name}”?`)) return
    if (await removeCollage(c.id)) {
      setCollages((prev) => prev.filter((x) => x.id !== c.id))
      if (playing?.id === c.id) setPlaying(null)
      if (draft?.id === c.id) setDraft(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Class drills
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Collages</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Build a board of up to six clips from the gym Compare library. Add a caption
          (reps, a cue). Set A/B on each video — those loop points save with the
          collage and on the gym URL. Full screen splits the window as evenly as it
          can for how many drills you picked. Names stay in sync: rename a clip in
          Compare and it shows that name here.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f]"
          >
            New collage
          </button>
        </div>
        {notice && (
          <p className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
            {notice}
          </p>
        )}
      </section>

      {collages.length > 0 && (
        <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Saved collages
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {collages.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-2 rounded-xl border border-[var(--panel-border)] bg-[#0d1218] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--text)]">{c.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {c.slots.length} video{c.slots.length === 1 ? '' : 's'} ·{' '}
                      {c.slots.map((s) => nameForUrl(s.url)).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPlaying(c)
                      setDraft(null)
                      setFullscreen(false)
                    }}
                    className="rounded-md bg-[var(--accent-dim)] px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Play
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => editExisting(c)}
                      className="rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-xs"
                    >
                      Edit
                    </button>
                  )}
                  {(admin || c.createdById === athlete?.id) && (
                    <button
                      type="button"
                      onClick={() => void drop(c)}
                      className="rounded-md px-2.5 py-1 text-xs text-[var(--bad)]"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {draft && (
        <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {draft.slots.length}/{MAX_COLLAGE_SLOTS} selected
          </h3>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Collage name — e.g. Monday whip drills"
            className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search the gym library"
            className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          />
          {loading && <p className="mt-2 text-xs text-[var(--muted)]">Loading gym URLs…</p>}
          <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">
            {grouped.map((col) => (
              <div key={col.id}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {col.name}
                </p>
                <ul className="space-y-1">
                  {col.items.map((item) => {
                    if (!item.url) return null
                    const on = selected(item.url)
                    const clip = clips.find((c) => isSameReferenceUrl(c.url, item.url!))
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() =>
                            toggleClip(
                              clip ?? {
                                id: item.id,
                                name: item.name,
                                url: item.url!,
                                kind: item.kind,
                                collectionId: col.id,
                                collectionName: col.name,
                                keywords: item.keywords,
                              },
                            )
                          }
                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm ${
                            on
                              ? 'bg-[var(--accent-dim)] font-semibold text-white'
                              : 'bg-[#0d1218] text-[var(--text)]'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                          <span className="shrink-0 text-[11px] opacity-80">{on ? 'Added' : 'Add'}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
          {draft.slots.map((slot, i) => (
            <label key={`${slot.url}-${i}`} className="mt-3 block">
              <span className="text-[11px] font-semibold text-[var(--muted)]">
                Caption on {nameForUrl(slot.url)}
              </span>
              <input
                value={slot.caption}
                onChange={(e) => {
                  const caption = e.target.value
                  setDraft({
                    ...draft,
                    slots: draft.slots.map((s, idx) => (idx === i ? { ...s, caption } : s)),
                  })
                }}
                placeholder="e.g. 8 reps · snap the whip"
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
              />
            </label>
          ))}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void persist()}
              disabled={saving}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save collage'}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {playing && (
        <CollageStage
          collage={playing}
          nameForUrl={nameForUrl}
          fullscreen={fullscreen}
          onFullscreen={setFullscreen}
          onClose={() => {
            setPlaying(null)
            setFullscreen(false)
          }}
          onSlots={(slots) => {
            const next = { ...playing, slots }
            setPlaying(next)
            void saveCollage(next).then((saved) => {
              if (saved) setCollages((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
            })
          }}
          canEdit={canEdit}
        />
      )}
    </div>
  )
}

function CollageStage({
  collage,
  nameForUrl,
  fullscreen,
  onFullscreen,
  onClose,
  onSlots,
  canEdit,
}: {
  collage: Collage
  nameForUrl: (url: string) => string
  fullscreen: boolean
  onFullscreen: (v: boolean) => void
  onClose: () => void
  onSlots: (slots: CollageSlot[]) => void
  canEdit: boolean
}) {
  const landscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  const { cols, rows } = evenGrid(collage.slots.length, landscape || fullscreen)
  const body = (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[260] flex flex-col bg-black'
          : 'overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-black'
      }
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 text-white">
        <h3 className="mr-auto text-sm font-semibold">{collage.name}</h3>
        <button
          type="button"
          onClick={() => onFullscreen(!fullscreen)}
          className="rounded-md border border-white/30 px-2 py-1 text-xs"
        >
          {fullscreen ? 'Exit full screen' : 'Full screen'}
        </button>
        <button type="button" onClick={onClose} className="rounded-md border border-white/30 px-2 py-1 text-xs">
          Close
        </button>
      </div>
      <div
        className={`grid min-h-0 flex-1 gap-px bg-white/10 ${fullscreen ? 'h-full' : 'min-h-[420px]'}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {collage.slots.map((slot, i) => {
          const spanLast = collage.slots.length === 5 && i === 4 && cols === 2
          return (
            <div
              key={`${slot.url}-${i}`}
              className="relative flex min-h-0 min-w-0 flex-col bg-black"
              style={spanLast && cols === 2 ? { gridColumn: '1 / -1' } : undefined}
            >
              <div className="min-h-0 flex-1">
                <GymClipPlayer
                  url={slot.url}
                  itemId={slot.clipId}
                  fill
                  persistUrl={slot.url}
                  loopA={slot.loopA}
                  loopB={slot.loopB}
                  compact
                  quiet
                  onAbChange={
                    canEdit
                      ? (a, b) => {
                          const slots = collage.slots.map((s, idx) =>
                            idx === i ? { ...s, loopA: a, loopB: b } : s,
                          )
                          onSlots(slots)
                        }
                      : undefined
                  }
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-2 py-2">
                <p className="text-[11px] font-semibold text-white">{nameForUrl(slot.url)}</p>
                {slot.caption ? (
                  <p className="text-[12px] text-[var(--accent)]">{slot.caption}</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
  if (fullscreen) return createPortal(body, document.body)
  return body
}
