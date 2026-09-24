import type { SessionRole } from './authSession'
import type { AppTab } from './storage'
import { isRyanOnlyTab } from './storage'

export type AppSection =
  | 'today'
  | 'practice'
  | 'videos'
  | 'learn'
  | 'team'
  | 'more'
  | 'family'
  | 'wellness'
  | 'progress'

export type NavRole = 'admin' | 'coach' | 'athlete' | 'parent' | 'kiosk'

export function navRoleFromSession(
  role: SessionRole | undefined,
  kiosk: boolean,
): NavRole {
  if (kiosk) return 'kiosk'
  if (role === 'parent') return 'parent'
  if (role === 'athlete') return 'athlete'
  if (role === 'coach') return 'coach'
  if (role === 'admin' || role === 'gymOwner') return 'admin'
  return 'coach'
}

export const APP_SECTIONS: { id: AppSection; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'practice', label: 'Practice' },
  { id: 'videos', label: 'Videos' },
  { id: 'learn', label: 'Learn' },
  { id: 'team', label: 'Team' },
  { id: 'more', label: 'More' },
]

const PARENT_SECTIONS: { id: AppSection; label: string }[] = [
  { id: 'today', label: 'Home' },
  { id: 'family', label: 'My Athletes' },
  { id: 'videos', label: 'Videos' },
  { id: 'team', label: 'Team' },
  { id: 'learn', label: 'Learn' },
  { id: 'wellness', label: 'Body care' },
  { id: 'more', label: 'Settings' },
]

const ATHLETE_SECTIONS: { id: AppSection; label: string }[] = [
  { id: 'today', label: 'Home' },
  { id: 'practice', label: 'Practice' },
  { id: 'progress', label: 'Progress' },
  { id: 'videos', label: 'Videos' },
  { id: 'team', label: 'Team' },
  { id: 'learn', label: 'Learn' },
  { id: 'more', label: 'Profile' },
]

const KIOSK_SECTIONS: { id: AppSection; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'practice', label: 'Practice' },
  { id: 'videos', label: 'Replay' },
  { id: 'learn', label: 'Shapes' },
]

export function sectionsForNavRole(role: NavRole): { id: AppSection; label: string }[] {
  if (role === 'parent') return PARENT_SECTIONS
  if (role === 'athlete') return ATHLETE_SECTIONS
  if (role === 'kiosk') return KIOSK_SECTIONS
  return APP_SECTIONS
}

export const SECTION_SUBNAV: Record<AppSection, { id: AppTab; label: string }[]> = {
  today: [{ id: 'today', label: 'Home' }],
  practice: [
    { id: 'tasks2', label: 'Class flows' },
    { id: 'homework', label: 'Homework' },
    { id: 'classclock', label: 'Class clock' },
    { id: 'warmup', label: 'Warm-up' },
    { id: 'tasks', label: 'Hold & body work' },
    { id: 'coach', label: 'Live scoring' },
  ],
  videos: [
    { id: 'compare', label: 'Compare' },
    { id: 'scroll', label: 'Reference scroll' },
    { id: 'feed', label: 'Gym feed' },
    { id: 'wins', label: 'Wins' },
  ],
  learn: [
    { id: 'learn', label: 'Shapes & skills' },
    { id: 'coachlib', label: 'Coach library' },
    { id: 'drills', label: 'Drill library' },
  ],
  team: [
    { id: 'classes', label: 'Classes' },
    { id: 'feed', label: 'Feed' },
    { id: 'wins', label: 'Wins' },
    { id: 'network', label: 'Network' },
  ],
  more: [
    { id: 'history', label: 'Profiles' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'consent', label: 'Consent' },
    { id: 'stills', label: 'Stills' },
    { id: 'watch', label: 'Watch' },
    { id: 'research', label: 'Research' },
    { id: 'about', label: 'About' },
  ],
  family: [{ id: 'history', label: 'My Athletes' }],
  wellness: [{ id: 'wellness', label: 'Body care' }],
  progress: [{ id: 'progress', label: 'Progress' }],
}

