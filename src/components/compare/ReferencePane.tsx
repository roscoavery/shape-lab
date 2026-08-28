/**
 * Compare tab — reference video pane.
 * Named collections stored in IndexedDB; each collection holds uploaded
 * video files, direct video URLs, or Instagram / TikTok / Facebook links.
 * Social videos are downloaded into the app. Items can be renamed, tagged
 * with shape keywords, reordered, and searched across collections.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  deleteBlob,
  deleteCollection,
  getBlob,
  getCollections,
  isSameReferenceUrl,
  isSocialVideoItem,
  itemMatchesQuery,
  kindFromUrl,
  listCachedIds,
  mergeKeywords,
  moveItem,
  parseKeywords,
  canonicalReferenceUrl,
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
import { createId } from '../../lib/storage'
import { defaultSocialName } from '../../lib/socialUrls'
import { SHAPES } from '../../config/shapes'
import { InstagramEmbed } from './InstagramEmbed'
import { VideoWorkbench } from './VideoWorkbench'
import { CompareSplitBar } from './CompareSplitBar'
import { useCompareLayout } from './compareLayout'

const KIND_LABEL: Record<RefItem['kind'], string> = {
  file: 'File',
  url: 'URL',
  instagram: 'IG',
  tiktok: 'TT',
  facebook: 'FB',
}

const SHAPE_TAG_SUGGESTIONS = [
  ...new Set([
    ...SHAPES.map((s) => s.name),
    'roundoff',
    'back handspring',
    'whip',
    'cartwheel',
  ]),
]

type OtherHit = { item: RefItem; collection: RefCollection }

type Props = {
  persistToApp?: boolean
}

export function ReferencePane({ persistToApp = false }: Props) {
  const [collections, setCollections] = useState<RefCollection[]>([])
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [itemSrc, setItemSrc] = useState<string | null>(null)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [taggingId, setTaggingId] = useState<string | null>(null)
  const [tagDraft, setTagDraft] = useState('')
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<{ current: number; total: number } | null>(
    null,
  )
  const [dragId, setDragId] = useState<string | null>(null)
  const [libraryReady, setLibraryReady] = useState(false)
  const { fullscreen, refRail } = useCompareLayout()
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

  const persist = useCallback(
    (list: RefCollection[]) => {
      publishLibrary(list, persistToApp)
    },
    [persistToApp],
  )

  useEffect(() => {
    void (async () => {
      try {
        let list = await getCollections()
        list = await restoreMetaIfIndexedDbEmpty(list)
        const synced = await syncLibraryWithServer(list, persistToApp)
        list = synced.collections
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
        setCollections(list)
        persist(list)
        setActiveCollectionId((id) => id ?? list[0]!.id)
        await refreshCachedIds(list)
        const urlCount = list.reduce(
          (n, c) => n + c.items.filter((i) => i.url).length,
          0,
        )
        if (synced.pulled > 0) {
          setNotice(
            persistToApp
              ? `Ryan profile: ${urlCount} reference${urlCount === 1 ? '' : 's'} saved in the app. Add or delete a URL here and every browser keeps it.`
              : `Loaded ${urlCount} saved reference${urlCount === 1 ? '' : 's'} into this app.`,
          )
        } else if (persistToApp) {
          setNotice(
            'Ryan is selected — add or delete a URL here and it saves into the app for every browser.',
          )
        }
      } catch {
        setError('IndexedDB is unavailable in this browser — collections cannot be saved.')
      } finally {
        setLibraryReady(true)
      }
    })()
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [refreshCachedIds, persistToApp, persist])

  const revokeSrc = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  const selectItem = async (item: RefItem, collection?: RefCollection) => {
    setError(null)
    revokeSrc()
    if (collection && collection.id !== activeCollectionId) {
      setActiveCollectionId(collection.id)
    }
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
      persist(list)
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
      persist(list)
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
    persist(rest)
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
      setError('Paste full URL(s) starting with http(s):// — Instagram, TikTok, Facebook, or a direct video URL.')
      return
    }
    setError(null)
    setNotice(null)

    const keywords = parseKeywords(keywordInput)
    const nextItems = activeCollection.items.map((i) => ({ ...i }))
    const items: RefItem[] = []
    let skipped = 0
    let taggedExisting = 0
    for (const raw of urls) {
      const url = canonicalReferenceUrl(raw)
      const dupNew = items.some((i) => i.url && isSameReferenceUrl(i.url, url))
      if (dupNew) {
        skipped += 1
        continue
      }
      const existingMatch = nextItems.find(
        (i) => i.url && isSameReferenceUrl(i.url, url),
      )
      if (existingMatch) {
        skipped += 1
        if (keywords.length) {
          const merged = mergeKeywords(existingMatch.keywords, keywords)
          if (merged.join('\0') !== (existingMatch.keywords ?? []).join('\0')) {
            existingMatch.keywords = merged
            taggedExisting += 1
          }
        }
        continue
      }
      const kind = kindFromUrl(url)
      items.push({
        id: createId('ref'),
        kind,
        name: kind === 'url' ? (() => {
          try {
            const path = new URL(url).pathname.split('/').filter(Boolean)
            return path[path.length - 1] || url
          } catch {
            return url
          }
        })() : defaultSocialName(url),
        url,
        ...(keywords.length ? { keywords } : {}),
        createdAt: new Date().toISOString(),
      })
    }
    if (items.length === 0 && taggedExisting === 0) {
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
      items: [...items, ...nextItems],
    })
    setUrlInput('')
    setKeywordInput('')
    if (taggedExisting && items.length === 0) {
      setNotice(
        `Added keywords to ${taggedExisting} existing clip${taggedExisting === 1 ? '' : 's'}.`,
      )
    } else if (skipped) {
      setNotice(
        `Added ${items.length}, skipped ${skipped} already in this collection${
          taggedExisting ? `, tagged ${taggedExisting}` : ''
        }.`,
      )
    }
    const first = items[0]
    if (first) await selectItem(first)
  }

  const addFile = async (file: File) => {
    if (!activeCollection) return
    setError(null)
    const keywords = parseKeywords(keywordInput)
    const item: RefItem = {
      id: createId('ref'),
      kind: 'file',
      name: file.name,
      ...(keywords.length ? { keywords } : {}),
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
    setKeywordInput('')
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
    if (taggingId === item.id) setTaggingId(null)
  }

  const startRename = (item: RefItem) => {
    setTaggingId(null)
    setRenamingId(item.id)
    setRenameDraft(item.name)
  }

  const startTags = (item: RefItem) => {
    setRenamingId(null)
    setTaggingId(item.id)
    setTagDraft((item.keywords ?? []).join(', '))
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

  const commitTags = async (item: RefItem, collection = activeCollection) => {
    if (taggingId !== item.id) return
    const keywords = parseKeywords(tagDraft)
    setTaggingId(null)
    if (!collection) return
    const prev = item.keywords ?? []
    if (prev.join('\0') === keywords.join('\0')) return
    await updateCollection({
      ...collection,
      items: collection.items.map((i) =>
        i.id === item.id
          ? { ...i, keywords: keywords.length ? keywords : undefined }
          : i,
      ),
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

  const allSocialItems = useMemo(
    () => collections.flatMap((c) => c.items.filter(isSocialVideoItem)),
    [collections],
  )
  const uncachedSocial = allSocialItems.filter((i) => !cachedIds.has(i.id))

  const saveAllInApp = async () => {
    if (uncachedSocial.length === 0 || saving) return
    setError(null)
    setNotice(null)
    const failures: string[] = []
    for (let i = 0; i < uncachedSocial.length; i++) {
      const item = uncachedSocial[i]
      setSaving({ current: i + 1, total: uncachedSocial.length })
      try {
        await saveInstagramInApp(item.id, item.url)
        markCached(item.id)
      } catch (err) {
        failures.push(item.name)
        if (err instanceof Error && /storage|quota/i.test(err.message)) {
          setError('Device storage is full — some videos could not be saved in the app.')
          break
        }
      }
    }
    setSaving(null)
    if (failures.length) {
      setNotice(
        `Could not save ${failures.length} video${failures.length === 1 ? '' : 's'}: ${failures.slice(0, 3).join(', ')}${failures.length > 3 ? '…' : ''}. Private clips will not download.`,
      )
    } else {
      setNotice(
        `Saved ${uncachedSocial.length} video${uncachedSocial.length === 1 ? '' : 's'} in this app.`,
      )
    }
  }

  const exportLibrary = () => {
    if (collections.every((c) => c.items.length === 0)) {
      setNotice('Nothing to export yet — add URLs first.')
      return
    }
    downloadBackupFile(collections)
    persist(collections)
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
      persist(next)
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
  const matchCount = currentHits.length + otherHits.length
  const q = searchQuery.trim()

  const allKeywords = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const col of collections) {
      for (const item of col.items) {
        for (const tag of item.keywords ?? []) {
          const key = tag.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)
          out.push(tag)
        }
      }
    }
    out.sort((a, b) => a.localeCompare(b))
    return out
  }, [collections])

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
        draggable={opts.allowReorder && renamingId !== item.id && taggingId !== item.id}
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
        ) : taggingId === item.id ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void commitTags(item, opts.collection)
            }}
          >
            <span className="rounded bg-[#0d1218] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
              Tags
            </span>
            <input
              autoFocus
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setTaggingId(null)
                }
              }}
              onBlur={() => void commitTags(item, opts.collection)}
              list="shape-keyword-suggestions"
              placeholder="handstand, roundoff, whip"
              className={`${inputCls} min-w-0 flex-1 py-1`}
              aria-label="Shape keywords"
            />
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void selectItem(item, opts.collection)}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                isActive
                  ? 'bg-[var(--accent-dim)]/30 text-[var(--text)]'
                  : 'text-[var(--muted)] hover:bg-[#243040] hover:text-[var(--text)]'
              }`}
            >
              <span className="rounded bg-[#0d1218] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                {KIND_LABEL[item.kind]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.name}</span>
                {opts.collection.id !== activeCollectionId ? (
                  <span className="block truncate text-[10px] text-[var(--muted)]">
                    in {opts.collection.name}
                  </span>
                ) : null}
                {item.keywords && item.keywords.length > 0 ? (
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    {item.keywords.map((kw) => (
                      <span
                        key={kw}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSearchQuery(kw)
                        }}
                        className="cursor-pointer rounded-full bg-[#0d1218] px-1.5 py-0 text-[10px] text-[var(--muted)] hover:bg-[var(--accent-dim)] hover:text-[var(--text)]"
                        title={`Show every video tagged ${kw}`}
                      >
                        {kw}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
              {isSocialVideoItem(item) && (
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
            <button
              type="button"
              onClick={() => startTags(item)}
              className="rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
              title="Add shape keywords so you can search every clip with this shape"
            >
              Tags
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
    <section
      className={
        fullscreen
          ? 'flex h-full min-h-0 flex-col overflow-hidden bg-black'
          : 'flex flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4'
      }
    >
      {fullscreen && refRail
        ? createPortal(
            <select
              value={activeItemId ?? ''}
              onChange={(e) => {
                const id = e.target.value
                const item =
                  collections.flatMap((c) => c.items).find((i) => i.id === id) ??
                  activeCollection?.items.find((i) => i.id === id)
                if (item) void selectItem(item)
              }}
              className="w-full rounded-lg bg-white/10 px-2 py-1.5 text-[11px] text-white"
              aria-label="Reference clip"
            >
              {(activeCollection?.items ?? []).map((item) => (
                <option key={item.id} value={item.id} className="text-black">
                  {item.name}
                </option>
              ))}
            </select>,
            refRail,
          )
        : null}
      {!fullscreen && (
      <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Reference video</h2>
          <span className="text-xs text-[var(--muted)]">the technique to copy</span>
        </div>
        <CompareSplitBar where="reference" />
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
          placeholder="Instagram, TikTok, or Facebook video URL(s), or a direct video URL"
          className={`${inputCls} min-w-0 flex-1`}
        />
        <input
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void addUrl()}
          list="shape-keyword-suggestions"
          placeholder="Keywords — handstand, whip"
          className={`${inputCls} w-full sm:w-52`}
          aria-label="Shape keywords for this URL"
        />
        <datalist id="shape-keyword-suggestions">
          {SHAPE_TAG_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
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
          placeholder="Search a shape — handstand, whip, roundoff…"
          className={`${inputCls} min-w-0 flex-1`}
          aria-label="Search saved references by name, URL, or keyword"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className={`${btnCls} text-[var(--muted)]`}
          >
            Clear
          </button>
        ) : null}
        {allSocialItems.length > 0 && (
          <button
            type="button"
            onClick={() => void saveAllInApp()}
            disabled={Boolean(saving) || uncachedSocial.length === 0}
            className={`${btnCls} border-[var(--accent-dim)] text-[var(--accent)] disabled:opacity-50`}
            title="Download every social video into this app so they play without the original site"
          >
            {saving
              ? `Saving ${saving.current}/${saving.total}…`
              : uncachedSocial.length === 0
                ? 'All videos in app'
                : `Save all in app (${uncachedSocial.length})`}
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
      {allKeywords.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {allKeywords.map((kw) => {
            const on = q.toLowerCase() === kw.toLowerCase()
            return (
              <button
                key={kw}
                type="button"
                onClick={() => setSearchQuery(on ? '' : kw)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                  on
                    ? 'border-[var(--accent)] bg-[var(--accent-dim)]/40 text-[var(--text)]'
                    : 'border-[var(--panel-border)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {kw}
              </button>
            )
          })}
        </div>
      ) : null}
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Paste Instagram, TikTok, or Facebook links (or a list). Add keywords
        for the shape — handstand, whip, roundoff — so a search lists every
        video with that tag, including clips in other collections. Public
        videos download into this app the first time they play — or hit Save
        all in app. Drag or use ↑↓ to reorder (not while searching). Rename
        or tap Tags anytime. The named URL list (and keywords) saves into the
        app so later previews still have it. Export library is an extra JSON
        backup.
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

      {libraryReady &&
        collections.every((c) => c.items.filter((i) => i.url).length === 0) && (
        <p className="rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-3 text-sm text-[var(--muted)]">
          Paste a public Instagram, TikTok, or Facebook video URL to start this collection. Rename it after it
          lands — names and URLs save into the app.
        </p>
      )}

      {activeCollection && (currentHits.length > 0 || otherHits.length > 0) && (
        <div className={`flex ${searching ? 'max-h-80' : 'max-h-56'} flex-col gap-2 overflow-y-auto panel-scroll`}>
          {searching && (
            <p className="text-xs text-[var(--muted)]">
              {matchCount} video{matchCount === 1 ? '' : 's'} matching “{q}”
              {otherHits.length
                ? ` · ${otherHits.length} from other collections`
                : ''}
              {' — reorder is paused while you search'}
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
              <ul className="flex flex-col gap-1">
                {otherHits.map((hit, index) =>
                  renderRow(hit.item, {
                    collection: hit.collection,
                    index,
                    total: otherHits.length,
                    allowReorder: false,
                  }),
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {searching && currentHits.length === 0 && otherHits.length === 0 && (
        <p className="text-sm text-[var(--muted)]">
          No videos tagged or named “{q}”. Tap Tags on a clip, or add that
          keyword when you paste the URL.
        </p>
      )}

      </>
      )}

      {/* Player */}
      <div className={fullscreen ? 'min-h-0 flex-1' : ''}>
      {activeItem && isSocialVideoItem(activeItem) ? (
        <InstagramEmbed
          url={activeItem.url}
          itemId={activeItem.id}
          onCached={markCached}
          fill={fullscreen}
        />
      ) : itemSrc ? (
        <VideoWorkbench src={itemSrc} allowAbLoop fill={fullscreen} />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--panel-border)] text-sm text-[var(--muted)]">
          {!libraryReady
            ? 'Loading saved references…'
            : activeCollection?.items.length
              ? searching
                ? 'Select a match above'
                : 'Select a reference above'
              : 'Add a reference video to this collection'}
        </div>
      )}
      </div>
    </section>
  )
}
