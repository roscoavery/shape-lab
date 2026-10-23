import { SCENARIOS } from '../../content/coachEd/scenarios'
import { EmergencyBanner, EducationalNote } from './SafetyBanner'
import { ScenarioRunner } from './ScenarioRunner'
import { SourceList } from './SourceList'

type Props = {
  onOpenCondition: (id: string) => void
  onOpenLesson: (id: string) => void
}

const QUICK: { id: string; label: string; sub: string; tone: string; go: 'condition' | 'lesson' }[] = [
  { id: 'concussion', label: 'Head hit or possible concussion', sub: 'Stop play, remove, notify, document', tone: 'border-orange-400/50 bg-orange-500/10', go: 'condition' },
  { id: 'suspected-spine-injury', label: 'Neck or back injury', sub: 'Do not move the athlete. Call 911.', tone: 'border-red-400/60 bg-red-500/15', go: 'condition' },
  { id: 'resp-recognize', label: 'Recognize a serious injury', sub: 'Red flags that mean emergency or same day', tone: 'border-red-400/40 bg-red-500/10', go: 'lesson' },
  { id: 'resp-eap', label: 'Emergency action plan', sub: 'Who does what in the first minute', tone: 'border-white/15 bg-white/[0.04]', go: 'lesson' },
]

export function InjuryResponse({ onOpenCondition, onOpenLesson }: Props) {
  return (
    <section className="space-y-4">
      <EmergencyBanner />

      <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-red-200">Not responsive and not breathing normally</p>
        <p className="mt-1 text-base font-semibold leading-snug">Call 911. Start chest compressions. Use an AED as soon as it is available.</p>
        <p className="mt-1 text-xs text-red-100/80">Send someone for the AED. Keep going until help takes over.</p>
        <SourceList ids={['aha-2020-bls']} />
      </div>

      <div>
        <h3 className="mb-2 text-lg font-semibold">What happened?</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {QUICK.map((q) => (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => (q.go === 'condition' ? onOpenCondition(q.id) : onOpenLesson(q.id))}
                className={`h-full w-full rounded-2xl border px-4 py-3.5 text-left active:opacity-80 ${q.tone}`}
              >
                <span className="block text-base font-semibold leading-snug">{q.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{q.sub}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Anything else: stop the activity, keep the athlete comfortable, tell the parent, and get them seen. If you are unsure how
          bad it is, treat it as serious. You cannot rule it out.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-lg font-semibold">Practice the decision</h3>
        <ScenarioRunner scenarioIds={SCENARIOS.map((s) => s.id)} />
      </div>
      <EducationalNote />
    </section>
  )
}
