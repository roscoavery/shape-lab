import type { AppTab } from './storage'
import { isRyanOnlyTab } from './storage'

export type AppSection = 'today' | 'practice' | 'videos' | 'learn' | 'team' | 'more'

export const APP_SECTIONS: { id: AppSection; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'practice', label: 'Practice' },
  { id: 'videos', label: 'Videos' },
  { id: 'learn', label: 'Learn' },
  { id: 'team', label: 'Team' },
  { id: 'more', label: 'More' },
]

export const SECTION_SUBNAV: Record<AppSection, { id: AppTab; label: string }[]> = {
  today: [{ id: 'today', label: 'Home' }],
  practice: [
    { id: 'tasks2', label: 'Class flows' },
    { id: 'homework', label: 'Homework' },
    { id: 'warmup', label: 'Warm-up' },
    { id: 'tasks', label: 'Hold & body work' },
    { id: 'coach', label: 'Live scoring' },
  ],
  videos: [
    { id: 'compare', label: 'Compare' },
    { id: 'scroll', label: 'Reference scroll' },
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
    { id: 'watch', label: 'Watch' },
    { id: 'research', label: 'Research' },
    { id: 'about', label: 'About' },
  ],
}

export function sectionForTab(tab: AppTab): AppSection {
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
    default:
      return 'more'
  }
}

export function isOfficeOnlyTab(tab: AppTab): boolean {
  return tab === 'accounts' || tab === 'consent' || tab === 'research' || tab === 'watch'
}

export function isAdminOnlyTab(tab: AppTab): boolean {
  return tab === 'watch'
}

export function subnavForSection(
  section: AppSection,
  ryan: boolean,
  kiosk = false,
  admin = false,
) {
  return SECTION_SUBNAV[section].filter((item) => {
    if (!ryan && isRyanOnlyTab(item.id)) return false
    if (kiosk && isOfficeOnlyTab(item.id)) return false
    if (!admin && isAdminOnlyTab(item.id)) return false
    return true
  })
}

export function defaultTabForSection(
  section: AppSection,
  ryan: boolean,
  kiosk = false,
  admin = false,
): AppTab {
  return subnavForSection(section, ryan, kiosk, admin)[0]?.id ?? 'today'
}
