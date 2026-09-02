/**
 * Post to Feed or Wins: typed words, a clip from Photos, or a clip
 * already in the Shape Lab video library.
 */

import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import {
  FEED_CAPTION_MAX,
  publishFeedPostResult,
  publishTextPostResult,
  type FeedChannel,
  type FeedPost,
} from '../../lib/feedPosts'
import { listAthleteVideos, type AthleteVideo } from '../../lib/athleteVideoStore'
import { pushNotice } from '../../lib/notify'

type Props = {
  athlete: Athlete
  athletes?: Athlete[]
  taggedIds?: string[]
  channels: FeedChannel[]
  placeholder: string
  submitLabel: string
  onPosted: (post: FeedPost) => void
}

export function WinComposer({
  athlete,
  taggedIds = [],
  channels,
  placeholder,
  submitLabel,
  onPosted,
}: Props) {
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [libraryId, setLibraryId] = useState<string | null>(null)
  const [videos, setVideos] = useState<AthleteVideo[]>([])
  const [pickLib, setPickLib] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listAthleteVideos(athlete.id).then(setVideos)
  }, [athlete.id])

  const submit = async () => {
    const text = caption.trim()
    if (!text && !file && !libraryId) {
      setError('Write a win, or attach a clip.')
      return
    }
    setBusy(true)
    setError(null)
    let blob: Blob | null = file
    if (!blob && libraryId) {
      const clip = videos.find((v) => v.id === libraryId)
      if (clip) {
        try {
          const res = await fetch(clip.url)
          if (res.ok) blob = await res.blob()
        } catch {
          blob = null
        }
      }
    }
    const result = blob
      ? await publishFeedPostResult({
          authorId: athlete.id,
          caption: text,
          taggedIds,
          blob,
          channels,
        })
      : await publishTextPostResult({
          authorId: athlete.id,
          caption: text,
          taggedIds,
          channels,
        })
    setBusy(false)
    if (!result.post) {
      setError(result.error || 'Could not post that.')
      return
    }
    setCaption('')
    setFile(null)
    setLibraryId(null)
    setPickLib(false)
    onPosted(result.post)
    for (const id of taggedIds) {
      if (id === athlete.id) continue
      void pushNotice({
        toId: id,
        kind: channels.includes('wins') ? 'win' : 'win',
        title: channels.includes('wins') ? 'A win with your name on it' : 'You were tagged',
        body: text || `${athlete.name} posted a clip.`,
        href: channels.includes('wins') ? 'wins' : 'feed',
      })
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={FEED_CAPTION_MAX}
        className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold">
          From Photos
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/*"
            className="sr-only"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setLibraryId(null)
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => setPickLib((v) => !v)}
          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
        >
          From video library
        </button>
      </div>
      {file && (
        <p className="text-xs text-[var(--muted)]">Photos clip: {file.name}</p>
      )}
      {pickLib && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--panel-border)]">
          {videos.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--muted)]">
              No clips in the app library for this profile yet.
            </p>
          ) : (
            videos.slice(0, 20).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setLibraryId(v.id)
                  setFile(null)
                }}
                className={`block w-full px-3 py-2 text-left text-xs ${
                  libraryId === v.id ? 'bg-[var(--accent-dim)] text-white' : 'text-[var(--text)]'
                }`}
              >
                {v.name || 'Clip'} · {new Date(v.createdAt).toLocaleDateString()}
              </button>
            ))
          )}
        </div>
      )}
      {libraryId && !file && (
        <p className="text-xs text-[var(--muted)]">Using a clip from the video library.</p>
      )}
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-50"
      >
        {busy ? 'Posting…' : submitLabel}
      </button>
    </form>
  )
}
