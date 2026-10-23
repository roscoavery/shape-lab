import { EDUCATIONAL_DISCLAIMER, MASTERY_DISCLAIMER, type ReviewStatus } from '../../content/coachEd/types'

export function EducationalNote({ className = '' }: { className?: string }) {
  return (
    <p className={`rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-[var(--muted)] ${className}`}>
      {EDUCATIONAL_DISCLAIMER}
    </p>
  )
}

export function MasteryNote({ className = '' }: { className?: string }) {
  return <p className={`text-xs leading-relaxed text-[var(--muted)] ${className}`}>{MASTERY_DISCLAIMER}</p>
}

/** Always-visible rule at the top of the Injury Response tab. */
export function EmergencyBanner() {
  return (
    <div role="note" className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3">
      <p className="text-sm font-semibold text-red-200">If you think it is serious, call 911 first.</p>
      <p className="mt-1 text-xs leading-relaxed text-red-100/80">
        A coach cannot rule out a serious injury by watching or testing. Stop the activity, stay with the athlete, and get
        trained help. This app teaches the basics. It does not replace a first aid or CPR course or your gym emergency plan.
      </p>
    </div>
  )
}

const REVIEW_COPY: Record<ReviewStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft, not yet medically reviewed', cls: 'border-amber-400/40 bg-amber-400/10 text-amber-200' },
  in_review: { label: 'In review', cls: 'border-sky-400/40 bg-sky-400/10 text-sky-200' },
  approved: { label: 'Reviewed', cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' },
  retired: { label: 'Retired', cls: 'border-white/20 bg-white/5 text-[var(--muted)]' },
}

export function ReviewBadge({ status, title }: { status: ReviewStatus; title?: string }) {
  const c = REVIEW_COPY[status]
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${c.cls}`}
    >
      {c.label}
    </span>
  )
}

export function DraftBanner() {
  return (
    <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
      Draft, not yet medically reviewed. The sources are real and checked, but a qualified clinician has not signed off on this
      page. Use it to learn the vocabulary, not to make a medical decision.
    </p>
  )
}
