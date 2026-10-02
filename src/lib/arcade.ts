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
  { id: 'handstand-circle', name: 'Handstand circle', tagline: 'Coming soon.', playable: false },
  { id: 'dice-game', name: "Coach Levi's dice game", tagline: 'Coming soon.', playable: false },
  { id: 'bhs-race', name: 'Back handspring race', tagline: 'Coming soon.', playable: false },
  { id: 'highest-tuck', name: 'Highest back tuck', tagline: 'Coming soon.', playable: false },
  { id: 'straightest-layout', name: 'Straightest layout', tagline: 'Coming soon.', playable: false },
  { id: 'team-sticks', name: 'Team stick race', tagline: 'Two teams, one minute, most sticks wins. Coming soon.', playable: false },
]

// ---------------------------------------------------------------------------
// Stick It
// ---------------------------------------------------------------------------

export type StickItSkillId =
  | 'perfect-cartwheel'
  | 'standing-handspring'
  | 'standing-tuck'
  | 'standing-full'

export const STICK_IT_SKILLS: { id: StickItSkillId; label: string }[] = [
  { id: 'perfect-cartwheel', label: 'Perfect cartwheel' },
  { id: 'standing-handspring', label: 'Standing handspring' },
  { id: 'standing-tuck', label: 'Standing tuck' },
  { id: 'standing-full', label: 'Standing full' },
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
