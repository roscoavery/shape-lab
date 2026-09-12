/**
 * Handstand time on this device for the local calendar day.
 * Detection / hold length is unchanged — this only adds the holds up.
 */

const KEY = 'shape-lab.hold-day.v1'

type DayRow = {
  seconds: number
  reports: string[]
}

type DayFile = {
  date: string
  byAthlete: Record<string, DayRow>
}

function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptyFile(): DayFile {
  return { date: todayKey(), byAthlete: {} }
}

function loadFile(): DayFile {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyFile()
    const parsed = JSON.parse(raw) as DayFile
    if (!parsed || parsed.date !== todayKey() || typeof parsed.byAthlete !== 'object') {
      return emptyFile()
    }
    return parsed
  } catch {
    return emptyFile()
  }
}

function saveFile(file: DayFile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(file))
  } catch {
    /* Safari private mode */
  }
}

function athleteKey(athleteId: string | null | undefined): string {
  return athleteId && athleteId !== 'none' ? athleteId : 'none'
}

export function sessionHoldTotal(holds: { holdSeconds: number }[] | null | undefined): number {
  if (!holds?.length) return 0
  return holds.reduce((sum, h) => sum + (Number.isFinite(h.holdSeconds) ? h.holdSeconds : 0), 0)
}

export function todayHoldSeconds(athleteId: string | null | undefined): number {
  return loadFile().byAthlete[athleteKey(athleteId)]?.seconds ?? 0
}

export function recordHoldSession(
  athleteId: string | null | undefined,
  reportId: string,
  seconds: number,
): { session: number; today: number } {
  const session = Math.max(0, seconds)
  const file = loadFile()
  const key = athleteKey(athleteId)
  const row = file.byAthlete[key] ?? { seconds: 0, reports: [] }
  if (reportId && row.reports.includes(reportId)) {
    return { session, today: row.seconds }
  }
  if (reportId) row.reports = [...row.reports, reportId].slice(-80)
  row.seconds += session
  file.byAthlete[key] = row
  saveFile(file)
  return { session, today: row.seconds }
}
