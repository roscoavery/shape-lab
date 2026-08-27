import { useEffect, useState } from 'react'
import type { Athlete } from '../types'
import { createId } from '../lib/storage'
import { instagramUrl, normalizeInstagramHandle } from '../lib/flowShare'

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
  const [handle, setHandle] = useState('')
  const [saved, setSaved] = useState<string | null>(null)

  const active = athletes.find((a) => a.id === activeId) ?? null

  useEffect(() => {
    setHandle(active?.instagramHandle ?? '')
  }, [active?.id, active?.instagramHandle])

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const athlete: Athlete = {
      id: createId('ath'),
      name: trimmed,
      instagramHandle: normalizeInstagramHandle(handle) || undefined,
      createdAt: new Date().toISOString(),
    }
    const next = [...athletes, athlete]
    onChangeAthletes(next)
    onSelect(athlete.id)
    setName('')
    setHandle(athlete.instagramHandle ?? '')
  }

  const saveHandle = () => {
    if (!active) return
    const instagramHandle = normalizeInstagramHandle(handle) || undefined
    onChangeAthletes(
      athletes.map((a) => (a.id === active.id ? { ...a, instagramHandle } : a)),
    )
    setSaved(instagramHandle ? `Saved @${instagramHandle}` : 'Instagram handle cleared')
    window.setTimeout(() => setSaved(null), 2200)
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
            {a.instagramHandle ? ` (@${a.instagramHandle})` : ''}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="New profile name"
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
            Create
          </button>
        </div>
        <input
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Instagram @handle (optional)"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (active) saveHandle()
              else add()
            }
          }}
        />
      </div>

      {active && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={saveHandle}
            className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1 text-xs"
          >
            Save Instagram
          </button>
          {active.instagramHandle && (
            <a
              href={instagramUrl(active.instagramHandle)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--accent)] underline"
            >
              @{active.instagramHandle}
            </a>
          )}
          <button
            type="button"
            className="text-xs text-[var(--bad)] underline"
            onClick={() => remove(active.id)}
          >
            Delete profile
          </button>
        </div>
      )}
      {saved && <p className="mt-1 text-[11px] text-[var(--accent)]">{saved}</p>}
      <p className="mt-2 text-[11px] leading-snug text-[var(--muted)]">
        Attach an Instagram handle so Story captions tag the right person. Instagram will not
        let a website post the Story for you — we prepare the video and caption, then you post.
      </p>
    </div>
  )
}
