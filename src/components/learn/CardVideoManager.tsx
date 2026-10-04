import { useEffect, useMemo, useRef, useState } from 'react'
import { TECHNIQUE_EVIDENCE, evidenceKeyForSkill, type ProofVideo } from '../../config/techniqueEvidence'
import { TRACK_LABELS, guideSkillsInOrder, guidelessSkills, searchSkills } from '../../lib/skillRegistry'
import { systemSkillCards } from '../../lib/coachSystems'
import { markedFetch } from '../../lib/authSession'
import { getCollections } from '../../lib/clipStore'
import { useClipLoopsOptional, type ClipLoopPreset } from '../../lib/clipLoops'
import { normalizeVideoUrl } from '../../lib/socialUrls'
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
      const key = normalizeVideoUrl(v.url)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(v)
    }
  }
  return out
}

type PickerVideo = ProofVideo & {
  source: 'evidence' | 'compare'
  keywords: string[]
}

/** Videos from the compare-section reference library (IndexedDB collections). */
async function compareLibraryVideos(): Promise<PickerVideo[]> {
  const out: PickerVideo[] = []
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
          watchFor: item.name || '',
          source: 'compare',
          keywords: item.keywords ?? [],
        })
      }
    }
  } catch {
    /* IndexedDB unavailable */
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

/** Add a video to a skill card's admin list by evidence key. */
export async function addVideoToSkillCard(evidenceKey: string, video: ProofVideo): Promise<void> {
  const current = await fetch('/api/skill-card-videos').then((r) => (r.ok ? r.json() : {}))
  const data = current as Record<string, ProofVideo[]>
  const list = data[evidenceKey] ?? []
  const key = normalizeVideoUrl(video.url)
  if (list.some((v) => normalizeVideoUrl(v.url) === key)) return
  // Also skip if the video is already in the card's built-in evidence.
  const base = TECHNIQUE_EVIDENCE[evidenceKey] ?? []
  if (base.some((v) => normalizeVideoUrl(v.url) === key)) return
  const next = { ...data, [evidenceKey]: [...list, video] }
  await markedFetch('/api/admin/skill-card-videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(next),
  })
}

/**
 * Admin modal: pick a video from the reference library or upload a new one,
 * then add it to the card. Tap a row to expand an inline preview.
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
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Lock the page behind the sheet while it's open: a swipe inside the sheet
  // must scroll the sheet itself, never the feed underneath it.
  useEffect(() => {
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void compareLibraryVideos().then((vs) => {
      if (!cancelled) setCompareVideos(vs)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const videos = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all: PickerVideo[] = [
      ...libraryVideos().map((v) => ({ ...v, source: 'evidence' as const, keywords: [] as string[] })),
      ...compareVideos,
    ]
    const seen = new Set<string>()
    return all.filter((v) => {
      if (seen.has(v.url) || existingUrls.has(v.url)) return false
      seen.add(v.url)
      if (!q) return true
      const hay = `${v.who} ${v.watchFor} ${v.url} ${v.keywords.join(' ')}`.toLowerCase()
      return q.split(/\s+/).every((tok) => hay.includes(tok))
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl bg-neutral-900 p-4 [-webkit-overflow-scrolling:touch] [touch-action:pan-y] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Add video to this card</h3>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-bold text-white/70">
            Close
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-900/50 p-2 text-sm text-red-200">{error}</p>}

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
          className="mb-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Upload a new video'}
        </button>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keyword, name, who posted it…"
          className="mb-2 w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-white/40"
        />
        <p className="mb-2 text-[11px] text-white/40">
          Tap a video to preview it inline. {videos.length} video{videos.length === 1 ? '' : 's'} available.
        </p>
        <div className="grid gap-1.5">
          {videos.slice(0, 100).map((v) => {
            const expanded = expandedUrl === v.url
            return (
              <div key={v.url} className="overflow-hidden rounded-lg bg-neutral-800">
                <button
                  type="button"
                  onClick={() => setExpandedUrl(expanded ? null : v.url)}
                  className="w-full p-2.5 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">{v.who}</div>
                      <div className="truncate text-xs text-white/60">
                        {[v.watchFor, v.keywords.slice(0, 3).join(' · ')].filter(Boolean).join(', ') || v.url}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-white/40">
                      {v.source === 'compare' ? 'Library' : 'Evidence'} {expanded ? '▾' : '▸'}
                    </span>
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-white/10 p-2.5">
                    <div className="mx-auto aspect-[9/16] max-w-[220px] overflow-hidden rounded-xl bg-black">
                      {isLocalVideo(v.url) ? (
                        <video src={v.url} controls playsInline preload="metadata" className="h-full w-full object-contain" />
                      ) : (
                        <InstagramEmbed url={v.url} compact bare />
                      )}
                    </div>
                    <div className="mt-2 grid gap-2">
                      <input
                        value={who}
                        onChange={(e) => setWho(e.target.value)}
                        placeholder={`Who's in it (default: ${v.who})`}
                        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-white/40"
                      />
                      <input
                        value={watchFor}
                        onChange={(e) => setWatchFor(e.target.value)}
                        placeholder="What to watch for (one line)"
                        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-white/40"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onAdd({
                            url: v.url,
                            who: who.trim() || v.who,
                            watchFor: watchFor.trim() || v.watchFor,
                          })
                        }
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
                      >
                        Add this video
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {videos.length === 0 && <p className="py-4 text-center text-sm text-white/50">No matches.</p>}
        </div>
      </div>
    </div>
  )
}

/**
 * Admin: from a reference video, pick a skill-path card, set loop points,
 * and add the video to that card.
 */
