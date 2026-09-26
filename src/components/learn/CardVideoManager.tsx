import { useMemo, useRef, useState } from 'react'
import { TECHNIQUE_EVIDENCE, type ProofVideo } from '../../config/techniqueEvidence'
import { markedFetch } from '../../lib/authSession'

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
 * then add it to the card.
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
  const fileRef = useRef<HTMLInputElement>(null)

  const videos = useMemo(() => {
    const q = query.trim().toLowerCase()
    return libraryVideos().filter(
      (v) =>
        !existingUrls.has(v.url) &&
        (!q || v.who.toLowerCase().includes(q) || v.watchFor.toLowerCase().includes(q) || v.url.toLowerCase().includes(q)),
    )
  }, [query, existingUrls])

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
        <div className="grid gap-1.5">
          {videos.slice(0, 50).map((v) => (
            <button
              key={v.url}
              type="button"
              onClick={() =>
                onAdd({
                  url: v.url,
                  who: who.trim() || v.who,
                  watchFor: watchFor.trim() || v.watchFor,
                })
              }
              className="rounded-lg bg-neutral-800 p-2.5 text-left"
            >
              <div className="text-sm font-bold text-white">{v.who}</div>
              <div className="truncate text-xs text-white/60">{v.watchFor || v.url}</div>
            </button>
          ))}
          {videos.length === 0 && <p className="py-4 text-center text-sm text-white/50">No matches.</p>}
        </div>
      </div>
    </div>
  )
}
