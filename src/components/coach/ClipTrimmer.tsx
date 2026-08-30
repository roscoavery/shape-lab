import { useEffect, useRef, useState } from 'react'

type Props = {
  src: string
  defaultName: string
  defaultNotes?: string
  onSave: (opts: { name: string; notes: string; start: number; end: number }) => void
  onCancel: () => void
  busy?: boolean
}

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ClipTrimmer({ src, defaultName, defaultNotes = '', onSave, onCancel, busy }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [name, setName] = useState(defaultName)
  const [notes, setNotes] = useState(defaultNotes)
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onMeta = () => {
      const d = Number.isFinite(video.duration) ? video.duration : 0
      setDuration(d)
      setStart(0)
      setEnd(d > 0 ? d : 0)
    }
    video.addEventListener('loadedmetadata', onMeta)
    if (video.readyState >= 1) onMeta()
    return () => video.removeEventListener('loadedmetadata', onMeta)
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || end <= start) return
    const onTime = () => {
      if (video.currentTime >= end - 0.04) {
        video.currentTime = start
        void video.play()
      }
    }
    video.addEventListener('timeupdate', onTime)
    return () => video.removeEventListener('timeupdate', onTime)
  }, [start, end])

  const preview = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = start
    void video.play()
  }

  return (
    <div className="mt-2 rounded-lg border border-[var(--accent)]/35 bg-[#0d1218] p-3">
      <p className="text-sm font-semibold">Trim and save to references</p>
      <p className="text-xs text-[var(--muted)]">
        Set In and Out around the good pass, name it, then save. It shows up in
        your coach library and in Compare with the UG clips.
      </p>
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        className="mt-2 max-h-64 w-full rounded-md bg-black object-contain"
      />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-[var(--muted)]">
          In {fmt(start)}
          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.1)}
            step={0.05}
            value={start}
            className="mt-1 w-full"
            onChange={(e) => {
              const next = Number(e.target.value)
              setStart(Math.min(next, end - 0.1))
            }}
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          Out {fmt(end)}
          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.1)}
            step={0.05}
            value={end}
            className="mt-1 w-full"
            onChange={(e) => {
              const next = Number(e.target.value)
              setEnd(Math.max(next, start + 0.1))
            }}
          />
        </label>
      </div>
      <input
        className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
        placeholder="Name (round-off BHS, vault timer…)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
        placeholder="Optional note"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {err && <p className="mt-2 text-sm text-[var(--bad)]">{err}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm"
          onClick={preview}
        >
          Preview trim
        </button>
        <button
          type="button"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f] disabled:opacity-40"
          onClick={() => {
            if (!name.trim()) {
              setErr('Name the skill so it can be found in Compare.')
              return
            }
            onSave({
              name: name.trim(),
              notes: notes.trim(),
              start,
              end: end > start ? end : start + 0.2,
            })
          }}
        >
          {busy ? 'Saving…' : 'Save reference'}
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
