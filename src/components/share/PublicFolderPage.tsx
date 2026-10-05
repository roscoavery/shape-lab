/**
 * Public shareable athlete video folder.
 *
 * Rendered standalone at /share/folder/:token with no sign-in required.
 * Data comes from the public GET /api/share/folder endpoint. Logged-out
 * viewers can watch, download one video, or download everything as a zip.
 * When the viewer is signed in with access to the athlete, upload, rename,
 * and delete controls appear (they call the authed /api/athlete-videos
 * endpoints). Delete never happens without a login.
 */

import { useEffect, useRef, useState } from 'react'
import type { ShareFolder, ShareFolderVideo } from '../../../server/shareFolder'
import {
  deleteAthleteVideo,
  formatVideoDay,
  groupVideosByDate,
  renameAthleteVideo,
  uploadAthleteVideo,
  type AthleteVideo,
} from '../../lib/athleteVideoStore'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; folder: ShareFolder }

function toAthleteVideo(v: ShareFolderVideo, athleteId: string): AthleteVideo {
  return {
    id: v.id,
    athleteId,
    name: v.name,
    source: 'upload',
    createdAt: v.createdAt,
    durationSec: v.durationSec,
    sizeBytes: v.sizeBytes,
    mime: v.mime,
    url: v.url,
    className: v.className,
    skillLabel: v.skillLabel,
  }
}

