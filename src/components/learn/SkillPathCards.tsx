/**
 * Ryan's skill path, rendered as visual cards in the language of the
 * four-levels infographic: a header, labeled blocks, no walls of text.
 * Top-down: peak skills first, foundations last.
 */
import { RYAN_CUE_SWAPS, RYAN_SKILL_PATH } from '../../config/ryanSkillPath'
import { TECHNIQUE_EVIDENCE } from '../../config/techniqueEvidence'
import { InstagramEmbed } from '../compare/InstagramEmbed'

const STEP_COLORS = ['#2e7d4f', '#6a4fa3', '#d9732b', '#c93a3a']

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-extrabold uppercase tracking-widest opacity-70">
      {children}
    </div>
  )
}

function ProofStrip({ evidenceKey }: { evidenceKey: string }) {
  const videos = TECHNIQUE_EVIDENCE[evidenceKey]
  if (!videos || videos.length === 0) return null
  return (
    <div>
      <Label>The proof</Label>
      <p className="mt-1 text-xs opacity-70">
        Not just Ryan's word. Watch who else teaches it this way.
      </p>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        {videos.map((v) => (
          <div key={v.url} className="w-40 shrink-0">
            <div className="aspect-[9/16] overflow-hidden rounded-xl bg-black">
              <InstagramEmbed url={v.url} compact bare quiet />
            </div>
            <div className="mt-1 text-xs font-bold">{v.who}</div>
            <div className="text-[11px] opacity-70">{v.watchFor}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkillPathCards() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-extrabold">The skill path, top down</h2>
        <p className="mt-1 text-sm opacity-80">
          Built from the top: the peak skills first, then what each one needs
          underneath it. Everybody starts in a different place. Find where you
          are and work down to what is missing.
        </p>
        <div className="mt-4 space-y-4">
          {RYAN_SKILL_PATH.map((step, i) => {
            const color = STEP_COLORS[i % STEP_COLORS.length]
            return (
              <article
                key={step.id}
                className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)]"
              >
                <header
                  className="px-4 py-3 text-base font-extrabold text-white"
                  style={{ backgroundColor: color }}
                >
                  {step.skill}
                </header>
                <div className="space-y-4 p-4">
                  <div>
                    <Label>Needs</Label>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                      {step.needs.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                  {step.canBend.length > 0 && (
                    <div className="rounded-xl bg-[var(--panel-border)]/20 p-3">
                      <Label>Can bend</Label>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                        {step.canBend.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <Label>Ask your coach</Label>
                    <p className="mt-1 text-sm italic">{step.ask}</p>
                  </div>
                  <ProofStrip evidenceKey={step.id} />
                  {step.ryanNote && (
                    <p className="border-l-2 pl-3 text-xs opacity-70" style={{ borderColor: color }}>
                      Ryan: {step.ryanNote}
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Cues Ryan uses instead</h2>
        <p className="mt-1 text-sm opacity-80">
          Common cues he throws out, what he says instead, and why.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {RYAN_CUE_SWAPS.map((cue) => (
            <article
              key={cue.id}
              className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4"
            >
              <div className="text-sm font-bold text-red-400 line-through opacity-80">
                {cue.insteadOf}
              </div>
              <div className="mt-1 text-base font-extrabold text-emerald-400">
                {cue.sayThis}
              </div>
              <p className="mt-2 text-sm opacity-85">{cue.why}</p>
              <div className="mt-3">
                <ProofStrip evidenceKey={cue.id} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
