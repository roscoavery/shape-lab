import { useEffect, useState } from 'react'
import type { Athlete } from '../types'
import { AthleteAvatar } from './AthleteAvatar'
import { profileFactLines, shoulderFirstPost } from '../lib/athleteFacts'
import { canWriteCoachNotes, visibleCoachNotes } from '../lib/athleteNotes'
import { isCoachProfile, isGymAdmin, roleLabel } from '../lib/profileRole'
import {
  listFeedPosts,
  postOnChannel,
  type FeedPost,
} from '../lib/feedPosts'

type Props = {
  athlete: Athlete
  viewer: Athlete | null
  variant?: 'page' | 'overlay' | 'embed'
  onClose?: () => void
  onAddNote?: (text: string) => void
  onAddWin?: (text: string, big: boolean) => void
}

export function AthleteProfileCard({
  athlete,
  viewer,
  variant = 'page',
  onClose,
  onAddNote,
  onAddWin,
}: Props) {
  const [wins, setWins] = useState<FeedPost[]>([])
  const [note, setNote] = useState('')
  const [win, setWin] = useState('')
  const [big, setBig] = useState(false)
  const facts = profileFactLines(athlete)
  const first = shoulderFirstPost(athlete.openShoulderHardness)
  const notes = visibleCoachNotes(athlete, viewer)
  const write = canWriteCoachNotes(viewer) && (onAddNote || onAddWin)

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

  const body = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <AthleteAvatar athlete={athlete} size="lg" />
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">{athlete.name}</h2>
          <p className="text-sm text-[var(--muted)]">{roleLabel(athlete)}</p>
          {first && (
            <p className="mt-2 text-base font-medium italic text-[var(--text)]">“{first}”</p>
          )}
        </div>
      </div>

      {facts.length > 0 ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {facts.map((row) => (
            <div key={row.label} className="rounded-xl bg-[#121820] px-3 py-2">
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

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Wins
        </p>
        {wins.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--muted)]">No wins posted for them yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {wins.slice(0, 12).map((p) => (
              <li key={p.id} className="rounded-lg bg-[#121820] px-3 py-2 text-sm">
                <p>{p.caption}</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {new Date(p.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {viewer && (isCoachProfile(viewer) || notes.length > 0) && (
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
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
                <li key={n.id} className="rounded-lg bg-[#121820] px-3 py-2 text-sm">
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
                className="w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
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
                className="h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={big}
                  onChange={(e) => setBig(e.target.checked)}
                />
                Big win — also the gym feed
              </label>
              <button
                type="button"
                disabled={!win.trim()}
                onClick={() => {
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

  if (variant === 'overlay') {
    return (
      <div className="fixed inset-0 z-[85] flex flex-col bg-[#07110e] text-[var(--text)]">
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
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
          ? 'rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4'
          : 'rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5'
      }
    >
      {body}
    </section>
  )
}

