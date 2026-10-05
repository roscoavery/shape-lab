import { useEffect, useMemo, useState } from 'react'
import type { RefItem } from '../../lib/clipStore'
import { youtubeEmbedSrc } from '../../lib/socialUrls'
import {
  fetchSkillCardVideos,
  skillVideoSummaries,
  type SkillCardVideoList,
  type SkillVideoSummary,
} from '../../lib/skillCardVideos'

type Props = {
  /** Called when a video is chosen. The card carries the full video list so the pane can swipe through it. */
  onPick: (item: RefItem, card: SkillCardVideoList) => void
  /** Currently loaded item id, for the active highlight. */
  activeItemId?: string | null
}

const KIND_BADGE: Record<RefItem['kind'], string> = {
  instagram: 'IG',
  tiktok: 'TT',
  facebook: 'FB',
  url: 'URL',
  file: 'FILE',
}

/** Inline preview is only possible with a direct video URL. */
function previewSrcFor(item: RefItem): string | null {
  if (!item.url) return null
  if (item.kind !== 'url') return null
  if (youtubeEmbedSrc(item.url)) return null
  return item.url
}

export function SkillCardVideoBrowser({ onPick, activeItemId }: Props) {
  const [summaries, setSummaries] = useState<SkillVideoSummary[] | null>(null)
  const [skillQuery, setSkillQuery] = useState('')
  const [openSkill, setOpenSkill] = useState<SkillCardVideoList | null>(null)
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void skillVideoSummaries().then((list) => {
      if (!cancelled) setSummaries(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase()
    if (!q) return summaries ?? []
    return (summaries ?? []).filter((s) => s.name.toLowerCase().includes(q))
  }, [summaries, skillQuery])

  const openSkillVideos = async (summary: SkillVideoSummary) => {
    setLoadingVideos(true)
    setPreviewId(null)
    try {
      const list = await fetchSkillCardVideos(summary.skillId)
      setOpenSkill(list)
    } finally {
      setLoadingVideos(false)
    }
  }

  if (openSkill) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setOpenSkill(null)
            setPreviewId(null)
          }}
          className="mb-2 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
          aria-label="Back to skill list"
        >
          <span aria-hidden>←</span>
          <span className="max-w-[16rem] truncate">{openSkill.name}</span>
        </button>
        {loadingVideos ? (
          <p className="py-4 text-center text-sm text-white/50">Loading videos…</p>
        ) : openSkill.items.length === 0 ? (
          <p className="rounded-xl bg-white/5 px-3 py-3 text-center text-sm text-white/50">
            No playable videos on this card.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {openSkill.items.map((item) => {
              const previewing = previewId === item.id
              const previewSrc = previewSrcFor(item)
              return (
                <li key={item.id}>
                  <div
                    className={`rounded-xl ${
                      activeItemId === item.id ? 'bg-[var(--accent)]/20' : 'bg-white/5'
                    }`}
                  >
                    <div className="flex w-full items-center gap-2 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => onPick(item, openSkill)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-white/80"
                      >
                        <span className="shrink-0 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                          {KIND_BADGE[item.kind]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{item.name}</span>
                          {item.postedBy ? (
                            <span className="block truncate text-[10px] text-white/45">
                              @{item.postedBy}
                            </span>
                          ) : item.keywords && item.keywords.length > 0 ? (
                            <span className="block truncate text-[10px] text-white/45">
                              {item.keywords.join(', ')}
                            </span>
                          ) : null}
                        </span>
                      </button>
                      {previewSrc ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewId((prev) => (prev === item.id ? null : item.id))
                          }
                          aria-label={previewing ? 'Hide preview' : `Preview ${item.name}`}
                          title={previewing ? 'Hide preview' : 'Preview'}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm text-white hover:bg-white/20"
                        >
                          <span aria-hidden>{previewing ? '▾' : '▸'}</span>
                        </button>
                      ) : null}
                    </div>
                    {previewing && previewSrc ? (
                      <div className="px-3 pb-3">
                        <video
                          src={previewSrc}
                          controls
                          playsInline
                          preload="metadata"
                          className="aspect-video w-full rounded-lg bg-black"
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2">
        <input
          type="search"
          value={skillQuery}
          onChange={(e) => setSkillQuery(e.target.value)}
          placeholder="Search skills"
          aria-label="Search skills"
          className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>
      {summaries === null ? (
        <p className="py-3 text-center text-sm text-white/50">Loading skills…</p>
      ) : filteredSkills.length === 0 ? (
        <p className="rounded-xl bg-white/5 px-3 py-3 text-center text-sm text-white/50">
          {skillQuery ? 'No skills match your search.' : 'No skill cards have videos yet.'}
        </p>
      ) : (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto panel-scroll">
          {filteredSkills.map((skill) => (
            <li key={skill.skillId}>
              <button
                type="button"
                onClick={() => void openSkillVideos(skill)}
                className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10"
              >
                <span aria-hidden>🎯</span>
                <span className="min-w-0 flex-1 truncate">{skill.name}</span>
                <span className="shrink-0 text-xs text-white/50">
                  {skill.count} video{skill.count === 1 ? '' : 's'}
                </span>
                <span aria-hidden className="shrink-0 text-white/40">→</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
