/**
 * Ryan's skill path, rendered as visual cards in the language of the
 * four-levels infographic: a header, labeled blocks, no walls of text.
 * Top-down: peak skills first, foundations last.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RYAN_CUE_SWAPS } from '../../config/skillCues'
import { FEATURED_PROOF, TECHNIQUE_EVIDENCE, evidenceKeyForSkill, type ProofVideo } from '../../config/techniqueEvidence'
import { youtubeEmbedSrc } from '../../lib/socialUrls'
import { SKILL_SHAPES } from '../../config/skillShapes'
import { SHAPES, getShape } from '../../config/shapes'
import { shippedStillUrl, shippedFileCandidates } from '../../lib/shippedRefs'
import { skillPhotosFor } from '../../config/skillPhotos'
import {
  GUIDE_ORDER,
  TRACK_LABELS,
  getRegistrySkill,
  getRegistrySkillByGuideId,
  guidelessSkills,
  searchSkills,
  type UnifiedSkill,
  type UnifiedSkillTrack,
} from '../../lib/skillRegistry'
import {
  NEED_KIND_LABEL,
  canonicalSkillId,
  deleteConditioning,
  deleteDrill,
  deleteNeed,
  deleteVersion,
  drillsForSkill,
  needLabel,
  pushSkillPathsNow,
  saveConditioning,
  saveDrill,
  saveNeed,
  saveVersion,
  versionsForSkill,
  type SkillNeedKind,
} from '../../lib/skillPaths'
import {
  buildPathHighlight,
  conditioningForSkillConsolidated,
  needsForSkillConsolidated,
  usePathTick,
  type PathHighlight,
} from '../../lib/skillPathHighlight'
import { FAMILY_BY_SKILL, SkillMapView, hlGlowStyle, type SkillFamily } from './SkillMapView'
import type { Athlete } from '../../types'
import { InstagramEmbed } from '../compare/InstagramEmbed'
import { VideoTrimmer } from './VideoTrimmer'
import { AddCardVideoModal } from './CardVideoManager'
import { ProofFullscreenPlayer } from './ProofFullscreenPlayer'
import { InlineVideo } from './InlineVideo'
import { markedFetch } from '../../lib/authSession'
import { shareBaseUrl } from '../../lib/gymLink'
import { useVideoAdjustmentsOptional } from '../../lib/videoAdjustments'

/** True for local video files (public/videos/...) vs social embeds. */
function isLocalVideo(url: string): boolean {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(url)
}

/** Resolve a skill from either a guideId or a skill id (shared card links). */
function resolveSkill(id: string | null | undefined): UnifiedSkill | null {
  if (!id) return null
  return getRegistrySkillByGuideId(id) ?? getRegistrySkill(id)
}

const STEP_COLORS = ['#2e7d4f', '#6a4fa3', '#d9732b', '#c93a3a']

/** Card header color for a guide card, cycling the same palette as the old list. */
export function guideCardColor(guideId: string): string {
  const i = GUIDE_ORDER.indexOf(guideId)
  return STEP_COLORS[(i < 0 ? 0 : i) % STEP_COLORS.length]
}

