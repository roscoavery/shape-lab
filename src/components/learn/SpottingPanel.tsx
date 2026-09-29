/**
 * Spotting education for coaches — Ryan's spotting training system.
 * Two views: "Methods" (spotting-method cards) and "By skill" (skill cards,
 * each showing its spotting methods inside). General rules stay visible at
 * the top. Demo videos come from the reference library via tags:
 * `spotting` + `spotting-method:<id>` or `spot-skill:<id>`.
 */

import { useEffect, useState } from 'react'
import {
  SPOTTING_METHODS,
  SPOTTING_RULES,
  SPOTTING_SKILLS,
  SPOTTING_TOUCH_ETHICS,
  getSpottingSkill,
  type SpottingMethod,
  type SpottingSkill,
} from '../../config/spotting'
import { getCollections, type RefItem } from '../../lib/clipStore'
import { CollapsibleSection } from '../CollapsibleSection'
import { SegmentedTabs } from '../SegmentedTabs'
import { InlineVideo } from './InlineVideo'

type View = 'methods' | 'skills'

function keywordsOf(item: RefItem): string[] {
  return Array.isArray(item.keywords) ? item.keywords : []
}

function videosForMethod(items: RefItem[], methodId: string): RefItem[] {
  return items.filter(
    (i) => keywordsOf(i).includes('spotting') && keywordsOf(i).includes(`spotting-method:${methodId}`),
  )
}

function videosForSkill(items: RefItem[], skillId: string): RefItem[] {
  return items.filter(
    (i) => keywordsOf(i).includes('spotting') && keywordsOf(i).includes(`spot-skill:${skillId}`),
  )
}

function VideoLinks({ videos }: { videos: RefItem[] }) {
  if (videos.length === 0) return null
  return (
    <div className="mt-2 space-y-1">
      <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Demo videos</div>
      {videos.map((v) => (
        <a
          key={v.id}
          href={v.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-sm text-[var(--accent)] underline"
        >
          {v.name}
          {v.postedBy ? <span className="text-[var(--muted)]"> · {v.postedBy}</span> : null}
        </a>
      ))}
    </div>
  )
}

function MethodCard({
  method,
  videos,
  defaultOpen = false,
}: {
  method: SpottingMethod
  videos: RefItem[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const skillNames = method.appliesTo
    .map((id) => getSpottingSkill(id)?.name ?? id)
    .filter(Boolean)
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 text-left">
        <span>
          <span className="block text-base font-bold">{method.name}</span>
          {method.credit ? (
            <span className="block text-xs text-[var(--muted)]">Credit: {method.credit}</span>
          ) : null}
        </span>
        <span className="text-[var(--muted)]" aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {skillNames.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {skillNames.map((n) => (
            <span
              key={n}
              className="rounded-full border border-[var(--panel-border)] px-2 py-0.5 text-xs text-[var(--muted)]"
            >
              {n}
            </span>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="leading-relaxed">{method.description}</p>
          {method.appliesToNote ? (
            <p className="text-[var(--muted)]">{method.appliesToNote}</p>
          ) : null}
          {method.cues && method.cues.length > 0 ? (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Verbal cues</div>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {method.cues.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {method.steps && method.steps.length > 0 ? (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Step by step</div>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                {method.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          ) : null}
          {method.watchOuts && method.watchOuts.length > 0 ? (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Watch out for</div>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {method.watchOuts.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <VideoLinks videos={videos} />
          {method.demoVideo ? (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Demo video
              </div>
              <div className="mt-1 aspect-[9/16] w-full overflow-hidden rounded-xl">
                <InlineVideo url={method.demoVideo.url} />
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
                {method.demoVideo.caption}
              </p>
            </div>
          ) : null}
          {videos.length === 0 && !method.demoVideo && method.videoPlaceholder ? (
            <p className="text-xs italic text-[var(--muted)]">{method.videoPlaceholder}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function SkillDetail({
  skill,
  videos,
  methodVideos,
  onBack,
}: {
  skill: SpottingSkill
  videos: RefItem[]
  methodVideos: (methodId: string) => RefItem[]
  onBack: () => void
}) {
  const methods = skill.methodIds
    .map((id) => SPOTTING_METHODS.find((m) => m.id === id))
    .filter((m): m is SpottingMethod => Boolean(m))
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-bold text-[var(--accent)]"
      >
        ← All skills
      </button>
      <div>
        <h2 className="text-xl font-bold">{skill.name}</h2>
        {skill.sub ? <p className="text-sm text-[var(--muted)]">{skill.sub}</p> : null}
      </div>
      {skill.prerequisites ? (
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Before spotting this skill
          </div>
          <p className="mt-1">{skill.prerequisites}</p>
        </div>
      ) : null}
      {skill.methodNote ? (
        <p className="text-sm italic text-[var(--muted)]">{skill.methodNote}</p>
      ) : null}
      {methods.map((m) => (
        <MethodCard key={m.id} method={m} videos={methodVideos(m.id)} />
      ))}
      <VideoLinks videos={videos} />
      {videos.length === 0 ? (
        <p className="text-xs italic text-[var(--muted)]">
          Skill demo videos will appear here when reference library items are tagged spotting and
          spot-skill:{skill.id}.
        </p>
      ) : null}
    </div>
  )
}

export function SpottingPanel() {
  const [view, setView] = useState<View>('skills')
  const [openSkillId, setOpenSkillId] = useState<string | null>(null)
  const [items, setItems] = useState<RefItem[]>([])

  useEffect(() => {
    let cancelled = false
    getCollections()
      .then((cols) => {
        if (cancelled) return
        const all = cols.flatMap((c) => c.items)
        setItems(all.filter((i) => keywordsOf(i).includes('spotting')))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const openSkill = openSkillId ? SPOTTING_SKILLS.find((s) => s.id === openSkillId) ?? null : null

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-3 pb-16">
      <div>
        <h1 className="text-2xl font-bold">Spotting</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          A training system for coaches: spotting methods, which skills they apply to, and the
          rules that keep athletes and coaches safe.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          General spotting rules
        </div>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {SPOTTING_RULES.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <CollapsibleSection title="Touch and comfort: respect for the athlete" defaultOpen={false}>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {SPOTTING_TOUCH_ETHICS.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </CollapsibleSection>

      <SegmentedTabs
        value={view}
        onChange={setView}
        tabs={[
          { id: 'skills', label: 'By skill' },
          { id: 'methods', label: 'Methods' },
        ]}
      />

      {view === 'methods' ? (
        <div className="space-y-3">
          {SPOTTING_METHODS.map((m) => (
            <MethodCard key={m.id} method={m} videos={videosForMethod(items, m.id)} />
          ))}
        </div>
      ) : openSkill ? (
        <SkillDetail
          skill={openSkill}
          videos={videosForSkill(items, openSkill.id)}
          methodVideos={(methodId) => videosForMethod(items, methodId)}
          onBack={() => setOpenSkillId(null)}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SPOTTING_SKILLS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setOpenSkillId(s.id)}
              className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-3 text-left transition-transform active:scale-95"
            >
              <span className="block text-sm font-bold leading-snug">{s.name}</span>
              {s.sub ? (
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{s.sub}</span>
              ) : null}
              <span className="mt-1 block text-xs text-[var(--muted)]">
                {s.methodIds.length} method{s.methodIds.length === 1 ? '' : 's'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
