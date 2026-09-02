import { useEffect, useState } from 'react'
import type { Athlete, ProfileGesture } from '../types'
import { AthleteAvatar } from './AthleteAvatar'
import { profileFactLines, shoulderFirstPost } from '../lib/athleteFacts'
import { canWriteCoachNotes, visibleCoachNotes } from '../lib/athleteNotes'
import { isCoachProfile, isGymAdmin, profileRole, roleLabel } from '../lib/profileRole'
import { childNamesLabel, parentsOf } from '../lib/parentLink'
import {
  listFeedPosts,
  postOnChannel,
  type FeedPost,
} from '../lib/feedPosts'
import { WinComposer } from './feed/WinComposer'
import { profileThemeStyle } from '../lib/profileTheme'
import { handstandContest } from '../lib/intakeQuestions'
import { createId } from '../lib/storage'
import { pushNotice } from '../lib/notify'
import { givenName } from '../lib/classStation'

type Props = {
  athlete: Athlete
  viewer: Athlete | null
  athletes?: Athlete[]
  variant?: 'page' | 'overlay' | 'embed'
  onClose?: () => void
  onAddNote?: (text: string) => void
  onAddWin?: (text: string, big: boolean) => void
  onAthleteChange?: (next: Athlete) => void
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
}: Props) {
  const [wins, setWins] = useState<FeedPost[]>([])
  const [note, setNote] = useState('')
  const [win, setWin] = useState('')
  const [big, setBig] = useState(false)
  const [winError, setWinError] = useState<string | null>(null)
  const facts = profileFactLines(athlete)
  const first = shoulderFirstPost(athlete.openShoulderHardness)
  const notes = visibleCoachNotes(athlete, viewer)
  const write = canWriteCoachNotes(viewer) && (onAddNote || onAddWin)
  const contest = handstandContest(athlete)
  const own = viewer?.id === athlete.id
  const coach = isCoachProfile(viewer)

  const [confirm, setConfirm] = useState<string | null>(null)

  useEffect(() => {
    void listFeedPosts().then((posts) =>
      setWins(
        posts.filter(
          (p) =>
            postOnChannel(p, 'wins') &&
            (p.authorId === athlete.id || p.taggedIds.includes(athlete.id)),
        ),
      ),
    )
  }, [athlete.id, athlete.coachNotes?.length])

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
    const who = givenName(athlete)
    const youDid =
      kind === 'hi5' ? `You high-fived ${who}` : `You fist bumped ${who}`
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

  const body = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <AthleteAvatar athlete={athlete} size="lg" />
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">
            {athlete.name}
            {contest ? ' 🤸' : ''}
          </h2>
          <p className="text-sm text-[var(--muted)]">{roleLabel(athlete)}</p>
          {parentsOf(athlete.id, athletes).length > 0 && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Parent{parentsOf(athlete.id, athletes).length === 1 ? '' : 's'}:{' '}
              {parentsOf(athlete.id, athletes).map((p) => p.name).join(', ')}
            </p>
          )}
          {profileRole(athlete) === 'parent' && childNamesLabel(athlete, athletes) && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Parent of {childNamesLabel(athlete, athletes)}
            </p>
          )}
          {first && (
            <p className="mt-2 text-base font-medium italic text-[var(--text)]">“{first}”</p>
          )}
          {contest && (
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--profile-accent, var(--accent))' }}>
              Handstand contest anyone?
            </p>
          )}
        </div>
      </div>

      {coach && viewer && viewer.id !== athlete.id && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void gesture('hi5')}
              className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold"
            >
              High five
            </button>
            <button
              type="button"
              onClick={() => void gesture('fist')}
              className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold"
            >
              Fist bump
            </button>
          </div>
          {confirm && (
            <p className="text-sm font-semibold text-[var(--accent)]">{confirm}</p>
          )}
        </div>
      )}

      {(athlete.gestures ?? []).length > 0 && (
        <p className="text-xs text-[var(--muted)]">
          {(athlete.gestures ?? []).slice(0, 4).map((g) => (
            <span key={g.id} className="mr-2">
              {g.kind === 'hi5' ? '🙏' : '👊'} {g.fromName}
            </span>
          ))}
        </p>
      )}

      {facts.length > 0 ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {facts.map((row) => (
            <div key={row.label} className="rounded-xl bg-black/25 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {row.label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          No cartwheel, twist, or gym answers on this profile yet. They land
          here after My profile or the class-station line.
        </p>
      )}

      {(own || coach) && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--profile-accent, var(--accent))' }}>
            Post to feed
          </p>
          <div className="mt-2">
            <WinComposer
              athlete={viewer && coach && !own ? viewer : athlete}
              taggedIds={own ? [] : [athlete.id]}
              channels={['gym']}
              placeholder={own ? 'A thought or a hit. Clip optional.' : `Post about ${athlete.name}…`}
              submitLabel="Post to feed"
              onPosted={() => {
                void listFeedPosts().then((posts) =>
                  setWins(
                    posts.filter(
                      (p) =>
                        postOnChannel(p, 'wins') &&
                        (p.authorId === athlete.id || p.taggedIds.includes(athlete.id)),
                    ),
                  ),
                )
              }}
            />
          </div>
        </section>
      )}

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--profile-accent, var(--accent))' }}>
          Wins
        </p>
        {wins.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--muted)]">No wins posted for them yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {wins.slice(0, 12).map((p) => (
              <li key={p.id} className="rounded-lg bg-black/25 px-3 py-2 text-sm">
                <p>{p.caption}</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {p.sharedByName ? `shared by ${p.sharedByName} · ` : ''}
                  {new Date(p.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {viewer && (isCoachProfile(viewer) || notes.length > 0) && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--profile-accent, var(--accent))' }}>
            Notes
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {isGymAdmin(viewer)
              ? 'Every coach note on this athlete.'
              : 'Notes you wrote while working with them.'}
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
          {onAddNote && (
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
                <input
                  type="checkbox"
                  checked={big}
                  onChange={(e) => setBig(e.target.checked)}
                />
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
    </div>
  )

  const shellStyle = profileThemeStyle(athlete.favoriteColor)

  if (variant === 'overlay') {
    return (
      <div className="fixed inset-0 z-[85] flex flex-col text-[var(--text)]" style={shellStyle}>
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--profile-accent)' }}>
            Profile
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
