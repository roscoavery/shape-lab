import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import {
  followerCount,
  followingCount,
  isFollowing,
  loadSocial,
  toggleFollowRemote,
  type SocialFile,
} from '../../lib/social'
import { pushNotice } from '../../lib/notify'

type Props = {
  viewer: Athlete | null
  person: Athlete
  social?: SocialFile | null
  onSocial?: (next: SocialFile) => void
  variant?: 'button' | 'row'
}

export function FollowButton({
  viewer,
  person,
  social: socialProp,
  onSocial,
  variant = 'button',
}: Props) {
  const [local, setLocal] = useState<SocialFile | null>(socialProp ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const social = socialProp ?? local

  useEffect(() => {
    if (socialProp) {
      setLocal(socialProp)
      return
    }
    void loadSocial().then(setLocal)
  }, [socialProp, person.id])

  if (!viewer || viewer.id === person.id) return null
  const following = social ? isFollowing(social, viewer.id, person.id) : false

  const toggle = async () => {
    setBusy(true)
    setError(null)
    try {
      const next = await toggleFollowRemote({
        followerId: viewer.id,
        followingId: person.id,
      })
      setLocal(next)
      onSocial?.(next)
      if (!following) {
        void pushNotice({
          toId: person.id,
          kind: 'follow',
          title: `${viewer.name} followed you`,
          body: 'Open Network to follow them back.',
          href: 'network',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update that follow.')
    } finally {
      setBusy(false)
    }
  }

  const followers = social ? followerCount(social, person.id) : 0
  const follows = social ? followingCount(social, person.id) : 0

  return (
    <div className={variant === 'row' ? 'flex flex-wrap items-center gap-2' : ''}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        className={
          variant === 'row'
            ? `rounded-lg px-3 py-1.5 text-xs font-semibold ${
                following
                  ? 'border border-white/20 text-white/80'
                  : 'bg-[var(--accent)] text-[#06281f]'
              } disabled:opacity-50`
            : `rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs disabled:opacity-50`
        }
      >
        {busy ? 'Saving…' : following ? 'Following' : 'Follow'}
      </button>
      {variant === 'row' && (
        <p className="text-[11px] text-[var(--muted)]">
          {followers} follower{followers === 1 ? '' : 's'} · following {follows}
        </p>
      )}
      {error && <p className="w-full text-[11px] text-[var(--bad)]">{error}</p>}
    </div>
  )
}
