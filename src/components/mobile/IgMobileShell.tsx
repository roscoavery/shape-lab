import type { ReactNode } from 'react'
import type { AppTab } from '../../lib/storage'
import type { AuthSessionUser } from '../../lib/authSession'
import type { Athlete } from '../../types'
import { AthleteAvatar } from '../AthleteAvatar'
import { NotifyBell } from '../NotifyBell'
import type { AppSettings } from '../../types'
import { MobileCreateSheet } from './MobileCreateSheet'
import { MobileAppSearch } from './MobileAppSearch'
import { MobileAccountSwitcher } from './MobileAccountSwitcher'
import { IgHomeIcon, IgMessagesIcon, IgReelsIcon } from './IgNavIcons'

type ShellTab = 'home' | 'reels' | 'messages' | 'search' | 'profile'

function shellTabForAppTab(tab: AppTab): ShellTab {
  if (tab === 'network') return 'messages'
  if (tab === 'history' || tab === 'accounts') return 'profile'
  if (tab === 'scroll' || tab === 'feed' || tab === 'wins' || tab === 'compare') return 'reels'
  if (tab === 'today') return 'home'
  return 'home'
}

function appTabForShell(id: ShellTab): AppTab {
  switch (id) {
    case 'home':
      return 'today'
    case 'reels':
      return 'scroll'
    case 'messages':
      return 'network'
    case 'profile':
      return 'history'
    case 'search':
      return 'today'
    default:
      return 'today'
  }
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
  children,
}: Props) {
  const active = shellTabForAppTab(tab)
  const showAccountSwitcher = tab === 'network'

  const navBtn = (on: boolean) =>
    on ? 'text-[var(--text)]' : 'text-[var(--muted)]'

  return (
    <div className="max-md:pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-40 -mx-3 mb-3 flex items-center justify-between gap-2 border-b border-white/10 bg-[#0b1118]/95 px-3 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 md:hidden">
        <MobileCreateSheet athlete={athlete} onGo={onGo} />
        <div className="min-w-0 flex-1 text-center">
          {showAccountSwitcher ? (
            <MobileAccountSwitcher user={authUser} athletes={athletes} onGo={onGo} />
          ) : (
            <p className="truncate text-sm font-semibold tracking-tight">shapelab</p>
          )}
        </div>
        <NotifyBell athlete={athlete} settings={settings} onOpen={onGo} variant="ig" />
      </header>

      {children}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-lg items-stretch justify-between gap-0 border-t border-white/10 bg-[#0a1014]/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md md:hidden"
        aria-label="App"
      >
        <button
          type="button"
          aria-label="Home"
          aria-current={active === 'home' ? 'page' : undefined}
          onClick={() => onGo(appTabForShell('home'))}
          className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium ${navBtn(active === 'home')}`}
        >
          <IgHomeIcon className="h-6 w-6" filled={active === 'home'} />
          <span>Home</span>
        </button>
        <button
          type="button"
          aria-label="Passes"
          aria-current={active === 'reels' ? 'page' : undefined}
          onClick={() => onGo(appTabForShell('reels'))}
          className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium ${navBtn(active === 'reels')}`}
        >
          <IgReelsIcon className="h-6 w-6" filled={active === 'reels'} />
          <span>Passes</span>
        </button>
        <button
          type="button"
          aria-label="Messages"
          aria-current={active === 'messages' ? 'page' : undefined}
          onClick={() => onGo(appTabForShell('messages'))}
          className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium ${navBtn(active === 'messages')}`}
        >
          <IgMessagesIcon className="h-6 w-6" filled={active === 'messages'} />
          <span>Messages</span>
        </button>
        <MobileAppSearch
          label="Search"
          athletes={athletes}
          authUser={authUser}
          activeAthleteId={activeAthleteId}
          onGo={onGo}
          onViewProfile={onViewProfile}
        />
        <button
          type="button"
          aria-label="Profile"
          aria-current={active === 'profile' ? 'page' : undefined}
          onClick={() => onGo(appTabForShell('profile'))}
          className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium ${navBtn(active === 'profile')}`}
        >
          {athlete ? (
            <AthleteAvatar
              athlete={athlete}
              size="xs"
              className={`h-6 w-6 ${active === 'profile' ? 'ring-2 ring-[var(--text)]' : 'ring-1 ring-white/20'}`}
            />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs">◎</span>
          )}
          <span>Profile</span>
        </button>
      </nav>
    </div>
  )
}
