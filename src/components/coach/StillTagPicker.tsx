import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { isAthleteProfile } from '../../lib/profileRole'
import { athleteMatchesQuery } from '../../lib/gymScope'
import { listStillTags, saveStillTags } from '../../lib/stillTags'
import { IconAction } from '../ui/IconAction'
import { InfoHint } from '../ui/InfoHint'

type Props = {
  stillId: string
  athletes: Athlete[]
}

export function StillTagPicker({ stillId, athletes }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [ids, setIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    void listStillTags().then((rows) => {
      const row = rows.find((r) => r.stillId === stillId)
      setIds(row?.taggedAthleteIds ?? [])
    })
  }, [stillId])

  const pool = useMemo(() => athletes.filter((a) => isAthleteProfile(a)), [athletes])
  const hits = query.trim()
    ? pool.filter((a) => !ids.includes(a.id) && athleteMatchesQuery(a, query)).slice(0, 8)
    : []

  const persist = (next: string[]) => {
    setIds(next)
    setBusy(true)
    void saveStillTags(stillId, next)
      .then(() => setFlash('Tagged privately.'))
      .catch((err) => setFlash(err instanceof Error ? err.message : 'Could not save that tag.'))
      .finally(() => {
        setBusy(false)
        window.setTimeout(() => setFlash(null), 2500)
      })
  }

  return (
    <span className="relative inline-flex">
      <IconAction
        kind="tag"
        label={ids.length ? 'Private athlete tag' : 'Tag athlete privately'}
        on={ids.length > 0}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <div className="absolute right-0 top-9 z-30 w-64 rounded-xl border border-white/15 bg-[#121820] p-3 shadow-xl">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-semibold">Private tag</p>
            <InfoHint>
              Names stay off this still. Parents can see where their child appears from More → Stills or Consent.
            </InfoHint>
          </div>
          {ids.length > 0 && (
            <ul className="mb-2 space-y-1">
              {ids.map((id) => {
                const who = pool.find((a) => a.id === id)
                return (
                  <li key={id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{who?.name ?? 'Athlete'}</span>
                    <IconAction
                      kind="remove"
                      label="Remove tag"
                      onClick={() => persist(ids.filter((x) => x !== id))}
                    />
                  </li>
                )
              })}
            </ul>
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search athlete"
            className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2 text-xs"
          />
          {hits.length > 0 && (
            <ul className="mt-1 max-h-32 overflow-y-auto">
              {hits.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="w-full truncate px-1 py-1 text-left text-xs hover:text-[var(--accent)]"
                    onClick={() => {
                      persist([...ids, a.id])
                      setQuery('')
                    }}
                  >
                    {a.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {flash && <p className="mt-2 text-[11px] text-[var(--accent)]">{flash}</p>}
        </div>
      )}
    </span>
  )
}
