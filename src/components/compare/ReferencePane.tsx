/**
 * Compare tab — reference video pane.
 * Named collections stored in IndexedDB; each collection holds uploaded
 * video files (full loop/scrub control), direct video URLs, or Instagram
 * post/reel links (view-only public embed).
 */

import { useEffect, useRef, useState } from 'react'
import {
  deleteBlob,
  deleteCollection,
  getBlob,
  getCollections,
  isInstagramUrl,
  parseInstagramUrl,
  putBlob,
  putCollection,
  type RefCollection,
  type RefItem,
} from '../../lib/clipStore'
import { createId } from '../../lib/storage'
import { InstagramEmbed } from './InstagramEmbed'
import { VideoWorkbench } from './VideoWorkbench'

const KIND_LABEL: Record<RefItem['kind'], string> = {
  file: 'File',
  url: 'URL',
  instagram: 'IG',
}

export function ReferencePane() {
  const [collections, setCollections] = useState<RefCollection[]>([])
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [itemSrc, setItemSrc] = useState<string | null>(null)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const activeCollection =
    collections.find((c) => c.id === activeCollectionId) ?? null
  const activeItem =
    activeCollection?.items.find((i) => i.id === activeItemId) ?? null

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
        setCollections(list)
        setActiveCollectionId(list[0].id)
      } catch {
        setError('IndexedDB is unavailable in this browser — collections cannot be saved.')
      }
    })()
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

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
    setCollections((prev) => prev.map((c) => (c.id === next.id ? next : c)))
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
    setCollections((prev) => [...prev, col])
    setActiveCollectionId(col.id)
    setNewCollectionName('')
  }

  const removeCollection = async () => {
    if (!activeCollection) return
    if (!confirm(`Delete collection "${activeCollection.name}" and its saved videos?`)) return
    await deleteCollection(activeCollection)
    const rest = collections.filter((c) => c.id !== activeCollection.id)
    setCollections(rest)
    setActiveCollectionId(rest[0]?.id ?? null)
    setActiveItemId(null)
    revokeSrc()
    setItemSrc(null)
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
    const items: RefItem[] = urls.map((url) => {
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
      return {
        id: createId('ref'),
        kind: instagram ? 'instagram' : 'url',
        name,
        url,
        createdAt: new Date().toISOString(),
      }
    })
    await updateCollection({
      ...activeCollection,
      items: [...items, ...activeCollection.items],
    })
    setUrlInput('')
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
    await selectItem(item)
  }

  const removeItem = async (item: RefItem) => {
    if (!activeCollection) return
    if (item.kind === 'file') await deleteBlob(item.id)
    await updateCollection({
      ...activeCollection,
      items: activeCollection.items.filter((i) => i.id !== item.id),
    })
    if (activeItemId === item.id) {
      setActiveItemId(null)
      revokeSrc()
      setItemSrc(null)
    }
  }

  const inputCls =
    'rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2.5 py-1.5 text-sm'
  const btnCls =
    'rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm hover:bg-[#243040]'

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
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Paste one Instagram link or a list (spaces or new lines). Public reels
        play and loop in this tab — pause, scrub, slow-mo. No screen-recording
        needed. Upload a file only if you already have one.
      </p>

      {error && (
        <p className="rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      )}

      {/* Item list */}
      {activeCollection && activeCollection.items.length > 0 && (
        <ul className="flex max-h-36 flex-col gap-1 overflow-y-auto panel-scroll">
          {activeCollection.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void selectItem(item)}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  activeItemId === item.id
                    ? 'bg-[var(--accent-dim)]/30 text-[var(--text)]'
                    : 'text-[var(--muted)] hover:bg-[#243040] hover:text-[var(--text)]'
                }`}
              >
                <span className="rounded bg-[#0d1218] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                  {KIND_LABEL[item.kind]}
                </span>
                <span className="truncate">{item.name}</span>
              </button>
              <button
                type="button"
                onClick={() => void removeItem(item)}
                className="rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--bad)]"
                title="Remove from collection"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Player */}
      {activeItem?.kind === 'instagram' && activeItem.url ? (
        <InstagramEmbed url={activeItem.url} />
      ) : itemSrc ? (
        <VideoWorkbench src={itemSrc} allowAbLoop />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--panel-border)] text-sm text-[var(--muted)]">
          {activeCollection?.items.length
            ? 'Select a reference above'
            : 'Add a reference video to this collection'}
        </div>
      )}
    </section>
  )
}
