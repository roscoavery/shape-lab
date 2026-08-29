/**
 * Record a class collage as one video: each slot drawn into an even grid
 * for a chosen number of seconds while the clips keep looping.
 */

import {
  createRecorder,
  durableBlob,
  extForVideoType,
  hintMotion,
  startRecorder,
} from './saveMedia'
import { evenGrid } from './collages'

export const COLLAGE_EXPORT_PRESETS = [5, 8, 10, 15, 20, 30, 60] as const

export function clampExportSeconds(raw: number): number {
  if (!Number.isFinite(raw)) return 10
  return Math.min(120, Math.max(1, Math.round(raw)))
}

export function collageExportFilename(name: string, seconds: number, type: string): string {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'collage'
  return `${slug}-${seconds}s.${extForVideoType(type)}`
}

type Rect = { x: number; y: number; w: number; h: number }

function cellRects(count: number, cols: number, rows: number, width: number, height: number): Rect[] {
  const cw = width / cols
  const ch = height / rows
  const spanLast = count === 5 && cols === 2
  const out: Rect[] = []
  for (let i = 0; i < count; i += 1) {
    if (spanLast && i === count - 1) {
      const row = Math.floor(i / cols)
      out.push({ x: 0, y: row * ch, w: width, h: ch })
    } else {
      out.push({
        x: (i % cols) * cw,
        y: Math.floor(i / cols) * ch,
        w: cw,
        h: ch,
      })
    }
  }
  return out
}

function drawContained(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  rect: Rect,
) {
  ctx.fillStyle = '#000'
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return
  const scale = Math.min(rect.w / vw, rect.h / vh)
  const dw = vw * scale
  const dh = vh * scale
  const dx = rect.x + (rect.w - dw) / 2
  const dy = rect.y + (rect.h - dh) / 2
  try {
    ctx.drawImage(video, dx, dy, dw, dh)
  } catch {
    /* cross-origin frame — leave the cell black */
  }
}

export type RecordCollageOpts = {
  videos: HTMLVideoElement[]
  seconds: number
  landscape: boolean
  cancelled?: () => boolean
  onProgress?: (p: number) => void
}

export async function recordCollagePlayback(opts: RecordCollageOpts): Promise<Blob> {
  const seconds = clampExportSeconds(opts.seconds)
  const n = Math.max(1, opts.videos.length)
  const { cols, rows } = evenGrid(n, opts.landscape)
  const landscape = cols >= rows
  const width = landscape ? 1920 : 1080
  const height = landscape ? 1080 : 1920
  const rects = cellRects(n, cols, rows, width, height)

  for (const video of opts.videos) {
    video.muted = true
    void video.play().catch(() => {})
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.style.position = 'fixed'
  canvas.style.left = '-9999px'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    throw new Error('Could not draw the collage.')
  }

  const captured = canvas.captureStream(30)
  hintMotion(captured)
  const rec = createRecorder(captured)
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  const stopped = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      captured.getTracks().forEach((t) => t.stop())
      resolve(new Blob(chunks, { type: rec.mimeType || 'video/webm' }))
    }
  })
  startRecorder(rec, 200)

  const started = performance.now()
  const durationMs = seconds * 1000

  await new Promise<void>((resolve) => {
    const tick = () => {
      if (opts.cancelled?.()) {
        resolve()
        return
      }
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)
      opts.videos.forEach((video, i) => {
        const rect = rects[i]
        if (rect) drawContained(ctx, video, rect)
      })
      const elapsed = performance.now() - started
      opts.onProgress?.(Math.min(1, elapsed / durationMs))
      if (elapsed >= durationMs) resolve()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  if (rec.state !== 'inactive') rec.stop()
  canvas.remove()
  const blob = await stopped
  if (opts.cancelled?.()) throw new Error('cancelled')
  if (blob.size < 800) throw new Error('Export was empty — wait for the clips to load, then try again.')
  return durableBlob(blob)
}
