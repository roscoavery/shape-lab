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
    { id: 'homework', label: 'Homework' },
    { id: 'warmup', label: 'Warm-up' },
    { id: 'tasks2', label: 'Class flows' },
    { id: 'tasks', label: 'Hold & body work' },
    { id: 'coach', label: 'Live scoring' },
  ],
  videos: [{ id: 'compare', label: 'Compare' }],
  learn: [
    { id: 'learn', label: 'Shapes & skills' },
    { id: 'coachlib', label: 'Coach library' },
    { id: 'drills', label: 'Drill library' },
  ],
  team: [
    { id: 'classes', label: 'Classes' },
    { id: 'feed', label: 'Feed' },
    { id: 'network', label: 'Network' },
  ],
  more: [
    { id: 'history', label: 'Profiles' },
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
      return 'videos'
    case 'learn':
    case 'coachlib':
    case 'drills':
      return 'learn'
    case 'classes':
    case 'feed':
    case 'network':
      return 'team'
    default:
      return 'more'
  }
}

export function subnavForSection(section: AppSection, ryan: boolean) {
  return SECTION_SUBNAV[section].filter((item) => ryan || !isRyanOnlyTab(item.id))
}

export function defaultTabForSection(section: AppSection, ryan: boolean): AppTab {
  return subnavForSection(section, ryan)[0]?.id ?? 'today'
}
