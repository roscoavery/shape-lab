/**
 * Phone clips are often 10–50MB. Posting the bytes through /api/feed dies
 * on Vercel’s ~4.5MB request limit. Upload straight to Blob, then save a URL.
 */

export type MediaUploadResult = { url: string } | { error: string; direct?: boolean }

function extForMime(mime: string, fallback: 'mp4' | 'jpg'): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('mp4') || mime.includes('quicktime')) return 'mp4'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  return fallback
}

export function feedBlobPath(id: string, mime: string): string {
  return `data/feed-blobs/${id}.${extForMime(mime, 'mp4')}`
}

export function photoBlobPath(id: string): string {
  return `data/roster-photos/${id}.bin`
}

export async function uploadGymMedia(
  pathname: string,
  body: Blob,
  contentType: string,
): Promise<MediaUploadResult> {
  try {
    const tokenRes = await fetch('/api/media-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
      body: JSON.stringify({ pathname, contentType }),
    })
    if (tokenRes.status === 501) return { error: 'direct', direct: true }
    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      let message = 'Could not start the upload.'
      try {
        const data = JSON.parse(text) as { error?: string }
        if (data.error && data.error !== 'direct') message = data.error
        if (data.error === 'direct') return { error: 'direct', direct: true }
      } catch {
        /* keep default */
      }
      return { error: message }
    }
    const data = (await tokenRes.json()) as { token?: string; pathname?: string }
    if (!data.token) return { error: 'direct', direct: true }
    const { put } = await import('@vercel/blob/client')
    const saved = await put(data.pathname || pathname, body, {
      access: 'public',
      token: data.token,
      contentType,
      multipart: body.size > 4_000_000,
    })
    if (!saved?.url) return { error: 'The clip uploaded but did not return a link.' }
    return { url: saved.url }
  } catch {
    return { error: 'Could not reach the gym link. Stay on this URL and try again.' }
  }
}