export function AddToSkillCardModal({
  video,
  coachId,
  isAdmin,
  onClose,
}: {
  video: { url: string; who: string; watchFor: string }
  coachId: string | null
  isAdmin: boolean
  onClose: () => void
}) {
  const allSkills = useMemo(() => {
    // Non-admin coaches only see their own system's cards, never Ryan's.
    if (!isAdmin && coachId) {
      const own = systemSkillCards(coachId)
      if (own.length > 0) {
        // Map SkillDef to the shape the picker expects (no guideId/track for coach skills).
        return own.map((s) => ({ ...s, guideId: null as string | null, track: 'foundation' as const }))
      }
    }
    return [...guideSkillsInOrder(), ...guidelessSkills()]
  }, [coachId, isAdmin])
  const [query, setQuery] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [alreadyOn, setAlreadyOn] = useState<Set<string>>(new Set())
  const [loopA, setLoopA] = useState('')
  const [loopB, setLoopB] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [presetId, setPresetId] = useState<string | null>(null)
  const clipLoops = useClipLoopsOptional()
  const presets: ClipLoopPreset[] = clipLoops?.getSet(video.url)?.presets ?? []

  // Lock the page behind the sheet while it's open: a swipe inside the sheet
  // must scroll the sheet itself, never the feed underneath it.
  useEffect(() => {
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [])

  const local = isLocalVideo(video.url)

  // Which cards already have this video — shown checked and unselectable.
  // Compares by normalized URL so the same IG post with different URL
  // forms still matches, and checks both admin-added videos and the
  // card's built-in evidence list.
  useEffect(() => {
    let live = true
    const key = normalizeVideoUrl(video.url)
    fetch('/api/skill-card-videos')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!live) return
        const on: string[] = []
        for (const [k, list] of Object.entries(data as Record<string, ProofVideo[]>)) {
          if (Array.isArray(list) && list.some((v) => normalizeVideoUrl(v.url) === key)) on.push(k)
        }
        for (const [k, list] of Object.entries(TECHNIQUE_EVIDENCE)) {
          if (on.includes(k)) continue
          if (list.some((v) => normalizeVideoUrl(v.url) === key)) on.push(k)
        }
        setAlreadyOn(new Set(on))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [video.url])

  /** Every skill on the map, guided first; search narrows across all of them. */
  const matches = useMemo(() => {
    const q = query.trim()
    if (!q) return allSkills
    return searchSkills(q, 60).map((h) => h.skill)
  }, [query, allSkills])

  const selectedNames = useMemo(() => {
    return allSkills
      .filter((s) => selectedKeys.has(evidenceKeyForSkill(s)))
      .map((s) => s.name)
  }, [allSkills, selectedKeys])

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleAdd = async () => {
    if (selectedKeys.size === 0) return
    setSaving(true)
    setError(null)
    try {
      const preset = presets.find((p) => p.id === presetId)
      const a = preset ? preset.a : loopA.trim() === '' ? undefined : Number(loopA)
      const b = preset ? preset.b : loopB.trim() === '' ? undefined : Number(loopB)
      const v: ProofVideo = { url: video.url, who: video.who, watchFor: video.watchFor }
      if (a !== undefined && !Number.isNaN(a)) v.startAt = a
      if (b !== undefined && !Number.isNaN(b)) v.endAt = b
      let count = 0
      for (const key of selectedKeys) {
        if (alreadyOn.has(key)) continue
        await addVideoToSkillCard(key, v)
        count += 1
      }
      setDoneCount(count)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add video')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[390] flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl bg-neutral-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] [touch-action:pan-y] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Add to a skill card</h3>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-bold text-white/70">
            Close
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-900/50 p-2 text-sm text-red-200">{error}</p>}

        {done ? (
          <div className="py-6 text-center">
            <p className="text-base font-bold text-emerald-400">Added ✓</p>
            <p className="mt-1 text-sm text-white/60">
              {doneCount} card{doneCount === 1 ? '' : 's'}: {selectedNames.slice(0, 3).join(', ')}
              {selectedNames.length > 3 ? ` +${selectedNames.length - 3} more` : ''}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-xl bg-neutral-800 px-6 py-2.5 text-sm font-bold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-3 aspect-[9/16] max-w-[120px] overflow-hidden rounded-xl bg-black">
              {local ? (
                <video src={video.url} controls playsInline preload="metadata" className="h-full w-full object-contain" />
              ) : (
                <InstagramEmbed url={video.url} compact bare />
              )}
            </div>
            <p className="mb-3 text-center text-xs text-white/60">{video.watchFor || video.who}</p>

            <label className="mb-1 block text-xs font-bold text-white/70">Skill cards, tap to select, already-added show ✓</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search every skill on the map…"
              className="mb-2 w-full rounded-lg bg-neutral-800 px-3 py-2.5 text-sm text-white placeholder:text-white/40"
            />
            <div className="mb-3 max-h-56 overflow-y-auto rounded-lg bg-neutral-800">
              {matches.map((s) => {
                const key = evidenceKeyForSkill(s)
                const onCard = alreadyOn.has(key)
                const selected = selectedKeys.has(key)
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={onCard}
                    onClick={() => toggleKey(key)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm ${
                      onCard
                        ? 'cursor-default text-white/40'
                        : selected
                          ? 'bg-emerald-600 font-bold text-white'
                          : 'text-white/85 hover:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-black ${
                        onCard || selected ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-white/30 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className="flex-1">{s.name}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${selected ? 'text-white/80' : 'text-white/40'}`}>
                      {onCard ? 'On card' : s.guideId ? TRACK_LABELS[s.track] : 'Guide coming'}
                    </span>
                  </button>
                )
              })}
              {matches.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-white/50">No skills match.</p>
              )}
            </div>

            {presets.length > 0 && (
              <>
                <label className="mb-1 block text-xs font-bold text-white/70">
                  Saved A/B loop <span className="font-normal text-white/40">(or enter manually below)</span>
                </label>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPresetId(null)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      presetId === null ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-white/60'
                    }`}
                  >
                    None
                  </button>
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPresetId(presetId === p.id ? null : p.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                        presetId === p.id ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-white/60'
                      }`}
                    >
                      {p.name} ({p.a.toFixed(1)}–{p.b.toFixed(1)}s)
                    </button>
                  ))}
                </div>
              </>
            )}

            <label className="mb-1 block text-xs font-bold text-white/70">
              Loop points <span className="font-normal text-white/40">(seconds, optional)</span>
            </label>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <input
                value={loopA}
                onChange={(e) => setLoopA(e.target.value)}
                placeholder="Start (A)"
                inputMode="decimal"
                className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
              <input
                value={loopB}
                onChange={(e) => setLoopB(e.target.value)}
                placeholder="End (B)"
                inputMode="decimal"
                className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
            </div>

            <button
              type="button"
              disabled={saving || selectedKeys.size === 0}
              onClick={handleAdd}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? 'Adding…' : selectedKeys.size === 0 ? 'Select cards above' : `Add to ${selectedKeys.size} card${selectedKeys.size === 1 ? '' : 's'}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
