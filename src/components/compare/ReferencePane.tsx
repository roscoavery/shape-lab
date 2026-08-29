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
  persistLibraryMeta,
  pushServerLibrary,
  restoreMetaIfIndexedDbEmpty,
  syncLibraryWithServer,
} from '../../lib/libraryBackup'
import {
  attachPersonalCollections,
  isGymCollection,
  pushCoachLibrary,
} from '../../lib/coachLibrary'
import { createId } from '../../lib/storage'
import { defaultSocialName, clipLoopKey } from '../../lib/socialUrls'
import { useFavorites } from '../../lib/favorites'
import { FavoriteStar } from '../FavoriteStar'
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
  /** Ryan: this browser can write the gym Compare library for every link. */
  gymEditor?: boolean
  /** Other coaches: write collections tagged to this profile only. */
  personalEditor?: boolean
  profileId?: string | null
}

export function ReferencePane({
  gymEditor = false,
  personalEditor = false,
  profileId = null,
}: Props) {
  const favorites = useFavorites()
  const [collections, setCollections] = useState<RefCollection[]>([])
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [itemSrc, setItemSrc] = useState<string | null>(null)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
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
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle')
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

  const canEditLibrary = gymEditor || personalEditor

  const canEditCollection = (col: RefCollection | null) => {
    if (!col) return false
    if (gymEditor && isGymCollection(col)) return true
    if (personalEditor && profileId && col.athleteId === profileId) return true
    return false
  }

  const persist = useCallback(
    (list: RefCollection[]) => {
      persistLibraryMeta(list.filter(isGymCollection))
      if (gymEditor) {
        setSaveState('dirty')
        void pushServerLibrary(list).then((ok) => {
          setSaveState(ok ? 'saved' : 'dirty')
        })
      }
      if (personalEditor && profileId) {
        const personal = list.filter((c) => c.athleteId === profileId)
        void pushCoachLibrary(profileId, personal)
      }
    },
    [gymEditor, personalEditor, profileId],
  )

  const saveIntoApp = async () => {
    if (!gymEditor) return
    setSaveState('saving')
    setError(null)
    try {
      const ok = await pushServerLibrary(collections.filter(isGymCollection))
      if (!ok) throw new Error('library put failed')
      persistLibraryMeta(collections.filter(isGymCollection))
      setSaveState('saved')
      const n = collections.reduce((sum, c) => sum + c.items.filter((i) => i.url).length, 0)
      setNotice(
        `Saved ${n} URL${n === 1 ? '' : 's'} into the app. Every link and browser will see this library.`,
      )
    } catch {
      setSaveState('dirty')
      setError('Could not save the library into the app — try again.')
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        let list = await getCollections()
        list = await restoreMetaIfIndexedDbEmpty(list)
        const synced = await syncLibraryWithServer(list, gymEditor, profileId)
        list = synced.collections.filter(
          (c) => isGymCollection(c) || (profileId != null && c.athleteId === profileId),
        )
        if (personalEditor && profileId) {
          list = await attachPersonalCollections(list, profileId)
        }
        if (list.length === 0) {
          const def: RefCollection = {
            id: createId('col'),
            name: 'My references',
            items: [],
            createdAt: new Date().toISOString(),
            ...(personalEditor && profileId ? { athleteId: profileId } : {}),
          }
          await putCollection(def)
          list = [def]
          if (personalEditor && profileId) persist([def])
        }
        if (cancelled) return
        setCollections(list)
        const firstWritable =
          list.find((c) => (personalEditor ? c.athleteId === profileId : isGymCollection(c))) ??
          list[0]
        setActiveCollectionId((id) =>
          id && list.some((c) => c.id === id) ? id : firstWritable?.id ?? list[0]!.id,
        )
        await refreshCachedIds(list)
        const gymCount = list
          .filter(isGymCollection)
          .reduce((n, c) => n + c.items.filter((i) => i.url).length, 0)
        const mineCount = list
          .filter((c) => c.athleteId === profileId)
          .reduce((n, c) => n + c.items.filter((i) => i.url).length, 0)
        if (gymEditor) {
          setNotice(
            gymCount > 0
              ? `${gymCount} reference${gymCount === 1 ? '' : 's'} in the gym library. Add, rename, or reorder, then Save into the app so every link keeps it.`
              : 'This is Ryan’s gym library. Add URLs and Save into the app so every browser has them.',
          )
        } else if (personalEditor) {
          setNotice(
            mineCount > 0
              ? `${gymCount} gym clip${gymCount === 1 ? '' : 's'} (watch only) · ${mineCount} in your collections. New URLs save on this profile — they do not change Ryan’s library.`
              : `${gymCount} gym clip${gymCount === 1 ? '' : 's'} (watch only). Create a collection or paste a URL to start yours. Ryan’s gym list stays as he left it.`,
          )
        } else if (gymCount > 0) {
          setNotice(
            `${gymCount} gym reference${gymCount === 1 ? '' : 's'} loaded. Coaches add URLs in their own collections. Unlock Ryan to edit the gym library.`,
          )
        }
      } catch {
        if (!cancelled) {
          setError('IndexedDB is unavailable in this browser — collections cannot be saved.')
        }
      } finally {
        if (!cancelled) setLibraryReady(true)
      }
    }
    void load()
    return () => {
      cancelled = true
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [refreshCachedIds, persist, gymEditor, personalEditor, profileId])

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
    if (!canEditCollection(next)) return
    await putCollection(next)
    setCollections((prev) => {
      const list = prev.map((c) => (c.id === next.id ? next : c))
      persist(list)
      return list
    })
  }

  const addCollection = async () => {
    if (!canEditLibrary) return
    const name = newCollectionName.trim()
    if (!name) return
    const col: RefCollection = {
      id: createId('col'),
      name,
      items: [],
      createdAt: new Date().toISOString(),
      ...(personalEditor && profileId ? { athleteId: profileId } : {}),
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
    if (!activeCollection || !canEditCollection(activeCollection)) return
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

  const ensureWritableCollection = async (): Promise<RefCollection | null> => {
    if (canEditCollection(activeCollection)) return activeCollection
    if (!personalEditor || !profileId) return null
    const mine = collections.find((c) => c.athleteId === profileId)
    if (mine) {
      setActiveCollectionId(mine.id)
      setNotice(
        'Gym collections stay as Ryan left them. This clip went into your collection.',
      )
      return mine
    }
    const col: RefCollection = {
      id: createId('col'),
      name: 'My references',
      items: [],
      createdAt: new Date().toISOString(),
      athleteId: profileId,
    }
    await putCollection(col)
    setCollections((prev) => {
      const list = [...prev, col]
      persist(list)
      return list
    })
    setActiveCollectionId(col.id)
    setNotice('Started your collection. Ryan’s gym list is unchanged.')
    return col
  }

  const addUrl = async () => {
    const writable = await ensureWritableCollection()
    if (!writable) return
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

    const keywords = parseKeywords(keywordInput)
    const nextItems = writable.items.map((i) => ({ ...i }))
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
      ...writable,
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
    const writable = await ensureWritableCollection()
    if (!writable) return
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
      ...writable,
      items: [item, ...writable.items],
    })
    setKeywordInput('')
    setCachedIds((prev) => new Set(prev).add(item.id))
    await selectItem(item)
  }

  const removeItem = async (item: RefItem, collection = activeCollection) => {
    if (!collection || !canEditCollection(collection)) return
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
    if (gymEditor) {
      setNotice('Renamed. Save into the app so every link and browser keeps this name.')
    } else if (personalEditor) {
      setNotice('Renamed. This name stays on your profile — not Ryan’s gym library.')
    }
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
    if (!activeCollection || !canEditCollection(activeCollection)) return
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
    const exportCols = gymEditor
      ? collections.filter(isGymCollection)
      : personalEditor && profileId
        ? collections.filter((c) => c.athleteId === profileId)
        : collections
    if (exportCols.every((c) => c.items.length === 0)) {
      setNotice('Nothing to export yet — add URLs first.')
      return
    }
    downloadBackupFile(exportCols)
    persist(collections)
    const n = exportCols.reduce(
      (sum, c) => c.items.filter((i) => i.url).length + sum,
      0,
    )
    setNotice(
      personalEditor
        ? `Downloaded a backup of ${n} URL${n === 1 ? '' : 's'} from your collections.`
        : `Downloaded a backup of ${n} saved URL${n === 1 ? '' : 's'}. Keep that JSON file — it outlives any tunnel link.`,
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
    if (!canEditLibrary) return
    setError(null)
    setNotice(null)
    try {
      const backup = parseLibraryBackup(await file.text())
      const incoming =
        personalEditor && profileId
          ? {
              ...backup,
              collections: backup.collections.map((c) => ({
                ...c,
                id: createId('col'),
                athleteId: profileId,
              })),
            }
          : {
              ...backup,
              collections: backup.collections.map((c) => {
                const { athleteId: _drop, ...rest } = c
                void _drop
                return rest
              }),
            }
      const { collections: next, added, skipped } = await mergeLibraryBackup(incoming)
      const visible =
        personalEditor && profileId
          ? await attachPersonalCollections(next.filter(isGymCollection), profileId)
          : next.filter(isGymCollection)
      setCollections(visible)
      persist(visible)
      await refreshCachedIds(visible)
      const urlsInFile = backupUrlCount(backup)
      setNotice(
        `Imported ${added} URL${added === 1 ? '' : 's'} (${urlsInFile} in file, ${skipped} skipped as duplicates or files). Hit Save all in app to download the videos.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that file.')
    }
  }

  const itemFavoriteKey = (item: RefItem) =>
    item.url ? clipLoopKey(item.url) : `item:${item.id}`

  const currentHits = (activeCollection?.items ?? []).filter((item) => {
    if (!itemMatchesQuery(item, searchQuery)) return false
    if (onlyFavorites && !favorites.isUrlFavorite(itemFavoriteKey(item))) return false
    return true
  })
  const otherHits: OtherHit[] =
    searching || onlyFavorites
      ? collections
          .filter((c) => c.id !== activeCollectionId)
          .flatMap((collection) =>
            collection.items
              .filter((item) => {
                if (!itemMatchesQuery(item, searchQuery)) return false
                if (onlyFavorites && !favorites.isUrlFavorite(itemFavoriteKey(item))) {
                  return false
                }
                return true
              })
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
            <FavoriteStar
              compact
              on={favorites.isUrlFavorite(itemFavoriteKey(item))}
              onClick={() => favorites.toggleUrlFavorite(itemFavoriteKey(item))}
              label={
                favorites.isUrlFavorite(itemFavoriteKey(item))
                  ? `Unfavorite ${item.name}`
                  : `Favorite ${item.name}`
              }
            />
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
            {canEditCollection(opts.collection) && (
            <button
              type="button"
              onClick={() => startRename(item)}
              className="rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
              title="Rename this reference"
            >
              Rename
            </button>
            )}
            {canEditCollection(opts.collection) && (
            <button
              type="button"
              onClick={() => startTags(item)}
              className="rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)]"
              title="Add shape keywords so you can search every clip with this shape"
            >
              Tags
            </button>
            )}
          </>
        )}
        {canEditCollection(opts.collection) && (
        <button
          type="button"
          onClick={() => void removeItem(item, opts.collection)}
          className="rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--bad)]"
          title="Remove from collection"
        >
          ✕
        </button>
        )}
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
                  {favorites.isUrlFavorite(itemFavoriteKey(item)) ? '★ ' : ''}
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
          {collections.some(isGymCollection) && (
            <optgroup label="Gym (Ryan)">
              {collections.filter(isGymCollection).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.items.length})
                </option>
              ))}
            </optgroup>
          )}
          {collections.some((c) => c.athleteId === profileId) && (
            <optgroup label="Your collections">
              {collections
                .filter((c) => c.athleteId === profileId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.items.length})
                  </option>
                ))}
            </optgroup>
          )}
        </select>
        {canEditLibrary && (
        <>
        <input
          value={newCollectionName}
          onChange={(e) => setNewCollectionName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void addCollection()}
          placeholder={personalEditor ? 'New collection (yours)' : 'New collection name'}
          className={`${inputCls} w-40`}
        />
        <button type="button" onClick={() => void addCollection()} className={btnCls}>
          + Collection
        </button>
        </>
        )}
        {activeCollection &&
          canEditCollection(activeCollection) &&
          (activeCollection.athleteId
            ? true
            : gymEditor && collections.filter(isGymCollection).length > 1) && (
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
      {canEditLibrary && (
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
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search a shape — handstand, whip, roundoff…"
          className={`${inputCls} min-w-0 flex-1`}
          aria-label="Search saved references by name, URL, or keyword"
        />
        <button
          type="button"
          aria-pressed={onlyFavorites}
          onClick={() => setOnlyFavorites((v) => !v)}
          className={
            onlyFavorites
              ? 'rounded-lg bg-[#f5d76e] px-3 py-1.5 text-sm font-semibold text-[#06281f]'
              : `${btnCls} text-[var(--muted)]`
          }
          title="Show starred URLs"
        >
          {onlyFavorites ? '★ Favorites' : '☆ Favorites'}
        </button>
        {q ? (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className={`${btnCls} text-[var(--muted)]`}
          >
            Clear
          </button>
        ) : null}
        {gymEditor && (
          <button
            type="button"
            onClick={() => void saveIntoApp()}
            disabled={saveState === 'saving'}
            className={
              saveState === 'dirty'
                ? 'rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f]'
                : `${btnCls} border-[var(--accent-dim)] text-[var(--accent)]`
            }
            title="Write this URL list into the app so every phone link and browser sees it"
          >
            {saveState === 'saving'
              ? 'Saving library…'
              : saveState === 'saved'
                ? 'Saved into the app'
                : 'Save into the app'}
          </button>
        )}
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
        <button
          type="button"
          onClick={exportLibrary}
          className={btnCls}
          title="Download a JSON backup of every saved URL and name"
        >
          Export library
        </button>
        {canEditLibrary && (
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className={btnCls}
          title="Restore URLs from a Shape Lab library JSON file"
        >
          Import
        </button>
        )}
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
        or tap Tags anytime. Star a URL or a saved A/B loop to find it later —
        Favorites filters this list.{' '}
        {gymEditor
          ? 'The named gym URL list saves into the app so later previews still have it.'
          : personalEditor
            ? 'Your collections save on this profile only. Gym collections stay as Ryan left them — you can watch them, not edit names, sizes, or the gym list.'
            : 'Anyone can watch the gym library. Coaches add URLs in their own collections. Unlock Ryan to edit the gym list, shape descriptions, or picture sizes.'}{' '}
        Export library is an extra JSON backup.
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
          {onlyFavorites && !searching && (
            <p className="text-xs text-[var(--muted)]">
              {matchCount} favorite URL{matchCount === 1 ? '' : 's'}
              {otherHits.length
                ? ` · ${otherHits.length} from other collections`
                : ''}
            </p>
          )}
          {currentHits.length > 0 && (
            <ul className="flex flex-col gap-1">
              {currentHits.map((item, index) =>
                renderRow(item, {
                  collection: activeCollection,
                  index,
                  total: currentHits.length,
                  allowReorder: !searching && canEditCollection(activeCollection),
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

      {onlyFavorites && currentHits.length === 0 && otherHits.length === 0 && (
        <p className="text-sm text-[var(--muted)]">
          No favorite URLs yet. Tap the star next to a clip, then open Favorites to
          jump back to it.
        </p>
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
          persistUrl={activeItem.url}
        />
      ) : itemSrc ? (
        <VideoWorkbench
          src={itemSrc}
          allowAbLoop
          fill={fullscreen}
          persistUrl={activeItem?.url}
        />
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
