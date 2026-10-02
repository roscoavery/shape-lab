/**
 * Tumbling Arcade — game registry, Stick It engine, and the kind leaderboard.
 *
 * The arcade lives in the admin section. Games are registered in ARCADE_GAMES;
 * only 'stick-it' is playable for now — the rest of Ryan's list
 * (handstand circle, Coach Levi's dice game, back handspring race,
 * highest back tuck, straightest layout, team stick race) gets added here
 * as he hands over each game's rules.
 *
 * Leaderboard rule (Ryan's call): show the top 3 with ranks and scores.
 * Everyone else appears as names only — no rank numbers, no scores —
 * so nobody sees themselves in last place.
 */

export type ArcadeGameDef = {
  id: string
  name: string
  tagline: string
  playable: boolean
}

export const ARCADE_GAMES: ArcadeGameDef[] = [
  {
    id: 'stick-it',
    name: 'Stick It',
    tagline: 'Take turns. Miss and you earn a letter. Spell S-T-I-C-K and you are out. Last one standing wins.',
    playable: true,
  },
  {
    id: 'distance',
    name: 'Distance Challenge',
    tagline:
      'Jump-back distance showdown. Standing or round-off entry, flat back or handspring landing — furthest wins.',
    playable: true,
  },
  {
    id: 'hold-contest',
    name: 'Hold Contest',
    tagline:
      'Pick a hold, pick the athletes, start the clock. Tap each name as they come down — everyone keeps their own time.',
    playable: true,
  },
  { id: 'handstand-circle', name: 'Handstand circle', tagline: 'Coming soon.', playable: false },
  { id: 'dice-game', name: "Coach Levi's dice game", tagline: 'Coming soon.', playable: false },
  { id: 'bhs-race', name: 'Back handspring race', tagline: 'Coming soon.', playable: false },
  { id: 'highest-tuck', name: 'Highest back tuck', tagline: 'Coming soon.', playable: false },
  { id: 'straightest-layout', name: 'Straightest layout', tagline: 'Coming soon.', playable: false },
  { id: 'team-sticks', name: 'Team stick race', tagline: 'Two teams, one minute, most sticks wins.', playable: true },
]

// ---------------------------------------------------------------------------
// Stick It
// ---------------------------------------------------------------------------

export type StickItSkillId =
  | 'perfect-cartwheel'
  | 'standing-handspring'
  | 'standing-tuck'
  | 'standing-full'
  | 'punch-front'
  | 'roundoff-handspring'
  | 'roundoff-tuck'
  | 'roundoff-hs-tuck'
  | 'layout'
  | 'full'
  | 'double-full'
  | 'kick-full'

export const STICK_IT_SKILLS: { id: StickItSkillId; label: string }[] = [
  { id: 'perfect-cartwheel', label: 'Perfect cartwheel' },
  { id: 'standing-handspring', label: 'Standing handspring' },
  { id: 'standing-tuck', label: 'Standing tuck' },
  { id: 'standing-full', label: 'Standing full' },
  { id: 'punch-front', label: 'Punch front' },
  { id: 'roundoff-handspring', label: 'Round off back handspring' },
  { id: 'roundoff-tuck', label: 'RO tuck' },
  { id: 'roundoff-hs-tuck', label: 'RO handspring tuck' },
  { id: 'layout', label: 'Layout' },
  { id: 'full', label: 'Full' },
  { id: 'double-full', label: 'Double full' },
  { id: 'kick-full', label: 'Kick full' },
]

/** Skills allowed in the team stick race (one minute, most sticks wins). */
export const STICK_RACE_SKILLS: { id: string; label: string }[] = [
  { id: 'standing-handspring', label: 'Standing handspring' },
  { id: 'standing-tuck', label: 'Standing back tuck' },
  { id: 'standing-full', label: 'Standing full' },
  { id: 'perfect-cartwheel', label: 'Perfect cartwheel' },
]

export const STICK_IT_LETTERS = ['S', 'T', 'I', 'C', 'K'] as const

export type StickItPlayer = {
  /** profile athlete id, or `guest:<name>` */
  id: string
  name: string
  athleteId?: string
  letters: number
}

export function stickItPlayerName(p: StickItPlayer): string {
  return p.name
}

/** Players still in the game. */
export function stickItActive(players: StickItPlayer[]): StickItPlayer[] {
  return players.filter((p) => p.letters < STICK_IT_LETTERS.length)
}

