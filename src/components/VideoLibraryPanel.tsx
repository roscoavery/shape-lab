/**
 * Athlete video library — clips grouped by date, playable on any link
 * once the profile is unlocked.
 */

import { useEffect, useState } from 'react'
import {
  deleteAthleteVideo,
  formatVideoDay,
  groupVideosByDate,
  listAthleteVideos,
  SOURCE_LABEL,
  type AthleteVideo,
} from '../lib/athleteVideoStore'

type Props = {
  athleteId: string | null
  athleteName: string | null
  refreshKey?: number
}

export function VideoLibraryPanel({ athleteId, athleteName, refreshKey = 0 }: Props) {
  const [videos, setVideos] = useState<AthleteVideo[]>([])
  const [playing, setPlaying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!athleteId) {
      setVideos([])
      return
    }
    void listAthleteVideos(athleteId).then(setVideos)
  }, [athleteId, refreshKey])

  if (!athleteId) {
    return (
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        <h3 className="text-lg font-semibold">Video library</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Unlock an athlete profile to see clips saved from delay cam, Compare, hold
          challenge, and Tasks 2.
        </p>
      </section>
    )
  }

  const groups = groupVideosByDate(videos)

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <h3 className="text-lg font-semibold">Video library</h3>
      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
        {athleteName ? `${athleteName} · ` : ''}
        Recorded from delay cam after a skill, Compare replay, hold challenge, or
        Tasks 2. Saved into this profile — any phone link or browser with the
        passcode can play them. Grouped by date.
      </p>
      {error && (
        <p className="mt-2 text-[12px] text-[var(--bad)]">{error}</p>
      )}
      {groups.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          Nothing saved yet. On Compare delay cam, tap Record after the skill. On
          a Tasks 2 or hold replay, tap Save to video library.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.date}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {formatVideoDay(g.date)}
              </p>
              <ul className="flex flex-col gap-2">
                {g.videos.map((v) => (
                  <li
                    key={v.id}
                    className="overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[#0d1218]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text)]">
                          {v.name}
                        </p>
                        <p className="text-[11px] text-[var(--muted)]">
                          {SOURCE_LABEL[v.source]}
                          {v.durationSec != null ? ` · ${v.durationSec}s` : ''}
                          {` · ${new Date(v.createdAt).toLocaleTimeString()}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPlaying(playing === v.id ? null : v.id)}
                          className="rounded-full bg-[var(--accent-dim)] px-2.5 py-1 text-[11px] font-semibold text-white"
                        >
                          {playing === v.id ? 'Hide' : 'Play'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void deleteAthleteVideo(v.id, athleteId)
                              .then(() => setVideos((prev) => prev.filter((x) => x.id !== v.id)))
                              .catch(() => setError('Could not delete that clip.'))
                          }}
                          className="rounded-full px-2.5 py-1 text-[11px] text-[var(--bad)]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {playing === v.id && (
                      <video
                        src={v.url}
                        controls
                        playsInline
                        className="max-h-72 w-full bg-black object-contain"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
