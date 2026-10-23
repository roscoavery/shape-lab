import { useEffect, useState } from 'react'
import { loadAllLessons } from '../../content/coachEd/registry'
import type { Lesson } from '../../content/coachEd/types'

export function useLessons(): Lesson[] | null {
  const [lessons, setLessons] = useState<Lesson[] | null>(null)
  useEffect(() => {
    let live = true
    void loadAllLessons().then((l) => {
      if (live) setLessons(l)
    })
    return () => {
      live = false
    }
  }, [])
  return lessons
}

