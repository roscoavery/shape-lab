import { useEffect, useMemo, useRef, useState } from 'react'
import { TECHNIQUE_EVIDENCE, type ProofVideo } from '../../config/techniqueEvidence'
import { markedFetch } from '../../lib/authSession'
import { getCollections } from '../../lib/clipStore'
import { InstagramEmbed } from '../compare/InstagramEmbed'

function isLocalVideo(url: string): boolean {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(url)
}

/** All unique videos in the reference library, for the admin picker. */
export function libraryVideos(): ProofVideo[] {
  const seen = new Set<string>()
  const out: ProofVideo[] = []
  for (const list of Object.values(TECHNIQUE_EVIDENCE)) {
    for (const v of list) {
      if (seen.has(v.url)) continue
      seen.add(v.url)
      out.push(v)
    }
  }
  return out
}

/** Videos from the compare-section reference library (IndexedDB collections). */
async function compareLibraryVideos(): Promise<ProofVideo[]> {
  const out: ProofVideo[] = []
  const seen = new Set<string>()
  try {
    const collections = await getCollections()
    for (const col of collections) {
      for (const item of col.items ?? []) {
        const url = item.savedUrl || item.url
        if (!url || seen.has(url)) continue
        seen.add(url)
        out.push({
          url,
          who: item.postedBy || col.name || 'Reference library',
          watchFor: item.name || (item.keywords ?? []).join(', '),
        })
      }
    }
  } catch {
    /* IndexedDB unavailable */
  }
  return out
}

type PickerVideo = ProofVideo & { source: 'evidence' | 'compare' }

async function uploadVideo(file: File): Promise<string> {
  const res = await markedFetch(`/api/admin/video-upload?name=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Upload failed')
  }
  const data = (await res.json()) as { url?: string }
  if (!data.url) throw new Error('Upload failed')
  return data.url
}

/**
 * Admin modal: pick a video from the reference library or upload a new one,
 * then add it to the card. Tap a video to preview it before adding.
 */
export function AddCardVideoModal({
  existingUrls,
  onAdd,
  onClose,
}: {
  existingUrls: Set<string>
  onAdd: (video: ProofVideo) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [who, setWho] = useState('')
  const [watchFor, setWatchFor] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [compareVideos, setCompareVideos] = useState<PickerVideo[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    void compareLibraryVideos().then((vs) => {
      if (!cancelled) setCompareVideos(vs.map((v) => ({ ...v, source: 'compare' as const })))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const videos = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all: PickerVideo[] = [
      ...libraryVideos().map((v) => ({ ...v, source: 'evidence' as const })),
      ...compareVideos,
    ]
    const seen = new Set<string>()
    return all.filter((v) => {
      if (seen.has(v.url) || existingUrls.has(v.url)) return false
      seen.add(v.url)
      if (!q) return true
      return (
        v.who.toLowerCase().includes(q) ||
        v.watchFor.toLowerCase().includes(q) ||
        v.url.toLowerCase().includes(q)
      )
    })
  }, [query, existingUrls, compareVideos])

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const url = await uploadVideo(file)
      onAdd({
        url,
        who: who.trim() || 'Coach Ryan Williams',
        watchFor: watchFor.trim() || file.name,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const previewVideo = previewUrl ? videos.find((v) => v.url === previewUrl) : null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-neutral-900 p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Add video to this card</h3>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-bold text-white/70">
            Close
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-900/50 p-2 text-sm text-red-200">{error}</p>}

        {previewVideo ? (
          <div>
            <div className="mx-auto aspect-[9/16] max-w-[280px] overflow-hidden rounded-xl bg-black">
              {isLocalVideo(previewVideo.url) ? (
                <video src={previewVideo.url} controls playsInline className="h-full w-full object-contain" />
              ) : (
                <InstagramEmbed url={previewVideo.url} compact bare />
              )}
            </div>
            <p className="mt-2 text-center text-sm font-bold text-white">{previewVideo.who}</p>
            <p className="mt-0.5 text-center text-xs text-white/60">{previewVideo.watchFor}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-bold text-white"
              >
                Back to list
              </button>
              <button
                type="button"
                onClick={() =>
                  onAdd({
                    url: previewVideo.url,
                    who: who.trim() || previewVideo.who,
                    watchFor: watchFor.trim() || previewVideo.watchFor,
                  })
                }
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                Add this video
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              <input
                value={who}
                onChange={(e) => setWho(e.target.value)}
                placeholder={`Who's in it (default: ${previewVideo.who})`}
                className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
              <input
                value={watchFor}
                onChange={(e) => setWatchFor(e.target.value)}
                placeholder="What to watch for (one line)"
                className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 grid gap-2">
              <input
                value={who}
                onChange={(e) => setWho(e.target.value)}
                placeholder="Who's in it (e.g. Coach Ryan Williams)"
                className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
              <input
                value={watchFor}
                onChange={(e) => setWatchFor(e.target.value)}
                placeholder="What to watch for (one line)"
                className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleUpload(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="mb-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload a new video'}
            </button>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the reference library…"
              className="mb-2 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-white/40"
            />
            <p className="mb-2 text-[11px] text-white/40">
              Tap a video to preview it. {videos.length} video{videos.length === 1 ? '' : 's'} available.
            </p>
            <div className="grid gap-1.5">
              {videos.slice(0, 100).map((v) => (
                <button
                  key={v.url}
                  type="button"
                  onClick={() => setPreviewUrl(v.url)}
                  className="rounded-lg bg-neutral-800 p-2.5 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">{v.who}</div>
                      <div className="truncate text-xs text-white/60">{v.watchFor || v.url}</div>
                    </div>
                    <span className="shrink-0 text-xs text-white/40">
                      {v.source === 'compare' ? 'Library' : 'Evidence'} ›
                    </span>
                  </div>
                </button>
              ))}
              {videos.length === 0 && <p className="py-4 text-center text-sm text-white/50">No matches.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
