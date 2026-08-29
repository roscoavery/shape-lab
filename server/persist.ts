/**
 * JSON / binary storage that works on the gym computer (data/) and on Vercel.
 * Local: write data/*.json as today.
 * Production: Vercel Blob when BLOB_READ_WRITE_TOKEN is set; otherwise /tmp
 * plus an in-process cache so a warm function keeps writes.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TMP = path.join('/tmp', 'shape-lab-data')
const mem = new Map<string, Buffer>()

function diskPath(rel: string): string {
  return path.join(ROOT, rel)
}

function tmpPath(rel: string): string {
  return path.join(TMP, rel)
}

function canWrite(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.accessSync(dir, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export async function readText(rel: string): Promise<string | null> {
  const cached = mem.get(rel)
  if (cached) return cached.toString('utf8')
  if (useBlob()) {
    try {
      const { list } = await import('@vercel/blob')
      const { blobs } = await list({ prefix: rel, limit: 5 })
      const hit = blobs.find((b) => b.pathname === rel || b.pathname.endsWith(rel))
      if (hit?.url) {
        const res = await fetch(hit.url)
        if (res.ok) {
          const text = await res.text()
          mem.set(rel, Buffer.from(text, 'utf8'))
          return text
        }
      }
    } catch {
      /* fall through */
    }
  }
  for (const p of [diskPath(rel), tmpPath(rel)]) {
    try {
      const text = fs.readFileSync(p, 'utf8')
      mem.set(rel, Buffer.from(text, 'utf8'))
      return text
    } catch {
      /* next */
    }
  }
  return null
}

export async function writeText(rel: string, text: string): Promise<void> {
  const buf = Buffer.from(text, 'utf8')
  mem.set(rel, buf)
  if (useBlob()) {
    const { put } = await import('@vercel/blob')
    await put(rel, text, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
    return
  }
  const dest = canWrite(path.dirname(diskPath(rel))) ? diskPath(rel) : tmpPath(rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, text)
}

export async function readJson<T>(rel: string, fallback: T): Promise<T> {
  const text = await readText(rel)
  if (!text) return fallback
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

export async function writeJson(rel: string, data: unknown): Promise<void> {
  await writeText(rel, JSON.stringify(data, null, 2) + '\n')
}

export async function readBin(rel: string): Promise<Buffer | null> {
  const cached = mem.get(rel)
  if (cached) return cached
  if (useBlob()) {
    try {
      const { list } = await import('@vercel/blob')
      const { blobs } = await list({ prefix: rel, limit: 5 })
      const hit = blobs.find((b) => b.pathname === rel || b.pathname.endsWith(rel))
      if (hit?.url) {
        const res = await fetch(hit.url)
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer())
          mem.set(rel, buf)
          return buf
        }
      }
    } catch {
      /* fall through */
    }
  }
  for (const p of [diskPath(rel), tmpPath(rel)]) {
    try {
      const buf = fs.readFileSync(p)
      mem.set(rel, buf)
      return buf
    } catch {
      /* next */
    }
  }
  return null
}

export async function writeBin(rel: string, buf: Buffer, contentType: string): Promise<void> {
  mem.set(rel, buf)
  if (useBlob()) {
    const { put } = await import('@vercel/blob')
    await put(rel, buf, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    })
    return
  }
  const dest = canWrite(path.dirname(diskPath(rel))) ? diskPath(rel) : tmpPath(rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buf)
}

export async function removeFile(rel: string): Promise<void> {
  mem.delete(rel)
  if (useBlob()) {
    try {
      const { del, list } = await import('@vercel/blob')
      const { blobs } = await list({ prefix: rel, limit: 5 })
      const urls = blobs
        .filter((b) => b.pathname === rel || b.pathname.endsWith(rel))
        .map((b) => b.url)
      if (urls.length) await del(urls)
    } catch {
      /* ignore */
    }
  }
  for (const p of [diskPath(rel), tmpPath(rel)]) {
    try {
      fs.unlinkSync(p)
    } catch {
      /* ignore */
    }
  }
}
