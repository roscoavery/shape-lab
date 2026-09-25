/**
 * Ryan's skill path, rendered as visual cards in the language of the
 * four-levels infographic: a header, labeled blocks, no walls of text.
 * Top-down: peak skills first, foundations last.
 */
import { useState } from 'react'
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

function ProofStrip({ evidenceKey, coach }: { evidenceKey: string; coach: boolean }) {
  const videos = TECHNIQUE_EVIDENCE[evidenceKey]
  const [loopEditUrl, setLoopEditUrl] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, ProofLoop>>(loadProofLoops)
  if (!videos || videos.length === 0) return null

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
    }

  return (
    <div>
      <Label>The proof</Label>
      <p className="mt-1 text-xs opacity-70">
        Not just Ryan's word. Watch who else teaches it this way.
      </p>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        {videos.map((v) => {
          const override = overrides[v.url]
          const loopA = override?.a ?? v.startAt ?? null
          const loopB = override?.b ?? v.endAt ?? null
          const editing = coach && loopEditUrl === v.url
          return (
            <div key={v.url} className="w-40 shrink-0">
              {editing ? (
                <div className="rounded-xl bg-black p-1">
                  <InstagramEmbed
                    url={v.url}
                    compact
                    loopA={loopA}
                    loopB={loopB}
                    onAbChange={handleAbChange(v.url)}
                  />
                </div>
              ) : (
                <div className="aspect-[9/16] overflow-hidden rounded-xl bg-black">
                  <InstagramEmbed
                    url={v.url}
                    compact
                    bare
                    quiet
                    loopA={loopA}
                    loopB={loopB}
                  />
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SkillPathCards({ coach = false }: { coach?: boolean }) {
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
                  <ProofStrip evidenceKey={step.id} coach={coach} />
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
                <ProofStrip evidenceKey={cue.id} coach={coach} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
