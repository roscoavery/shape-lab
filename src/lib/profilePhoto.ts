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

export async function compressProfilePhoto(src: string): Promise<Blob | null> {
  if (!src || isPhotoUrl(src)) return null
  if (!src.startsWith('data:')) return null
  const img = await loadImage(src)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), 'image/jpeg', QUALITY)
  })
  return blob && blob.size > 0 ? blob : null
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that photo.'))
    img.src = src
  })
}
