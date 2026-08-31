/**
 * Add a reference clip to a Compare collection or a class collage.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MAX_COLLAGE_SLOTS, type Collage } from '../../lib/collages'
import type { RefCollection } from '../../lib/clipStore'
import {
  addClipToCollage,
  copyClipToCollection,
  createWritableCollection,
  listEditableCollages,
  listWritableCollections,
  type ClipToCopy,
  type OrganizeEditor,
} from '../../lib/organizeLibrary'

type Panel = 'collection' | 'collage' | null

type Props = {
  clip: ClipToCopy
  editor: OrganizeEditor
  gymAdmin?: boolean
  variant?: 'row' | 'feed'
  onCopied?: (message: string) => void
}

export function ClipOrganizeMenu({
  clip,
  editor,
  gymAdmin = editor.gymEditor,
  variant = 'row',
  onCopied,
}: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const [collections, setCollections] = useState<RefCollection[]>([])
  const [collages, setCollages] = useState<Collage[]>([])
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const gymEditor = editor.gymEditor
  const personalEditor = editor.personalEditor
  const profileId = editor.profileId
  const canCollect = gymEditor || (personalEditor && Boolean(profileId))
  const canCollage = Boolean(profileId) && Boolean(clip.url)
  const locked = !canCollect && !canCollage

  useEffect(() => {
    if (!panel) return
    let cancelled = false
    const load = async () => {
      if (panel === 'collection' && canCollect) {
        const list = await listWritableCollections({ gymEditor, personalEditor, profileId })
        if (!cancelled) setCollections(list)
      }
      if (panel === 'collage' && canCollage && profileId) {
        const list = await listEditableCollages(profileId, gymAdmin)
        if (!cancelled) setCollages(list)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [panel, canCollect, canCollage, gymEditor, personalEditor, profileId, gymAdmin])

  const open = (next: Panel) => {
    setFlash(null)
    setPanel((cur) => (cur === next ? null : next))
  }

  const finish = (message: string) => {
    setFlash(message)
    onCopied?.(message)
    setBusy(false)
    window.setTimeout(() => setPanel(null), 700)
  }

  const copyInto = async (collectionId: string) => {
    if (!canCollect) return
    setBusy(true)
    const result = await copyClipToCollection(clip, collectionId, editor)
    if (!result.ok) {
      setFlash(result.reason)
      setBusy(false)
      return
    }
    finish(
      result.already
        ? `Already in “${result.collectionName}”.`
        : `Added to “${result.collectionName}”.`,
    )
  }

  const makeCollection = async () => {
    if (!canCollect) return
    setBusy(true)
    const col = await createWritableCollection(newName, editor)
    if (!col) {
      setFlash('Could not start a new collection.')
      setBusy(false)
      return
    }
    setNewName('')
    setCollections((prev) => [...prev, col])
    const result = await copyClipToCollection(clip, col.id, editor)
    if (!result.ok) {
      setFlash(result.reason)
      setBusy(false)
      return
    }
    finish(`Added to “${col.name}”.`)
  }

  const addToBoard = async (collageId: string | 'new') => {
    if (!canCollage || !profileId || !clip.url) return
    setBusy(true)
    const result = await addClipToCollage(
      { id: clip.sourceId || clip.url, url: clip.url },
      collageId,
      { athleteId: profileId, gymAdmin },
    )
    if (!result.ok) {
      setFlash(result.reason)
      setBusy(false)
      return
    }
    finish(
      result.created
        ? `Started “${result.collageName}” in Classes.`
        : `Added to “${result.collageName}”.`,
    )
  }

  const btn =
    variant === 'feed'
      ? 'rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white'
      : 'rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]'

  const lockTitle = locked
    ? 'Unlock a coach profile to add this clip to a collection or collage.'
    : undefined

  const sheet =
    panel && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[400] flex items-end justify-center bg-black/55 p-4 sm:items-center"
            onPointerDown={() => setPanel(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-[var(--panel-border)] bg-[#121820] p-4 shadow-2xl"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    {panel === 'collection' ? 'Add to collection' : 'Add to collage'}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-[var(--text)]">
                    {clip.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="rounded-lg px-2 py-1 text-xs text-[var(--muted)]"
                >
                  Close
                </button>
              </div>
              {flash ? (
                <p className="mt-2 text-xs text-[var(--accent)]">{flash}</p>
              ) : null}
              {panel === 'collection' && canCollect ? (
                <div className="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
                  {collections.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">
                      No collection yet — start one below.
                    </p>
                  ) : (
                    collections.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        disabled={busy}
                        onClick={() => void copyInto(col.id)}
                        className="rounded-lg bg-[#0d1218] px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--accent-dim)] hover:text-white disabled:opacity-50"
                      >
                        {col.name}
                        <span className="ml-1 text-[11px] text-[var(--muted)]">
                          ({col.items.length})
                        </span>
                      </button>
                    ))
                  )}
                  <div className="mt-2 flex gap-1">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void makeCollection()}
                      placeholder="New collection name"
                      className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void makeCollection()}
                      className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Create
                    </button>
                  </div>
                </div>
              ) : null}
              {panel === 'collage' && canCollage ? (
                <div className="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
                  {collages.map((board) => (
                    <button
                      key={board.id}
                      type="button"
                      disabled={busy || board.slots.length >= MAX_COLLAGE_SLOTS}
                      onClick={() => void addToBoard(board.id)}
                      className="rounded-lg bg-[#0d1218] px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--accent-dim)] hover:text-white disabled:opacity-50"
                    >
                      {board.name}
                      <span className="ml-1 text-[11px] text-[var(--muted)]">
                        ({board.slots.length}/{MAX_COLLAGE_SLOTS})
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void addToBoard('new')}
                    className="rounded-lg border border-[var(--accent-dim)] px-3 py-2 text-left text-sm text-[var(--accent)] disabled:opacity-50"
                  >
                    New collage
                  </button>
                </div>
              ) : null}
              {locked ||
              (panel === 'collection' && !canCollect) ||
              (panel === 'collage' && !canCollage) ? (
                <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
                  Unlock a coach profile to save clips into your own library. Unlock any profile
                  to start a class collage.
                </p>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="relative shrink-0">
      <div className={`flex flex-wrap items-center ${variant === 'feed' ? 'gap-2' : 'gap-0.5'}`}>
        <button
          type="button"
          title={lockTitle ?? 'Copy this clip into a collection you can edit'}
          disabled={locked && variant !== 'feed'}
          onClick={(e) => {
            e.stopPropagation()
            if (!canCollect) {
              setFlash('Unlock a coach profile to collect this clip.')
              setPanel('collection')
              return
            }
            open('collection')
          }}
          className={btn}
        >
          {variant === 'feed' ? 'Add to collection' : 'Collect'}
        </button>
        {clip.url ? (
          <button
            type="button"
            title={lockTitle ?? 'Put this clip on a class collage'}
            disabled={locked && variant !== 'feed'}
            onClick={(e) => {
              e.stopPropagation()
              if (!canCollage) {
                setFlash('Unlock a profile to add this clip to a collage.')
                setPanel('collage')
                return
              }
              open('collage')
            }}
            className={btn}
          >
            {variant === 'feed' ? 'Add to collage' : 'Collage'}
          </button>
        ) : null}
      </div>
      {sheet}
    </div>
  )
}
