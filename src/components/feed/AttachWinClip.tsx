import type { Athlete } from '../../types'
import {
  attachFeedVideoResult,
  canAttachFeedVideo,
  type FeedPost,
} from '../../lib/feedPosts'
import { videoFileAccept } from '../../lib/saveMedia'
import { isCoachProfile, isGymAdmin } from '../../lib/profileRole'

type Props = {
  post: FeedPost
  viewer: Athlete | null
  onAttached: (post: FeedPost) => void
  onError: (message: string) => void
  className?: string
}

export function AttachWinClip({ post, viewer, onAttached, onError, className }: Props) {
  const admin = isGymAdmin(viewer)
  const coach = isCoachProfile(viewer)
  if (!canAttachFeedVideo(post, viewer?.id, { admin, coach })) return null
  return (
    <label className={className ?? 'cursor-pointer text-xs font-semibold text-[var(--accent)]'}>
      Add clip
      <input
        type="file"
        accept={videoFileAccept()}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file || !viewer) return
          void attachFeedVideoResult(post.id, viewer.id, file, { admin, coach }).then((got) => {
            if (!got.post) {
              onError(got.error ?? 'Could not attach that clip.')
              return
            }
            onAttached(got.post)
          })
        }}
      />
    </label>
  )
}
