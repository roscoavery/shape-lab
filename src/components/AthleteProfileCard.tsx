import { useEffect, useMemo, useRef, useState } from 'react'
import type { Athlete, ProfileGesture } from '../types'
import { AthleteAvatar } from './AthleteAvatar'
import { profileFactLines, shoulderFirstPost } from '../lib/athleteFacts'
import { canWriteCoachNotes, visibleCoachNotes } from '../lib/athleteNotes'
import {
  canGiveHi5,
  isAthleteProfile,
  isCoachProfile,
  isGymAdmin,
  profileRole,
  roleLabel,
} from '../lib/profileRole'
import { childNamesLabel, parentsOf } from '../lib/parentLink'
import {
  listFeedPosts,
  postOnChannel,
  profilePasses,
  profilePosts,
  publishFeedPostResult,
  toggleFeedRepost,
  removeFeedPost,
  type FeedPost,
} from '../lib/feedPosts'
import { WinComposer } from './feed/WinComposer'
import { profileThemeStyle } from '../lib/profileTheme'
import { handstandContest } from '../lib/intakeQuestions'
import { createId } from '../lib/storage'
import { pushNotice } from '../lib/notify'
import { givenName } from '../lib/classStation'
import { mentionLabel, profileHandle, taggedIdsFromText } from '../lib/profileHandle'
import { MentionText } from './MentionText'
import { ProfileHighlights } from './stories/ProfileHighlights'
import { StoryComposer } from './stories/StoryComposer'
import { StoryViewer } from './stories/StoryViewer'
import { ProfileFieldsEditor } from './today/ProfileFieldsEditor'
import { CoachAthleteActivity } from './CoachAthleteActivity'
import {
  canSeePrivateCoaching,
  coachesLabel,
  coachesOf,
  showsCoachesOnProfile,
} from '../lib/coachLink'
import {
  loadStories,
  markStoriesSeen,
  seenStoryIds,
  storiesByAuthor,
  type GymStory,
  type StoriesFile,
} from '../lib/stories'
import { fileToClipBlob, recordQuickClip } from '../lib/quickClip'
import { FollowButton } from './network/FollowButton'
import { DeleteProfileAsk } from './DeleteProfileAsk'
import { playGestureBurst } from '../lib/gestureBurst'
import { isRyanAthlete } from '../lib/ryanProfile'

type Tab = 'posts' | 'passes' | 'stories'
type Compose = 'story' | 'post' | 'pass' | null

type Props = {
  athlete: Athlete
  viewer: Athlete | null
  athletes?: Athlete[]
  variant?: 'page' | 'overlay' | 'embed'
  onClose?: () => void
  onAddNote?: (text: string) => void
  onAddWin?: (text: string, big: boolean) => void
  onAthleteChange?: (next: Athlete) => void
  /** Gym admin only — delete this profile after an are-you-sure. */
  onDeleteProfile?: (id: string) => void
}

