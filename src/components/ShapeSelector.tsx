import { useEffect, useMemo, useState } from 'react'
import { allLibraryShapes, getShape } from '../config/shapes'
import { subscribeCoachContent } from '../lib/coachContentStore'
import type { ShapeDef } from '../types'

type Props = {
  selectedId: string
  onSelect: (shape: ShapeDef) => void
}

export function ShapeSelector({ selectedId, onSelect }: Props) {
  const [tick, setTick] = useState(0)
  useEffect(() => subscribeCoachContent(() => setTick((n) => n + 1)), [])
  const options = useMemo(
    () => allLibraryShapes().slice().sort((a, b) => a.name.localeCompare(b.name)),
    [tick],
  )
  const selected = getShape(selectedId)
  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">
        Shape
      </label>
      <select
        className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-[var(--text)]"
        value={selectedId}
        onChange={(e) => {
          const shape = getShape(e.target.value)
          if (shape) onSelect(shape)
        }}
      >
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {selected?.description && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          {selected.description}
        </p>
      )}
      {selected?.tips && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {selected.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
