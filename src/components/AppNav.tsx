import {
  defaultTabForSection,
  navRoleFromSession,
  sectionForTab,
  sectionsForNavRole,
  subnavForSection,
  type NavRole,
} from '../lib/appNav'
import type { SessionRole } from '../lib/authSession'
import type { AppTab } from '../lib/storage'

type Props = {
  tab: AppTab
  ryan: boolean
  kiosk?: boolean
  admin?: boolean
  role?: SessionRole
  onGo: (id: AppTab) => void
}

export function AppNav({ tab, ryan, kiosk = false, admin = false, role, onGo }: Props) {
  const navRole: NavRole = navRoleFromSession(role, kiosk)
  const section = sectionForTab(tab, navRole)
  const sections = sectionsForNavRole(navRole)
  const subnav = subnavForSection(section, ryan, kiosk, admin, navRole)
  const showSubnav = subnav.length > 1 || (navRole !== 'parent' && navRole !== 'athlete' && section === 'more')

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <nav
        aria-label="Main"
        className="relative z-20 flex max-w-full shrink-0 gap-0.5 overflow-x-auto rounded-full bg-[#0a1014] p-1"
      >
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={section === item.id ? 'page' : undefined}
            onClick={() => {
              if (section === item.id) return
              onGo(defaultTabForSection(item.id, ryan, kiosk, admin, navRole))
            }}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
              section === item.id
                ? 'bg-[var(--accent-dim)] font-semibold text-white'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {showSubnav && (
        <nav aria-label="In this section" className="flex max-w-full gap-1 overflow-x-auto px-1">
          {subnav.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => onGo(item.id)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs transition ${
                tab === item.id
                  ? 'bg-white/10 font-semibold text-[var(--text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
