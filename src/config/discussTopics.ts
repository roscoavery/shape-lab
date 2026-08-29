/**
 * Coach-lounge philosophy tags. Used to group threads and to count
 * what coaches argue about for research.
 */

export type DiscussTopic = {
  id: string
  name: string
  blurb: string
}

export const DISCUSS_TOPICS: DiscussTopic[] = [
  {
    id: 'ro-bhs',
    name: 'Round-off to back handspring',
    blurb: 'Arms, turnover, feet in front, and what the connection is for.',
  },
  {
    id: 'tuck-layout',
    name: 'Tuck vs layout',
    blurb: 'When to stay long, when to pull, and what the set actually bought.',
  },
  {
    id: 'set-snap',
    name: 'Set and snap-down',
    blurb: 'Where flip comes from on takeoff, and what the arms are doing.',
  },
  {
    id: 'twist',
    name: 'Twisting',
    blurb: 'When the twist starts, both ways, and how it sits on the flip.',
  },
  {
    id: 'power',
    name: 'Run, hurdle, and power',
    blurb: 'How much speed, how they use it, and what “more power” actually means.',
  },
  {
    id: 'standing',
    name: 'Standing tumbling',
    blurb: 'Standing tucks and fulls, mats, and what changes without a run.',
  },
  {
    id: 'fear',
    name: 'Fear and blocks',
    blurb: 'How coaches talk about hesitation without turning it into a diagnosis.',
  },
  {
    id: 'physics',
    name: 'Physics in the gym',
    blurb: 'Inertia, angular momentum, moment of inertia — in tumbling words.',
  },
  {
    id: 'other',
    name: 'Other philosophy',
    blurb: 'Anything that does not sit cleanly in the tags above.',
  },
]

export function discussTopicById(id: string): DiscussTopic | undefined {
  return DISCUSS_TOPICS.find((t) => t.id === id)
}
