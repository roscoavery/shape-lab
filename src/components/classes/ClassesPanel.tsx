/**
 * Classes — named drill collages of up to 6 gym-library clips.
 * Captions and A/B loops save with the collage. Full screen splits evenly.
 */

import { useEffect, useMemo, useState } from 'react'
import { CollageStage } from './CollageStage'
import {
  collageToShare,
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
import { isSameReferenceUrl } from '../../lib/clipStore'
import { isCoachProfile } from '../../lib/profileRole'
import { useFavorites } from '../../lib/favorites'
import { FavoriteStar } from '../FavoriteStar'
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

export function ClassesPanel({ athlete }: Props) {
  const { clips, collections, loading, nameForUrl } = useGymLibrary()
  const favorites = useFavorites()
  const [collages, setCollages] = useState<Collage[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [playing, setPlaying] = useState<Collage | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [filter, setFilter] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sharingId, setSharingId] = useState<string | null>(null)
  const [shareCaption, setShareCaption] = useState('')
  const [sharing, setSharing] = useState(false)
  const canEdit = Boolean(athlete)
  const admin = isCoachProfile(athlete)

  useEffect(() => {
    void listCollages(athlete?.id).then(setCollages)
  }, [athlete?.id])

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
    setPlaying(null)
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
    setNotice(
      `Saved “${saved.name}” to your class library. Share it to the feed so other coaches can copy it.`,
    )
  }

  const drop = async (c: Collage) => {
    if (!athlete) return
    if (!admin && c.ownerId !== athlete.id && c.createdById !== athlete.id) return
    if (!confirm(`Delete collage “${c.name}”?`)) return
    if (await removeCollage(c.id)) {
      setCollages((prev) => prev.filter((x) => x.id !== c.id))
      if (playing?.id === c.id) setPlaying(null)
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

  const canManage = (c: Collage) =>
    Boolean(athlete && (admin || c.ownerId === athlete.id || c.createdById === athlete.id || !c.ownerId))

  const canShare = (c: Collage) =>
    Boolean(athlete && (admin || !c.ownerId || c.ownerId === athlete.id || c.createdById === athlete.id))

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Class drills
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Collages</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Build a board of up to six clips from the gym Compare library. Star favorite
          URLs, add a caption (reps, a cue). Set A/B on each video — those loop points
          save with the collage and on the gym URL. Full screen hides chrome so the
          tiles sit flush (a 4-clip board is four equal quarters). Export records a
          chosen number of seconds of the looping board. Share one to the gym feed so
          other coaches can save a copy and run it in class.
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

      {myBoards.length > 0 && (
        <CollageList
          title="My class library"
          collages={myBoards}
          nameForUrl={nameForUrl}
          sharingId={sharingId}
          shareCaption={shareCaption}
          sharing={sharing}
          canEdit={canEdit}
          canShare={canShare}
          canManage={canManage}
          onPlay={(c) => {
            setPlaying(c)
            setDraft(null)
            setFullscreen(false)
          }}
          onEdit={editExisting}
          onDelete={(c) => void drop(c)}
          onShareStart={(c) => {
            setSharingId(c.id)
            setShareCaption(`Class collage: ${c.name}`)
          }}
          onShareCancel={() => {
            setSharingId(null)
            setShareCaption('')
          }}
          onShareCaption={setShareCaption}
          onShare={(c) => void shareToFeed(c)}
        />
      )}

      {gymBoards.length > 0 && (
        <CollageList
          title="Gym boards"
          collages={gymBoards}
          nameForUrl={nameForUrl}
          sharingId={sharingId}
          shareCaption={shareCaption}
          sharing={sharing}
          canEdit={canEdit}
          canShare={canShare}
          canManage={canManage}
          onPlay={(c) => {
            setPlaying(c)
            setDraft(null)
            setFullscreen(false)
          }}
          onEdit={editExisting}
          onDelete={(c) => void drop(c)}
          onShareStart={(c) => {
            setSharingId(c.id)
            setShareCaption(`Class collage: ${c.name}`)
          }}
          onShareCancel={() => {
            setSharingId(null)
            setShareCaption('')
          }}
          onShareCaption={setShareCaption}
          onShare={(c) => void shareToFeed(c)}
        />
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
                          className={`flex min-w-0 flex-1 items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm ${
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
  onDelete,
  onShareStart,
  onShareCancel,
  onShareCaption,
  onShare,
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
  onDelete: (c: Collage) => void
  onShareStart: (c: Collage) => void
  onShareCancel: () => void
  onShareCaption: (value: string) => void
  onShare: (c: Collage) => void
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
                <p className="mt-1 text-[11px] text-[var(--accent)]">Saved from the gym feed</p>
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
              {canShare(c) && sharingId !== c.id && (
                <button
                  type="button"
                  onClick={() => onShareStart(c)}
                  className="rounded-md border border-[var(--accent-dim)] px-2.5 py-1 text-xs text-[var(--accent)]"
                >
                  Share to feed
                </button>
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
