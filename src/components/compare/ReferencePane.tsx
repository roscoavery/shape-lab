/**
 * Compare tab — reference video pane.
 * Named collections stored in IndexedDB; each collection holds uploaded
 * video files, direct video URLs, or Instagram post/reel links. Instagram
 * videos are downloaded into the app. Items can be renamed, reordered, and
 * searched across collections.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteBlob,
  deleteCollection,
  getBlob,
  getCollections,
  isInstagramUrl,
  isSameReferenceUrl,
  itemMatchesQuery,
  listCachedIds,
  moveItem,
  parseInstagramUrl,
  putBlob,
  putCollection,
  reorderItems,
  type RefCollection,
  type RefItem,
} from '../../lib/clipStore'
import { saveInstagramInApp } from '../../lib/igCache'
import {
  allUrlsText,
  backupUrlCount,
  downloadBackupFile,
  mergeLibraryBackup,
  parseLibraryBackup,
  publishLibrary,
  restoreMetaIfIndexedDbEmpty,
  syncLibraryWithServer,
} from '../../lib/libraryBackup'

/** Same public tunnel Ryan used to paste URLs — IndexedDB on that origin may still hold them. */
const RECOVERY_ORIGIN = 'https://zope-strengthening-sharon-companies.trycloudflare.com'
import { createId } from '../../lib/storage'
import { InstagramEmbed } from './InstagramEmbed'
import { VideoWorkbench } from './VideoWorkbench'

const KIND_LABEL: Record<RefItem['kind'], string> = {
  file: 'File',
  url: 'URL',
  instagram: 'IG',
}

type OtherHit = { item: RefItem; collection: RefCollection }

