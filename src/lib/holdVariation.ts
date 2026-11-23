import type { HomeworkLog } from '../types'

/**
 * Hold variations: the spec a coach picks on the class clock (bent-knee,
 * side support, ...) is a first-class part of the log, not just words in
 * the label. A variation is stored on the log as the spec label the clock
 * shows (e.g. 'Bent-knee', 'Side support'), so display and counting can
 * key on it. The hollow arms toggle is part of the variation too: arms-up
 * hollows are a different hold from arms-down hollows.
 */

/** Canonical spec labels, keyed by their lowercase form as they appear in labels. */
const SPEC_LABELS: Record<string, string> = {
  'bent-knee': 'Bent-knee',
  'bent knee': 'Bent knee',
  tucked: 'Tucked',
  'curl up': 'Curl up',
  'back to wall': 'Back to wall',
  l: 'L',
  piked: 'Piked',
  'bird dogs': 'Bird dogs',
  'on knees': 'On knees',
  'side support': 'Side support',
  'on toes': 'On toes',
  'single leg': 'Single leg',
  'single left': 'Single left',
  'single right': 'Single right',
  'elbows in (triceps)': 'Elbows in (triceps)',
  'wide hands': 'Wide hands',
  'handstand push-ups': 'Handstand push-ups',
  'elevated front foot': 'Elevated front foot',
  'two legs': 'Two legs',
  'add assistance': 'Add assistance',
}

/**
 * Display name for a hold with a variation: the variation leads, then the
 * drill name. 'Side support' stands alone because it IS the hold name,
 * and 'Back to wall' drops the repeated 'Wall' from 'Wall handstand'.
 * No variation returns the base title unchanged.
 */
export function holdVariationDisplayName(
  variation: string | undefined | null,
  baseTitle: string,
): string {
  const v = (variation ?? '').trim()
  if (!v) return baseTitle
  if (v === 'Side support') return 'Side support'
  let base = baseTitle
  if (/arms up/i.test(v)) base = base.replace(/ arms down/i, '').trim()
  const lastWord = v.split(/\s+/).pop()?.toLowerCase() ?? ''
  const firstWord = base.split(/\s+/)[0]?.toLowerCase() ?? ''
  if (lastWord && firstWord && lastWord === firstWord) {
    base = base.split(/\s+/).slice(1).join(' ')
  }
  return base ? `${v} ${base}` : v
}

/** Grouping key: a variation is its own hold type, separate from the plain drill. */
export function variationKeyForLog(
  log: Pick<HomeworkLog, 'shapeId' | 'variation'>,
): string {
  return `${log.shapeId}::${(log.variation ?? '').trim().toLowerCase()}`
}

/**
 * Recover the variation from a stored sourceLabel, for logs written before
 * the variation was stored on the log. The clock builds labels as parts
 * joined by ' · ' (drill, arms, side, spec), with an optional class name
 * in parens on the end. Only exact known spec labels match, so drill
 * names, class names, sides, weights, and heights never match.
 */
export function variationFromSourceLabel(
  sourceLabel: string | undefined | null,
): string | undefined {
  if (!sourceLabel) return undefined
  const parts = sourceLabel
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean)
  let armsUp = false
  let spec: string | undefined
  for (const part of parts) {
    const lower = part.toLowerCase()
    if (lower === 'arms up') {
      armsUp = true
      continue
    }
    if (lower === 'arms down') continue
    for (const [key, label] of Object.entries(SPEC_LABELS)) {
      if (lower === key || lower.startsWith(`${key} (`)) {
        spec = label
        break
      }
    }
    if (spec) break
  }
  if (!spec && !armsUp) return undefined
  if (armsUp && spec) return `Arms up · ${spec}`
  if (armsUp) return 'Arms up'
  return spec
}
