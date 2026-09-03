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
import { mediaCacheId, saveInstagramInApp } from '../../lib/igCache'
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
import { defaultSocialName, clipLoopKey, postedByFromUrl } from '../../lib/socialUrls'
import { useFavorites } from '../../lib/favorites'
import { FavoriteStar } from '../FavoriteStar'
import { SHAPES } from '../../config/shapes'
import { InstagramEmbed } from './InstagramEmbed'
import { prefetchNeighborClips } from '../../lib/igCache'
import { VideoWorkbench } from './VideoWorkbench'
import { ClipOrganizeMenu } from '../library/ClipOrganizeMenu'
import { PhoneReelViewer } from '../PhoneReelViewer'
import { ShareReference } from '../share/ShareReference'
import { clipShareDraft } from '../../lib/shareReference'
import { CollapsibleSection } from '../CollapsibleSection'
import { SegmentedTabs } from '../SegmentedTabs'
import { useCompareLayout } from './compareLayout'
import { LIBRARY_CHANGED_EVENT } from '../../lib/libraryEvents'
import { HudCircle, IconClips, IconPip, IconSwap, CompareControlsButton } from './CompareHud'
import { collectionsFromSkillRefs, isVirtualCoachRefCollection } from '../../lib/coachSkillRefs'
import { subscribeCoachContent } from '../../lib/coachContentStore'

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
  /** Full-screen watch + list viewer — quieter chrome, no page card. */
  viewer?: boolean
  handoffSrc?: string | null
  handoffName?: string | null
  handoffItemId?: string | null
}

