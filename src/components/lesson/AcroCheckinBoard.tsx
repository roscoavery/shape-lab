import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { getAcroSkill, acroSkillsByLevel, ACRO_TRACK_LABELS } from '../../lib/acroSkills'

type Props = {
  athletes: Athlete[]
  sessionAthleteIds: string[]
  onClose: () => void
  onAthletesChange?: (next: Athlete[]) => void
}

/**
 * Coach's live check-in board for acro clinics. Shows athletes in the
 * session newest-first, with their photo, name, and working-towards skills.
 * New profiles pop up at the top as they're created on another device
 * (via the gym's Blob sync). Tap an athlete to see their full skill
 * selections and a mini path view of their working-towards skills.
 */
export function AcroCheckinBoard({ athletes, sessionAthleteIds, onClose, onAthletesChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set(sessionAthleteIds))
  const [pickingTargets, setPickingTargets] = useState(false)

  const sessionAthletes = useMemo(() => {
    const map = new Map(athletes.map((a) => [a.id, a]))
    return sessionAthleteIds
      .map((id) => map.get(id))
      .filter((a): a is Athlete => !!a)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [athletes, sessionAthleteIds])

  const selected = selectedId ? athletes.find((a) => a.id === selectedId) : null

  const markSeen = (id: string) => {
    setSelectedId(id)
    setSeenIds((prev) => new Set(prev).add(id))
  }

  const isNew = (a: Athlete) => !seenIds.has(a.id)

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[var(--bg)]">
      <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            Acro clinic check-in
          </p>
          <h2 className="text-lg font-bold">
            {sessionAthletes.length} athlete{sessionAthletes.length === 1 ? '' : 's'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold"
        >
          Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Athlete list */}
        <div className="w-1/2 overflow-y-auto border-r border-[var(--panel-border)] p-3">
          {sessionAthletes.length === 0 ? (
            <p className="mt-8 text-center text-sm text-[var(--muted)]">
              No athletes yet. They'll appear here as they create profiles.
            </p>
          ) : (
            <div className="space-y-2">
              {sessionAthletes.map((a) => {
                const working = (a.acroWorkingTowards ?? [])
                  .map((id) => getAcroSkill(id)?.name)
                  .filter(Boolean) as string[]
                const fresh = isNew(a)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => markSeen(a.id)}
                    className={`w-full rounded-xl border p-3 text-left ${
                      selectedId === a.id
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--panel-border)] bg-[var(--panel)]'
                    } ${fresh ? 'ring-2 ring-emerald-400/60' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {a.photoDataUrl ? (
                        <img
                          src={a.photoDataUrl}
                          alt=""
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-bold">
                          {(a.firstName?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold">{a.name}</p>
                          {fresh && (
                            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              NEW
                            </span>
                          )}
                        </div>
                        {working.length > 0 ? (
                          <p className="mt-0.5 truncate text-xs text-[var(--accent)]">
                            Working on: {working.join(', ')}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            No skills selected yet
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail pane */}
        <div className="w-1/2 overflow-y-auto p-4">
          {!selected ? (
            <p className="mt-8 text-center text-sm text-[var(--muted)]">
              Tap an athlete to see their skills and path.
            </p>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                {selected.photoDataUrl ? (
                  <img
                    src={selected.photoDataUrl}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl font-bold">
                    {(selected.firstName?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold">{selected.name}</h3>
                  {selected.dateOfBirth && (
                    <p className="text-xs text-[var(--muted)]">DOB: {selected.dateOfBirth}</p>
                  )}
                </div>
              </div>

              {(selected.acroSkillsHave ?? []).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Skills they have
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(selected.acroSkillsHave ?? []).map((id) => {
                      const sk = getAcroSkill(id)
                      if (!sk) return null
                      return (
                        <span
                          key={id}
                          className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300"
                        >
                          {sk.name}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Working towards
                </p>
                {(selected.acroWorkingTowards ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">Nothing selected yet.</p>
                ) : (
                  <div className="mt-2 space-y-3">
                    {(selected.acroWorkingTowards ?? []).map((id) => {
                      const sk = getAcroSkill(id)
                      if (!sk) return null
                      // Mini path: show lower-level skills on the same track as prerequisites
                      const prereqs = acroSkillsByLevel()
                        .flatMap(({ skills }) => skills)
                        .filter((s) => s.track === sk.track && s.level < sk.level)
                        .sort((a, b) => b.level - a.level)
                        .slice(0, 3)
                      return (
                        <div
                          key={id}
                          className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{sk.name}</p>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold">
                              L{sk.level} · {ACRO_TRACK_LABELS[sk.track]}
                            </span>
                          </div>
                          {prereqs.length > 0 && (
                            <div className="mt-2">
                              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                Path
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {prereqs.reverse().map((p, i) => (
                                  <span key={p.id} className="flex items-center gap-1">
                                    {i > 0 && <span className="text-[var(--muted)]">→</span>}
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                                        (selected.acroSkillsHave ?? []).includes(p.id)
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : 'bg-white/5 text-[var(--muted)]'
                                      }`}
                                    >
                                      {p.name}
                                    </span>
                                  </span>
                                ))}
                                <span className="text-[var(--accent)]">→</span>
                                <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[11px] font-bold text-[var(--accent)]">
                                  {sk.name}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Coach targets: skills Ryan thinks they should target */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    Coach targets
                  </p>
                  {onAthletesChange && (
                    <button
                      type="button"
                      onClick={() => setPickingTargets((v) => !v)}
                      className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold"
                    >
                      {pickingTargets ? 'Done' : 'Pick targets'}
                    </button>
                  )}
                </div>
                {(selected.acroCoachTargets ?? []).length > 0 && !pickingTargets && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(selected.acroCoachTargets ?? []).map((id) => {
                      const sk = getAcroSkill(id)
                      if (!sk) return null
                      return (
                        <span
                          key={id}
                          className="rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300"
                        >
                          {sk.name}
                        </span>
                      )
                    })}
                  </div>
                )}
                {pickingTargets && onAthletesChange && (
                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[var(--panel-border)] bg-black/20 p-2">
                    {acroSkillsByLevel().map(({ level, skills }) => (
                      <div key={level}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                          Level {level}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {skills.map((sk) => {
                            const on = (selected.acroCoachTargets ?? []).includes(sk.id)
                            return (
                              <button
                                key={sk.id}
                                type="button"
                                onClick={() => {
                                  const next = on
                                    ? (selected.acroCoachTargets ?? []).filter((x) => x !== sk.id)
                                    : [...(selected.acroCoachTargets ?? []), sk.id]
                                  onAthletesChange(
                                    athletes.map((a) =>
                                      a.id === selected.id ? { ...a, acroCoachTargets: next } : a,
                                    ),
                                  )
                                }}
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  on
                                    ? 'bg-amber-500 text-black'
                                    : 'bg-white/10 text-[var(--text)]'
                                }`}
                              >
                                {sk.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(selected.acroCoachTargets ?? []).length === 0 && !pickingTargets && (
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    No coach targets yet. Tap "Pick targets" to choose.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
