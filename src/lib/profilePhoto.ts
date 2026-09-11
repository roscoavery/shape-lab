/**
 * iPad snapshots as data URLs are several megabytes. The phone cannot
 * download fifteen of those as JSON. Compress to a small JPEG first.
 */

const MAX_EDGE = 720
const QUALITY = 0.82

export function isPhotoUrl(value: string | undefined): boolean {
  if (!value) return false
  return value.startsWith('https://') || value.startsWith('http://') || value.startsWith('/api/')
}

/** Every JPEG data URL starts the same, so slice(0, 80) never remounts a new crop. */
export function photoDisplayKey(src: string): string {
  if (!src.startsWith('data:')) return src
  return `data:${src.length}:${src.slice(32, 56)}:${src.slice(-32)}`
}

function dataUrlToBlob(src: string): Blob | null {
  const m = src.match(/^data:([^;]+);base64,(.+)$/s)
  if (!m) return null
  try {
    const bin = atob(m[2])
    if (bin.length > 4_500_000) return null
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes], { type: m[1] || 'image/jpeg' })
  } catch {
    return null
  }
}

async function compressViaCanvas(src: string, maxEdge: number, quality: number): Promise<Blob | null> {
  const img = await loadImage(src)
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), 'image/jpeg', quality)
  })
  return blob && blob.size > 0 ? blob : null
}

export async function compressProfilePhoto(src: string): Promise<Blob | null> {
  if (!src || isPhotoUrl(src)) return null
  if (!src.startsWith('data:')) return null
  try {
    const blob = await compressViaCanvas(src, MAX_EDGE, QUALITY)
    if (blob) return blob
  } catch {
    /* iPad canvas can fail on a huge crop — try a smaller pass */
  }
  try {
    const blob = await compressViaCanvas(src, 480, 0.72)
    if (blob) return blob
  } catch {
    /* fall through to the raw JPEG if it is small enough */
  }
  return dataUrlToBlob(src)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that photo.'))
    img.src = src
  })
}
