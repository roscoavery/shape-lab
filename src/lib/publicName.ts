import type { Athlete } from '../types'

type Person = Pick<Athlete, 'firstName' | 'lastName' | 'name'> | {
  firstName?: string
  lastName?: string
  name?: string
}

function firstNameOf(person: Person | null | undefined): string {
  if (!person) return 'Gymnast'
  const first = (person.firstName || '').trim()
  if (first) return first
  return (person.name || '').trim().split(/\s+/).filter(Boolean)[0] || 'Gymnast'
}

function lastNameOf(person: Person | null | undefined): string {
  if (!person) return ''
  const last = (person.lastName || '').trim()
  if (last) return last
  const parts = (person.name || '').trim().split(/\s+/).filter(Boolean)
  return parts.length > 1 ? parts.slice(1).join(' ') : ''
}

/** First name + last initial for public feeds. Full legal names stay on private profiles. */
export function publicFeedName(person: Person | null | undefined): string {
  const first = firstNameOf(person)
  const initial = lastNameOf(person).replace(/[^A-Za-z]/g, '').charAt(0)
  return initial ? `${first} ${initial.toUpperCase()}.` : first
}
