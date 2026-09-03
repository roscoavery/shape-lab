/**
 * Who belongs on a coach’s Today desk vs the whole network.
 * Camp / clinic groups stay off the main gym list unless you open that event
 * or search All / another gym.
 */

import { TUMBLE_SMART, normalizeGymName, sameGym, withDefaultGym } from '../config/gyms'
import type { Athlete } from '../types'
import { isCoachProfile, profileRole, roleLabel } from './profileRole'
import { worksWithCoachIds } from './coachLink'
import { loadOfferings } from './coachClasses'
import { lessonAthleteIds, sessionsForCoach } from './lessonStore'
import { listTrainingEvents, type TrainingEvent } from './trainingEvents'

export { TUMBLE_SMART, normalizeGymName, sameGym, withDefaultGym }

export function homeGym(athlete: Pick<Athlete, 'gymName'> | null | undefined): string {
  return normalizeGymName(athlete?.gymName)
}

export function viewerHomeGym(viewer: Athlete | null | undefined): string {
  return homeGym(viewer)
}

export function classGymsOf(athlete: Athlete): string[] {
  const extra = (athlete.classGyms ?? []).map(normalizeGymName)
  return [...new Set([homeGym(athlete), ...extra])]
}

export function trainsAtGym(athlete: Athlete, gym: string): boolean {
  return classGymsOf(athlete).some((g) => sameGym(g, gym))
}

export function athleteMatchesQuery(athlete: Athlete, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    athlete.name.toLowerCase().includes(q) ||
    (athlete.firstName ?? '').toLowerCase().includes(q) ||
    (athlete.lastName ?? '').toLowerCase().includes(q) ||
    roleLabel(athlete).toLowerCase().includes(q) ||
    homeGym(athlete).toLowerCase().includes(q) ||
    classGymsOf(athlete).some((g) => g.toLowerCase().includes(q))
  )
}

export function onCoachClassRoster(athleteId: string, coachId: string): boolean {
  return loadOfferings().some((offering) => {
    const coaches = new Set([offering.coachId, ...(offering.coachIds ?? [])])
    return coaches.has(coachId) && offering.rosterIds.includes(athleteId)
  })
}

export function hasLessonWithCoach(athleteId: string, coachId: string): boolean {
  return sessionsForCoach(coachId).some((session) => lessonAthleteIds(session).includes(athleteId))
}

/** Main Today list: this gym + privates / class roster / lessons. Not camp-only. */
export function isOnTodayDesk(viewer: Athlete, athlete: Athlete): boolean {
  if (athlete.id === viewer.id) return false
  if (profileRole(athlete) === 'parent') return false
  const gym = viewerHomeGym(viewer)
  if (trainsAtGym(athlete, gym)) return true
  if (isCoachProfile(athlete) && sameGym(athlete.gymName, gym)) return true
  if (worksWithCoachIds(athlete).includes(viewer.id)) return true
  if (onCoachClassRoster(athlete.id, viewer.id)) return true
  if (hasLessonWithCoach(athlete.id, viewer.id)) return true
  return false
}

export type GymScope =
  | { kind: 'desk' }
  | { kind: 'all' }
  | { kind: 'gym'; gym: string }
  | { kind: 'event'; eventId: string }

export function listKnownGyms(athletes: Athlete[]): string[] {
  const names = new Set<string>([TUMBLE_SMART])
  for (const a of athletes) {
    for (const g of classGymsOf(a)) names.add(g)
  }
  const ordered = [...names].sort((a, b) => a.localeCompare(b))
  return ordered.sort((a, b) => {
    if (sameGym(a, TUMBLE_SMART)) return -1
    if (sameGym(b, TUMBLE_SMART)) return 1
    return a.localeCompare(b)
  })
}

export function otherGymLabel(athlete: Athlete, viewerGym: string): string | null {
  const gym = homeGym(athlete)
  if (sameGym(gym, viewerGym)) return null
  return gym
}

/** Mark that they take class at another gym without moving their home gym. */
export function withClassGym(athlete: Athlete, gym: string): Athlete {
  const home = homeGym(athlete)
  const extraGym = normalizeGymName(gym)
  if (sameGym(home, extraGym)) return { ...athlete, gymName: home }
  const extra = [...new Set([...(athlete.classGyms ?? []).map(normalizeGymName), extraGym])].filter(
    (name) => !sameGym(name, home),
  )
  return { ...athlete, gymName: home, classGyms: extra }
}

export function withEventMembership(athlete: Athlete, eventId: string, on: boolean): Athlete {
  const ids = new Set(athlete.eventIds ?? [])
  if (on) ids.add(eventId)
  else ids.delete(eventId)
  return { ...athlete, eventIds: [...ids] }
}

export function scopeAthletes(
  athletes: Athlete[],
  viewer: Athlete | null,
  scope: GymScope,
  events: TrainingEvent[] = listTrainingEvents(),
): Athlete[] {
  const pool = athletes.filter((a) => profileRole(a) !== 'parent' || !viewer)
  if (!viewer || !isCoachProfile(viewer)) {
    return [...pool].sort((a, b) => a.name.localeCompare(b.name))
  }
  const gym = viewerHomeGym(viewer)
  let list: Athlete[]
  if (scope.kind === 'desk') {
    list = pool.filter((a) => isOnTodayDesk(viewer, a))
  } else if (scope.kind === 'all') {
    list = pool.filter((a) => a.id !== viewer.id)
  } else if (scope.kind === 'gym') {
    list = pool.filter((a) => a.id !== viewer.id && trainsAtGym(a, scope.gym))
  } else {
    const event = events.find((e) => e.id === scope.eventId)
    const ids = new Set(event?.athleteIds ?? [])
    list = pool.filter((a) => ids.has(a.id))
  }
  return list.sort((a, b) => {
    const ao = otherGymLabel(a, gym) ? 1 : 0
    const bo = otherGymLabel(b, gym) ? 1 : 0
    if (ao !== bo) return ao - bo
    return a.name.localeCompare(b.name)
  })
}
