/**
 * Coach onboarding manager (owner side). The owner builds tracks from
 * existing app content — skill-path steps, technique evidence, or
 * free-text tasks — assigns them to coach profiles, watches progress,
 * and signs coaches off.
 */
import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { profileRole } from '../../lib/profileRole'
import { RYAN_SKILL_PATH } from '../../config/ryanSkillPath'
import { TECHNIQUE_EVIDENCE } from '../../config/techniqueEvidence'
import {
  assignOnboardingTrack,
  assignmentProgress,
  deleteOnboardingTrack,
  loadOnboardingAssignments,
  loadOnboardingTracks,
  newOnboardingItem,
  saveOnboardingTrack,
  signOffOnboarding,
  subscribeOwnerData,
  unassignOnboardingTrack,
  type OnboardingAssignment,
  type OnboardingItem,
  type OnboardingItemKind,
  type OnboardingTrack,
} from '../../lib/ownerData'

type Props = { owner: Athlete; athletes: Athlete[] }

const KIND_LABEL: Record<OnboardingItemKind, string> = {
  skill_step: 'Skill path step',
  evidence: 'Proof video',
  task: 'Task',
}

const inputCls =
  'w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]'

function TrackEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: OnboardingTrack
  onSave: (t: OnboardingTrack) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [items, setItems] = useState<OnboardingItem[]>(
    initial?.items.map((i) => ({ ...i })) ?? [],
  )
  const evidenceKeys = useMemo(() => Object.keys(TECHNIQUE_EVIDENCE).sort(), [])

  const setItem = (id: string, patch: Partial<OnboardingItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const move = (id: string, dir: -1 | 1) =>
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id)
      const j = idx + dir
      if (idx < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      const [row] = next.splice(idx, 1)
      next.splice(j, 0, row)
      return next
    })

  const canSave = name.trim().length > 0 && items.length > 0 && items.every((i) => i.label.trim())

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
      <h3 className="text-sm font-bold text-[var(--text)]">
        {initial ? 'Edit track' : 'New onboarding track'}
      </h3>
      <div className="mt-3 space-y-2.5">
        <input
          className={inputCls}
          placeholder="Track name — e.g. New tumbling coach"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className={inputCls}
          rows={2}
          placeholder="What this track covers (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-[#0d1218] p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tabular-nums text-[var(--muted)]">{idx + 1}</span>
                <select
                  className="rounded-md border border-[var(--panel-border)] bg-[#121a24] px-1.5 py-1 text-xs text-[var(--text)]"
                  value={item.kind}
                  onChange={(e) => {
                    const kind = e.target.value as OnboardingItemKind
                    setItem(item.id, { kind, refId: undefined, url: undefined, label: '' })
                  }}
                >
                  {(Object.keys(KIND_LABEL) as OnboardingItemKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    className="rounded-md px-1.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    onClick={() => move(item.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    className="rounded-md px-1.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    onClick={() => move(item.id, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Remove item"
                    className="rounded-md px-1.5 py-1 text-xs text-[var(--muted)] hover:text-red-400"
                    onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {item.kind === 'skill_step' && (
                <select
                  className={`${inputCls} mt-2`}
                  value={item.refId ?? ''}
                  onChange={(e) => {
                    const step = RYAN_SKILL_PATH.find((s) => s.id === e.target.value)
                    setItem(item.id, { refId: step?.id, label: step ? step.skill : '' })
                  }}
                >
                  <option value="">Pick a skill-path step…</option>
                  {RYAN_SKILL_PATH.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.skill}
                    </option>
                  ))}
                </select>
              )}
              {item.kind === 'evidence' && (
                <select
                  className={`${inputCls} mt-2`}
                  value={item.refId ?? ''}
                  onChange={(e) => {
                    const key = e.target.value
                    const vids = key ? TECHNIQUE_EVIDENCE[key] : undefined
                    setItem(item.id, {
                      refId: key || undefined,
                      label: key ? `${key} — ${vids?.[0]?.who ?? 'proof video'}` : '',
                      url: vids?.[0]?.url,
                    })
                  }}
                >
                  <option value="">Pick a proof video…</option>
                  {evidenceKeys.map((k) => (
                    <option key={k} value={k}>
                      {k} — {TECHNIQUE_EVIDENCE[k][0]?.who ?? ''}
                    </option>
                  ))}
                </select>
              )}
              {item.kind === 'task' && (
                <input
                  className={`${inputCls} mt-2`}
                  placeholder='Free-text task — e.g. "Shadow 3 classes with Levi"'
                  value={item.label}
                  onChange={(e) => setItem(item.id, { label: e.target.value })}
                />
              )}
              {item.kind !== 'task' && item.label ? (
                <p className="mt-1.5 truncate text-xs text-[var(--muted)]">{item.label}</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(KIND_LABEL) as OnboardingItemKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)]"
              onClick={() => setItems((prev) => [...prev, newOnboardingItem(k)])}
            >
              + {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={!canSave}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--on-accent)] disabled:opacity-40"
            onClick={() => onSave(saveOnboardingTrack({ id: initial?.id, name, description, items }))}
          >
            Save track
          </button>
          <button
            type="button"
            className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm font-medium text-[var(--muted)]"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function OnboardingManager({ owner, athletes }: Props) {
  const [tracks, setTracks] = useState<OnboardingTrack[]>([])
  const [assignments, setAssignments] = useState<OnboardingAssignment[]>([])
  const [editing, setEditing] = useState<OnboardingTrack | 'new' | null>(null)
  const [assignTrackId, setAssignTrackId] = useState('')
  const [assignCoachId, setAssignCoachId] = useState('')

  useEffect(() => {
    const refresh = () => {
      setTracks(loadOnboardingTracks())
      setAssignments(loadOnboardingAssignments())
    }
    refresh()
    return subscribeOwnerData(refresh)
  }, [])

  const coaches = useMemo(() => athletes.filter((a) => profileRole(a) === 'coach'), [athletes])
  const nameOf = (id: string) => athletes.find((a) => a.id === id)?.name ?? 'Coach'

  const doAssign = () => {
    if (!assignTrackId || !assignCoachId) return
    assignOnboardingTrack(assignTrackId, assignCoachId, owner.id)
    setAssignCoachId('')
  }

  return (
    <div className="space-y-3">
      {editing ? (
        <TrackEditor
          initial={editing === 'new' ? undefined : editing}
          onSave={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button
          type="button"
          className="w-full rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-3 text-sm font-semibold text-[var(--accent)]"
          onClick={() => setEditing('new')}
        >
          + New onboarding track
        </button>
      )}

      {tracks.map((track) => {
        const trackAssignments = assignments.filter((a) => a.trackId === track.id)
        return (
          <div key={track.id} className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--text)]">{track.name}</h3>
                {track.description && (
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{track.description}</p>
                )}
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {track.items.length} item{track.items.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--accent)]"
                  onClick={() => setEditing(track)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--muted)] hover:text-red-400"
                  onClick={() => {
                    if (window.confirm(`Delete "${track.name}" and its assignments?`)) {
                      deleteOnboardingTrack(track.id)
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            <ol className="mt-2 space-y-1">
              {track.items.map((item, i) => (
                <li key={item.id} className="flex items-center gap-2 text-xs">
                  <span className="shrink-0 tabular-nums text-[var(--muted)]">{i + 1}.</span>
                  <span className="min-w-0 truncate text-[var(--text)]">{item.label || '(untitled)'}</span>
                  <span className="ml-auto shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                    {KIND_LABEL[item.kind]}
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Assigned coaches ({trackAssignments.length})
              </p>
              {trackAssignments.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {trackAssignments.map((a) => {
                    const { done, total } = assignmentProgress(a, track)
                    const pct = total ? Math.round((done / total) * 100) : 0
                    return (
                      <li key={a.id} className="rounded-xl bg-white/[0.03] p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[var(--text)]">{nameOf(a.coachId)}</span>
                          <span className="text-xs tabular-nums text-[var(--muted)]">
                            {done}/{total} · {pct}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          {a.signedOff ? (
                            <span className="text-xs font-semibold text-emerald-400">
                              Signed off{a.signedOffAt ? ` · ${new Date(a.signedOffAt).toLocaleDateString()}` : ''}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={done < total}
                              title={done < total ? 'All items must be checked off first' : 'Sign off this coach'}
                              className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-bold text-[var(--on-accent)] disabled:opacity-40"
                              onClick={() => signOffOnboarding(a.id, true, owner.id)}
                            >
                              Sign off
                            </button>
                          )}
                          {a.signedOff && (
                            <button
                              type="button"
                              className="rounded-lg px-2 py-1 text-xs text-[var(--muted)]"
                              onClick={() => signOffOnboarding(a.id, false)}
                            >
                              Undo
                            </button>
                          )}
                          <button
                            type="button"
                            className="ml-auto rounded-lg px-2 py-1 text-xs text-[var(--muted)] hover:text-red-400"
                            onClick={() => unassignOnboardingTrack(a.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="mt-2 flex gap-1.5">
                <select
                  className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-xs text-[var(--text)]"
                  value={assignTrackId === track.id ? assignCoachId : ''}
                  onChange={(e) => {
                    setAssignTrackId(track.id)
                    setAssignCoachId(e.target.value)
                  }}
                >
                  <option value="">Assign a coach…</option>
                  {coaches
                    .filter((c) => !trackAssignments.some((a) => a.coachId === c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={assignTrackId !== track.id || !assignCoachId}
                  className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-[var(--text)] disabled:opacity-40"
                  onClick={doAssign}
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {tracks.length === 0 && !editing && (
        <p className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4 text-sm text-[var(--muted)]">
          No tracks yet. Build one from the skill path, proof videos, and plain tasks — then assign it to a
          coach and watch them work through it.
        </p>
      )}
    </div>
  )
}
