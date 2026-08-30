import { APP_SECTIONS, defaultTabForSection, sectionForTab, subnavForSection } from '../lib/appNav'
import type { AppTab } from '../lib/storage'

type Props = {
  tab: AppTab
  ryan: boolean
  onGo: (tab: AppTab) => void
}

export function AppNav({ tab, ryan, onGo }: Props) {
  const section = sectionForTab(tab)
  const subnav = subnavForSection(section, ryan)
  const showSubnav = subnav.length > 1 || section === 'more'

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <nav
        aria-label="Main"
        className="relative z-20 flex max-w-full shrink-0 gap-1 overflow-x-auto rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] p-1"
      >
        {APP_SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={section === item.id ? 'page' : undefined}
            onClick={() => onGo(defaultTabForSection(item.id, ryan))}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${
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
        <nav aria-label="In this section" className="flex max-w-full gap-1 overflow-x-auto px-0.5">
          {subnav.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => onGo(item.id)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs ${
                tab === item.id
                  ? 'font-semibold text-[var(--text)]'
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
