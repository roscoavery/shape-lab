import { useRef, useState } from 'react'
import type { Athlete } from '../../types'
import { fileToClipBlob, recordQuickClip } from '../../lib/quickClip'
import { publishStory, saveHighlight } from '../../lib/stories'

type Props = {
  athlete: Athlete
  onClose: () => void
  onPosted: () => void
}

export function StoryComposer({ athlete, onClose, onPosted }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [caption, setCaption] = useState('')
  const [highlightName, setHighlightName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const post = async (blob: Blob) => {
    setBusy('Posting…')
    try {
      const story = await publishStory({ authorId: athlete.id, blob, caption })
      const title = highlightName.trim()
      if (title) {
        await saveHighlight({ ownerId: athlete.id, title, storyIds: [story.id] })
      }
      onPosted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post that story.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[280] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1218] p-4 text-[var(--text)]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Story
        </p>
        <h3 className="mt-1 text-lg font-semibold">Add to your story</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Lives at the top of Reference scroll for 24 hours. Name a highlight
          below if you want this clip to stay after the story ends.
        </p>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={120}
          placeholder="Optional caption"
          className="mt-3 w-full rounded-lg border border-[var(--panel-border)] bg-black/40 px-3 py-2 text-sm"
        />
        <input
          value={highlightName}
          onChange={(e) => setHighlightName(e.target.value)}
          maxLength={40}
          placeholder="Optional highlight — Cartwheels, Whip…"
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-black/40 px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => {
              setError(null)
              setBusy('Recording…')
              void recordQuickClip(8)
                .then((blob) => post(blob))
                .catch((err) => {
                  setBusy(null)
                  setError(err instanceof Error ? err.message : 'Could not record.')
                })
            }}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-bold text-[#06281f] disabled:opacity-40"
          >
            {busy === 'Recording…' ? 'Recording 8s…' : 'Record 8s'}
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold disabled:opacity-40"
          >
            From Photos
          </button>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-[var(--muted)]">
            Cancel
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="video/*,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setError(null)
            void fileToClipBlob(file)
              .then((blob) => post(blob))
              .catch((err) => setError(err instanceof Error ? err.message : 'Could not use that file.'))
          }}
        />
        {busy && busy !== 'Recording…' && (
          <p className="mt-2 text-sm text-[var(--accent)]">{busy}</p>
        )}
        {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}
      </div>
    </div>
  )
}
