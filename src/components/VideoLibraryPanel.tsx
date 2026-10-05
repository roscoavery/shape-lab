/**
 * Athlete video library — clips grouped by date, playable on any link
 * once the profile is unlocked.
 */

import { useEffect, useRef, useState } from 'react'
import {
  deleteAthleteVideo,
  formatVideoDay,
  getFolderShare,
  groupVideosByDate,
  listAthleteVideos,
  listClassVideos,
  SOURCE_LABEL,
  uploadAthleteVideo,
  type AthleteVideo,
} from '../lib/athleteVideoStore'
import { classLabel, loadOfferings, subscribeCoachClasses } from '../lib/coachClasses'
import { emptyCoachSkillRef, saveCoachSkillRef, uploadCoachMedia } from '../lib/coachContentStore'
import { ClipTrimmer } from './coach/ClipTrimmer'

type Folder = 'all' | 'lesson' | 'compare' | 'practice'

type Props = {
  athleteId: string | null
  athleteName: string | null
  refreshKey?: number
  folder?: Folder
  lessonId?: string | null
  coachId?: string | null
  coachName?: string | null
  canSaveReference?: boolean
  /** Skip the outer heading — parent already titled this block. */
  embedded?: boolean
  showClassFolders?: boolean
}

async function copyToCoachMedia(src: string, ownerId: string, name: string): Promise<string> {
  try {
    const res = await fetch(src)
    if (!res.ok) return src
    const blob = await res.blob()
    if (blob.size < 64 || blob.size > 48 * 1024 * 1024) return src
    return await uploadCoachMedia({ ownerId, file: blob, name })
  } catch {
    return src
  }
}

