import { useState } from 'react'
import type { Athlete } from '../../types'
import type { AppTab } from '../../lib/storage'
import { saveTab } from '../../lib/storage'
import { IgCreateIcon } from './IgNavIcons'

type Props = {
  athlete: Athlete | null
  onGo: (tab: AppTab) => void
  onStory?: () => void
}

const OPTIONS: { tab?: AppTab; title: string; hint: string; glyph: string; story?: boolean }[] = [
  { story: true, title: 'Story', hint: '24h highlight for the gym', glyph: '◯' },
  { tab: 'wins', title: 'Win', hint: 'Little hit or first — Wins feed', glyph: '🙌' },
  { tab: 'feed', title: 'Post', hint: 'Share on the main gym feed', glyph: '📣' },
  { tab: 'scroll', title: 'Pass / reel', hint: 'Reference clip or pass video', glyph: '▶' },
  { tab: 'homework', title: 'Homework log', hint: 'Log holds, reps, or drills', glyph: '✓' },
]

export function MobileCreateSheet({ athlete, onGo, onStory }: Props) {
  const [open, setOpen] = useState(false)

  const pick = (row: (typeof OPTIONS)[number]) => {
    setOpen(false)
    if (row.story) {
      onStory?.()
      return
    }
    if (!row.tab) return
    saveTab(row.tab)
    onGo(row.tab)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Create"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text)]"
        onClick={() => setOpen(true)}
      >
        <IgCreateIcon className="h-7 w-7" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/55 md:hidden"
          role="dialog"
          aria-label="Create"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl border border-white/10 bg-[#121820] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
            <p className="text-center text-base font-semibold">Create</p>
            <p className="mt-1 text-center text-xs text-[var(--muted)]">
              {athlete ? `As ${athlete.name}` : 'Unlock a profile to post'}
            </p>
            <ul className="mt-4 space-y-1">
              {OPTIONS.map((row) => (
                <li key={row.title}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left active:bg-white/10"
                    onClick={() => pick(row)}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg">
                      {row.glyph}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{row.title}</span>
                      <span className="block text-xs text-[var(--muted)]">{row.hint}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-2 w-full rounded-xl py-3 text-sm font-medium text-[var(--muted)]"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
