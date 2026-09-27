/**
 * Ryan's skill path, rendered as visual cards in the language of the
 * four-levels infographic: a header, labeled blocks, no walls of text.
 * Top-down: peak skills first, foundations last.
 */
import { useEffect, useRef, useState } from 'react'
import { RYAN_CUE_SWAPS } from '../../config/skillCues'
import { TECHNIQUE_EVIDENCE, type ProofVideo } from '../../config/techniqueEvidence'
import {
  GUIDE_ORDER,
  TRACK_LABELS,
  getRegistrySkillByGuideId,
  guidelessSkills,
  type UnifiedSkill,
  type UnifiedSkillTrack,
} from '../../lib/skillRegistry'
import { SkillMapView } from './SkillMapView'
import { InstagramEmbed } from '../compare/InstagramEmbed'
import { VideoTrimmer } from './VideoTrimmer'
import { AddCardVideoModal } from './CardVideoManager'
import { markedFetch } from '../../lib/authSession'

/** True for local video files (public/videos/...) vs social embeds. */
function isLocalVideo(url: string): boolean {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(url)
}

/** Native player for local video files, with A/B loop support. */
/** Native player for local video files, with A/B loop support.
 * Plays when mostly on screen, pauses when scrolled away. Simple and dumb. */
function LocalVideo({
  url,
  loopA,
  loopB,
}: {
  url: string
  loopA: number | null
  loopB: number | null
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const wantPlayRef = { current: false }
    const tryPlay = () => {
      if (wantPlayRef.current && v.paused) v.play().catch(() => {})
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        wantPlayRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.6
        if (wantPlayRef.current) tryPlay()
        else if (!v.paused) v.pause()
      },
      { threshold: [0, 0.6, 1] },
    )
    io.observe(v)
    v.addEventListener('canplay', tryPlay)
    return () => {
      io.disconnect()
      v.removeEventListener('canplay', tryPlay)
    }
  }, [url])

  return (
    <video
      ref={ref}
      src={url}
      controls
      playsInline
      muted
      loop={loopA == null && loopB == null}
      preload="metadata"
      className="h-full w-full object-contain"
      onTimeUpdate={(e) => {
        const v = e.currentTarget
        if (loopA != null && v.currentTime < loopA) v.currentTime = loopA
        if (loopB != null && v.currentTime >= loopB) {
          v.currentTime = loopA ?? 0
          v.play().catch(() => {})
        }
      }}
    />
  )
}

const STEP_COLORS = ['#2e7d4f', '#6a4fa3', '#d9732b', '#c93a3a']

/** Card header color for a guide card, cycling the same palette as the old list. */
export function guideCardColor(guideId: string): string {
  const i = GUIDE_ORDER.indexOf(guideId)
  return STEP_COLORS[(i < 0 ? 0 : i) % STEP_COLORS.length]
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-extrabold uppercase tracking-widest opacity-70">
      {children}
    </div>
  )
}

function fmtLoopTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/**
 * Coach-set A/B loop overrides for proof videos, keyed by video URL.
 * The config's startAt/endAt are the defaults; a coach's in-app tweak
 * wins until cleared. Tell Ryan's assistant the values to make them permanent.
 */
const PROOF_LOOP_KEY = 'shape-lab.proofLoops.v1'

type ProofLoop = { a: number | null; b: number | null }

