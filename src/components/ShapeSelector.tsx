import { SHAPES } from '../config/shapes'
import type { ShapeDef } from '../types'

type Props = {
  selectedId: string
  onSelect: (shape: ShapeDef) => void
}

export function ShapeSelector({ selectedId, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--muted)]">
        Shape
      </label>
      <select
        className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-[var(--text)]"
        value={selectedId}
        onChange={(e) => {
          const shape = SHAPES.find((s) => s.id === e.target.value)
          if (shape) onSelect(shape)
        }}
      >
        {SHAPES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {SHAPES.find((s) => s.id === selectedId)?.description && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          {SHAPES.find((s) => s.id === selectedId)?.description}
        </p>
      )}
      {SHAPES.find((s) => s.id === selectedId)?.tips && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {SHAPES.find((s) => s.id === selectedId)?.tips?.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
