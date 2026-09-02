import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteAvatar } from '../AthleteAvatar'
import {
  liveStories,
  loadStories,
  markStoriesSeen,
  seenStoryIds,
  storiesByAuthor,
  type GymStory,
  type StoriesFile,
} from '../../lib/stories'
import { StoryComposer } from './StoryComposer'
import { StoryViewer } from './StoryViewer'

type Props = {
  athlete: Athlete | null
  athletes: Athlete[]
}

export function StoryRail({ athlete, athletes }: Props) {
  const [file, setFile] = useState<StoriesFile>({ stories: [], highlights: [] })
  const [compose, setCompose] = useState(false)
  const [watch, setWatch] = useState<{ items: GymStory[]; start: number } | null>(null)
  const [seen, setSeen] = useState(() => seenStoryIds())

  const reload = () => {
    void loadStories().then(setFile)
  }

  useEffect(() => {
    reload()
  }, [])

  const live = useMemo(() => liveStories(file), [file])
  const people = useMemo(() => {
    const ids = [...new Set(live.map((s) => s.authorId))]
    return ids
      .map((id) => ({
        person: athletes.find((a) => a.id === id) ?? { id, name: 'Athlete', createdAt: '' },
        stories: live.filter((s) => s.authorId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      }))
      .sort((a, b) => {
        if (athlete && a.person.id === athlete.id) return -1
        if (athlete && b.person.id === athlete.id) return 1
        return (b.stories.at(-1)?.createdAt ?? '').localeCompare(a.stories.at(-1)?.createdAt ?? '')
      })
  }, [athletes, live, athlete])

  const openAuthor = (authorId: string) => {
    const items = storiesByAuthor(file, authorId, true)
    if (items.length === 0) return
    markStoriesSeen(items.map((s) => s.id))
    setSeen(seenStoryIds())
    setWatch({ items, start: 0 })
  }

  const mine = athlete ? people.find((p) => p.person.id === athlete.id) : null
  const mineUnseen = mine?.stories.some((s) => !seen.has(s.id)) ?? false

  return (
    <div className="space-y-2">
      <div className="flex gap-3 overflow-x-auto px-1 py-1">
        {athlete && (
          <button
            type="button"
            onClick={() => (mine ? openAuthor(athlete.id) : setCompose(true))}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <span
              className={`rounded-full p-[2px] ${
                mine
                  ? mineUnseen
                    ? 'bg-gradient-to-tr from-[#f77737] via-[#e1306c] to-[#c13584]'
                    : 'bg-white/25'
                  : 'bg-white/20'
              }`}
            >
              <span className="relative block">
                <AthleteAvatar athlete={athlete} size="lg" />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[#06281f]">
                  +
                </span>
              </span>
            </span>
            <span className="w-full truncate text-center text-[10px] text-white/80">Your story</span>
          </button>
        )}
        {people
          .filter((p) => p.person.id !== athlete?.id)
          .map((p) => {
            const unseen = p.stories.some((s) => !seen.has(s.id))
            return (
              <button
                key={p.person.id}
                type="button"
                onClick={() => openAuthor(p.person.id)}
                className="flex w-16 shrink-0 flex-col items-center gap-1"
              >
                <span
                  className={`rounded-full p-[2px] ${
                    unseen
                      ? 'bg-gradient-to-tr from-[#f77737] via-[#e1306c] to-[#c13584]'
                      : 'bg-white/25'
                  }`}
                >
                  <AthleteAvatar athlete={p.person} size="lg" />
                </span>
                <span className="w-full truncate text-center text-[10px] text-white/80">
                  {p.person.name.split(' ')[0]}
                </span>
              </button>
            )
          })}
        {athlete && (
          <button
            type="button"
            onClick={() => setCompose(true)}
            className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 text-white/70"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-white/40 text-2xl">
              +
            </span>
            <span className="text-[10px]">Add</span>
          </button>
        )}
      </div>
      {compose && athlete && (
        <StoryComposer
          athlete={athlete}
          athletes={athletes}
          onClose={() => setCompose(false)}
          onPosted={() => {
            setCompose(false)
            reload()
          }}
        />
      )}
      {watch && (
        <StoryViewer
          items={watch.items}
          startIndex={watch.start}
          athletes={athletes}
          viewer={athlete}
          highlights={athlete ? file.highlights.filter((h) => h.ownerId === athlete.id) : []}
          onClose={() => setWatch(null)}
          onHighlightSaved={reload}
        />
      )}
    </div>
  )
}
