import { type StudyDef, type StudyField } from '../config/researchStudies'
import type { Observation } from './research'

export type CountRow = {
  value: string
  label: string
  n: number
  pct: number
}

export type NumberSummary = {
  n: number
  min: number
  max: number
  median: number
  mean: number
}

export type Crosstab = {
  title: string
  detail: string
  rowLabel: string
  colLabel: string
  rows: { value: string; label: string }[]
  cols: { value: string; label: string }[]
  cells: number[][]
  rowTotals: number[]
  colTotals: number[]
  n: number
}

export function countChoice(
  observations: Observation[],
  field: StudyField,
): CountRow[] {
  const options = field.options ?? []
  const tallies = new Map<string, number>()
  for (const opt of options) tallies.set(opt.value, 0)
  let n = 0
  for (const obs of observations) {
    const raw = obs.answers[field.id]
    if (typeof raw !== 'string' || !tallies.has(raw)) continue
    tallies.set(raw, (tallies.get(raw) ?? 0) + 1)
    n += 1
  }
  return options.map((opt) => {
    const count = tallies.get(opt.value) ?? 0
    return {
      value: opt.value,
      label: opt.label,
      n: count,
      pct: n === 0 ? 0 : Math.round((count / n) * 100),
    }
  })
}

export function countMulti(
  observations: Observation[],
  field: StudyField,
): { rows: CountRow[]; respondents: number } {
  const options = field.options ?? []
  const tallies = new Map<string, number>()
  for (const opt of options) tallies.set(opt.value, 0)
  let respondents = 0
  for (const obs of observations) {
    const raw = obs.answers[field.id]
    if (!Array.isArray(raw) || raw.length === 0) continue
    respondents += 1
    const seen = new Set<string>()
    for (const v of raw) {
      if (seen.has(v) || !tallies.has(v)) continue
      seen.add(v)
      tallies.set(v, (tallies.get(v) ?? 0) + 1)
    }
  }
  const rows = options.map((opt) => {
    const count = tallies.get(opt.value) ?? 0
    return {
      value: opt.value,
      label: opt.label,
      n: count,
      pct: respondents === 0 ? 0 : Math.round((count / respondents) * 100),
    }
  })
  return { rows, respondents }
}

export function numberValues(observations: Observation[], fieldId: string): number[] {
  const out: number[] = []
  for (const obs of observations) {
    const raw = obs.answers[fieldId]
    if (typeof raw === 'number' && Number.isFinite(raw)) out.push(raw)
  }
  return out
}

export function summarizeNumbers(values: number[]): NumberSummary | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const mid = Math.floor(n / 2)
  const median = n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const mean = sorted.reduce((a, b) => a + b, 0) / n
  return {
    n,
    min: sorted[0],
    max: sorted[n - 1],
    median,
    mean,
  }
}

export function integerHistogram(values: number[]): CountRow[] {
  const tallies = new Map<number, number>()
  for (const v of values) {
    const k = Math.round(v)
    tallies.set(k, (tallies.get(k) ?? 0) + 1)
  }
  const keys = [...tallies.keys()].sort((a, b) => a - b)
  const n = values.length
  return keys.map((k) => {
    const count = tallies.get(k) ?? 0
    return {
      value: String(k),
      label: k === 0 ? 'Floor' : k === 1 ? '1 layer' : `${k} layers`,
      n: count,
      pct: n === 0 ? 0 : Math.round((count / n) * 100),
    }
  })
}

export function majorityLine(rows: CountRow[], empty = 'No observations yet.'): string {
  const total = rows.reduce((a, r) => a + r.n, 0)
  if (total === 0) return empty
  const top = [...rows].sort((a, b) => b.n - a.n)[0]
  if (!top || top.n === 0) return empty
  const tied = rows.filter((r) => r.n === top.n)
  if (tied.length > 1) {
    return `${tied.map((r) => r.label).join(' / ')} tied at ${top.n} of ${total}.`
  }
  return `${top.n} of ${total} ${top.label.toLowerCase()} (${top.pct}%).`
}

export function studyFinding(study: StudyDef, observations: Observation[]): string {
  const n = observations.length
  if (n === 0) return 'No observations yet.'
  if (study.id === 'laterality') {
    const twist = study.fields.find((f) => f.id === 'twistDirection')
    if (twist) return `n = ${n}. ${majorityLine(countChoice(observations, twist))}`
  }
  if (study.id === 'standing-full-mats') {
    const summary = summarizeNumbers(numberValues(observations, 'panelMatLayers'))
    if (!summary) return `n = ${n}.`
    const med =
      Number.isInteger(summary.median) ? String(summary.median) : summary.median.toFixed(1)
    return `n = ${n}. Median ${med} layers when they first got the standing full.`
  }
  if (study.id === 'why-tumble') {
    const reasons = study.fields.find((f) => f.id === 'reasons')
    if (reasons) {
      const { rows, respondents } = countMulti(observations, reasons)
      const top = [...rows].sort((a, b) => b.n - a.n)[0]
      if (top && respondents) {
        return `n = ${respondents}. Most common: ${top.label.toLowerCase()} (${top.n}).`
      }
    }
  }
  if (study.id === 'fear-blocks') {
    const fear = study.fields.find((f) => f.id === 'hasFear')
    if (fear) {
      const rows = countChoice(observations, fear)
      const yes = rows.find((r) => r.value === 'yes')
      const total = rows.reduce((a, r) => a + r.n, 0)
      if (yes && total) {
        return `n = ${total}. ${yes.n} of ${total} have felt fear tumbling (${yes.pct}%).`
      }
    }
  }
  return `n = ${n}.`
}

