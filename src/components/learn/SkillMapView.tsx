/**
 * The skill map: a spatial, bottom-up view of the skill path.
 *
 * Foundations at the bottom, harder skills higher up. Each tile opens the
 * full guide card in a modal (handled by SkillPathCards — this component
 * only reports taps). Tiles without guide prose get a subtle amber dot.
 *
 * Layout follows Ryan's spec: an 8-column grid, rows numbered from the
 * bottom (R0 = foundations). The "Beyond" rows stay collapsed by default.
 */
import { useState } from 'react'
import { getRegistrySkill, type UnifiedSkill } from '../../lib/skillRegistry'

type MapTile = {
  /** Registry skl_* id. */
  skillId: string
  /** Short display label (registry names are too long for tiles). */
  label: string
  /** CSS grid-column value, e.g. "1 / 3". */
  col: string
}

type MapRow = {
  tiles: MapTile[]
  /** Column count for this row's sub-grid (default 8). */
  cols?: number
}

const HEADERS: { label: string; col: string }[] = [
  { label: 'Standing', col: '1 / 3' },
  { label: 'Front', col: '3 / 5' },
  { label: 'Cartwheel', col: '5 / 7' },
  { label: 'Round off', col: '7 / 9' },
]

/** Rows top-down (render order). Ryan's rows are numbered bottom-up. */
const ROWS: MapRow[] = [
  {
    // R11
    tiles: [
      { skillId: 'skl_front_triple', label: 'Front triple', col: '2 / 4' },
      { skillId: 'skl_triple_full', label: 'Back triple', col: '4 / 6' },
      { skillId: 'skl_full_in', label: 'Full in', col: '6 / 7' },
      { skillId: 'skl_killer', label: 'Killer', col: '7 / 8' },
    ],
  },
  {
    // R10
    tiles: [
      { skillId: 'skl_front_25', label: 'Front 2.5', col: '3 / 5' },
      { skillId: 'skl_back_25', label: 'Back 2.5', col: '5 / 7' },
    ],
  },
  {
    // R9
    tiles: [
      { skillId: 'skl_front_2', label: 'Front double', col: '2 / 4' },
      { skillId: 'skl_double_full', label: 'Back double', col: '4 / 6' },
      { skillId: 'skl_double_back', label: 'Double back', col: '6 / 8' },
    ],
  },
  {
    // R8
    tiles: [
      { skillId: 'skl_front_15', label: 'Front 1.5', col: '3 / 5' },
      { skillId: 'skl_back_1_5', label: 'Back 1.5', col: '5 / 7' },
    ],
  },
  {
    // R7
    tiles: [
      { skillId: 'skl_barani', label: 'Front half', col: '1 / 3' },
      { skillId: 'skl_front_full', label: 'Front full', col: '3 / 5' },
      { skillId: 'skl_back_full', label: 'Back full', col: '5 / 7' },
      { skillId: 'skl_back_half', label: 'Back half', col: '7 / 9' },
    ],
  },
  {
    // R6 — five tiles, own 5-column row
    cols: 5,
    tiles: [
      { skillId: 'skl_standing_full', label: 'Standing full', col: '1 / 2' },
      { skillId: 'skl_layout', label: 'Layout', col: '2 / 3' },
      { skillId: 'skl_front_layout', label: 'Front layout', col: '3 / 4' },
      { skillId: 'skl_cart_full', label: 'Cart full', col: '4 / 5' },
      { skillId: 'skl_ro_bhs_full', label: 'RO HS full', col: '5 / 6' },
    ],
  },
  {
    // R5
    tiles: [
      { skillId: 'skl_standing_tuck', label: 'Standing tuck', col: '1 / 3' },
      { skillId: 'skl_front_tuck', label: 'Front tuck', col: '3 / 5' },
      { skillId: 'skl_ro_bhs_tuck', label: 'RO HS tuck', col: '5 / 7' },
      { skillId: 'skl_cart_tuck', label: 'Cart tuck', col: '7 / 9' },
    ],
  },
  {
    // R4
    tiles: [
      { skillId: 'skl_standing_bhs_series', label: 'Standing series', col: '1 / 3' },
      { skillId: 'skl_ro_bhs_series', label: 'RO series', col: '7 / 9' },
    ],
  },
  {
    // R3
    tiles: [
      { skillId: 'skl_standing_bhs', label: 'Standing HS', col: '1 / 3' },
      { skillId: 'skl_front_handspring', label: 'Front HS', col: '3 / 4' },
      { skillId: 'skl_front_aerial', label: 'Front aerial', col: '4 / 5' },
      { skillId: 'skl_cartwheel_handspring', label: 'Cartwheel HS', col: '5 / 7' },
      { skillId: 'skl_ro_bhs', label: 'RO HS', col: '7 / 9' },
    ],
  },
  {
    // R2
    tiles: [
      { skillId: 'skl_back_walkover', label: 'Back walkover', col: '1 / 3' },
      { skillId: 'skl_front_walkover', label: 'Front walkover', col: '3 / 5' },
      { skillId: 'skl_side_aerial', label: 'Side aerial', col: '5 / 7' },
      { skillId: 'skl_strong_round_off', label: 'Round off', col: '7 / 9' },
    ],
  },
  {
    // R1
    tiles: [
      { skillId: 'skl_back_bend', label: 'Back bend', col: '1 / 3' },
      { skillId: 'skl_cartwheel', label: 'Cartwheel', col: '4 / 6' },
      { skillId: 'skl_cartwheel_step_in', label: 'Cartwheel step-in', col: '7 / 9' },
    ],
  },
  {
    // R0 — foundations banner
    tiles: [{ skillId: 'skl_foundations', label: 'Foundations', col: '1 / 9' }],
  },
]

