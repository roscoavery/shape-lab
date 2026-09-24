import { useEffect, useMemo, useState } from 'react'
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

export function SkillPathBuilder({
  coachId,
  athletes = [],
  onClose,
  startSkillId = null,
}: Props) {
  const [tick, setTick] = useState(0)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(startSkillId)
  useEffect(() => subscribeSkillPaths(() => setTick((n) => n + 1)), [])
  void tick
  const skills = useMemo(() => (query.trim() ? searchSkills(query) : listSkills()), [query, tick])
  const listedHopes = useMemo(() => unmatchedAthleteGoals(athletes), [athletes, tick])

  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-[#071018] text-[var(--text)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6ec8d6]">
            Skill paths
          </p>
          <p className="text-sm text-white/60">
            Prerequisites and body standards for bigger hopes
          </p>
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
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
          <p className="text-sm leading-relaxed text-white/65">
            Pick one hope. Build only that path today — the pieces that make
            it more likely. Do not try to edit every skill at once.
          </p>
          <input
            className="h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
            placeholder="Find the one skill you are building today"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {!openId && listedHopes.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6ec8d6]">
                Start with one hope on the roster
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {listedHopes.slice(0, 8).map((hope) => (
                  <button
                    key={hope.key}
                    type="button"
                    onClick={() => {
                      const match = listSkills().find(
                        (s) => s.name.toLowerCase() === hope.label.toLowerCase(),
                      )
                      setOpenId(match?.id ?? null)
                      setQuery(hope.label)
                    }}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold"
                  >
                    {hope.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!openId && listedHopes.length > 0 && (
            <section className="rounded-2xl border border-[#6ec8d6]/35 bg-[#102028] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6ec8d6]">
                Skills athletes listed as goals
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/65">
                These hopes are not in the pathway yet. They stay here until you
                add them — they are not added automatically.
              </p>
              <ul className="mt-3 space-y-2">
                {listedHopes.map((row) => (
                  <li
                    key={row.key}
                    className="rounded-xl border border-white/10 bg-black/25 px-3 py-2"
                  >
                    <p className="text-sm font-bold">
                      {row.label}
                      {row.surface ? ` · ${surfaceLabel(row.surface)}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-white/55">
                      {row.athletes.map((a) => a.name).join(', ')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const saved = saveSkill({ name: row.label, coachId })
                        setOpenId(saved.id)
                        setQuery('')
                      }}
                      className="mt-2 text-xs font-semibold text-[#6ec8d6]"
                    >
                      Add to pathway
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <NewSkillForm
            coachId={coachId}
            onSaved={(id) => {
              setOpenId(id)
              setQuery('')
            }}
          />
          {(openId ? skills.filter((s) => s.id === openId) : skills.slice(0, 8)).map((skill) => (
            <article key={skill.id} className="rounded-2xl border border-white/10 bg-[#0d161c] p-3">
              <button
                type="button"
                onClick={() => setOpenId((cur) => (cur === skill.id ? null : skill.id))}
                className="w-full text-left"
              >
                <p className="text-base font-bold">{skill.name}</p>
                {skill.note && (
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{skill.note}</p>
                )}
              </button>
              {openId === skill.id && <SkillEditor skill={skill} coachId={coachId} />}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

function NewSkillForm({
  coachId,
  onSaved,
}: {
  coachId?: string
  onSaved: (id: string) => void
}) {
  const [name, setName] = useState('')
  return (
    <div className="rounded-2xl border border-dashed border-white/20 p-3">
      <p className="text-sm font-semibold">Add a skill or goal</p>
      <div className="mt-2 flex gap-2">
        <input
          className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
          placeholder="New skill name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              const row = saveSkill({ name, coachId })
              setName('')
              onSaved(row.id)
            }
          }}
        />
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => {
            const row = saveSkill({ name, coachId })
            setName('')
            onSaved(row.id)
          }}
          className="rounded-lg bg-[#6ec8d6] px-3 text-sm font-bold text-[#061418] disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function SkillEditor({ skill, coachId }: { skill: SkillDef; coachId?: string }) {
  const [name, setName] = useState(skill.name)
  const [note, setNote] = useState(skill.note ?? '')
  const [surfaces, setSurfaces] = useState<TrainingSurface[]>(skill.surfaces ?? [])
  const [powerText, setPowerText] = useState((skill.powerDown ?? []).map((s) => s.label).join('\n'))
  const live = getSkill(skill.id) ?? skill
  const needs = needsForSkill(live.id)
  const cond = conditioningForSkill(live.id)

  const persist = (patch: Partial<SkillDef> = {}) => {
    saveSkill({
      id: skill.id,
      name: patch.name ?? name,
      note: patch.note ?? note,
      surfaces: patch.surfaces ?? surfaces,
      coachId,
      powerDown: (patch.powerDown ??
        powerText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((label, i) => ({
            id: live.powerDown?.[i]?.id ?? `pd_${skill.id}_${i}`,
            label,
          }))),
    })
  }

  return (
    <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
      <label className="block">
        <span className="text-xs font-semibold text-white/55">Name</span>
        <input
          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => persist({ name })}
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-white/55">How coaches should read this</span>
        <textarea
          className="mt-1 min-h-[4.5rem] w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => persist({ note })}
        />
      </label>
      <div>
        <p className="text-xs font-semibold text-white/55">Typical surfaces</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {TRAINING_SURFACES.map((row) => {
            const on = surfaces.includes(row.id)
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  const next = on ? surfaces.filter((id) => id !== row.id) : [...surfaces, row.id]
                  setSurfaces(next)
                  persist({ surfaces: next })
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  on ? 'bg-[#6ec8d6] text-[#061418]' : 'border border-white/15'
                }`}
              >
                {row.short}
              </button>
            )
          })}
        </div>
      </div>
      <label className="block">
        <span className="text-xs font-semibold text-white/55">
          More power → less power (one step per line)
        </span>
        <textarea
          className="mt-1 min-h-[6rem] w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
          value={powerText}
          onChange={(e) => setPowerText(e.target.value)}
          onBlur={() => persist()}
          placeholder="2-step hurdle&#10;Power hurdle&#10;Standing tuck"
        />
      </label>

      <div>
        <p className="text-sm font-semibold">Prerequisites</p>
        <ul className="mt-2 space-y-2">
          {needs.map((need) => (
            <li key={need.id} className="rounded-xl bg-black/30 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6ec8d6]">
                {NEED_KIND_LABEL[need.kind]}
              </p>
              <p className="text-sm font-semibold">{needLabel(need)}</p>
              {need.note && <p className="text-xs text-white/55">{need.note}</p>}
              <button
                type="button"
                onClick={() => deleteNeed(need.id)}
                className="mt-1 text-xs text-[#e06b6b]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <AddNeedForm skillId={skill.id} />
      </div>

      <div>
        <p className="text-sm font-semibold">Body standards</p>
        <ul className="mt-2 space-y-2">
          {cond.map((row) => (
            <li key={row.id} className="rounded-xl bg-black/30 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6ec8d6]">
                {NEED_KIND_LABEL[row.kind]}
              </p>
              <p className="text-sm font-semibold">{row.label}</p>
              <button
                type="button"
                onClick={() => deleteConditioning(row.id)}
                className="mt-1 text-xs text-[#e06b6b]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <AddConditionForm skillId={skill.id} />
      </div>

      <button
        type="button"
        onClick={() => deleteSkill(skill.id)}
        className="text-xs font-semibold text-[#e06b6b]"
      >
        Delete this skill
      </button>
    </div>
  )
}

function AddNeedForm({ skillId }: { skillId: string }) {
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [kind, setKind] = useState<SkillNeedKind>('helpful')
  const [surface, setSurface] = useState<TrainingSurface | ''>('')
  const picks = searchSkills(query).filter((s) => s.id !== skillId).slice(0, 6)

  const add = (needSkillId?: string, label?: string) => {
    const text = (label || query).trim()
    if (!needSkillId && !text) return
    saveNeed({
      skillId,
      needSkillId,
      label: needSkillId ? undefined : text,
      kind,
      note: note.trim() || undefined,
      surfaces: surface ? [surface] : undefined,
      order: Date.now() % 100000,
    })
    setQuery('')
    setNote('')
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-white/10 p-2">
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
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSurface('')}
          className={`rounded-full px-2 py-1 text-[11px] ${
            !surface ? 'bg-white/15' : 'border border-white/10'
          }`}
        >
          Any surface
        </button>
        {TRAINING_SURFACES.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setSurface(row.id)}
            className={`rounded-full px-2 py-1 text-[11px] ${
              surface === row.id ? 'bg-white/15' : 'border border-white/10'
            }`}
          >
            {row.short}
          </button>
        ))}
      </div>
      <input
        className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
        placeholder="Search a skill, or type a new piece"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <input
        className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {picks.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => add(s.id, s.name)}
          className="block w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm"
        >
          {s.name}
        </button>
      ))}
      {query.trim() && (
        <button
          type="button"
          onClick={() => add(undefined, query.trim())}
          className="text-xs font-semibold text-[#6ec8d6]"
        >
          Add “{query.trim()}” as a free-text piece
        </button>
      )}
    </div>
  )
}

function AddConditionForm({ skillId }: { skillId: string }) {
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<SkillNeedKind>('helpful')
  return (
    <div className="mt-2 flex flex-col gap-2">
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
          className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm"
          placeholder="Hollow arms up for 1 minute"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button
          type="button"
          disabled={!label.trim()}
          onClick={() => {
            saveConditioning({ skillId, label: label.trim(), kind })
            setLabel('')
          }}
          className="rounded-lg bg-white/10 px-3 text-sm font-semibold disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  )
}
