/**
 * Class criteria — the gym's own levels. The owner defines levels with
 * ordered requirements (free text, optionally tied to a skill-path step).
 * Per-level progress is a simple heuristic: an athlete shows a signal for
 * a requirement when their homework logs or wins mention it. v1, not proof.
 */
import { useEffect, useMemo, useState } from 'react'
import type { Athlete, HomeworkLog } from '../../types'
import { profileRole } from '../../lib/profileRole'
import { loadHomeworkLogs } from '../../lib/storage'
import { RYAN_SKILL_PATH } from '../../config/ryanSkillPath'
import { listFeedPosts, postOnChannel, winSubjectIds, type FeedPost } from '../../lib/feedPosts'
import {
  deleteGymLevel,
  loadGymLevels,
  newLevelRequirement,
  saveGymLevel,
  subscribeOwnerData,
  type GymLevel,
  type GymLevelRequirement,
} from '../../lib/ownerData'

type Props = { athletes: Athlete[] }

const inputCls =
  'w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]'

function requirementSignal(
  req: GymLevelRequirement,
  logs: HomeworkLog[],
  winCaptions: string[],
): boolean {
  const step = req.skillStepId ? RYAN_SKILL_PATH.find((s) => s.id === req.skillStepId) : undefined
  const needles = [req.label, step?.skill].filter(Boolean).map((s) => s!.toLowerCase())
  if (needles.length === 0) return false
  const haystacks: string[] = []
  for (const log of logs) {
    if (log.sourceLabel) haystacks.push(log.sourceLabel.toLowerCase())
    if (log.journal) haystacks.push(log.journal.toLowerCase())
    if (log.shapeId) haystacks.push(log.shapeId.toLowerCase().replace(/_/g, ' '))
  }
  for (const cap of winCaptions) haystacks.push(cap.toLowerCase())
  return needles.some((n) => n.length > 2 && haystacks.some((h) => h.includes(n)))
}

function LevelEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: GymLevel
  onSave: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [reqs, setReqs] = useState<GymLevelRequirement[]>(
    initial?.requirements.map((r) => ({ ...r })) ?? [],
  )
  const setReq = (id: string, patch: Partial<GymLevelRequirement>) =>
    setReqs((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const canSave = name.trim().length > 0

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
      <h3 className="text-sm font-bold text-[var(--text)]">{initial ? 'Edit level' : 'New level'}</h3>
      <div className="mt-3 space-y-2.5">
        <input
          className={inputCls}
          placeholder="Level name — e.g. Bronze, Silver"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className={inputCls}
          rows={2}
          placeholder="What this level is about (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="space-y-2">
          {reqs.map((req, i) => (
            <div key={req.id} className="rounded-xl border border-white/10 bg-[#0d1218] p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tabular-nums text-[var(--muted)]">{i + 1}</span>
                <input
                  className={`${inputCls} !py-1.5`}
                  placeholder="Requirement — e.g. Round off with eyes down"
                  value={req.label}
                  onChange={(e) => setReq(req.id, { label: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="Remove requirement"
                  className="shrink-0 rounded-md px-1.5 py-1 text-xs text-[var(--muted)] hover:text-red-400"
                  onClick={() => setReqs((prev) => prev.filter((r) => r.id !== req.id))}
                >
                  ✕
                </button>
              </div>
              <select
                className={`${inputCls} mt-1.5 !py-1.5 text-xs`}
                value={req.skillStepId ?? ''}
                onChange={(e) => setReq(req.id, { skillStepId: e.target.value || undefined })}
              >
                <option value="">Tie to a skill-path step (optional)…</option>
                {RYAN_SKILL_PATH.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.skill}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)]"
          onClick={() => setReqs((prev) => [...prev, newLevelRequirement()])}
        >
          + Requirement
        </button>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={!canSave}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--on-accent)] disabled:opacity-40"
            onClick={() => {
              saveGymLevel({
                id: initial?.id,
                name,
                description,
                requirements: reqs.filter((r) => r.label.trim()),
              })
              onSave()
            }}
          >
            Save level
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

export function ClassCriteria({ athletes }: Props) {
  const [levels, setLevels] = useState<GymLevel[]>([])
  const [editing, setEditing] = useState<GymLevel | 'new' | null>(null)
  const [openLevelId, setOpenLevelId] = useState<string | null>(null)
  const [wins, setWins] = useState<FeedPost[]>([])

  useEffect(() => {
    const refresh = () => setLevels(loadGymLevels())
    refresh()
    return subscribeOwnerData(refresh)
  }, [])
  useEffect(() => {
    let live = true
    void listFeedPosts()
      .then((posts) => {
        if (live) setWins(posts.filter((p) => postOnChannel(p, 'wins')))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const athleteProfiles = useMemo(() => athletes.filter((a) => profileRole(a) === 'athlete'), [athletes])

  const progressFor = (level: GymLevel) => {
    const allLogs = loadHomeworkLogs()
    const winCapsByAthlete = new Map<string, string[]>()
    for (const p of wins) {
      for (const id of winSubjectIds(p)) {
        const list = winCapsByAthlete.get(id) ?? []
        list.push(p.caption ?? '')
        winCapsByAthlete.set(id, list)
      }
    }
    return athleteProfiles.map((a) => {
      const logs = allLogs.filter((l) => l.athleteId === a.id)
      const caps = winCapsByAthlete.get(a.id) ?? []
      const hits = level.requirements.map((r) => requirementSignal(r, logs, caps))
      return { athlete: a, hits, done: hits.filter(Boolean).length, total: level.requirements.length }
    })
  }

  return (
    <div className="space-y-3">
      {editing ? (
        <LevelEditor
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
          + New level
        </button>
      )}

      {levels.map((level) => {
        const open = openLevelId === level.id
        return (
          <div key={level.id} className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--text)]">{level.name}</h3>
                {level.description && <p className="mt-0.5 text-xs text-[var(--muted)]">{level.description}</p>}
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {level.requirements.length} requirement{level.requirements.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--accent)]"
                  onClick={() => setOpenLevelId(open ? null : level.id)}
                >
                  {open ? 'Hide' : 'Progress'}
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--accent)]"
                  onClick={() => setEditing(level)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--muted)] hover:text-red-400"
                  onClick={() => {
                    if (window.confirm(`Delete level "${level.name}"?`)) deleteGymLevel(level.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            {open && (
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                {progressFor(level).map(({ athlete, hits, done, total }) => (
                  <div key={athlete.id} className="rounded-xl bg-white/[0.03] p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--text)]">{athlete.name}</p>
                      <p className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                        {done}/{total}
                      </p>
                    </div>
                    <ul className="mt-1.5 space-y-0.5">
                      {level.requirements.map((req, i) => (
                        <li key={req.id} className="flex items-center gap-1.5 text-xs">
                          <span className={hits[i] ? 'text-emerald-400' : 'text-[var(--muted)]'}>
                            {hits[i] ? '●' : '○'}
                          </span>
                          <span className={hits[i] ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>
                            {req.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {athleteProfiles.length === 0 && (
                  <p className="text-xs text-[var(--muted)]">No athlete profiles yet.</p>
                )}
              </div>
            )}
          </div>
        )
      })}

      {levels.length === 0 && !editing && (
        <p className="rounded-2xl border border-[var(--panel-border)] bg-[#0d1614] p-4 text-sm text-[var(--muted)]">
          Define your gym's levels — Bronze, Silver, Gold, whatever you call them — with the skills each
          one requires. Progress matching is a v1 heuristic based on homework logs and wins.
        </p>
      )}
    </div>
  )
}
