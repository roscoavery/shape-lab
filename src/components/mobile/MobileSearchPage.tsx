import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { AppTab } from '../../lib/storage'
import { saveTab } from '../../lib/storage'
import { searchAppIndex, type AppSearchHit } from '../../lib/appSearchIndex'
import { useGymLibrary } from '../../lib/gymLibrary'
import { navRoleFromSession, type NavRole } from '../../lib/appNav'
import type { AuthSessionUser, SessionRole } from '../../lib/authSession'
import { sessionIsKiosk } from '../../lib/authSession'
import { isRyanAthlete } from '../../lib/ryanProfile'
import { stashMobileSearchJump } from '../../lib/mobileSearchNav'
import { IgSearchIcon } from './IgNavIcons'
import { ChatPanel } from '../chat/ChatPanel'

type Props = {
  athletes: Athlete[]
  authUser: AuthSessionUser
  activeAthleteId: string | null
  onGo: (tab: AppTab) => void
  onViewProfile?: (id: string) => void
  onClose: () => void
  canEditFaq: boolean
  /** Preview-aware role (athlete view, desk previews) — picks the Ask suggestion set. */
  viewerRole?: SessionRole
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
  canEditFaq,
  viewerRole,
}: Props) {
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'search' | 'ask'>('search')
  const [askMounted, setAskMounted] = useState(false)
  const { clips } = useGymLibrary()
  const role: NavRole = navRoleFromSession(authUser?.role, sessionIsKiosk(authUser))
  const ryan = isRyanAthlete(athletes.find((a) => a.id === activeAthleteId) ?? null)
  // The Ask chatbot isn't available on the floor kiosk, so it stays search-only there.
  const showAsk = role !== 'kiosk'

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
      {showAsk && (
        <div className="mb-3 flex justify-center">
          <div className="flex rounded-full bg-white/5 p-1" role="tablist" aria-label="Search or ask">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'search'}
              onClick={() => setMode('search')}
              className={`rounded-full px-5 py-1.5 text-sm transition ${
                mode === 'search' ? 'bg-[var(--panel)] font-semibold text-white' : 'text-[var(--muted)]'
              }`}
            >
              Search
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'ask'}
              onClick={() => {
                setAskMounted(true)
                setMode('ask')
              }}
              className={`rounded-full px-5 py-1.5 text-sm transition ${
                mode === 'ask' ? 'bg-[var(--panel)] font-semibold text-white' : 'text-[var(--muted)]'
              }`}
            >
              Ask
            </button>
          </div>
        </div>
      )}
      <div className={mode === 'search' ? 'flex min-h-[50vh] flex-col' : 'hidden'}>
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
      {showAsk && askMounted && (
        <div className={mode === 'ask' ? 'min-h-[50vh] flex-1' : 'hidden'}>
          <ChatPanel
            bare
            canEditFaq={canEditFaq}
            viewerRole={viewerRole}
            onOpenTab={(t) => {
              onGo(t)
              onClose()
            }}
          />
        </div>
      )}
    </div>
  )
}
