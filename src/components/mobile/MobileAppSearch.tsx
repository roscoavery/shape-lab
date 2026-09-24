import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import type { AppTab } from '../../lib/storage'
import { APP_TABS, saveTab } from '../../lib/storage'

const QUICK: { tab: AppTab; label: string; words: string }[] = [
  { tab: 'today', label: 'Today', words: 'today home class schedule' },
  { tab: 'homework', label: 'Homework', words: 'homework holds drills' },
  { tab: 'tasks2', label: 'Class flows', words: 'flows tasks sequence' },
  { tab: 'wins', label: 'Wins', words: 'wins feed accomplishments' },
  { tab: 'feed', label: 'Gym feed', words: 'feed post gym' },
  { tab: 'scroll', label: 'Reference reels', words: 'reels scroll compare reference' },
  { tab: 'compare', label: 'Compare', words: 'compare video delay' },
  { tab: 'learn', label: 'Shape library', words: 'learn shapes library' },
  { tab: 'network', label: 'Messages', words: 'messages network dm' },
  { tab: 'history', label: 'Profiles', words: 'profile athletes roster' },
  { tab: 'accounts', label: 'Accounts', words: 'accounts login' },
  { tab: 'classclock', label: 'Class clock', words: 'clock class stopwatch' },
]

type Props = {
  label: string
  icon: string
  athletes: Athlete[]
  onGo: (tab: AppTab) => void
}

export function MobileAppSearch({ label, icon, athletes, onGo }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return QUICK.slice(0, 8)
    const people = athletes
      .filter((a) => a.name.toLowerCase().includes(needle))
      .slice(0, 6)
      .map((a) => ({ tab: 'history' as AppTab, label: a.name, words: a.id }))
    const places = QUICK.filter(
      (row) =>
        row.label.toLowerCase().includes(needle) || row.words.toLowerCase().includes(needle),
    )
    return [...people, ...places].slice(0, 12)
  }, [q, athletes])

  const go = (tab: AppTab) => {
    saveTab(tab)
    onGo(tab)
    setOpen(false)
    setQ('')
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        className="flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium text-[var(--muted)]"
        onClick={() => setOpen(true)}
      >
        <span className="text-lg leading-none">{icon}</span>
        <span>{label}</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-[#0b1118] p-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
          role="dialog"
          aria-label="Search"
        >
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people, wins, homework…"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
              autoFocus
            />
            <button type="button" className="text-sm text-[var(--accent)]" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
          <ul className="mt-4 space-y-1 overflow-y-auto">
            {hits.map((row, i) => (
              <li key={`${row.tab}-${row.label}-${i}`}>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/5"
                  onClick={() => go(row.tab)}
                >
                  {row.label}
                </button>
              </li>
            ))}
            {hits.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">No matches.</li>
            )}
          </ul>
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Tabs: {APP_TABS.slice(0, 6).join(', ')}…
          </p>
        </div>
      )}
    </>
  )
}
