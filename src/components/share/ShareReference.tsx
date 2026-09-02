/**
 * Same share sheet on every reel and shape view:
 * chalkboard, athlete, coach, gym feed.
 */

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Athlete } from '../../types'
import { isCoachProfile, profileRole, roleLabel } from '../../lib/profileRole'
import { PostToChalkboard } from '../chalkboard/PostToChalkboard'
import type { ChalkboardDraft } from '../../lib/chalkboard'
import { loadSocial, saveSocial, sendMessage } from '../../lib/social'
import { coachAthleteMessageAllowed, coachShareCaption } from '../../lib/coachShare'
import { publishTextPostResult } from '../../lib/feedPosts'
import { pushNotice } from '../../lib/notify'
import { isInternalShareUrl, referenceShareUrl, shareUrlLabel } from '../../lib/shareReference'
import { useClipEditor } from '../ClipWatchMeta'
import { givenName } from '../../lib/classStation'

type Variant = 'button' | 'compact' | 'reel' | 'row'

type Props = {
  draft: ChalkboardDraft
  shareUrl?: string
  viewer?: Athlete | null
  variant?: Variant
  className?: string
}

export function ShareReference({
  draft,
  shareUrl,
  viewer: viewerProp,
  variant = 'button',
  className = '',
}: Props) {
  const { viewer: ctxViewer, athletes } = useClipEditor()
  const viewer = viewerProp ?? ctxViewer
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [caption, setCaption] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'board' | 'people' | 'feed'>('people')

  const url = (shareUrl || referenceShareUrl(draft)).trim()
  const coach = Boolean(viewer && isCoachProfile(viewer))
  const q = query.trim().toLowerCase()
  const people = useMemo(() => {
    const list = athletes.filter((a) => a.id !== viewer?.id)
    if (!q) return list
    return list.filter((a) => a.name.toLowerCase().includes(q) || roleLabel(a).toLowerCase().includes(q))
  }, [athletes, viewer?.id, q])
  const athletesOnly = people.filter((a) => profileRole(a) === 'athlete')
  const coachesOnly = people.filter((a) => isCoachProfile(a))

  const btnClass =
    variant === 'reel'
      ? 'rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-black shadow-lg'
      : variant === 'compact' || variant === 'row'
        ? 'rounded-md border border-[var(--panel-border)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)]'
        : 'rounded-lg border border-[var(--accent)]/40 bg-[#102820] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]'

  const sendTo = async (to: Athlete) => {
    if (!viewer || !url) {
      setNote(viewer ? 'This still needs a reference link to send.' : 'Unlock a profile to share.')
      return
    }
    const text = coachShareCaption(caption)
    const gate = coachAthleteMessageAllowed({ from: viewer, to, text, shareUrl: url })
    if (!gate.ok) {
      setNote(gate.reason)
      return
    }
    setBusy(true)
    setNote(null)
    const social = await loadSocial()
    const next = sendMessage(social, {
      fromId: viewer.id,
      toId: to.id,
      text,
      shareUrl: url,
      from: viewer,
      to,
    })
    const saved = await saveSocial(next)
    setBusy(false)
    if (!saved) {
      setNote('Could not send that on this gym computer.')
      return
    }
    void pushNotice({
      toId: to.id,
      kind: 'share',
      title: `${givenName(viewer)} shared a reference`,
      body: draft.title,
      href: 'network',
    })
    const who = givenName(to)
    const role = isCoachProfile(to) ? 'coach' : 'athlete'
    setNote(`Shared “${draft.title}” with ${who} (${role}).`)
    setCaption('')
  }

  const postFeed = async () => {
    if (!viewer) {
      setNote('Unlock a profile to post to the feed.')
      return
    }
    setBusy(true)
    setNote(null)
    const line = (caption.trim() || draft.title).slice(0, 800)
    const withLink =
      url && !isInternalShareUrl(url) && !line.includes(url) ? `${line}\n${url}`.slice(0, 800) : line
    const result = await publishTextPostResult({
      authorId: viewer.id,
      caption: withLink,
      taggedIds: [],
      channels: ['gym'],
    })
    setBusy(false)
    if (!result.post) {
      setNote(result.error || 'Could not post that to the feed.')
      return
    }
    setNote(`Posted “${draft.title}” to the gym feed.`)
    setCaption('')
  }

  const sheet =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[420] flex items-end justify-center bg-black/60 p-4 sm:items-center"
            onPointerDown={() => setOpen(false)}
          >
            <div
              className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--panel-border)] bg-[#121820] p-4 shadow-2xl"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Share
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-[var(--text)]">{draft.title}</p>
                  {url ? (
                    <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                      {shareUrlLabel(url, draft.title)}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-[var(--warn)]">
                      No public URL on this still — chalkboard and feed still work.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-1 text-xs text-[var(--muted)]"
                >
                  Close
                </button>
              </div>

              {!viewer ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Unlock a profile to post this to the chalkboard, send it to someone, or put it on
                  the feed.
                </p>
              ) : (
                <>
                  <div className="mt-3 flex gap-1 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] p-1">
                    {(
                      [
                        ['people', 'Athlete / coach'],
                        ['board', 'Chalkboard'],
                        ['feed', 'Feed'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setTab(id)
                          setNote(null)
                        }}
                        className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold ${
                          tab === id
                            ? 'bg-[var(--accent-dim)] text-white'
                            : 'text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <label className="mt-3 block text-xs text-[var(--muted)]">
                    Note (optional)
                    <input
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Cue, station, or why they should watch this"
                      className="mt-1 h-10 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 text-sm text-[var(--text)]"
                    />
                  </label>

                  {tab === 'board' && (
                    <div className="mt-3">
                      {coach ? (
                        <PostToChalkboard viewer={viewer} draft={draft} embedded />
                      ) : (
                        <p className="text-sm text-[var(--muted)]">
                          Unlock a coach profile to pin this on a class chalkboard.
                        </p>
                      )}
                    </div>
                  )}

                  {tab === 'people' && (
                    <div className="mt-3 space-y-3">
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search a name…"
                        className="h-10 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 text-sm"
                      />
                      <PeopleList
                        title="Share to athlete"
                        empty="No athletes on this gym yet."
                        people={athletesOnly}
                        busy={busy}
                        onPick={(a) => void sendTo(a)}
                      />
                      <PeopleList
                        title="Share to coach"
                        empty="No other coaches on this gym yet."
                        people={coachesOnly}
                        busy={busy}
                        onPick={(a) => void sendTo(a)}
                      />
                    </div>
                  )}

                  {tab === 'feed' && (
                    <div className="mt-3">
                      <p className="text-xs text-[var(--muted)]">
                        Posts on the gym feed with the title
                        {url && !isInternalShareUrl(url) ? ' and the clip link' : ''}.
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void postFeed()}
                        className="mt-2 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[#06281f] disabled:opacity-50"
                      >
                        {busy ? 'Posting…' : 'Share to feed'}
                      </button>
                    </div>
                  )}
                </>
              )}
              {note && <p className="mt-3 text-sm font-semibold text-[var(--accent)]">{note}</p>}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className={className}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
          setNote(null)
          if (coach) setTab('board')
          else setTab('people')
        }}
        className={btnClass}
      >
        Share
      </button>
      {sheet}
    </div>
  )
}

function PeopleList({
  title,
  empty,
  people,
  busy,
  onPick,
}: {
  title: string
  empty: string
  people: Athlete[]
  busy: boolean
  onPick: (a: Athlete) => void
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{title}</p>
      {people.length === 0 ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{empty}</p>
      ) : (
        <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
          {people.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onPick(a)}
                className="w-full rounded-lg bg-[#0d1218] px-3 py-2 text-left text-sm hover:bg-[var(--accent-dim)] hover:text-white disabled:opacity-50"
              >
                {a.name}
                <span className="ml-1 text-[11px] text-[var(--muted)]">· {roleLabel(a)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
