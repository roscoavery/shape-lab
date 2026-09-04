import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Athlete } from '../../types'
import { givenName } from '../../lib/classStation'
import { saveHighlight, type GymStory, type StoryHighlight } from '../../lib/stories'
import { MentionText } from '../MentionText'

type Props = {
  items: GymStory[]
  startIndex?: number
  athletes: Athlete[]
  viewer: Athlete | null
  highlights: StoryHighlight[]
  highlightTitle?: string
  onClose: () => void
  onHighlightSaved?: () => void
}

export function StoryViewer({
  items,
  startIndex = 0,
  athletes,
  viewer,
  highlights,
  highlightTitle,
  onClose,
  onHighlightSaved,
}: Props) {
  const [index, setIndex] = useState(startIndex)
  const [name, setName] = useState('')
  const [pickId, setPickId] = useState(highlights[0]?.id ?? '')
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const story = items[index]
  const author = story ? athletes.find((a) => a.id === story.authorId) : null
  const canHighlight = Boolean(viewer && story)

  useEffect(() => {
    setIndex(Math.min(startIndex, Math.max(0, items.length - 1)))
  }, [items, startIndex])

  useEffect(() => {
    if (!story || !story.mime.startsWith('image/')) return
    if (busy || name.trim()) return
    const id = window.setTimeout(() => {
      if (index < items.length - 1) setIndex(index + 1)
      else onClose()
    }, 8000)
    return () => window.clearTimeout(id)
  }, [story, index, items.length, onClose, busy, name])

  const advanceStory = () => {
    if (index < items.length - 1) setIndex(index + 1)
    else onClose()
  }

  if (!story) return null

  const go = (dir: -1 | 1) => {
    const next = index + dir
    if (next < 0) onClose()
    else if (next >= items.length) onClose()
    else setIndex(next)
  }

  const addToHighlight = async () => {
    if (!viewer) return
    const title = name.trim() || highlights.find((h) => h.id === pickId)?.title
    if (!title) {
      setNotice('Name a highlight or pick one you already have.')
      return
    }
    setBusy(true)
    try {
      await saveHighlight({ ownerId: viewer.id, title, storyIds: [story.id] })
      setNotice(`Saved into “${title}”.`)
      setName('')
      onHighlightSaved?.()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not save that highlight.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[290] flex flex-col bg-black text-white">
      <div className="flex gap-1 px-3 pt-3">
        {items.map((s, i) => (
          <span
            key={s.id}
            className={`h-0.5 flex-1 rounded-full ${i <= index ? 'bg-white' : 'bg-white/25'}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-2">
        <p className="text-sm font-semibold">
          {highlightTitle ? `${highlightTitle} · ` : ''}
          {givenName(author) || 'Story'}
        </p>
        <button type="button" onClick={onClose} className="text-sm text-white/70">
          Close
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        {story.mime.startsWith('image/') ? (
          <img src={story.url} alt="" className="h-full w-full object-contain" />
        ) : (
          <video
            src={story.url}
            autoPlay
            playsInline
            onEnded={advanceStory}
            className="h-full w-full object-contain"
          />
        )}
        <button
          type="button"
          aria-label="Previous"
          onClick={() => go(-1)}
          className="absolute inset-y-0 left-0 w-1/3"
        />
        <button
          type="button"
          aria-label="Next"
          onClick={() => go(1)}
          className="absolute inset-y-0 right-0 w-2/3"
        />
        {story.caption && (
          <p className="pointer-events-auto absolute inset-x-0 bottom-24 z-10 px-4 text-center text-sm font-medium">
            <MentionText text={story.caption} athletes={athletes} />
          </p>
        )}
      </div>
      {canHighlight && (
        <div className="space-y-2 bg-black/80 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
            Save this story as a highlight
          </p>
          <p className="text-[11px] text-white/55">
            Saving a highlight keeps this clip on your profile after the
            24-hour story clock.
          </p>
          {highlights.length > 0 && (
            <select
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-black px-3 py-2 text-sm"
            >
              <option value="">New highlight…</option>
              {highlights.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
            </select>
          )}
          {(!pickId || highlights.length === 0) && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Highlight name — Cartwheels, Whip, Camp…"
              className="w-full rounded-lg border border-white/20 bg-black px-3 py-2 text-sm"
            />
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void addToHighlight()}
            className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Add this story to a highlight'}
          </button>
          {notice && <p className="text-xs text-[var(--accent)]">{notice}</p>}
        </div>
      )}
    </div>,
    document.body,
  )
}
