import { useMemo } from 'react'
import type { GymClip } from '../../lib/gymLibrary'
import { isSameReferenceUrl } from '../../lib/clipStore'

type Props = {
  url: string
  clipId?: string
  clips: GymClip[]
  onPick: (clip: GymClip) => void
  compact?: boolean
  disabled?: boolean
}

export function CollageClipPicker({ url, clipId, clips, onPick, compact, disabled }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, GymClip[]>()
    for (const clip of clips) {
      const list = map.get(clip.collectionName) ?? []
      list.push(clip)
      map.set(clip.collectionName, list)
    }
    return [...map.entries()]
  }, [clips])

  const selectedId = useMemo(() => {
    if (clipId && clips.some((c) => c.id === clipId)) return clipId
    return clips.find((c) => isSameReferenceUrl(c.url, url))?.id ?? ''
  }, [clipId, clips, url])

  const missing = Boolean(url && !selectedId)

  return (
    <select
      value={selectedId}
      disabled={disabled || clips.length === 0}
      aria-label="Video for this panel"
      onChange={(e) => {
        const clip = clips.find((c) => c.id === e.target.value)
        if (clip) onPick(clip)
      }}
      className={
        compact
          ? 'max-w-full truncate rounded-md border border-white/30 bg-black/70 px-2 py-1 text-[11px] text-white'
          : 'w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm'
      }
    >
      {missing && (
        <option value="" disabled>
          Current clip
        </option>
      )}
      {grouped.map(([name, items]) => (
        <optgroup key={name} label={name}>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
