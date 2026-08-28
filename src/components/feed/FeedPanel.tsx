/**
 * Gym feed — accomplishment posts. Coaches tag athletes; athletes tag a coach.
 */

import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import {
  listFeedPosts,
  publishFeedPost,
  removeFeedPost,
  type FeedPost,
} from '../../lib/feedPosts'
import {
  collageFromShare,
  libraryHasShare,
  listCollages,
  saveCollage,
  type Collage,
} from '../../lib/collages'
import { isCoachProfile, roleLabel } from '../../lib/profileRole'
import { findRyan } from '../../lib/ryanProfile'
import { useGymLibrary } from '../../lib/gymLibrary'
import { CollageStage } from '../classes/CollageStage'

type Props = {
  athletes: Athlete[]
  athlete: Athlete | null
}

export function FeedPanel({ athletes, athlete }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [library, setLibrary] = useState<Collage[]>([])
  const [caption, setCaption] = useState('')
  const [tagged, setTagged] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Collage | null>(null)
  const [previewFull, setPreviewFull] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const admin = isCoachProfile(athlete)
  const ryan = findRyan(athletes)
  const { nameForUrl } = useGymLibrary()

  useEffect(() => {
    void listFeedPosts().then(setPosts)
  }, [])

  useEffect(() => {
    void listCollages(athlete?.id).then(setLibrary)
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
    if (!file) {
      setError('Pick a video of the skill first.')
      return
    }
    setBusy(true)
    setError(null)
    const posted = await publishFeedPost({
      authorId: athlete.id,
      caption: caption.trim(),
      taggedIds: tagged,
      blob: file,
    })
    setBusy(false)
    if (!posted) {
      setError('Could not post that video. Try a shorter clip.')
      return
    }
    setPosts((prev) => [posted, ...prev])
    setCaption('')
    setFile(null)
    setNotice('Posted to the gym feed.')
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
    if (!admin && post.authorId !== athlete.id) return
    if (!confirm('Remove this post from the gym feed?')) return
    if (await removeFeedPost(post.id, athlete.id, admin)) {
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Gym feed
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">Accomplishments</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Post a clip of a hit, or share a class collage from Classes. Coaches tag
          athletes. Athletes tag their coach. Other coaches can save a shared collage
          into their own class library. Ryan stays the gym coach/admin.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        {!athlete ? (
          <p className="text-sm text-[var(--muted)]">
            Unlock a profile on Athletes to post. Anyone can still watch the feed.
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
              <RoleBadge athlete={athlete} />
              <span className="text-sm font-semibold text-[var(--text)]">{athlete.name}</span>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={
                admin
                  ? 'What did they hit? Or share a collage from Classes. Tag the athlete below.'
                  : 'What did you hit? Ryan is tagged as coach unless you change it.'
              }
              rows={3}
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            />
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-[var(--muted)]"
            />
            {tagChoices.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {admin ? 'Tag athletes' : 'Tag coach'}
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
                        {a.name}
                        <span className="ml-1 opacity-70">{roleLabel(a)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
            {notice && <p className="text-sm text-[var(--accent)]">{notice}</p>}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f] disabled:opacity-50"
            >
              {busy ? 'Posting…' : 'Post to feed'}
            </button>
          </form>
        )}
      </section>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          No posts yet. First hit of the day can live here — or share a class collage
          from Classes.
        </p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => {
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
                  <RoleBadge athlete={author} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">
                      {author?.name ?? 'Unknown profile'}
                    </p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {post.kind === 'collage' ? 'Shared a class collage · ' : ''}
                      {new Date(post.createdAt).toLocaleString()}
                      {taggedPeople.length > 0
                        ? ` · with ${taggedPeople.map((a) => a.name).join(', ')}`
                        : ''}
                    </p>
                  </div>
                  {(admin || post.authorId === athlete?.id) && (
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
                ) : (
                  <video
                    src={post.url}
                    controls
                    playsInline
                    className="max-h-[520px] w-full bg-black object-contain"
                  />
                )}
                {post.caption && (
                  <p className="px-4 py-3 text-sm leading-relaxed text-[var(--text)]">{post.caption}</p>
                )}
                {taggedPeople.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-4 pb-3">
                    {taggedPeople.map((a) => (
                      <span
                        key={a.id}
                        className="rounded-full bg-[#0d1218] px-2 py-0.5 text-[11px] text-[var(--muted)]"
                      >
                        @{a.name} · {roleLabel(a)}
                      </span>
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
  const coach = isCoachProfile(athlete)
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        coach
          ? 'bg-[var(--accent-dim)] text-white'
          : 'border border-[var(--panel-border)] text-[var(--muted)]'
      }`}
    >
      {coach ? 'Coach' : 'Athlete'}
    </span>
  )
}
