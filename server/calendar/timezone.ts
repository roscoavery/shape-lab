export function dateKeyInTimeZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso))
}

export function eventOverlapsLocalDay(
  startAt: string,
  endAt: string,
  timeZone: string,
  ref: Date = new Date(),
): boolean {
  const day = dateKeyInTimeZone(ref.toISOString(), timeZone)
  const startKey = dateKeyInTimeZone(startAt, timeZone)
  const endKey = dateKeyInTimeZone(endAt, timeZone)
  if (startKey === day || endKey === day) return true
  if (startKey < day && endKey > day) return true
  const startMs = Date.parse(startAt)
  const endMs = Date.parse(endAt)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false
  const refKey = day
  const dayStart = Date.parse(`${refKey}T00:00:00`)
  const dayEnd = Date.parse(`${refKey}T23:59:59.999`)
  return startMs < dayEnd && endMs > dayStart
}
