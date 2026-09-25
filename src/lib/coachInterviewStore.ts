/**
 * Coach interview answers — pull/push Ryan's own words for the Parent Guide.
 */

export type CoachInterviewAnswers = Record<string, string>

export async function pullCoachInterview(): Promise<CoachInterviewAnswers> {
  try {
    const res = await fetch('/api/coach-interview')
    if (!res.ok) return {}
    const data = await res.json()
    if (!data || typeof data.answers !== 'object') return {}
    return data.answers as CoachInterviewAnswers
  } catch {
    return {}
  }
}

export async function pushCoachInterview(answers: CoachInterviewAnswers): Promise<boolean> {
  try {
    const res = await fetch('/api/coach-interview', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'shape-lab-coach-interview',
        version: 1,
        answers,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
