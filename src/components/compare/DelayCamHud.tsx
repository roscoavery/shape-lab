/**
 * Fullscreen delay-cam HUD (left tools, zoom, buffer, record, EXIT)
 * and the live start screen for setting buffer time.
 */

import { useEffect, useRef } from 'react'
import { CompareControlsButton, HudCircle, HudRecord, IconClock, IconFlip, IconHide, IconPip, IconReplayArrow, IconShow, IconSwap, IconX } from './CompareHud'
import { useCompareLayout } from './compareLayout'

type DelayProps = {
  delaySec: number
  zoom: number
  buffering: boolean
  recording: boolean
  recSeconds?: number
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
  onMinimize: () => void
  onExit: () => void
}

export function DelayCamHud({
  delaySec,
  zoom,
  buffering,
  recording,
  recSeconds = 0,
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
  onMinimize,
  onExit,
}: DelayProps) {
  const { focus } = useCompareLayout()
  const minLabel = focus === 'split' ? 'Min' : 'Swap'
  const MinIcon = focus === 'split' ? IconPip : IconSwap
  if (!hudOpen) {
    return (
      <div className="pointer-events-none absolute inset-0 z-[28]">
        <button type="button" onClick={onShow} className="pointer-events-auto absolute left-3 top-3 flex flex-col items-center gap-0.5" aria-label="Show delay tools">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black">
            <IconShow />
          </span>
          <span className="text-[10px] font-medium text-white">Show</span>
        </button>
        <div className="pointer-events-auto absolute left-3 top-[5.25rem]">
          <CompareControlsButton />
        </div>
        <div className="pointer-events-auto absolute right-3 top-3">
          <HudCircle label={minLabel} onClick={onMinimize}>
            <MinIcon />
          </HudCircle>
        </div>
      </div>
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

      <div className="pointer-events-auto absolute left-8 right-14 top-2">
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
          <HudRecord
            onClick={onRecord}
            busy={saving && !recording}
            recording={recording}
            seconds={recSeconds}
          />
        </div>
        <CompareControlsButton />
      </div>

      <div className="pointer-events-auto absolute right-3 top-16 flex flex-col items-center gap-3">
        <p className="text-sm font-medium tabular-nums">{delaySec.toFixed(1)}s</p>
        <HudCircle label="Buffer" onClick={onBuffer}>
          <IconClock />
        </HudCircle>
        <HudCircle label="Reset" onClick={onReset}>
          <IconX />
        </HudCircle>
        <HudCircle label={minLabel} onClick={onMinimize}>
          <MinIcon />
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

const WHEEL_ITEM = 40
const WHEEL_VISIBLE = 5

function rangeInts(min: number, max: number): number[] {
  const out: number[] = []
  for (let n = min; n <= max; n += 1) out.push(n)
  return out
}

function BufferWheelColumn({
  values,
  value,
  onChange,
  format,
}: {
  values: number[]
  value: number
  onChange: (n: number) => void
  format: (n: number) => string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const skip = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const i = Math.max(0, values.indexOf(value))
    skip.current = true
    el.scrollTop = i * WHEEL_ITEM
    const t = window.setTimeout(() => {
      skip.current = false
    }, 60)
    return () => window.clearTimeout(t)
  }, [value, values])

  const pad = ((WHEEL_VISIBLE - 1) / 2) * WHEEL_ITEM

  return (
    <div
      ref={ref}
      onScroll={() => {
        const el = ref.current
        if (!el || skip.current) return
        const i = Math.round(el.scrollTop / WHEEL_ITEM)
        const next = values[Math.max(0, Math.min(values.length - 1, i))]
        if (next !== value) onChange(next)
      }}
      className="h-[200px] snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ paddingTop: pad, paddingBottom: pad }}
    >
      {values.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex h-[40px] w-full snap-center items-center justify-center text-[28px] tabular-nums ${
            n === value ? 'font-semibold text-white' : 'text-white/30'
          }`}
        >
          {format(n)}
        </button>
      ))}
    </div>
  )
}

type StartProps = {
  running: boolean
  delaySec: number
  min: number
  max: number
  error?: string | null
  onDelaySec: (n: number) => void
  onGo: () => void
}

const BUFFER_PRESETS = [12, 16, 20]

export function LiveBufferStart({
  running,
  delaySec,
  min,
  max,
  error = null,
  onDelaySec,
  onGo,
}: StartProps) {
  const seconds = Math.min(max, Math.max(min, Math.round(delaySec)))
  const secValues = rangeInts(min, max)
  const presets = BUFFER_PRESETS.filter((n) => n >= min && n <= max)

  return (
    <div className="pointer-events-none absolute inset-0 z-[28] flex items-center justify-center bg-black/45 text-white backdrop-blur-[3px]">
      {running && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-[29] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#3ddc84]" />
      )}
      <div className="pointer-events-auto w-[min(20.5rem,90vw)] overflow-hidden rounded-[1.4rem] bg-[#121212]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/12">
        <p className="border-b border-white/15 px-4 py-3.5 text-center text-[15px] font-semibold tracking-[0.04em]">
          BUFFER: {seconds.toFixed(1)} sec
        </p>
        <div className="relative mx-auto mt-1 h-[200px] w-[min(16rem,78vw)]">
          <div className="pointer-events-none absolute inset-x-2 top-1/2 z-[1] h-10 -translate-y-1/2 rounded-full bg-white/12" />
          <div className="relative z-[2] grid h-full grid-cols-2">
            <BufferWheelColumn
              values={secValues}
              value={seconds}
              onChange={onDelaySec}
              format={(n) => String(n)}
            />
            <div className="flex h-[200px] flex-col items-center justify-center text-[28px] tabular-nums">
              <span className="flex h-10 items-center text-white/25">9</span>
              <span className="flex h-10 items-center font-semibold text-white">0</span>
              <span className="flex h-10 items-center text-white/25">1</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 px-5 pb-3 pt-2">
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onDelaySec(n)}
              className={`rounded-xl py-2.5 text-[15px] font-medium ${
                seconds === n ? 'bg-white/18 text-white' : 'bg-[#2c2c2e] text-white/90'
              }`}
            >
              {n.toFixed(1)}s
            </button>
          ))}
        </div>
        <div className="px-5 pb-5 pt-1">
          {error ? (
            <p className="mb-2 text-center text-xs leading-snug text-[#ff8a8a]">{error}</p>
          ) : null}
          <button
            type="button"
            onClick={onGo}
            className="w-full rounded-xl bg-[#f0c400] py-3.5 text-[22px] font-extrabold tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(240,196,0,0.28)]"
          >
            GO!
          </button>
        </div>
      </div>
    </div>
  )
}
