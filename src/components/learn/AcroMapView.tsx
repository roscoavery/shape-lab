import { useMemo, useState } from 'react'
import {
  ACRO_SKILLS,
  ACRO_TRACKS,
  ACRO_TRACK_LABELS,
  acroMapName,
  acroSkillToUnified,
  getAcroSkill,
  type AcroSkill,
  type AcroTrack,
} from '../../lib/acroSkills'
import { getRegistrySkillByName, getRegistrySkill, type UnifiedSkill } from '../../lib/skillRegistry'
import { needsForSkillConsolidated } from '../../lib/skillPathHighlight'
import { needsForSkill } from '../../lib/skillPaths'

type Props = {
  /** Called when a tile is tapped with the resolved skill. */
  onTileTap: (skill: UnifiedSkill) => void
}

/** Track colors matching the main map's ember UI. */
const TRACK_RGB: Record<AcroTrack, string> = {
  standing: '192,132,252', // purple (standing in main map)
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

  // Shine path: light the shined skill's prerequisites.
  // Union of (a) acro-authored path pieces (what Ryan writes on acro cards,
  // keyed by acro skill id) and (b) the shared main-map card's path pieces
  // mapped back onto acro tiles, matching names and aliases so e.g. the main
  // map's "Backbend kick over" lands on the acro "Back bend kick over" tile.
  const shinePathIds = useMemo(() => {
    if (!shineId) return new Set<string>()
    const acroSkill = getAcroSkill(shineId)
    if (!acroSkill) return new Set<string>([shineId])
    const ids = new Set<string>([shineId])
    const addNeed = (needSkillId: string | undefined) => {
      if (!needSkillId) return
      // Acro-authored need: the id is already an acro tile.
      if (getAcroSkill(needSkillId)) {
        ids.add(needSkillId)
        return
      }
      const needSkill = getRegistrySkill(needSkillId)
      if (!needSkill) return
      const keys = [needSkill.name, ...(needSkill.aliases ?? [])].map((n) => n.trim().toLowerCase())
      const tile = ACRO_SKILLS.find((a) => keys.includes(a.name.trim().toLowerCase()))
      if (tile) ids.add(tile.id)
    }
    try {
      for (const need of needsForSkill(acroSkill.id)) addNeed(need.needSkillId)
      const mainSkill = getRegistrySkillByName(acroSkill.name)
      if (mainSkill) {
        for (const need of needsForSkillConsolidated(mainSkill.id)) addNeed(need.needSkillId)
      }
    } catch {
      /* no path data */
    }
    return ids
  }, [shineId])

  const handleTap = (skill: AcroSkill) => {
    // Tap-to-preview: first tap shines the path, second tap on the same skill opens its card.
    if (shineId === skill.id) {
      const mainSkill = getRegistrySkillByName(skill.name)
      onTileTap(mainSkill ?? acroSkillToUnified(skill))
    } else {
      setShineId(skill.id)
      setShineQuery('')
    }
  }

  const shineSkill = shineId ? getAcroSkill(shineId) : null

  return (
    <div
      className="flex flex-col bg-black"
      onClick={(e) => {
        // Tap-away clears the shine, just like the main map. Buttons have
        // their own handlers; taps on background/gaps restore the full view.
        if (shineId && !(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('input')) {
          setShineId(null)
        }
      }}
    >
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
      </div>

      {/* Selected skill: full name in a bar that sticks while scrolling, so
          the (often abbreviated) tile you tapped is always readable. */}
      {shineSkill && (
        <div
          className="sticky top-0 z-20 -mx-1 mb-2 border-b bg-black/95 px-2 py-2 backdrop-blur"
          style={{ borderColor: `rgba(${TRACK_RGB[shineSkill.track]},0.5)` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: `rgba(${TRACK_RGB[shineSkill.track]},1)` }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold leading-snug text-white">
                {shineSkill.name}
              </p>
              <p className="text-[11px] leading-snug text-white/60">
                Level {shineSkill.level} · {ACRO_TRACK_LABELS[shineSkill.track]} · tap the card
                again to open it
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShineId(null)}
              aria-label="Clear selection"
              className="shrink-0 rounded-full border border-white/25 px-2.5 py-1 text-xs font-semibold text-white/80 active:bg-white/10"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 7 level bands, level 7 at top, level 1 at bottom. One band per level. */}
      <div className="space-y-1.5">
        {[7, 6, 5, 4, 3, 2, 1].map((level) => (
          <div key={level} className="flex items-stretch gap-1.5">
            <p className="flex w-8 shrink-0 items-center justify-center text-[10px] font-bold uppercase tracking-wider text-white/50">
              L{level}
            </p>
            <div className="grid flex-1 grid-cols-4 gap-1.5">
              {ACRO_TRACKS.map((track: AcroTrack) => {
                const skills = ACRO_SKILLS.filter((s) => s.track === track && s.level === level)
                const rgb = TRACK_RGB[track]
                // Cells with 3+ skills use the main map's compact tile
                // height so a tall stack does not balloon the whole band.
                const compact = skills.length > 2
                return (
                  <div key={track} className="flex h-full flex-col gap-1.5">
                    {skills.map((skill) => {
                      const isShine = shinePathIds.has(skill.id)
                      const isTarget = skill.id === shineId
                      const mainSkill = getRegistrySkillByName(skill.name)
                      const hasCard = !!mainSkill?.guideId
                      // Same tile spec as the main map: 2px full-strength
                      // border, word-boundary wrapping. Tiles flex to fill
                      // their cell so every bottom in the band lines up
                      // flush; min-height keeps them from ballooning.
                      const tileText = compact
                        ? 'text-[9px] sm:text-[10px]'
                        : 'text-[10px] sm:text-[11px]'
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => handleTap(skill)}
                          className={`relative flex w-full flex-1 items-center justify-center overflow-hidden rounded-2xl border px-1 py-1 text-center font-bold leading-tight text-white transition-transform active:scale-95 ${
                            compact ? 'min-h-[46px]' : 'min-h-[60px]'
                          } ${tileText}`}
                          style={{
                            background: '#000000',
                            borderColor: `rgba(${rgb},1)`,
                            borderWidth: '2px',
                            boxShadow: isTarget
                              ? `0 0 0 2px #ffffff, 0 0 0 5px rgba(${rgb},1)`
                              : isShine
                                ? `0 0 8px rgba(${rgb},0.5)`
                                : 'none',
                            opacity: shineId && !isShine ? 0.35 : 1,
                          }}
                        >
                          {!hasCard && (
                            <span
                              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400"
                              title="Guide coming"
                              aria-hidden
                            />
                          )}
                          <span className="break-words">{acroMapName(skill)}</span>
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