export function ReferencePane({
  gymEditor = false,
  personalEditor = false,
  profileId = null,
  viewer = false,
  handoffSrc = null,
  handoffName = null,
  handoffItemId = null,
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
  const [dragColId, setDragColId] = useState<string | null>(null)
  const [skillCols, setSkillCols] = useState<RefCollection[]>(() => collectionsFromSkillRefs())
  const [libraryReady, setLibraryReady] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle')
  const [clipHudOpen, setClipHudOpen] = useState(false)
  const [clipHudAll, setClipHudAll] = useState(false)
  const [showAllKeywords, setShowAllKeywords] = useState(false)
  const [desk, setDesk] = useState<'watch' | 'browse' | 'add' | 'keep'>('watch')
  const [reelOpen, setReelOpen] = useState(false)
  const [reelIndex, setReelIndex] = useState(0)
  const { fullscreen, refRail, focus, setFocus } = useCompareLayout()
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const allCollections = useMemo(
    () => [...skillCols, ...collections.filter((c) => !isVirtualCoachRefCollection(c))],
    [skillCols, collections],
  )
  const activeCollection =
    allCollections.find((c) => c.id === activeCollectionId) ?? null
  const activeItem =
    activeCollection?.items.find((i) => i.id === activeItemId) ?? null
  const searching = searchQuery.trim().length > 0
  const pip = fullscreen && focus === 'cam'

  const refreshCachedIds = useCallback(async (cols: RefCollection[]) => {
    const keys = cols.flatMap((c) =>
      c.items.flatMap((item) =>
        item.url ? [item.id, mediaCacheId(item.id, item.url)] : [item.id],
      ),
    )
    const found = await listCachedIds(keys)
    const ids = new Set<string>()
    for (const col of cols) {
      for (const item of col.items) {
        if (found.has(item.id) || (item.url && found.has(mediaCacheId(item.id, item.url)))) {
          ids.add(item.id)
        }
      }
    }
    setCachedIds(ids)
  }, [])

  const canEditLibrary = gymEditor || personalEditor

  const canEditCollection = (col: RefCollection | null) => {
    if (!col || isVirtualCoachRefCollection(col)) return false
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

  useEffect(() => {
    const onChange = () => {
      void getCollections().then((list) => {
        setCollections(
          list.filter(
            (c) => isGymCollection(c) || (profileId != null && c.athleteId === profileId),
          ),
        )
      })
    }
    window.addEventListener(LIBRARY_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(LIBRARY_CHANGED_EVENT, onChange)
  }, [profileId])

  useEffect(() => {
    const clips = collections.flatMap((c) =>
      c.items
        .filter((item) => item.url)
        .map((item) => ({ id: item.id, url: item.url! })),
    )
    if (clips.length) {
      const idx = Math.max(0, clips.findIndex((c) => c.id === activeItemId))
      prefetchNeighborClips(clips, idx >= 0 ? idx : 0, 2)
    }
  }, [collections, activeItemId])

  const revokeSrc = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  useEffect(() => {
    if (!handoffItemId && !handoffSrc) return
    let cancelled = false
    revokeSrc()
    setNotice(handoffName ? `Reference: ${handoffName}` : 'Playing the replay as the reference.')
    setError(null)
    if (handoffItemId) {
      setActiveItemId(handoffItemId)
      void getBlob(handoffItemId).then((blob) => {
        if (cancelled) return
        if (blob) {
          const url = URL.createObjectURL(blob)
          objectUrlRef.current = url
          setItemSrc(url)
          return
        }
        if (handoffSrc) setItemSrc(handoffSrc)
      })
    } else if (handoffSrc) {
      setActiveItemId(null)
      setItemSrc(handoffSrc)
    }
    return () => {
      cancelled = true
    }
  }, [handoffItemId, handoffSrc, handoffName])

  const selectItem = async (item: RefItem, collection?: RefCollection) => {
    setError(null)
    revokeSrc()
    if (collection && collection.id !== activeCollectionId) {
      setActiveCollectionId(collection.id)
    }
    setActiveItemId(item.id)
    if (!fullscreen && desk !== 'watch' && desk !== 'browse') setDesk('watch')
    if (isSocialVideoItem(item)) {
      setItemSrc(null)
    } else if (item.kind === 'file' || !item.url) {
      const blob = await getBlob(item.id)
      if (!blob) {
        setError('Stored video not found — it may have been cleared by the browser.')
        setItemSrc(null)
        return
      }
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      setItemSrc(url)
    } else {
      const blob = await getBlob(item.id)
      if (blob) {
        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url
        setItemSrc(url)
      } else {
        setItemSrc(item.url ?? null)
      }
    }
    const scope = collection ?? collections.find((c) => c.id === activeCollectionId)
    const list = (scope?.items ?? [])
      .filter((row): row is RefItem & { url: string } => Boolean(row.url))
      .map((row) => ({ id: row.id, url: row.url }))
    if (list.length > 0) {
      const idx = list.findIndex((row) => row.id === item.id)
      prefetchNeighborClips(list, Math.max(0, idx), 2)
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
        ...(postedByFromUrl(url) ? { postedBy: postedByFromUrl(url)! } : {}),
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

  const canDeleteItem = (item: RefItem, collection: RefCollection | null) => {
    void item
    return canEditCollection(collection)
  }

  const removeItem = async (item: RefItem, collection = activeCollection) => {
    if (!collection || !canDeleteItem(item, collection)) return
    const who = gymEditor
      ? 'This removes it from the gym library after you save into the app.'
      : 'This only removes it from your collection — Ryan’s gym clips stay.'
    if (!confirm(`Remove “${item.name}” from ${collection.name}?\n\n${who}`)) return
    await deleteBlob(item.id)
    if (item.url) await deleteBlob(mediaCacheId(item.id, item.url)).catch(() => {})
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

  const persistOrder = async (collection: RefCollection, nextItems: RefItem[]) => {
    if (!canEditCollection(collection)) return
    if (nextItems === collection.items) return
    await updateCollection({ ...collection, items: nextItems })
  }

  const onMove = async (item: RefItem, dir: -1 | 1, collection = activeCollection) => {
    if (!collection) return
    await persistOrder(collection, moveItem(collection.items, item.id, dir))
  }

  const onDropOn = async (targetId: string, collection = activeCollection) => {
    if (!collection || !dragId || dragColId !== collection.id) {
      setDragId(null)
      setDragColId(null)
      return
    }
    await persistOrder(collection, reorderItems(collection.items, dragId, targetId))
    setDragId(null)
    setDragColId(null)
  }

  const markCached = useCallback((id: string) => {
    setCachedIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  useEffect(() => subscribeCoachContent(() => setSkillCols(collectionsFromSkillRefs())), [])

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
      ? allCollections
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
  const hudGroups = useMemo(() => {
    const scope = clipHudAll || q
      ? allCollections
      : activeCollection
        ? [activeCollection]
        : allCollections
    return scope
      .map((col) => ({
        col,
        items: col.items.filter((item) => !q || itemMatchesQuery(item, q)),
      }))
      .filter((row) => row.items.length > 0)
  }, [allCollections, activeCollection, clipHudAll, q])
  const watchList = desk === 'browse' ? currentHits : (activeCollection?.items ?? [])
  const reelItems = watchList.flatMap((item) =>
    item.url
      ? [
          {
            id: item.id,
            name: item.name,
            url: item.url,
            kind: item.kind,
            keywords: item.keywords,
            postedBy: item.postedBy,
            loopA: item.trimStart ?? null,
            loopB: item.trimEnd ?? null,
          },
        ]
      : [],
  )
  const openReel = (itemId?: string | null) => {
    const idx = itemId ? reelItems.findIndex((i) => i.id === itemId) : reelItems.findIndex((i) => i.id === activeItemId)
    setReelIndex(idx >= 0 ? idx : 0)
    setReelOpen(true)
  }

  const allKeywords = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const col of allCollections) {
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
  }, [allCollections])

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
      quiet?: boolean
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
        onDragStart={() => {
          setDragId(item.id)
          setDragColId(opts.collection.id)
        }}
        onDragOver={(e) => {
          if (!opts.allowReorder) return
          e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          void onDropOn(item.id, opts.collection)
        }}
        onDragEnd={() => {
          setDragId(null)
          setDragColId(null)
        }}
      >
        {opts.allowReorder && (
          <span className="flex shrink-0 flex-col">
            <button
              type="button"
              disabled={opts.index === 0}
              onClick={() => void onMove(item, -1, opts.collection)}
              className={`rounded px-1.5 py-0.5 text-sm leading-none disabled:opacity-30 ${
                viewer ? 'text-white/70 hover:text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
              aria-label={`Move ${item.name} up`}
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={opts.index === opts.total - 1}
              onClick={() => void onMove(item, 1, opts.collection)}
              className={`rounded px-1.5 py-0.5 text-sm leading-none disabled:opacity-30 ${
                viewer ? 'text-white/70 hover:text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
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
              {!opts.quiet && (
                <span className="rounded bg-[#0d1218] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                  {KIND_LABEL[item.kind]}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.name}</span>
                {(item.postedBy || (item.url && postedByFromUrl(item.url))) && (
                  <span className="block truncate text-[10px] text-[var(--muted)]">
                    @{item.postedBy || postedByFromUrl(item.url!)}
                  </span>
                )}
                {opts.collection.id !== activeCollectionId ? (
                  <span className="block truncate text-[10px] text-[var(--muted)]">
                    in {opts.collection.name}
                  </span>
                ) : null}
                {!opts.quiet && item.keywords && item.keywords.length > 0 ? (
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
              {!opts.quiet && isSocialVideoItem(item) && (
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
            {!opts.quiet && canEditLibrary && (
              <ClipOrganizeMenu
                clip={{
                  name: item.name,
                  url: item.url,
                  kind: item.kind,
                  keywords: item.keywords,
                  postedBy: item.postedBy,
                  sourceId: item.id,
                }}
                editor={{ gymEditor, personalEditor, profileId }}
                gymAdmin={gymEditor}
                onCopied={setNotice}
              />
            )}
            {item.url && (
              <ShareReference
                variant="row"
                draft={clipShareDraft(item.name, item.url, item.trimStart, item.trimEnd)}
              />
            )}
          </>
        )}
        {canDeleteItem(item, opts.collection) && (
        <button
          type="button"
          onClick={() => void removeItem(item, opts.collection)}
          className="rounded px-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--bad)]"
          title={gymEditor ? 'Remove from the gym library' : 'Remove a clip you added'}
        >
          Delete
        </button>
        )}
      </li>
    )
  }

  const shareDraft =
    activeItem?.url
      ? clipShareDraft(
          activeItem.name,
          activeItem.url,
          activeItem.trimStart,
          activeItem.trimEnd,
        )
      : null

  const hudCorner =
    fullscreen && !pip ? (
      <>
        <HudCircle
          label="Clip"
          active={clipHudOpen}
          onClick={() =>
            setClipHudOpen((open) => {
              if (open) return false
              setClipHudAll(false)
              return true
            })
          }
        >
          <IconClips />
        </HudCircle>
        <HudCircle label={focus === 'split' ? 'Min' : 'Swap'} onClick={() => setFocus(focus === 'cam' ? 'ref' : 'cam')}>
          {focus === 'split' ? <IconPip /> : <IconSwap />}
        </HudCircle>
        {shareDraft ? (
          <ShareReference variant="story" draft={shareDraft} className="pointer-events-auto" />
        ) : null}
      </>
    ) : null

  const renderPlayer = (fill: boolean) => (
    <div
      className={
        fill
          ? viewer
            ? 'relative min-h-0 max-lg:max-h-[34dvh] lg:min-h-0 lg:flex-1'
            : 'relative min-h-0 flex-1'
          : 'sticky top-2 z-10 min-w-0 bg-[var(--panel)] max-lg:[&_video]:max-h-[min(36vh,16.5rem)] lg:static'
      }
    >
      {activeItem && isSocialVideoItem(activeItem) ? (
        <InstagramEmbed
          url={activeItem.url}
          itemId={activeItem.id}
          onCached={markCached}
          postedBy={activeItem.postedBy || postedByFromUrl(activeItem.url)}
          onPostedBy={(handle) => {
            if (!activeCollection) return
            if (activeItem.postedBy === handle) return
            void updateCollection({
              ...activeCollection,
              items: activeCollection.items.map((i) =>
                i.id === activeItem.id ? { ...i, postedBy: handle } : i,
              ),
            })
          }}
          fill={fill}
          persistUrl={activeItem.url}
          hudCorner={hudCorner}
          bare={pip}
          compact={Boolean(viewer)}
          quiet={Boolean(viewer)}
          markup={!viewer && !pip}
        />
      ) : itemSrc ? (
        <VideoWorkbench
          src={itemSrc}
          allowAbLoop
          fill={fill}
          persistUrl={activeItem?.url}
          loopA={activeItem?.trimStart ?? null}
          loopB={activeItem?.trimEnd ?? null}
          hudCorner={hudCorner}
          bare={pip}
          compact={Boolean(viewer)}
          markup={!viewer && !pip}
        />
      ) : (
        <div
          className={`relative flex items-center justify-center text-sm ${
            fill
              ? 'h-full min-h-0 text-white/55'
              : 'h-48 rounded-lg border border-dashed border-[var(--panel-border)] text-[var(--muted)]'
          }`}
        >
          {!libraryReady
            ? 'Loading saved references…'
            : activeCollection?.items.length
              ? searching
                ? 'Select a match in the list'
                : 'Select a clip in the list'
              : 'Add a reference video to this collection'}
          {hudCorner ? (
            <div className="pointer-events-auto absolute right-2 top-2 z-[35] flex flex-col items-center gap-3">
              {hudCorner}
            </div>
          ) : null}
          {fill && !pip && !viewer ? (
            <div className="pointer-events-auto absolute left-1.5 top-2 z-[35]">
              <CompareControlsButton />
            </div>
          ) : null}
        </div>
      )}
      {pip && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 z-[46] rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          Ref
        </span>
      )}
      {viewer && reelItems.length > 0 && (
        <button
          type="button"
          onClick={() => openReel(activeItemId)}
          className="absolute bottom-2 right-2 z-[40] rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-lg"
        >
          Full screen
        </button>
      )}
      {!pip && !fullscreen && activeItem?.url && shareDraft ? (
        <div className="pointer-events-auto absolute right-2 top-2 z-[40]">
          <ShareReference variant="story" draft={shareDraft} />
        </div>
      ) : null}
      {clipHudOpen && fill && !pip && (
        <div className="pointer-events-auto absolute left-2 top-14 bottom-[5.75rem] z-[42] flex w-[min(16.75rem,46vw)] flex-col overflow-hidden rounded-2xl bg-[#0b0f14]/92 text-white shadow-[0_18px_48px_rgba(0,0,0,0.55)] ring-1 ring-white/12 backdrop-blur-xl sm:bottom-24">
          <div className="flex items-center gap-2 px-3 pt-3">
            <p className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
              Clips{canEditCollection(activeCollection) ? ' · ↑↓ reorder' : ''}
            </p>
            <button
              type="button"
              onClick={() => setClipHudOpen(false)}
              className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/16"
            >
              Close
            </button>
          </div>
          <div className="px-3 pt-2">
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (e.target.value.trim()) setClipHudAll(true)
              }}
              placeholder="Search a shape or name"
              className="h-9 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white placeholder:text-white/40"
              aria-label="Search reference clips"
            />
          </div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto px-3 pb-2">
            <button
              type="button"
              onClick={() => setClipHudAll(true)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                clipHudAll || q
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/80'
              }`}
            >
              All
            </button>
            {allCollections
              .filter((c) => c.items.length > 0)
              .map((c) => {
                const on = !clipHudAll && !q && c.id === activeCollectionId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClipHudAll(false)
                      setSearchQuery('')
                      setActiveCollectionId(c.id)
                    }}
                    className={`max-w-[9rem] shrink-0 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      on ? 'bg-white text-black' : 'bg-white/10 text-white/80'
                    }`}
                  >
                    {c.name}
                  </button>
                )
              })}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {hudGroups.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/55">
                {q ? 'No clips match that search.' : 'No clips in this collection yet.'}
              </p>
            ) : (
              hudGroups.map(({ col, items }) => (
                <div key={col.id} className="mb-3">
                  {(clipHudAll || q || hudGroups.length > 1) && (
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      {col.name}
                    </p>
                  )}
                  <ul className="flex flex-col gap-1">
                    {items.map((item) => {
                      const on = item.id === activeItemId
                      const editing = canEditCollection(col)
                      const renaming = renamingId === item.id
                      const tagging = taggingId === item.id
                      return (
                        <li key={item.id} className="rounded-xl bg-white/10">
                          {renaming ? (
                            <form
                              className="px-3 py-2"
                              onSubmit={(e) => {
                                e.preventDefault()
                                void commitRename(item, col)
                              }}
                            >
                              <input
                                autoFocus
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onBlur={() => void commitRename(item, col)}
                                className="h-9 w-full rounded-lg bg-black/40 px-2 text-sm text-white"
                                aria-label="Rename clip"
                              />
                            </form>
                          ) : tagging ? (
                            <form
                              className="px-3 py-2"
                              onSubmit={(e) => {
                                e.preventDefault()
                                void commitTags(item, col)
                              }}
                            >
                              <input
                                autoFocus
                                value={tagDraft}
                                onChange={(e) => setTagDraft(e.target.value)}
                                onBlur={() => void commitTags(item, col)}
                                list="shape-keyword-suggestions"
                                placeholder="handstand, roundoff"
                                className="h-9 w-full rounded-lg bg-black/40 px-2 text-sm text-white"
                                aria-label="Clip tags"
                              />
                            </form>
                          ) : (
                            <div
                              className="flex items-start gap-1"
                              draggable={editing && !q && renamingId !== item.id && taggingId !== item.id}
                              onDragStart={() => {
                                setDragId(item.id)
                                setDragColId(col.id)
                              }}
                              onDragOver={(e) => {
                                if (!editing || q) return
                                e.preventDefault()
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                void onDropOn(item.id, col)
                              }}
                              onDragEnd={() => {
                                setDragId(null)
                                setDragColId(null)
                              }}
                            >
                              {editing && !q ? (
                                <span className="flex shrink-0 flex-col self-center pl-1">
                                  <button
                                    type="button"
                                    disabled={col.items[0]?.id === item.id}
                                    onClick={() => void onMove(item, -1, col)}
                                    className="rounded px-1.5 py-0.5 text-sm leading-none text-white/70 hover:text-white disabled:opacity-30"
                                    aria-label={`Move ${item.name} up`}
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    disabled={col.items[col.items.length - 1]?.id === item.id}
                                    onClick={() => void onMove(item, 1, col)}
                                    className="rounded px-1.5 py-0.5 text-sm leading-none text-white/70 hover:text-white disabled:opacity-30"
                                    aria-label={`Move ${item.name} down`}
                                  >
                                    ↓
                                  </button>
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => void selectItem(item, col)}
                                className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-sm ${
                                  on ? 'bg-white font-semibold text-black' : 'text-white'
                                }`}
                              >
                                {favorites.isUrlFavorite(itemFavoriteKey(item)) ? '★ ' : ''}
                                {item.name}
                                {item.keywords && item.keywords.length > 0 ? (
                                  <span className={`mt-0.5 block truncate text-[10px] ${on ? 'text-black/55' : 'text-white/45'}`}>
                                    {item.keywords.join(', ')}
                                  </span>
                                ) : null}
                              </button>
                              {editing ? (
                                <div className="flex shrink-0 flex-col py-1 pr-1">
                                  <button
                                    type="button"
                                    onClick={() => startRename(item)}
                                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white/70 hover:text-white"
                                  >
                                    Rename
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startTags(item)}
                                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white/70 hover:text-white"
                                  >
                                    Tags
                                  </button>
                                  {canDeleteItem(item, col) ? (
                                    <button
                                      type="button"
                                      onClick={() => void removeItem(item, col)}
                                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#ff8a8a] hover:text-white"
                                    >
                                      Delete
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <section
      className={
        fullscreen
          ? 'flex h-full min-h-0 flex-col overflow-hidden bg-black'
          : viewer
            ? 'flex h-full min-h-0 flex-col gap-2 overflow-hidden bg-[#0b0f14] px-1 pb-2 pt-1'
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
                  allCollections.flatMap((c) => c.items).find((i) => i.id === id) ??
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
      {!viewer && (
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Library
          </p>
          <h2 className="text-xl font-semibold tracking-tight">Reference video</h2>
        </div>
        {activeItem ? (
          <p className="max-w-[50%] truncate text-right text-xs text-[var(--muted)]">
            {activeItem.name}
          </p>
        ) : (
          <p className="text-xs text-[var(--muted)]">Play one, scroll the list</p>
        )}
      </div>
      )}

      {desk !== 'keep' && (
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={activeCollectionId ?? ''}
          onChange={(e) => {
            setActiveCollectionId(e.target.value)
            setActiveItemId(null)
            revokeSrc()
            setItemSrc(null)
          }}
          className={`${inputCls} min-w-0 flex-1`}
          aria-label="Collection"
        >
          {skillCols.length > 0 && (
            <optgroup label="Coach skill references">
              {skillCols.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.items.length})
                </option>
              ))}
            </optgroup>
          )}
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
        {activeItem && canDeleteItem(activeItem, activeCollection) && (
          <button
            type="button"
            onClick={() => void removeItem(activeItem, activeCollection)}
            className="rounded-lg border border-[var(--bad)]/50 px-3 py-1.5 text-sm font-semibold text-[var(--bad)] hover:bg-[#2a1518]"
          >
            Delete clip
          </button>
        )}
      </div>
      )}

      <SegmentedTabs
        value={desk}
        onChange={setDesk}
        tabs={[
          { id: 'watch', label: 'Watch' },
          { id: 'browse', label: 'Clips' },
          ...(canEditLibrary ? [{ id: 'add' as const, label: 'Add' }] : []),
          { id: 'keep', label: 'Library' },
        ]}
        badges={{
          browse: matchCount > 0 ? matchCount : undefined,
          keep: saveState === 'dirty' ? true : undefined,
        }}
      />

      {(desk === 'watch' || desk === 'browse') && (
        <div
          className={
            viewer
              ? 'grid min-h-0 flex-1 overflow-hidden gap-2 grid-rows-[minmax(0,34dvh)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)] lg:grid-rows-1'
              : 'grid items-start gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]'
          }
        >
          {renderPlayer(Boolean(viewer))}
          <div className={`flex min-h-0 min-w-0 flex-col ${viewer ? '' : 'gap-3'}`}>
          {viewer && reelItems.length > 0 && (
            <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openReel(activeItemId)}
                className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black"
              >
                Full screen reels
              </button>
              <p className="text-[11px] text-[var(--muted)]">
                Swipe the list, or open TikTok-style full screen
              </p>
            </div>
          )}
          <div
            className={
              viewer
                ? 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto panel-scroll'
                : 'flex flex-col gap-3'
            }
          >
          {desk === 'browse' && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search a shape — handstand, whip…"
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
          </div>
          )}
          {desk === 'browse' && allKeywords.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {(showAllKeywords ? allKeywords : allKeywords.slice(0, 8)).map((kw) => {
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
              {allKeywords.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setShowAllKeywords((v) => !v)}
                  className="rounded-full border border-[var(--panel-border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)]"
                >
                  {showAllKeywords ? 'Fewer' : `More (${allKeywords.length - 8})`}
                </button>
              ) : null}
            </div>
          ) : null}
          {activeCollection && (watchList.length > 0 || (desk === 'browse' && otherHits.length > 0)) ? (
            <div
              className={
                viewer
                  ? 'flex flex-col gap-2'
                  : 'flex max-h-[min(22rem,48vh)] flex-col gap-2 overflow-y-auto panel-scroll lg:max-h-[min(32rem,70vh)]'
              }
            >
              {desk === 'browse' && searching && otherHits.length > 0 && (
                <p className="text-xs text-[var(--muted)]">
                  {otherHits.length} from other collections
                </p>
              )}
              {watchList.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {watchList.map((item, index) =>
                    renderRow(item, {
                      collection: activeCollection,
                      index,
                      total: watchList.length,
                      allowReorder:
                        canEditCollection(activeCollection) &&
                        (desk === 'watch' || (!searching && !onlyFavorites)),
                      quiet: viewer,
                    }),
                  )}
                </ul>
              )}
              {desk === 'browse' && otherHits.length > 0 && (
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
                        quiet: viewer,
                      }),
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
          {desk === 'browse' && onlyFavorites && currentHits.length === 0 && otherHits.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              No favorite URLs yet. Star a clip, then open Favorites.
            </p>
          )}
          {desk === 'browse' && searching && currentHits.length === 0 && otherHits.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              No videos tagged or named “{q}”.
            </p>
          )}
          {desk === 'watch' && (activeCollection?.items.length ?? 0) === 0 && (
            <p className="text-sm text-[var(--muted)]">
              This collection is empty. Open Add to paste a URL.
            </p>
          )}
          </div>
          </div>
        </div>
      )}

      {desk === 'add' && canEditLibrary && (
        <div className={`flex flex-col gap-3 ${viewer ? 'min-h-0 flex-1 overflow-y-auto' : ''}`}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void addCollection()}
              placeholder={personalEditor ? 'New collection (yours)' : 'New collection name'}
              className={`${inputCls} min-w-0 flex-1`}
            />
            <button type="button" onClick={() => void addCollection()} className={btnCls}>
              + Collection
            </button>
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
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addUrl()}
            placeholder="Instagram, TikTok, Facebook, or a direct video URL"
            className={`${inputCls} w-full`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void addUrl()}
              list="shape-keyword-suggestions"
              placeholder="Keywords — handstand, whip"
              className={`${inputCls} min-w-0 flex-1`}
              aria-label="Shape keywords for this URL"
            />
            <button type="button" onClick={() => void addUrl()} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f]">
              Add URL
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`${btnCls} border-[var(--accent-dim)] text-[var(--accent)]`}
            >
              Upload
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
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Paste a public link (or a list). Keywords let search find the clip in every collection.
          </p>
        </div>
      )}

      {desk === 'keep' && (
        <div className={`flex flex-col gap-3 ${viewer ? 'min-h-0 flex-1 overflow-y-auto' : ''}`}>
          <div className="flex flex-wrap items-center gap-2">
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
                  ? 'Saving…'
                  : saveState === 'saved'
                    ? 'Saved'
                    : 'Save into the app'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void saveAllInApp()}
              disabled={Boolean(saving) || uncachedSocial.length === 0}
              className={`${btnCls} border-[var(--accent-dim)] text-[var(--accent)] disabled:opacity-50`}
            >
              {saving
                ? `Saving ${saving.current}/${saving.total}…`
                : uncachedSocial.length === 0
                  ? 'All videos in app'
                  : `Save all in app (${uncachedSocial.length})`}
            </button>
            <button type="button" onClick={exportLibrary} className={btnCls}>
              Export
            </button>
            {canEditLibrary && (
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className={btnCls}
              >
                Import
              </button>
            )}
            <button type="button" onClick={() => void copyAllUrls()} className={btnCls}>
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
          <CollapsibleSection
            title="How to organize"
            hint="Collections, tags, and backups"
            defaultOpen={false}
            inset
          >
            <div className="space-y-2 text-xs leading-relaxed text-[var(--muted)]">
              <p>
                <strong className="text-[var(--text)]">Create.</strong> Add a collection, then paste
                Instagram, TikTok, or Facebook links. Keywords — handstand, whip, roundoff — list
                every clip with that tag.
              </p>
              <p>
                <strong className="text-[var(--text)]">Organize.</strong> Reorder on Clips (not while
                searching). Rename or Tags anytime. Collect copies any reference into a list you can
                edit. Star a URL or A/B loop for Favorites.
              </p>
              <p>
                Videos download the first time they play, or use Save all in app.{' '}
                {gymEditor
                  ? 'Save into the app so later previews still have the gym list.'
                  : personalEditor
                    ? 'Your collections stay on this profile. Gym lists stay as Ryan left them.'
                    : 'Anyone can watch the gym library. Coaches add URLs in their own collections.'}{' '}
                Export is an extra JSON backup.
              </p>
            </div>
          </CollapsibleSection>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      )}
      {notice && desk !== 'watch' && desk !== 'browse' && (
        <p className="rounded-lg border border-[var(--panel-border)] bg-[#152018] px-3 py-2 text-sm text-[var(--text)]">
          {notice}
        </p>
      )}

      {libraryReady &&
        collections.every((c) => c.items.filter((i) => i.url).length === 0) &&
        desk === 'watch' && (
        <p className="text-sm text-[var(--muted)]">
          Open Add to paste a public video URL into this collection.
        </p>
      )}

      </>
      )}

      {fullscreen ? renderPlayer(true) : null}

      {reelOpen ? (
        <PhoneReelViewer
          items={reelItems}
          startIndex={reelIndex}
          onClose={() => setReelOpen(false)}
          editor={{ gymEditor, personalEditor, profileId }}
          gymAdmin={gymEditor}
          title="Reference reels"
          onCopied={setNotice}
        />
      ) : null}
      <datalist id="shape-keyword-suggestions">
        {SHAPE_TAG_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </section>
  )
}
