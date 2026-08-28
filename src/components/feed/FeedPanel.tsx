/**
 * Gym feed — accomplishment posts. Coaches tag athletes; athletes tag a coach.
 */

import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { listFeedPosts, publishFeedPost, removeFeedPost, type FeedPost } from '../../lib/feedPosts'
import { isCoachProfile, roleLabel } from '../../lib/profileRole'
import { findRyan } from '../../lib/ryanProfile'

type Props = {
  athletes: Athlete[]
  athlete: Athlete | null
}

export function FeedPanel({ athletes, athlete }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [caption, setCaption] = useState('')
  const [tagged, setTagged] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const admin = isCoachProfile(athlete)
  const ryan = findRyan(athletes)

  useEffect(() => {
    void listFeedPosts().then(setPosts)
  }, [])

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
          Post a clip of a hit. Coaches tag athletes. Athletes tag their coach. Ryan
          stays the gym coach/admin — that profile still edits Compare, Learn copy, and
          the rest of the app.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        {!athlete ? (
          <p className="text-sm text-[var(--muted)]">
            Unlock a profile on Athletes to post. Anyone can still watch the feed.
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
                  ? 'What did they hit? Tag the athlete below.'
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
          No posts yet. First hit of the day can live here.
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
                <video
                  src={post.url}
                  controls
                  playsInline
                  className="max-h-[520px] w-full bg-black object-contain"
                />
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
