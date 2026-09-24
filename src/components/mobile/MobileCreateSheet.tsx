import { useState } from 'react'
import type { Athlete } from '../../types'
import type { AppTab } from '../../lib/storage'

type Props = {
  athlete: Athlete | null
  onGo: (tab: AppTab) => void
}

export function MobileCreateSheet({ athlete, onGo }: Props) {
  const [open, setOpen] = useState(false)

  const pick = (tab: AppTab) => {
    setOpen(false)
    onGo(tab)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Create"
        className="flex h-9 w-9 items-center justify-center rounded-full text-xl font-light text-[var(--text)]"
        onClick={() => setOpen(true)}
      >
        +
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4"
          role="dialog"
          aria-label="Create post"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#121820] p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold">Share on the gym feed</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {athlete ? `Posting as ${athlete.name}` : 'Sign in with a profile to post.'}
            </p>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                className="rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm"
                onClick={() => pick('wins')}
              >
                Win — little hit or first
              </button>
              <button
                type="button"
                className="rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm"
                onClick={() => pick('feed')}
              >
                Gym post — bigger share
              </button>
              <button
                type="button"
                className="rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm"
                onClick={() => pick('scroll')}
              >
                Pass / reference reel
              </button>
              <button
                type="button"
                className="rounded-xl bg-white/5 px-3 py-2.5 text-left text-sm"
                onClick={() => pick('today')}
              >
                Today — class & homework
              </button>
            </div>
            <button
              type="button"
              className="mt-3 w-full text-sm text-[var(--muted)] underline"
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
