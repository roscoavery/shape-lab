import { useMemo, useState } from 'react'
import {
  defaultKeyHelperCombos,
  hasKeyHelperOverride,
  keyHelperCombosForTarget,
  resetKeyHelperCombos,
  saveKeyHelperCombos,
  skillNameFor,
} from '../../lib/keyHelperOverrides'
import { searchMapSkills } from '../../lib/skillPathHighlight'
import { canonicalSkillId } from '../../lib/skillPaths'
import { getRegistrySkill } from '../../lib/skillRegistry'

/**
 * Coach-only editor for a target skill's key helpers: the skills that
 * wiggle on the map when this skill is the shine target, and the only
 * helpers shown when "Direct path" is on.
 *
 * Ryan's edits save to the gym's data (data/skill-key-helpers.json) and
 * ride the normal revision sync, so they apply on every device. The
 * built-in list stays as the fallback and can be restored per skill.
 */
export function KeyHelperEditor({
  targetSkillId,
  targetName,
  onClose,
  mapIds,
  labelOf,
}: {
  targetSkillId: string
  targetName: string
  onClose: () => void
  mapIds: Set<string>
  labelOf: (id: string) => string
}) {
  const target = canonicalSkillId(targetSkillId)
  const [combos, setCombos] = useState<string[][]>(() =>
    keyHelperCombosForTarget(target, (id) => !!getRegistrySkill(id)),
  )
  const [addingTo, setAddingTo] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overridden, setOverridden] = useState(() => hasKeyHelperOverride(target))
  const defaults = useMemo(() => defaultKeyHelperCombos(target), [target])

  const results = useMemo(() => searchMapSkills(query, mapIds, labelOf), [query, mapIds, labelOf])

  const removeSkill = (comboIdx: number, skillId: string) => {
    setCombos((prev) =>
      prev.map((combo, i) => (i === comboIdx ? combo.filter((id) => id !== skillId) : combo)),
    )
  }

  const addSkill = (comboIdx: number, skillId: string) => {
    const canon = canonicalSkillId(skillId)
    if (!canon || canon === target) return
    setCombos((prev) =>
      prev.map((combo, i) =>
        i === comboIdx && !combo.includes(canon) ? [...combo, canon] : combo,
      ),
    )
    setQuery('')
    setAddingTo(null)
  }

  const addCombo = () => {
    setCombos((prev) => [...prev, []])
    setAddingTo(combos.length)
  }

  const removeCombo = (idx: number) => {
    setCombos((prev) => prev.filter((_, i) => i !== idx))
    if (addingTo === idx) {
      setAddingTo(null)
      setQuery('')
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const ok = await saveKeyHelperCombos(target, combos)
    setSaving(false)
    if (!ok) {
      setError('Could not save. Check the connection and try again.')
      return
    }
    setOverridden(hasKeyHelperOverride(target))
    onClose()
  }

  const resetToDefaults = async () => {
    setSaving(true)
    setError(null)
    const ok = await resetKeyHelperCombos(target)
    setSaving(false)
    if (!ok) {
      setError('Could not reset. Check the connection and try again.')
      return
    }
    setCombos(defaultKeyHelperCombos(target).map((c) => [...c]))
    setOverridden(false)
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[10vh]"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-label={`Edit key helpers for ${targetName}`}
        className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-[#14141c] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-white/10 bg-[#14141c] p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              Key helpers for {targetName}
            </p>
            <p className="mt-0.5 text-xs text-white/55">
              These skills wiggle when this skill is the shine target. Direct path shows only
              the target plus these.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close key helper editor"
            className="shrink-0 rounded-full px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <p className="text-xs text-white/55">
            {overridden ? 'Using your saved helpers.' : 'Using the built-in defaults.'}
            {defaults.length > 0 && overridden && (
              <button
                type="button"
                onClick={resetToDefaults}
                disabled={saving}
                className="ml-2 font-semibold text-amber-200/90 underline decoration-amber-200/40 underline-offset-2 hover:text-amber-200 disabled:opacity-50"
              >
                Reset to defaults
              </button>
            )}
          </p>

          {combos.length === 0 && (
            <p className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/60">
              No key helpers. Nothing will wiggle for this skill, and Direct path will show
              only the target. Add a group below to pick the skills that should wiggle.
            </p>
          )}

          {combos.map((combo, ci) => (
            <div key={ci} className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
                  Group {ci + 1}
                  {combos.length > 1 ? ' (either group is enough)' : ''}
                </p>
                <button
                  type="button"
                  onClick={() => removeCombo(ci)}
                  className="text-xs font-medium text-white/50 hover:text-white"
                >
                  Remove group
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {combo.map((id) => (
                  <span
                    key={id}
                    className="flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-xs font-medium text-amber-100"
                  >
                    {skillNameFor(id)}
                    <button
                      type="button"
                      onClick={() => removeSkill(ci, id)}
                      aria-label={`Remove ${skillNameFor(id)} from group ${ci + 1}`}
                      className="text-amber-200/70 hover:text-amber-200"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {combo.length === 0 && (
                  <span className="text-xs text-white/40">Empty group. Add skills below.</span>
                )}
              </div>
              {addingTo === ci ? (
                <div className="mt-2 rounded-lg border border-white/10 bg-[#101018] p-2">
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type a skill name…"
                    aria-label={`Search skills to add to group ${ci + 1}`}
                    className="w-full bg-transparent px-1 py-1 text-sm text-white placeholder-white/40 outline-none"
                  />
                  <div className="max-h-44 overflow-y-auto">
                    {query.trim() === '' ? (
                      <p className="px-1 py-2 text-xs text-white/40">
                        Start typing to find a skill to add.
                      </p>
                    ) : (
                      results
                        .filter((r) => r.skillId !== target && !combo.includes(r.skillId))
                        .map((r) => (
                          <button
                            key={r.skillId}
                            type="button"
                            onClick={() => addSkill(ci, r.skillId)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/10"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-white">{r.label}</span>
                              {r.name !== r.label && (
                                <span className="block truncate text-xs text-white/50">
                                  {r.name}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-amber-200/80">
                              add
                            </span>
                          </button>
                        ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingTo(null)
                      setQuery('')
                    }}
                    className="mt-1 px-1 text-xs text-white/50 hover:text-white"
                  >
                    Done adding
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddingTo(ci)
                    setQuery('')
                  }}
                  className="mt-2 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white"
                >
                  + Add a skill
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addCombo}
            className="mt-3 rounded-full border border-dashed border-white/25 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
          >
            + Add a group (an either/or path)
          </button>

          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-black hover:bg-amber-200 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save key helpers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
