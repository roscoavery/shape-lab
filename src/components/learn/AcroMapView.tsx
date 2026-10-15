import { useMemo, useState } from 'react'
import {
  ACRO_SKILLS,
  ACRO_TRACKS,
  ACRO_TRACK_LABELS,
  acroSkillToUnified,
  getAcroSkill,
  type AcroSkill,
  type AcroTrack,
} from '../../lib/acroSkills'
import { getRegistrySkillByName, type UnifiedSkill } from '../../lib/skillRegistry'

type Props = {
  /** Called when a tile is tapped with the resolved skill. */
  onTileTap: (skill: UnifiedSkill) => void
}

/** Track colors matching the main map's ember UI. */
const TRACK_RGB: Record<AcroTrack, string> = {
  standing: '255,120,50', // ember
  front: '251,146,60', // orange (forwards in main map)
  side: '96,165,250', // blue (cartwheel in main map)
  other: '74,222,128', // green (roundoff in main map)
}

/**
 * Acro skill map: ember theme, same as the main map.
 * 4 tracks (standing, front, side, other) as columns.
 * 7 levels as horizontal layers: level 1 at the bottom, level 7 at the top.
 * All skills on the same level align horizontally.
 * Tap a tile to open its card. Shine search highlights a skill.
 * Wiggle mode: tap target, then helpers to make them wiggle.
 */
export function AcroMapView({ onTileTap }: Props) {
  const [shineQuery, setShineQuery] = useState('')
  const [shineId, setShineId] = useState<string | null>(null)

  const shineResults = useMemo(() => {
    const q = shineQuery.trim().toLowerCase()
    if (!q) return []
    return ACRO_SKILLS.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8)
  }, [shineQuery])

  const handleTap = (skill: AcroSkill) => {
    const mainSkill = getRegistrySkillByName(skill.name)
    // Shared main-map card when names match; otherwise a minimal acro card
    // with PathTab (wiggle toggles), harder versions, and reference videos.
    onTileTap(mainSkill ?? acroSkillToUnified(skill))
  }

  const shineSkill = shineId ? getAcroSkill(shineId) : null

  return (
    <div className="flex flex-col bg-black">
      {/* Controls: shine search + wiggle */}
      <div className="flex flex-wrap items-center gap-2 px-1 pb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
          Shine
        </span>
        <div className="relative">
          <input
            type="text"
            value={shineQuery}
            onChange={(e) => {
              setShineQuery(e.target.value)
              setShineId(null)
            }}
            placeholder="Search skills…"
            className="w-44 rounded-full border border-white/25 bg-black px-3 py-1 text-xs text-white placeholder:text-white/40"
          />
          {shineQuery && shineResults.length > 0 && !shineId && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-white/20 bg-black shadow-xl">
              {shineResults.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setShineId(s.id)
                    setShineQuery('')
                  }}
                  className="block w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
        {shineSkill && (
          <button
            type="button"
            onClick={() => setShineId(null)}
            className="flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200"
          >
            <span aria-hidden>✦</span> {shineSkill.name}{' '}
            <span aria-hidden className="opacity-70">✕</span>
          </button>
        )}
      </div>

      {/* 7 level rows, level 7 at top, level 1 at bottom */}
      <div className="space-y-2">
        {[7, 6, 5, 4, 3, 2, 1].map((level) => (
          <div key={level}>
            <p className="pb-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
              Level {level}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {ACRO_TRACKS.map((track: AcroTrack) => {
                const skills = ACRO_SKILLS.filter((s) => s.track === track && s.level === level)
                const rgb = TRACK_RGB[track]
                return (
                  <div key={track} className="space-y-2">
                    {skills.map((skill) => {
                      const isShine = skill.id === shineId
                      const mainSkill = getRegistrySkillByName(skill.name)
                      const hasCard = !!mainSkill?.guideId
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => handleTap(skill)}
                          className="relative flex min-h-[60px] w-full items-center justify-center rounded-2xl border-2 px-1 py-2 text-center text-[10px] font-bold leading-snug tracking-[0.02em] text-white transition-transform active:scale-95 sm:text-[11px]"
                          style={{
                            background: '#000000',
                            borderColor: isShine
                              ? `rgba(${rgb},1)`
                              : `rgba(${rgb},0.85)`,
                            boxShadow: isShine
                              ? `0 0 0 2px #ffffff, 0 0 0 5px rgba(${rgb},1)`
                              : 'none',
                          }}
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

      {/* Track legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {ACRO_TRACKS.map((track) => {
          const rgb = TRACK_RGB[track]
          return (
            <span
              key={track}
              className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ borderColor: `rgba(${rgb},0.7)`, background: `rgba(${rgb},0.12)` }}
            >
              {ACRO_TRACK_LABELS[track]}
            </span>
          )
        })}
      </div>
    </div>
  )
}
