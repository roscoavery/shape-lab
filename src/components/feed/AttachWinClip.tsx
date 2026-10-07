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
  const admin = isShapelabAdmin(viewer)
  const coach = isCoachProfile(viewer)
  if (!canAttachFeedVideo(post, viewer?.id, { admin, coach })) return null
  return (
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
          setUploading(true)
          void attachFeedVideoResult(post.id, viewer.id, file, { admin, coach })
            .then((got) => {
              setUploading(false)
              if (!got.post) {
                onError(got.error ?? 'Could not attach that clip.')
                return
              }
              onAttached(got.post)
            })
            .catch(() => {
              setUploading(false)
              onError('Could not attach that clip. Try again.')
            })
        }}
      />
    </label>
  )
}
