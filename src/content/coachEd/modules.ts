import type { ModuleId, ModuleInfo } from './types'

export const MODULES: ModuleInfo[] = [
  { id: 'fundamentals', title: 'Injury fundamentals', blurb: 'Scope of practice, load, tissues, fractures, and how healing works.' },
  { id: 'library', title: 'Injury library lessons', blurb: 'Region by region lessons, including back, wrist, ankle, and growth plate topics.' },
  { id: 'response', title: 'Injury response', blurb: 'Emergency plan, red flags, concussion, suspected spine injury, and decision scenarios.' },
  { id: 'recovery', title: 'Recovery and return to tumbling', blurb: 'Ranges, return ladders, and talking with families. Educational, not medical.' },
  { id: 'movement', title: 'Movement science', blurb: 'Planes, joint actions, scapula and pelvis, chains, and loading concepts.' },
  { id: 'stretching', title: 'Flexibility and stretching', blurb: 'Why athletes stretch, which methods exist, splits, hypermobility, and warm-up.' },
  { id: 'testing', title: 'Practice and testing', blurb: 'Flashcards, matching, and 13 assessments.' },
]

const byId = new Map(MODULES.map((m) => [m.id, m]))
export function moduleById(id: ModuleId): ModuleInfo | undefined {
  return byId.get(id)
}
