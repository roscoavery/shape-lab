import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GymClipPlayer } from '../GymClipPlayer'
import { CollageSlotFill } from './CollageSlotFill'
import { evenGrid, type Collage, type CollageSlot } from '../../lib/collages'
import { useGymLibrary } from '../../lib/gymLibrary'
import {
  clampExportSeconds,
  collageExportFilename,
  COLLAGE_EXPORT_PRESETS,
  recordCollagePlayback,
} from '../../lib/collageExport'
import { collageCellAspect, packedGridSize } from '../../lib/collageLayout'
import { saveResultMessage, saveVideoToDevice } from '../../lib/saveMedia'
import { PhoneReelViewer } from '../PhoneReelViewer'
import { ShareReference } from '../share/ShareReference'
import { kindFromUrl } from '../../lib/clipStore'
import { postedByFromUrl } from '../../lib/socialUrls'
import type { OrganizeEditor } from '../../lib/organizeLibrary'

export function CollageStage({
  collage,
  nameForUrl,
  fullscreen,
  onFullscreen,
  onClose,
  onSlots,
  canEdit,
  canAssign = false,
  viewerId = null,
  onEditVideos,
  onDuplicate,
  editor,
  gymAdmin = false,
}: {
  collage: Collage
  nameForUrl: (url: string) => string
  fullscreen: boolean
  onFullscreen: (v: boolean) => void
  onClose: () => void
  onSlots?: (slots: CollageSlot[]) => void
  canEdit: boolean
  /** Pick, record, or upload a clip into a tile — Today uses this without full edit. */
  canAssign?: boolean
  viewerId?: string | null
  onEditVideos?: () => void
  onDuplicate?: () => void
  editor?: OrganizeEditor
  gymAdmin?: boolean
}) {
  const { clips } = useGymLibrary()
  const gridRef = useRef<HTMLDivElement | null>(null)
  const cancelRef = useRef(false)
  const [chrome, setChrome] = useState(!fullscreen)
  const [exportSec, setExportSec] = useState(10)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [viewport, setViewport] = useState(() =>
    typeof window === 'undefined'
      ? { w: 1280, h: 720 }
      : { w: window.innerWidth, h: window.innerHeight },
  )
  const [cellAspect, setCellAspect] = useState(9 / 16)
  const [playingSlot, setPlayingSlot] = useState<number | null>(null)
  const [loadAll, setLoadAll] = useState(false)
  const [reelOpen, setReelOpen] = useState(false)
  const [reelIndex, setReelIndex] = useState(0)

  const landscape = viewport.w > viewport.h
  const { cols, rows } = evenGrid(collage.slots.length, landscape || fullscreen)
  const cinema = fullscreen || exporting
  const showBar = !fullscreen || chrome || exporting
  const packed = useMemo(
    () => packedGridSize({ cols, rows }, cellAspect, viewport.w, viewport.h),
    [cols, rows, cellAspect, viewport.w, viewport.h],
  )

  useEffect(() => {
    setChrome(!fullscreen)
  }, [fullscreen])

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const root = gridRef.current
    if (!root) return
    const read = () => {
      const videos = [...root.querySelectorAll('video')] as HTMLVideoElement[]
      const aspects = videos.map((v) =>
        v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 0,
      )
      if (aspects.some((a) => a > 0)) setCellAspect(collageCellAspect(aspects))
    }
    read()
    const videos = [...root.querySelectorAll('video')]
    videos.forEach((v) => v.addEventListener('loadedmetadata', read))
    const mo = new MutationObserver(read)
    mo.observe(root, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      videos.forEach((v) => v.removeEventListener('loadedmetadata', read))
    }
  }, [collage.id, collage.slots.length, fullscreen, cols, rows])

  useEffect(() => {
    if (!fullscreen || chrome) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setChrome(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen, chrome])

  const runExport = async () => {
    setLoadAll(true)
    await new Promise((resolve) => window.setTimeout(resolve, 120))
    const videos = [...(gridRef.current?.querySelectorAll('video') ?? [])] as HTMLVideoElement[]
    if (videos.length === 0) {
      setNotice('Tap a tile to start it, or wait a moment after Export so clips can load.')
      return
    }
    const seconds = clampExportSeconds(exportSec)
    cancelRef.current = false
    setExporting(true)
    setProgress(0)
    setNotice(null)
    if (fullscreen) setChrome(false)
    try {
      const blob = await recordCollagePlayback({
        videos,
        seconds,
        landscape: landscape || fullscreen,
        cancelled: () => cancelRef.current,
        onProgress: setProgress,
      })
      const filename = collageExportFilename(collage.name, seconds, blob.type)
      const result = await saveVideoToDevice(blob, filename)
      setNotice(saveResultMessage(result))
    } catch (err) {
      if ((err as Error).message === 'cancelled') {
        setNotice('Export cancelled.')
      } else {
        setNotice((err as Error).message || 'Could not export that collage.')
      }
    } finally {
      setExporting(false)
      setProgress(0)
    }
  }

  const toolbar = (
    <div
      className={`flex flex-wrap items-center gap-2 px-3 py-2 text-white ${
        fullscreen
          ? 'pointer-events-auto absolute inset-x-0 top-0 z-30 bg-black/70'
          : 'shrink-0'
      }`}
    >
      <h3 className="mr-auto text-sm font-semibold">{collage.name}</h3>
      {exporting ? (
        <>
          <span className="text-xs tabular-nums text-white/80">
            Exporting {Math.round(progress * 100)}%
          </span>
          <button
            type="button"
            onClick={() => {
              cancelRef.current = true
            }}
            className="rounded-md border border-white/30 px-2 py-1 text-xs"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <label className="flex items-center gap-1 text-[11px] text-white/70">
            Seconds
            <input
              type="number"
              min={1}
              max={120}
              value={exportSec}
              onChange={(e) => setExportSec(clampExportSeconds(Number(e.target.value)))}
              className="w-14 rounded-md border border-white/30 bg-black/40 px-1.5 py-1 text-xs text-white"
            />
          </label>
          <div className="hidden flex-wrap gap-1 sm:flex">
            {COLLAGE_EXPORT_PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setExportSec(s)}
                className={`rounded-md px-1.5 py-1 text-[11px] ${
                  exportSec === s
                    ? 'bg-white text-black'
                    : 'border border-white/30 text-white/80'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void runExport()}
            className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-[#06281f]"
          >
            Save to Photos
          </button>
          {onEditVideos && (
            <button
              type="button"
              onClick={onEditVideos}
              className="rounded-md border border-white/30 px-2 py-1 text-xs"
            >
              Edit videos
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="rounded-md border border-white/30 px-2 py-1 text-xs"
            >
              Duplicate
            </button>
          )}
          <ShareReference
            variant="reel"
            draft={{ kind: 'collage', title: collage.name, collageId: collage.id }}
          />
          {fullscreen && (
            <button
              type="button"
              onClick={() => setChrome(false)}
              className="rounded-md border border-white/30 px-2 py-1 text-xs"
            >
              Hide
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setReelIndex(playingSlot ?? 0)
              setReelOpen(true)
            }}
            className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-black"
          >
            Watch reels
          </button>
          <button
            type="button"
            onClick={() => onFullscreen(!fullscreen)}
            className="rounded-md border border-white/30 px-2 py-1 text-xs"
          >
            {fullscreen ? 'Exit grid' : 'Full grid'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/30 px-2 py-1 text-xs"
          >
            Close
          </button>
        </>
      )}
    </div>
  )

  const grid = (
    <div
      ref={gridRef}
      className={`grid gap-0 bg-black ${fullscreen ? '' : 'min-h-[420px] flex-1'}`}
      style={{
        ...(fullscreen
          ? { width: packed.width, height: packed.height }
          : { minHeight: 420 }),
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {collage.slots.map((slot, i) => {
        const spanLast = collage.slots.length === 5 && i === 4 && cols === 2
        const assignClip = (clip: { id: string; url: string }) => {
          if (!onSlots) return
          const same = slot.url === clip.url
          onSlots(
            collage.slots.map((s, idx) =>
              idx === i
                ? {
                    ...s,
                    clipId: clip.id,
                    url: clip.url,
                    loopA: same ? s.loopA : null,
                    loopB: same ? s.loopB : null,
                  }
                : s,
            ),
          )
          setPlayingSlot(i)
        }
        const allowAssign = (canEdit || canAssign) && Boolean(onSlots)
        return (
          <div
            key={`slot-${i}`}
            className="relative min-h-0 min-w-0 overflow-hidden bg-black"
            style={spanLast ? { gridColumn: '1 / -1' } : undefined}
          >
            {loadAll || playingSlot === i ? (
              <GymClipPlayer
                url={slot.url}
                itemId={slot.clipId || `${collage.id}-${i}`}
                fill
                persistUrl={slot.url}
                loopA={slot.loopA}
                loopB={slot.loopB}
                compact
                quiet
                shareChrome={false}
                bare={cinema}
                active={loadAll || playingSlot === i}
                markup={false}
                onAbChange={
                  canEdit && onSlots && !cinema
                    ? (a, b) => {
                        const slots = collage.slots.map((s, idx) =>
                          idx === i ? { ...s, loopA: a, loopB: b } : s,
                        )
                        onSlots(slots)
                      }
                    : undefined
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlayingSlot(i)}
                className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0d1218] px-3 text-center"
              >
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">
                  Play
                </span>
                <span className="text-[12px] font-semibold text-white">{nameForUrl(slot.url)}</span>
                <span className="text-[11px] text-white/50">Tap another tile to switch clips</span>
              </button>
            )}
            {(playingSlot === i || cinema) && slot.url ? (
              <button
                type="button"
                onClick={() => {
                  setReelIndex(i)
                  setReelOpen(true)
                }}
                className="absolute bottom-2 right-2 z-30 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black"
              >
                Full screen
              </button>
            ) : null}
            {!cinema && (
              <div className="absolute inset-x-0 top-0 z-20 space-y-1 bg-gradient-to-b from-black/80 to-transparent px-2 py-2">
                {allowAssign ? (
                  <CollageSlotFill
                    url={slot.url}
                    clipId={slot.clipId}
                    clips={clips}
                    viewerId={viewerId}
                    onPick={assignClip}
                  />
                ) : (
                  <p className="text-[11px] font-semibold text-white">{nameForUrl(slot.url)}</p>
                )}
                {slot.caption ? (
                  <p className="text-[12px] text-[var(--accent)]">{slot.caption}</p>
                ) : null}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const body = (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[260] bg-black'
          : 'flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-black'
      }
    >
      {showBar && toolbar}
      {fullscreen && !chrome && !exporting && (
        <button
          type="button"
          onClick={() => setChrome(true)}
          className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[11px] text-white/80 hover:bg-black/75"
        >
          Controls
        </button>
      )}
      {fullscreen ? (
        <div
          className="flex h-full w-full items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget && !exporting) setChrome((v) => !v)
          }}
        >
          {grid}
        </div>
      ) : (
        grid
      )}
      {notice && showBar && (
        <p
          className={`bg-black px-3 py-2 text-xs text-[var(--accent)] ${
            fullscreen ? 'absolute inset-x-0 bottom-0 z-30' : 'shrink-0'
          }`}
        >
          {notice}
        </p>
      )}
      {reelOpen ? (
        <PhoneReelViewer
          items={collage.slots.map((slot, i) => ({
            id: slot.clipId || `${collage.id}-${i}`,
            name: nameForUrl(slot.url),
            url: slot.url,
            kind: kindFromUrl(slot.url),
            loopA: slot.loopA,
            loopB: slot.loopB,
            postedBy: postedByFromUrl(slot.url) || undefined,
          }))}
          startIndex={reelIndex}
          onClose={() => setReelOpen(false)}
          editor={editor ?? { gymEditor: false, personalEditor: false, profileId: null }}
          gymAdmin={gymAdmin}
          title={collage.name}
        />
      ) : null}
    </div>
  )
  if (fullscreen) return createPortal(body, document.body)
  return body
}