export function AthleteProfileCard({
  athlete,
  viewer,
  athletes = [],
  variant = 'page',
  onClose,
  onAddNote,
  onAddWin,
  onAthleteChange,
  onDeleteProfile,
}: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [storiesFile, setStoriesFile] = useState<StoriesFile>({ stories: [], highlights: [] })
  const [tab, setTab] = useState<Tab>('posts')
  const [compose, setCompose] = useState<Compose>(null)
  const [watchStories, setWatchStories] = useState<GymStory[] | null>(null)
  const [watchPass, setWatchPass] = useState<FeedPost | null>(null)
  const [storySheet, setStorySheet] = useState(false)
  const [editAnswers, setEditAnswers] = useState(false)
  const [seenTick, setSeenTick] = useState(0)
  const [note, setNote] = useState('')
  const [win, setWin] = useState('')
  const [big, setBig] = useState(false)
  const [winError, setWinError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [askDelete, setAskDelete] = useState(false)
  const adminDelete =
    Boolean(onDeleteProfile) && isGymAdmin(viewer) && !isRyanAthlete(athlete)
  const facts = profileFactLines(athlete)
  const first = shoulderFirstPost(athlete.openShoulderHardness)
  const notes = visibleCoachNotes(athlete, viewer)
  const privateOk = canSeePrivateCoaching(viewer, athlete)
  const writeNotes = privateOk && canWriteCoachNotes(viewer) && Boolean(onAddNote)
  const writeWin = canWriteCoachNotes(viewer) && Boolean(onAddWin)
  const write = writeNotes || writeWin
  const contest = handstandContest(athlete)
  const own = viewer?.id === athlete.id
  const coach = isCoachProfile(viewer)
  const theirCoaches = coachesOf(athlete, athletes)
  const gestureOk =
    Boolean(viewer) && !own && canGiveHi5(viewer) && isAthleteProfile(athlete)
  const handle = mentionLabel(athlete)
  const live = useMemo(
    () => storiesByAuthor(storiesFile, athlete.id, true),
    [storiesFile, athlete.id],
  )
  const unseenLive = useMemo(() => {
    void seenTick
    const seen = seenStoryIds()
    return live.some((s) => !seen.has(s.id))
  }, [live, seenTick])
  const minePosts = useMemo(() => profilePosts(posts, athlete.id), [posts, athlete.id])
  const minePasses = useMemo(() => profilePasses(posts, athlete.id), [posts, athlete.id])

  const reloadFeed = () => {
    void listFeedPosts().then(setPosts)
  }
  const reloadStories = () => {
    void loadStories().then(setStoriesFile)
  }

  useEffect(() => {
    reloadFeed()
    reloadStories()
  }, [athlete.id])

  const gesture = async (kind: ProfileGesture['kind']) => {
    if (!viewer || viewer.id === athlete.id) return
    const row: ProfileGesture = {
      id: createId('gs'),
      kind,
      fromId: viewer.id,
      fromName: viewer.name,
      createdAt: new Date().toISOString(),
    }
    onAthleteChange?.({ ...athlete, gestures: [row, ...(athlete.gestures ?? [])].slice(0, 80) })
    playGestureBurst(kind)
    const who = givenName(athlete)
    const youDid = kind === 'hi5' ? `You high-fived ${who}` : `You fist bumped ${who}`
    const theyGot =
      kind === 'hi5'
        ? `${givenName(viewer)} high-fived you`
        : `${givenName(viewer)} fist bumped you`
    setConfirm(youDid)
    await pushNotice({
      toId: athlete.id,
      kind,
      title: theyGot,
      body: `${youDid}. Open Alerts on their profile to send one back.`,
      href: 'today',
    })
    window.setTimeout(() => setConfirm((cur) => (cur === youDid ? null : cur)), 4200)
  }

  const viewStories = () => {
    if (!live.length) return
    markStoriesSeen(live.map((s) => s.id))
    setSeenTick((n) => n + 1)
    setWatchStories(live)
    setStorySheet(false)
  }

  const openStories = () => {
    if (own) {
      setStorySheet(true)
      return
    }
    viewStories()
  }

  const body = (
    <div className="flex flex-col gap-5">
      <header className="flex items-start gap-4">
        <button type="button" onClick={openStories} className="shrink-0">
          <span
            className={`block rounded-full p-[3px] ${
              live.length
                ? unseenLive
                  ? 'bg-gradient-to-tr from-[#f77737] via-[#e1306c] to-[#5cf0c8]'
                  : 'bg-white/30'
                : 'bg-white/15'
            }`}
          >
            <span className="relative block rounded-full bg-black p-[2px]">
              <AthleteAvatar athlete={athlete} size="xl" />
              {own && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[#06281f]">
                  +
                </span>
              )}
            </span>
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--profile-accent,var(--accent))]">
            {roleLabel(athlete)}
          </p>
          <h2 className="mt-0.5 text-2xl font-bold tracking-tight">
            {athlete.name}
            {contest ? ' 🤸' : ''}
          </h2>
          <p className="text-sm font-medium text-[var(--accent)]">{handle}</p>
          {athlete.instagramHandle && profileHandle(athlete) !== athlete.instagramHandle && (
            <p className="text-xs text-[var(--muted)]">IG @{athlete.instagramHandle}</p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat n={minePosts.length} label="Posts" onClick={() => setTab('posts')} />
            <Stat n={minePasses.length} label="Passes" onClick={() => setTab('passes')} />
            <Stat n={live.length} label="Stories" onClick={() => setTab('stories')} />
          </div>
          {viewer && viewer.id !== athlete.id && (
            <div className="mt-3">
              <FollowButton viewer={viewer} person={athlete} variant="row" />
            </div>
          )}
        </div>
      </header>

      {first && (
        <p className="text-base font-medium italic leading-snug text-[var(--text)]">“{first}”</p>
      )}
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {facts.slice(0, 6).map((row) => (
            <span
              key={row.label}
              className="rounded-full bg-black/30 px-2.5 py-1 text-[11px] text-[var(--muted)]"
            >
              <span className="text-white/70">{row.label}</span> {row.value}
            </span>
          ))}
        </div>
      )}
      {theirCoaches.length > 0 &&
        isAthleteProfile(athlete) &&
        (showsCoachesOnProfile(athlete) || own || privateOk) && (
        <p className="text-xs text-[var(--muted)]">
          Coaches{!showsCoachesOnProfile(athlete) && own ? ' (only you and them see this)' : ''}:{' '}
          {coachesLabel(athlete, athletes)}
        </p>
      )}
      {parentsOf(athlete.id, athletes).length > 0 && (
        <p className="text-xs text-[var(--muted)]">
          Parent{parentsOf(athlete.id, athletes).length === 1 ? '' : 's'}:{' '}
          {parentsOf(athlete.id, athletes).map((p) => p.name).join(', ')}
        </p>
      )}
      {profileRole(athlete) === 'parent' && childNamesLabel(athlete, athletes) && (
        <p className="text-xs text-[var(--muted)]">Parent of {childNamesLabel(athlete, athletes)}</p>
      )}
      {contest && (
        <p className="text-sm font-semibold" style={{ color: 'var(--profile-accent, var(--accent))' }}>
          Handstand contest anyone?
        </p>
      )}

      {own && (
        <div className="grid grid-cols-3 gap-2">
          <ShareBtn label="Story" hint="24 hours" onClick={() => setCompose('story')} />
          <ShareBtn label="Post" hint="Feed + page" onClick={() => setCompose('post')} />
          <ShareBtn label="Pass" hint="Short clip" onClick={() => setCompose('pass')} />
        </div>
      )}
      {own && onAthleteChange && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setEditAnswers((v) => !v)}
            className="self-start rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold"
          >
            {editAnswers ? 'Done editing' : 'Edit photo and answers'}
          </button>
          {editAnswers && (
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <ProfileFieldsEditor
              athlete={athlete}
              athletes={athletes}
              onChange={onAthleteChange}
            />
            </div>
          )}
        </div>
      )}
      {storySheet && own && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#121820] p-3">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Your story
            </p>
            {live.length > 0 && (
              <button
                type="button"
                onClick={viewStories}
                className="mt-1 w-full rounded-xl px-3 py-3 text-left text-sm font-semibold"
              >
                View story
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setStorySheet(false)
                setCompose('story')
              }}
              className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold"
            >
              Add to story
            </button>
            {onAthleteChange && (
              <button
                type="button"
                onClick={() => {
                  setStorySheet(false)
                  setEditAnswers(true)
                }}
                className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold"
              >
                Edit profile photo
              </button>
            )}
            <button
              type="button"
              onClick={() => setStorySheet(false)}
              className="mt-1 w-full rounded-xl px-3 py-2 text-sm text-[var(--muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {gestureOk && viewer && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void gesture('hi5')}
            className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold"
          >
            High five
          </button>
          {coach && (
            <button
              type="button"
              onClick={() => void gesture('fist')}
              className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold"
            >
              Fist bump
            </button>
          )}
          {confirm && <p className="text-sm font-semibold text-[var(--accent)]">{confirm}</p>}
        </div>
      )}

      {(athlete.gestures ?? []).length > 0 && (
        <p className="text-xs text-[var(--muted)]">
          {(athlete.gestures ?? []).slice(0, 4).map((g) => (
            <span key={g.id} className="mr-2">
              {g.kind === 'hi5' ? 'High five' : 'Fist bump'} · {g.fromName}
            </span>
          ))}
        </p>
      )}

      <ProfileHighlights athlete={athlete} viewer={viewer} athletes={athletes} />

      {compose === 'post' && viewer && (
        <section className="rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              New post
            </p>
            <button type="button" onClick={() => setCompose(null)} className="text-xs text-[var(--muted)]">
              Close
            </button>
          </div>
          <WinComposer
            athlete={viewer}
            athletes={athletes}
            taggedIds={own ? [] : [athlete.id]}
            channels={['gym']}
            placeholder='A thought, a hit, or a clip. Tag with @handle or @"Name".'
            submitLabel="Share post"
            onPosted={() => {
              setCompose(null)
              reloadFeed()
            }}
          />
        </section>
      )}
      {compose === 'pass' && viewer && (
        <PassComposer
          athlete={viewer}
          athletes={athletes}
          onClose={() => setCompose(null)}
          onPosted={() => {
            setCompose(null)
            reloadFeed()
          }}
        />
      )}
      {compose === 'story' && viewer && (
        <StoryComposer
          athlete={viewer}
          athletes={athletes}
          onClose={() => setCompose(null)}
          onPosted={() => {
            setCompose(null)
            reloadStories()
          }}
        />
      )}

      <div className="flex border-b border-white/10">
        {(
          [
            ['posts', 'Posts'],
            ['passes', 'Passes'],
            ['stories', 'Stories'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] ${
              tab === id
                ? 'border-b-2 border-[var(--accent)] text-white'
                : 'text-[var(--muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'posts' && (
        <PostsGrid
          items={minePosts}
          athlete={athlete}
          viewer={viewer}
          athletes={athletes}
          onChange={setPosts}
        />
      )}
      {tab === 'passes' && (
        <PassesGrid
          items={minePasses}
          athlete={athlete}
          viewer={viewer}
          onOpen={setWatchPass}
          onChange={setPosts}
        />
      )}
      {tab === 'stories' && (
        <StoriesGrid
          items={live}
          own={own}
          onAdd={() => setCompose('story')}
          onOpen={(items) => {
            markStoriesSeen(items.map((s) => s.id))
            setWatchStories(items)
          }}
        />
      )}

      <CoachAthleteActivity
        athlete={athlete}
        viewer={viewer}
        athletes={athletes}
        compact={variant === 'embed'}
      />

      {viewer && (privateOk || notes.length > 0) && (coach || notes.length > 0) && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Notes
          </p>
          {notes.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--muted)]">No notes filed yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {notes.slice(0, 16).map((n) => (
                <li key={n.id} className="rounded-lg bg-black/25 px-3 py-2 text-sm">
                  {n.topicLabel && (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                      {n.topicLabel}
                    </p>
                  )}
                  <p>{n.text}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {n.authorName}
                    {n.className ? ` · ${n.className}` : ''}
                    {' · '}
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {write && (
        <section className="flex flex-col gap-2">
          {writeNotes && onAddNote && (
            <div className="flex flex-col gap-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={`Note about ${athlete.name}…`}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!note.trim()}
                onClick={() => {
                  onAddNote(note.trim())
                  setNote('')
                }}
                className="h-11 rounded-xl bg-[var(--accent)] text-sm font-bold text-[#06281f] disabled:opacity-40"
              >
                Save note
              </button>
            </div>
          )}
          {onAddWin && (
            <div className="flex flex-col gap-2">
              <input
                value={win}
                onChange={(e) => setWin(e.target.value)}
                placeholder="A win to log…"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={big} onChange={(e) => setBig(e.target.checked)} />
                Big win — also the gym feed
              </label>
              {winError && <p className="text-sm text-[var(--bad)]">{winError}</p>}
              <button
                type="button"
                disabled={!win.trim()}
                onClick={() => {
                  setWinError(null)
                  onAddWin(win.trim(), big)
                  setWin('')
                }}
                className="h-11 rounded-xl bg-white/10 text-sm font-semibold disabled:opacity-40"
              >
                Post win
              </button>
            </div>
          )}
        </section>
      )}

      {watchStories && (
        <StoryViewer
          items={watchStories}
          athletes={athletes}
          viewer={viewer}
          highlights={viewer ? storiesFile.highlights.filter((h) => h.ownerId === viewer.id) : []}
          onClose={() => setWatchStories(null)}
          onHighlightSaved={reloadStories}
        />
      )}
      {watchPass && (
        <PassViewer post={watchPass} onClose={() => setWatchPass(null)} />
      )}

      {adminDelete && (
        <div className="mt-8 border-t border-white/10 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Admin
          </p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[var(--bad)] underline"
            onClick={() => setAskDelete(true)}
          >
            Delete this profile
          </button>
        </div>
      )}
      {askDelete && (
        <DeleteProfileAsk
          athlete={athlete}
          onKeep={() => setAskDelete(false)}
          onDelete={() => {
            setAskDelete(false)
            onDeleteProfile?.(athlete.id)
          }}
        />
      )}
    </div>
  )

  const shellStyle = profileThemeStyle(athlete.favoriteColor)

  if (variant === 'overlay') {
    return (
      <div className="fixed inset-0 z-[85] flex flex-col text-[var(--text)]" style={shellStyle}>
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--profile-accent)' }}>
            {own ? 'My profile' : handle}
          </p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold"
            >
              Close
            </button>
          )}
        </header>
        <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-10">{body}</div>
      </div>
    )
  }

  return (
    <section
      className={
        variant === 'embed'
          ? 'rounded-xl border border-white/10 p-4'
          : 'rounded-2xl border border-white/10 p-5'
      }
      style={shellStyle}
    >
      {body}
    </section>
  )
}

