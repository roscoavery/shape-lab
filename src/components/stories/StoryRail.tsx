import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { AthleteAvatar } from '../AthleteAvatar'
import {
  highlightStories,
  liveStories,
  loadStories,
  markStoriesSeen,
  saveHighlight,
  seenStoryIds,
  storiesByAuthor,
  type GymStory,
  type StoriesFile,
  type StoryHighlight,
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
  const [pickHighlight, setPickHighlight] = useState(false)
  const [watch, setWatch] = useState<{ items: GymStory[]; start: number; highlight?: StoryHighlight } | null>(
    null,
  )
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

  const highlights = athlete
    ? file.highlights.filter((h) => h.ownerId === athlete.id)
    : file.highlights.slice(0, 8)

  const openAuthor = (authorId: string) => {
    const items = storiesByAuthor(file, authorId, true)
    if (items.length === 0) return
    markStoriesSeen(items.map((s) => s.id))
    setSeen(seenStoryIds())
    setWatch({ items, start: 0 })
  }

  const openHighlight = (h: StoryHighlight) => {
    const items = highlightStories(file, h)
    if (items.length === 0) return
    setWatch({ items, start: 0, highlight: h })
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
        {athlete && live.length > 0 && (
          <button
            type="button"
            onClick={() => setPickHighlight(true)}
            className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 text-white/70"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-[#1a2430] text-[10px] font-semibold leading-tight">
              New
              <br />
              HL
            </span>
            <span className="text-[10px]">Highlight</span>
          </button>
        )}
      </div>
      {highlights.length === 0 && athlete && live.length > 0 && (
        <p className="px-1 text-[11px] text-white/50">
          Watch any story and save it into a named highlight — or tap Highlight
          to pick clips that should stay after 24 hours.
        </p>
      )}
      {highlights.length > 0 && (
        <div>
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
            Highlights
          </p>
          <div className="mt-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {highlights.map((h) => {
              const cover = highlightStories(file, h)[0]
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => openHighlight(h)}
                  className="flex w-16 shrink-0 flex-col items-center gap-1"
                >
                  <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-[#1a2430] text-[10px] font-semibold text-white">
                    {cover?.mime.startsWith('image/') ? (
                      <img src={cover.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      h.title.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="w-full truncate text-center text-[10px] text-white/80">{h.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {compose && athlete && (
        <StoryComposer
          athlete={athlete}
          onClose={() => setCompose(false)}
          onPosted={() => {
            setCompose(false)
            reload()
          }}
        />
      )}
      {pickHighlight && athlete && (
        <HighlightFromStories
          athlete={athlete}
          athletes={athletes}
          stories={live}
          highlights={file.highlights.filter((h) => h.ownerId === athlete.id)}
          onClose={() => setPickHighlight(false)}
          onSaved={() => {
            setPickHighlight(false)
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
          highlightTitle={watch.highlight?.title}
          onClose={() => setWatch(null)}
          onHighlightSaved={reload}
        />
      )}
    </div>
  )
}

function HighlightFromStories({
  athlete,
  athletes,
  stories,
  highlights,
  onClose,
  onSaved,
}: {
  athlete: Athlete
  athletes: Athlete[]
  stories: GymStory[]
  highlights: StoryHighlight[]
  onClose: () => void
  onSaved: () => void
}) {
  const [pickId, setPickId] = useState('')
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState<string[]>(() => stories.map((s) => s.id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existingTitle = highlights.find((h) => h.id === pickId)?.title ?? ''
  const name = title.trim() || existingTitle

  const save = async () => {
    if (!name) {
      setError('Type a highlight name, or pick one you already have.')
      return
    }
    if (picked.length === 0) {
      setError('Pick at least one story.')
      return
    }
    setBusy(true)
    try {
      await saveHighlight({ ownerId: athlete.id, title: name, storyIds: picked })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that highlight.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[280] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <form
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1218] p-4 text-[var(--text)]"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Highlight
        </p>
        <h3 className="mt-1 text-lg font-semibold">Create a highlight from stories</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Live stories stay in this highlight after the 24-hour clock. Uncheck
          any you do not want.
        </p>
        {highlights.length > 0 && (
          <select
            value={pickId}
            onChange={(e) => {
              const id = e.target.value
              setPickId(id)
              const existing = highlights.find((h) => h.id === id)
              if (existing) setTitle(existing.title)
            }}
            className="mt-3 w-full rounded-lg border border-[var(--panel-border)] bg-black/40 px-3 py-2 text-sm"
          >
            <option value="">New highlight…</option>
            {highlights.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>
        )}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={40}
          required={!existingTitle}
          placeholder="Highlight name — Cartwheels, Whip…"
          className="mt-3 w-full rounded-lg border border-[var(--panel-border)] bg-black/40 px-3 py-2 text-sm"
        />
        <div className="mt-3 max-h-56 space-y-1 overflow-y-auto">
          {stories.map((s) => {
            const author = athletes.find((a) => a.id === s.authorId)
            const on = picked.includes(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setPicked((prev) =>
                    prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                  )
                }
                className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-sm hover:bg-white/5"
              >
                <span
                  aria-hidden
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    on ? 'border-[var(--accent)] bg-[var(--accent)] text-[#06281f]' : 'border-white/40'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
                <span className="min-w-0 truncate">
                  {author?.name.split(' ')[0] ?? 'Story'}
                  {s.caption ? ` · ${s.caption}` : ''}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-bold text-[#06281f] disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Save highlight'}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-[var(--muted)]">
            Cancel
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}
      </form>
    </div>
  )
}
