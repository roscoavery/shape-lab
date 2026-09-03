/**
 * Gym feed — accomplishment posts. Coaches tag athletes; athletes tag a coach.
 */

import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import {
  FEED_CAPTION_MAX,
  listFeedPosts,
  postOnChannel,
  publishFeedPostResult,
  publishTextPostResult,
  isPassPost,
  toggleFeedHi5,
  toggleFeedLike,
  toggleFeedRepost,
  type FeedChannel,
  type FeedPost,
  removeFeedPost,
} from '../../lib/feedPosts'
import { listAthleteVideos, type AthleteVideo } from '../../lib/athleteVideoStore'
import { pushNotice } from '../../lib/notify'
import { playGestureBurst } from '../../lib/gestureBurst'
import { AthleteAvatar, AthleteName } from '../AthleteAvatar'
import {
  collageFromShare,
  libraryHasShare,
  listCollages,
  saveCollage,
  type Collage,
} from '../../lib/collages'
import { canGiveHi5, isAthleteProfile, isCoachProfile, isGymAdmin, profileRole, roleLabel } from '../../lib/profileRole'
import { givenName } from '../../lib/classStation'
import { childAthletes } from '../../lib/parentLink'
import { findRyan } from '../../lib/ryanProfile'
import { useGymLibrary } from '../../lib/gymLibrary'
import { CollageStage } from '../classes/CollageStage'
import { StoryRail } from '../stories/StoryRail'
import { MentionText } from '../MentionText'
import { mentionLabel, taggedIdsFromText } from '../../lib/profileHandle'
import { useViewProfile } from '../ProfilePeekContext'

type Props = {
  athletes: Athlete[]
  athlete: Athlete | null
  channel?: FeedChannel
}

