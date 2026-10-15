import { useState } from 'react'
import {
  ACRO_SKILLS,
  ACRO_TRACKS,
  ACRO_TRACK_LABELS,
  getAcroSkill,
  type AcroSkill,
  type AcroTrack,
} from '../../lib/acroSkills'
import { getRegistrySkillByName, type UnifiedSkill } from '../../lib/skillRegistry'

type Props = {
  /** Called when a tile is tapped with the resolved skill (main-map card if name matches). */
  onTileTap: (skill: UnifiedSkill | AcroSkill) => void
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
 * Acro skill map: same tile UI as the main (Ember) map.
 * 4 tracks (standing, front, side, other) as columns.
 * 7 levels as vertical layers: level 1 at the bottom, level 7 at the top.
 * Tap a tile to open its card (shared with main map when the name matches).
 * Wiggle mode: tap helpers to make them wiggle for the selected target.
 * No auto-glow: paths only shine after Ryan sets them inside the cards.
 */
export function AcroMapView({ onTileTap }: Props) {
  const [wiggleMode, setWiggleMode] = useState(false)
  const [wiggleTargetId, setWiggleTargetId] = useState<string | null>(null)
  const [wiggle, setWiggle] = useState<Record<string, string[]>>(loadWiggle)

  const toggleWiggle = (targetId: string, skillId: string) => {
    setWiggle((prev) => {
      const next = { ...prev }
      const list = new Set(next[targetId] ?? [])
      if (list.has(skillId)) list.delete(skillId)
      else list.add(skillId)
      next[targetId] = [...list]
      saveWiggle(next)
      return next
    })
  }

  const handleTap = (skill: AcroSkill) => {
    if (wiggleMode) {
      // In wiggle mode: first tap selects the target, subsequent taps toggle helpers.
      if (!wiggleTargetId) {
        setWiggleTargetId(skill.id)
      } else if (skill.id === wiggleTargetId) {
        setWiggleTargetId(null)
      } else {
        toggleWiggle(wiggleTargetId, skill.id)
      }
      return
    }
    // Normal mode: open the card. Share main-map card when names match.
    const mainSkill = getRegistrySkillByName(skill.name)
    onTileTap(mainSkill ?? skill)
  }

  const wigglingForTarget = wiggleTargetId ? new Set(wiggle[wiggleTargetId] ?? []) : new Set<string>()
  const wiggleTarget = wiggleTargetId ? getAcroSkill(wiggleTargetId) : null

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-xs text-[var(--muted)]">
          {wiggleMode
            ? wiggleTarget
              ? `Wiggle for ${wiggleTarget.name}: tap skills to toggle`
              : 'Tap a skill to pick the wiggle target'
            : 'Tap a tile to open its card'}
        </p>
        <button
          type="button"
          onClick={() => {
            setWiggleMode((v) => !v)
            setWiggleTargetId(null)
          }}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            wiggleMode ? 'bg-amber-500 text-black' : 'bg-white/10 text-[var(--text)]'
          }`}
        >
          {wiggleMode ? 'Wiggle: ON' : 'Wiggle'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {ACRO_TRACKS.map((track: AcroTrack) => (
          <div key={track} className="flex flex-col">
            <p className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              {ACRO_TRACK_LABELS[track]}
            </p>
            {/* Levels 7..1 top-down, so level 1 sits at the bottom */}
            <div className="flex flex-1 flex-col justify-end gap-2">
              {[7, 6, 5, 4, 3, 2, 1].map((level) => {
                const skills = ACRO_SKILLS.filter((s) => s.track === track && s.level === level)
                if (skills.length === 0) return null
                return (
                  <div key={level} className="space-y-2">
                    {skills.map((skill) => {
                      const isWiggling = wigglingForTarget.has(skill.id)
                      const isTarget = skill.id === wiggleTargetId
                      const mainSkill = getRegistrySkillByName(skill.name)
                      const hasCard = !!mainSkill?.guideId
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => handleTap(skill)}
                          className={`relative flex min-h-[60px] w-full items-center justify-center rounded-2xl border px-1 py-2 text-center text-[10px] font-bold leading-snug tracking-[0.02em] transition-transform active:scale-95 sm:text-[11px] ${
                            isTarget
                              ? 'border-amber-500 bg-amber-500/20 text-[var(--text)]'
                              : 'border-[var(--panel-border)] bg-[var(--panel)] text-[var(--text)]'
                          } ${isWiggling ? 'animate-[keyhelper-wiggle_1.7s_ease-in-out_infinite]' : ''}`}
                          style={
                            isWiggling
                              ? { boxShadow: '0 0 12px rgba(245, 158, 11, 0.6)' }
                              : undefined
                          }
                        >
                          {!hasCard && (
                            <span
                              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400"
                              title="Guide coming"
                              aria-hidden
                            />
                          )}
                          <span className="break-words">{skill.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
