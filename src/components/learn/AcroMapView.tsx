import { useMemo, useState } from 'react'
import {
  ACRO_SKILLS,
  ACRO_TRACKS,
  ACRO_TRACK_LABELS,
  getAcroSkill,
  type AcroSkill,
  type AcroTrack,
} from '../../lib/acroSkills'

type Props = {
  /** Pre-selected target skill ids (e.g., athlete's working-towards). */
  initialTargets?: string[]
  /** When true, tapping a skill toggles it as a wiggling key helper for the target. */
  onWiggleChange?: (targetId: string, skillId: string, on: boolean) => void
}

const WIGGLE_KEY = 'shapelab.acro.wiggle.v1'

function loadWiggle(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(WIGGLE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, string[]>
  } catch {
    /* ignore */
  }
  return {}
}

function saveWiggle(v: Record<string, string[]>) {
  try {
    localStorage.setItem(WIGGLE_KEY, JSON.stringify(v))
  } catch {
    /* ignore */
  }
}

/**
 * Acro skill map: 4 tracks (columns) x 7 levels (rows, bottom-up).
 * Tap a skill to light up its path (lower levels on the same track).
 * Toggle "Wiggle" mode, then tap helpers to make them wiggle for the target.
 */
export function AcroMapView({ initialTargets = [], onWiggleChange }: Props) {
  const [targetId, setTargetId] = useState<string | null>(initialTargets[0] ?? null)
  const [wiggleMode, setWiggleMode] = useState(false)
  const [wiggle, setWiggle] = useState<Record<string, string[]>>(loadWiggle)

  const target = targetId ? getAcroSkill(targetId) : null

  // Path: lower-level skills on the same track glow, brightest nearest the target.
  const glow = useMemo(() => {
    const map = new Map<string, number>()
    if (!target) return map
    const sameTrack = ACRO_SKILLS.filter(
      (s) => s.track === target.track && s.level <= target.level,
    ).sort((a, b) => b.level - a.level)
    sameTrack.forEach((s, i) => {
      map.set(s.id, Math.max(0, 1 - i * 0.15))
    })
    return map
  }, [target])

  const toggleWiggle = (skillId: string) => {
    if (!targetId) return
    setWiggle((prev) => {
      const next = { ...prev }
      const list = new Set(next[targetId] ?? [])
      const on = !list.has(skillId)
      if (on) list.add(skillId)
      else list.delete(skillId)
      next[targetId] = [...list]
      saveWiggle(next)
      onWiggleChange?.(targetId, skillId, on)
      return next
    })
  }

  const handleTap = (skill: AcroSkill) => {
    if (wiggleMode && targetId) {
      toggleWiggle(skill.id)
    } else {
      setTargetId(skill.id === targetId ? null : skill.id)
    }
  }

  const wigglingForTarget = targetId ? new Set(wiggle[targetId] ?? []) : new Set<string>()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-4 py-2">
        <p className="text-sm font-bold">
          Acro map
          {target && <span className="ml-2 font-normal text-[var(--muted)]">→ {target.name}</span>}
        </p>
        <button
          type="button"
          onClick={() => setWiggleMode((v) => !v)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            wiggleMode ? 'bg-amber-500 text-black' : 'bg-white/10 text-[var(--text)]'
          }`}
        >
          {wiggleMode ? 'Wiggle: ON' : 'Wiggle'}
        </button>
      </div>

      {wiggleMode && target && (
        <p className="border-b border-[var(--panel-border)] bg-amber-500/10 px-4 py-1.5 text-xs text-amber-300">
          Tap skills to make them wiggle for {target.name}. Tap again to stop.
        </p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-4 gap-1 overflow-y-auto p-2">
        {ACRO_TRACKS.map((track: AcroTrack) => (
          <div key={track} className="flex flex-col gap-1">
            <p className="sticky top-0 bg-[var(--bg)] py-1 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              {ACRO_TRACK_LABELS[track]}
            </p>
            {/* Levels bottom-up: render 7..1 so level 1 is at the bottom */}
            {[7, 6, 5, 4, 3, 2, 1].map((level) => {
              const skills = ACRO_SKILLS.filter((s) => s.track === track && s.level === level)
              if (skills.length === 0) {
                return <div key={level} className="min-h-[2.5rem]" />
              }
              return (
                <div key={level} className="space-y-1">
                  {skills.map((skill) => {
                    const g = glow.get(skill.id) ?? 0
                    const isTarget = skill.id === targetId
                    const isWiggling = wigglingForTarget.has(skill.id)
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => handleTap(skill)}
                        className={`w-full rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold leading-tight transition-all ${
                          isTarget
                            ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]'
                            : g > 0
                              ? 'border-[var(--accent)]/60 bg-[var(--accent)]/20'
                              : 'border-[var(--panel-border)] bg-[var(--panel)]'
                        } ${isWiggling ? 'animate-[keyhelper-wiggle_1.7s_ease-in-out_infinite]' : ''}`}
                        style={
                          !isTarget && g > 0
                            ? { boxShadow: `0 0 ${8 + g * 12}px rgba(56,189,248,${0.3 + g * 0.4})` }
                            : undefined
                        }
                      >
                        {skill.name}
                        <span className="block text-[9px] font-normal opacity-60">L{skill.level}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
