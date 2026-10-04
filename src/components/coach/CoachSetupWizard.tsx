/**
 * CoachSetupWizard — guided setup so building a coaching system never feels
 * like staring at a blank page: create the system, pick a first skill,
 * add drills and clips, set visibility, then land at the Muse Connect key.
 * Progress saves as you go, so it's resumable. A friendly nudge suggests a
 * computer on small screens, but never blocks.
 */

import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { markedFetch } from '../../lib/authSession'
import { searchSkills, type SkillSearchHit } from '../../lib/skillRegistry'
import { deleteSkill, getSkill, saveDrill, saveSkill } from '../../lib/skillPaths'
import {
  COACH_SCOPES,
  PRESET_BLURBS,
  scopeText,
} from '../../lib/museKeyScopes'
import {
  VISIBILITY_BLURBS,
  VISIBILITY_LABELS,
  adoptSkill,
  createSystem,
  getSystem,
  handleTaken,
  setActiveSystemId,
  setMapVisibility,
  updateSystem,
  type CoachSystem,
  type SystemVisibility,
} from '../../lib/coachSystems'

const DRAFT_KEY = 'shape-lab.coachWizard.v1'

type DraftDrill = { label: string; videoUrl: string }

type Draft = {
  coachId: string
  systemId: string | null
  name: string
  handle: string
  tagline: string
  firstSkillId: string | null
  firstSkillName: string
  firstSkillIsNew: boolean
  drills: DraftDrill[]
  drillsSaved: boolean
  mapVisibility: SystemVisibility
  keySaved: boolean
}

const STEPS = ['System', 'First skill', 'Drills', 'Visibility', 'Connect'] as const

const STARTER_SKILLS = ['round off', 'back handspring', 'front handspring', 'back tuck', 'front tuck', 'back layout']

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'coach'
}

function loadDraft(coachId: string): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as Draft
    if (d?.coachId !== coachId) return null
    return d
  } catch {
    return null
  }
}

function emptyDraft(coachId: string): Draft {
  return {
    coachId,
    systemId: null,
    name: '',
    handle: '',
    tagline: '',
    firstSkillId: null,
    firstSkillName: '',
    firstSkillIsNew: false,
    drills: [],
    drillsSaved: false,
    mapVisibility: 'private',
    keySaved: false,
  }
}