function loadProofLoops(): Record<string, ProofLoop> {
  try {
    const raw = localStorage.getItem(PROOF_LOOP_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ProofLoop>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Loop-point editor for local videos: scrub the video, tap to set start/end. */
function LocalLoopEditor({
  url,
  loopA,
  loopB,
  onAbChange,
}: {
  url: string
  loopA: number | null
  loopB: number | null
  onAbChange: (a: number | null, b: number | null) => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [now, setNow] = useState(0)
  const setStart = () => {
    const t = ref.current?.currentTime ?? 0
    onAbChange(t, loopB != null && loopB > t ? loopB : null)
  }
  const setEnd = () => {
    const t = ref.current?.currentTime ?? 0
    onAbChange(loopA != null && loopA < t ? loopA : null, t)
  }
  return (
    <div className="rounded-xl bg-black p-1">
      <video
        ref={ref}
        src={url}
        controls
        playsInline
        preload="metadata"
        className="aspect-[9/16] w-full rounded-lg object-contain"
        onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
      />
      <div className="flex items-center gap-2 px-1 py-2">
        <button
          type="button"
          onClick={setStart}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          Set start
        </button>
        <button
          type="button"
          onClick={setEnd}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          Set end
        </button>
        {(loopA != null || loopB != null) && (
          <button
            type="button"
            onClick={() => onAbChange(null, null)}
            className="rounded-lg px-2 py-1.5 text-xs font-bold text-red-400"
          >
            Clear
          </button>
        )}
      </div>
      <div className="px-2 pb-2 text-[11px] text-white/70">
        {loopA != null || loopB != null
          ? `Loops ${loopA != null ? fmtLoopTime(loopA) : '0:00'} – ${loopB != null ? fmtLoopTime(loopB) : 'end'}`
          : `Scrub to the moment, then tap Set start / Set end. Now: ${fmtLoopTime(now)}`}
      </div>
    </div>
  )
}

export function ProofStrip({
  evidenceKey,
  matchName,
  coach,
  canEdit,
}: {
  evidenceKey: string
  matchName?: string
  coach: boolean
  canEdit: boolean
}) {
  const baseVideos = TECHNIQUE_EVIDENCE[evidenceKey] ?? []
  const [adminVideos, setAdminVideos] = useState<ProofVideo[]>([])
  const [loopEditUrl, setLoopEditUrl] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, ProofLoop>>(loadProofLoops)
  const [trimUrl, setTrimUrl] = useState<string | null>(null)
  const [bustMap, setBustMap] = useState<Record<string, number>>({})
  const [refMatches, setRefMatches] = useState<ProofVideo[]>([])
  const [showRefs, setShowRefs] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [hiddenUrls, setHiddenUrls] = useState<string[]>([])

  // Load admin-added videos for this card.
  useEffect(() => {
    let cancelled = false
    fetch('/api/skill-card-videos')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') {
          const list = (data as Record<string, ProofVideo[]>)[evidenceKey]
          if (Array.isArray(list)) setAdminVideos(list)
        }
      })
      .catch(() => {})
    fetch('/api/skill-card-hidden')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') {
          const list = (data as Record<string, string[]>)[evidenceKey]
          if (Array.isArray(list)) setHiddenUrls(list)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [evidenceKey])

  const hiddenSet = new Set(hiddenUrls)
  const videos = [...baseVideos.filter((v) => !hiddenSet.has(v.url)), ...adminVideos]
  const adminUrls = new Set(adminVideos.map((v) => v.url))
  const pinnedUrls = new Set(videos.map((v) => v.url))

  // Layer 2: auto-match reference library videos whose keywords mention this skill.
  useEffect(() => {
    if (!matchName) return
    let cancelled = false
    void (async () => {
      try {
        const { getCollections } = await import('../../lib/clipStore')
        const collections = await getCollections()
        const name = matchName.toLowerCase()
        const out: ProofVideo[] = []
        const seen = new Set<string>()
        for (const col of collections) {
          for (const item of col.items ?? []) {
            const url = item.savedUrl || item.url
            if (!url || seen.has(url) || pinnedUrls.has(url)) continue
            const kws = (item.keywords ?? []).map((k) => k.toLowerCase())
            const matched = kws.some((kw) => kw && (kw.includes(name) || name.includes(kw)))
            if (!matched) continue
            seen.add(url)
            out.push({
              url,
              who: item.postedBy || col.name || 'Reference library',
              watchFor: item.name || '',
            })
          }
        }
        if (!cancelled) setRefMatches(out)
      } catch {
        /* IndexedDB unavailable */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [matchName, evidenceKey])

  const saveAdminVideos = async (next: ProofVideo[]) => {
    setAdminVideos(next)
    try {
      const current = await fetch('/api/skill-card-videos').then((r) => (r.ok ? r.json() : {}))
      const data = { ...(current as Record<string, ProofVideo[]>), [evidenceKey]: next }
      await markedFetch('/api/admin/skill-card-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch {
      /* keep local state; will retry next change */
    }
  }

  const handleAddVideo = (video: ProofVideo) => {
    void saveAdminVideos([...adminVideos, video])
    setShowAddModal(false)
  }

  const handleRemoveVideo = (url: string) => {
    if (adminUrls.has(url)) {
      // Admin-added: delete it.
      void saveAdminVideos(adminVideos.filter((v) => v.url !== url))
    } else {
      // Built-in: hide it (reversible — re-add via the library picker).
      const next = [...hiddenUrls, url]
      setHiddenUrls(next)
      void (async () => {
        try {
          const current = await fetch('/api/skill-card-hidden').then((r) => (r.ok ? r.json() : {}))
          const data = { ...(current as Record<string, string[]>), [evidenceKey]: next }
          await markedFetch('/api/admin/skill-card-hidden', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
        } catch {
          /* keep local state; will retry next change */
        }
      })()
    }
  }

  const handleAbChange =
    (url: string) => (a: number | null, b: number | null) => {
      setOverrides((prev) => {
        const next = { ...prev }
        if (a == null && b == null) delete next[url]
        else next[url] = { a, b }
        try {
          localStorage.setItem(PROOF_LOOP_KEY, JSON.stringify(next))
        } catch {
          /* quota */
        }
        return next
      })
      // If an admin sets loop points on an admin-added video, save them as
      // the default for everyone.
      if (canEdit && adminUrls.has(url)) {
        const next = adminVideos.map((v) =>
          v.url === url ? { ...v, startAt: a ?? undefined, endAt: b ?? undefined } : v,
        )
        void saveAdminVideos(next)
      }
    }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>The proof</Label>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-bold text-emerald-400"
          >
            + Add video
          </button>
        )}
      </div>
      <p className="mt-1 text-xs opacity-70">
        Watch it taught and done.
      </p>
      <div className="mt-2 flex min-w-0 gap-3 overflow-x-auto pb-1">
        {videos.map((v) => {
          const override = overrides[v.url]
          const loopA = override?.a ?? v.startAt ?? null
          const loopB = override?.b ?? v.endAt ?? null
          const editing = coach && loopEditUrl === v.url
          const local = isLocalVideo(v.url)
          const bust = bustMap[v.url]
          const playUrl = bust ? `${v.url}?t=${bust}` : v.url
          return (
            <div key={v.url} className="w-64 shrink-0">
              {editing ? (
                local ? (
                  <LocalLoopEditor
                    url={playUrl}
                    loopA={loopA}
                    loopB={loopB}
                    onAbChange={handleAbChange(v.url)}
                  />
                ) : (
                  <div className="rounded-xl bg-black p-1">
                    <InstagramEmbed
                      url={v.url}
                      compact
                      playWhenVisible
                      loopA={loopA}
                      loopB={loopB}
                      onAbChange={handleAbChange(v.url)}
                    />
                  </div>
                )
              ) : (
                <div className="aspect-square overflow-hidden rounded-xl bg-black">
                  {local ? (
                    <LocalVideo url={playUrl} loopA={loopA} loopB={loopB} />
                  ) : (
                    <InstagramEmbed
                      url={v.url}
                      compact
                      bare
                      quiet
                      playWhenVisible
                      loopA={loopA}
                      loopB={loopB}
                      fit="contain"
                      fill
                      posterFirst
                    />
                  )}
                </div>
              )}
              <div className="mt-1 text-xs font-bold">{v.who}</div>
              <div className="text-[11px] opacity-70">{v.watchFor}</div>
              {(loopA != null || loopB != null) && !editing && (
                <div className="text-[10px] opacity-60">
                  Loops {loopA != null ? fmtLoopTime(loopA) : '0:00'}–
                  {loopB != null ? fmtLoopTime(loopB) : 'end'}
                </div>
              )}
              {editing && (loopA != null || loopB != null) && (
                <div className="text-[10px] opacity-60">
                  A/B {loopA != null ? fmtLoopTime(loopA) : '—'} –{' '}
                  {loopB != null ? fmtLoopTime(loopB) : '—'}
                </div>
              )}
              {coach && (
                <button
                  type="button"
                  onClick={() => setLoopEditUrl(editing ? null : v.url)}
                  className="mt-1 text-[11px] font-bold text-emerald-400"
                >
                  {editing ? 'Done' : 'Set loop'}
                </button>
              )}
              {canEdit && local && (
                <button
                  type="button"
                  onClick={() => setTrimUrl(v.url)}
                  className="mt-1 ml-2 text-[11px] font-bold text-amber-400"
                >
                  Trim
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleRemoveVideo(v.url)}
                  className="mt-1 ml-2 text-[11px] font-bold text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
          )
        })}
      </div>
      {refMatches.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowRefs((s) => !s)}
            className="flex w-full items-center justify-between rounded-lg bg-neutral-800/60 px-3 py-2 text-left"
          >
            <span className="text-xs font-bold text-white/80">
              More from the reference library ({refMatches.length})
            </span>
            <span className="text-xs text-white/40">{showRefs ? '▾' : '▸'}</span>
          </button>
          {showRefs && (
            <div className="mt-2 flex min-w-0 gap-3 overflow-x-auto pb-1">
              {refMatches.map((v) => {
                const local = isLocalVideo(v.url)
                return (
                  <div key={v.url} className="w-48 shrink-0">
                    <div className="aspect-[9/16] overflow-hidden rounded-xl bg-black">
                      {local ? (
                        <LocalVideo url={v.url} loopA={null} loopB={null} />
                      ) : (
                        <InstagramEmbed url={v.url} compact bare quiet playWhenVisible />
                      )}
                    </div>
                    <div className="mt-1 truncate text-xs font-bold">{v.who}</div>
                    <div className="truncate text-[11px] opacity-70">{v.watchFor}</div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          void saveAdminVideos([...adminVideos, v])
                          setRefMatches((prev) => prev.filter((x) => x.url !== v.url))
                        }}
                        className="mt-1 text-[11px] font-bold text-emerald-400"
                      >
                        Pin to top
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      {trimUrl && (
        <VideoTrimmer
          src={bustMap[trimUrl] ? `${trimUrl}?t=${bustMap[trimUrl]}` : trimUrl}
          label={videos.find((v) => v.url === trimUrl)?.who ?? 'Video'}
          onClose={() => setTrimUrl(null)}
          onSaved={() => {
            setBustMap((prev) => ({ ...prev, [trimUrl]: Date.now() }))
          }}
        />
      )}
      {showAddModal && (
        <AddCardVideoModal
          existingUrls={new Set(videos.map((v) => v.url))}
          onAdd={handleAddVideo}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}

/**
 * The inside of a guide card (needs / can-bend / ask / proof / Ryan's note).
 * Exported so the skill map modal can show the exact same card UI.
 */
export function SkillGuideCardContent({
  skill,
  color,
  coach,
  canEdit,
}: {
  skill: UnifiedSkill
  color: string
  coach: boolean
  canEdit: boolean
}) {
  const guideId = skill.guideId!
  const needs = skill.guideNeeds ?? []
  const canBend = skill.canBend ?? []
  return (
    <div className="space-y-4 p-4">
      <div>
        <Label>Needs</Label>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          {needs.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
      {canBend.length > 0 && (
        <div className="rounded-xl bg-[var(--panel-border)]/20 p-3">
          <Label>Can bend</Label>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {canBend.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <Label>Ask your coach</Label>
        <p className="mt-1 text-sm italic">{skill.ask}</p>
      </div>
      <ProofStrip evidenceKey={guideId} matchName={skill.name} coach={coach} canEdit={canEdit} />
      {skill.ryanNote && (
        <p className="border-l-2 pl-3 text-xs opacity-70" style={{ borderColor: color }}>
          Ryan: {skill.ryanNote}
        </p>
      )}
    </div>
  )
}

/**
 * Compact rows for registry skills that don't have a guide card yet.
 * Shows Ryan what's missing so he can fill them in (Phase 3 builder).
 * Collapsed by default — useful, but not what people come to the guide for.
 */
function GuidePlaceholders() {
  const [open, setOpen] = useState(false)
  const missing = guidelessSkills()
  if (missing.length === 0) return null
  const byTrack = new Map<UnifiedSkillTrack, UnifiedSkill[]>()
  for (const skill of missing) {
    const list = byTrack.get(skill.track) ?? []
    list.push(skill)
    byTrack.set(skill.track, list)
  }
  const tracks = [...byTrack.keys()].sort(
    (a, b) =>
      ['running', 'standing', 'walking', 'foundation'].indexOf(a) -
      ['running', 'standing', 'walking', 'foundation'].indexOf(b),
  )
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-left"
      >
        <span>
          <span className="block text-base font-extrabold">Waiting for a guide</span>
          <span className="mt-0.5 block text-xs opacity-70">
            {missing.length} skills in the registry without a guide card yet
          </span>
        </span>
        <span className="text-lg opacity-60" aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
      <div className="mt-4 space-y-4">
        {tracks.map((track) => (
          <div key={track}>
            <div className="text-[11px] font-extrabold uppercase tracking-widest opacity-70">
              {TRACK_LABELS[track]}
            </div>
            <div className="mt-2 space-y-2">
              {(byTrack.get(track) ?? [])
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-2.5"
                  >
                    <span className="text-sm font-bold">{skill.name}</span>
                    <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                      guide coming
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      )}
    </section>
  )
}

/**
 * Verbal cue swaps. Collapsed by default — useful, but not what people come
 * to the guide for.
 */
function CueSwaps() {
  const [open, setOpen] = useState(false)
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-left"
      >
        <span>
          <span className="block text-base font-extrabold">Verbal cues to reconsider</span>
          <span className="mt-0.5 block text-xs opacity-70">
            Common cues worth rethinking, what to try instead, and why
          </span>
        </span>
        <span className="text-lg opacity-60" aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {RYAN_CUE_SWAPS.map((cue) => (
            <article
              key={cue.id}
              className="min-w-0 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4"
            >
              <div className="text-sm font-bold text-red-400 line-through opacity-80 break-words">
                {cue.insteadOf}
              </div>
              <div className="mt-1 text-base font-extrabold text-emerald-400 break-words">
                {cue.sayThis}
              </div>
              <p className="mt-2 text-sm opacity-85 break-words">{cue.why}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function SkillPathCards({
  coach = false,
  canEdit = false,
  focusSkillId,
}: {
  coach?: boolean
  canEdit?: boolean
  focusSkillId?: string | null
}) {
  const [modalSkill, setModalSkill] = useState<UnifiedSkill | null>(() =>
    getRegistrySkillByGuideId(focusSkillId),
  )

  // Deep-linked from search: open the skill's card in the modal.
  useEffect(() => {
    if (!focusSkillId) return
    const skill = getRegistrySkillByGuideId(focusSkillId)
    if (skill) setModalSkill(skill)
  }, [focusSkillId])

  // Close the modal on Escape.
  useEffect(() => {
    if (!modalSkill) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalSkill(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalSkill])

  // Cue up proof videos while the guide is open: resolve the Instagram
  // manifests in the background (no video bytes yet) so opening a card
  // starts playback fast. YouTube / TikTok load on tap; local files need nothing.
  useEffect(() => {
    let cancelled = false
    const warm = () => {
      if (cancelled) return
      void (async () => {
        try {
          const { prefetchInstagram } = await import('../../lib/igCache')
          const { socialPlatform } = await import('../../lib/socialUrls')
          const seen = new Set<string>()
          const urls: string[] = []
          for (const guideId of GUIDE_ORDER) {
            for (const v of TECHNIQUE_EVIDENCE[guideId] ?? []) {
              if (!v.url || seen.has(v.url)) continue
              seen.add(v.url)
              if (v.url.startsWith('/')) continue
              if (socialPlatform(v.url) !== 'instagram') continue
              urls.push(v.url)
            }
          }
          for (const url of urls) {
            if (cancelled) break
            await prefetchInstagram(url, url, { download: false }).catch(() => {})
          }
        } catch {
          /* warmup only — the player shows the real error if a clip fails */
        }
      })()
    }
    // Let the guide paint first; warm during idle time.
    const t = setTimeout(warm, 1200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [])
  return (
    <div className="space-y-8">
      <section>
        <div>
          <h2 className="text-xl font-extrabold">The skill map</h2>
          <p className="mt-1 text-sm opacity-80">
            Foundations at the bottom, harder skills higher up. Tap any tile to
            open its guide card.
          </p>
        </div>
        <div className="mt-4">
          <SkillMapView onTileTap={setModalSkill} />
        </div>
      </section>

      <GuidePlaceholders />

      <CueSwaps />

      {modalSkill && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
          onClick={() => setModalSkill(null)}
          role="dialog"
          aria-modal="true"
          aria-label={modalSkill.name}
        >
          <div
            className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[var(--panel)] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <article
              id={modalSkill.guideId ? `skill-card-${modalSkill.guideId}` : undefined}
              className="overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-4 py-3 text-base font-extrabold text-white"
                style={{
                  backgroundColor: modalSkill.guideId
                    ? guideCardColor(modalSkill.guideId)
                    : '#3a3f45',
                }}
              >
                <span>{modalSkill.name}</span>
                <button
                  type="button"
                  onClick={() => setModalSkill(null)}
                  aria-label="Close"
                  className="rounded-full bg-black/25 px-3 py-1 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              {modalSkill.guideId ? (
                <SkillGuideCardContent
                  skill={modalSkill}
                  color={guideCardColor(modalSkill.guideId)}
                  coach={coach}
                  canEdit={canEdit}
                />
              ) : (
                <div className="space-y-3 p-4">
                  <span className="inline-block rounded-full bg-neutral-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                    guide coming
                  </span>
                  <p className="text-sm opacity-80">
                    This skill is on the map but its guide card isn't written
                    yet.
                  </p>
                </div>
              )}
            </article>
          </div>
        </div>
      )}
    </div>
  )
}
