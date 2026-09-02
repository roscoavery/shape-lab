import type { Athlete } from '../types'

/** The line that leads their public profile, from the open-shoulder question. */
export function shoulderFirstPost(n?: Athlete['openShoulderHardness']): string | null {
  if (n === 1) return 'Open shoulders is easy..'
  if (n === 5) return 'Open shoulders is hard..'
  if (n === 2 || n === 3 || n === 4) return 'Open shoulders is kinda hard'
  return null
}

export function gymsLine(athlete: Athlete): string | null {
  const raw = athlete.gymName?.trim()
  return raw || null
}

export function cartwheelLine(athlete: Athlete): string | null {
  if (!athlete.cartwheelLeg) return null
  const side = athlete.cartwheelLeg === 'left' ? 'Left' : 'Right'
  return `${side} leg forward on a cartwheel / round-off`
}

export function twistLine(athlete: Athlete): string | null {
  if (!athlete.twistDirection) return null
  if (athlete.twistDirection === 'not_yet') return 'Not twisting yet'
  if (athlete.twistDirection === 'both') {
    const better =
      athlete.twistBetterSide === 'left'
        ? 'left is better'
        : athlete.twistBetterSide === 'right'
          ? 'right is better'
          : null
    return better ? `Twists both ways · ${better}` : 'Twists both ways'
  }
  return athlete.twistDirection === 'left' ? 'Twists left' : 'Twists right'
}

export function handLine(athlete: Athlete): string | null {
  if (!athlete.dominantHand) return null
  if (athlete.dominantHand === 'ambidextrous') return 'Ambidextrous'
  return athlete.dominantHand === 'left' ? 'Left-hand dominant' : 'Right-hand dominant'
}

export function skateLine(athlete: Athlete): string | null {
  if (!athlete.skateStance) return null
  return athlete.skateStance === 'regular'
    ? 'Skate regular (left foot forward)'
    : 'Skate goofy (right foot forward)'
}

export function harderShapeLine(athlete: Athlete): string | null {
  if (!athlete.harderShape) return null
  return athlete.harderShape === 'hollow' ? 'Hollow feels harder' : 'Superman feels harder'
}

export function profileFactLines(athlete: Athlete): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []
  const gyms = gymsLine(athlete)
  if (gyms) rows.push({ label: 'Gyms', value: gyms })
  const cart = cartwheelLine(athlete)
  if (cart) rows.push({ label: 'Round-off', value: cart })
  const twist = twistLine(athlete)
  if (twist) rows.push({ label: 'Twist', value: twist })
  const hand = handLine(athlete)
  if (hand) rows.push({ label: 'Hand', value: hand })
  const skate = skateLine(athlete)
  if (skate) rows.push({ label: 'Skate', value: skate })
  const harder = harderShapeLine(athlete)
  if (harder) rows.push({ label: 'Harder hold', value: harder })
  return rows
}
