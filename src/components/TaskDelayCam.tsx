/**
 * Tasks delay cam — same 6–20s delay + "replay last Ns" as Compare,
 * driven by the pose camera stream (does not open a second getUserMedia).
 */

import { useEffect, useRef, useState } from 'react'
import { DELAY_MAX, DELAY_MIN, useDelayCam } from '../hooks/useDelayCam'

type Mode = 'live' | 'delay' | 'replay'

type Props = {
  stream: MediaStream | null
  cameraOn: boolean
  mirror: boolean
  compact?: boolean
  /** Tiny overlay: video + delay label, no panel chrome. */
  pip?: boolean
}

export function TaskDelayCam({
  stream,
  cameraOn,
  mirror,
  compact = false,
  pip = false,
}: Props) {
  const [delaySec, setDelaySec] = useState(6)
  const [mode, setMode] = useState<Mode>('delay')
  const [replaySrc, setReplaySrc] = useState<string | null>(null)
  const [replayTail, setReplayTail] = useState<number | null>(null)
  const [building, setBuilding] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const replayUrlRef = useRef<string | null>(null)
  const replayVideoRef = useRef<HTMLVideoElement | null>(null)

  const delayOn = cameraOn && Boolean(stream) && mode === 'delay'
  const delay = useDelayCam(stream, delaySec, cameraOn && Boolean(stream))

  useEffect(() => {
    if (delayOn) {
      delay.startDelay()
      return delay.stopDelay
    }
    return undefined
  }, [delayOn, delay.startDelay, delay.stopDelay])

  useEffect(
    () => () => {
      if (replayUrlRef.current) URL.revokeObjectURL(replayUrlRef.current)
    },
    [],
  )

  const openReplay = async () => {
    if (!cameraOn || !stream || building) return
    setBuilding(true)
    delay.setError(null)
    const capturedFor = delay.capturedSec()
    try {
      const blob = await delay.flushRollingBlob()
      delay.startRolling(stream)
      if (!blob || blob.size < 1500 || capturedFor < 1.2) {
        delay.setError(`Keep the camera on a couple of seconds, then tap Replay last ${delaySec}s.`)
        return
      }
      if (replayUrlRef.current) URL.revokeObjectURL(replayUrlRef.current)
      const url = URL.createObjectURL(blob)
      replayUrlRef.current = url
      setReplaySrc(url)
      setReplayTail(Math.min(delaySec, capturedFor))
      setMode('replay')
      const shown = Math.max(1, Math.round(Math.min(delaySec, capturedFor)))
      setFlash(`Last ${shown}s — pause or scrub`)
      window.setTimeout(() => setFlash(null), 2500)
    } finally {
      setBuilding(false)
    }
  }

  const mirrorCls = mirror ? 'scale-x-[-1]' : ''
  const videoMax = pip ? 'max-h-36 sm:max-h-44' : compact ? 'max-h-36' : 'max-h-48'

  const videoBlock = (
    <div className="relative overflow-hidden rounded-lg bg-black">
      {mode === 'replay' && replaySrc ? (
        <video
          ref={replayVideoRef}
          src={replaySrc}
          className={`block w-full bg-black ${videoMax} ${mirrorCls}`}
          controls={!pip}
          playsInline
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            const tail = replayTail
            if (tail && v.duration && Number.isFinite(v.duration)) {
              v.currentTime = Math.max(0, v.duration - tail)
            }
          }}
        />
      ) : (
        <video
          ref={delay.delayVideoRef}
          className={`block w-full bg-black ${videoMax} ${mode === 'delay' ? mirrorCls : 'hidden'}`}
          playsInline
          muted
        />
      )}
      {mode === 'live' && !pip && (
        <p className="px-3 py-8 text-center text-xs text-[var(--muted)]">
          Live view is the pose camera above. Switch to Delay to watch yourself{' '}
          {delaySec}s behind, or replay the last few seconds.
        </p>
      )}
      {mode === 'delay' && delay.buffering && cameraOn && (
        <p className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-center text-[11px] text-[var(--warn)]">
          Buffering delay cam… {delaySec}s
        </p>
      )}
      {!cameraOn && mode !== 'replay' && (
        <p className={`px-3 ${pip ? 'py-4' : 'py-8'} text-center text-xs text-[var(--muted)]`}>
          {pip ? 'Camera off' : 'Start the pathway to turn the camera on — delay cam uses the same feed.'}
        </p>
      )}
      {pip && (
        <p className="absolute left-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Delay {delaySec}s
        </p>
      )}
    </div>
  )

  if (pip) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/25 bg-black/70 shadow-2xl">
        {videoBlock}
      </div>
    )
  }

  return (
    <section className={`rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] ${compact ? 'p-2' : 'p-3'}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Delay cam
        </p>
        <div className="flex gap-1 rounded-lg border border-[var(--panel-border)] p-0.5">
          {(
            [
              ['live', 'Live'],
              ['delay', 'Delay'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              disabled={!cameraOn}
              onClick={() => setMode(id)}
              className={`rounded-md px-2 py-1 text-xs disabled:opacity-40 ${
                mode === id
                  ? 'bg-[var(--accent-dim)] font-semibold text-white'
                  : 'text-[var(--muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {videoBlock}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          Delay
          <input
            type="range"
            min={DELAY_MIN}
            max={DELAY_MAX}
            value={delaySec}
            onChange={(e) => setDelaySec(Number(e.target.value))}
          />
          <span className="tabular-nums text-[var(--text)]">{delaySec}s</span>
        </label>
        <button
          type="button"
          disabled={!cameraOn || building}
          onClick={() => void openReplay()}
          className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[#06281f] disabled:opacity-40"
        >
          {building ? 'Opening…' : `Replay last ${delaySec}s`}
        </button>
        {mode === 'replay' && (
          <button
            type="button"
            onClick={() => setMode('delay')}
            className="rounded-lg border border-[var(--panel-border)] px-2.5 py-1 text-xs"
          >
            Back to delay
          </button>
        )}
      </div>
      {flash && <p className="mt-1 text-[11px] text-[var(--accent)]">{flash}</p>}
      {delay.error && <p className="mt-1 text-[11px] text-[var(--bad)]">{delay.error}</p>}
    </section>
  )
}
