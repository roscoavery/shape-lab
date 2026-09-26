import { useState, type ReactNode } from 'react'
import type { AppTab } from '../../lib/storage'
import type { AuthSessionUser, SessionRole } from '../../lib/authSession'
import { sessionIsAdmin } from '../../lib/authSession'
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

const PREVIEW_LABEL: Record<Exclude<DeskPreview, 'home'>, string> = {
  coach: 'coach',
  gymOwner: 'gym owner',
  parent: 'parent',
  athlete: 'athlete',
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
  /** When the profile overlay is open, the bottom nav stays visible and highlights the avatar. */
  profileActive?: boolean
  onCloseProfile?: () => void
  onStory?: () => void
  onDeskPreview: (next: DeskPreview) => void
  onSignOut?: () => void
  ryan: boolean
  kiosk?: boolean
  admin?: boolean
  navRole?: SessionRole
  deskPreview?: DeskPreview
  /** profileRole(activeProfile) === 'gym_owner' — gates the Owner section. */
  isOwner?: boolean
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
  profileActive = false,
  onCloseProfile,
  onStory,
  onDeskPreview,
  onSignOut,
  ryan,
  kiosk = false,
  admin = false,
  navRole,
  deskPreview = 'home',
  isOwner = false,
  children,
}: Props) {
  const [mobileSearch, setMobileSearch] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [sectionPillsVisible, setSectionPillsVisible] = useState(false)
  const active = profileActive ? 'profile' : shellTabForAppTab(tab, mobileSearch)
  const discoverOn = discoverOpen || active === 'reels'
  const loginAdmin = sessionIsAdmin(authUser)
  const previewing = loginAdmin && deskPreview !== 'home'

  const navBtn = (on: boolean) => (on ? 'text-[var(--text)]' : 'text-[var(--muted)]')
  const navIconBtn = 'flex flex-1 items-center justify-center py-2 min-h-[44px]'

  const pickDiscover = (pickTab: AppTab, target: DiscoverTarget) => {
    stashDiscoverTarget(target)
    setMobileSearch(false)
    onGo(pickTab)
  }

  const go = (id: AppTab) => {
    setMobileSearch(false)
    setDiscoverOpen(false)
    onCloseProfile?.()
    onGo(id)
  }

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      active: active === 'home',
      onClick: () => go('today'),
      icon: <IgHomeIcon className="h-7 w-7" filled={active === 'home'} />,
    },
    {
      id: 'discover',
      label: 'Discover',
      active: discoverOn,
      onClick: () => {
        setMobileSearch(false)
        onCloseProfile?.()
        setDiscoverOpen(true)
      },
      icon: <IgReelsIcon className="h-7 w-7" filled={discoverOn} />,
    },
    {
      id: 'messages',
      label: 'Messages',
      active: active === 'messages',
      onClick: () => go('network'),
      icon: <IgMessagesIcon className="h-7 w-7" filled={active === 'messages'} />,
    },
    {
      id: 'search',
      label: 'Search',
      active: active === 'search',
      onClick: () => {
        setDiscoverOpen(false)
        onCloseProfile?.()
        setMobileSearch(true)
      },
      icon: <IgSearchIcon className="h-7 w-7" />,
    },
    {
      id: 'profile',
      label: 'Profile',
      active: active === 'profile',
      onClick: () => {
        setMobileSearch(false)
        onOpenMyProfile?.()
      },
      icon: athlete ? (
        <AthleteAvatar
          athlete={athlete}
          size="xs"
          className={`h-7 w-7 ring-1 ${active === 'profile' ? 'ring-[var(--text)]' : 'ring-white/25'}`}
        />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs">
          ◎
        </span>
      ),
    },
  ]

  return (
    <div className="max-md:pb-[calc(3.25rem+env(safe-area-inset-bottom))] md:pl-[76px] xl:pl-60">
      <div className="sticky top-0 z-40 -mx-3 border-b border-white/10 bg-[#0b1118] sm:-mx-6 md:hidden">
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
            onGo={go}
            onDeskPreview={onDeskPreview}
            onSignOut={onSignOut}
            isOwner={isOwner}
          />
          <MobileCreateSheet athlete={athlete} onGo={go} onStory={onStory} />
          <div className="min-w-0 flex-1 text-center">
            {mobileSearch ? (
              <p className="truncate text-sm font-semibold">Search</p>
            ) : loginAdmin ? (
              <MobileAccountSwitcher user={authUser} deskPreview={deskPreview} onDeskPreview={onDeskPreview} />
            ) : (
              <p className="truncate text-sm font-semibold tracking-tight">shapelab</p>
            )}
          </div>
          <NotifyBell athlete={athlete} settings={settings} onOpen={go} variant="ig" />
        </header>
        {previewing && (
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 bg-[var(--accent-dim)] px-3 py-2 text-left text-xs font-semibold text-white"
            onClick={() => onDeskPreview('home')}
          >
            <span>Previewing {PREVIEW_LABEL[deskPreview]} desk</span>
            <span>Back to gym</span>
          </button>
        )}
        {sectionPillsVisible && !mobileSearch && (
          <div className="px-3 pb-2 sm:px-6">
            <AppNav
              tab={tab}
              ryan={ryan}
              kiosk={kiosk}
              admin={admin}
              role={navRole ?? authUser.role}
              isOwner={isOwner}
              onGo={go}
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
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-lg items-center justify-between border-t border-white/10 bg-[#0a1014] px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 md:hidden"
        aria-label="App"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            onClick={item.onClick}
            className={`${navIconBtn} ${navBtn(item.active)}`}
          >
            {item.icon}
          </button>
        ))}
      </nav>

      {/* Tablet / desktop: the same five destinations docked left, Instagram-style.
          Icon-only on md, icon + label on xl. */}
      <nav
        className="fixed inset-y-0 left-0 z-50 hidden w-[76px] flex-col border-r border-white/10 bg-[#0a1014] px-2 py-5 md:flex xl:w-60"
        aria-label="App"
      >
        <div className="flex items-center justify-center xl:justify-start xl:px-4">
          <img src="/favicon.svg" alt="" aria-hidden className="h-9 w-9 xl:hidden" />
          <p className="hidden text-[22px] font-bold tracking-tight text-[var(--text)] xl:block">
            shapelab
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
              title={item.label}
              onClick={item.onClick}
              className={`flex min-h-[52px] items-center justify-center gap-4 rounded-xl px-3 transition-colors xl:justify-start ${
                item.active
                  ? 'text-[var(--text)]'
                  : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]'
              }`}
            >
              {item.icon}
              <span className={`hidden text-[15px] xl:inline ${item.active ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
