/**
 * Network — follow people on this gym, message them, and (coaches) talk
 * philosophy in the lounge.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Athlete } from '../../types'
import { isCoachProfile, roleLabel } from '../../lib/profileRole'
import { AthleteName } from '../AthleteAvatar'
import {
  followerCount,
  followingCount,
  isFollowing,
  loadSocial,
  otherParticipant,
  saveSocial,
  sendMessage,
  threadsFor,
  toggleFollow,
  type SocialFile,
} from '../../lib/social'
import {
  DISCUSS_BODY_MAX,
  DISCUSS_REASON_MAX,
  loadDiscuss,
  replyToThread,
  saveDiscuss,
  startThread,
  type DiscussFile,
  type DiscussThread,
} from '../../lib/discuss'
import { DISCUSS_TOPICS, discussTopicById } from '../../config/discussTopics'
import { discussDigest } from '../../lib/discussStats'
import { SegmentedTabs } from '../SegmentedTabs'

type Page = 'people' | 'messages' | 'lounge'

type Props = {
  athletes: Athlete[]
  athlete: Athlete | null
  onViewProfile?: (id: string) => void
}

export function NetworkPanel({ athletes, athlete, onViewProfile }: Props) {
  const [page, setPage] = useState<Page>('people')
  const [social, setSocial] = useState<SocialFile | null>(null)
  const [discuss, setDiscuss] = useState<DiscussFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [threadToId, setThreadToId] = useState('')
  const coach = isCoachProfile(athlete)

  useEffect(() => {
    void loadSocial().then(setSocial)
    void loadDiscuss().then(setDiscuss)
  }, [])

  const persistSocial = async (next: SocialFile) => {
    const saved = await saveSocial(next)
    if (!saved) {
      setError('Could not save on this gym computer.')
      return
    }
    setSocial(saved)
    setError(null)
  }

  const persistDiscuss = async (next: DiscussFile) => {
    const saved = await saveDiscuss(next)
    if (!saved) {
      setError('Could not save on this gym computer.')
      return
    }
    setDiscuss(saved)
    setError(null)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Network
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text)]">People, messages, lounge</h2>
        <div className="mt-3">
          <SegmentedTabs
            value={page}
            onChange={setPage}
            tabs={[
              { id: 'people', label: 'People' },
              { id: 'messages', label: 'Messages' },
              { id: 'lounge', label: 'Coach lounge' },
            ]}
          />
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-[var(--bad)]/40 bg-[#2a1518] px-4 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      )}

      {!social && page !== 'lounge' && (
        <p className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          Loading gym network…
        </p>
      )}
      {page === 'lounge' && !discuss && (
        <p className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          Loading lounge…
        </p>
      )}

      {!athlete && (
        <p className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-4 text-sm text-[var(--muted)]">
          Unlock a profile on Profiles to follow, message, or (if you are a coach)
          post in the lounge. Anyone can still read the lounge digest on Research.
        </p>
      )}

      {page === 'people' && social && (
        <PeoplePage
          athletes={athletes}
          me={athlete}
          social={social}
          onViewProfile={onViewProfile}
          onFollow={(id) => {
            if (!athlete) return
            void persistSocial(toggleFollow(social, athlete.id, id))
          }}
          onMessage={(id) => {
            setThreadToId(id)
            setPage('messages')
          }}
        />
      )}

      {page === 'messages' && social && (
        <MessagesPage
          athletes={athletes}
          me={athlete}
          social={social}
          toId={threadToId}
          onToId={setThreadToId}
          onSend={(toId, text, shareUrl) => {
            if (!athlete) return
            void persistSocial(sendMessage(social, { fromId: athlete.id, toId, text, shareUrl }))
          }}
        />
      )}

      {page === 'lounge' && discuss && (
        <LoungePage
          athletes={athletes}
          me={athlete}
          coach={coach}
          file={discuss}
          onStart={(title, topicId, body, reasoning) => {
            if (!athlete || !coach) return
            void persistDiscuss(
              startThread(discuss, {
                authorId: athlete.id,
                title,
                topicId,
                body,
                reasoning,
              }),
            )
          }}
          onReply={(threadId, body, reasoning) => {
            if (!athlete || !coach) return
            void persistDiscuss(
              replyToThread(discuss, { threadId, authorId: athlete.id, body, reasoning }),
            )
          }}
        />
      )}
    </div>
  )
}

function PeoplePage({
  athletes,
  me,
  social,
  onFollow,
  onMessage,
  onViewProfile,
}: {
  athletes: Athlete[]
  me: Athlete | null
  social: SocialFile
  onFollow: (id: string) => void
  onMessage: (id: string) => void
  onViewProfile?: (id: string) => void
}) {
  const others = athletes.filter((a) => a.id !== me?.id)
  if (others.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No other profiles on this gym yet. Create them on Profiles.
      </p>
    )
  }
  return (
    <ul className="space-y-2">
      {others.map((person) => {
        const following = me ? isFollowing(social, me.id, person.id) : false
        return (
          <li
            key={person.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--text)]">
                <AthleteName athlete={person} nameClassName="font-semibold" />
                <span className="text-xs font-normal text-[var(--muted)]">
                  {' '}
                  · {roleLabel(person)}
                </span>
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                {[person.gymName, person.childName ? `athlete ${person.childName}` : null]
                  .filter(Boolean)
                  .join(' · ')}
                {person.gymName || person.childName ? ' · ' : ''}
                {followerCount(social, person.id)} follower
                {followerCount(social, person.id) === 1 ? '' : 's'} · following{' '}
                {followingCount(social, person.id)}
              </p>
            </div>
            {onViewProfile && (
              <button
                type="button"
                onClick={() => onViewProfile(person.id)}
                className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold"
              >
                View
              </button>
            )}
            {me && (
              <>
                <button
                  type="button"
                  onClick={() => onFollow(person.id)}
                  className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs"
                >
                  {following ? 'Following' : 'Follow'}
                </button>
                <button
                  type="button"
                  onClick={() => onMessage(person.id)}
                  className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-medium text-white"
                >
                  Message
                </button>
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function MessagesPage({
  athletes,
  me,
  social,
  toId,
  onToId,
  onSend,
}: {
  athletes: Athlete[]
  me: Athlete | null
  social: SocialFile
  toId: string
  onToId: (id: string) => void
  onSend: (toId: string, text: string, shareUrl?: string) => void
}) {
  const [text, setText] = useState('')
  const [shareUrl, setShareUrl] = useState('')

  const mine = me ? threadsFor(social, me.id) : []
  const active = useMemo(() => {
    if (!me || !toId) return null
    return mine.find((t) => t.participantIds.includes(toId)) ?? null
  }, [mine, me, toId])

  if (!me) return null

  const send = () => {
    if (!toId || !text.trim()) return
    onSend(toId, text, shareUrl.trim() || undefined)
    setText('')
    setShareUrl('')
  }

  return (
    <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Conversations
        </p>
        {mine.length === 0 && (
          <p className="text-xs text-[var(--muted)]">None yet. Pick someone to message.</p>
        )}
        {mine.map((t) => {
          const otherId = otherParticipant(t, me.id)
          const other = athletes.find((a) => a.id === otherId)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToId(otherId)}
              className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                toId === otherId
                  ? 'bg-[var(--accent-dim)] text-white'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {other?.name ?? otherId}
            </button>
          )
        })}
        <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          New message
          <select
            className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-[var(--text)]"
            value={toId}
            onChange={(e) => onToId(e.target.value)}
          >
            <option value="">Pick a profile…</option>
            {athletes
              .filter((a) => a.id !== me.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {roleLabel(a)}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        {!toId ? (
          <p className="text-sm text-[var(--muted)]">Choose someone to start talking.</p>
        ) : (
          <>
            <div className="mb-3 max-h-64 space-y-2 overflow-y-auto panel-scroll">
              {(active?.messages ?? []).map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    m.authorId === me.id
                      ? 'ml-8 bg-[var(--accent-dim)]/40 text-[var(--text)]'
                      : 'mr-8 bg-[#0d1218] text-[var(--muted)]'
                  }`}
                >
                  <p>{m.text}</p>
                  {m.shareUrl && (
                    <a
                      href={m.shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-[11px] text-[var(--accent)] underline"
                    >
                      {m.shareUrl}
                    </a>
                  )}
                </div>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="Write a message…"
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            />
            <input
              value={shareUrl}
              onChange={(e) => setShareUrl(e.target.value)}
              placeholder="Optional — paste a public video URL to share"
              className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={send}
              className="mt-2 rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-medium text-white"
            >
              Send
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function LoungePage({
  athletes,
  me,
  coach,
  file,
  onStart,
  onReply,
}: {
  athletes: Athlete[]
  me: Athlete | null
  coach: boolean
  file: DiscussFile
  onStart: (title: string, topicId: string, body: string, reasoning: string) => void
  onReply: (threadId: string, body: string, reasoning: string) => void
}) {
  const [openId, setOpenId] = useState<string | null>(file.threads[0]?.id ?? null)
  const [title, setTitle] = useState('')
  const [topicId, setTopicId] = useState(DISCUSS_TOPICS[0]!.id)
  const [body, setBody] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [reply, setReply] = useState('')
  const [replyWhy, setReplyWhy] = useState('')
  const digest = discussDigest(file)
  const open = file.threads.find((t) => t.id === openId) ?? null
  const nameOf = (id: string) => athletes.find((a) => a.id === id)?.name ?? 'Coach'
  const threadCount = file.threads.length
  const prevCount = useRef(threadCount)

  useEffect(() => {
    if (threadCount > prevCount.current) {
      setOpenId(file.threads[0]?.id ?? null)
    }
    prevCount.current = threadCount
  }, [threadCount, file.threads])

  if (!coach) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-4 text-sm text-[var(--muted)]">
        The lounge is for coach profiles. Unlock a coach profile to post. Research
        still counts the threads — {digest.threadCount} so far
        {digest.postCount ? `, ${digest.postCount} posts` : ''}.
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Start a thread</h3>
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          Tag the philosophy so we can later see what coaches argue about. The
          reasoning box is the “why I coach it this way” line Research reads.
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Thread title"
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        />
        <select
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        >
          {DISCUSS_TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={DISCUSS_BODY_MAX}
          rows={4}
          placeholder="What do you think?"
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        />
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          maxLength={DISCUSS_REASON_MAX}
          rows={2}
          placeholder="Why — the gym reason, not just the slogan"
          className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            if (!title.trim() || !body.trim()) return
            onStart(title, topicId, body, reasoning)
            setTitle('')
            setBody('')
            setReasoning('')
          }}
          disabled={!me}
          className="mt-2 rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Post thread
        </button>
      </section>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-1">
          {file.threads.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No threads yet. Start one.</p>
          )}
          {file.threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpenId(t.id)}
              className={`block w-full rounded-lg px-2 py-2 text-left text-sm ${
                openId === t.id
                  ? 'bg-[var(--accent-dim)] text-white'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              <span className="block truncate font-medium">{t.title}</span>
              <span className="block text-[10px] opacity-80">
                {discussTopicById(t.topicId)?.name} · {t.posts.length} post
                {t.posts.length === 1 ? '' : 's'}
              </span>
            </button>
          ))}
        </div>
        {open && (
          <ThreadView
            thread={open}
            nameOf={nameOf}
            canReply={Boolean(me)}
            reply={reply}
            replyWhy={replyWhy}
            onReplyChange={setReply}
            onWhyChange={setReplyWhy}
            onSubmit={() => {
              if (!reply.trim()) return
              onReply(open.id, reply, replyWhy)
              setReply('')
              setReplyWhy('')
            }}
          />
        )}
      </div>
    </div>
  )
}

function ThreadView({
  thread,
  nameOf,
  canReply,
  reply,
  replyWhy,
  onReplyChange,
  onWhyChange,
  onSubmit,
}: {
  thread: DiscussThread
  nameOf: (id: string) => string
  canReply: boolean
  reply: string
  replyWhy: string
  onReplyChange: (v: string) => void
  onWhyChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <article className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        {discussTopicById(thread.topicId)?.name}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">{thread.title}</h3>
      <div className="mt-3 space-y-3">
        {thread.posts.map((p) => (
          <div key={p.id} className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2">
            <p className="text-[11px] text-[var(--muted)]">
              {nameOf(p.authorId)} · {new Date(p.createdAt).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-[var(--text)]">{p.body}</p>
            {p.reasoning && (
              <p className="mt-2 border-t border-[var(--panel-border)] pt-2 text-[12px] text-[var(--muted)]">
                <span className="font-semibold text-[var(--accent)]">Why: </span>
                {p.reasoning}
              </p>
            )}
          </div>
        ))}
      </div>
      {canReply && (
        <div className="mt-3">
          <textarea
            value={reply}
            onChange={(e) => onReplyChange(e.target.value)}
            rows={3}
            placeholder="Reply"
            className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          />
          <textarea
            value={replyWhy}
            onChange={(e) => onWhyChange(e.target.value)}
            rows={2}
            placeholder="Why you see it that way (optional, but this is what Research counts)"
            className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onSubmit}
            className="mt-2 rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-medium text-white"
          >
            Reply
          </button>
        </div>
      )}
    </article>
  )
}
