/**
 * One mapping: MediaPipe normalized pose → canvas / display pixels.
 * Recognition stays in un-mirrored normalized image space.
 * Mirror is a render-only transform.
 */

import type { Landmark } from '../types'

export function landmarkToDisplay(
  p: Landmark,
  width: number,
  height: number,
  mirror: boolean,
): { x: number; y: number } {
  return {
    x: mirror ? (1 - p.x) * width : p.x * width,
    y: p.y * height,
  }
}

/** Canvas must match the source video frame, not the CSS box. */
export function syncCanvasToVideo(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement | null,
): boolean {
  if (!video || video.videoWidth < 8 || video.videoHeight < 8) return false
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
  }
  return true
}
