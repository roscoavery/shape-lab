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

  const SUGGESTIONS: { label: string; items: string[] }[] = [
    {
      label: 'Skills',
      items: [
        'Standing back tuck',
        'Standing full',
        'Full twisting layout',
        'Layout',
        'Round off',
        'Round off back handspring',
        'Back walkover',
        'Cartwheel',
        'Double back',
        'Front tuck',
      ],
    },
    {
      label: 'Concepts',
      items: [
        'Fast is slow',
        '5 clean vs 20 thrown',
        'Landing vs owning',
        'Perfection before progression',
        'S-curve',
        'What is in our control',
      ],
    },
    {
      label: 'Shapes',
      items: [
        'Hollow',
        'Arch',
        'Handstand',
        'Tuck',
        'Pike',
        'Layout shape',
        'C shape',
        'Bridge',
      ],
    },
    {
      label: 'Drills & homework',
      items: [
        'Candlestick',
        'Hollow hold',
        'Handstand forward roll',
        'Back extension',
        'V-ups',
        'Bridge push-ups',
        'Wall sit',
      ],
    },
    {
      label: 'Features',
      items: [
        'Delay cam',
        'Compare videos',
        'Skill path',
        'Reference videos',
        'Shape library',
        'Homework',
        'Class clock',
      ],
    },
    {
      label: 'Technique cues',
      items: [
        'Eyes down',
        'Tight zombie',
        'Rebound',
        'Block',
        'Hollow hold',
        'Late twist',
        'Arms down',
        'Chest up',
      ],
    },
    {
      label: 'More skills',
      items: [
        'Back handspring',
        'Front handspring',
        'Back tuck',
        'Front tuck',
        'Aerial',
        'Round off tuck',
        'Whip',
        'Punch front',
      ],
    },
    {
      label: 'For parents',
      items: [
        'What progress looks like',
        'Move-up criteria',
        'Fear',
        'Practice at home',
        'Perfection before progression',
        'Talking to your athlete',
      ],
    },
    {
      label: 'Wellness',
      items: [
        'Sleep',
        'Recovery',
        'Nutrition',
        'Beets',
        'Protein',
        'Hydration',
        'Sore muscles',
      ],
    },
  ]

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
      {!q.trim() && (
        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain py-4 pb-8">
          {SUGGESTIONS.map((group) => (
            <div key={group.label}>
              <p className="px-1 text-[11px] font-extrabold uppercase tracking-widest text-[var(--muted)]">
                {group.label}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.items.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQ(term)}
                    className="rounded-full bg-white/8 px-3.5 py-2 text-sm font-medium text-white/90 active:bg-white/20"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {q.trim() ? (
      <ul className="mt-3 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pb-2">
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
      ) : null}
    </div>
  )
}
