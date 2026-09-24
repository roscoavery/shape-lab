import { useState } from 'react'
import type { AuthSessionUser } from '../../lib/authSession'
import { sessionIsAdmin } from '../../lib/authSession'
import { DESK_PREVIEW_OPTIONS, type DeskPreview } from '../../lib/deskPreview'
import { MobilePortal } from './MobilePortal'

type Props = {
  user: AuthSessionUser
  deskPreview: DeskPreview
  onDeskPreview: (next: DeskPreview) => void
}

const HINT: Record<DeskPreview, string> = {
  home: 'Your real gym login',
  coach: 'Coach desk preview',
  gymOwner: 'Gym owner desk preview',
  parent: 'Parent desk preview',
  athlete: 'Athlete desk preview',
}

export function MobileAccountSwitcher({ user, deskPreview, onDeskPreview }: Props) {
  const [open, setOpen] = useState(false)
  if (!sessionIsAdmin(user)) return null

  const current = DESK_PREVIEW_OPTIONS.find((row) => row.id === deskPreview) ?? DESK_PREVIEW_OPTIONS[0]
  const title = deskPreview === 'home' ? user.displayName || 'Gym desk' : `${current.label} preview`

  const pick = (next: DeskPreview) => {
    setOpen(false)
    if (next === deskPreview) return
    onDeskPreview(next)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Switch desk view"
        className="mx-auto flex max-w-[12rem] items-center justify-center gap-1 truncate text-sm font-semibold"
        onClick={() => setOpen(true)}
      >
        <span className="truncate">{title}</span>
        <span className="text-[10px] text-[var(--muted)]">▾</span>
      </button>
      {open && (
        <MobilePortal>
          <div
            className="fixed inset-0 z-[230] flex items-end justify-center bg-black/70 md:hidden"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-label="Switch desk"
          >
            <div
              className="w-full max-w-lg rounded-t-2xl border border-white/10 bg-[#121820] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
              <p className="px-2 text-center text-base font-semibold">Switch desk</p>
              <p className="mt-1 px-2 text-center text-xs text-[var(--muted)]">
                Still signed in as {user.email}. Only the gym login can switch desks.
              </p>
              <ul className="mt-3">
                {DESK_PREVIEW_OPTIONS.map((row) => {
                  const on = row.id === deskPreview
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={`w-full rounded-xl px-3 py-3 text-left ${on ? 'bg-white/10' : ''}`}
                        onClick={() => pick(row.id)}
                      >
                        <p className="text-sm font-medium">{row.id === 'home' ? 'Gym desk (admin)' : row.label}</p>
                        <p className="text-xs text-[var(--muted)]">{HINT[row.id]}{on ? ' · current' : ''}</p>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button type="button" className="mt-1 w-full py-3 text-sm text-[var(--muted)]" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </MobilePortal>
      )}
    </>
  )
}
