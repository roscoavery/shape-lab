import { useState } from 'react'
import type { Athlete } from '../../types'
import {
  attachFeedVideoResult,
  canAttachFeedVideo,
  type FeedPost,
} from '../../lib/feedPosts'
import { videoFileAccept } from '../../lib/saveMedia'
import { isCoachProfile, isShapelabAdmin } from '../../lib/profileRole'
import { IconMark } from '../ui/IconAction'

type Props = {
  post: FeedPost
  viewer: Athlete | null
  onAttached: (post: FeedPost) => void
  onError: (message: string) => void
  className?: string
}

export function AttachWinClip({ post, viewer, onAttached, onError, className }: Props) {
  const [uploading, setUploading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const admin = isShapelabAdmin(viewer)
  const coach = isCoachProfile(viewer)
  if (!canAttachFeedVideo(post, viewer?.id, { admin, coach })) return null
  const fail = (message: string) => {
    setLocalError(message)
    onError(message)
  }
  return (
    <span className="inline-flex flex-col items-end">
      <label
        className={
          className ??
          'inline-flex cursor-pointer items-center rounded-full p-2 text-[var(--accent)] hover:bg-white/10'
        }
        title={uploading ? 'Uploading clip…' : 'Add clip'}
      >
        <span className="sr-only">{uploading ? 'Uploading clip…' : 'Add clip'}</span>
        {uploading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        ) : (
          <IconMark kind="plus" />
        )}
        <input
          type="file"
          accept={videoFileAccept()}
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file || !viewer || uploading) return
            // iPad videos can be huge; warn before a doomed upload.
            if (file.size > 200_000_000) {
              fail('That clip is over 200MB. Pick a shorter video from Photos.')
              return
            }
            setLocalError(null)
            setUploading(true)
            void attachFeedVideoResult(post.id, viewer.id, file, { admin, coach })
              .then((got) => {
                setUploading(false)
                if (!got.post) {
                  fail(got.error ?? 'Could not attach that clip.')
                  return
                }
                onAttached(got.post)
              })
              .catch(() => {
                setUploading(false)
                fail('Could not attach that clip. Try again.')
              })
          }}
        />
      </label>
      {localError && (
        <p className="mt-1 max-w-[200px] text-right text-xs text-[var(--bad)]">{localError}</p>
      )}
    </span>
  )
}