function answerString(obs: Observation, fieldId: string): string | null {
  const raw = obs.answers[fieldId]
  return typeof raw === 'string' && raw ? raw : null
}

export function crosstab(
  observations: Observation[],
  rowField: StudyField,
  colField: StudyField,
  title: string,
  detail: string,
  opts?: { excludeRow?: string[]; excludeCol?: string[] },
): Crosstab | null {
  const skipRow = new Set(opts?.excludeRow ?? [])
  const skipCol = new Set(opts?.excludeCol ?? [])
  const rows = (rowField.options ?? [])
    .filter((o) => !skipRow.has(o.value))
    .map((o) => ({ value: o.value, label: o.label }))
  const cols = (colField.options ?? [])
    .filter((o) => !skipCol.has(o.value))
    .map((o) => ({ value: o.value, label: o.label }))
  if (!rows.length || !cols.length) return null
  const rowIndex = new Map(rows.map((r, i) => [r.value, i]))
  const colIndex = new Map(cols.map((c, i) => [c.value, i]))
  const cells = rows.map(() => cols.map(() => 0))
  let n = 0
  for (const obs of observations) {
    const r = answerString(obs, rowField.id)
    const c = answerString(obs, colField.id)
    if (!r || !c) continue
    const ri = rowIndex.get(r)
    const ci = colIndex.get(c)
    if (ri === undefined || ci === undefined) continue
    cells[ri][ci] += 1
    n += 1
  }
  if (n === 0) return null
  const rowTotals = cells.map((line) => line.reduce((a, b) => a + b, 0))
  const colTotals = cols.map((_, ci) => cells.reduce((a, line) => a + line[ci], 0))
  return {
    title,
    detail,
    rowLabel: rowField.label,
    colLabel: colField.label,
    rows,
    cols,
    cells,
    rowTotals,
    colTotals,
    n,
  }
}

function field(study: StudyDef, id: string): StudyField | undefined {
  return study.fields.find((f) => f.id === id)
}

/** Join two studies on subjectId so fear can sit next to laterality. */
export function joinBySubject(
  left: Observation[],
  right: Observation[],
): Observation[] {
  const rightBy = new Map(right.map((o) => [o.subjectId, o]))
  const out: Observation[] = []
  for (const a of left) {
    const b = rightBy.get(a.subjectId)
    if (!b) continue
    out.push({
      ...a,
      answers: { ...a.answers, ...b.answers },
    })
  }
  return out
}

export function lateralityCrosstabs(
  laterality: Observation[],
  lateralityStudy: StudyDef,
  fear?: Observation[],
  fearStudy?: StudyDef,
): Crosstab[] {
  const hand = field(lateralityStudy, 'dominantHand')
  const foot = field(lateralityStudy, 'tumbleFrontFoot')
  const twist = field(lateralityStudy, 'twistDirection')
  const skate = field(lateralityStudy, 'skateFrontFoot')
  const doubleFull = field(lateralityStudy, 'doubleFull')
  const triple = field(lateralityStudy, 'triple')
  const tables: (Crosstab | null)[] = []
  if (hand && twist) {
    tables.push(
      crosstab(
        laterality,
        hand,
        twist,
        'Handedness × twist',
        'Do right-hand dominant athletes also twist right?',
      ),
    )
  }
  if (foot && twist) {
    tables.push(
      crosstab(
        laterality,
        foot,
        twist,
        'Tumble front foot × twist',
        'Left foot in front vs right, against twist left vs right.',
      ),
    )
  }
  if (hand && foot) {
    tables.push(
      crosstab(
        laterality,
        hand,
        foot,
        'Handedness × tumble front foot',
        'Whether the dominant hand and the hurdle foot travel together.',
      ),
    )
  }
  if (foot && skate) {
    tables.push(
      crosstab(
        laterality,
        foot,
        skate,
        'Tumble front foot × skate stance',
        'Among people who also skate — does the same foot stay in front?',
      ),
    )
  }
  if (twist && doubleFull) {
    tables.push(
      crosstab(
        laterality,
        twist,
        doubleFull,
        'Twist × double full',
        'Among athletes who have a double full, left vs right against their usual twist.',
        { excludeCol: ['none'] },
      ),
    )
  }
  if (twist && triple) {
    tables.push(
      crosstab(
        laterality,
        twist,
        triple,
        'Twist × triple',
        'Among athletes who have a triple, left vs right against their usual twist.',
        { excludeCol: ['none'] },
      ),
    )
  }
  if (fear && fearStudy && twist) {
    const hasFear = fearStudy.fields.find((f) => f.id === 'hasFear')
    if (hasFear) {
      tables.push(
        crosstab(
          joinBySubject(laterality, fear),
          twist,
          hasFear,
          'Twist × fear',
          'Athletes logged in both laterality and fear — counts only, not a cause.',
        ),
      )
    }
  }
  return tables.filter((t): t is Crosstab => Boolean(t))
}