function Stat({ n, label, onClick }: { n: number; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl bg-black/25 py-2">
      <span className="block text-lg font-bold leading-none">{n}</span>
      <span className="mt-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</span>
    </button>
  )
}

function ShareBtn({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/10 bg-black/30 px-2 py-2.5 text-center"
    >
      <span className="block text-sm font-bold">{label}</span>
      <span className="block text-[10px] text-[var(--muted)]">{hint}</span>
    </button>
  )
}

function PostsGrid({
  items,
  athlete,
  viewer,
  athletes,
  onChange,
}: {
  items: FeedPost[]
  athlete: Athlete
  viewer: Athlete | null
  athletes: Athlete[]
  onChange: (next: FeedPost[] | ((prev: FeedPost[]) => FeedPost[])) => void
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-[var(--muted)]">
        No posts on this profile yet. Only what they share lands here.
      </p>
    )
  }
  return (
    <ul className="space-y-3">
      {items.map((p) => {
        const reposted = viewer ? (p.reposts ?? []).includes(viewer.id) : false
        const win = postOnChannel(p, 'wins')
        return (
          <li key={p.id} className="overflow-hidden rounded-2xl bg-black/30">
            {p.url && p.kind !== 'text' && p.kind !== 'collage' && (
              <video src={p.url} controls playsInline className="max-h-80 w-full bg-black object-contain" />
            )}
            <div className="px-3 py-3">
              {win && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">Win</p>
              )}
              {p.authorId !== athlete.id && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Repost</p>
              )}
              {p.caption && (
                <p className="text-sm">
                  <MentionText text={p.caption} athletes={athletes} />
                </p>
              )}
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {new Date(p.createdAt).toLocaleString()}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
              {viewer && viewer.id !== p.authorId && (
                <button
                  type="button"
                  onClick={() => {
                    void toggleFeedRepost(p.id, viewer.id).then((next) => {
                      if (!next) return
                      onChange((prev) => prev.map((row) => (row.id === next.id ? next : row)))
                    })
                  }}
                  className="text-xs font-semibold text-[var(--accent)]"
                >
                  {reposted ? 'On your profile' : 'Repost to your profile'}
                </button>
              )}
              {viewer && (viewer.id === p.authorId || viewer.id === athlete.id) && (
                <button
                  type="button"
                  onClick={() => {
                    void removeFeedPost(p.id, viewer.id, false).then((ok) => {
                      if (ok) onChange((prev) => prev.filter((row) => row.id !== p.id))
                    })
                  }}
                  className="text-xs font-semibold text-[var(--muted)] underline"
                >
                  Remove
                </button>
              )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function PassesGrid({
  items,
  athlete,
  viewer,
  onOpen,
  onChange,
}: {
  items: FeedPost[]
  athlete: Athlete
  viewer: Athlete | null
  onOpen: (post: FeedPost) => void
  onChange: (next: FeedPost[] | ((prev: FeedPost[]) => FeedPost[])) => void
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-[var(--muted)]">
        No passes yet. A pass is a short vertical clip — Shape Lab’s take on a reel.
      </p>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onOpen(p)}
          className="relative aspect-[9/16] overflow-hidden bg-black"
        >
          {p.url ? (
            <video src={p.url} muted playsInline className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center px-1 text-[10px] text-white/70">
              {p.caption || 'Pass'}
            </span>
          )}
          {p.authorId !== athlete.id && (
            <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-semibold">
              Repost
            </span>
          )}
          {viewer && viewer.id !== p.authorId && (
            <span
              role="presentation"
              onClick={(e) => {
                e.stopPropagation()
                void toggleFeedRepost(p.id, viewer.id).then((next) => {
                  if (!next) return
                  onChange((prev) => prev.map((row) => (row.id === next.id ? next : row)))
                })
              }}
              className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] font-semibold text-[var(--accent)]"
            >
              {(p.reposts ?? []).includes(viewer.id) ? 'Yours' : '+'}
            </span>
          )}
          {viewer && (viewer.id === p.authorId || viewer.id === athlete.id) && (
            <span
              role="presentation"
              onClick={(e) => {
                e.stopPropagation()
                void removeFeedPost(p.id, viewer.id, false).then((ok) => {
                  if (ok) onChange((prev) => prev.filter((row) => row.id !== p.id))
                })
              }}
              className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[9px] font-semibold"
            >
              Remove
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function StoriesGrid({
  items,
  own,
  onAdd,
  onOpen,
}: {
  items: GymStory[]
  own: boolean
  onAdd: () => void
  onOpen: (items: GymStory[]) => void
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center">
        <p className="text-sm text-[var(--muted)]">
          Stories live 24 hours. Highlights on this page keep the ones they save.
        </p>
        {own && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-bold text-[#06281f]"
          >
            Add a story
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-1">
      {own && (
        <button
          type="button"
          onClick={onAdd}
          className="flex aspect-[9/16] flex-col items-center justify-center rounded-lg border border-dashed border-white/25 text-sm text-white/70"
        >
          +
          <span className="mt-1 text-[10px]">Story</span>
        </button>
      )}
      {items.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onOpen(items.slice(i).concat(items.slice(0, i)))}
          className="relative aspect-[9/16] overflow-hidden bg-black"
        >
          {s.mime.startsWith('image/') ? (
            <img src={s.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <video src={s.url} muted playsInline className="h-full w-full object-cover" />
          )}
        </button>
      ))}
    </div>
  )
}

function PassComposer({
  athlete,
  athletes,
  onClose,
  onPosted,
}: {
  athlete: Athlete
  athletes: Athlete[]
  onClose: () => void
  onPosted: () => void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const post = async (blob: Blob) => {
    setBusy('Posting…')
    try {
      const tags = taggedIdsFromText(caption, athletes)
      const result = await publishFeedPostResult({
        authorId: athlete.id,
        caption,
        taggedIds: tags,
        blob,
        channels: ['passes', 'gym'],
      })
      if (!result.post) throw new Error(result.error || 'Could not post that pass.')
      for (const id of tags) {
        if (id === athlete.id) continue
        void pushNotice({
          toId: id,
          kind: 'share',
          title: `${athlete.name} tagged you in a pass`,
          body: caption.trim() || 'Open their profile.',
          href: 'feed',
        })
      }
      onPosted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post that pass.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          New pass
        </p>
        <button type="button" onClick={onClose} className="text-xs text-[var(--muted)]">
          Close
        </button>
      </div>
      <p className="text-sm text-[var(--muted)]">
        A short vertical clip — Shape Lab’s version of a reel or Short. It lands
        on this profile under Passes and on the gym feed.
      </p>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={180}
        placeholder='Caption — @handle or @"Name"'
        className="mt-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => {
            setError(null)
            setBusy('Recording…')
            void recordQuickClip(15)
              .then((blob) => post(blob))
              .catch((err) => {
                setBusy(null)
                setError(err instanceof Error ? err.message : 'Could not record.')
              })
          }}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-bold text-[#06281f] disabled:opacity-40"
        >
          {busy === 'Recording…' ? 'Recording 15s…' : 'Record 15s'}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold disabled:opacity-40"
        >
          From Photos
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
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
      {busy && busy !== 'Recording…' && <p className="mt-2 text-sm text-[var(--accent)]">{busy}</p>}
      {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}
    </section>
  )
}

function PassViewer({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[280] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold">Pass</p>
        <button type="button" onClick={onClose} className="text-sm text-white/70">
          Close
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {post.url ? (
          <video src={post.url} autoPlay controls playsInline className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="px-6 text-center">{post.caption}</p>
        )}
      </div>
      {post.caption && <p className="px-4 py-3 text-sm">{post.caption}</p>}
    </div>
  )
}
