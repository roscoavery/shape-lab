import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import {
  highlightStories,
  liveStories,
  loadStories,
  saveHighlight,
  type GymStory,
  type StoriesFile,
  type StoryHighlight,
} from '../../lib/stories'
import { StoryViewer } from './StoryViewer'

type Props = {
  athlete: Athlete
  viewer: Athlete | null
  athletes: Athlete[]
}

export function ProfileHighlights({ athlete, viewer, athletes }: Props) {
  const [file, setFile] = useState<StoriesFile>({ stories: [], highlights: [] })
  const [pick, setPick] = useState(false)
  const [watch, setWatch] = useState<{ items: GymStory[]; highlight: StoryHighlight } | null>(null)

  const reload = () => {
    void loadStories().then(setFile)
  }

  useEffect(() => {
    reload()
  }, [athlete.id])

  const highlights = file.highlights.filter((h) => h.ownerId === athlete.id)
  const live = liveStories(file)
  const own = viewer?.id === athlete.id
  const canAdd = own && live.length > 0

  if (highlights.length === 0 && !own) return null

  return (
    <section>
      <p
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--profile-accent, var(--accent))' }}
      >
        Highlights
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Saved stories that stay after 24 hours.
      </p>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        {canAdd && (
          <button
            type="button"
            onClick={() => setPick(true)}
            className="flex w-16 shrink-0 flex-col items-center gap-1 text-[var(--muted)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-white/35 text-2xl">
              +
            </span>
            <span className="w-full truncate text-center text-[10px]">New</span>
          </button>
        )}
        {highlights.map((h) => {
          const cover = highlightStories(file, h)[0]
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                const items = highlightStories(file, h)
                if (items.length) setWatch({ items, highlight: h })
              }}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-[#1a2430] text-[10px] font-semibold text-white">
                {cover?.mime.startsWith('image/') ? (
                  <img src={cover.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  h.title.slice(0, 2).toUpperCase()
                )}
              </span>
              <span className="w-full truncate text-center text-[10px] text-[var(--text)]">
                {h.title}
              </span>
            </button>
          )
        })}
      </div>
      {highlights.length === 0 && own && (
        <p className="mt-1 text-sm text-[var(--muted)]">
          {live.length > 0
            ? 'Save a live story into a highlight and it stays on this profile.'
            : 'Post a story, then save it here so it outlives 24 hours.'}
        </p>
      )}
      {pick && viewer && (
        <HighlightFromStories
          athlete={viewer}
          athletes={athletes}
          stories={live}
          highlights={highlights}
          onClose={() => setPick(false)}
          onSaved={() => {
            setPick(false)
            reload()
          }}
        />
      )}
      {watch && (
        <StoryViewer
          items={watch.items}
          athletes={athletes}
          viewer={viewer}
          highlights={viewer ? file.highlights.filter((h) => h.ownerId === viewer.id) : []}
          highlightTitle={watch.highlight.title}
          onClose={() => setWatch(null)}
          onHighlightSaved={reload}
        />
      )}
    </section>
  )
}

export function HighlightFromStories({
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
        <h3 className="mt-1 text-lg font-semibold">Save stories to this profile</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Highlights live on your profile after the 24-hour story clock.
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
            {busy ? 'Saving…' : 'Save to profile'}
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
