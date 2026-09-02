/**
 * Classes — named drill collages of up to 6 gym-library clips.
 * Edit a saved board to change each panel's video (the same clip can be on
 * more than one tile). Duplicate makes a personal copy.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { CollageStage } from './CollageStage'
import { CollageClipPicker } from './CollageClipPicker'
import {
  collageToShare,
  duplicateCollage,
  isGymCollage,
  listCollages,
  MAX_COLLAGE_SLOTS,
  newCollage,
  removeCollage,
  saveCollage,
  type Collage,
  type CollageSlot,
} from '../../lib/collages'
import { publishCollagePost } from '../../lib/feedPosts'
import { useGymLibrary, type GymClip } from '../../lib/gymLibrary'
import { isSameReferenceUrl, kindFromUrl } from '../../lib/clipStore'
import { postedByFromUrl } from '../../lib/socialUrls'
import { isCoachProfile, isGymAdmin } from '../../lib/profileRole'
import { useFavorites } from '../../lib/favorites'
import { FavoriteStar } from '../FavoriteStar'
import { GymClipPlayer } from '../GymClipPlayer'
import { prefetchNeighborClips } from '../../lib/igCache'
import { PhoneReelViewer } from '../PhoneReelViewer'
import { PostToChalkboard } from '../chalkboard/PostToChalkboard'
import type { Athlete } from '../../types'

type Props = {
  athlete: Athlete | null
}

type Draft = {
  id: string
  name: string
  createdById: string
  createdAt: string
  ownerId?: string
  copiedFromId?: string
  slots: CollageSlot[]
}

function clipToSlot(clip: GymClip, keep?: CollageSlot): CollageSlot {
  const same = keep ? isSameReferenceUrl(keep.url, clip.url) : false
  return {
    clipId: clip.id,
    url: clip.url,
    caption: keep?.caption ?? '',
    loopA: same ? keep?.loopA ?? null : null,
    loopB: same ? keep?.loopB ?? null : null,
  }
}

export function ClassesPanel({ athlete }: Props) {
  const { clips, collections, loading, nameForUrl } = useGymLibrary()
  const favorites = useFavorites()
  const [collages, setCollages] = useState<Collage[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [playing, setPlaying] = useState<Collage | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [filter, setFilter] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [previewClip, setPreviewClip] = useState<GymClip | null>(null)
  const [previewReel, setPreviewReel] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sharingId, setSharingId] = useState<string | null>(null)
  const [shareCaption, setShareCaption] = useState('')
  const [sharing, setSharing] = useState(false)
  const editorRef = useRef<HTMLElement | null>(null)
  const canEdit = Boolean(athlete)
  const gymAdmin = isGymAdmin(athlete)

  useEffect(() => {
    const slots = playing?.slots ?? draft?.slots ?? []
    prefetchNeighborClips(
      slots.map((s) => ({ id: s.clipId, url: s.url })),
      0,
      slots.length,
    )
  }, [playing, draft])

  useEffect(() => {
    void listCollages(athlete?.id).then(setCollages)
  }, [athlete?.id])

  useEffect(() => {
    if (draft) editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [draft?.id])

  const gymBoards = useMemo(() => collages.filter(isGymCollage), [collages])
  const myBoards = useMemo(
    () => collages.filter((c) => athlete && c.ownerId === athlete.id),
    [collages, athlete],
  )

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return collections
      .map((col) => ({
        id: col.id,
        name: col.name,
        items: col.items
          .filter((i) => {
            if (!i.url) return false
            if (onlyFavorites && !favorites.isUrlFavorite(i.url)) return false
            if (!q) return true
            return `${i.name} ${col.name} ${(i.keywords ?? []).join(' ')}`.toLowerCase().includes(q)
          })
          .sort((a, b) => {
            const af = a.url && favorites.isUrlFavorite(a.url) ? 0 : 1
            const bf = b.url && favorites.isUrlFavorite(b.url) ? 0 : 1
            return af - bf
          }),
      }))
      .filter((c) => c.items.length > 0)
  }, [collections, filter, onlyFavorites, favorites])

  const closePlay = () => {
    setPlaying(null)
    setFullscreen(false)
  }

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
      ownerId: c.ownerId,
      slots: [],
    })
    closePlay()
  }

  const editExisting = (c: Collage) => {
    setDraft({
      id: c.id,
      name: c.name,
      createdById: c.createdById,
      createdAt: c.createdAt,
      ownerId: c.ownerId,
      copiedFromId: c.copiedFromId,
      slots: c.slots.map((s) => ({ ...s })),
    })
    closePlay()
    setNotice(`Editing “${c.name}”. Each tile has its own video — the same clip can be on more than one.`)
  }

  const duplicateExisting = (c: Collage) => {
    if (!athlete) {
      setNotice('Unlock a profile to duplicate a collage.')
      return
    }
    const copy = duplicateCollage(
      c,
      athlete.id,
      collages.map((board) => board.name),
    )
    setDraft({
      id: copy.id,
      name: copy.name,
      createdById: copy.createdById,
      createdAt: copy.createdAt,
      ownerId: copy.ownerId,
      copiedFromId: copy.copiedFromId,
      slots: copy.slots.map((s) => ({ ...s })),
    })
    closePlay()
    setNotice(`Copy of “${c.name}”. Change any panel, then save.`)
  }

  const addClip = (clip: GymClip) => {
    setDraft((prev) => {
      if (!prev) return prev
      if (prev.slots.length >= MAX_COLLAGE_SLOTS) {
        setNotice(`A collage can hold ${MAX_COLLAGE_SLOTS} videos.`)
        return prev
      }
      return { ...prev, slots: [...prev.slots, clipToSlot(clip)] }
    })
  }

  const setSlotClip = (index: number, clip: GymClip) => {
    setDraft((prev) => {
      if (!prev || index < 0 || index >= prev.slots.length) return prev
      const slots = prev.slots.map((s, i) => (i === index ? clipToSlot(clip, s) : s))
      return { ...prev, slots }
    })
  }

  const duplicateSlot = (index: number) => {
    setDraft((prev) => {
      if (!prev) return prev
      if (prev.slots.length >= MAX_COLLAGE_SLOTS) {
        setNotice(`A collage can hold ${MAX_COLLAGE_SLOTS} videos.`)
        return prev
      }
      const slot = prev.slots[index]
      if (!slot) return prev
      const slots = prev.slots.slice()
      slots.splice(index + 1, 0, { ...slot })
      return { ...prev, slots }
    })
  }

  const moveSlot = (index: number, dir: -1 | 1) => {
    setDraft((prev) => {
      if (!prev) return prev
      const j = index + dir
      if (j < 0 || j >= prev.slots.length) return prev
      const slots = prev.slots.slice()
      const swap = slots[index]
      slots[index] = slots[j]
      slots[j] = swap
      return { ...prev, slots }
    })
  }

  const removeSlot = (index: number) => {
    setDraft((prev) => {
      if (!prev) return prev
      return { ...prev, slots: prev.slots.filter((_, i) => i !== index) }
    })
  }

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
      ownerId: draft.ownerId,
      copiedFromId: draft.copiedFromId,
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
    setNotice(`Saved “${saved.name}”. In the board, each panel can pick its own video.`)
  }

  const drop = async (c: Collage) => {
    if (!athlete) return
    if (isGymCollage(c) && !gymAdmin) return
    if (!isGymCollage(c) && c.ownerId !== athlete.id && c.createdById !== athlete.id) return
    if (!confirm(`Delete collage “${c.name}”?`)) return
    if (await removeCollage(c.id)) {
      setCollages((prev) => prev.filter((x) => x.id !== c.id))
      if (playing?.id === c.id) closePlay()
      if (draft?.id === c.id) setDraft(null)
    }
  }

  const shareToFeed = async (c: Collage) => {
    if (!athlete) {
      setNotice('Unlock a profile to share a collage to the feed.')
      return
    }
    setSharing(true)
    const posted = await publishCollagePost({
      authorId: athlete.id,
      caption: shareCaption.trim() || `Class collage: ${c.name}`,
      collage: collageToShare(c),
    })
    setSharing(false)
    if (!posted) {
      setNotice('Could not post that collage to the feed.')
      return
    }
    setSharingId(null)
    setShareCaption('')
    setNotice(`Posted “${c.name}” to the gym feed. Other coaches can save it into their class library.`)
  }

  const canManage = (c: Collage) => {
    if (!athlete) return false
    if (isGymCollage(c)) return gymAdmin
    return c.ownerId === athlete.id || c.createdById === athlete.id
  }

  const canShare = (c: Collage) =>
    Boolean(athlete && (gymAdmin || !c.ownerId || c.ownerId === athlete.id || c.createdById === athlete.id))

  const persistPlayingSlots = (slots: CollageSlot[]) => {
    if (!playing) return
    const next = { ...playing, slots, updatedAt: new Date().toISOString() }
    setPlaying(next)
    void saveCollage(next).then((saved) => {
      if (saved) setCollages((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
    })
  }

  const listProps = {
    nameForUrl,
    sharingId,
    shareCaption,
    sharing,
    canEdit,
    canShare,
    canManage,
    onPlay: (c: Collage) => {
      setPlaying(c)
      setDraft(null)
      setFullscreen(false)
    },
    onEdit: editExisting,
    onDuplicate: duplicateExisting,
    onDelete: (c: Collage) => void drop(c),
    onShareStart: (c: Collage) => {
      setSharingId(c.id)
      setShareCaption(`Class collage: ${c.name}`)
    },
    onShareCancel: () => {
      setSharingId(null)
      setShareCaption('')
    },
    onShareCaption: setShareCaption,
    onShare: (c: Collage) => void shareToFeed(c),
    athlete,
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Class drills
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">Collages</h2>
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

      {draft && (
        <section
          ref={editorRef}
          className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {collages.some((c) => c.id === draft.id) ? 'Edit collage' : 'New collage'}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-[var(--text)]">
            {draft.slots.length}/{MAX_COLLAGE_SLOTS} panels
          </h3>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Collage name — e.g. Monday whip drills"
            className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          />

          {draft.slots.length > 0 && (
            <ul className="mt-3 space-y-2">
              {draft.slots.map((slot, i) => (
                <li
                  key={`draft-slot-${i}`}
                  className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] p-2"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-[var(--muted)]">
                      Panel {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveSlot(i, -1)}
                      disabled={i === 0}
                      className="rounded-md border border-[var(--panel-border)] px-2 py-0.5 text-xs disabled:opacity-30"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlot(i, 1)}
                      disabled={i === draft.slots.length - 1}
                      className="rounded-md border border-[var(--panel-border)] px-2 py-0.5 text-xs disabled:opacity-30"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateSlot(i)}
                      className="rounded-md border border-[var(--panel-border)] px-2 py-0.5 text-xs"
                    >
                      Same video again
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      className="rounded-md px-2 py-0.5 text-xs text-[var(--bad)]"
                    >
                      Remove
                    </button>
                  </div>
                  <CollageClipPicker
                    url={slot.url}
                    clipId={slot.clipId}
                    clips={clips}
                    onPick={(clip) => setSlotClip(i, clip)}
                  />
                  <input
                    value={slot.caption}
                    onChange={(e) => {
                      const caption = e.target.value
                      setDraft({
                        ...draft,
                        slots: draft.slots.map((s, idx) =>
                          idx === i ? { ...s, caption } : s,
                        ),
                      })
                    }}
                    placeholder="Caption — e.g. 8 reps · snap the whip"
                    className="mt-2 w-full rounded-md border border-[var(--panel-border)] bg-[#121820] px-2 py-1.5 text-sm"
                  />
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Add a panel — you can add the same clip more than once
          </p>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search the gym library"
            className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={!onlyFavorites}
              onClick={() => setOnlyFavorites(false)}
              className={
                !onlyFavorites
                  ? 'rounded-md bg-[var(--accent-dim)] px-2.5 py-1 text-xs font-semibold text-white'
                  : 'rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-xs text-[var(--muted)]'
              }
            >
              All URLs
            </button>
            <button
              type="button"
              aria-pressed={onlyFavorites}
              onClick={() => setOnlyFavorites(true)}
              className={
                onlyFavorites
                  ? 'rounded-md bg-[#f5d76e] px-2.5 py-1 text-xs font-semibold text-[#06281f]'
                  : 'rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-xs text-[var(--muted)]'
              }
            >
              ★ Favorites
            </button>
          </div>
          {loading && <p className="mt-2 text-xs text-[var(--muted)]">Loading gym URLs…</p>}
          {onlyFavorites && grouped.length === 0 && (
            <p className="mt-2 text-sm text-[var(--muted)]">
              No favorite URLs yet. Star clips here or in Compare.
            </p>
          )}
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
          <div className="max-h-72 space-y-3 overflow-y-auto">
            {grouped.map((col) => (
              <div key={col.id}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {col.name}
                </p>
                <ul className="space-y-1">
                  {col.items.map((item) => {
                    if (!item.url) return null
                    const used = draft.slots.filter((s) =>
                      isSameReferenceUrl(s.url, item.url!),
                    ).length
                    const clip = clips.find((c) => isSameReferenceUrl(c.url, item.url!)) ?? {
                      id: item.id,
                      name: item.name,
                      url: item.url!,
                      kind: item.kind,
                      collectionId: col.id,
                      collectionName: col.name,
                      keywords: item.keywords,
                    }
                    const previewing = previewClip
                      ? isSameReferenceUrl(previewClip.url, clip.url)
                      : false
                    return (
                      <li key={item.id} className="flex items-center gap-1">
                        <FavoriteStar
                          compact
                          on={favorites.isUrlFavorite(item.url!)}
                          onClick={() => favorites.toggleUrlFavorite(item.url!)}
                          label={
                            favorites.isUrlFavorite(item.url!)
                              ? `Unfavorite ${item.name}`
                              : `Favorite ${item.name}`
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewClip(clip)}
                          className={`flex min-w-0 flex-1 items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm ${
                            previewing
                              ? 'bg-white/10 font-semibold text-[var(--text)] ring-1 ring-[var(--accent)]'
                              : used
                                ? 'bg-[var(--accent-dim)]/40 text-[var(--text)]'
                                : 'bg-[#0d1218] text-[var(--text)]'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                          <span className="shrink-0 text-[11px] opacity-70">
                            {previewing ? 'Preview' : 'Look'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewClip(clip)
                            addClip(clip)
                          }}
                          className="shrink-0 rounded-lg border border-[var(--panel-border)] px-2 py-1.5 text-[11px] font-semibold text-[var(--accent)]"
                        >
                          {used ? `Add (${used})` : 'Add'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-black md:sticky md:top-2">
            {previewClip ? (
              <div className="flex flex-col">
                <div className="relative aspect-[9/16] max-h-72 w-full">
                  <GymClipPlayer
                    key={previewClip.id}
                    url={previewClip.url}
                    itemId={previewClip.id}
                    fill
                    active
                    persistUrl={previewClip.url}
                    compact
                    quiet
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewReel(true)}
                    className="absolute bottom-2 right-2 z-20 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-black"
                  >
                    Full screen
                  </button>
                </div>
                <div className="space-y-2 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    {previewClip.collectionName}
                  </p>
                  <p className="text-sm font-semibold text-white">{previewClip.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewReel(true)}
                      className="rounded-lg border border-white/25 px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Watch full screen
                    </button>
                    <button
                      type="button"
                      onClick={() => addClip(previewClip)}
                      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f]"
                    >
                      Add to collage
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="px-3 py-8 text-center text-sm text-white/55">
                Tap a clip to preview it before it goes on the board.
              </p>
            )}
          </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void persist()}
              disabled={saving}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f] disabled:opacity-50"
            >
              {saving
                ? 'Saving…'
                : collages.some((c) => c.id === draft.id)
                  ? 'Save changes'
                  : 'Save collage'}
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

      {myBoards.length > 0 && (
        <CollageList title="My class library" collages={myBoards} {...listProps} />
      )}
      {gymBoards.length > 0 && (
        <CollageList title="Gym boards" collages={gymBoards} {...listProps} />
      )}

      {previewReel && previewClip && (
        <PhoneReelViewer
          items={grouped.flatMap((col) =>
            col.items
              .filter((item) => item.url)
              .map((item) => ({
                id: item.id,
                name: item.name,
                url: item.url!,
                kind: kindFromUrl(item.url!),
                keywords: item.keywords,
                collectionName: col.name,
                postedBy: item.postedBy || postedByFromUrl(item.url!) || undefined,
              })),
          )}
          startIndex={Math.max(
            0,
            grouped
              .flatMap((col) => col.items.filter((item) => item.url))
              .findIndex((item) => isSameReferenceUrl(item.url!, previewClip.url)),
          )}
          onClose={() => setPreviewReel(false)}
          editor={{
            gymEditor: gymAdmin,
            personalEditor: isCoachProfile(athlete) && !gymAdmin,
            profileId: athlete?.id ?? null,
          }}
          gymAdmin={gymAdmin}
          title="Collage clips"
        />
      )}

      {playing && (
        <CollageStage
          collage={playing}
          nameForUrl={nameForUrl}
          fullscreen={fullscreen}
          onFullscreen={setFullscreen}
          onClose={closePlay}
          onSlots={canEdit ? persistPlayingSlots : undefined}
          canEdit={canEdit}
          onEditVideos={canEdit ? () => editExisting(playing) : undefined}
          onDuplicate={canEdit ? () => duplicateExisting(playing) : undefined}
          editor={{
            gymEditor: gymAdmin,
            personalEditor: isCoachProfile(athlete) && !gymAdmin,
            profileId: athlete?.id ?? null,
          }}
          gymAdmin={gymAdmin}
        />
      )}
    </div>
  )
}

function CollageList({
  title,
  collages,
  nameForUrl,
  sharingId,
  shareCaption,
  sharing,
  canEdit,
  canShare,
  canManage,
  onPlay,
  onEdit,
  onDuplicate,
  onDelete,
  onShareStart,
  onShareCancel,
  onShareCaption,
  onShare,
  athlete,
}: {
  title: string
  collages: Collage[]
  nameForUrl: (url: string) => string
  sharingId: string | null
  shareCaption: string
  sharing: boolean
  canEdit: boolean
  canShare: (c: Collage) => boolean
  canManage: (c: Collage) => boolean
  onPlay: (c: Collage) => void
  onEdit: (c: Collage) => void
  onDuplicate: (c: Collage) => void
  onDelete: (c: Collage) => void
  onShareStart: (c: Collage) => void
  onShareCancel: () => void
  onShareCaption: (value: string) => void
  onShare: (c: Collage) => void
  athlete: Athlete | null
}) {
  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">{title}</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {collages.map((c) => (
          <li
            key={c.id}
            className="flex flex-col gap-2 rounded-xl border border-[var(--panel-border)] bg-[#0d1218] p-3"
          >
            <div>
              <p className="font-semibold text-[var(--text)]">{c.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {c.slots.length} video{c.slots.length === 1 ? '' : 's'} ·{' '}
                {c.slots.map((s) => nameForUrl(s.url)).join(', ')}
              </p>
              {c.copiedFromId ? (
                <p className="mt-1 text-[11px] text-[var(--accent)]">
                  {c.ownerId ? 'Copy in your class library' : 'Saved from the gym feed'}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onPlay(c)}
                className="rounded-md bg-[var(--accent-dim)] px-2.5 py-1 text-xs font-semibold text-white"
              >
                Play
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(c)}
                  className="rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-xs"
                >
                  Edit
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDuplicate(c)}
                  className="rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-xs"
                >
                  Duplicate
                </button>
              )}
              {canShare(c) && sharingId !== c.id && (
                <button
                  type="button"
                  onClick={() => onShareStart(c)}
                  className="rounded-md border border-[var(--accent-dim)] px-2.5 py-1 text-xs text-[var(--accent)]"
                >
                  Share to feed
                </button>
              )}
              {athlete && (
                <PostToChalkboard
                  viewer={athlete}
                  compact
                  draft={{ kind: 'collage', title: c.name, collageId: c.id }}
                />
              )}
              {canManage(c) && (
                <button
                  type="button"
                  onClick={() => onDelete(c)}
                  className="rounded-md px-2.5 py-1 text-xs text-[var(--bad)]"
                >
                  Delete
                </button>
              )}
            </div>
            {sharingId === c.id && (
              <div className="space-y-2 rounded-lg border border-[var(--panel-border)] bg-[#121820] p-2">
                <textarea
                  value={shareCaption}
                  onChange={(e) => onShareCaption(e.target.value)}
                  rows={2}
                  placeholder="Note for other coaches — reps, station, cue"
                  className="w-full rounded-md border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={sharing}
                    onClick={() => onShare(c)}
                    className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[#06281f] disabled:opacity-50"
                  >
                    {sharing ? 'Posting…' : 'Post to feed'}
                  </button>
                  <button
                    type="button"
                    onClick={onShareCancel}
                    className="rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
