import { useState } from 'react'
import type { Athlete } from '../types'
import { createId } from '../lib/storage'

type Props = {
  athletes: Athlete[]
  activeId: string | null
  onChangeAthletes: (next: Athlete[]) => void
  onSelect: (id: string | null) => void
}

export function AthletePanel({
  athletes,
  activeId,
  onChangeAthletes,
  onSelect,
}: Props) {
  const [name, setName] = useState('')

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const athlete: Athlete = {
      id: createId('ath'),
      name: trimmed,
      createdAt: new Date().toISOString(),
    }
    const next = [...athletes, athlete]
    onChangeAthletes(next)
    onSelect(athlete.id)
    setName('')
  }

  const remove = (id: string) => {
    const next = athletes.filter((a) => a.id !== id)
    onChangeAthletes(next)
    if (activeId === id) onSelect(next[0]?.id ?? null)
  }

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">Athlete profile</p>
      <select
        className="mb-3 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
        value={activeId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
      >
        <option value="">Select athlete…</option>
        {athletes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="New athlete name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-sm font-medium text-white"
        >
          Add
        </button>
      </div>

      {activeId && (
        <button
          type="button"
          className="mt-2 text-xs text-[var(--bad)] underline"
          onClick={() => remove(activeId)}
        >
          Delete selected athlete
        </button>
      )}
    </div>
  )
}
