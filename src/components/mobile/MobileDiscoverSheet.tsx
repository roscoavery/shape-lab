import type { AppTab } from '../../lib/storage'
import { saveTab } from '../../lib/storage'
import { MobilePortal } from './MobilePortal'
import { isCoachProfile } from '../../lib/profileRole'
import type { Athlete } from '../../types'
import type { DiscoverTarget } from '../../lib/mobileDiscover'

type Props = {
  open: boolean
  onClose: () => void
  onPick: (tab: AppTab, target: DiscoverTarget) => void
  athlete: Athlete | null
}

type Row = {
  target: DiscoverTarget
  tab: AppTab
  title: string
  hint: string
  coachOnly?: boolean
  athleteOnly?: boolean
}

const ROWS: Row[] = [
  { target: 'homework', tab: 'homework', title: 'Homework', hint: 'Assigned work and practice' },
  { target: 'classflows', tab: 'tasks2', title: 'Class flows', hint: 'Guided sequence training in Practice' },
  { target: 'scroll', tab: 'scroll', title: 'Reference reels', hint: 'Gym compare library scroll' },
  { target: 'wins', tab: 'wins', title: 'Wins', hint: 'Hits and accomplishments' },
  { target: 'feed', tab: 'feed', title: 'Gym feed', hint: 'Team posts and shares' },
  { target: 'compare', tab: 'compare', title: 'Passes & compare', hint: 'ShapeLab passes and A/B video' },
  { target: 'learn', tab: 'learn', title: 'Learn', hint: 'Shapes, skills, drills, and spotting' },
  { target: 'spotting', tab: 'spotting', title: 'Spotting', hint: 'Spotting methods and study', coachOnly: true },
  { target: 'mysystem', tab: 'mysystem', title: 'My system', hint: 'Your coaching system', coachOnly: true },
  { target: 'skillpath', tab: 'learn', title: 'Skill path guide', hint: 'Skill progressions and guides', athleteOnly: true },
]

export function MobileDiscoverSheet({ open, onClose, onPick, athlete }: Props) {
  if (!open) return null
  const coach = isCoachProfile(athlete)
  const rows = ROWS.filter((r) => {
    if (r.coachOnly && !coach) return false
    if (r.athleteOnly && coach) return false
    return true
  })
  return (
    <MobilePortal>
    <div
      className="fixed inset-0 z-[45] flex items-end justify-center bg-black/70 md:items-center md:p-6"
      role="dialog"
      aria-label="Discover"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border border-white/10 bg-[#121820] px-4 pb-[max(4.5rem,calc(env(safe-area-inset-bottom)+4rem))] pt-2 md:max-w-sm md:rounded-2xl md:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
        <p className="text-center text-base font-semibold">Discover</p>
        <p className="mt-1 text-center text-xs text-[var(--muted)]">Passes, wins, feed, reference video, and learn</p>
        <ul className="mt-4 space-y-1">
          {rows.map((row) => (
            <li key={row.target}>
              <button
                type="button"
                className="flex w-full flex-col rounded-xl px-3 py-3 text-left active:bg-white/10"
                onClick={() => {
                  saveTab(row.tab)
                  onPick(row.tab, row.target)
                  onClose()
                }}
              >
                <span className="text-sm font-semibold">{row.title}</span>
                <span className="text-xs text-[var(--muted)]">{row.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="mt-2 w-full py-3 text-sm text-[var(--muted)]" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
    </MobilePortal>
  )
}
