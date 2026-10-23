import { useEffect, useState } from 'react'
import { MEDIA_SLOTS } from '../../content/coachEd/media'
import { conditionRow, loadCondition } from '../../content/coachEd/registry'
import {
  CARD_SECTIONS,
  REGION_LABELS,
  URGENCY_LABELS,
  type Claim,
  type Condition,
  type ConditionCard,
  type RecoveryRange,
} from '../../content/coachEd/types'
import { useCoachEd } from './CoachEdContext'
import { urgencyClass } from './urgency'
import { DraftBanner, EducationalNote, ReviewBadge } from './SafetyBanner'
import { SourceList } from './SourceList'
import { VerifiedFigure } from './VerifiedFigure'

function EvidenceTag({ claim }: { claim: Claim }) {
  if (claim.evidence === 'uncertain')
    return <span className="mr-1 rounded bg-white/10 px-1 text-[10px] font-semibold uppercase text-[var(--muted)]">Not well established</span>
  if (claim.evidence === 'policy')
    return <span className="mr-1 rounded bg-sky-400/15 px-1 text-[10px] font-semibold uppercase text-sky-200">ShapeLab policy</span>
  return null
}

function ClaimList({ claims }: { claims: Claim[] }) {
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed">
      {claims.map((c, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" />
          <span>
            <EvidenceTag claim={c} />
            {c.text}
          </span>
        </li>
      ))}
    </ul>
  )
}

function RangeView({ r }: { r: RecoveryRange }) {
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      <p>
        {r.uncertain && <span className="mr-1 rounded bg-white/10 px-1 text-[10px] font-semibold uppercase text-[var(--muted)]">Not well established</span>}
        {r.text}
      </p>
      {r.note && <p className="text-xs text-[var(--muted)]">{r.note}</p>}
      <p className="text-[11px] text-[var(--muted)]">
        Educational range, not a prediction for any one athlete. The athlete&apos;s clinician sets the plan.
      </p>
    </div>
  )
}

function idsOf(value: ConditionCard[keyof ConditionCard]): string[] {
  if (Array.isArray(value)) return value.flatMap((c) => c.sourceIds ?? [])
  if ('sourceIds' in value && Array.isArray(value.sourceIds)) return value.sourceIds
  return []
}

function Section({ k, card, open }: { k: (typeof CARD_SECTIONS)[number]; card: ConditionCard; open: boolean }) {
  const value = card[k.key]
  const isRange = k.key === 'tissueRecovery' || k.key === 'returnToImpact'
  const isSummary = k.key === 'summary'
  const body = isRange ? (
    <RangeView r={value as RecoveryRange} />
  ) : isSummary ? (
    <ClaimList claims={[value as Claim]} />
  ) : (
    <ClaimList claims={value as Claim[]} />
  )
  const tone = k.key === 'redFlags' ? 'border-red-400/30 bg-red-500/5' : 'border-white/10 bg-white/[0.03]'
  return (
    <details open={open} className={`group rounded-xl border ${tone}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-semibold">
        <span>{k.label}</span>
        <span aria-hidden className="text-[var(--muted)] transition group-open:rotate-90">
          &rsaquo;
        </span>
      </summary>
      <div className="px-3 pb-3">
        {body}
        <SourceList ids={idsOf(value)} />
      </div>
    </details>
  )
}

export function ConditionCardView({
  conditionId,
  onOpen,
  onBack,
}: {
  conditionId: string
  onOpen: (id: string) => void
  onBack?: () => void
}) {
  const ctx = useCoachEd()
  const [cond, setCond] = useState<Condition | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    setCond(undefined)
    void loadCondition(conditionId).then((c) => {
      if (live) setCond(c ?? null)
    })
    return () => {
      live = false
    }
  }, [conditionId])

  if (cond === undefined) return <p className="py-8 text-center text-sm text-[var(--muted)]">Loading</p>
  if (cond === null) return <p className="py-8 text-center text-sm text-[var(--muted)]">That entry was not found.</p>

  const review = ctx.reviewOf('condition', cond.id, cond.review)
  const overlay = ctx.state?.conditions[cond.id]
  const slots = MEDIA_SLOTS.filter((s) => s.assetIds.some((a) => cond.mediaIds.includes(a)))
  const prepared = cond.completeness === 'complete' && cond.card
  return (
    <article className="space-y-3">
      {onBack && (
        <button type="button" onClick={onBack} className="text-sm text-[var(--accent)]">
          &larr; Back
        </button>
      )}
      <header className="space-y-2">
        <h3 className="text-2xl font-semibold leading-tight">{cond.name}</h3>
        {cond.aliases.length > 0 && <p className="text-xs text-[var(--muted)]">Also called: {cond.aliases.join(', ')}</p>}
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${urgencyClass(cond.urgency)}`}>
            {URGENCY_LABELS[cond.urgency]}
          </span>
          {cond.regions.map((r) => (
            <span key={r} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-[var(--muted)]">
              {REGION_LABELS[r]}
            </span>
          ))}
          <ReviewBadge status={review} />
        </div>
        {review === 'approved' && overlay?.reviewerName && (
          <p className="text-xs text-[var(--muted)]">
            Reviewed by {overlay.reviewerName}, {overlay.reviewerRole}, {overlay.at.slice(0, 10)}. Recorded by gym admin.
          </p>
        )}
      </header>

      {review !== 'approved' && <DraftBanner />}

      {!prepared && (
        <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-5">
          <p className="text-sm font-semibold">In preparation</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {cond.preparationNote ?? 'This entry is not written yet. It will be added with sources and marked as a draft until reviewed.'}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Until then: stop the activity, tell the parent, and get the athlete seen. If it could be serious, see Injury response.
          </p>
        </div>
      )}

      {prepared && cond.card && (
        <div className="space-y-2">
          {CARD_SECTIONS.map((k) => (
            <Section key={k.key} k={k} card={cond.card as ConditionCard} open={k.priority === true} />
          ))}
        </div>
      )}

      {slots.map((s) => (
        <VerifiedFigure key={s.id} slotId={s.id} />
      ))}

      {cond.related.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Related</p>
          <div className="flex flex-wrap gap-1.5">
            {cond.related.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpen(id)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs active:bg-white/10"
              >
                {conditionRow(id)?.name ?? id}
              </button>
            ))}
          </div>
        </div>
      )}
      <EducationalNote />
    </article>
  )
}