export function sectionForTab(tab: AppTab, role: NavRole = 'coach'): AppSection {
  if (role === 'parent' && tab === 'history') return 'family'
  if (role === 'parent' && (tab === 'consent' || tab === 'accounts' || tab === 'about')) return 'more'
  if (role === 'parent' && (tab === 'feed' || tab === 'wins' || tab === 'network')) return 'team'
  if (role === 'parent' && (tab === 'scroll' || tab === 'compare')) return 'videos'
  if (role === 'athlete' && tab === 'history') return 'more'
  if (role === 'athlete' && (tab === 'feed' || tab === 'wins' || tab === 'network')) return 'team'
  if (role === 'athlete' && (tab === 'scroll' || tab === 'compare')) return 'videos'
  switch (tab) {
    case 'today':
      return 'today'
    case 'homework':
    case 'warmup':
    case 'tasks2':
    case 'tasks':
    case 'coach':
      return 'practice'
    case 'compare':
    case 'scroll':
      return 'videos'
    case 'learn':
    case 'coachlib':
    case 'drills':
      return 'learn'
    case 'classes':
    case 'feed':
    case 'wins':
    case 'network':
      return 'team'
    case 'wellness':
      return 'wellness'
    case 'progress':
      return 'progress'
    case 'classclock':
      return 'practice'
    default:
      return 'more'
  }
}

export function isOfficeOnlyTab(tab: AppTab): boolean {
  return tab === 'accounts' || tab === 'consent' || tab === 'research' || tab === 'watch' || tab === 'stills'
}

export function isAdminOnlyTab(tab: AppTab): boolean {
  return tab === 'watch' || tab === 'stills'
}

export function subnavForSection(
  section: AppSection,
  ryan: boolean,
  kiosk = false,
  admin = false,
  role: NavRole = admin ? 'admin' : 'coach',
) {
  const items = SECTION_SUBNAV[section] ?? []
  return items.filter((item) => {
    if (!ryan && isRyanOnlyTab(item.id)) return false
    if (kiosk && isOfficeOnlyTab(item.id)) return false
    if (!admin && isAdminOnlyTab(item.id)) return false
    if (role === 'parent') {
      if (section === 'more') return item.id === 'consent' || item.id === 'accounts' || item.id === 'about'
      if (section === 'learn') return item.id === 'learn'
      if (section === 'videos')
        return item.id === 'scroll' || item.id === 'compare' || item.id === 'feed' || item.id === 'wins'
      if (section === 'team') return item.id === 'network' || item.id === 'feed' || item.id === 'wins'
    }
    if (role === 'athlete') {
      if (section === 'practice')
        return item.id === 'homework' || item.id === 'tasks2' || item.id === 'classclock'
      if (section === 'videos')
        return item.id === 'compare' || item.id === 'scroll' || item.id === 'feed' || item.id === 'wins'
      if (section === 'team') return item.id === 'network' || item.id === 'feed' || item.id === 'wins'
      if (section === 'learn') return item.id === 'learn'
      if (section === 'more') return item.id === 'history' || item.id === 'about'
    }
    if (role === 'kiosk') {
      if (section === 'practice') return item.id === 'homework' || item.id === 'tasks2'
      if (section === 'videos') return item.id === 'compare'
      if (section === 'learn') return item.id === 'learn'
      if (section === 'more') return false
    }
    if (role === 'coach' && (item.id === 'watch' || item.id === 'stills')) return false
    if (item.id === 'classclock' && role !== 'athlete') return false
    return true
  })
}

export function defaultTabForSection(
  section: AppSection,
  ryan: boolean,
  kiosk = false,
  admin = false,
  role: NavRole = admin ? 'admin' : 'coach',
): AppTab {
  return subnavForSection(section, ryan, kiosk, admin, role)[0]?.id ?? 'today'
}

export function tabAllowedForNavRole(tab: AppTab, role: NavRole, ryan: boolean): boolean {
  if (isRyanOnlyTab(tab) && !ryan && role !== 'admin') return false
  if (role === 'kiosk' && isOfficeOnlyTab(tab)) return false
  if (role === 'parent') {
    return (
      tab === 'today' ||
      tab === 'history' ||
      tab === 'learn' ||
      tab === 'wellness' ||
      tab === 'consent' ||
      tab === 'accounts' ||
      tab === 'about' ||
      tab === 'homework' ||
      tab === 'network' ||
      tab === 'scroll' ||
      tab === 'feed' ||
      tab === 'wins' ||
      tab === 'compare'
    )
  }
  if (role === 'athlete') {
    return (
      tab === 'today' ||
      tab === 'homework' ||
      tab === 'tasks2' ||
      tab === 'progress' ||
      tab === 'compare' ||
      tab === 'learn' ||
      tab === 'history' ||
      tab === 'about' ||
      tab === 'wins' ||
      tab === 'classclock' ||
      tab === 'network' ||
      tab === 'scroll' ||
      tab === 'feed'
    )
  }
  if (role === 'kiosk') {
    return tab === 'today' || tab === 'homework' || tab === 'tasks2' || tab === 'compare' || tab === 'learn'
  }
  return true
}