export function VideoLibraryPanel({
  athleteId,
  athleteName,
  refreshKey = 0,
  folder = 'all',
  lessonId = null,
  coachId = null,
  coachName = null,
  canSaveReference = false,
  embedded = false,
  showClassFolders = false,
}: Props) {
  const [videos, setVideos] = useState<AthleteVideo[]>([])
  const [playing, setPlaying] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [classId, setClassId] = useState<string | null>(null)
  const [offerings, setOfferings] = useState(() => loadOfferings())
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onPickUpload = (file: File | undefined) => {
    if (!file || !athleteId) return
    if (file.size > 48 * 1024 * 1024) {
      setError('That video is over the 48MB upload limit.')
      return
    }
    setUploading(true)
    setError(null)
    void uploadAthleteVideo({
      athleteId,
      blob: file,
      name: file.name.replace(/\.[^.]+$/, '').trim() || 'Upload',
      source: 'upload',
    })
      .then((v) => {
        setVideos((prev) => [v, ...prev])
        setFlash('Saved into the folder.')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not upload that video.'))
      .finally(() => setUploading(false))
  }

  const onCopyFolderLink = () => {
    if (!athleteId) return
    setError(null)
    void getFolderShare(athleteId)
      .then(({ path }) => {
        const absolute = `${window.location.origin}${path}`
        if (navigator.clipboard?.writeText) {
          return navigator.clipboard
            .writeText(absolute)
            .then(() => setFlash('Folder link copied.'))
            .catch(() => window.prompt('Copy this folder link:', absolute))
        }
        window.prompt('Copy this folder link:', absolute)
        return undefined
      })
      .catch(() => setError('Could not make that folder link.'))
  }

  useEffect(() => subscribeCoachClasses(() => setOfferings(loadOfferings())), [])

  useEffect(() => {
    if (classId) {
      void listClassVideos(classId).then(setVideos)
      return
    }
    if (!athleteId) {
      setVideos([])
      return
    }
    void listAthleteVideos(athleteId).then(setVideos)
  }, [athleteId, refreshKey, classId])

  if (!athleteId && !classId) {
    const empty = (
      <p className="text-sm text-[var(--muted)]">
        Unlock a profile to see clips saved from lessons, Compare, homework, and
        class flows.
      </p>
    )
    if (embedded) return empty
    return (
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        <h3 className="text-lg font-semibold">Video library</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Unlock a profile to see clips saved from lessons, Compare, homework, and
          class flows.
        </p>
      </section>
    )
  }

  const filtered = videos.filter((v) => {
    if (lessonId) return v.lessonId === lessonId || v.source === 'lesson'
    if (folder === 'lesson') return v.source === 'lesson' || Boolean(v.lessonId)
    if (folder === 'compare') return v.source === 'compare-replay' || v.source === 'delay-record'
    if (folder === 'practice') return v.source === 'hold' || v.source === 'tasks2'
    return true
  })
  const groups = groupVideosByDate(filtered)
  const showSave = Boolean(canSaveReference && coachId && coachName)

  const body = (
    <>
      {!embedded && (
        <>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Video library</h3>
            {athleteId && !classId && (
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  aria-hidden
                  tabIndex={-1}
                  onChange={(e) => {
                    onPickUpload(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  aria-label={uploading ? 'Uploading video' : 'Upload a video into this folder'}
                  title="Upload a video into this folder"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--panel-border)] text-[var(--text)] disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--muted)] border-t-transparent" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
                      <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Copy folder share link"
                  title="Copy folder share link"
                  onClick={onCopyFolderLink}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--panel-border)] text-[var(--text)]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M10 14a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 5.4" />
                    <path d="M14 10a5 5 0 00-7.07 0L4.1 12.83a5 5 0 007.07 7.07l1.33-1.3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
            {classId
              ? 'This class folder. Replay-cam saves land here while that class is running.'
              : athleteName
                ? `${athleteName} · `
                : ''}
            {!classId && folder === 'lesson'
              ? 'Lesson folder, delay cam and Compare saves from a live lesson. If they hit a good pass, trim it and save it to your skill references.'
              : !classId
                ? 'Saved into this profile. Grouped by date.'
                : ''}
          </p>
          {showClassFolders && offerings.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setClassId(null)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  !classId
                    ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                    : 'border border-[var(--panel-border)]'
                }`}
              >
                This profile
              </button>
              {offerings.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setClassId(o.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    classId === o.id
                      ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                      : 'border border-[var(--panel-border)]'
                  }`}
                >
                  {classLabel(o)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {error && (
        <p className="mt-2 text-[12px] text-[var(--bad)]">{error}</p>
      )}
      {flash && (
        <p className="mt-2 text-[12px] text-[var(--accent)]">{flash}</p>
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
                          {v.skillLabel ? ` · ${v.skillLabel}` : ''}
                          {v.durationSec != null ? ` · ${v.durationSec}s` : ''}
                          {` · ${new Date(v.createdAt).toLocaleTimeString()}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setPlaying(playing === v.id ? null : v.id)}
                          className="rounded-full bg-[var(--accent-dim)] px-2.5 py-1 text-[11px] font-semibold text-white"
                        >
                          {playing === v.id ? 'Hide' : 'Play'}
                        </button>
                        {showSave && (
                          <button
                            type="button"
                            onClick={() => {
                              setSavingId(savingId === v.id ? null : v.id)
                            }}
                            className="rounded-full border border-[var(--panel-border)] px-2.5 py-1 text-[11px]"
                          >
                            {savingId === v.id ? 'Cancel trim' : 'Save to references'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            void deleteAthleteVideo(v.id, v.athleteId || athleteId || '')
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
                    {savingId === v.id && coachId && coachName && (
                      <div className="px-3 pb-3">
                        <ClipTrimmer
                          src={v.url}
                          defaultName={v.name.replace(/^Lesson · /, '')}
                          busy={busy}
                          onCancel={() => setSavingId(null)}
                          onSave={({ name, notes, start, end }) => {
                            setBusy(true)
                            setError(null)
                            void (async () => {
                              try {
                                const src = await copyToCoachMedia(
                                  v.url,
                                  coachId,
                                  `${name}.mp4`,
                                )
                                const row = emptyCoachSkillRef(coachId, coachName)
                                saveCoachSkillRef({
                                  ...row,
                                  name,
                                  notes: notes || undefined,
                                  src,
                                  trimStart: start,
                                  trimEnd: end,
                                  lessonId: v.lessonId ?? lessonId ?? undefined,
                                  athleteId: v.athleteId || athleteId || undefined,
                                  athleteName: athleteName ?? undefined,
                                })
                                setFlash(`Saved “${name}” to skill references. Open Compare to play it with the UG clips.`)
                                setSavingId(null)
                              } catch (e) {
                                setError(
                                  e instanceof Error
                                    ? e.message
                                    : 'Could not save that clip as a reference.',
                                )
                              } finally {
                                setBusy(false)
                              }
                            })()
                          }}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  )

  if (embedded) return body
  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      {body}
    </section>
  )
}