function Label({ children }: { children: React.ReactNode }) {  return (
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
 * Coach shares a skill card with an athlete: copies a link that opens the
 * Learn section straight to this card (their sign-in still applies).
 */
function ShareSkillCardButton({ skill }: { skill: UnifiedSkill }) {
  const [copied, setCopied] = useState(false)
  const share = async () => {
    // Public no-account link: /share/<guideId> renders the card standalone.
    const key = skill.guideId ?? skill.id
    const url = `${shareBaseUrl()}/share/${encodeURIComponent(key)}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* clipboard unavailable */
      }
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={share}
      className="rounded-full bg-black/25 px-3 py-1 text-sm font-bold"
      aria-label={`Share the ${skill.name} card`}
    >
      {copied ? 'Copied ✓' : '⤴ Share'}
    </button>
  )
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

/**
 * The body positions inside a skill — shape stills from the shape library.
 * Rendered only when SKILL_SHAPES has entries for the guide. Captions reuse
 * the shape's own description from src/config/shapes.ts.
 */
function ShapeStrip({ guideId }: { guideId: string }) {
  const refs = SKILL_SHAPES[guideId]
  if (!refs || refs.length === 0) return null
  const items = refs
    .map((r) => {
      const def = getShape(r.shapeId)
      const src = shippedStillUrl(r.shapeId)
      if (!def || !src) return null
      return { key: r.shapeId, name: def.name, desc: def.description?.trim() || '', src }
    })
    .filter((x): x is { key: string; name: string; desc: string; src: string } => x !== null)
  if (items.length === 0) return null
  return (
    <div>
      <Label>Shapes</Label>
      <p className="mt-1 text-xs opacity-70">The body positions inside this skill.</p>
      <div className="mt-2 flex min-w-0 gap-3 overflow-x-auto pb-1">
        {items.map((s) => (
          <div key={s.key} className="w-36 shrink-0">
            <div className="aspect-square overflow-hidden rounded-xl bg-black">
              <img src={s.src} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="mt-1 text-xs font-bold">{s.name}</div>
            {s.desc && <div className="text-[11px] opacity-70">{s.desc}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Ryan's photo collages dropped into skill cards. */
function SkillPhotoStrip({ skillId }: { skillId: string }) {
  const photos = skillPhotosFor(skillId)
  if (photos.length === 0) return null
  return (
    <div>
      <Label>Photos</Label>
      <div className="mt-2 flex min-w-0 gap-3 overflow-x-auto pb-1">
        {photos.map((p) => {
          const src = shippedFileCandidates(p.file)[0]
          if (!src) return null
          return (
            <div key={p.file} className="shrink-0">
              <div className="h-72 overflow-hidden rounded-xl bg-black">
                <img
                  src={src}
                  alt={p.label ?? 'Skill photo'}
                  className="h-full w-auto object-contain"
                  loading="lazy"
                />
              </div>
              {p.label && <div className="mt-1 w-0 min-w-full break-words text-xs font-bold">{p.label}</div>}
            </div>
          )
        })}
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
  const [pinnedUrls, setPinnedUrls] = useState<string[]>([])
  /** Fullscreen carousel player: the video list + index, null = closed. */
  const [fullView, setFullView] = useState<{ list: ProofVideo[]; index: number } | null>(null)

  /**
   * Open the fullscreen player. The true browser fullscreen request must run
   * synchronously inside the tap gesture (a deferred call is rejected on
   * iPad); iPhone Safari doesn't support it and just gets the overlay.
   */
  const openFullView = (list: ProofVideo[], index: number) => {
    try {
      if (document.fullscreenEnabled && !document.fullscreenElement) {
        void document.documentElement.requestFullscreen().catch(() => {})
      }
    } catch {
      /* unsupported — the overlay player is the fullscreen */
    }
    setFullView({ list, index })
  }

  /** Close the fullscreen player, leaving true browser fullscreen if we entered it. */
  const closeFullView = () => {
    setFullView(null)
    try {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    } catch {
      /* ignore */
    }
  }

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
    fetch('/api/skill-card-pinned')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') {
          const list = (data as Record<string, string[]>)[evidenceKey]
          if (Array.isArray(list)) setPinnedUrls(list.filter((u) => typeof u === 'string'))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [evidenceKey])

  const hiddenSet = new Set(hiddenUrls)
  const pinSet = new Set(pinnedUrls)
  const adjApi = useVideoAdjustmentsOptional()
  // Videos hidden via Adjust mode are excluded from the card entirely.
  const isAdjHidden = (url: string) => adjApi?.get(url)?.hidden === true
  // Featured reference (e.g. Ryan's spring layout analysis on the layout
  // card): shown bigger at the top, excluded from the strip below.
  const featured = FEATURED_PROOF[evidenceKey]
  const featuredYouTube = featured ? youtubeEmbedSrc(featured.url) : null
  const videos = [
    ...baseVideos.filter((v) => !hiddenSet.has(v.url) && v.url !== featured?.url && !isAdjHidden(v.url)),
    ...adminVideos.filter((v) => !isAdjHidden(v.url)),
  ]
  // Pinned videos render above everything else in a bigger player.
  const pinnedVideos = videos.filter((v) => pinSet.has(v.url))
  const stripVideos = videos.filter((v) => !pinSet.has(v.url))
  const adminUrls = new Set(adminVideos.map((v) => v.url))
  const shownUrls = new Set(videos.map((v) => v.url))

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
            if (!url || seen.has(url) || shownUrls.has(url)) continue
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

  const savePinned = async (next: string[]) => {
    setPinnedUrls(next)
    try {
      const current = await fetch('/api/skill-card-pinned').then((r) => (r.ok ? r.json() : {}))
      const data = { ...(current as Record<string, string[]>), [evidenceKey]: next }
      await markedFetch('/api/admin/skill-card-pinned', {
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
        <Label>References</Label>
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
      {pinnedVideos.length > 0 && (
        <div className="mb-4">
          <span className="rounded-full bg-emerald-300/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            Pinned
          </span>
          {pinnedVideos.map((v, i) => {
            const override = overrides[v.url]
            const loopA = override?.a ?? v.startAt ?? null
            const loopB = override?.b ?? v.endAt ?? null
            const local = isLocalVideo(v.url)
            return (
              <div key={v.url} className="mt-2 max-w-[420px]">
                <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
                  {local ? (
                    <InlineVideo url={v.url} loopA={loopA} loopB={loopB} />
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
                  <button
                    type="button"
                    onClick={() => openFullView(pinnedVideos, i)}
                    className="absolute right-2 top-2 z-20 touch-manipulation rounded-full bg-black/60 px-3 py-2 text-xs font-bold text-white hover:bg-black/80"
                    aria-label={`Open ${v.who} fullscreen`}
                    title="Full screen — scrub, slow-mo, flip"
                  >
                    ⛶
                  </button>
                </div>
                <div className="mt-1 text-xs font-bold">{v.who}</div>
                <div className="text-[11px] opacity-70">{v.watchFor}</div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void savePinned(pinnedUrls.filter((u) => u !== v.url))}
                    className="mt-1 text-[11px] font-bold text-amber-400"
                  >
                    Unpin
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {featured && !isAdjHidden(featured.url) && (
        <div className="mb-3 mt-2">
          <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Featured reference
          </span>
          <div
              className={
                featuredYouTube
                  ? 'relative mt-2 aspect-video w-full max-w-[560px] overflow-hidden rounded-xl bg-black'
                  : 'relative mt-2 aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-xl bg-black'
              }
            >
            <InstagramEmbed
              url={featured.url}
              compact
              bare
              quiet
              playWhenVisible
              fit="contain"
              fill
              posterFirst
            />
            <button
              type="button"
              onClick={() => openFullView([featured], 0)}
              className="absolute right-2 top-2 z-20 touch-manipulation rounded-full bg-black/60 px-3 py-2 text-xs font-bold text-white hover:bg-black/80"
              aria-label={`Open ${featured.who} fullscreen`}
              title="Full screen"
            >
              ⛶
            </button>
          </div>
          <div className="mt-1 text-xs font-bold">{featured.who}</div>
          <div className="text-[11px] opacity-70">{featured.watchFor}</div>
        </div>
      )}
      <div className="mt-2 flex min-w-0 gap-3 overflow-x-auto pb-1">
        {stripVideos.map((v) => {
          const override = overrides[v.url]
          const loopA = override?.a ?? v.startAt ?? null
          const loopB = override?.b ?? v.endAt ?? null
          const editing = coach && loopEditUrl === v.url
          const local = isLocalVideo(v.url)
          const bust = bustMap[v.url]
          const playUrl = bust ? `${v.url}?t=${bust}` : v.url
          const isPinned = pinSet.has(v.url)
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
                <div className="relative aspect-square overflow-hidden rounded-xl bg-black">
                  {local ? (
                    <InlineVideo url={playUrl} loopA={loopA} loopB={loopB} />
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
                  <button
                    type="button"
                    onClick={() =>
                      openFullView(stripVideos, stripVideos.findIndex((x) => x.url === v.url))
                    }
                    className="absolute right-2 top-2 z-20 touch-manipulation rounded-full bg-black/60 px-3 py-2 text-xs font-bold text-white hover:bg-black/80"
                    aria-label={`Open ${v.who} fullscreen`}
                    title="Full screen — scrub, slow-mo, flip"
                  >
                    ⛶
                  </button>
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
                  onClick={() =>
                    void savePinned(isPinned ? pinnedUrls.filter((u) => u !== v.url) : [...pinnedUrls, v.url])
                  }
                  className="mt-1 ml-2 text-[11px] font-bold text-emerald-400"
                >
                  {isPinned ? 'Unpin' : '📌 Pin'}
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
              More from the reference library ({refMatches.filter((v) => !isAdjHidden(v.url)).length})
            </span>
            <span className="text-xs text-white/40">{showRefs ? '▾' : '▸'}</span>
          </button>
          {showRefs && (
            <div className="mt-2 flex min-w-0 gap-3 overflow-x-auto pb-1">
              {refMatches.filter((v) => !isAdjHidden(v.url)).map((v) => {
                const local = isLocalVideo(v.url)
                return (
                  <div key={v.url} className="w-48 shrink-0">
                    <div className="aspect-[9/16] overflow-hidden rounded-xl bg-black">
                      {local ? (
                        <InlineVideo url={v.url} loopA={null} loopB={null} />
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
                        Add to card
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
      {fullView && (
        <ProofFullscreenPlayer
          videos={fullView.list}
          index={fullView.index}
          onIndex={(i) => setFullView((prev) => (prev ? { ...prev, index: i } : prev))}
          onClose={closeFullView}
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

/** Saved indicator for the card path editors. Local data is written
 * synchronously first; this reports the awaited sync to the gym server. */
type CardSaveState = 'idle' | 'saving' | 'saved' | 'error'
type CardSave = { state: CardSaveState; message?: string }

function SaveIndicator({ save }: { save: CardSave }) {
  if (save.state === 'idle') return null
  return (
    <p
      className={`text-xs ${
        save.state === 'error'
          ? 'text-red-400'
          : save.state === 'saved'
            ? 'text-emerald-400'
            : 'text-white/60'
      }`}
    >
      {save.state === 'saving' && 'Saving…'}
      {save.state === 'saved' && 'Saved ✓'}
      {save.state === 'error' &&
        `Couldn't reach the gym server — ${save.message ?? 'sync failed'}. Your edit is saved on this device and will sync when the connection is back.`}
    </p>
  )
}

/** Run a local skill-path mutation, then report the awaited server sync. */
async function mutatePath(setSave: (s: CardSave) => void, fn: () => void) {
  setSave({ state: 'saving' })
  fn()
  const res = await pushSkillPathsNow()
  setSave(res.ok ? { state: 'saved' } : { state: 'error', message: res.message })
}

/**
 * Harder versions of a skill, named by the coach (e.g. Switch kick full).
 * Renders in the Guide tab whenever versions exist or the coach can edit.
 */
function HarderVersions({ skillId, canEdit }: { skillId: string; canEdit: boolean }) {
  const tick = usePathTick()
  const versions = useMemo(() => versionsForSkill(skillId), [skillId, tick])
  const [draft, setDraft] = useState('')
  const [save, setSave] = useState<CardSave>({ state: 'idle' })
  if (versions.length === 0 && !canEdit) return null
  const add = () => {
    const label = draft.trim()
    if (!label) return
    setDraft('')
    void mutatePath(setSave, () => saveVersion({ skillId, label, order: versions.length }))
  }
  return (
    <div className="rounded-xl bg-[var(--panel-border)]/20 p-3">
      <Label>Harder versions</Label>
      <p className="mt-1 text-xs opacity-70">Where this skill goes next.</p>
      {versions.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {versions.map((v) => (
            <li key={v.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
              <span className="flex-1 text-sm font-semibold">{v.label}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void mutatePath(setSave, () => deleteVersion(v.id))}
                  aria-label={`Remove ${v.label}`}
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs text-white/50 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div className="mt-2">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') add()
              }}
              placeholder="Name a harder version…"
              aria-label="Harder version name"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white placeholder-white/40 outline-none"
            />
            <button
              type="button"
              onClick={add}
              disabled={!draft.trim()}
              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <div className="mt-1">
            <SaveIndicator save={save} />
          </div>
        </div>
      )}
    </div>
  )
}

/** One node in the card's Path chain. Tappable when it has its own card. */
function PathNode({
  skillId,
  dist,
  hl,
  role,
  onSelectSkill,
}: {
  skillId: string
  dist: number
  hl: PathHighlight
  role: 'target' | 'required' | 'helpful'
  onSelectSkill?: (s: UnifiedSkill) => void
}) {
  const reg = getRegistrySkill(skillId)
  const name = reg?.name ?? skillId
  const family: SkillFamily = FAMILY_BY_SKILL[skillId] ?? 'foundations'
  const layer = hlGlowStyle(hl, role, dist, family, hl.keyHelpers.has(canonicalSkillId(skillId)))
  const canOpen = !!reg?.guideId && !!onSelectSkill
  const cls =
    'flex w-full items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5'
  const style = {
    boxShadow: layer.boxShadow,
    ...(layer.animation ? { animation: layer.animation, animationDelay: layer.animationDelay } : null),
  }
  const inner = (
    <>
      <span aria-hidden className="shrink-0 text-amber-300">
        {role === 'target' ? '◎' : role === 'required' ? '✦' : '✧'}
      </span>
      <span className="min-w-0 flex-1 text-left text-sm font-bold text-white">{name}</span>
      {dist > 0 && (
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/50">
          {dist} {dist === 1 ? 'step' : 'steps'} down
        </span>
      )}
      {canOpen ? (
        <span className="shrink-0 text-white/50" aria-hidden>
          ›
        </span>
      ) : (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
          title="Guide coming"
          aria-hidden
        />
      )}
    </>
  )
  return canOpen ? (
    <button
      type="button"
      onClick={() => reg && onSelectSkill(reg)}
      className={`${cls} active:scale-[0.99]`}
      style={style}
    >
      {inner}
    </button>
  ) : (
    <div className={`${cls} opacity-80`} style={style}>
      {inner}
    </div>
  )
}

/**
 * Drill list on the card. Videos are optional on purpose — Ryan adds them
 * later, when uploading is less of a burden.
 */
function SkillDrills({ skillId, canEdit }: { skillId: string; canEdit: boolean }) {
  const tick = usePathTick()
  const drills = useMemo(() => drillsForSkill(skillId), [skillId, tick])
  const [label, setLabel] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [save, setSave] = useState<CardSave>({ state: 'idle' })
  if (drills.length === 0 && !canEdit) return null
  const add = () => {
    const name = label.trim()
    if (!name) return
    const url = videoUrl.trim()
    setLabel('')
    setVideoUrl('')
    void mutatePath(setSave, () =>
      saveDrill({ skillId, label: name, videoUrl: url || undefined, order: drills.length }),
    )
  }
  return (
    <div>
      <Label>Drills</Label>
      {drills.length === 0 ? (
        <p className="mt-1 text-xs opacity-60">No drills yet.</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {drills.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{d.label}</span>
              {d.videoUrl ? (
                <a
                  href={d.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-bold text-sky-300 underline"
                >
                  Watch
                </a>
              ) : (
                <span className="shrink-0 text-[11px] text-white/50">video coming later</span>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void mutatePath(setSave, () => deleteDrill(d.id))}
                  aria-label={`Remove ${d.label}`}
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs text-white/50 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div className="mt-2 space-y-1.5">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
            }}
            placeholder="Drill name…"
            aria-label="Drill name"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white placeholder-white/40 outline-none"
          />
          <div className="flex gap-2">
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Video link (optional — add later)"
              aria-label="Drill video link"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white placeholder-white/40 outline-none"
            />
            <button
              type="button"
              onClick={add}
              disabled={!label.trim()}
              className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <SaveIndicator save={save} />
        </div>
      )}
    </div>
  )
}

/**
 * Coach editor for a skill's path pieces: which skills and shapes are
 * required vs helpful. Every change writes locally first, then awaits the
 * sync to the gym server and reports saved / failed — work is never
 * silently dropped, and the form never clears on a true failure.
 */
function PathNeedsEditor({ skillId }: { skillId: string }) {
  const tick = usePathTick()
  const needs = useMemo(() => needsForSkillConsolidated(skillId), [skillId, tick])
  const shapes = useMemo(() => conditioningForSkillConsolidated(skillId), [skillId, tick])
  const [skillQuery, setSkillQuery] = useState('')
  const [skillKind, setSkillKind] = useState<SkillNeedKind>('required')
  const [shapeQuery, setShapeQuery] = useState('')
  const [shapeKind, setShapeKind] = useState<SkillNeedKind>('required')
  const [save, setSave] = useState<CardSave>({ state: 'idle' })

  const skillResults = useMemo(() => searchSkills(skillQuery, 6).map((h) => h.skill), [skillQuery])
  const shapeResults = useMemo(() => {
    const q = shapeQuery.trim().toLowerCase()
    return SHAPES.filter((s) => !q || s.name.toLowerCase().includes(q)).slice(0, 6)
  }, [shapeQuery])

  const kindOptions: SkillNeedKind[] = ['required', 'helpful', 'alt']
  const kindSelect = (value: SkillNeedKind, onChange: (k: SkillNeedKind) => void, label: string) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SkillNeedKind)}
      aria-label={label}
      className="shrink-0 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs text-white"
    >
      {kindOptions.map((k) => (
        <option key={k} value={k}>
          {NEED_KIND_LABEL[k]}
        </option>
      ))}
    </select>
  )

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <Label>Path pieces</Label>
      <p className="mt-1 text-xs opacity-70">Choose what this skill needs — and what just helps.</p>

      {needs.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {needs.map((n) => {
            const name = needLabel(n)
            return (
              <li key={n.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-white">{name}</span>
                {kindSelect(n.kind, (k) => void mutatePath(setSave, () => saveNeed({ ...n, kind: k })), `How ${name} relates to this skill`)}
                <button
                  type="button"
                  onClick={() => void mutatePath(setSave, () => deleteNeed(n.id))}
                  aria-label={`Remove ${name}`}
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs text-white/50 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {shapes.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {shapes.map((c) => {
            const label = c.shapeId ? getShape(c.shapeId)?.name ?? c.label : c.label
            return (
              <li key={c.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-white">
                  <span aria-hidden className="mr-1 opacity-60">
                    ◈
                  </span>
                  {label}
                </span>
                {kindSelect(c.kind, (k) => void mutatePath(setSave, () => saveConditioning({ ...c, kind: k })), `How ${label} relates to this skill`)}
                <button
                  type="button"
                  onClick={() => void mutatePath(setSave, () => deleteConditioning(c.id))}
                  aria-label={`Remove ${label}`}
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs text-white/50 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Add a skill</p>
        <div className="mt-1 flex gap-2">
          <input
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
            placeholder="Search skills…"
            aria-label="Search skills to add"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white placeholder-white/40 outline-none"
          />
          {kindSelect(skillKind, setSkillKind, 'Kind for the new skill piece')}
        </div>
        {skillQuery.trim() !== '' && (
          <ul className="mt-1 overflow-hidden rounded-xl border border-white/10">
            {skillResults.length === 0 ? (
              <li className="px-3 py-2 text-xs text-white/60">No skills match.</li>
            ) : (
              skillResults.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSkillQuery('')
                      void mutatePath(setSave, () =>
                        saveNeed({ skillId, label: s.name, kind: skillKind, needSkillId: s.id, order: needs.length }),
                      )
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                  >
                    {s.name}
                    <span className="text-xs font-bold text-emerald-400">+ Add</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Add a shape</p>
        <div className="mt-1 flex gap-2">
          <input
            value={shapeQuery}
            onChange={(e) => setShapeQuery(e.target.value)}
            placeholder="Search the shape library…"
            aria-label="Search shapes to add"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white placeholder-white/40 outline-none"
          />
          {kindSelect(shapeKind, setShapeKind, 'Kind for the new shape piece')}
        </div>
        {shapeQuery.trim() !== '' && (
          <ul className="mt-1 overflow-hidden rounded-xl border border-white/10">
            {shapeResults.length === 0 ? (
              <li className="px-3 py-2 text-xs text-white/60">No shapes match.</li>
            ) : (
              shapeResults.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setShapeQuery('')
                      void mutatePath(setSave, () =>
                        saveConditioning({ skillId, label: s.name, kind: shapeKind, shapeId: s.id }),
                      )
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                  >
                    {s.name}
                    <span className="text-xs font-bold text-emerald-400">+ Add</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="mt-2">
        <SaveIndicator save={save} />
      </div>
    </div>
  )
}

/**
 * The Path tab inside a skill card: the prerequisite chain as a vertical
 * glow (target on top, deepest prerequisite at the bottom, shapes at the
 * bottom of the glow), helpful-but-not-required skills, and the drill list.
 * Coaches get the needs editor here.
 */
function PathTab({
  skill,
  canEdit,
  onSelectSkill,
}: {
  skill: UnifiedSkill
  canEdit: boolean
  onSelectSkill?: (s: UnifiedSkill) => void
}) {
  const tick = usePathTick()
  const canon = canonicalSkillId(skill.id)
  const hl = useMemo(() => buildPathHighlight(canon), [canon, tick])
  const shapes = useMemo(() => conditioningForSkillConsolidated(canon), [canon, tick])
  const required = useMemo(
    () =>
      hl
        ? [...hl.required.entries()]
            .filter(([id]) => id !== hl.target)
            .sort((a, b) => a[1] - b[1])
        : [],
    [hl],
  )
  const helpful = useMemo(
    () => (hl ? [...hl.helpful.entries()].sort((a, b) => a[1] - b[1]) : []),
    [hl],
  )
  return (
    <div className="space-y-4" data-card-section="path">
      <div>
        <Label>The path to {skill.name}</Label>
        <p className="mt-1 text-xs opacity-70">
          {required.length > 0
            ? 'Brightest at the top — work it from the bottom up.'
            : 'No path pieces mapped yet.'}
        </p>
      </div>

      {hl && (
        <div>
          <PathNode skillId={hl.target} dist={0} hl={hl} role="target" onSelectSkill={onSelectSkill} />
          {required.map(([id]) => (
            <div key={id}>
              <div aria-hidden className="mx-auto h-2.5 w-0.5 bg-white/20" />
              <PathNode
                skillId={id}
                dist={hl.required.get(id) ?? 1}
                hl={hl}
                role="required"
                onSelectSkill={onSelectSkill}
              />
            </div>
          ))}
        </div>
      )}

      {shapes.length > 0 && (
        <div>
          <Label>Shapes in the path</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {shapes.map((c) => {
              const label = c.shapeId ? getShape(c.shapeId)?.name ?? c.label : c.label
              return (
                <span
                  key={c.id}
                  title={c.note ?? c.label}
                  className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white"
                >
                  {label}
                  {c.kind === 'helpful' && (
                    <span aria-hidden className="opacity-50">
                      {' '}✧
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {hl && helpful.length > 0 && (
        <div>
          <Label>Also helps</Label>
          <div className="mt-1.5 space-y-1.5">
            {helpful.map(([id, dist]) => (
              <PathNode key={id} skillId={id} dist={dist} hl={hl} role="helpful" onSelectSkill={onSelectSkill} />
            ))}
          </div>
        </div>
      )}

      <SkillDrills skillId={canon} canEdit={canEdit} />
      {canEdit && <PathNeedsEditor skillId={canon} />}
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
  onSelectSkill,
  initialTab,
}: {
  skill: UnifiedSkill
  color: string
  coach: boolean
  canEdit: boolean
  /** Tapping a Path-chain node opens that skill's card. */
  onSelectSkill?: (s: UnifiedSkill) => void
  /** Deep links can open straight on the Path tab. */
  initialTab?: 'guide' | 'path'
}) {
  const [tab, setTab] = useState<'guide' | 'path'>(initialTab ?? 'guide')
  return (
    <div>
      <div className="flex gap-1 px-4 pt-3" role="tablist" aria-label="Card sections">
        {(
          [
            { id: 'guide', label: 'Guide' },
            { id: 'path', label: 'Path' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              tab === t.id ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'guide' ? (
        <GuideTabContent skill={skill} color={color} coach={coach} canEdit={canEdit} />
      ) : (
        <div className="p-4">
          <PathTab skill={skill} canEdit={canEdit} onSelectSkill={onSelectSkill} />
        </div>
      )}
    </div>
  )
}

/** The Guide tab: needs / can-bend / harder versions / ask / proof / Ryan's note. */
function GuideTabContent({
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
      <SkillPhotoStrip skillId={skill.id} />
      <div data-card-section="needs" className="scroll-mt-4">
        <Label>Needs</Label>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          {needs.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
      {canBend.length > 0 && (
        <div data-card-section="canbend" className="scroll-mt-4 rounded-xl bg-[var(--panel-border)]/20 p-3">
          <Label>Can bend</Label>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {canBend.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      <HarderVersions skillId={skill.id} canEdit={canEdit} />
      <div data-card-section="ask" className="scroll-mt-4">
        <Label>Ask your coach</Label>
        <p className="mt-1 whitespace-pre-line text-sm italic">{skill.ask}</p>
      </div>
      <div data-card-section="shapes" className="scroll-mt-4">
        <ShapeStrip guideId={guideId} />
      </div>
      {skill.shapeVariations && (
        <div data-card-section="shape-variations" className="scroll-mt-4">
          <Label>Arch and hollow variations</Label>
          {skill.shapeVariations.intro && (
            <p className="mt-1 text-sm">{skill.shapeVariations.intro}</p>
          )}
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-60">
                Arch, easiest first
              </p>
              <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-sm">
                {skill.shapeVariations.arch.map((v) => (
                  <li key={v.name}>
                    <span className="font-semibold">{v.name}</span>
                    {v.detail && (
                      <span className="block text-xs opacity-70">{v.detail}</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-60">
                Hollow, easiest first
              </p>
              <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-sm">
                {skill.shapeVariations.hollow.map((v) => (
                  <li key={v.name}>
                    <span className="font-semibold">{v.name}</span>
                    {v.detail && (
                      <span className="block text-xs opacity-70">{v.detail}</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
      <div data-card-section="proof" className="scroll-mt-4">
        <ProofStrip evidenceKey={guideId} matchName={skill.name} coach={coach} canEdit={canEdit} />
      </div>
      {skill.ryanNote && (
        <p data-card-section="ryan" className="scroll-mt-4 whitespace-pre-line border-l-2 pl-3 text-xs opacity-70" style={{ borderColor: color }}>
          Ryan: {skill.ryanNote}
        </p>
      )}
      {skill.noteBlocks && skill.noteBlocks.length > 0 && (
        <div data-card-section="breakdown" className="scroll-mt-4">
          <Label>Breaking down the video</Label>
          <div className="mt-2 space-y-2.5">
            {skill.noteBlocks.map((b, i) =>
              b.kind === 'quote' ? (
                <blockquote
                  key={i}
                  className="rounded-lg border-l-4 border-amber-400/70 bg-amber-300/10 px-3 py-2 text-xs italic"
                >
                  &ldquo;{b.text}&rdquo;
                  <div className="mt-1 text-[11px] not-italic opacity-70">— {b.source}</div>
                </blockquote>
              ) : (
                <div key={i} className="rounded-lg bg-sky-300/10 px-3 py-2 text-xs">
                  <span className="font-bold text-sky-300">Ryan: </span>
                  <span className="whitespace-pre-line">{b.text}</span>
                </div>
              ),
            )}
          </div>
        </div>
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
 * Verbal cue swaps, reframed: lead with what works. Each swap shows Ryan's
 * cue as the headline; the old cue and the reason sit behind a
 * "Why this works" disclosure so nobody reads a correction first.
 * Collapsed by default — useful, but not what people come to the guide for.
 */
function CueSwapCard({ cue }: { cue: (typeof RYAN_CUE_SWAPS)[number] }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="text-base font-extrabold text-emerald-400 break-words">
        {cue.sayThis}
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-2 text-xs font-bold text-white/60 underline underline-offset-2"
      >
        {open ? 'Hide why' : 'Why this works ▸'}
      </button>
      {open && (
        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="text-sm font-bold text-red-400 line-through opacity-80 break-words">
            {cue.insteadOf}
          </div>
          <p className="mt-2 text-sm opacity-85 break-words">{cue.why}</p>
        </div>
      )}
    </article>
  )
}

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
          <span className="block text-base font-extrabold">Say this instead</span>
          <span className="mt-0.5 block text-xs opacity-70">
            Common cues worth rethinking, what to try instead, and why
          </span>
        </span>
        <span className="text-lg opacity-60" aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {RYAN_CUE_SWAPS.map((cue) => (
            <CueSwapCard key={cue.id} cue={cue} />
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
  focusSection,
  viewer = null,
  classAthletes = [],
  activeAthlete = null,
}: {
  coach?: boolean
  canEdit?: boolean
  focusSkillId?: string | null
  /** Card section to scroll to when opened from a deep link (chat quotes). */
  focusSection?: string | null
  /** Signed-in viewer, for the skill map's guiding-light glow. */
  viewer?: Athlete | null
  /** Athletes on the live class roster — their goal paths light up too. */
  classAthletes?: Athlete[]
  /** Active athlete (from athleteId), for the skill map's guiding-light glow. */
  activeAthlete?: Athlete | null
}) {
  const [modalSkill, setModalSkill] = useState<UnifiedSkill | null>(() =>
    resolveSkill(focusSkillId),
  )
  const modalScrollRef = useRef<HTMLDivElement>(null)

  // Deep-linked from search or a shared card link: open the skill's card in the modal.
  useEffect(() => {
    if (!focusSkillId) return
    const skill = resolveSkill(focusSkillId)
    if (skill) setModalSkill(skill)
  }, [focusSkillId])

  // Deep link with a section (chat quote): jump the open card to it.
  useEffect(() => {
    if (!modalSkill || !focusSection) return
    const section = focusSection
    const t = window.setTimeout(() => {
      const root = modalScrollRef.current
      const el = root?.querySelector(`[data-card-section="${section}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 90)
    return () => window.clearTimeout(t)
  }, [modalSkill, focusSection])

  // Close the modal on Escape.
  useEffect(() => {
    if (!modalSkill) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalSkill(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalSkill])

  // Lock the page behind the modal so background scroll can't fight the card.
  // Both html and body: iOS Safari can keep scrolling the document on body-only locks.
  useEffect(() => {
    if (!modalSkill) return
    const prevHtml = document.documentElement.style.overflow
    const prevBody = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
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
          <SkillMapView onTileTap={setModalSkill} viewer={viewer} classAthletes={classAthletes} activeAthlete={activeAthlete} />
        </div>
      </section>

      <GuidePlaceholders />

      <CueSwaps />

      {modalSkill &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
            onClick={() => setModalSkill(null)}
            role="dialog"
            aria-modal="true"
            aria-label={modalSkill.name}
          >
            <div
              ref={modalScrollRef}
              className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl bg-[var(--panel)] pb-[max(2rem,env(safe-area-inset-bottom))] [touch-action:pan-y] [-webkit-overflow-scrolling:touch] sm:rounded-3xl"
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
                <div className="flex items-center gap-2">
                  {coach && <ShareSkillCardButton skill={modalSkill} />}
                  <button
                    type="button"
                    onClick={() => setModalSkill(null)}
                    aria-label="Close"
                    className="rounded-full bg-black/25 px-3 py-1 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {modalSkill.guideId ? (
                <SkillGuideCardContent
                  key={modalSkill.id}
                  skill={modalSkill}
                  color={guideCardColor(modalSkill.guideId)}
                  coach={coach}
                  canEdit={canEdit}
                  onSelectSkill={setModalSkill}
                  initialTab={
                    focusSection === 'path' && modalSkill.id === focusSkillId ? 'path' : 'guide'
                  }
                />
              ) : (
                <div className="space-y-4 p-4">
                  <span className="inline-block rounded-full bg-neutral-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                    guide coming
                  </span>
                  <SkillPhotoStrip skillId={modalSkill.id} />
                  <p className="text-sm opacity-80">
                    This skill is on the map but its guide card isn't written
                    yet.
                  </p>
                  <HarderVersions skillId={modalSkill.id} canEdit={canEdit} />
                  <ProofStrip
                    evidenceKey={evidenceKeyForSkill(modalSkill)}
                    matchName={modalSkill.name}
                    coach={coach}
                    canEdit={canEdit}
                  />
                  <PathTab skill={modalSkill} canEdit={canEdit} onSelectSkill={setModalSkill} />
                </div>
              )}
            </article>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
