import type { AppTab } from '../../lib/storage'
import { saveTab } from '../../lib/storage'

export type DiscoverTarget = 'all' | 'scroll' | 'wins' | 'feed' | 'compare'

type Props = {
  open: boolean
  onClose: () => void
  onPick: (tab: AppTab, target: DiscoverTarget) => void
}

const ROWS: { target: DiscoverTarget; tab: AppTab; title: string; hint: string }[] = [
  { target: 'all', tab: 'feed', title: 'All', hint: 'Wins, gym feed, and reference reels' },
  { target: 'scroll', tab: 'scroll', title: 'Reference reels', hint: 'Gym compare library scroll' },
  { target: 'wins', tab: 'wins', title: 'Wins', hint: 'Hits and accomplishments' },
  { target: 'feed', tab: 'feed', title: 'Gym feed', hint: 'Team posts and shares' },
  { target: 'compare', tab: 'compare', title: 'Passes & compare', hint: 'ShapeLab passes and A/B video' },
]

export function MobileDiscoverSheet({ open, onClose, onPick }: Props) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/55 md:hidden"
      role="dialog"
      aria-label="Discover"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border border-white/10 bg-[#121820] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
        <p className="text-center text-base font-semibold">Discover</p>
        <p className="mt-1 text-center text-xs text-[var(--muted)]">Passes, wins, feed, and reference video</p>
        <ul className="mt-4 space-y-1">
          {ROWS.map((row) => (
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
  )
}