export function ReferencePane() {
  const [collections, setCollections] = useState<RefCollection[]>([])
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [itemSrc, setItemSrc] = useState<string | null>(null)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<{ current: number; total: number } | null>(
    null,
  )
  const [dragId, setDragId] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const activeCollection =
    collections.find((c) => c.id === activeCollectionId) ?? null
  const activeItem =
    activeCollection?.items.find((i) => i.id === activeItemId) ?? null
  const searching = searchQuery.trim().length > 0

  const refreshCachedIds = useCallback(async (cols: RefCollection[]) => {
    const ids = cols.flatMap((c) => c.items.map((i) => i.id))
    setCachedIds(await listCachedIds(ids))
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        let list = await getCollections()
        if (list.length === 0) {
          const def: RefCollection = {
            id: createId('col'),
            name: 'My references',
            items: [],
            createdAt: new Date().toISOString(),
          }
          await putCollection(def)
          list = [def]
        }
        list = await restoreMetaIfIndexedDbEmpty(list)
        const synced = await syncLibraryWithServer(list)
        list = synced.collections
        setCollections(list)
        publishLibrary(list)
        setActiveCollectionId(list[0].id)
        await refreshCachedIds(list)
        if (synced.pulled > 0) {
          setNotice(
            `Restored ${synced.pulled} saved URL${synced.pulled === 1 ? '' : 's'} from the app server.`,
          )
        }
      } catch {
        setError('IndexedDB is unavailable in this browser — collections cannot be saved.')
      }
    })()
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [refreshCachedIds])

  const revokeSrc = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  const selectItem = async (item: RefItem) => {
    setError(null)
    revokeSrc()
    setActiveItemId(item.id)
    if (item.kind === 'file') {
      const blob = await getBlob(item.id)
      if (!blob) {
        setError('Stored video not found — it may have been cleared by the browser.')
        setItemSrc(null)
        return
      }
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      setItemSrc(url)
    } else if (item.kind === 'url') {
      setItemSrc(item.url ?? null)
    } else {
      setItemSrc(null) // instagram renders as embed
    }
  }

  const updateCollection = async (next: RefCollection) => {
    await putCollection(next)
    setCollections((prev) => {
      const list = prev.map((c) => (c.id === next.id ? next : c))
      publishLibrary(list)
      return list
    })
  }

  const addCollection = async () => {
    const name = newCollectionName.trim()
    if (!name) return
    const col: RefCollection = {
      id: createId('col'),
      name,
      items: [],
      createdAt: new Date().toISOString(),
    }
    await putCollection(col)
    setCollections((prev) => {
      const list = [...prev, col]
      publishLibrary(list)
      return list
    })
    setActiveCollectionId(col.id)
    setNewCollectionName('')
  }

  const removeCollection = async () => {
    if (!activeCollection) return
    if (!confirm(`Delete collection "${activeCollection.name}" and its saved videos?`)) return
    await deleteCollection(activeCollection)
    const rest = collections.filter((c) => c.id !== activeCollection.id)
    setCollections(rest)
    publishLibrary(rest)
    setActiveCollectionId(rest[0]?.id ?? null)
    setActiveItemId(null)
    revokeSrc()
    setItemSrc(null)
    await refreshCachedIds(rest)
  }

  const addUrl = async () => {
    if (!activeCollection) return
    const urls = urlInput
      .split(/[\s,]+/)
      .map((u) => u.trim())
      .filter(Boolean)
    if (urls.length === 0) return
    const bad = urls.find((u) => !/^https?:\/\//i.test(u))
    if (bad) {
      setError('Paste full URL(s) starting with http(s):// — one or several IG links is fine.')
      return
    }
    setError(null)
    setNotice(null)

    const existing = activeCollection.items
    const items: RefItem[] = []
    let skipped = 0
    for (const url of urls) {
      const dup = existing.some((i) => i.url && isSameReferenceUrl(i.url, url))
        || items.some((i) => i.url && isSameReferenceUrl(i.url, url))
      if (dup) {
        skipped += 1
        continue
      }
      const instagram = isInstagramUrl(url)
      const name = instagram
        ? `IG ${parseInstagramUrl(url)?.code ?? 'post'}`
        : (() => {
            try {
              const path = new URL(url).pathname.split('/').filter(Boolean)
              return path[path.length - 1] || url
            } catch {
              return url
            }
          })()
      items.push({
        id: createId('ref'),
        kind: instagram ? 'instagram' : 'url',
        name,
        url,
        createdAt: new Date().toISOString(),
      })
    }
    if (items.length === 0) {
      setNotice(
        skipped
          ? `Already in this collection — skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}.`
          : null,
      )
      setUrlInput('')
      return
    }
    await updateCollection({
      ...activeCollection,
      items: [...items, ...activeCollection.items],
    })
    setUrlInput('')
    if (skipped) {
      setNotice(
        `Added ${items.length}, skipped ${skipped} already in this collection.`,
      )
    }
    const first = items[0]
    if (first) await selectItem(first)
  }

  const addFile = async (file: File) => {
    if (!activeCollection) return
    setError(null)
    const item: RefItem = {
      id: createId('ref'),
      kind: 'file',
      name: file.name,
      createdAt: new Date().toISOString(),
    }
    try {
      await putBlob(item.id, file)
    } catch {
      setError('Could not store the video — device storage may be full.')
      return
    }
    await updateCollection({
      ...activeCollection,
      items: [item, ...activeCollection.items],
    })
    setCachedIds((prev) => new Set(prev).add(item.id))
    await selectItem(item)
  }

  const removeItem = async (item: RefItem, collection = activeCollection) => {
    if (!collection) return
    await deleteBlob(item.id)
    await updateCollection({
      ...collection,
      items: collection.items.filter((i) => i.id !== item.id),
    })
    setCachedIds((prev) => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
    if (activeItemId === item.id) {
      setActiveItemId(null)
      revokeSrc()
      setItemSrc(null)
    }
    if (renamingId === item.id) setRenamingId(null)
  }

  const startRename = (item: RefItem) => {
    setRenamingId(item.id)
    setRenameDraft(item.name)
  }

  const commitRename = async (item: RefItem, collection = activeCollection) => {
    if (renamingId !== item.id) return
    const name = renameDraft.trim()
    setRenamingId(null)
    if (!collection || !name || name === item.name) return
    await updateCollection({
      ...collection,
      items: collection.items.map((i) => (i.id === item.id ? { ...i, name } : i)),
    })
  }

  const persistOrder = async (nextItems: RefItem[]) => {
    if (!activeCollection) return
    if (nextItems === activeCollection.items) return
    await updateCollection({ ...activeCollection, items: nextItems })
  }

  const onMove = async (item: RefItem, dir: -1 | 1) => {
    if (!activeCollection || searching) return
    await persistOrder(moveItem(activeCollection.items, item.id, dir))
  }

  const onDropOn = async (targetId: string) => {
    if (!activeCollection || !dragId || searching) return
    await persistOrder(reorderItems(activeCollection.items, dragId, targetId))
    setDragId(null)
  }

  const markCached = useCallback((id: string) => {
    setCachedIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const allIgItems = useMemo(
    () =>
      collections.flatMap((c) =>
        c.items.filter((i): i is RefItem & { url: string } =>
          i.kind === 'instagram' && Boolean(i.url),
        ),
      ),
    [collections],
  )
  const uncachedIg = allIgItems.filter((i) => !cachedIds.has(i.id))

  const saveAllInApp = async () => {
    if (uncachedIg.length === 0 || saving) return
    setError(null)
    setNotice(null)
    const failures: string[] = []
    for (let i = 0; i < uncachedIg.length; i++) {
      const item = uncachedIg[i]
      setSaving({ current: i + 1, total: uncachedIg.length })
      try {
        await saveInstagramInApp(item.id, item.url)
        markCached(item.id)
      } catch (err) {
        failures.push(item.name)
        if (err instanceof Error && /storage|quota/i.test(err.message)) {
          setError('Device storage is full — some reels could not be saved in the app.')
          break
        }
      }
    }
    setSaving(null)
    if (failures.length) {
      setNotice(
        `Could not save ${failures.length} reel${failures.length === 1 ? '' : 's'}: ${failures.slice(0, 3).join(', ')}${failures.length > 3 ? '…' : ''}. Private clips will not download.`,
      )
    } else {
      setNotice(
        `Saved ${uncachedIg.length} Instagram video${uncachedIg.length === 1 ? '' : 's'} in this app.`,
      )
    }
  }

  const exportLibrary = () => {
    if (collections.every((c) => c.items.length === 0)) {
      setNotice('Nothing to export yet — add URLs first.')
      return
    }
    downloadBackupFile(collections)
    publishLibrary(collections)
    const n = collections.reduce(
      (sum, c) => sum + c.items.filter((i) => i.url).length,
      0,
    )
    setNotice(
      `Downloaded a backup of ${n} saved URL${n === 1 ? '' : 's'}. Keep that JSON file — it outlives any tunnel link.`,
    )
  }

  const copyAllUrls = async () => {
    const text = allUrlsText(collections)
    if (!text) {
      setNotice('No URLs to copy.')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Copied every saved name + URL. Paste that somewhere safe.')
    } catch {
      setError('Could not copy — use Export library instead.')
    }
  }

  const importLibraryFile = async (file: File) => {
    setError(null)
    setNotice(null)
    try {
      const backup = parseLibraryBackup(await file.text())
      const { collections: next, added, skipped } = await mergeLibraryBackup(backup)
      setCollections(next)
      await refreshCachedIds(next)
      const urlsInFile = backupUrlCount(backup)
      setNotice(
        `Imported ${added} URL${added === 1 ? '' : 's'} (${urlsInFile} in file, ${skipped} skipped as duplicates or files). Hit Save all in app to download the videos.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that file.')
    }
  }

  const currentHits = (activeCollection?.items ?? []).filter((item) =>
    itemMatchesQuery(item, searchQuery),
  )
  const otherHits: OtherHit[] = searching
    ? collections
        .filter((c) => c.id !== activeCollectionId)
        .flatMap((collection) =>
          collection.items
            .filter((item) => itemMatchesQuery(item, searchQuery))
            .map((item) => ({ item, collection })),
        )
    : []

  const jumpToHit = async (hit: OtherHit) => {
    setActiveCollectionId(hit.collection.id)
    await selectItem(hit.item)
  }

  const inputCls =
    'rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2.5 py-1.5 text-sm'
  const btnCls =
    'rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm hover:bg-[#243040]'

  const renderRow = (
    item: RefItem,
    opts: {
      collection: RefCollection
      index: number
      total: number
      allowReorder: boolean
    },
  ) => {
    const isActive = activeItemId === item.id
    const cached = cachedIds.has(item.id)
    return (
      <li
        key={item.id}
        className={`flex items-center gap-1 rounded-md ${
          dragId === item.id ? 'opacity-60' : ''
        }`}
        draggable={opts.allowReorder && renamingId !== item.id}
        onDragStart={() => setDragId(item.id)}
        onDragOver={(e) => {
          if (!opts.allowReorder) return
          e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          void onDropOn(item.id)
        }}
        onDragEnd={() => setDragId(null)}
      >
        {opts.allowReorder && (
          <span className="flex shrink-0 flex-col">
            <button
              type="button"
              disabled={opts.index === 0}
              onClick={() => void onMove(item, -1)}
              className="rounded px-1 text-xs leading-none text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"
              aria-label={`Move ${item.name} up`}
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={opts.index === opts.total - 1}
              onClick={() => void onMove(item, 1)}
              className="rounded px-1 text-xs leading-none text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-30"
              aria-label={`Move ${item.name} down`}
              title="Move down"
            >
              ↓
            </button>
          </span>
        )}
        {renamingId === item.id ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void commitRename(item, opts.collection)
            }}
          >
            <span className="rounded bg-[#0d1218] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
              {KIND_LABEL[item.kind]}
            </span>
            <input
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setRenamingId(null)
                }
              }}
              onBlur={() => void commitRename(item, opts.collection)}
              className={`${inputCls} min-w-0 flex-1 py-1`}
              aria-label="Reference name"
            />
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void selectItem(item)}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                isActive
                  ? 'bg-[var(--accent-dim)]/30 text-[var(--text)]'
                  : 'text-[var(--muted)] hover:bg-[#243040] hover:text-[var(--text)]'
              }`}
            >
              <span className="rounded bg-[#0d1218] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                {KIND_LABEL[item.kind]}
              </span>
              <span className="truncate">{item.name}</span>
              {item.kind === 'instagram' && (
                <span
                  className={`shrink-0 text-[10px] ${
                    cached ? 'text-[var(--good)]' : 'text-[var(--muted)]'
                  }`}
                >
                  {cached ? 'in app' : 'URL'}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => startRename(item)}
              className="rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
              title="Rename this reference"
            >
              Rename
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => void removeItem(item, opts.collection)}
          className="rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--bad)]"
          title="Remove from collection"
        >
          ✕
        </button>
      </li>
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Reference video</h2>
        <span className="text-xs text-[var(--muted)]">the technique to copy</span>
      </div>

      {/* Collection picker */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={activeCollectionId ?? ''}
          onChange={(e) => {
            setActiveCollectionId(e.target.value)
            setActiveItemId(null)
            revokeSrc()
            setItemSrc(null)
          }}
          className={inputCls}
          aria-label="Collection"
        >
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.items.length})
            </option>
          ))}
        </select>
        <input
          value={newCollectionName}
          onChange={(e) => setNewCollectionName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void addCollection()}
          placeholder="New collection name"
          className={`${inputCls} w-40`}
        />
        <button type="button" onClick={() => void addCollection()} className={btnCls}>
          + Collection
        </button>
        {collections.length > 1 && (
          <button
            type="button"
            onClick={() => void removeCollection()}
            className={`${btnCls} text-[var(--bad)]`}
          >
            Delete
          </button>
        )}
      </div>

      {/* Add reference */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void addUrl()}
          placeholder="Instagram post/reel URL(s) or a direct video URL"
          className={`${inputCls} min-w-0 flex-1`}
        />
        <button type="button" onClick={() => void addUrl()} className={btnCls}>
          Add URL
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`${btnCls} border-[var(--accent-dim)] text-[var(--accent)]`}
        >
          Upload video
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void addFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search names, URLs, IG codes…"
          className={`${inputCls} min-w-0 flex-1`}
          aria-label="Search saved references"
        />
        {allIgItems.length > 0 && (
          <button
            type="button"
            onClick={() => void saveAllInApp()}
            disabled={Boolean(saving) || uncachedIg.length === 0}
            className={`${btnCls} border-[var(--accent-dim)] text-[var(--accent)] disabled:opacity-50`}
            title="Download every Instagram reel into this app so they play without Instagram"
          >
            {saving
              ? `Saving ${saving.current}/${saving.total}…`
              : uncachedIg.length === 0
                ? 'All IG videos in app'
                : `Save all in app (${uncachedIg.length})`}
          </button>
        )}
        <button
          type="button"
          onClick={exportLibrary}
          className={btnCls}
          title="Download a JSON backup of every saved URL and name"
        >
          Export library
        </button>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className={btnCls}
          title="Restore URLs from a Shape Lab library JSON file"
        >
          Import
        </button>
        <button
          type="button"
          onClick={() => void copyAllUrls()}
          className={btnCls}
          title="Copy every saved Instagram/direct URL"
        >
          Copy URLs
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void importLibraryFile(file)
            e.target.value = ''
          }}
        />
      </div>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Paste one Instagram link or a list (spaces or new lines). Public reels
        download into this app the first time they play — or hit Save all in app.
        Search by name, URL, or IG code. Drag or use ↑↓ to reorder (not while
        searching). Rename anytime. Export library downloads a JSON of every URL
        so a tunnel change cannot wipe the list. The list also saves on the app
        server, so Preview and the public link share it.
      </p>

      {error && (
        <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-[var(--panel-border)] bg-[#152018] px-3 py-2 text-sm text-[var(--text)]">
          {notice}
        </p>
      )}

      {collections.every((c) => c.items.filter((i) => i.url).length === 0) && (
        <div className="rounded-lg border border-[var(--warn)]/40 bg-[#2a2415] px-3 py-2 text-sm leading-relaxed text-[var(--text)]">
          <p>
            This preview has no saved URLs. Browsers keep the list{' '}
            <em>per web address</em>, so a new preview looks empty even when the
            old one still has everything.
          </p>
          <p className="mt-2">
            Open the same link you used when you pasted — that copy will sync onto
            the app server and then show up here:{' '}
            <a
              className="text-[var(--accent)] underline break-all"
              href={RECOVERY_ORIGIN}
              target="_blank"
              rel="noreferrer"
            >
              {RECOVERY_ORIGIN}
            </a>
          </p>
          <p className="mt-2 text-[var(--muted)]">
            Or use Import / paste the list again. After it appears, click Export
            library.
          </p>
        </div>
      )}

      {activeCollection && (currentHits.length > 0 || otherHits.length > 0) && (
        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto panel-scroll">
          {searching && (
            <p className="text-xs text-[var(--muted)]">
              {currentHits.length + otherHits.length} match
              {currentHits.length + otherHits.length === 1 ? '' : 'es'}
              {searching ? ' — reorder is paused while you search' : ''}
            </p>
          )}
          {currentHits.length > 0 && (
            <ul className="flex flex-col gap-1">
              {currentHits.map((item, index) =>
                renderRow(item, {
                  collection: activeCollection,
                  index,
                  total: currentHits.length,
                  allowReorder: !searching,
                }),
              )}
            </ul>
          )}
          {otherHits.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                In other collections
              </p>
              {otherHits.map((hit) => (
                <div key={hit.item.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void jumpToHit(hit)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--muted)] hover:bg-[#243040] hover:text-[var(--text)]"
                  >
                    <span className="rounded bg-[#0d1218] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                      {KIND_LABEL[hit.item.kind]}
                    </span>
                    <span className="truncate">{hit.item.name}</span>
                    <span className="shrink-0 truncate text-[10px] text-[var(--muted)]">
                      {hit.collection.name}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {searching && currentHits.length === 0 && otherHits.length === 0 && (
        <p className="text-sm text-[var(--muted)]">No saved URLs match that search.</p>
      )}

      {/* Player */}
      {activeItem?.kind === 'instagram' && activeItem.url ? (
        <InstagramEmbed
          url={activeItem.url}
          itemId={activeItem.id}
          onCached={markCached}
        />
      ) : itemSrc ? (
        <VideoWorkbench src={itemSrc} allowAbLoop />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--panel-border)] text-sm text-[var(--muted)]">
          {activeCollection?.items.length
            ? searching
              ? 'Select a match above'
              : 'Select a reference above'
            : 'Add a reference video to this collection'}
        </div>
      )}
    </section>
  )
}
