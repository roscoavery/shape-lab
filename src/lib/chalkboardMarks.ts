export type ChalkboardMarkId =
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-ne'
  | 'arrow-nw'
  | 'circle'
  | 'target'

export const CHALKBOARD_MARKS: { id: ChalkboardMarkId; name: string }[] = [
  { id: 'arrow-up', name: 'Up' },
  { id: 'arrow-down', name: 'Down' },
  { id: 'arrow-left', name: 'Left' },
  { id: 'arrow-right', name: 'Right' },
  { id: 'arrow-ne', name: 'Up right' },
  { id: 'arrow-nw', name: 'Up left' },
  { id: 'circle', name: 'Circle' },
  { id: 'target', name: 'Target' },
]

export function isChalkboardMark(label: string): label is ChalkboardMarkId {
  return CHALKBOARD_MARKS.some((m) => m.id === label)
}
