import type { Athlete } from '../types'

/** The line that leads their public profile, from the open-shoulder question. */
export function shoulderFirstPost(n?: Athlete['openShoulderHardness']): string | null {
  if (n === 1) return 'Open shoulders is easy..'
  if (n === 5) return 'Open shoulders is hard..'
  if (n === 2 || n === 3 || n === 4) return 'Open shoulders is kinda hard'
  return null
}

export function gymsLine(athlete: Athlete): string | null {
  const home = athlete.gymName?.trim()
  const extras = (athlete.classGyms ?? []).map((g) => g.trim()).filter(Boolean)
  if (!home && extras.length === 0) return null
  if (extras.length === 0) return home || null
  if (!home) return `Classes at ${extras.join(', ')}`
  return `${home} · class at ${extras.join(', ')}`
}

export function cartwheelLine(athlete: Athlete): string | null {
  if (!athlete.cartwheelLeg) return null
  return athlete.cartwheelLeg === 'left' ? 'L' : 'R'
}

export function twistLine(athlete: Athlete): string | null {
  if (!athlete.twistDirection) return null
  if (athlete.twistDirection === 'not_yet') return '—'
  if (athlete.twistDirection === 'both') {
    const better =
      athlete.twistBetterSide === 'left' ? 'L' : athlete.twistBetterSide === 'right' ? 'R' : null
    return better ? `Both · ${better}` : 'Both'
  }
  return athlete.twistDirection === 'left' ? 'L' : 'R'
}

export function twistBetterSide(athlete: Athlete): 'left' | 'right' | null {
  if (athlete.twistDirection === 'left' || athlete.twistBetterSide === 'left') return 'left'
  if (athlete.twistDirection === 'right' || athlete.twistBetterSide === 'right') return 'right'
  return null
}

export function handLine(athlete: Athlete): string | null {
  if (!athlete.dominantHand) return null
  if (athlete.dominantHand === 'ambidextrous') return 'Both'
  return athlete.dominantHand === 'left' ? 'L' : 'R'
}

export function skateLine(athlete: Athlete): string | null {
  if (!athlete.skateStance) return null
  return athlete.skateStance === 'regular' ? 'Reg' : 'Goofy'
}

export function harderShapeLine(athlete: Athlete): string | null {
  if (!athlete.harderShape) return null
  return athlete.harderShape === 'hollow'
    ? 'Hollow is harder than Superman'
    : 'Superman feels harder than hollow'
}

export type ProfileFact = { label: string; value: string; hot?: boolean }

export function profileFactLines(athlete: Athlete): ProfileFact[] {
  const rows: ProfileFact[] = []
  const gyms = gymsLine(athlete)
  if (gyms) rows.push({ label: 'Gym', value: gyms })
  const cart = cartwheelLine(athlete)
  if (cart) rows.push({ label: 'RO', value: cart })
  const twist = twistLine(athlete)
  if (twist) {
    rows.push({
      label: 'Twist',
      value: twist,
      hot: Boolean(twistBetterSide(athlete) || athlete.twistDirection === 'left' || athlete.twistDirection === 'right'),
    })
  }
  const hand = handLine(athlete)
  if (hand) rows.push({ label: 'Hand', value: hand })
  const skate = skateLine(athlete)
  if (skate) rows.push({ label: 'Skate', value: skate })
  return rows
}