export function CoachSetupWizard({
  coach,
  onDone,
  onOpenAsk,
}: {
  coach: Athlete
  onDone: () => void
  onOpenAsk: () => void
}) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(() => loadDraft(coach.id) ?? emptyDraft(coach.id))
  const [resumed] = useState(() => Boolean(loadDraft(coach.id)?.systemId ?? loadDraft(coach.id)?.name))
  const [smallScreen] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [query, setQuery] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [creatingSkill, setCreatingSkill] = useState(false)
  const [drillLabel, setDrillLabel] = useState('')
  const [drillUrl, setDrillUrl] = useState('')
  const [keySecret, setKeySecret] = useState<string | null>(null)
  const [keyBusy, setKeyBusy] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      /* quota */
    }
  }, [draft])

  const patch = (p: Partial<Draft>) => {
    setError(null)
    setDraft((d) => ({ ...d, ...p }))
  }

  const system: CoachSystem | null = draft.systemId ? getSystem(draft.systemId) : null

  const searchHits: SkillSearchHit[] = useMemo(
    () => (query.trim() ? searchSkills(query.trim(), 12) : []),
    [query],
  )

  const starterHits: SkillSearchHit[] = useMemo(() => {
    const seen = new Set<string>()
    const out: SkillSearchHit[] = []
    for (const s of STARTER_SKILLS) {
      const hit = searchSkills(s, 3)[0]
      if (hit && !seen.has(hit.skill.id)) {
        seen.add(hit.skill.id)
        out.push(hit)
      }
    }
    return out
  }, [])

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
  }

  /* ---- step 0: create the system ---- */
  const commitSystem = (): boolean => {
    const name = draft.name.trim()
    if (!name) {
      setError('Give your system a name first.')
      return false
    }
    let handle = draft.handle.trim() || slugify(name)
    if (handleTaken(handle, draft.systemId ?? undefined)) {
      let i = 2
      while (handleTaken(`${handle}-${i}`, draft.systemId ?? undefined)) i++
      handle = `${handle}-${i}`
    }
    if (draft.systemId && system) {
      updateSystem(draft.systemId, { name, handle, tagline: draft.tagline.trim() || undefined })
    } else {
      const row = createSystem({
        name,
        handle,
        tagline: draft.tagline.trim() || undefined,
        ownerCoachId: coach.id,
        ownerName: coach.name,
        mapVisibility: draft.mapVisibility,
      })
      patch({ systemId: row.id, handle: row.handle })
    }
    return true
  }

  /* ---- step 1: first skill (adopt or create) ---- */
  const commitFirstSkill = async (): Promise<boolean> => {
    if (creatingSkill) {
      const name = newSkillName.trim()
      if (!name) {
        setError('Name the skill first.')
        return false
      }
      if (draft.firstSkillId) {
        const prev = getSkill(draft.firstSkillId)
        if (prev?.coachId === coach.id) deleteSkill(draft.firstSkillId)
      }
      const row = saveSkill({ name, coachId: coach.id })
      patch({ firstSkillId: row.id, firstSkillName: row.name, firstSkillIsNew: true, drillsSaved: false })
      return true
    }
    if (!draft.firstSkillId) {
      setError('Pick a skill to start with, or create a new one.')
      return false
    }
    return true
  }

  const pickExistingSkill = (hit: SkillSearchHit) => {
    setCreatingSkill(false)
    setNewSkillName('')
    // Adopt now so Back/Next never duplicates; re-picking replaces the copy.
    if (draft.firstSkillId) {
      const prev = getSkill(draft.firstSkillId)
      if (prev?.coachId === coach.id) deleteSkill(draft.firstSkillId)
    }
    const row = adoptSkill(hit.skill.id, coach.id)
    if (!row) {
      setError('Could not copy that card. Try another.')
      return
    }
    patch({ firstSkillId: row.id, firstSkillName: row.name, firstSkillIsNew: false, drillsSaved: false })
  }

  /* ---- step 2: drills ---- */
  const addDrill = () => {
    const label = drillLabel.trim()
    if (!label) {
      setError('Name the drill first.')
      return
    }
    patch({ drills: [...draft.drills, { label, videoUrl: drillUrl.trim() }] })
    setDrillLabel('')
    setDrillUrl('')
  }

  const commitDrills = (): boolean => {
    if (!draft.firstSkillId) {
      setError('Go back and pick a first skill first.')
      return false
    }
    if (!draft.drillsSaved) {
      for (const [i, d] of draft.drills.entries()) {
        saveDrill({ skillId: draft.firstSkillId, label: d.label, videoUrl: d.videoUrl || undefined, order: i })
      }
      patch({ drillsSaved: true })
    }
    return true
  }

  /* ---- step 3: visibility ---- */
  const commitVisibility = (): boolean => {
    if (!draft.systemId) return false
    setMapVisibility(draft.systemId, draft.mapVisibility)
    return true
  }

  /* ---- step 4: key ---- */
  const generateKey = async () => {
    if (keyBusy || !system) return
    setKeyBusy(true)
    setKeyError(null)
    try {
      const res = await markedFetch('/api/muse/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: `${system.name} coach key`, scopes: COACH_SCOPES, athleteId: null }),
      })
      const data = (await res.json()) as { secret?: string; error?: string }
      if (!res.ok || !data.secret) throw new Error(data.error || 'Could not create the key.')
      setKeySecret(data.secret)
      setCopied(false)
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Could not create the key.')
    } finally {
      setKeyBusy(false)
    }
  }

  const copyKey = async () => {
    if (!keySecret) return
    try {
      await navigator.clipboard.writeText(keySecret)
      setCopied(true)
    } catch {
      setKeyError('Copy failed, long-press the key to copy it manually.')
    }
  }

  const next = async () => {
    setError(null)
    if (step === 0 && !commitSystem()) return
    if (step === 1 && !(await commitFirstSkill())) return
    if (step === 2 && !commitDrills()) return
    if (step === 3 && !commitVisibility()) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const back = () => setStep((s) => Math.max(s - 1, 0))

  const finish = () => {
    if (draft.systemId) setActiveSystemId(draft.systemId)
    clearDraft()
    onDone()
  }

  const firstSkill = draft.firstSkillId ? getSkill(draft.firstSkillId) : null

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#071018] text-[var(--text)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6ec8d6]">Set up your system</p>
          <p className="text-sm text-white/60">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </p>
        </div>
        <button type="button" onClick={onDone} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold">
          Exit
        </button>
      </header>

      <div className="flex gap-1.5 px-4 pb-1">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#6ec8d6]' : 'bg-white/10'}`}
            title={label}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(3.25rem+env(safe-area-inset-bottom)+1.5rem)] [touch-action:pan-y]">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-2">
          {resumed && step === 0 && (
            <p className="rounded-xl border border-[#6ec8d6]/30 bg-[#6ec8d6]/10 px-3 py-2.5 text-xs text-white/80">
              Picked up where you left off, nothing was lost.
            </p>
          )}
          {smallScreen && step === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/70">
              Tip: this is easier on a computer. Your progress saves here, so you can switch devices anytime.
            </p>
          )}
          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-xs text-red-200">{error}</p>
          )}

          {step === 0 && (
            <>
              <h2 className="text-xl font-bold">Name your coaching system</h2>
              <p className="text-sm text-white/60">
                This is your own space, your skill cards, drills, and maps live here, separate from everyone
                else's.
              </p>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-white/70">System name</span>
                <input
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value
                    patch({ name, handle: draft.handle || slugify(name) })
                  }}
                  placeholder="e.g. Coach Maya's tumbling"
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-white/70">Handle</span>
                <input
                  value={draft.handle}
                  onChange={(e) => patch({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="coach-maya"
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-white/70">Tagline (optional)</span>
                <input
                  value={draft.tagline}
                  onChange={(e) => patch({ tagline: e.target.value })}
                  placeholder="One line about how you coach"
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
                />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-xl font-bold">Pick your first skill</h2>
              <p className="text-sm text-white/60">
                Start with one card. Adopting copies it into your system, your edits never change the original.
              </p>
              {!creatingSkill && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {starterHits.map((hit) => (
                      <button
                        key={hit.skill.id}
                        type="button"
                        onClick={() => pickExistingSkill(hit)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          draft.firstSkillId && firstSkill?.name === hit.skill.name
                            ? 'bg-[#6ec8d6] text-black'
                            : 'bg-white/10 text-white/80'
                        }`}
                      >
                        {hit.skill.name}
                      </button>
                    ))}
                  </div>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search all skills…"
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
                  />
                  {query.trim() && (
                    <div className="flex flex-col gap-1">
                      {searchHits.slice(0, 8).map((hit) => (
                        <button
                          key={hit.skill.id}
                          type="button"
                          onClick={() => pickExistingSkill(hit)}
                          className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                        >
                          <span className="font-semibold">{hit.skill.name}</span>
                          <span className="ml-2 text-xs text-white/45">adopt a copy</span>
                        </button>
                      ))}
                      {searchHits.length === 0 && (
                        <p className="text-xs text-white/50">No matches, try another name, or create it below.</p>
                      )}
                    </div>
                  )}
                  {firstSkill && !creatingSkill && (
                    <p className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2.5 text-xs text-emerald-100">
                      ✓ Starting with <b>{firstSkill.name}</b>
                      {draft.firstSkillIsNew ? ' (your new card)' : ' (your own copy)'}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setCreatingSkill(true)}
                    className="rounded-xl border border-dashed border-white/20 px-3 py-2.5 text-sm font-semibold text-white/70"
                  >
                    + Create a brand-new skill instead
                  </button>
                </>
              )}
              {creatingSkill && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-white/70">New skill name</span>
                    <input
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="e.g. Switch kick full"
                      className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingSkill(false)
                      setNewSkillName('')
                    }}
                    className="text-left text-xs text-white/50 underline"
                  >
                    Back to picking an existing skill
                  </button>
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-bold">Add drills and clips</h2>
              <p className="text-sm text-white/60">
                {firstSkill ? (
                  <>These land on your <b>{firstSkill.name}</b> card. You can add more anytime.</>
                ) : (
                  'Pick a first skill first, then come back here.'
                )}
              </p>
              <div className="flex flex-col gap-2">
                <input
                  value={drillLabel}
                  onChange={(e) => setDrillLabel(e.target.value)}
                  placeholder="Drill name, e.g. Candlestick snap-downs"
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
                />
                <input
                  value={drillUrl}
                  onChange={(e) => setDrillUrl(e.target.value)}
                  placeholder="Video link (optional)"
                  inputMode="url"
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={addDrill}
                  className="rounded-xl bg-white/10 px-3 py-2.5 text-sm font-bold text-white"
                >
                  + Add drill
                </button>
              </div>
              {draft.drills.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {draft.drills.map((d, i) => (
                    <li
                      key={`${d.label}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{d.label}</span>
                        {d.videoUrl && <span className="block truncate text-xs text-[#6ec8d6]">{d.videoUrl}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => patch({ drills: draft.drills.filter((_, idx) => idx !== i) })}
                        className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-xs"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-white/45">Nothing to add yet? Skip ahead, drills can wait.</p>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-bold">Who can see your map?</h2>
              <p className="text-sm text-white/60">
                You set this per map and per card. Start private, open it up whenever you're ready.
              </p>
              <div className="flex flex-col gap-2">
                {(Object.keys(VISIBILITY_LABELS) as SystemVisibility[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => patch({ mapVisibility: v })}
                    aria-pressed={draft.mapVisibility === v}
                    className={`rounded-xl border px-3 py-3 text-left ${
                      draft.mapVisibility === v
                        ? 'border-[#6ec8d6] bg-[#6ec8d6]/10'
                        : 'border-white/10 bg-black/25'
                    }`}
                  >
                    <span className="block text-sm font-bold">
                      {draft.mapVisibility === v ? '● ' : '○ '}
                      {VISIBILITY_LABELS[v]}
                    </span>
                    <span className="mt-0.5 block text-xs text-white/55">{VISIBILITY_BLURBS[v]}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-xl font-bold">Connect your Muse</h2>
              <p className="text-sm text-white/60">
                Drop drill videos, references, and card info into your own Muse and it files them straight into
                your map. Generate your coach key below, it's shown once, so save it somewhere safe.
              </p>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <p className="text-xs font-semibold text-white/70">What this key can do</p>
                <p className="mt-1 text-xs text-white/55">{scopeText(COACH_SCOPES)}</p>
                <p className="mt-1 text-xs text-white/45">{PRESET_BLURBS.coach}</p>
              </div>
              {!keySecret ? (
                <>
                  {keyError && <p className="text-xs text-red-200">{keyError}</p>}
                  <button
                    type="button"
                    onClick={generateKey}
                    disabled={keyBusy}
                    className="rounded-xl bg-[#6ec8d6] px-4 py-3 text-sm font-black text-black disabled:opacity-50"
                  >
                    {keyBusy ? 'Generating…' : 'Generate my coach key'}
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-3">
                  <p className="text-xs font-bold text-emerald-100">Your key (shown once, copy it now)</p>
                  <p className="break-all rounded-lg bg-black/40 p-2 font-mono text-xs text-white">{keySecret}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyKey}
                      className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold"
                    >
                      {copied ? '✓ Copied' : 'Copy key'}
                    </button>
                    <label className="flex items-center gap-2 text-xs text-white/70">
                      <input
                        type="checkbox"
                        checked={draft.keySaved}
                        onChange={(e) => patch({ keySaved: e.target.checked })}
                      />
                      I've saved it somewhere safe
                    </label>
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-bold">Rather build inside the app?</p>
                <p className="mt-1 text-xs text-white/60">
                  Open Ask and tell it what to add, for example, "add candlestick drill to my roundoff
                  path", and it files the drill onto your card.
                </p>
                <button
                  type="button"
                  onClick={onOpenAsk}
                  className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold"
                >
                  Open Ask
                </button>
              </div>
              <p className="text-xs text-white/45">
                You can generate or revoke keys anytime later from the Muse connection screen.
              </p>
            </>
          )}
        </div>
      </div>

      <footer className="flex gap-2 border-t border-white/10 px-4 py-3">
        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="flex-1 rounded-xl bg-[#6ec8d6] px-4 py-3 text-sm font-black text-black"
          >
            {step === 2 && draft.drills.length === 0 ? 'Skip for now' : 'Continue'}
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            className="flex-1 rounded-xl bg-[#6ec8d6] px-4 py-3 text-sm font-black text-black"
          >
            Finish, open my system
          </button>
        )}
      </footer>
    </div>
  )
}
