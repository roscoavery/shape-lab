import { useState } from 'react'
import type { AppTab } from '../../lib/storage'
import { saveTab } from '../../lib/storage'
import type { AuthSessionUser, SessionRole } from '../../lib/authSession'
import { sessionIsAdmin } from '../../lib/authSession'
import type { DeskPreview } from '../../lib/deskPreview'
import {
  defaultTabForSection,
  navRoleFromSession,
  sectionForTab,
  sectionsForNavRole,
  subnavForSection,
} from '../../lib/appNav'
import { IgMenuIcon } from './IgNavIcons'
import { MobilePortal } from './MobilePortal'

type Props = {
  tab: AppTab
  role?: SessionRole
  ryan: boolean
  kiosk?: boolean
  admin?: boolean
  deskPreview?: DeskPreview
  authUser: AuthSessionUser
  sectionPillsVisible: boolean
  onSectionPillsVisibleChange: (v: boolean) => void
  onGo: (tab: AppTab) => void
  onDeskPreview?: (next: DeskPreview) => void
  onSignOut?: () => void
}

const PREVIEW_LABEL: Record<DeskPreview, string> = {
  home: 'Gym desk',
  coach: 'Coach',
  gymOwner: 'Gym owner',
  parent: 'Parent',
  athlete: 'Athlete',
}

export function MobileNavDrawer({
  tab,
  role,
  ryan,
  kiosk = false,
  admin = false,
  deskPreview = 'home',
  authUser,
  sectionPillsVisible,
  onSectionPillsVisibleChange,
  onGo,
  onDeskPreview,
  onSignOut,
}: Props) {
  const [open, setOpen] = useState(false)
  const navRole = navRoleFromSession(role, kiosk)
  const sections = sectionsForNavRole(navRole)
  const currentSection = sectionForTab(tab, navRole)
  const gymAdmin = sessionIsAdmin(authUser)
  const previewing = gymAdmin && deskPreview !== 'home'

  const go = (id: AppTab) => {
    saveTab(id)
    onGo(id)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text)]"
        onClick={() => setOpen(true)}
      >
        <IgMenuIcon className="h-6 w-6" />
      </button>
      {open && (
        <MobilePortal>
          <div className="fixed inset-0 z-[220] flex flex-col bg-[#0b1118] md:hidden" role="dialog" aria-label="App menu">
            <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <p className="text-base font-semibold">Menu</p>
              <button type="button" className="text-sm font-medium text-[var(--accent)]" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              <p className="px-1 text-[11px] text-[var(--muted)]">
                Signed in as {authUser.displayName || authUser.email}
                {gymAdmin ? ' · gym login' : ''}
              </p>

              {previewing && (
                <button
                  type="button"
                  className="mt-3 w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-left text-sm font-semibold text-[var(--on-accent)]"
                  onClick={() => {
                    setOpen(false)
                    onDeskPreview?.('home')
                  }}
                >
                  Back to gym desk
                  <span className="mt-0.5 block text-xs font-normal opacity-80">
                    Leave {PREVIEW_LABEL[deskPreview]} preview — still {authUser.email}
                  </span>
                </button>
              )}

              <nav className="mt-4 space-y-4" aria-label="Sections">
                {sections.map((section) => {
                  const items = subnavForSection(section.id, ryan, kiosk, admin, navRole)
                  const active = currentSection === section.id
                  return (
                    <div key={section.id}>
                      <p className={`px-2 text-[11px] font-semibold uppercase tracking-wider ${
                        active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                      }`}>
                        {section.label}
                      </p>
                      <ul className="mt-1 overflow-hidden rounded-2xl border border-white/10">
                        {(items.length ? items : [{ id: defaultTabForSection(section.id, ryan, kiosk, admin, navRole), label: section.label }]).map((item, i) => (
                          <li key={item.id} className={i > 0 ? 'border-t border-white/10' : undefined}>
                            <button
                              type="button"
                              aria-current={tab === item.id ? 'page' : undefined}
                              className={`w-full px-3 py-3 text-left text-sm ${
                                tab === item.id
                                  ? 'bg-white/10 font-semibold text-[var(--text)]'
                                  : 'text-[var(--text)]'
                              }`}
                              onClick={() => go(item.id)}
                            >
                              {item.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </nav>
            </div>

            <div className="space-y-2 border-t border-white/10 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm"
                onClick={() => {
                  onSectionPillsVisibleChange(!sectionPillsVisible)
                  setOpen(false)
                }}
              >
                {sectionPillsVisible ? 'Hide top section tabs' : 'Show top section tabs'}
              </button>
              {onSignOut && (
                <button type="button" className="w-full rounded-xl px-3 py-2 text-sm text-[var(--muted)]" onClick={onSignOut}>
                  Sign out
                </button>
              )}
            </div>
          </div>
        </MobilePortal>
      )}
    </>
  )
}
