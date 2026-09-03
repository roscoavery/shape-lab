import { useState } from 'react'
import type { HomeworkItem } from '../../types'
import { homeworkTitle } from '../../lib/homeworkLabel'

type Props = {
  assigned: HomeworkItem[]
  core: HomeworkItem[]
  strength: HomeworkItem[]
  other: HomeworkItem[]
  onPick: (item: HomeworkItem) => void
  onAddHomework?: () => void
  onOther?: () => void
}

type Folder = 'home' | 'assigned' | 'reps' | 'more'

function emojiFor(item: HomeworkItem): string {
  const id = `${item.shapeId} ${item.catalogId ?? ''}`.toLowerCase()
  if (id.includes('hollow')) return '🥣'
  if (id.includes('superman') || id.includes('arch')) return '🦸'
  if (id.includes('side_plank') || id.includes('plank')) return '🪵'
  if (id.includes('handstand') || id.includes('wall')) return '🤸'
  if (id.includes('v_up') || id.includes('v-up')) return '🔺'
  if (id.includes('pushup') || id.includes('push')) return '💪'
  if (id.includes('pullup') || id.includes('pull')) return '🏋️'
  if (id.includes('bridge')) return '🌉'
  if (id.includes('back_extension')) return '⬆️'
  return '⭐'
}

function shortName(item: HomeworkItem): string {
  const title = homeworkTitle(item)
  if (/side plank/i.test(title)) return title.includes('Right') ? 'Right plank' : title.includes('Left') ? 'Left plank' : 'Plank'
  if (/wall handstand/i.test(title)) return 'Wall'
  if (/hollow/i.test(title)) return 'Hollow'
  if (/superman/i.test(title)) return 'Superman'
  const first = title.split(/[·•(]/)[0]?.trim() ?? title
  return first.length > 16 ? `${first.slice(0, 14)}…` : first
}

function Tile({
  emoji,
  label,
  onClick,
  accent = false,
}: {
  emoji: string
  label: string
  onClick: () => void
  accent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-3xl px-3 py-4 text-center shadow-[0_12px_28px_rgba(0,0,0,0.28)] ${
        accent
          ? 'bg-gradient-to-br from-[#5cf0c8] to-[#147a62] text-[#06281f]'
          : 'bg-[#151d26] text-white hover:bg-[#1c2733]'
      }`}
    >
      <span className="text-5xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="text-xl font-black tracking-tight">{label}</span>
    </button>
  )
}

function Grid({ items, onPick }: { items: HomeworkItem[]; onPick: (item: HomeworkItem) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Tile
          key={item.id}
          emoji={emojiFor(item)}
          label={shortName(item)}
          onClick={() => onPick(item)}
        />
      ))}
    </div>
  )
}

export function TrainPicker({
  assigned,
  core,
  strength,
  other,
  onPick,
  onAddHomework,
  onOther,
}: Props) {
  const [folder, setFolder] = useState<Folder>('home')

  if (folder === 'assigned') {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setFolder('home')}
          className="self-start rounded-full bg-white/12 px-3 py-1.5 text-sm font-semibold text-white"
        >
          Back
        </button>
        <Grid items={assigned} onPick={onPick} />
      </div>
    )
  }

  if (folder === 'reps') {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setFolder('home')}
          className="self-start rounded-full bg-white/12 px-3 py-1.5 text-sm font-semibold text-white"
        >
          Back
        </button>
        <Grid items={strength} onPick={onPick} />
      </div>
    )
  }

  if (folder === 'more') {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setFolder('home')}
          className="self-start rounded-full bg-white/12 px-3 py-1.5 text-sm font-semibold text-white"
        >
          Back
        </button>
        <Grid items={other} onPick={onPick} />
        {onAddHomework ? (
          <button
            type="button"
            onClick={onAddHomework}
            className="rounded-2xl bg-white/8 py-4 text-lg font-bold text-white"
          >
            + Add
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {core.map((item) => (
        <Tile
          key={item.id}
          emoji={emojiFor(item)}
          label={shortName(item)}
          onClick={() => onPick(item)}
        />
      ))}
      {assigned.length > 0 ? (
        <Tile
          emoji="⭐"
          label={assigned.length === 1 ? shortName(assigned[0]!) : 'Assigned'}
          accent
          onClick={() => {
            if (assigned.length === 1) onPick(assigned[0]!)
            else setFolder('assigned')
          }}
        />
      ) : null}
      {strength.length > 0 ? (
        <Tile emoji="💪" label="Reps" onClick={() => setFolder('reps')} />
      ) : null}
      {other.length > 0 ? (
        <Tile emoji="📦" label="More" onClick={() => setFolder('more')} />
      ) : null}
      {onOther ? <Tile emoji="✏️" label="Other" onClick={onOther} /> : null}
    </div>
  )
}
