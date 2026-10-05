/**
 * Video byte storage selection.
 *
 * Three providers, picked by environment:
 *   r2   — R2_* env vars set. Bytes live in the coach's private R2 bucket.
 *          Playback is a 302 to a short-lived presigned URL, so phones stream
 *          straight from Cloudflare's edge and the Mac never proxies video.
 *   blob — BLOB_READ_WRITE_TOKEN set (legacy). Existing Vercel Blob behavior.
 *   disk — neither. Local data/athlete-video-blobs only.
 *
 * When R2 is configured it is authoritative for new uploads and for playback
 * of rows that carry a cloudKey. Everything else keeps working exactly as
 * before, so a gym without R2 configured notices no change.
 */

import { readBin } from './persist.ts'
import {
  presignR2GetUrl,
  r2ConfigFromEnv,
  r2DeleteObject,
  r2KeyForVideoFile,
  r2PutObject,
  type R2Config,
} from './r2Client.ts'

export type VideoStorageKind = 'r2' | 'blob' | 'disk'

export function r2Config(): R2Config | null {
  return r2ConfigFromEnv()
}

export function r2Enabled(): boolean {
  return r2ConfigFromEnv() !== null
}

export function videoStorageKind(): VideoStorageKind {
  if (r2Enabled()) return 'r2'
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return 'blob'
  return 'disk'
}

/** R2 object key for a video file name, namespaced by the coach prefix. */
export function cloudKeyForFile(file: string): string {
  const cfg = r2ConfigFromEnv()
  return r2KeyForVideoFile(cfg?.prefix ?? '', file)
}

export type StoredVideoRef = {
  cloudKey?: string
  publicUrl?: string
  file?: string
}

/**
 * Presigned playback URL for a video that lives in R2. Returns null when R2
 * is not configured or the row has no cloudKey; callers fall back to the
 * existing proxy behavior. The URL is unguessable and expires, the bucket
 * itself stays private with no public listing.
 */
export function signedR2PlaybackUrl(
  video: StoredVideoRef,
  expiresInSec: number,
): string | null {
  const cfg = r2ConfigFromEnv()
  if (!cfg || !video.cloudKey) return null
  return presignR2GetUrl(cfg, video.cloudKey, expiresInSec)
}

/**
 * Upload a buffer to R2 and return its object key. Returns null when R2 is
 * not configured. Throws when the upload fails so callers can fall back to
 * disk instead of losing the bytes.
 */
export async function storeVideoBufferInCloud(
  file: string,
  buf: Buffer,
  mime: string,
): Promise<string | null> {
  const cfg = r2ConfigFromEnv()
  if (!cfg) return null
  const key = r2KeyForVideoFile(cfg.prefix, file)
  await r2PutObject(cfg, key, buf, mime)
  return key
}

/** Remove a video's R2 object. Missing keys and missing config are no-ops. */
export async function deleteCloudVideo(cloudKey?: string): Promise<void> {
  const cfg = r2ConfigFromEnv()
  if (!cfg || !cloudKey) return
  try {
    await r2DeleteObject(cfg, cloudKey)
  } catch {
    /* delete stays gone from the app's view even if the cloud delete hiccups */
  }
}

/**
 * Fetch a video's bytes from wherever they live: R2 via presigned URL,
 * then the legacy Blob publicUrl, then local disk. Used by the zip builder
 * and the backfill script's verification, never for normal playback.
 */
export async function fetchVideoBytes(video: StoredVideoRef): Promise<Buffer | null> {
  const cfg = r2ConfigFromEnv()
  if (cfg && video.cloudKey) {
    try {
      const r = await fetch(presignR2GetUrl(cfg, video.cloudKey, 900))
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer())
        if (buf.length) return buf
      }
    } catch {
      /* fall through */
    }
  }
  if (video.publicUrl && /^https:\/\//i.test(video.publicUrl)) {
    try {
      const r = await fetch(video.publicUrl)
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer())
        if (buf.length) return buf
      }
    } catch {
      /* fall through */
    }
  }
  if (video.file) return readBin(`data/athlete-video-blobs/${video.file}`)
  return null
}
