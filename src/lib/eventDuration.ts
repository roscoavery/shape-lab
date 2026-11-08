/**
 * Short plain durations for the morning brief: "30 min", "1 hr",
 * "1 hr 30 min". Returns '' when the length cannot be worked out, so
 * callers simply leave the duration out.
 */
export function formatDurationMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return ''
  const minutes = Math.round(totalMinutes)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

/** Duration between two ISO timestamps, or '' when either is unusable. */
export function formatEventDuration(startAt: string, endAt: string): string {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return ''
  return formatDurationMinutes((end - start) / 60000)
}
