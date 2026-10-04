import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Athlete, TrainingSurface } from '../../types'
import { createId, saveAthletes } from '../../lib/storage'
import {
  NEED_KIND_LABEL,
  TRAINING_SURFACES,
  clearSkillEdits,
  deleteConditioning,
  deleteNeed,
  getEditableSkill,
  linkHopeToSkill,
  needLabel,
  saveConditioning,
  saveNeed,
  saveSkill,
  subscribeSkillPaths,
  surfaceLabel,
  unmatchedAthleteGoals,
  type EditableSkill,
  type ListedAthleteGoal,
  type PowerDownStep,
  type SkillNeed,
  type SkillNeedKind,
} from '../../lib/skillPaths'
import {
  TRACK_LABELS,
  TRACK_ORDER,
  searchSkills as searchRegistrySkills,
  skillsByTrack,
  type UnifiedSkill,
  type UnifiedSkillTrack,
} from '../../lib/skillRegistry'

type Props = {
  coachId?: string
  athletes?: Athlete[]
  onClose: () => void
  startSkillId?: string | null
  /**
   * Granted edit on the default system: saves land on the shared row
   * (no coach namespace) instead of the coach's own override.
   */
  unscopedEdit?: boolean
}

const KINDS: SkillNeedKind[] = ['required', 'helpful', 'alt']

/**
 * Phase 3: the skill editor. One place to maintain a skill — pick it from
 * the unified registry, then edit its guide content, aliases, track,
 * prerequisites, conditioning, power-down steps, and work-where notes.
 * Everything saves incrementally into the skill-paths file; guide prose,
 * aliases, and track are merged over the registry seed at read time.
 */