export function FeedPanel({ athletes, athlete, channel = 'gym' }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [library, setLibrary] = useState<Collage[]>([])
  const [caption, setCaption] = useState('')
  const [tagged, setTagged] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [libVideos, setLibVideos] = useState<AthleteVideo[]>([])
  const [libId, setLibId] = useState<string | null>(null)
  const [pickLib, setPickLib] = useState(false)
  const [busy, setBusy] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Collage | null>(null)
  const [previewFull, setPreviewFull] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [bigWin, setBigWin] = useState(false)
  const wins = channel === 'wins'
  const coach = isCoachProfile(athlete)
  const gymAdmin = isGymAdmin(athlete)
  const ryan = findRyan(athletes)
  const { nameForUrl } = useGymLibrary()
  const viewProfile = useViewProfile()
  const parentKidIds =
    athlete && profileRole(athlete) === 'parent'
      ? new Set(childAthletes(athlete, athletes).map((k) => k.id))
      : null

  const visiblePosts = posts.filter((p) => {
    if (!postOnChannel(p, channel)) return false
    if (wins && parentKidIds) {
      return parentKidIds.has(p.authorId) || p.taggedIds.some((id) => parentKidIds.has(id))
    }
    return true
  })

  useEffect(() => {
    void listFeedPosts().then(setPosts)
  }, [])

  useEffect(() => {
    void listCollages(athlete?.id).then(setLibrary)
  }, [athlete?.id])

  useEffect(() => {
    if (!athlete) return
    void listAthleteVideos(athlete.id).then(setLibVideos)
  }, [athlete?.id])

  useEffect(() => {
    if (!athlete) {
      setTagged([])
      return
    }
    if (isCoachProfile(athlete)) {
      setTagged([])
      return
    }
    if (ryan && ryan.id !== athlete.id) setTagged([ryan.id])
  }, [athlete?.id, ryan?.id])

  const tagChoices = useMemo(() => {
    if (!athlete) return []
    if (isCoachProfile(athlete)) {
      return athletes.filter((a) => a.id !== athlete.id)
    }
    return athletes.filter((a) => isCoachProfile(a) && a.id !== athlete.id)
  }, [athletes, athlete])

  const authorOf = (id: string) => athletes.find((a) => a.id === id) ?? null

  const toggleTag = (id: string) => {
    setTagged((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const submit = async () => {
    if (!athlete) {
      setError('Unlock a profile to post.')
      return
    }
    if (!file && !libId && !caption.trim()) {
      setError('Write a caption, or attach a video.')
      return
    }
    setBusy(true)
    setError(null)
    const channels: FeedChannel[] =
      wins && bigWin ? ['wins', 'gym'] : wins ? ['wins'] : ['gym']
    let blob: Blob | null = file
    if (!blob && libId) {
      const clip = libVideos.find((v) => v.id === libId)
      if (clip) {
        try {
          const res = await fetch(clip.url)
          if (res.ok) blob = await res.blob()
        } catch {
          blob = null
        }
      }
    }
    const taggedIds = taggedIdsFromText(caption, athletes, tagged)
    const result = blob
      ? await publishFeedPostResult({
          authorId: athlete.id,
          caption: caption.trim(),
          taggedIds,
          blob,
          channels,
        })
      : await publishTextPostResult({
          authorId: athlete.id,
          caption: caption.trim(),
          taggedIds,
          channels,
        })
    setBusy(false)
    if (!result.post) {
      setError(
        result.error ||
          (blob ? 'Could not post that video. Try a shorter clip.' : 'Could not post that.'),
      )
      return
    }
    setPosts((prev) => [result.post!, ...prev])
    setCaption('')
    setFile(null)
    setLibId(null)
    setNotice(
      wins && bigWin
        ? 'Posted to Wins and the gym feed.'
        : wins
          ? 'Posted to Wins.'
          : 'Posted to the gym feed.',
    )
    for (const id of taggedIds) {
      if (id === athlete.id) continue
      void pushNotice({
        toId: id,
        kind: 'win',
        title: wins ? `${athlete.name} logged a win with you` : `${athlete.name} tagged you`,
        body: caption.trim() || 'Open the feed.',
        href: wins ? 'wins' : 'feed',
      })
    }
  }

  const saveSharedCollage = async (post: FeedPost) => {
    if (!athlete) {
      setError('Unlock a coach profile to save this collage for class.')
      return
    }
    if (!isCoachProfile(athlete)) {
      setError('Unlock a coach profile to save this collage into Classes.')
      return
    }
    if (!post.collage) return
    if (libraryHasShare(library, post.collage, athlete.id)) {
      setNotice('That collage is already in your class library.')
      return
    }
    setSavingId(post.id)
    setError(null)
    const saved = await saveCollage(collageFromShare(post.collage, athlete.id))
    setSavingId(null)
    if (!saved) {
      setError('Could not save that collage into Classes.')
      return
    }
    setLibrary((prev) => [saved, ...prev.filter((c) => c.id !== saved.id)])
    setNotice(`Saved “${saved.name}” to your class library. Open Classes to run it.`)
  }

  const drop = async (post: FeedPost) => {
    if (!athlete) return
    if (!gymAdmin && post.authorId !== athlete.id) return
    if (!confirm(wins ? 'Remove this from Wins?' : 'Remove this post from the gym feed?')) return
    if (await removeFeedPost(post.id, athlete.id, gymAdmin)) {
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {!wins && (
        <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-3">
          <StoryRail athlete={athlete} athletes={athletes} />
        </section>
      )}
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          {wins ? 'Wins' : 'Gym feed'}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text)]">
          {wins ? 'Spam the little hits' : 'Accomplishments'}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {wins
            ? 'A place for firsts, stuck landings, and “they finally got it.” Check big win only when it should also show on the gym feed.'
            : 'Bigger gym posts — collages, videos, and the wins someone marked as big.'}
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        {!athlete ? (
          <p className="text-sm text-[var(--muted)]">
            Unlock a profile on Profiles to post. Anyone can still watch the feed.
            Coaches unlock to save a shared collage into Classes.
          </p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <div className="flex items-center gap-2">
              <AthleteAvatar athlete={athlete} size="sm" />
              <RoleBadge athlete={athlete} />
              <span className="text-sm font-semibold text-[var(--text)]">{athlete.name}</span>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={
                wins
                  ? 'What did they just do? Tag with @handle or @"Full Name". Video optional.'
                  : coach
                    ? 'A thought, a hit, or a note about class. Tag with @handle or @"Full Name".'
                    : 'A thought or what you hit. Tag with @handle or @"Full Name".'
              }
              rows={3}
              maxLength={FEED_CAPTION_MAX}
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            />
            {caption.trim() && taggedIdsFromText(caption, athletes).length > 0 && (
              <p className="text-[11px] text-[var(--accent)]">
                Tagging{' '}
                {taggedIdsFromText(caption, athletes)
                  .map((id) => athletes.find((a) => a.id === id)?.name)
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Video (optional)
              </span>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold">
                  From Photos
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/*"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null)
                      setLibId(null)
                    }}
                    className="sr-only"
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
              {file && <p className="mt-1 text-xs text-[var(--muted)]">{file.name}</p>}
              {pickLib && (
                <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-[var(--panel-border)]">
                  {libVideos.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-[var(--muted)]">No library clips on this profile yet.</p>
                  ) : (
                    libVideos.slice(0, 16).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setLibId(v.id)
                          setFile(null)
                        }}
                        className={`block w-full px-3 py-2 text-left text-xs ${
                          libId === v.id ? 'bg-[var(--accent-dim)] text-white' : ''
                        }`}
                      >
                        {v.name} · {new Date(v.createdAt).toLocaleDateString()}
                      </button>
                    ))
                  )}
                </div>
              )}
            </label>
            {tagChoices.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {coach ? 'Tag athletes' : 'Tag coach'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tagChoices.map((a) => {
                    const on = tagged.includes(a.id)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleTag(a.id)}
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          on
                            ? 'bg-[var(--accent-dim)] font-semibold text-white'
                            : 'border border-[var(--panel-border)] text-[var(--muted)]'
                        }`}
                      >
                        <AthleteName athlete={a} size="xs" />
                        <span className="ml-1 opacity-70">{roleLabel(a)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {wins && (
              <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={bigWin}
                  onChange={(e) => setBigWin(e.target.checked)}
                />
                Big win — also post to the gym feed
              </label>
            )}
            {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
            {notice && <p className="text-sm text-[var(--accent)]">{notice}</p>}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f] disabled:opacity-50"
            >
              {busy ? 'Posting…' : wins ? 'Post to Wins' : 'Post to feed'}
            </button>
          </form>
        )}
      </section>

      {visiblePosts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          {wins
            ? 'No wins yet. Log a skill from Today → Class clock, or write one here.'
            : 'No posts yet. A thought, a first hit of the day, or a class collage from Classes can live here.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {visiblePosts.map((post) => {
            const author = authorOf(post.authorId)
            const taggedPeople = post.taggedIds
              .map((id) => authorOf(id))
              .filter((a): a is Athlete => Boolean(a))
            return (
              <li
                key={post.id}
                className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)]"
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  <AthleteAvatar athlete={author} size="sm" />
                  <RoleBadge athlete={author} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">
                      {author?.name ?? 'Unknown profile'}
                    </p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {isPassPost(post)
                        ? 'Pass · '
                        : post.kind === 'collage'
                        ? 'Shared a class collage · '
                        : post.sharedByName
                          ? `shared by ${post.sharedByName} · `
                          : post.kind === 'text'
                            ? 'Thought · '
                            : ''}
                      {new Date(post.createdAt).toLocaleString()}
                      {taggedPeople.length > 0
                        ? ` · with ${taggedPeople.map((a) => a.name).join(', ')}`
                        : ''}
                    </p>
                  </div>
                  {(gymAdmin || post.authorId === athlete?.id) && (
                    <button
                      type="button"
                      onClick={() => void drop(post)}
                      className="ml-auto text-xs text-[var(--bad)]"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {post.kind === 'collage' && post.collage ? (
                  <CollageFeedCard
                    post={post}
                    nameForUrl={nameForUrl}
                    athlete={athlete}
                    already={
                      Boolean(athlete && libraryHasShare(library, post.collage, athlete.id))
                    }
                    saving={savingId === post.id}
                    onPreview={() => {
                      setPreview({
                        id: `preview_${post.id}`,
                        name: post.collage!.name,
                        createdAt: post.createdAt,
                        updatedAt: post.createdAt,
                        createdById: post.collage!.createdById,
                        slots: post.collage!.slots.map((s) => ({ ...s })),
                      })
                      setPreviewFull(true)
                    }}
                    onSave={() => void saveSharedCollage(post)}
                  />
                ) : post.url && post.kind !== 'text' ? (
                  <video
                    src={post.url}
                    controls
                    playsInline
                    className="max-h-[520px] w-full bg-black object-contain"
                  />
                ) : null}
                {post.caption && (
                  <p
                    className={`px-4 py-3 text-sm leading-relaxed text-[var(--text)] ${
                      post.kind === 'text' || (!post.url && post.kind !== 'collage')
                        ? 'text-base'
                        : ''
                    }`}
                  >
                    <MentionText text={post.caption} athletes={athletes} />
                  </p>
                )}
                {athlete && (
                  <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
                    <button
                      type="button"
                      onClick={() => {
                        void toggleFeedLike(post.id, athlete.id).then((next) => {
                          if (!next) return
                          setPosts((prev) => prev.map((p) => (p.id === next.id ? { ...p, likes: next.likes } : p)))
                          const liked = (next.likes ?? []).includes(athlete.id)
                          if (liked && next.authorId !== athlete.id) {
                            void pushNotice({
                              toId: next.authorId,
                              kind: 'like',
                              title: `${athlete.name} liked your post`,
                              body: next.caption || 'Open the feed.',
                              href: postOnChannel(next, 'wins') ? 'wins' : 'feed',
                            })
                          }
                        })
                      }}
                      className="text-xs font-semibold text-[var(--accent)]"
                    >
                      {(post.likes ?? []).includes(athlete.id) ? 'Liked' : 'Like'}
                      {(post.likes ?? []).length > 0 ? ` · ${(post.likes ?? []).length}` : ''}
                    </button>
                    {athlete.id !== post.authorId && (
                      <button
                        type="button"
                        onClick={() => {
                          void toggleFeedRepost(post.id, athlete.id).then((next) => {
                            if (!next) return
                            setPosts((prev) => prev.map((p) => (p.id === next.id ? next : p)))
                            const on = (next.reposts ?? []).includes(athlete.id)
                            setNotice(on ? 'On your profile.' : 'Removed from your profile.')
                          })
                        }}
                        className="text-xs font-semibold text-[var(--accent)]"
                      >
                        {(post.reposts ?? []).includes(athlete.id) ? 'On your profile' : 'Repost'}
                      </button>
                    )}
                    {canGiveHi5(athlete) && hi5Athletes(post, athletes, athlete.id).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const targets = hi5Athletes(post, athletes, athlete.id)
                          void toggleFeedHi5(post.id, athlete.id).then((next) => {
                            if (!next) return
                            setPosts((prev) =>
                              prev.map((p) => (p.id === next.id ? { ...p, hi5s: next.hi5s } : p)),
                            )
                            const on = (next.hi5s ?? []).includes(athlete.id)
                            if (!on || targets.length === 0) return
                            playGestureBurst('hi5')
                            const names = targets.map((t) => givenName(t)).join(', ')
                            const youDid =
                              targets.length === 1
                                ? `You high-fived ${names}`
                                : `You high-fived ${names}`
                            setNotice(youDid)
                            window.setTimeout(
                              () => setNotice((cur) => (cur === youDid ? null : cur)),
                              4200,
                            )
                            for (const t of targets) {
                              void pushNotice({
                                toId: t.id,
                                kind: 'hi5',
                                title: `${givenName(athlete)} high-fived you`,
                                body: youDid,
                                href: postOnChannel(next, 'wins') ? 'wins' : 'feed',
                              })
                            }
                          })
                        }}
                        className="text-xs font-semibold text-[var(--accent)]"
                      >
                        {(post.hi5s ?? []).includes(athlete.id) ? 'High-fived' : 'High five'}
                        {(post.hi5s ?? []).length > 0 ? ` · ${(post.hi5s ?? []).length}` : ''}
                      </button>
                    )}
                  </div>
                )}
                {taggedPeople.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-4 pb-3">
                    {taggedPeople.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => viewProfile(a.id)}
                        className="rounded-full bg-[#0d1218] px-2 py-0.5 text-[11px] text-[var(--muted)]"
                      >
                        <AthleteName athlete={a} size="xs" />
                        <span className="ml-1">{mentionLabel(a)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {preview && (
        <CollageStage
          collage={preview}
          nameForUrl={nameForUrl}
          fullscreen={previewFull}
          onFullscreen={setPreviewFull}
          onClose={() => {
            setPreview(null)
            setPreviewFull(false)
          }}
          canEdit={false}
          editor={{
            gymEditor: isGymAdmin(athlete),
            personalEditor: isCoachProfile(athlete) && !isGymAdmin(athlete),
            profileId: athlete?.id ?? null,
          }}
          gymAdmin={isGymAdmin(athlete)}
        />
      )}
    </div>
  )
}

function CollageFeedCard({
  post,
  nameForUrl,
  athlete,
  already,
  saving,
  onPreview,
  onSave,
}: {
  post: FeedPost
  nameForUrl: (url: string) => string
  athlete: Athlete | null
  already: boolean
  saving: boolean
  onPreview: () => void
  onSave: () => void
}) {
  const share = post.collage!
  const coach = isCoachProfile(athlete)
  return (
    <div className="space-y-3 bg-[#0d1218] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Class collage
      </p>
      <h3 className="text-base font-semibold text-[var(--text)]">{share.name}</h3>
      <ul className="space-y-1 text-sm text-[var(--muted)]">
        {share.slots.map((slot, i) => (
          <li key={`${slot.url}-${i}`}>
            {nameForUrl(slot.url)}
            {slot.caption ? ` · ${slot.caption}` : ''}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPreview}
          className="rounded-md bg-[var(--accent-dim)] px-2.5 py-1 text-xs font-semibold text-white"
        >
          Play board
        </button>
        {already ? (
          <span className="rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-xs text-[var(--muted)]">
            In your class library
          </span>
        ) : coach ? (
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[#06281f] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save to my class library'}
          </button>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            Unlock a coach profile to save this board into Classes.
          </p>
        )}
      </div>
    </div>
  )
}

function RoleBadge({ athlete }: { athlete: Athlete | null }) {
  const staff = isCoachProfile(athlete)
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        staff
          ? 'bg-[var(--accent-dim)] text-white'
          : 'border border-[var(--panel-border)] text-[var(--muted)]'
      }`}
    >
      {roleLabel(athlete)}
    </span>
  )
}

function hi5Athletes(post: FeedPost, people: Athlete[], viewerId?: string): Athlete[] {
  const ids = new Set<string>()
  const author = people.find((a) => a.id === post.authorId)
  if (author && isAthleteProfile(author)) ids.add(author.id)
  for (const id of post.taggedIds) {
    const tagged = people.find((a) => a.id === id)
    if (tagged && isAthleteProfile(tagged)) ids.add(id)
  }
  if (viewerId) ids.delete(viewerId)
  return [...ids]
    .map((id) => people.find((a) => a.id === id))
    .filter((a): a is Athlete => Boolean(a))
}
