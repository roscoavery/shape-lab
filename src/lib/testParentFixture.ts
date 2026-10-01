/**
 * In-memory test fixtures for the admin "Test parent" desk preview.
 * Nothing here is saved to disk or the roster — it only exists while the
 * preview is active, so Ryan can see parent-facing features without linking
 * a real athlete to his own profile.
 */
import type { Athlete, HomeworkItem, HomeworkLog } from '../types'

export const TEST_PARENT_ID = 'test-parent-preview'
export const TEST_ATHLETE_ID = 'test-athlete-preview'

export function isTestParentPreview(id: string | null | undefined): boolean {
  return id === TEST_PARENT_ID
}

export function isTestAthletePreview(id: string | null | undefined): boolean {
  return id === TEST_ATHLETE_ID
}

export const TEST_PARENT: Athlete = {
  id: TEST_PARENT_ID,
  name: 'Test Parent',
  firstName: 'Test',
  createdAt: '2026-10-01T00:00:00.000Z',
  role: 'parent',
  linkedAthleteIds: [TEST_ATHLETE_ID],
}

export const TEST_ATHLETE: Athlete = {
  id: TEST_ATHLETE_ID,
  name: 'Alex (test athlete)',
  firstName: 'Alex',
  createdAt: '2026-10-01T00:00:00.000Z',
  role: 'athlete',
  skillGoals: [
    {
      id: 'tg1',
      label: 'Handstand hold',
      setAt: '2026-08-15T00:00:00.000Z',
      source: 'coach',
      pathDone: ['line'],
    },
  ],
}

export const TEST_HOMEWORK: HomeworkItem[] = [
  {
    id: 'th1',
    athleteId: TEST_ATHLETE_ID,
    shapeId: 'handstand',
    customLabel: 'Handstand shaping drill',
    source: 'coach',
    createdAt: '2026-08-20T00:00:00.000Z',
  },
]

export const TEST_LOGS: HomeworkLog[] = [
  '2026-09-02',
  '2026-09-09',
  '2026-09-16',
  '2026-09-23',
  '2026-09-30',
].map((d, i) => ({
  id: `tl${i}`,
  athleteId: TEST_ATHLETE_ID,
  homeworkId: 'th1',
  shapeId: 'handstand',
  date: `${d}T17:00:00.000Z`,
  totalHoldSeconds: 20 + i * 2,
  score: 72 + i,
}))
