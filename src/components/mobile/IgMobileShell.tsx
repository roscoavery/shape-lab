import { useState, type ReactNode } from 'react'
import type { AppTab } from '../../lib/storage'
import type { AuthSessionUser } from '../../lib/authSession'
import type { SessionRole } from '../../lib/authSession'
import type { DeskPreview } from '../../lib/deskPreview'
import type { Athlete } from '../../types'
import { AthleteAvatar } from '../AthleteAvatar'
import { NotifyBell } from '../NotifyBell'
import type { AppSettings } from '../../types'
import { AppNav } from '../AppNav'
import { MobileCreateSheet } from './MobileCreateSheet'
import { MobileSearchPage } from './MobileSearchPage'
import { MobileAccountSwitcher } from './MobileAccountSwitcher'
import { MobileNavDrawer } from './MobileNavDrawer'
import { MobileDiscoverSheet } from './MobileDiscoverSheet'
import { IgHomeIcon, IgMessagesIcon, IgReelsIcon, IgSearchIcon } from './IgNavIcons'
import { stashDiscoverTarget, type DiscoverTarget } from '../../lib/mobileDiscover'

type ShellTab = 'home' | 'reels' | 'messages' | 'search' | 'profile'

function shellTabForAppTab(tab: AppTab, mobileSearch: boolean): ShellTab {
  if (mobileSearch) return 'search'
  if (tab === 'network') return 'messages'
  if (tab === 'scroll' || tab === 'feed' || tab === 'wins' || tab === 'compare') return 'reels'
  if (tab === 'today') return 'home'
  return 'home'
}

type Props = {
  tab: AppTab
  onGo: (tab: AppTab) => void
  authUser: AuthSessionUser
  athlete: Athlete | null
  athletes: Athlete[]
  activeAthleteId: string | null
  settings: AppSettings
  onViewProfile?: (id: string) => void
  onOpenMyProfile?: () => void
  onStory?: () => void
  ryan: boolean
  kiosk?: boolean
  admin?: boolean
  navRole?: SessionRole
  deskPreview?: DeskPreview
  children: ReactNode
}

export function IgMobileShell({
  tab,
  onGo,
  authUser,
  athlete,
  athletes,
  activeAthleteId,
  settings,
  onViewProfile,
  onOpenMyProfile,
  onStory,
  ryan,
  kiosk = false,
  admin = false,
  navRole,
  deskPreview = 'home',
  children,
}: Props) {
  const [mobileSearch, setMobileSearch] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [sectionPillsVisible, setSectionPillsVisible] = useState(false)
  const active = shellTabForAppTab(tab, mobileSearch)
  const showAccountSwitcher = tab === 'network'

  const navBtn = (on: boolean) => (on ? 'text-[var(--text)]' : 'text-[var(--muted)]')

  const pickDiscover = (pickTab: AppTab, target: DiscoverTarget) => {
    stashDiscoverTarget(target)
    setMobileSearch(false)
    onGo(pickTab)
  }

  const navIconBtn =
    'flex flex-1 items-center justify-center py-2 min-h-[44px]'

  return (
    <div className="max-md:pb-[calc(3.25rem+env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-40 -mx-3 border-b border-white/10 bg-[#0b1118]/95 backdrop-blur-md sm:-mx-6 md:hidden">
        <header className="flex items-center gap-0 px-2 py-1.5 sm:px-4">
          <MobileNavDrawer
            tab={tab}
            role={navRole ?? authUser.role}
            ryan={ryan}
            kiosk={kiosk}
            admin={admin}
            deskPreview={deskPreview}
            authUser={authUser}
            sectionPillsVisible={sectionPillsVisible}
            onSectionPillsVisibleChange={setSectionPillsVisible}
            onGo={(id) => {
              setMobileSearch(false)
              onGo(id)
            }}
          />
          <MobileCreateSheet
            athlete={athlete}
            onGo={(id) => {
              setMobileSearch(false)
              onGo(id)
            }}
            onStory={onStory}
          />
          <div className="min-w-0 flex-1 text-center">
            {mobileSearch ? (
              <p className="truncate text-sm font-semibold">Search</p>
            ) : showAccountSwitcher ? (
              <MobileAccountSwitcher user={authUser} athletes={athletes} onGo={onGo} />
            ) : (
              <p className="truncate text-sm font-semibold tracking-tight">shapelab</p>
            )}
          </div>
          <NotifyBell athlete={athlete} settings={settings} onOpen={onGo} variant="ig" />
        </header>
        {sectionPillsVisible && !mobileSearch && (
          <div className="px-3 pb-2 sm:px-6">
            <AppNav
              tab={tab}
              ryan={ryan}
              kiosk={kiosk}
              admin={admin}
              role={navRole ?? authUser.role}
              onGo={(id) => {
                setMobileSearch(false)
                onGo(id)
              }}
            />
          </div>
        )}
      </div>

      {mobileSearch ? (
        <MobileSearchPage
          athletes={athletes}
          authUser={authUser}
          activeAthleteId={activeAthleteId}
          onGo={onGo}
          onViewProfile={onViewProfile}
          onClose={() => setMobileSearch(false)}
        />
      ) : (
        children
      )}

      <MobileDiscoverSheet open={discoverOpen} onClose={() => setDiscoverOpen(false)} onPick={pickDiscover} />

      <nav
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-lg items-center justify-between border-t border-white/10 bg-[#0a1014]/95 px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md md:hidden"
        aria-label="App"
      >
        <button
          type="button"
          aria-label="Home"
          aria-current={active === 'home' ? 'page' : undefined}
          onClick={() => {
            setMobileSearch(false)
            onGo('today')
          }}
          className={`${navIconBtn} ${navBtn(active === 'home')}`}
        >
          <IgHomeIcon className="h-7 w-7" filled={active === 'home'} />
        </button>
        <button
          type="button"
          aria-label="Discover"
          aria-current={active === 'reels' ? 'page' : undefined}
          onClick={() => {
            setMobileSearch(false)
            setDiscoverOpen(true)
          }}
          className={`${navIconBtn} ${navBtn(active === 'reels')}`}
        >
          <IgReelsIcon className="h-7 w-7" filled={active === 'reels'} />
        </button>
        <button
          type="button"
          aria-label="Messages"
          aria-current={active === 'messages' ? 'page' : undefined}
          onClick={() => {
            setMobileSearch(false)
            onGo('network')
          }}
          className={`${navIconBtn} ${navBtn(active === 'messages')}`}
        >
          <IgMessagesIcon className="h-7 w-7" filled={active === 'messages'} />
        </button>
        <button
          type="button"
          aria-label="Search"
          aria-current={active === 'search' ? 'page' : undefined}
          onClick={() => setMobileSearch(true)}
          className={`${navIconBtn} ${navBtn(active === 'search')}`}
        >
          <IgSearchIcon className="h-7 w-7" />
        </button>
        <button
          type="button"
          aria-label="My profile"
          aria-current={active === 'profile' ? 'page' : undefined}
          onClick={() => {
            setMobileSearch(false)
            onOpenMyProfile?.()
          }}
          className={`${navIconBtn} ${navBtn(false)}`}
        >
          {athlete ? (
            <AthleteAvatar athlete={athlete} size="xs" className="h-7 w-7 ring-1 ring-white/25" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs">◎</span>
          )}
        </button>
      </nav>
    </div>
  )
}
