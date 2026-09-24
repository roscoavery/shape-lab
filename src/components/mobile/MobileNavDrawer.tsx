import { useState } from 'react'
import type { AppTab } from '../../lib/storage'
import { saveTab } from '../../lib/storage'
import type { AuthSessionUser, SessionRole } from '../../lib/authSession'
import { sessionIsAdmin } from '../../lib/authSession'
import type { DeskPreview } from '../../lib/deskPreview'
import { saveDeskPreview } from '../../lib/deskPreview'
import {
  defaultTabForSection,
  navRoleFromSession,
  sectionForTab,
  sectionsForNavRole,
  subnavForSection,
  type AppSection,
} from '../../lib/appNav'
import { IgMenuIcon } from './IgNavIcons'

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
}: Props) {
  const [open, setOpen] = useState(false)
  const navRole = navRoleFromSession(role, kiosk)
  const sections = sectionsForNavRole(navRole)
  const currentSection = sectionForTab(tab, navRole)
  const gymAdmin = sessionIsAdmin(authUser)

  const go = (id: AppTab) => {
    saveTab(id)
    onGo(id)
    setOpen(false)
    onSectionPillsVisibleChange(false)
  }

  const goSection = (section: AppSection) => {
    go(defaultTabForSection(section, ryan, kiosk, admin, navRole))
  }

  const openMenu = () => {
    onSectionPillsVisibleChange(false)
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text)]"
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <IgMenuIcon className="h-6 w-6" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[85] md:hidden" role="dialog" aria-label="App menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-white/10 bg-[#0b1118] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-base font-semibold">Menu</p>
              <button type="button" className="text-sm font-medium text-[var(--accent)]" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
            {gymAdmin && deskPreview !== 'home' && (
              <button
                type="button"
                className="mx-2 mt-2 rounded-xl bg-[var(--accent-dim)]/30 px-3 py-2.5 text-left text-sm font-semibold"
                onClick={() => {
                  saveDeskPreview('home')
                  setOpen(false)
                  onGo('today')
                  window.location.reload()
                }}
              >
                ← Back to gym desk
                <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">
                  Exit {deskPreview} preview
                </span>
              </button>
            )}
            <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-2" aria-label="Sections">
              {sections.map((section) => {
                const items = subnavForSection(section.id, ryan, kiosk, admin, navRole)
                const active = currentSection === section.id
                return (
                  <div key={section.id} className="mb-3">
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                        active ? 'bg-white/10 text-[var(--text)]' : 'text-[var(--text)] hover:bg-white/5'
                      }`}
                      onClick={() => goSection(section.id)}
                    >
                      {section.label}
                      <span className="text-xs font-normal text-[var(--muted)]">{items.length}</span>
                    </button>
                    <ul className="mt-1 space-y-0.5 pl-1">
                      {items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            aria-current={tab === item.id ? 'page' : undefined}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                              tab === item.id
                                ? 'bg-[var(--accent-dim)]/40 font-semibold text-white'
                                : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]'
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
            <div className="border-t border-white/10 px-3 py-3">
              <button
                type="button"
                className="w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium"
                onClick={() => {
                  onSectionPillsVisibleChange(!sectionPillsVisible)
                  setOpen(false)
                }}
              >
                {sectionPillsVisible ? 'Hide quick tabs on top' : 'Show quick tabs on top'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