export function stickItIsOut(p: StickItPlayer): boolean {
  return p.letters >= STICK_IT_LETTERS.length
}

/** Index of the current player within the active list, wrapping around. */
export function stickItCurrent(players: StickItPlayer[], turn: number): StickItPlayer | null {
  const active = stickItActive(players)
  if (!active.length) return null
  return active[turn % active.length]
}

export function stickItWinner(players: StickItPlayer[]): StickItPlayer | null {
  const active = stickItActive(players)
  return active.length === 1 ? active[0] : null
}

// ---------------------------------------------------------------------------
// Arcade records (localStorage — gym device)
// ---------------------------------------------------------------------------

export type ArcadeRecord = {
  id: string
  gameId: string
  skillLabel?: string
  date: string
  playerNames: string[]
  winnerName: string
  winnerAthleteId?: string
}

const ARCADE_KEY = 'shapelab.arcade.v1'

function readRecords(): ArcadeRecord[] {
  try {
    const raw = localStorage.getItem(ARCADE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function loadArcadeRecords(gameId?: string): ArcadeRecord[] {
  const all = readRecords()
  return gameId ? all.filter((r) => r.gameId === gameId) : all
}

export function saveArcadeRecord(rec: Omit<ArcadeRecord, 'id' | 'date'>): ArcadeRecord {
  const full: ArcadeRecord = {
    ...rec,
    id: `arc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
  }
  const all = readRecords()
  all.unshift(full)
  try {
    localStorage.setItem(ARCADE_KEY, JSON.stringify(all.slice(0, 200)))
  } catch {
    /* storage full — leaderboard just won't persist */
  }
  return full
}

// ---------------------------------------------------------------------------
// Kind leaderboard
// ---------------------------------------------------------------------------

export type LeaderboardEntry = {
  /** stable key: athlete id or guest name */
  key: string
  name: string
  wins: number
}

/** Wins per player across Stick It records. */
export function stickItLeaderboard(): LeaderboardEntry[] {
  const recs = loadArcadeRecords('stick-it')
  const map = new Map<string, LeaderboardEntry>()
  for (const r of recs) {
    const key = r.winnerAthleteId ?? `guest:${r.winnerName.toLowerCase()}`
    const cur = map.get(key)
    if (cur) cur.wins += 1
    else map.set(key, { key, name: r.winnerName, wins: 1 })
  }
  return [...map.values()].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))
}

// ---------------------------------------------------------------------------
// Distance Challenge
// ---------------------------------------------------------------------------

export type DistanceEventId =
  | 'standing-flat-back'
  | 'roundoff-flat-back'
  | 'standing-handspring'
  | 'roundoff-handspring'

export const DISTANCE_EVENTS: { id: DistanceEventId; label: string; hint: string }[] = [
  {
    id: 'standing-flat-back',
    label: 'Standing flat back',
    hint: 'Standing jump back, land on your back in a hollow, straight, or arch shape.',
  },
  {
    id: 'roundoff-flat-back',
    label: 'Round off flat back',
    hint: 'Round off into the jump back, land on your back.',
  },
  {
    id: 'standing-handspring',
    label: 'Standing handspring',
    hint: 'Standing back handspring for distance.',
  },
  {
    id: 'roundoff-handspring',
    label: 'Round off back handspring',
    hint: 'Round off, back handspring for distance.',
  },
]

/**
 * Scoring modes.
 * - raw: furthest distance wins.
 * - body-lengths: distance divided by the athlete's body length — a shorter
 *   athlete needs fewer absolute inches to score the same.
 * - beat-best: biggest percent improvement over the athlete's own personal
 *   best wins. Height cannot help you beat yourself — the fair mode when
 *   athletes of very different sizes play together.
 */
export type DistanceMode = 'raw' | 'body-lengths' | 'beat-best'

export const DISTANCE_MODES: { id: DistanceMode; label: string; blurb: string }[] = [
  { id: 'raw', label: 'Furthest wins', blurb: 'Longest jump takes it. No adjustments.' },
  {
    id: 'body-lengths',
    label: 'Body lengths',
    blurb: 'Distance ÷ body length. Shorter athletes need fewer inches to match.',
  },
  {
    id: 'beat-best',
    label: 'Beat your best',
    blurb: 'Biggest improvement over your own best wins. The fair one.',
  },
]

export type DistancePlayer = {
  /** profile athlete id, or `guest:<name>` */
  id: string
  name: string
  athleteId?: string
  /** body length in inches, measured lying down head to toe */
  bodyLengthIn: number | null
  /** attempts in inches, best counts */
  attemptsIn: number[]
}

const DISTANCE_STORE_KEY = 'shapelab.arcade.distance.v1'

type DistanceStore = {
  /** playerId -> body length in inches */
  bodyLengths: Record<string, number>
  /** `${eventId}::${playerId}` -> personal best in inches */
  bests: Record<string, number>
}

function readDistanceStore(): DistanceStore {
  try {
    const raw = localStorage.getItem(DISTANCE_STORE_KEY)
    if (!raw) return { bodyLengths: {}, bests: {} }
    const p = JSON.parse(raw) as Partial<DistanceStore>
    return {
      bodyLengths: p.bodyLengths && typeof p.bodyLengths === 'object' ? p.bodyLengths : {},
      bests: p.bests && typeof p.bests === 'object' ? p.bests : {},
    }
  } catch {
    return { bodyLengths: {}, bests: {} }
  }
}

function writeDistanceStore(s: DistanceStore): void {
  try {
    localStorage.setItem(DISTANCE_STORE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function getBodyLengthIn(playerId: string): number | null {
  const v = readDistanceStore().bodyLengths[playerId]
  return typeof v === 'number' && v > 0 ? v : null
}

export function setBodyLengthIn(playerId: string, inches: number): void {
  const s = readDistanceStore()
  s.bodyLengths[playerId] = inches
  writeDistanceStore(s)
}

export function getDistanceBest(eventId: DistanceEventId, playerId: string): number | null {
  const v = readDistanceStore().bests[`${eventId}::${playerId}`]
  return typeof v === 'number' && v > 0 ? v : null
}

export function recordDistanceBest(eventId: DistanceEventId, playerId: string, inches: number): void {
  const s = readDistanceStore()
  const k = `${eventId}::${playerId}`
  s.bests[k] = Math.max(s.bests[k] ?? 0, inches)
  writeDistanceStore(s)
}

export function distanceBestIn(p: DistancePlayer): number | null {
  if (!p.attemptsIn.length) return null
  return Math.max(...p.attemptsIn)
}

export type DistanceScore = {
  playerId: string
  /** higher wins */
  score: number
  display: string
  /** beat-best only: no prior best, so this game sets the baseline */
  isBaseline?: boolean
}

/** Score every player under the chosen mode. Returns sorted best-first. */
export function scoreDistance(
  eventId: DistanceEventId,
  mode: DistanceMode,
  players: DistancePlayer[],
): DistanceScore[] {
  const out: DistanceScore[] = []
  for (const p of players) {
    const best = distanceBestIn(p)
    if (best == null) continue
    if (mode === 'raw') {
      out.push({ playerId: p.id, score: best, display: formatInches(best) })
    } else if (mode === 'body-lengths') {
      if (p.bodyLengthIn == null || p.bodyLengthIn <= 0) continue
      const mult = best / p.bodyLengthIn
      out.push({ playerId: p.id, score: mult, display: `${mult.toFixed(2)}× body` })
    } else {
      const prior = getDistanceBest(eventId, p.id)
      if (prior == null || prior <= 0) {
        out.push({ playerId: p.id, score: 0, display: `${formatInches(best)} · new baseline`, isBaseline: true })
      } else {
        const imp = (best - prior) / prior
        const pct = imp * 100
        out.push({
          playerId: p.id,
          score: imp,
          display: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% (best ${formatInches(prior)})`,
        })
      }
    }
  }
  return out.sort((a, b) => b.score - a.score)
}

export function formatInches(inches: number): string {
  const ft = Math.floor(inches / 12)
  const rem = Math.round(inches - ft * 12)
  if (ft <= 0) return `${rem} in`
  return rem === 0 ? `${ft} ft` : `${ft} ft ${rem} in`
}

/** Wins per player across Distance Challenge records. */
export function distanceLeaderboard(): LeaderboardEntry[] {
  const recs = loadArcadeRecords('distance')
  const map = new Map<string, LeaderboardEntry>()
  for (const r of recs) {
    const key = r.winnerAthleteId ?? `guest:${r.winnerName.toLowerCase()}`
    const cur = map.get(key)
    if (cur) cur.wins += 1
    else map.set(key, { key, name: r.winnerName, wins: 1 })
  }
  return [...map.values()].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))
}
