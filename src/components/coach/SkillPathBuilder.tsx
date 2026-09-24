import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Athlete, TrainingSurface } from '../../types'
import {
  NEED_KIND_LABEL,
  TRAINING_SURFACES,
  conditioningForSkill,
  deleteConditioning,
  deleteNeed,
  deleteSkill,
  getSkill,
  listSkills,
  matchSkillExact,
  needLabel,
  needsForSkill,
  saveConditioning,
  saveNeed,
  saveSkill,
  searchSkills,
  subscribeSkillPaths,
  surfaceLabel,
  unmatchedAthleteGoals,
  type SkillDef,
  type SkillNeedKind,
} from '../../lib/skillPaths'

type Props = {
  coachId?: string
  athletes?: Athlete[]
  onClose: () => void
  startSkillId?: string | null
}

const KINDS: SkillNeedKind[] = ['required', 'helpful', 'alt']

type Step =
  | 'pick'
  | 'name'
  | 'surface'
  | 'where'
  | 'subgoal'
  | 'another'
  | 'body'
  | 'review'

export function SkillPathBuilder({
  coachId,
  athletes = [],
  onClose,
  startSkillId = null,
}: Props) {
  const [tick, setTick] = useState(0)
  useEffect(() => subscribeSkillPaths(() => setTick((n) => n + 1)), [])
  void tick

  const listedHopes = useMemo(() => unmatchedAthleteGoals(athletes), [athletes, tick])
  const existingSkills = useMemo(() => listSkills(), [tick])

  const [step, setStep] = useState<Step>(startSkillId ? 'review' : 'pick')
  const [skillId, setSkillId] = useState<string | null>(startSkillId)
  const [draftName, setDraftName] = useState('')
  const [draftSurfaces, setDraftSurfaces] = useState<TrainingSurface[]>([])
  const [whereDraft, setWhereDraft] = useState('')
  const [subgoalDraft, setSubgoalDraft] = useState('')
  const [subgoalKind, setSubgoalKind] = useState<SkillNeedKind>('helpful')
  const [bodyDraft, setBodyDraft] = useState('')
  const [pickQuery, setPickQuery] = useState('')

  const skill = skillId ? getSkill(skillId) : null
  const needs = skill ? needsForSkill(skill.id) : []
  const cond = skill ? conditioningForSkill(skill.id) : []

  const beginHope = (label: string, surfaces: TrainingSurface[] = []) => {
    const match = matchSkillExact(label) ?? listSkills().find((s) => s.name.toLowerCase() === label.toLowerCase())
    const saved = match ?? saveSkill({ name: label, coachId, surfaces })
    setSkillId(saved.id)
    setDraftName(saved.name)
    setDraftSurfaces(saved.surfaces?.length ? saved.surfaces : surfaces)
    setStep(match && (needsForSkill(saved.id).length > 0 || (saved.workWhere?.length ?? 0) > 0) ? 'review' : 'name')
  }

  const persistSkill = (patch: Partial<SkillDef> = {}) => {
    if (!skillId) return
    const live = getSkill(skillId)
    if (!live) return
    saveSkill({
      id: skillId,
      name: patch.name ?? draftName ?? live.name,
      note: patch.note ?? live.note,
      surfaces: patch.surfaces ?? draftSurfaces,
      coachId,
      powerDown: live.powerDown,
      workWhere: patch.workWhere ?? live.workWhere,
    })
  }

  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-[#071018] text-[var(--text)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6ec8d6]">
            Skill paths
          </p>
          <p className="text-sm text-white/60">One question at a time</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
        >
          Close
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
          {step === 'pick' && (
            <QuestionCard
              prompt="Which hope are you building a path for?"
              hint="Pick one listed hope, an existing skill, or type a new name. Dead mat is a spec of the same skill — not a second skill."
            >
              {listedHopes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6ec8d6]">
                    Hopes on the roster
                  </p>
                  {listedHopes.map((hope) => (
                    <button
                      key={hope.key}
                      type="button"
                      onClick={() => beginHope(hope.label, hope.surfaces)}
                      className="block w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-left"
                    >
                      <p className="text-sm font-bold">{hope.label}</p>
                      <p className="mt-0.5 text-xs text-white/55">
                        {hope.athletes.map((a) => a.name).join(', ')}
                        {hope.surfaces.length
                          ? ` · specs: ${hope.surfaces.map(surfaceLabel).join(', ')}`
                          : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <input
                className="h-12 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
                placeholder="Search a skill already in the map"
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
              />
              {(pickQuery.trim() ? searchSkills(pickQuery) : existingSkills.slice(0, 6)).map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setSkillId(row.id)
                    setDraftName(row.name)
                    setDraftSurfaces(row.surfaces ?? [])
                    setStep('review')
                  }}
                  className="block w-full rounded-xl bg-white/5 px-3 py-3 text-left text-sm font-semibold"
                >
                  {row.name}
                </button>
              ))}
              <div className="flex gap-2">
                <input
                  className="h-12 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
                  placeholder="Or type a new skill name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && draftName.trim()) beginHope(draftName.trim())
                  }}
                />
                <button
                  type="button"
                  disabled={!draftName.trim()}
                  onClick={() => beginHope(draftName.trim())}
                  className="rounded-lg bg-[#6ec8d6] px-4 text-sm font-bold text-[#061418] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </QuestionCard>
          )}

          {step === 'name' && skill && (
            <QuestionCard
              prompt={`Keep this name for the skill?`}
              hint="Round-off handspring on dead mat is still round-off handspring. The surface is a spec of this hope."
            >
              <input
                className="h-12 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
              <NavRow
                back={() => setStep('pick')}
                next={() => {
                  persistSkill({ name: draftName })
                  setStep('surface')
                }}
                nextLabel="That's the skill"
              />
            </QuestionCard>
          )}

          {step === 'surface' && skill && (
            <QuestionCard
              prompt="Did anyone name a surface for this hope?"
              hint="Dead mat, tramp, spring floor — these specify the same skill. Skip if they did not say."
            >
              <div className="flex flex-wrap gap-1.5">
                {TRAINING_SURFACES.map((row) => {
                  const on = draftSurfaces.includes(row.id)
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() =>
                        setDraftSurfaces((cur) =>
                          on ? cur.filter((id) => id !== row.id) : [...cur, row.id],
                        )
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        on ? 'bg-[#6ec8d6] text-[#061418]' : 'border border-white/15'
                      }`}
                    >
                      {row.short}
                    </button>
                  )
                })}
              </div>
              <NavRow
                back={() => setStep('name')}
                next={() => {
                  persistSkill({ surfaces: draftSurfaces })
                  setStep('where')
                }}
                nextLabel="Next"
                skip={() => {
                  persistSkill({ surfaces: draftSurfaces })
                  setStep('where')
                }}
              />
            </QuestionCard>
          )}

          {step === 'where' && skill && (
            <QuestionCard
              prompt="Where should coaches work this?"
              hint="Spot, tramp, dead mat, rod — whatever you want the next coach to see when this hope comes up again."
            >
              {(skill.workWhere ?? []).length > 0 && (
                <ul className="space-y-1 text-sm">
                  {skill.workWhere!.map((line) => (
                    <li key={line} className="rounded-lg bg-black/30 px-3 py-2">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
              <input
                className="h-12 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
                placeholder="e.g. Dead mat first, then tramp"
                value={whereDraft}
                onChange={(e) => setWhereDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && whereDraft.trim()) {
                    persistSkill({ workWhere: [...(skill.workWhere ?? []), whereDraft.trim()] })
                    setWhereDraft('')
                  }
                }}
              />
              <button
                type="button"
                disabled={!whereDraft.trim()}
                onClick={() => {
                  persistSkill({ workWhere: [...(skill.workWhere ?? []), whereDraft.trim()] })
                  setWhereDraft('')
                }}
                className="self-start rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold disabled:opacity-40"
              >
                Save this place
              </button>
              <NavRow back={() => setStep('surface')} next={() => setStep('subgoal')} nextLabel="Next" skip={() => setStep('subgoal')} />
            </QuestionCard>
          )}

          {step === 'subgoal' && skill && (
            <QuestionCard
              prompt={`Name one piece that helps ${skill.name}.`}
              hint="If this hope has been built before, the pieces already on file show below. Add only what is missing."
            >
              {needs.length > 0 && (
                <ul className="space-y-2">
                  {needs.map((need) => (
                    <li key={need.id} className="rounded-xl bg-black/30 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6ec8d6]">
                        {NEED_KIND_LABEL[need.kind]}
                      </p>
                      <p className="text-sm font-semibold">{needLabel(need)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSubgoalKind(id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      subgoalKind === id ? 'bg-[#6ec8d6] text-[#061418]' : 'border border-white/15'
                    }`}
                  >
                    {NEED_KIND_LABEL[id]}
                  </button>
                ))}
              </div>
              <input
                className="h-12 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
                placeholder="A prerequisite or helpful subgoal"
                value={subgoalDraft}
                onChange={(e) => setSubgoalDraft(e.target.value)}
              />
              {searchSkills(subgoalDraft)
                .filter((s) => s.id !== skill.id)
                .slice(0, 4)
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      saveNeed({
                        skillId: skill.id,
                        needSkillId: s.id,
                        kind: subgoalKind,
                        order: Date.now() % 100000,
                      })
                      setSubgoalDraft('')
                      setStep('another')
                    }}
                    className="block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm"
                  >
                    Use existing · {s.name}
                  </button>
                ))}
              <NavRow
                back={() => setStep('where')}
                next={() => {
                  if (subgoalDraft.trim()) {
                    saveNeed({
                      skillId: skill.id,
                      label: subgoalDraft.trim(),
                      kind: subgoalKind,
                      order: Date.now() % 100000,
                    })
                    setSubgoalDraft('')
                  }
                  setStep('another')
                }}
                nextLabel={subgoalDraft.trim() ? 'Save this piece' : 'Skip'}
              />
            </QuestionCard>
          )}

          {step === 'another' && skill && (
            <QuestionCard prompt="Add another piece for this hope?">
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setStep('subgoal')}
                  className="h-12 rounded-xl bg-[#6ec8d6] text-sm font-bold text-[#061418]"
                >
                  Yes — one more
                </button>
                <button
                  type="button"
                  onClick={() => setStep('body')}
                  className="h-12 rounded-xl border border-white/15 text-sm font-semibold"
                >
                  That is enough
                </button>
              </div>
            </QuestionCard>
          )}

          {step === 'body' && skill && (
            <QuestionCard
              prompt="Any body standard that helps this hope?"
              hint="Hollow time, wall handstand, strength — skip if none."
            >
              {cond.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {cond.map((row) => (
                    <li key={row.id} className="rounded-lg bg-black/30 px-3 py-2">
                      {row.label}
                    </li>
                  ))}
                </ul>
              )}
              <input
                className="h-12 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
                placeholder="Hollow arms up for 1 minute"
                value={bodyDraft}
                onChange={(e) => setBodyDraft(e.target.value)}
              />
              <NavRow
                back={() => setStep('another')}
                next={() => {
                  if (bodyDraft.trim()) {
                    saveConditioning({ skillId: skill.id, label: bodyDraft.trim(), kind: 'helpful' })
                    setBodyDraft('')
                  }
                  setStep('review')
                }}
                nextLabel={bodyDraft.trim() ? 'Save and review' : 'Skip to review'}
              />
            </QuestionCard>
          )}

          {step === 'review' && skill && (
            <QuestionCard
              prompt={skill.name}
              hint="This is the path on file. Next time someone lists this hope, these pieces show up — including on dead mat or any other surface."
            >
              {(skill.workWhere ?? []).length > 0 && (
                <p className="text-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6ec8d6]">
                    Where to work it
                  </span>
                  <span className="mt-0.5 block">{skill.workWhere!.join(' · ')}</span>
                </p>
              )}
              {skill.surfaces && skill.surfaces.length > 0 && (
                <p className="text-sm text-white/70">
                  Specs named · {skill.surfaces.map(surfaceLabel).join(', ')}
                </p>
              )}
              <ul className="space-y-2">
                {needs.map((need) => (
                  <li key={need.id} className="rounded-xl bg-black/30 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6ec8d6]">
                      {NEED_KIND_LABEL[need.kind]}
                    </p>
                    <p className="text-sm font-semibold">{needLabel(need)}</p>
                    <button type="button" onClick={() => deleteNeed(need.id)} className="mt-1 text-xs text-[#e06b6b]">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <ul className="space-y-1">
                {cond.map((row) => (
                  <li key={row.id} className="rounded-xl bg-black/30 px-3 py-2 text-sm">
                    {row.label}
                    <button
                      type="button"
                      onClick={() => deleteConditioning(row.id)}
                      className="ml-2 text-xs text-[#e06b6b]"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setStep('subgoal')}
                  className="h-11 rounded-xl bg-[#6ec8d6] text-sm font-bold text-[#061418]"
                >
                  Add another piece
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSkillId(null)
                    setDraftName('')
                    setDraftSurfaces([])
                    setStep('pick')
                  }}
                  className="h-11 rounded-xl border border-white/15 text-sm font-semibold"
                >
                  Build a different hope
                </button>
                <button type="button" onClick={onClose} className="text-sm text-white/55 underline">
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteSkill(skill.id)
                    setSkillId(null)
                    setStep('pick')
                  }}
                  className="text-xs text-[#e06b6b]"
                >
                  Delete this skill
                </button>
              </div>
            </QuestionCard>
          )}
        </div>
      </div>
    </div>
  )
}

function QuestionCard({
  prompt,
  hint,
  children,
}: {
  prompt: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d161c] p-4">
      <h2 className="text-xl font-bold leading-snug">{prompt}</h2>
      {hint && <p className="mt-2 text-sm leading-relaxed text-white/60">{hint}</p>}
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </section>
  )
}

function NavRow({
  back,
  next,
  nextLabel,
  skip,
}: {
  back: () => void
  next: () => void
  nextLabel: string
  skip?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={back} className="rounded-lg px-3 py-2 text-sm text-white/60">
        Back
      </button>
      <button
        type="button"
        onClick={next}
        className="rounded-lg bg-[#6ec8d6] px-4 py-2 text-sm font-bold text-[#061418]"
      >
        {nextLabel}
      </button>
      {skip && (
        <button type="button" onClick={skip} className="text-sm text-white/50 underline">
          Skip
        </button>
      )}
    </div>
  )
}
