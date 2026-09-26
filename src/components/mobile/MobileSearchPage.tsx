import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { AppTab } from '../../lib/storage'
import { saveTab } from '../../lib/storage'
import { searchAppIndex, type AppSearchHit } from '../../lib/appSearchIndex'
import { useGymLibrary } from '../../lib/gymLibrary'
import { navRoleFromSession, type NavRole } from '../../lib/appNav'
import type { AuthSessionUser } from '../../lib/authSession'
import { sessionIsKiosk } from '../../lib/authSession'
import { isRyanAthlete } from '../../lib/ryanProfile'
import { stashMobileSearchJump } from '../../lib/mobileSearchNav'
import { IgSearchIcon } from './IgNavIcons'

type Props = {
  athletes: Athlete[]
  authUser: AuthSessionUser
  activeAthleteId: string | null
  onGo: (tab: AppTab) => void
  onViewProfile?: (id: string) => void
  onClose: () => void
}

function hitIcon(kind: AppSearchHit['kind']): string {
  switch (kind) {
    case 'clip':
      return '▶'
    case 'shape':
      return '◇'
    case 'homework':
      return '✓'
    case 'person':
      return '◎'
    case 'skill':
      return '★'
    default:
      return '•'
  }
}

export function MobileSearchPage({
  athletes,
  authUser,
  activeAthleteId,
  onGo,
  onViewProfile,
  onClose,
}: Props) {
  const [q, setQ] = useState('')
  const { clips } = useGymLibrary()
  const role: NavRole = navRoleFromSession(authUser?.role, sessionIsKiosk(authUser))
  const ryan = isRyanAthlete(athletes.find((a) => a.id === activeAthleteId) ?? null)

  const hits = useMemo(
    () => searchAppIndex(q, { athletes, clips, role, ryan, limit: 40 }),
    [q, athletes, clips, role, ryan],
  )


  const activate = (hit: AppSearchHit) => {
    if (hit.kind === 'shape' && hit.shapeId) {
      stashMobileSearchJump({ kind: 'shape', shapeId: hit.shapeId })
      saveTab('learn')
      onGo('learn')
    } else if (hit.kind === 'clip' && hit.clipUrl) {
      stashMobileSearchJump({ kind: 'clip', url: hit.clipUrl, label: hit.title })
      saveTab('scroll')
      onGo('scroll')
    } else if (hit.kind === 'homework' && hit.catalogId) {
      stashMobileSearchJump({ kind: 'homework', catalogId: hit.catalogId })
      saveTab('homework')
      onGo('homework')
    } else if (hit.kind === 'person' && hit.athleteId) {
      onViewProfile?.(hit.athleteId)
      saveTab('history')
      onGo('history')
    } else if (hit.kind === 'skill' && hit.skillId) {
      stashMobileSearchJump({ kind: 'skill', skillId: hit.skillId })
      saveTab('learn')
      onGo('learn')
    } else {
      saveTab(hit.tab)
      onGo(hit.tab)
    }
    onClose()
    setQ('')
  }

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-2xl flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5">
          <IgSearchIcon className="h-5 w-5 shrink-0 text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search anything in ShapeLab…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            inputMode="search"
            enterKeyHint="search"
          />
        </div>
        <button type="button" className="shrink-0 text-sm font-medium text-[var(--accent)]" onClick={onClose}>
          Done
        </button>
      </div>
      {!q.trim() && hits.length > 0 && (
        <p className="px-1 pb-1 pt-3 text-[11px] font-extrabold uppercase tracking-widest text-[var(--muted)]">
          Suggested
        </p>
      )}
      <ul className="mt-1 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pb-2">
        {hits.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left active:bg-white/10"
              onClick={() => activate(row)}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">
                {hitIcon(row.kind)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{row.title}</span>
                {row.subtitle ? (
                  <span className="block truncate text-xs text-[var(--muted)]">{row.subtitle}</span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
        {hits.length === 0 && q.trim() && (
          <li className="px-3 py-10 text-center text-sm text-[var(--muted)]">
            No matches for &ldquo;{q.trim()}&rdquo;
          </li>
        )}
      </ul>
    </div>
  )
}
