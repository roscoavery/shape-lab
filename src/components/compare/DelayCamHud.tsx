/**
 * Fullscreen delay-cam HUD (left tools, zoom, buffer, record, EXIT)
 * and the live start screen for setting buffer time.
 */

import { HudCircle, HudRecord, IconClock, IconFlip, IconHide, IconReplayArrow, IconShow, IconX } from './CompareHud'

type DelayProps = {
  delaySec: number
  zoom: number
  buffering: boolean
  recording: boolean
  saving: boolean
  hudOpen: boolean
  onZoom: (n: number) => void
  onHide: () => void
  onShow: () => void
  onReplay: () => void
  onFlip: () => void
  onRecord: () => void
  onBuffer: () => void
  onReset: () => void
  onExit: () => void
}

export function DelayCamHud({
  delaySec,
  zoom,
  buffering,
  recording,
  saving,
  hudOpen,
  onZoom,
  onHide,
  onShow,
  onReplay,
  onFlip,
  onRecord,
  onBuffer,
  onReset,
  onExit,
}: DelayProps) {
  if (!hudOpen) {
    return (
      <button type="button" onClick={onShow} className="absolute left-3 top-3 z-[28] flex flex-col items-center gap-0.5" aria-label="Show controls">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black">
          <IconShow />
        </span>
        <span className="text-[10px] font-medium text-white">Show</span>
      </button>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[28] text-white">
      <div className="pointer-events-none absolute left-1/2 top-2 z-[29] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#3ddc84]" />
      {buffering && (
        <p className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 text-[10px] text-[#f0c400]">
          Buffering…
        </p>
      )}
      {recording && (
        <p className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 text-[10px] font-semibold text-[#e03131]">
          REC
        </p>
      )}

      <div className="pointer-events-auto absolute inset-x-8 top-2">
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
          className="w-full accent-white"
          aria-label="Zoom"
        />
        <p className="mt-0.5 text-[11px] text-white">Zoom: {zoom.toFixed(1)}</p>
      </div>

      <div className="pointer-events-auto absolute left-3 top-16 flex flex-col items-center gap-3">
        <HudCircle label="Hide" onClick={onHide}>
          <IconHide />
        </HudCircle>
        <HudCircle label="Replay" onClick={onReplay}>
          <span className="relative flex h-6 w-6 items-center justify-center">
            <IconReplayArrow />
            <span className="absolute text-[9px] font-bold leading-none">{delaySec}</span>
          </span>
        </HudCircle>
        <HudCircle label="Flip" onClick={onFlip}>
          <IconFlip />
        </HudCircle>
        <div className="mt-2">
          <HudRecord onClick={onRecord} busy={saving} />
        </div>
      </div>

      <div className="pointer-events-auto absolute right-3 top-16 flex flex-col items-center gap-3">
        <p className="text-sm font-medium tabular-nums">{delaySec.toFixed(1)}s</p>
        <HudCircle label="Buffer" onClick={onBuffer}>
          <IconClock />
        </HudCircle>
        <HudCircle label="Reset" onClick={onReset}>
          <IconX />
        </HudCircle>
      </div>

      <button
        type="button"
        onClick={onExit}
        className="pointer-events-auto absolute bottom-4 left-1/2 z-[29] -translate-x-1/2 text-lg font-semibold tracking-[0.28em] text-white"
      >
        EXIT
      </button>
    </div>
  )
}

type StartProps = {
  running: boolean
  delaySec: number
  min: number
  max: number
  onDelaySec: (n: number) => void
  onStartCamera: () => void
  onEnterDelay: () => void
  onExit: () => void
}

export function LiveBufferStart({
  running,
  delaySec,
  min,
  max,
  onDelaySec,
  onStartCamera,
  onEnterDelay,
  onExit,
}: StartProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[28] text-white">
      {running && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-[29] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#3ddc84]" />
      )}
      <div className="pointer-events-auto absolute inset-x-6 bottom-16 rounded-2xl bg-black/45 px-4 py-3 backdrop-blur-sm">
        <p className="text-center text-[11px] font-medium tracking-wide text-white/80">Buffer time</p>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={delaySec}
          onChange={(e) => onDelaySec(Number(e.target.value))}
          className="mt-1 w-full accent-white"
          aria-label="Buffer seconds"
        />
        <p className="mt-0.5 text-center text-sm tabular-nums">{delaySec.toFixed(1)}s</p>
        <div className="mt-3 flex justify-center gap-6">
          {!running ? (
            <HudCircle label="Start" onClick={onStartCamera} size="lg">
              <IconClock />
            </HudCircle>
          ) : (
            <HudCircle label="Delay" onClick={onEnterDelay} size="lg">
              <IconClock />
            </HudCircle>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onExit}
        className="pointer-events-auto absolute bottom-4 left-1/2 z-[29] -translate-x-1/2 text-lg font-semibold tracking-[0.28em] text-white"
      >
        EXIT
      </button>
    </div>
  )
}
