/**
 * Phone-friendly form standard: big number field + confirm button.
 * Typing should not silently commit on every keystroke.
 */

import { useEffect, useState } from 'react'

type Props = {
  value: number
  onCommit: (next: number) => void
}

export function FormStandardField({ value, onCommit }: Props) {
  const [draft, setDraft] = useState(String(value))
  const parsed = Number(draft)
  const valid = Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
  const dirty = valid && Math.round(parsed) !== value

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = (next: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(next)))
    setDraft(String(clamped))
    onCommit(clamped)
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-[var(--muted)]">
        Form standard
        <span className="flex items-center gap-2">
          <button
            type="button"
            className="h-11 w-11 rounded-lg border border-[var(--panel-border)] text-lg font-bold text-[var(--text)]"
            onClick={() => commit(value - 5)}
            aria-label="Lower form standard by 5"
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            className="h-11 min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-center text-lg font-semibold tabular-nums text-[var(--text)]"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && valid) commit(parsed)
            }}
            title="Score required to count proper-hold time"
          />
          <button
            type="button"
            className="h-11 w-11 rounded-lg border border-[var(--panel-border)] text-lg font-bold text-[var(--text)]"
            onClick={() => commit(value + 5)}
            aria-label="Raise form standard by 5"
          >
            +
          </button>
        </span>
      </label>
      <button
        type="button"
        disabled={!valid || !dirty}
        onClick={() => commit(parsed)}
        className="h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[#06281f] disabled:opacity-40"
      >
        Set standard
      </button>
    </div>
  )
}
