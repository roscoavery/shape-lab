import { useState } from 'react'
import { exerciseById, linkFor } from '../../content/coachEd/exercises'
import { conditionRow } from '../../content/coachEd/registry'
import {
  PREVENTION_EVIDENCE_LABELS,
  TIMELINE_STATUS_LABELS,
  type Claim,
  type ExerciseEducation,
  type PreventionEvidence,
  type TimelineItem,
} from '../../content/coachEd/types'
import { SourceList } from './SourceList'

const EVIDENCE_CLS: Record<PreventionEvidence, string> = {
  direct_reduction: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  capacity: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
  rationale_only: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  insufficient: 'border-white/20 bg-white/5 text-[var(--muted)]',
}

export function EvidenceBadge({ evidence }: { evidence: PreventionEvidence }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${EVIDENCE_CLS[evidence]}`}>
      {PREVENTION_EVIDENCE_LABELS[evidence]}
    </span>
  )
}

function Claims({ items }: { items: Claim[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((cl, i) => (
        <li key={i} className={`text-sm leading-relaxed ${cl.evidence === 'uncertain' ? 'italic text-[var(--muted)]' : ''}`}>
          {cl.text}
          {cl.sourceIds && cl.sourceIds.length > 0 && <SourceList ids={cl.sourceIds} />}
        </li>
      ))}
    </ul>
  )
}

function Plain({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-sm leading-relaxed">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</p>
      {children}
    </div>
  )
}

export function ExerciseDetail({ ex, onOpenCondition }: { ex: ExerciseEducation; onOpenCondition?: (id: string) => void }) {
  const link = linkFor(ex.id)
  return (
    <div className="space-y-3">
      {ex.caution === 'advanced' && (
        <div role="note" className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2.5 text-sm leading-relaxed text-red-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Advanced, caution</p>
          Supervised only, after the readiness steps below. Not assignable from homework.
        </div>
      )}
      <p className="text-sm leading-relaxed">{ex.summary}</p>
      {link && <EvidenceBadge evidence={link.evidence} />}
      {ex.shapeLabStandard && (
        <p className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs leading-relaxed">{ex.shapeLabStandard}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Section title="Primary muscles"><Plain items={ex.primaryMuscles} /></Section>
        <Section title="Supporting muscles"><Plain items={ex.supportingMuscles} /></Section>
        <Section title="Joints"><Plain items={ex.joints} /></Section>
        <Section title="Planes"><Plain items={ex.planes} /></Section>
      </div>
      <Section title="Contraction demands">
        <Plain items={[`Concentric: ${ex.contraction.concentric}`, `Eccentric: ${ex.contraction.eccentric}`, `Isometric: ${ex.contraction.isometric}`]} />
      </Section>
      <Section title="Loading emphasis"><p className="text-sm leading-relaxed">{ex.loadingEmphasis}</p></Section>
      <Section title="Strength qualities"><Plain items={ex.qualities} /></Section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Section title="Mobility needed"><Plain items={ex.mobility} /></Section>
        <Section title="Control needed"><Plain items={ex.control} /></Section>
      </div>
      <Section title="Gymnastics and tumbling"><Claims items={ex.gymApplication} /></Section>
      {ex.focus?.map((f) => (
        <Section key={f.title} title={f.title}><Claims items={f.points} /></Section>
      ))}
      <Section title="Common technique errors"><Plain items={ex.errors} /></Section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Section title="Beginner modifications"><Plain items={ex.beginner} /></Section>
        <Section title="Advanced variations"><Plain items={ex.advanced} /></Section>
      </div>
      <Section title="Progress when"><Plain items={ex.progressWhen} /></Section>
      <Section title="Stop or modify if"><Plain items={ex.stopOrModify} /></Section>
      {ex.readiness && <Section title="Readiness progression (coaching prerequisites)"><Claims items={ex.readiness} /></Section>}
      {ex.contraindications && <Section title="Do not use when"><Claims items={ex.contraindications} /></Section>}
      <Section title="Injury considerations"><Claims items={ex.injuryConsiderations} /></Section>
      <Section title="What the research supports"><Claims items={ex.researchSupports} /></Section>
      <Section title="Still theoretical or not well studied"><Claims items={ex.stillTheoretical} /></Section>
      {ex.conditionIds.length > 0 && onOpenCondition && (
        <Section title="Related injury cards">
          <div className="flex flex-wrap gap-1.5">
            {ex.conditionIds.map((id) => {
              const row = conditionRow(id)
              if (!row) return null
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenCondition(id)}
                  className="rounded-full border border-white/15 px-2.5 py-1 text-xs active:bg-white/10"
                >
                  {row.name}
                </button>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}

export function ExerciseList({ ids, onOpenCondition }: { ids: string[]; onOpenCondition?: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const list = ids.map((id) => exerciseById(id)).filter((e): e is ExerciseEducation => Boolean(e))
  return (
    <div className="space-y-2">
      {list.map((ex) => {
        const isOpen = open === ex.id
        const link = linkFor(ex.id)
        return (
          <section key={ex.id} className="rounded-2xl border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : ex.id)}
              className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
            >
              <span>
                <span className="block text-base font-semibold">
                  {ex.name}
                  {ex.caution === 'advanced' && <span className="ml-2 text-[10px] font-semibold uppercase text-red-300">Advanced</span>}
                </span>
                {link && <span className="mt-0.5 block text-xs text-[var(--muted)]">{PREVENTION_EVIDENCE_LABELS[link.evidence]}</span>}
              </span>
              <span aria-hidden className="text-lg text-[var(--muted)]">{isOpen ? '\u2212' : '+'}</span>
            </button>
            {isOpen && (
              <div className="border-t border-white/10 px-3 py-3">
                <ExerciseDetail ex={ex} onOpenCondition={onOpenCondition} />
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export function EvidenceLinksView({ ids }: { ids: string[] }) {
  return (
    <div className="space-y-2">
      {ids.map((id) => {
        const ex = exerciseById(id)
        const link = linkFor(id)
        if (!ex || !link) return null
        return (
          <section key={id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-base font-semibold">{ex.name}</h4>
              <EvidenceBadge evidence={link.evidence} />
            </div>
            <dl className="mt-2 space-y-1.5 text-sm leading-relaxed">
              <div><dt className="inline font-semibold">Capacity it develops: </dt><dd className="inline">{link.capacity}</dd></div>
              <div><dt className="inline font-semibold">Tissue and joint demand: </dt><dd className="inline">{link.tissueDemand}</dd></div>
              <div><dt className="inline font-semibold">May theoretically help with: </dt><dd className="inline">{link.mayHelp}</dd></div>
              <div><dt className="inline font-semibold">Limits of the evidence: </dt><dd className="inline">{link.limits}</dd></div>
              <div><dt className="inline font-semibold">Contraindications: </dt><dd className="inline">{link.contraindications}</dd></div>
            </dl>
            <SourceList ids={link.sourceIds} />
          </section>
        )
      })}
    </div>
  )
}

export function TimelineView({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-3 border-l border-white/15 pl-4">
      {items.map((it) => (
        <li key={it.year + it.label} className="relative">
          <span aria-hidden className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
          <p className="text-xs font-semibold text-[var(--muted)]">
            {it.year} · {TIMELINE_STATUS_LABELS[it.status]}
          </p>
          <p className="text-base font-semibold">{it.label}</p>
          <p className="mt-0.5 text-sm leading-relaxed">{it.text}</p>
          <SourceList ids={it.sourceIds} />
        </li>
      ))}
    </ol>
  )
}