/** Collapsed by default: everything above the double-back / triple-full line. */
const BEYOND_ROWS: MapRow[] = [
  {
    // 3.5 row
    tiles: [
      { skillId: 'skl_front_35', label: 'Front 3.5', col: '3 / 5' },
      { skillId: 'skl_back_35', label: 'Back 3.5', col: '5 / 7' },
      { skillId: 'skl_full_full', label: 'Full full', col: '7 / 9' },
    ],
  },
  {
    // quad row
    tiles: [
      { skillId: 'skl_back_quad', label: 'Back quad', col: '3 / 5' },
      { skillId: 'skl_miller', label: 'Miller', col: '5 / 7' },
    ],
  },
]

function Tile({
  tile,
  skill,
  onTap,
}: {
  tile: MapTile
  skill: UnifiedSkill
  onTap: (skill: UnifiedSkill) => void
}) {
  const hasGuide = !!skill.guideId
  return (
    <button
      type="button"
      onClick={() => onTap(skill)}
      style={{ gridColumn: tile.col }}
      className="relative flex min-h-[52px] items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] px-1 py-1.5 text-center text-[10px] font-bold leading-tight text-white/90 transition-transform active:scale-95"
    >
      {!hasGuide && (
        <span
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400"
          title="Guide coming"
          aria-hidden
        />
      )}
      <span className="break-words">{tile.label}</span>
    </button>
  )
}

function MapRows({ rows, onTap }: { rows: MapRow[]; onTap: (s: UnifiedSkill) => void }) {
  return (
    <>
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${row.cols ?? 8}, 1fr)` }}
        >
          {row.tiles.map((tile) => {
            const skill = getRegistrySkill(tile.skillId)
            if (!skill) return null
            return <Tile key={`${tile.skillId}-${tile.label}`} tile={tile} skill={skill} onTap={onTap} />
          })}
        </div>
      ))}
    </>
  )
}

export function SkillMapView({ onTileTap }: { onTileTap: (skill: UnifiedSkill) => void }) {
  const [beyondOpen, setBeyondOpen] = useState(false)
  return (
    <div className="space-y-1.5">
      {/* Column headers */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
        {HEADERS.map((h) => (
          <div
            key={h.label}
            style={{ gridColumn: h.col }}
            className="pb-0.5 text-center text-[10px] font-extrabold uppercase tracking-widest text-white/40"
          >
            {h.label}
          </div>
        ))}
      </div>

      {/* Beyond — collapsed by default */}
      <div>
        <button
          type="button"
          onClick={() => setBeyondOpen((o) => !o)}
          aria-expanded={beyondOpen}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2 text-left"
        >
          <span>
            <span className="block text-sm font-extrabold">Beyond</span>
            <span className="block text-[11px] opacity-60">
              Most people never cross this line
            </span>
          </span>
          <span className="text-base opacity-60" aria-hidden>
            {beyondOpen ? '▾' : '▸'}
          </span>
        </button>
        {beyondOpen && (
          <div className="mt-1.5 space-y-1.5">
            <MapRows rows={BEYOND_ROWS} onTap={onTileTap} />
          </div>
        )}
      </div>

      <MapRows rows={ROWS} onTap={onTileTap} />
    </div>
  )
}