function IconButton({
  label,
  title,
  onClick,
  danger,
  children,
}: {
  label: string
  title: string
  onClick: (e: React.MouseEvent) => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        onClick(e)
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white ${
        danger ? 'text-red-300' : ''
      }`}
    >
      {children}
    </button>
  )
}

const DownloadGlyph = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 4v12m0 0l-4-4m4 4l4-4" />
    <path d="M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />
  </svg>
)

const TrashGlyph = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m3 0l-.8 12.2a1 1 0 01-1 .8H7.8a1 1 0 01-1-.8L6 7" />
  </svg>
)

const PencilGlyph = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" />
  </svg>
)

function FolderVideoRow({
  video,
  athleteId,
  authed,
  onDeleted,
  onRenamed,
}: {
  video: ShareFolderVideo
  athleteId: string
  authed: boolean
  onDeleted: (id: string) => void
  onRenamed: (id: string, name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(video.name)
  const [busy, setBusy] = useState(false)

  const doDelete = () => {
    if (!window.confirm(`Delete "${video.name}" from this folder?`)) return
    setBusy(true)
    void deleteAthleteVideo(video.id, athleteId)
      .then(() => onDeleted(video.id))
      .catch(() => setBusy(false))
  }

  const doRename = () => {
    const clean = draft.trim()
    if (!clean || clean === video.name) {
      setRenaming(false)
      return
    }
    setBusy(true)
    void renameAthleteVideo(video.id, athleteId, clean)
      .then(() => {
        onRenamed(video.id, clean)
        setRenaming(false)
      })
      .catch(() => {})
      .finally(() => setBusy(false))
  }

  return (
    <li className="overflow-hidden rounded-xl bg-white/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/50 text-lg text-white">
          ▶
        </span>
        <span className="min-w-0 flex-1">
          {renaming ? (
            <input
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') doRename()
                if (e.key === 'Escape') setRenaming(false)
              }}
              onBlur={doRename}
              className="w-full rounded bg-black/60 px-2 py-1 text-sm text-white outline-none"
              aria-label="Video name"
            />
          ) : (
            <span className="block truncate text-sm font-semibold text-white">{video.name}</span>
          )}
          <span className="block text-[11px] text-white/50">
            {video.className ? `${video.className} · ` : ''}
            {video.durationSec != null ? `${video.durationSec}s · ` : ''}
            {new Date(video.createdAt).toLocaleDateString()}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <a
            href={video.url}
            download={`${video.name}.mp4`}
            aria-label={`Download ${video.name}`}
            title="Download this video"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
          >
            {DownloadGlyph}
          </a>
          {authed && (
            <>
              <IconButton
                label={`Rename ${video.name}`}
                title="Rename this video"
                onClick={() => {
                  setDraft(video.name)
                  setRenaming(true)
                }}
              >
                {PencilGlyph}
              </IconButton>
              <IconButton
                label={`Delete ${video.name}`}
                title="Delete this video"
                danger
                onClick={doDelete}
              >
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                ) : (
                  TrashGlyph
                )}
              </IconButton>
            </>
          )}
        </span>
      </button>
      {open && (
        <video
          src={video.url}
          controls
          playsInline
          preload="metadata"
          className="max-h-[70dvh] w-full bg-black object-contain"
        />
      )}
    </li>
  )
}

export default function PublicFolderPage({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [authed, setAuthed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    fetch(`/api/share/folder?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null)
          throw new Error((body && body.error) || 'This folder link is not valid.')
        }
        return r.json() as Promise<ShareFolder>
      })
      .then((folder) => {
        if (cancelled) return
        setState({ status: 'ready', folder })
        // Logged in with access? Then show upload, rename, delete.
        fetch(`/api/athlete-videos?athleteId=${encodeURIComponent(folder.athleteId)}`, {
          credentials: 'same-origin',
        })
          .then((r) => {
            if (!cancelled) setAuthed(r.ok)
          })
          .catch(() => {})
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load this folder.',
          })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const refresh = () => {
    fetch(`/api/share/folder?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? (r.json() as Promise<ShareFolder>) : null))
      .then((folder) => {
        if (folder) setState({ status: 'ready', folder })
      })
      .catch(() => {})
  }

  const onPickUpload = (file: File | undefined) => {
    if (state.status !== 'ready' || !file) return
    if (file.size > 48 * 1024 * 1024) {
      setNotice('That video is over the 48MB upload limit.')
      return
    }
    setUploading(true)
    setNotice(null)
    void uploadAthleteVideo({
      athleteId: state.folder.athleteId,
      blob: file,
      name: file.name.replace(/\.[^.]+$/, '').trim() || 'Upload',
      source: 'upload',
    })
      .then(() => {
        setNotice('Saved into the folder.')
        refresh()
      })
      .catch((e) => setNotice(e instanceof Error ? e.message : 'Could not upload that video.'))
      .finally(() => setUploading(false))
  }

  const folder = state.status === 'ready' ? state.folder : null
  const groups = folder
    ? groupVideosByDate(folder.videos.map((v) => toAthleteVideo(v, folder.athleteId)))
    : []

  return (
    <div className="min-h-dvh bg-[#0b0f14] text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <span className="text-sm font-extrabold tracking-wide">Shape Lab</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Video folder
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-16 pt-5">
        {state.status === 'loading' && (
          <p className="py-16 text-center text-sm text-white/60">Loading the folder…</p>
        )}
        {state.status === 'error' && (
          <div className="py-16 text-center">
            <p className="text-sm font-bold">{state.message}</p>
            <p className="mt-2 text-xs text-white/60">
              The link may be old, or the gym may be offline right now.
            </p>
          </div>
        )}
        {folder && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold">{folder.athleteName}</h1>
                <p className="mt-1 text-xs text-white/60">
                  {folder.videos.length} video{folder.videos.length === 1 ? '' : 's'}
                  {authed ? ' · signed in' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {authed && (
                  <>
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
                    <IconButton
                      label={uploading ? 'Uploading video' : 'Upload a video into this folder'}
                      title="Upload a video into this folder"
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
                          <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
                        </svg>
                      )}
                    </IconButton>
                  </>
                )}
                {folder.videos.length > 0 && (
                  <a
                    href={`/api/share/folder-zip?token=${encodeURIComponent(token)}`}
                    aria-label="Download all videos as a zip"
                    title="Download all videos as a zip"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 3v10m0 0l-3.5-3.5M12 13l3.5-3.5" />
                      <path d="M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4" />
                      <path d="M8 20v1.5M12 20v1.5M16 20v1.5" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {notice && <p className="text-[12px] text-amber-300">{notice}</p>}

            {groups.length === 0 ? (
              <p className="py-10 text-center text-sm text-white/60">
                No videos in this folder yet.
              </p>
            ) : (
              groups.map((g) => (
                <section key={g.date}>
                  <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/50">
                    {formatVideoDay(g.date)}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {g.videos.map((v) => {
                      const sv = folder.videos.find((x) => x.id === v.id)!
                      return (
                        <FolderVideoRow
                          key={v.id}
                          video={sv}
                          athleteId={folder.athleteId}
                          authed={authed}
                          onDeleted={(id) =>
                            setState({
                              status: 'ready',
                              folder: {
                                ...folder,
                                videos: folder.videos.filter((x) => x.id !== id),
                              },
                            })
                          }
                          onRenamed={(id, name) =>
                            setState({
                              status: 'ready',
                              folder: {
                                ...folder,
                                videos: folder.videos.map((x) =>
                                  x.id === id ? { ...x, name } : x,
                                ),
                              },
                            })
                          }
                        />
                      )
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 px-4 py-6">
        <p className="mx-auto max-w-xl text-center text-xs text-white/50">
          Shared from Shape Lab · This link works while the gym is online.
        </p>
      </footer>
    </div>
  )
}