export function SkillPathBuilder({
  coachId,
  athletes = [],
  onClose,
  startSkillId = null,
  unscopedEdit = false,
}: Props) {
  const [tick, setTick] = useState(0)
  useEffect(() => subscribeSkillPaths(() => setTick((n) => n + 1)), [])
  const [skillId, setSkillId] = useState<string | null>(startSkillId)
  const [query, setQuery] = useState('')
  const [linkHope, setLinkHope] = useState<ListedAthleteGoal | null>(null)
  const [linkQuery, setLinkQuery] = useState('')
  const [linkedKeys, setLinkedKeys] = useState<string[]>([])

  const hopes = useMemo(
    () => unmatchedAthleteGoals(athletes).filter((h) => !linkedKeys.includes(h.key)),
    [athletes, tick, linkedKeys],
  )
  const groups = useMemo(() => skillsByTrack(), [tick])
  const searchHits = useMemo(
    () => (query.trim() ? searchRegistrySkills(query.trim(), 15) : []),
    [query, tick],
  )
  const editable = useMemo(
    () => (skillId ? getEditableSkill(skillId) : null),
    [skillId, tick],
  )

  const openSkill = (id: string) => {
    setSkillId(id)
    setQuery('')
    setLinkHope(null)
    setLinkQuery('')
  }

  const commitHopeLink = (hope: ListedAthleteGoal, skill: UnifiedSkill) => {
    const next = linkHopeToSkill(hope.key, skill.id, athletes)
    saveAthletes(next)
    setLinkedKeys((cur) => (cur.includes(hope.key) ? cur : [...cur, hope.key]))
    openSkill(skill.id)
  }

  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-[#071018] text-[var(--text)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6ec8d6]">
            Skill paths
          </p>
          <p className="text-sm text-white/60">
            {editable ? 'One place to maintain a skill' : 'Pick a skill to maintain'}
          </p>
          {unscopedEdit && (
            <p className="mt-1 rounded-lg border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[11px] text-amber-100">
              Editing the default system directly, changes affect everyone.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
        >
          Close
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(3.25rem+env(safe-area-inset-bottom)+1.5rem)] [touch-action:pan-y]">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
          {editable ? (
            <SkillEditor
              key={editable.registry.id}
              editable={editable}
              coachId={coachId}
              unscopedEdit={unscopedEdit}
              onBack={() => setSkillId(null)}
            />
          ) : (
            <>
              {hopes.length > 0 && (
                <Section
                  title="Hopes on the roster"
                  hint="Athletes named these, but they don't link to a skill yet. Link one to open it in the editor."
                >
                  {hopes.map((hope) => (
                    <div
                      key={hope.key}
                      className="rounded-xl border border-white/10 bg-black/25 px-3 py-3"
                    >
                      <p className="text-sm font-bold">{hope.label}</p>
                      <p className="mt-0.5 text-xs text-white/55">
                        {hope.athletes.map((a) => a.name).join(', ')}
                        {hope.surfaces.length
                          ? ` · specs: ${hope.surfaces.map(surfaceLabel).join(', ')}`
                          : ''}
                      </p>
                      {linkHope?.key === hope.key ? (
                        <div className="mt-2 space-y-2">
                          <input
                            className="h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
                            placeholder="Search the skill list"
                            value={linkQuery}
                            onChange={(e) => setLinkQuery(e.target.value)}
                            autoFocus
                          />
                          {(linkQuery.trim()
                            ? searchRegistrySkills(linkQuery.trim(), 6)
                            : []
                          ).map((hit) => (
                            <button
                              key={hit.skill.id}
                              type="button"
                              onClick={() => commitHopeLink(hope, hit.skill)}
                              className="block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm"
                            >
                              <span className="font-semibold">{hit.skill.name}</span>
                              <span className="ml-2 text-xs text-white/50">
                                {TRACK_LABELS[hit.skill.track]}
                              </span>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setLinkHope(null)
                              setLinkQuery('')
                            }}
                            className="text-xs text-white/55 underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setLinkHope(hope)
                            setLinkQuery('')
                          }}
                          className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold"
                        >
                          Link to a skill
                        </button>
                      )}
                    </div>
                  ))}
                </Section>
              )}
              <Section
                title="All skills"
                hint="Search or browse the unified list. Everything about a skill is edited on its own page."
              >
                <input
                  className="h-12 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
                  placeholder="Search skills"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query.trim() ? (
                  <div className="space-y-1.5">
                    {searchHits.length === 0 && (
                      <p className="text-sm text-white/50">No skills match.</p>
                    )}
                    {searchHits.map((hit) => (
                      <SkillRow
                        key={hit.skill.id}
                        skill={hit.skill}
                        onOpen={() => openSkill(hit.skill.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groups.map((group) => (
                      <div key={group.track}>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6ec8d6]">
                          {TRACK_LABELS[group.track]} · {group.skills.length}
                        </p>
                        <div className="space-y-1.5">
                          {group.skills.map((skill) => (
                            <SkillRow
                              key={skill.id}
                              skill={skill}
                              onOpen={() => openSkill(skill.id)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SkillRow({ skill, onOpen }: { skill: UnifiedSkill; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full rounded-xl bg-white/5 px-3 py-2.5 text-left"
    >
      <span className="text-sm font-semibold">{skill.name}</span>
      {!skill.guideId && (
        <span className="ml-2 rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/50">
          no guide yet
        </span>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

function SkillEditor({
  editable,
  coachId,
  unscopedEdit,
  onBack,
}: {
  editable: EditableSkill
  coachId?: string
  unscopedEdit: boolean
  onBack: () => void
}) {
  const { registry } = editable

  /** Partial save of the device SkillDef row; undefined fields keep their values. */
  const persistMeta = (patch: {
    guideNeeds?: string[]
    canBend?: string[]
    ask?: string
    ryanNote?: string
    aliases?: string[]
    track?: UnifiedSkillTrack
    workWhere?: string[]
    surfaces?: TrainingSurface[]
    powerDown?: PowerDownStep[]
    note?: string
  }) => {
    saveSkill({ id: registry.id, name: registry.name, coachId: unscopedEdit ? undefined : coachId, ...patch })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button type="button" onClick={onBack} className="text-sm text-white/60">
          ← All skills
        </button>
        <h2 className="mt-1 text-2xl font-bold leading-tight">{registry.name}</h2>
        <p className="mt-1 text-xs text-white/55">
          {TRACK_LABELS[registry.track]} · {registry.guideId ? 'Has a guide card' : 'No guide card yet'}
          {registry.aliases.length > 0 && ` · also called ${registry.aliases.join(', ')}`}
        </p>
      </div>

      <Section
        title="Guide content"
        hint="What the Learn card says. Edit the words directly, nothing here is generated."
      >
        <StringList
          label="Needs"
          items={registry.guideNeeds ?? []}
          placeholder="Add a need, in your words"
          onAdd={(item) => persistMeta({ guideNeeds: [...(registry.guideNeeds ?? []), item] })}
          onRemove={(idx) =>
            persistMeta({ guideNeeds: (registry.guideNeeds ?? []).filter((_, i) => i !== idx) })
          }
        />
        <StringList
          label="Can bend"
          items={registry.canBend ?? []}
          placeholder="Add something that can bend"
          onAdd={(item) => persistMeta({ canBend: [...(registry.canBend ?? []), item] })}
          onRemove={(idx) =>
            persistMeta({ canBend: (registry.canBend ?? []).filter((_, i) => i !== idx) })
          }
        />
        <TextField
          label="Ask"
          value={registry.ask ?? ''}
          placeholder="The question this card asks the athlete"
          rows={2}
          onSave={(v) => persistMeta({ ask: v })}
        />
        <TextField
          label="Coach note"
          value={registry.ryanNote ?? ''}
          placeholder="Your note, in your words"
          rows={3}
          onSave={(v) => persistMeta({ ryanNote: v })}
        />
      </Section>

      <Section title="Aliases" hint="Other names athletes and coaches use for this skill.">
        <StringList
          label="Aliases"
          items={registry.aliases}
          placeholder="Add an alias"
          onAdd={(item) => persistMeta({ aliases: [...registry.aliases, item] })}
          onRemove={(idx) =>
            persistMeta({ aliases: registry.aliases.filter((_, i) => i !== idx) })
          }
        />
      </Section>

      <Section title="Track" hint="Which list this skill lives in.">
        <div className="flex flex-wrap gap-1.5">
          {TRACK_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => persistMeta({ track: t })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                registry.track === t ? 'bg-[#6ec8d6] text-[#061418]' : 'border border-white/15'
              }`}
            >
              {TRACK_LABELS[t]}
            </button>
          ))}
        </div>
      </Section>

      <NeedsEditor editable={editable} />
      <ConditioningEditor editable={editable} />
      <PowerDownEditor editable={editable} coachId={coachId} />

      <Section title="Where to work it" hint="Spot, tramp, dead mat, what the next coach should see.">
        <StringList
          label="Places"
          items={editable.local?.workWhere ?? []}
          placeholder="e.g. Dead mat first, then tramp"
          onAdd={(item) => persistMeta({ workWhere: [...(editable.local?.workWhere ?? []), item] })}
          onRemove={(idx) =>
            persistMeta({
              workWhere: (editable.local?.workWhere ?? []).filter((_, i) => i !== idx),
            })
          }
        />
      </Section>

      <Section title="Details" hint="Surface specs athletes named, plus your private coach note.">
        <div className="flex flex-wrap gap-1.5">
          {TRAINING_SURFACES.map((row) => {
            const surfaces = editable.local?.surfaces ?? []
            const on = surfaces.includes(row.id)
            return (
              <button
                key={row.id}
                type="button"
                onClick={() =>
                  persistMeta({
                    surfaces: on
                      ? surfaces.filter((id) => id !== row.id)
                      : [...surfaces, row.id],
                  })
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
        <TextField
          label="Coach note"
          value={editable.local?.note ?? ''}
          placeholder="Private note, coaches only"
          rows={2}
          onSave={(v) => persistMeta({ note: v })}
        />
      </Section>

      <ResetSection
        onReset={() => clearSkillEdits(registry.id)}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Needs (prerequisites)                                               */
/* ------------------------------------------------------------------ */

function NeedsEditor({ editable }: { editable: EditableSkill }) {
  const skillId = editable.registry.id
  const [kind, setKind] = useState<SkillNeedKind>('required')
  const [q, setQ] = useState('')
  const [free, setFree] = useState('')

  const hits = q.trim()
    ? searchRegistrySkills(q.trim(), 6).filter((h) => h.skill.id !== skillId)
    : []

  const addSkillNeed = (target: UnifiedSkill) => {
    saveNeed({ skillId, needSkillId: target.id, kind, order: Date.now() % 100000 })
    setQ('')
  }
  const addFreeNeed = () => {
    if (!free.trim()) return
    saveNeed({ skillId, label: free.trim(), kind, order: Date.now() % 100000 })
    setFree('')
  }

  return (
    <Section
      title="Prerequisites"
      hint="The pieces this skill needs, in order. Shipped pieces came from your progression map."
    >
      {editable.needs.length === 0 && (
        <p className="text-sm text-white/50">No prerequisites on file yet.</p>
      )}
      <ul className="space-y-2">
        {editable.needs.map((need) => (
          <NeedRow key={need.id} need={need} />
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              kind === id ? 'bg-[#6ec8d6] text-[#061418]' : 'border border-white/15'
            }`}
          >
            {NEED_KIND_LABEL[id]}
          </button>
        ))}
      </div>
      <input
        className="h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
        placeholder="Search the skill list for a prerequisite"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {hits.map((hit) => (
        <button
          key={hit.skill.id}
          type="button"
          onClick={() => addSkillNeed(hit.skill)}
          className="block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm"
        >
          Add · <span className="font-semibold">{hit.skill.name}</span>
        </button>
      ))}
      <div className="flex gap-2">
        <input
          className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
          placeholder="Or write a prerequisite as-is"
          value={free}
          onChange={(e) => setFree(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addFreeNeed()
          }}
        />
        <button
          type="button"
          disabled={!free.trim()}
          onClick={addFreeNeed}
          className="rounded-lg bg-white/10 px-4 text-sm font-semibold disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </Section>
  )
}

function NeedRow({ need }: { need: SkillNeed }) {
  return (
    <li className="rounded-xl bg-black/30 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6ec8d6]">
        {NEED_KIND_LABEL[need.kind]}
        {need.shipped ? <span className="ml-2 text-white/40">· shipped</span> : null}
      </p>
      <p className="text-sm font-semibold">{needLabel(need)}</p>
      {need.note ? <p className="mt-0.5 text-xs text-white/55">{need.note}</p> : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {KINDS.filter((k) => k !== need.kind).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => saveNeed({ ...need, kind: k })}
            className="text-[11px] text-white/50 underline"
          >
            Mark {NEED_KIND_LABEL[k].toLowerCase()}
          </button>
        ))}
        <button
          type="button"
          onClick={() => deleteNeed(need.id)}
          className="text-[11px] text-[#e06b6b]"
        >
          Remove
        </button>
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Conditioning                                                        */
/* ------------------------------------------------------------------ */

function ConditioningEditor({ editable }: { editable: EditableSkill }) {
  const skillId = editable.registry.id
  const [kind, setKind] = useState<SkillNeedKind>('helpful')
  const [draft, setDraft] = useState('')

  const add = () => {
    if (!draft.trim()) return
    saveConditioning({ skillId, label: draft.trim(), kind })
    setDraft('')
  }

  return (
    <Section title="Conditioning" hint="Body standards that help this skill.">
      {editable.conditioning.length === 0 && (
        <p className="text-sm text-white/50">Nothing on file yet.</p>
      )}
      <ul className="space-y-1.5">
        {editable.conditioning.map((row) => (
          <li
            key={row.id}
            className="flex items-start justify-between gap-2 rounded-xl bg-black/30 px-3 py-2"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6ec8d6]">
                {NEED_KIND_LABEL[row.kind]}
                {row.shipped ? <span className="ml-2 text-white/40">· shipped</span> : null}
              </p>
              <p className="text-sm">{row.label}</p>
            </div>
            <button
              type="button"
              onClick={() => deleteConditioning(row.id)}
              className="shrink-0 text-xs text-[#e06b6b]"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              kind === id ? 'bg-[#6ec8d6] text-[#061418]' : 'border border-white/15'
            }`}
          >
            {NEED_KIND_LABEL[id]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
          placeholder="e.g. Hollow arms up for 1 minute"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={add}
          className="rounded-lg bg-white/10 px-4 text-sm font-semibold disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Power-down steps                                                    */
/* ------------------------------------------------------------------ */

function PowerDownEditor({
  editable,
  coachId,
}: {
  editable: EditableSkill
  coachId?: string
}) {
  const { registry, local } = editable
  const steps = local?.powerDown ?? []
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')

  const setSteps = (next: PowerDownStep[]) => {
    saveSkill({ id: registry.id, name: registry.name, coachId, powerDown: next })
  }
  const add = () => {
    if (!label.trim()) return
    setSteps([
      ...steps,
      { id: createId('pd'), label: label.trim(), note: note.trim() || undefined },
    ])
    setLabel('')
    setNote('')
  }
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= steps.length) return
    const next = [...steps]
    const [row] = next.splice(idx, 1)
    next.splice(j, 0, row)
    setSteps(next)
  }

  return (
    <Section
      title="Power-down steps"
      hint="Regressions of this skill, easiest first, the ladder back down."
    >
      {steps.length === 0 && <p className="text-sm text-white/50">No steps on file yet.</p>}
      <ul className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={step.id} className="rounded-xl bg-black/30 px-3 py-2">
            <p className="text-sm font-semibold">
              <span className="mr-2 text-white/40">{i + 1}.</span>
              {step.label}
            </p>
            {step.note ? <p className="mt-0.5 text-xs text-white/55">{step.note}</p> : null}
            <div className="mt-1 flex gap-3 text-[11px]">
              <button type="button" onClick={() => move(i, -1)} className="text-white/50">
                ↑ Up
              </button>
              <button type="button" onClick={() => move(i, 1)} className="text-white/50">
                ↓ Down
              </button>
              <button
                type="button"
                onClick={() => setSteps(steps.filter((s) => s.id !== step.id))}
                className="text-[#e06b6b]"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <input
        className="h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
        placeholder="Step label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <input
        className="h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') add()
        }}
      />
      <button
        type="button"
        disabled={!label.trim()}
        onClick={add}
        className="self-start rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold disabled:opacity-40"
      >
        Add step
      </button>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Reset                                                               */
/* ------------------------------------------------------------------ */

function ResetSection({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <Section
      title="Reset"
      hint="Drop your local edits for this skill, aliases, track, guide words, and notes go back to the shared version. Prerequisites and conditioning stay."
    >
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold"
        >
          Clear my edits for this skill
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onReset()
              setConfirming(false)
            }}
            className="rounded-lg bg-[#e06b6b] px-3 py-2 text-xs font-bold text-[#1a0606]"
          >
            Yes, clear them
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs text-white/60 underline"
          >
            Keep them
          </button>
        </div>
      )}
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d161c] p-4">
      <h3 className="text-base font-bold">{title}</h3>
      {hint && <p className="mt-1 text-xs leading-relaxed text-white/55">{hint}</p>}
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </section>
  )
}

function StringList({
  label,
  items,
  placeholder,
  onAdd,
  onRemove,
}: {
  label: string
  items: string[]
  placeholder: string
  onAdd: (item: string) => void
  onRemove: (idx: number) => void
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    if (!draft.trim()) return
    onAdd(draft.trim())
    setDraft('')
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6ec8d6]">
        {label} · {items.length}
      </p>
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li
              key={`${i}:${item}`}
              className="flex items-start justify-between gap-2 rounded-lg bg-black/30 px-3 py-2 text-sm"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="shrink-0 text-xs text-[#e06b6b]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={add}
          className="rounded-lg bg-white/10 px-4 text-sm font-semibold disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  placeholder,
  rows,
  onSave,
}: {
  label: string
  value: string
  placeholder: string
  rows: number
  onSave: (v: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const dirty = draft !== value
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6ec8d6]">
        {label}
      </p>
      <textarea
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
        placeholder={placeholder}
        rows={rows}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!dirty}
          onClick={() => onSave(draft)}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
        >
          Save
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => setDraft(value)}
            className="text-xs text-white/55 underline"
          >
            Discard
          </button>
        )}
      </div>
    </div>
  )
}
