/**
 * Back-care homework rules: auto-add from documented pain, and when
 * 2-minute holds have been logged on three different days.
 */

import type { HomeworkItem, HomeworkLog, InjuryEntry, PainJournalEntry } from '../types'

export function catalogIdsForBackPain(painLevel: number): string[] {
  const ids: string[] = []
  if (painLevel <= 6) ids.push('glute_bridge')
  if (painLevel <= 4) ids.push('back_extension')
  return ids
}

export function latestBackPainLevel(
  injuryLogs: InjuryEntry[],
  painJournal: PainJournalEntry[],
): number | null {
  const backInjuries = injuryLogs.filter((e) => /back/i.test(e.bodyPart))
  const dates = [
    ...backInjuries.map((e) => ({ at: e.date, pain: e.painLevel })),
    ...painJournal.map((e) => ({ at: e.date, pain: e.painLevel })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  return dates[0]?.pain ?? null
}

/** Distinct calendar days with a hold of at least 2 minutes. */
export function twoMinHoldDays(logs: HomeworkLog[]): string[] {
  const days = new Set<string>()
  for (const log of logs) {
    if ((log.totalHoldSeconds ?? 0) >= 120) {
      days.add(log.date.slice(0, 10))
    }
  }
  return [...days]
}

export function shouldEncourageSlowReps(logs: HomeworkLog[]): boolean {
  return twoMinHoldDays(logs).length >= 3
}

export function alreadyHasCatalog(items: HomeworkItem[], catalogId: string): boolean {
  return items.some((item) => item.catalogId === catalogId)
}
