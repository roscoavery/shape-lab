/**
 * Parent wellness Q&A sourced from NutritionFacts.org / Dr. Michael Greger.
 * Each answer cites a public page or video. Not medical advice.
 */

export type NutritionFactCard = {
  id: string
  question: string
  tags: string[]
  answer: string
  sourceLabel: string
  sourceUrl: string
}

export const NUTRITIONFACTS_HOME = 'https://nutritionfacts.org/'
export const NUTRITIONFACTS_SEARCH = 'https://nutritionfacts.org/?s='
export const GREGER_VIDEOS = 'https://nutritionfacts.org/videos/'
export const GREGER_YOUTUBE = 'https://www.youtube.com/@NutritionFactsOrg'

export const NUTRITION_FACT_CARDS: NutritionFactCard[] = [
  {
    id: 'protein',
    question: 'How much protein do we actually need?',
    tags: ['protein', 'kids', 'athletes', 'strength'],
    answer:
      'Most people in wealthy countries already get more protein than they need. Extra protein powder is not a shortcut to recovery. Whole-food sources cover typical training if calories and variety are there.',
    sourceLabel: 'NutritionFacts.org · Protein',
    sourceUrl: 'https://nutritionfacts.org/topics/protein/',
  },
  {
    id: 'dairy',
    question: 'Does dairy help bones or recovery?',
    tags: ['dairy', 'milk', 'bones', 'calcium'],
    answer:
      'Dairy is not required for bone health. Calcium and protein are available from other foods. If dairy bothers digestion or mucus, dropping it is a reasonable experiment — food is not a moral test.',
    sourceLabel: 'NutritionFacts.org · Dairy',
    sourceUrl: 'https://nutritionfacts.org/topics/dairy/',
  },
  {
    id: 'sugar',
    question: 'What about sugar and energy for class?',
    tags: ['sugar', 'snacks', 'energy', 'kids'],
    answer:
      'Added sugar is a quick bump, then a crash. Fruit, and a meal with fiber and protein before class, holds energy more evenly than candy or sports drinks for most recreational training.',
    sourceLabel: 'NutritionFacts.org · Added sugar',
    sourceUrl: 'https://nutritionfacts.org/topics/added-sugar/',
  },
  {
    id: 'inflammation',
    question: 'Can food help with aches and inflammation?',
    tags: ['inflammation', 'pain', 'recovery', 'diet'],
    answer:
      'A pattern of vegetables, fruits, legumes, and spices like turmeric is the evidence-based anti-inflammatory pattern Greger covers — not a single “superfood.” Food does not replace a diagnosis when pain is new, severe, or lasting.',
    sourceLabel: 'NutritionFacts.org · Inflammation',
    sourceUrl: 'https://nutritionfacts.org/topics/inflammation/',
  },
  {
    id: 'sleep',
    question: 'Does food affect sleep and next-day training?',
    tags: ['sleep', 'recovery', 'caffeine'],
    answer:
      'Caffeine late in the day and heavy late meals both show up in sleep research. Sleep is one of the strongest recovery tools you can actually control at home.',
    sourceLabel: 'NutritionFacts.org · Sleep',
    sourceUrl: 'https://nutritionfacts.org/topics/sleep/',
  },
  {
    id: 'hydration',
    question: 'Do they need sports drinks?',
    tags: ['water', 'hydration', 'electrolytes'],
    answer:
      'For most class-length sessions, water is enough. Sports drinks are built for long, heavy sweat losses — not a 60-minute gym class. Fruit and a normal meal replace what a drink is selling.',
    sourceLabel: 'NutritionFacts.org · Hydration',
    sourceUrl: 'https://nutritionfacts.org/topics/hydration/',
  },
  {
    id: 'kids-snacks',
    question: 'What should they eat around practice?',
    tags: ['kids', 'snacks', 'practice', 'before class'],
    answer:
      'A familiar meal they digest well beats a new “performance” snack. Fruit, oats, beans, and leftovers from dinner show up often in whole-food guidance. Watch what actually sits well in their stomach on class days — that belongs in the pain/recovery journal too.',
    sourceLabel: 'NutritionFacts.org · Children',
    sourceUrl: 'https://nutritionfacts.org/topics/children/',
  },
]

export function searchNutritionFacts(query: string): NutritionFactCard[] {
  const q = query.trim().toLowerCase()
  if (!q) return NUTRITION_FACT_CARDS
  const words = q.split(/\s+/).filter(Boolean)
  return NUTRITION_FACT_CARDS.filter((card) => {
    const hay = `${card.question} ${card.answer} ${card.tags.join(' ')}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}
