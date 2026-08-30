/**
 * Skills a coach typed during a lesson. Kept on that coach only —
 * other profiles do not see them in the hold picker.
 */

const KEY = 'shape-lab.typedHolds.v1'
const MAX = 24

type File = { kind: 'shape-lab-typed-holds'; byCoach: Record<string, string[]> }

function read(): File {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { kind: 'shape-lab-typed-holds', byCoach: {} }
    const data = JSON.parse(raw) as File
    if (data?.kind !== 'shape-lab-typed-holds' || !data.byCoach) {
      return { kind: 'shape-lab-typed-holds', byCoach: {} }
    }
    return data
  } catch {
    return { kind: 'shape-lab-typed-holds', byCoach: {} }
  }
}

function write(file: File) {
  try {
    localStorage.setItem(KEY, JSON.stringify(file))
  } catch {
    /* quota */
  }
}

export function listTypedHolds(coachId: string | null | undefined): string[] {
  if (!coachId) return []
  return read().byCoach[coachId] ?? []
}

export function rememberTypedHold(coachId: string | null | undefined, label: string) {
  const name = label.trim()
  if (!coachId || !name) return
  const file = read()
  const mine = file.byCoach[coachId] ?? []
  const next = [name, ...mine.filter((x) => x.toLowerCase() !== name.toLowerCase())].slice(0, MAX)
  file.byCoach[coachId] = next
  write(file)
}
